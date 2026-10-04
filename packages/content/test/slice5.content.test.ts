/**
 * Slice 5 content (docs/tech/slice-5.md §4.4, T8): the opponents and their lines, the held taps,
 * the hostile journey cards with every outcome's rewards, the parcel's Heat, the five Issues and the
 * extended feeds, the slot-B mission orders, and Settle His Debts chapter 2 with its keepsake, word
 * for word against docs/design/slice-5-risk.md (§10.2, §10.6, §11.4, §12, §13, §23.2, §23.3). The
 * data modules are imported directly; the loader-backed checks (accessors, cross-checks) are in their
 * own describe at the end. The headlines and the copy are in slice5.headlines.test.ts.
 */
import { describe, expect, it } from 'vitest';
import DESIGN from '../../../docs/design/slice-5-risk.md?raw';
import { copy, loadContent } from '../src';
import { ambitions } from '../src/data/ambitions';
import { held } from '../src/data/held';
import { issues } from '../src/data/issues';
import { items } from '../src/data/items';
import { journeyEvents } from '../src/data/journeyEvents';
import { opponents } from '../src/data/opponents';
import { orderTemplates } from '../src/data/orders';
import { HeldAction, Issue, Item, JourneyEvent, Opponent, OrderTemplateSchema } from '../src/schemas';

const plain = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
function section(start: string, end: string): string {
  const from = DESIGN.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = DESIGN.indexOf(end, from + 1);
  expect(to, end).toBeGreaterThan(from);
  return plain(DESIGN.slice(from, to));
}
function rows(text: string, row: RegExp): string[][] {
  return text
    .split('\n')
    .filter((l) => row.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
}
/** The loader's sentence rule: quoted speech counts as part of its sentence. */
const sentences = (t: string) =>
  t
    .replace(/"[^"]*"/g, 'Q')
    .split(/(?<=[.?!]["”’)]?)\s+/)
    .filter(Boolean).length;
const SIDE: Record<string, string> = {
  Vanguard: 'vanguard',
  Collective: 'collective',
  Alliance: 'alliance',
  'the republic': 'police',
};

describe('the opponents (design §10.2, §10.6)', () => {
  const table = rows(section('### 10.2 Who it is', '**Scaling**'), /^\| [a-z-]+ \|/);
  const lines = rows(section('### 10.6 The texts', 'Content-policy check'), /^\| (?!Opponent|---)/);

  it('six, with the numbers, the side and the label as the player reads it', () => {
    expect(table).toHaveLength(6);
    expect(opponents.map((o) => o.id)).toEqual(table.map((r) => r[0]));
    for (const [id, label, side, power, agi, wits, pay] of table) {
      const o = Opponent.parse(opponents.find((x) => x.id === id));
      expect([o.label, o.side, o.power, o.agi, o.wits], id).toEqual([
        label,
        SIDE[side!],
        Number(power),
        Number(agi),
        Number(wits),
      ]);
      if (pay!.startsWith("won't be bought")) {
        expect(pay).toContain('your Fight odds −10 %');
        expect([o.payOff, o.fightPct, o.lines.paid], id).toEqual([null, -10, undefined]);
      } else {
        expect(o.payOff, id).toBe(Number(/^(\d+) Iron$/.exec(pay!)![1]));
        expect(o.fightPct, id).toBeUndefined();
      }
    }
  });

  it('the portraits: their own for the five, Kessler for the constable', () => {
    expect(Object.fromEntries(opponents.map((o) => [o.id, o.portrait]))).toEqual({
      'street-enforcer': 'portrait.street-enforcer',
      'vanguard-doorman': 'portrait.vanguard-doorman',
      'strike-picket': 'portrait.strike-picket',
      'branch-inspector': 'portrait.branch-inspector',
      'party-thug': 'portrait.party-thug',
      'city-police': 'portrait.kessler',
    });
  });

  it('the six lines word for word, each at most 120 characters', () => {
    expect(lines).toHaveLength(6);
    opponents.forEach((o, i) => {
      const [, appears, won, lost, ran, talked, paid] = lines[i]!;
      expect([o.lines.appears, o.lines.won, o.lines.lost, o.lines.ran, o.lines.talked], o.id).toEqual([
        appears,
        won,
        lost,
        ran,
        talked,
      ]);
      if (paid === "won't be bought") expect(o.lines.paid, o.id).toBeUndefined();
      else expect(o.lines.paid, o.id).toBe(paid);
      for (const l of Object.values(o.lines)) expect(l.length, l).toBeLessThanOrEqual(120);
    });
  });
});

describe('the held taps (design §8.2, §9.2, §23.3)', () => {
  const doc = section('### 23.3 The held taps', '### 23.4');

  it('two intelligence taps on Intelligence at 3 Energy, texts word for word', () => {
    for (const [key, h] of Object.entries(held)) {
      HeldAction.parse(h);
      expect([h.type, h.stats, h.energy], key).toEqual(['intelligence', ['int'], 3]);
      expect(doc, h.id).toContain(`${h.name} (${h.id})`);
      expect(doc).toContain(`Success — ${h.text.success.headline} — ${h.text.success.body}`);
      expect(doc).toContain(`Partial — ${h.text.partial.headline} — ${h.text.partial.body}`);
      for (const t of [h.text.success.body, h.text.partial.body]) {
        expect(t.length, t).toBeLessThanOrEqual(240);
        expect(sentences(t), t).toBeLessThanOrEqual(4);
      }
    }
    expect([held.cells.id, held.cells.name, held.infirmary.id, held.infirmary.name]).toEqual([
      'held.cells',
      'Listen to the cells',
      'held.ward',
      'Talk to the ward',
    ]);
  });
});

describe('the hostile deck (design §11.4, §23.2) and the parcel (§6.1)', () => {
  const deck = section('### 11.4 The hostile deck', '### 11.5');
  const hostile = journeyEvents.filter((j) => j.deck === 'hostile');

  /** "Heat +10, Watched" → rewards; "nothing", "—" → {}. */
  function rewardsOf(cell: string): Record<string, unknown> {
    const text = cell.includes(': ') ? cell.slice(cell.indexOf(': ') + 2) : cell;
    const r: Record<string, unknown> = {};
    if (/^(nothing|—)/.test(text) || text === '') return r;
    for (const part of text.split(', ')) {
      let m: RegExpExecArray | null;
      if ((m = /^Heat ([+−])(\d+)$/.exec(part))) r.heat = (m[1] === '−' ? -1 : 1) * Number(m[2]);
      else if ((m = /^\+(\d+) Party XP$/.exec(part))) r.fxp = Number(m[1]);
      else if ((m = /^\+(\d+) XP$/.exec(part))) r.xp = Number(m[1]);
      else if (part === 'Watched') r.flag = 'watched';
      else if (part === 'Warned') r.flag = 'warned';
      else throw new Error(`unparsed reward "${part}"`);
    }
    return r;
  }

  it('seven ordinary cards as they were, four hostile, in file order', () => {
    const parsed = journeyEvents.map((j) => JourneyEvent.parse(j));
    expect(parsed.filter((j) => j.deck === 'ordinary')).toHaveLength(7);
    expect(hostile.map((j) => j.id)).toEqual([
      'jev.checkpoint',
      'jev.informer',
      'jev.listed',
      'jev.conductor',
    ]);
    expect(hostile.filter((j) => j.first).map((j) => j.id)).toEqual(['jev.checkpoint']);
    const listed = hostile.find((j) => j.id === 'jev.listed')!;
    expect([listed.heatAtLeast, listed.first]).toEqual([50, undefined]);
    expect(hostile.filter((j) => j.heatAtLeast !== undefined)).toHaveLength(1);
  });

  it('the four cards word for word: titles, setups, ignore lines, details and outcomes', () => {
    for (const j of hostile) {
      expect(deck, j.id).toContain(`${j.title} (${j.id})`);
      expect(deck, j.id).toContain(j.setup);
      expect(deck, j.id).toContain(j.ignore);
      for (const t of [j.setup, j.ignore]) {
        expect(t.length, t).toBeLessThanOrEqual(240);
        expect(sentences(t), t).toBeLessThanOrEqual(4);
      }
      for (const c of j.choices) {
        const row = deck.split('\n').find((l) => l.startsWith(`| ${c.title} |`));
        expect(row, `${j.id}.${c.id}`).toBeDefined();
        // The table's detail column with its notes ("unchecked") taken out.
        const detail = row!
          .split('|')[2]!
          .trim()
          .replace(/ \(unchecked\)$/, '')
          .replace(/^unchecked · /, '')
          .replace(/ · unchecked$/, '');
        expect(c.detail, `${j.id}.${c.id}`).toBe(detail);
        expect(c.detail.length).toBeLessThanOrEqual(90);
        for (const o of [c.success, c.partial]) {
          if (!o) continue;
          expect(row, `${j.id}.${c.id}`).toContain(`${o.text.headline} — ${o.text.body}`);
          expect(o.text.body.length, o.text.body).toBeLessThanOrEqual(240);
          expect(sentences(o.text.body), o.text.body).toBeLessThanOrEqual(4);
        }
        // A checked choice carries a partial; a gate sits on an unchecked one with both.
        if (c.stats) expect(c.partial, `${j.id}.${c.id}`).toBeDefined();
        if (c.gate) expect([c.stats, !!c.partial]).toEqual([undefined, true]);
        if (!c.stats && !c.gate) expect(c.partial, `${j.id}.${c.id}`).toBeUndefined();
      }
    }
  });

  it("every outcome's rewards, the checks, the prices and the slept-through effects as §23.2 writes them", () => {
    const table = rows(section('### 23.2 The hostile cards', '### 23.3'), / · .* \| /).filter(
      (r) => r[0] !== 'Card · choice',
    );
    expect(table).toHaveLength(13);
    const STAT: Record<string, string> = { CHA: 'cha', AGI: 'agi', INT: 'int' };
    for (const [name, check, success, partial] of table) {
      const [cardTitle, choiceName] = name!.split(' · ');
      const card = hostile.find((j) => j.title === cardTitle)!;
      expect(card, name).toBeDefined();
      if (choiceName === 'slept through') {
        const effects = rewardsOf(
          partial!.replace(/^ignoreEffects: /, '').replace(/ \(the line only\)$/, ''),
        );
        expect(card.ignoreEffects ?? {}, name).toEqual(effects);
        continue;
      }
      const c = card.choices.find((x) => x.title.startsWith(choiceName!))!;
      expect(c, name).toBeDefined();
      const m = /^(CHA|AGI|INT), 14$/.exec(check!);
      if (m) expect(c.stats, name).toEqual([STAT[m[1]!]]);
      else {
        expect(check!.startsWith('unchecked'), name).toBe(true);
        expect(c.stats, name).toBeUndefined();
        const iron = /(\d+) Iron/.exec(check!);
        expect(c.cost?.iron, name).toBe(iron ? Number(iron[1]) : undefined);
        expect(c.gate, name).toBe(check!.includes('gate: coolAndClean') ? 'coolAndClean' : undefined);
      }
      expect(c.success.rewards, name).toEqual(rewardsOf(success!));
      if (partial === '—') expect(c.partial, name).toBeUndefined();
      else expect(c.partial?.rewards, name).toEqual(rewardsOf(partial!));
      // The gated and the plain outcomes keep their headlines (§23.2's "Waved on", "They write…").
      if (success!.includes(': ')) expect(success).toContain(c.success.text.headline);
      if (partial!.includes(': ') && c.partial) expect(partial).toContain(c.partial.text.headline);
    }
    // A Partial pays half the Success's XP and Party XP, rounded half up (§23.2).
    for (const j of hostile)
      for (const c of j.choices.filter((x) => x.stats)) {
        expect(c.partial!.rewards.xp ?? 0, c.id).toBe(Math.round((c.success.rewards.xp ?? 0) / 2 + 0.001));
        expect(c.partial!.rewards.fxp ?? 0, c.id).toBe(Math.round((c.success.rewards.fxp ?? 0) / 2 + 0.001));
      }
    // Nothing on a card costs Energy; the conductor's slept-through does nothing.
    expect(hostile.find((j) => j.id === 'jev.conductor')!.ignoreEffects).toBeUndefined();
  });

  it("the parcel's Partial gains Heat +10 (design §6.1); its Success is unchanged", () => {
    const carry = journeyEvents.find((j) => j.id === 'jev.parcel')!.choices.find((c) => c.id === 'carry')!;
    expect(carry.partial?.rewards).toEqual({ iron: 50, heat: 10 });
    expect(carry.success.rewards).toEqual({ iron: 100 });
    expect(DESIGN).toContain("the parcel card's Partial +10");
  });
});

describe('the Issues (design §12.1)', () => {
  const doc = section('### 12.1 Five Issues', '### 12.2');
  const table = rows(doc, /^\| issue\./);
  const CITY: Record<string, { cityId: string; districtId?: string }> = {
    Coalport: { cityId: 'coalport' },
    Duskwall: { cityId: 'duskwall' },
    Ashford: { cityId: 'ashford' },
    'Irongate · Garrison Hill': { cityId: 'irongate', districtId: 'irongate.garrison-hill' },
  };
  /** "canvass, speech at a, b; intelligence and surveillance at c" → feeds (a watch is intelligence). */
  const feedsOf = (cell: string) =>
    cell.split('; ').map((f) => {
      const [types, places] = f.split(' at ');
      const actionTypes = [
        ...new Set(types!.split(/, | and /).map((t) => (t === 'surveillance' ? 'intelligence' : t))),
      ];
      return { actionTypes, locationIds: places!.split(', ') };
    });

  it('five, with names, phrases, places, feeds, effects and effect lines word for word', () => {
    expect(table).toHaveLength(5);
    const five = issues.slice(-5);
    expect(five.map((i) => i.id)).toEqual(table.map((r) => r[0]));
    for (const [id, name, short, where, feeds, effect] of table) {
      const i = Issue.parse(five.find((x) => x.id === id));
      expect([i.name, i.short], id).toEqual([name, short]);
      expect(i.where, id).toEqual([{ ...CITY[where!], feeds: feedsOf(feeds!) }]);
      const [dsl, line] = effect!.split(' · ');
      expect(i.effectLine, id).toBe(line);
      const m = /^(\w+)( checked)? ([+−-]\d+)$/.exec(dsl!)!;
      expect(i.effects, id).toEqual([
        {
          kind: m[1],
          ...(m[2] ? { scope: 'checked' } : {}),
          value: Number(m[3]!.replace('−', '-')),
        },
      ]);
    }
    expect(issues.find((i) => i.id === 'issue.customs-strike')!.effects).toEqual([
      { kind: 'heatCoolPct', value: 50 },
    ]);
    expect(issues.find((i) => i.id === 'issue.cells-full')!.effects).toEqual([
      { kind: 'bailPct', value: -50 },
    ]);
  });

  it('blurbs and stances word for word', () => {
    const stances = rows(doc, /^\| [A-Z][^|]+ \| [^|]+ \| [^|]+ \| [^|]+ \| [^|]+ \|$/).filter(
      (r) => r[0] !== 'Issue' && !r[0]!.startsWith('Id'),
    );
    expect(stances).toHaveLength(5);
    for (const [name, blurb, v, c, a] of stances) {
      const i = issues.find((x) => x.name === name)!;
      expect(i, name).toBeDefined();
      expect([i.blurb, i.stances.vanguard, i.stances.collective, i.stances.alliance], name).toEqual([
        blurb,
        v,
        c,
        a,
      ]);
    }
  });

  it('the extended feeds on Harbour Rates, the Frontier Shut and the Court Backlog', () => {
    const feeds = (id: string) => issues.find((i) => i.id === id)!.where[0]!.feeds;
    expect(feeds('issue.harbour-rates').at(-1)).toEqual({
      actionTypes: ['canvass', 'speech'],
      locationIds: ['coalport.customs-house', 'coalport.far-bank'],
    });
    expect(feeds('issue.frontier-shut').slice(-2)).toEqual([
      { actionTypes: ['canvass', 'speech'], locationIds: ['duskwall.checkpoint'] },
      { actionTypes: ['intelligence'], locationIds: ['duskwall.mountain-inn'] },
    ]);
    expect(feeds('issue.court-backlog').at(-1)).toEqual({
      actionTypes: ['canvass'],
      locationIds: ['ashford.police'],
    });
    expect(doc).toContain(
      'issue.harbour-rates adds canvass and speech at coalport.customs-house and coalport.far-bank; issue.frontier-shut adds canvass and speech at duskwall.checkpoint and intelligence at duskwall.mountain-inn; issue.court-backlog adds canvass at ashford.police',
    );
    expect(issues).toHaveLength(24);
  });
});

describe('the slot-B mission orders (design §12.2)', () => {
  const table = rows(section('### 12.2 One Party order per faction', '## 13.'), /^\| dir\./);
  const FACTION: Record<string, string> = {
    Collective: 'collective',
    Vanguard: 'vanguard',
    Alliance: 'alliance',
  };

  it('one per faction: title, line, match, target, Level 6, any residence, word for word', () => {
    expect(table).toHaveLength(3);
    for (const [id, factionSlot, title, , target, line] of table) {
      const t = OrderTemplateSchema.parse(orderTemplates.find((x) => x.id === id));
      const [faction, slot] = factionSlot!.split(' · ');
      expect([t.factionId, t.slot, t.title, t.line, t.target, t.counts], id).toEqual([
        FACTION[faction!],
        slot,
        title,
        line,
        Number(target!.split(' ')[0]),
        'attempts',
      ]);
      expect([t.residence, t.minLevel, t.use], id).toEqual(['any', 6, 'rotation']);
      // As authored, in the design's key order.
      expect(JSON.stringify(orderTemplates.find((x) => x.id === id)!.match)).toBe(
        JSON.stringify({ kinds: ['mission'], cityId: 'home' }),
      );
    }
    expect(orderTemplates.filter((t) => t.minLevel !== undefined).map((t) => t.id)).toEqual([
      'dir.mission',
      'dir.v.mission',
      'dir.a.mission',
    ]);
  });

  it("each is the last of its faction's home slot-B rotation; {city} only in the title", () => {
    for (const id of ['dir.mission', 'dir.v.mission', 'dir.a.mission']) {
      const t = orderTemplates.find((x) => x.id === id)!;
      const slotB = orderTemplates.filter(
        (x) =>
          x.factionId === t.factionId &&
          x.slot === 'B' &&
          (x.use ?? 'rotation') === 'rotation' &&
          x.residence !== 'capital',
      );
      expect(slotB.at(-1)?.id, id).toBe(id);
      expect(t.line).not.toContain('{city}');
    }
  });
});

describe('Settle His Debts chapter 2, The riverside house (design §13)', () => {
  const doc = section('## 13. Ambition chapter 2', '## 14. Headlines');
  const amb = ambitions.find((a) => a.id === 'settle-his-debts')!;
  const ch = amb.chapters.find((c) => c.n === 2)!;
  const s = ch.story!;
  const STATS: Record<string, string> = { agi: 'AGI', 'cha,int': 'CHA+INT', best: 'best' };

  it('the script word for word: the letter, the two steps, the ways and the results', () => {
    expect([ch.title, ch.requires]).toEqual(['The riverside house', { level: 6 }]);
    expect(doc).toContain(`the row reads ${s.letterFrom} · ${ch.title} · Chapter 2 is ready · 15 Energy`);
    expect(s.choose.title).toBe('The riverside house');
    expect(doc).toContain(s.choose.narrative);
    for (const c of s.choose.choices) expect(doc).toContain(`| ${c.text} | ${c.hint} | ${c.flag} |`);
    expect(doc).toContain(`Step 2 · ${s.check.title}`);
    expect(doc).toContain(s.check.narrative);
    for (const a of s.check.approaches)
      expect(doc, a.id).toContain(`| ${a.text} | ${STATS[a.stats.join(',')]} vs 14 |`);
    expect(s.check.approaches.map((a) => a.heat)).toEqual([6, undefined, undefined]);
    expect(doc).toContain('In by the yard, quietly | AGI vs 14 | Heat +6, whatever happens');
    expect([s.check.cta, s.check.difficulty, s.check.energy]).toEqual(['Open the house', 14, 15]);
    expect(doc).toContain(`CTA: ${s.check.cta} · 15 Energy`);
    for (const [o, word] of [
      ['success', 'Success'],
      ['partial', 'Partial'],
      ['failure', 'Failure'],
    ] as const)
      expect(doc).toContain(`${word} — ${s.result[o].headline} — ${s.result[o].body}`);
    for (const t of [s.choose.narrative, s.check.narrative, ...Object.values(s.result).map((r) => r.body)]) {
      expect(t.length, t).toBeLessThanOrEqual(240);
      expect(sentences(t), t).toBeLessThanOrEqual(4);
    }
    expect(s.art).toBe('home-hq');
  });

  it('the rewards, the keepsake and the chapter-3 teaser at Rank 3', () => {
    expect(s.rewards).toEqual({
      success: { xp: 300, fxp: 80, iron: 150 },
      partial: { xp: 150, fxp: 40, iron: 75 },
      failure: { xp: 50, fxp: 0, iron: 0 },
    });
    expect(doc).toContain(
      'Success 300 XP / 80 Party XP / 150 Iron, Partial 150 / 40 / 75, Failure 50 / 0 / 0',
    );
    expect(s.keepsake).toBe('keep.ledger-page');
    const keep = Item.parse(items.find((i) => i.id === 'keep.ledger-page'));
    expect([keep.name, keep.slot, keep.keepsake, keep.art]).toEqual([
      'A page of his ledger',
      null,
      true,
      'item.document-folder',
    ]);
    expect(doc).toContain(`keepsake keep.ledger-page (${keep.name}, no slot, art item.document-folder)`);
    expect(amb.chapters.find((c) => c.n === 3)).toEqual({
      n: 3,
      title: 'The collector',
      requires: { rank: 3 },
    });
  });

  it("chapter 1's hook line and the chapter-3 knock-on, as the copy builds them", () => {
    const hook = (n: number) => {
      const c = amb.chapters.find((x) => x.n === n)!;
      return copy.chapterHook(n, c.title, '{date}', copy.chapterNeeds(c.requires!));
    };
    expect(hook(2)).toBe('Chapter 2, "The riverside house": from {date}, at Level 6');
    expect(doc).toContain(`Chapter 1's hook line becomes ${hook(2)}`);
    expect(doc).toContain(hook(3));
  });
});

describe('the loaded content (needs the city half of T8 too)', () => {
  it('the accessors: opponents, held taps, the hostile deck, the Issues, the orders, the chapter', () => {
    const content = loadContent();
    expect(content.opponents).toHaveLength(6);
    expect(content.opponent('city-police')?.side).toBe('police');
    expect(content.heldAction('cells').id).toBe('held.cells');
    expect(content.heldAction('infirmary').id).toBe('held.ward');
    expect(content.journeyDeck()).toHaveLength(7);
    expect(content.journeyDeck()).not.toContain('jev.checkpoint');
    expect(content.hostileRotation()).toEqual(['jev.checkpoint', 'jev.informer', 'jev.conductor']);
    expect(content.hostileFirst()).toBe('jev.checkpoint');
    expect(content.listedCard()).toEqual({ id: 'jev.listed', heatAtLeast: 50 });
    expect(content.issues).toHaveLength(24);
    expect(content.issuesFor('coalport').map((x) => x.issue.id)).toEqual(
      expect.arrayContaining(['issue.customs-strike', 'issue.ferry-fares']),
    );
    expect(content.issuesFor('irongate').find((x) => x.issue.id === 'issue.cells-full')?.districtId).toBe(
      'irongate.garrison-hill',
    );
    for (const f of ['collective', 'vanguard', 'alliance'] as const)
      expect(content.ordersOf(f).filter((t) => t.minLevel === 6)).toHaveLength(1);
    expect(content.chapter('settle-his-debts', 2)?.story?.keepsake).toBe('keep.ledger-page');
    expect(content.item('keep.ledger-page')?.keepsake).toBe(true);
    // Every opponent's portrait is a portrait asset; every Issue feed names a place of its city.
    for (const o of content.opponents) expect(content.asset(o.portrait).kind, o.id).toBe('portrait');
    for (const i of content.issues.slice(-5))
      for (const w of i.where)
        for (const f of w.feeds)
          for (const id of f.locationIds ?? [])
            expect(content.location(id)?.city.id, `${i.id}: ${id}`).toBe(w.cityId);
  });
});
