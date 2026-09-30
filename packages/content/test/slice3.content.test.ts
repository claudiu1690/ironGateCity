/**
 * Slice 3 content (docs/tech/slice-3.md §4, §14): ordinances, the NPC slates, platforms, the
 * political headlines of three papers, the result texts and the Restore-the-base orders, word for
 * word against docs/design/slice-3-politics.md; the offsets; one failing fixture per §4.2 check.
 */
import { councilDay, dayKey } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import POL from '../../../docs/design/slice-3-politics.md?raw';
import { ContentError, loadContent, parseContent, rawContent } from '../src';
import type { ContentInput } from '../src';

const content = loadContent();
const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): ContentInput => deepCopy(rawContent as ContentInput);
const unq = (s: string) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\*/g, '');

function section(doc: string, start: string, end: string): string {
  const from = doc.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = doc.indexOf(end, from + 1);
  return doc.slice(from, to < 0 ? undefined : to);
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

describe('the real content, slice 3', () => {
  it('pins the council offsets (GDD §2) and the §3.1 example dates', () => {
    const offsets = Object.fromEntries(content.councilCities().map((c) => [c.id, c.council!.offset]));
    expect(offsets).toEqual({ coalport: 2, duskwall: 3, ashford: 1 });
    const coalport = content.city('coalport')!.council!.offset;
    expect(councilDay(dayKey(Date.UTC(2026, 9, 1)), coalport)).toMatchObject({ cycle: 4145, cycleDay: 0 });
    expect(councilDay(dayKey(Date.UTC(2026, 9, 6)), coalport)).toMatchObject({ cycle: 4146, cycleDay: 0 });
    expect(councilDay(dayKey(Date.UTC(2026, 9, 8)), coalport).ordinanceWindow.toDay).toBe(20739);
  });

  it('the ten ordinances word for word (design §10.1)', () => {
    const table = rows(section(POL, '### 10.1 The menu', '### 10.2'), /^\| `ord\./);
    expect(table).toHaveLength(10);
    expect(content.ordinancesMenu().map((o) => [o.id, o.name, o.line])).toEqual(
      table.map((r) => [unq(r[0]!), r[1], r[2]]),
    );
    expect(content.ordinanceSpec('ord.open-doors')).toEqual({
      id: 'ord.open-doors',
      name: 'Open Doors',
      effects: [{ kind: 'chancePct', actionType: 'canvass', value: 4 }],
    });
  });

  it('the three slates word for word (design §5.2), in profile order', () => {
    const table = rows(section(POL, '### 5.2 The slates', '### 5.3'), /^\| `npc\./);
    expect(table).toHaveLength(27);
    expect(content.candidates.map((c) => [c.id, c.name, String(c.profile), c.line])).toEqual(
      table.map((r) => [unq(r[0]!), r[1], r[2], r[3]]),
    );
    expect(content.slateOf('coalport').map((c) => c.profile)).toEqual([44, 38, 33, 29, 25, 22, 19, 17, 15]);
    expect(content.candidate('npc.v.kessler')?.cityId).toBe('duskwall');
  });

  it('the platforms (design §6.4) and the branch motions (§10.2)', () => {
    const text = section(POL, '### 6.4 Platform lines', '### 6.5');
    for (const f of content.factions) {
      for (const p of f.platforms) expect(text).toContain(`"${p.line}"`);
    }
    expect(Object.fromEntries(content.factions.map((f) => [f.id, f.branchMotion]))).toEqual({
      vanguard: 'ord.rally-permits',
      collective: 'ord.shift-hours',
      alliance: 'ord.reading-room',
    });
    expect(content.platform('collective', 'plat.c.bread')?.line).toBe(
      'Rent, bread and the tram. In that order.',
    );
  });

  it('Restore the base word for word (design §17.4): crisis, +40, slots A and B', () => {
    const table = rows(section(POL, '### 17.4', '### 17.5'), /^\| `dir\./);
    expect(table).toHaveLength(6);
    for (const [id, , title, line] of table) {
      const t = content.orderTemplates.find((x) => x.id === unq(id!))!;
      expect([t.title, t.line, t.use, t.doneFxp]).toEqual([title, line, 'crisis', 40]);
    }
  });

  it('the political headlines of the three papers word for word (design §8, §17)', () => {
    const toToken = (s: string) => s.replace(/\{weekday\} midnight/g, '{until}');
    const clarion = rows(section(POL, '### 8.1 The Coalport Clarion', '### 8.2'), /^\| `hl\./).map((r) => [
      unq(r[0]!),
      r[3],
      toToken(r[4]!),
    ]);
    const sentinel = rows(section(POL, '### 8.2 The Duskwall Sentinel', '### 8.3'), /^\| `hl\./);
    const gazette = rows(section(POL, '### 8.3 The Ashford Gazette', 'All decks'), /^\| `hl\./);
    const expected = [
      ...clarion,
      ...[...sentinel, ...gazette].map((r) => [unq(r[0]!), r[1], toToken(r[2]!)]),
    ];
    for (const [id, headline, deck] of expected) {
      const t = content.headlines.find((h) => h.id === id);
      expect(t, id).toBeDefined();
      expect([t!.headline, t!.deck], id).toEqual([headline, deck]);
    }
    expect(content.headlines.find((h) => h.id === 'hl.stands-firm')).toMatchObject({
      headline: 'Coalport Stands Firm',
      deck: 'Morale back above sixty. The branch thanks everyone who knocked a door.',
    });
    for (const city of ['coalport', 'duskwall', 'ashford']) {
      expect(content.politicalHeadlinesOf(city)).toHaveLength(19);
      expect(content.headlinesOf(city).some((h) => content.politicalHeadlinesOf(city).includes(h))).toBe(
        false,
      );
    }
  });

  it('the six result texts word for word (design §17.3)', () => {
    const table = rows(section(POL, '**The six result texts**', '`{paper}` resolves'), /^\| `[a-zA-Z]+` \|/);
    expect(table).toHaveLength(6);
    for (const [act, stamp, headline, body] of table) {
      const t = content.politics.results[unq(act!) as keyof typeof content.politics.results];
      expect([t.stamp, t.headline, t.body]).toEqual([stamp, headline, body]);
    }
  });
});

describe('Finish His Work chapter 2 (design §17.7)', () => {
  it('the script word for word, its numbers, its requirement and the chapter-3 teaser', () => {
    const doc = section(POL, '### 17.7', 'END-OF-DOCUMENT');
    const ch = content.chapter('finish-his-work', 2)!;
    const s = ch.story!;
    expect(ch.requires).toEqual({ ballotCast: true });
    expect(s.letterFrom).toBe('From the back of the ward book');
    expect(s.choose.title).toBe('His election bill');
    expect(doc).toContain(s.choose.narrative);
    for (const c of s.choose.choices) {
      expect(doc).toContain(`| ${c.text} | ${c.hint} | \`${c.flag}\` |`);
    }
    expect(doc).toContain(`*${s.check.title}*`);
    expect(doc).toContain(s.check.narrative);
    for (const a of s.check.approaches) expect(doc).toContain(`| ${a.text} |`);
    expect([s.check.difficulty, s.check.energy, s.check.cta]).toEqual([14, 15, 'Stand where he stood']);
    expect(s.rewards).toEqual({
      success: { xp: 300, fxp: 80, iron: 150 },
      partial: { xp: 150, fxp: 40, iron: 75 },
      failure: { xp: 50, fxp: 0, iron: 0 },
    });
    for (const o of ['success', 'partial', 'failure'] as const) {
      expect(doc).toContain(`*${s.result[o].headline}*`);
      // The Success text reads "in the front row" for "at the front" (the content-policy sweep
      // allows "front" only as a row or a building; a deviation for the designer to confirm).
      expect(doc.replace('at the front who', 'in the front row who')).toContain(s.result[o].body);
    }
    expect(s.keepsake).toBe('keep.election-bill');
    expect(content.chapter('finish-his-work', 3)).toMatchObject({
      title: 'The deposit',
      requires: { rank: 3 },
    });
  });
});

describe('slice-3 cross-checks (tech design §4.2): one failing fixture each', () => {
  const fails = (mutate: (c: ContentInput) => void, message: RegExp) => {
    const c = clone();
    mutate(c);
    expect(() => parseContent(c)).toThrow(ContentError);
    expect(() => parseContent(c)).toThrow(message);
  };

  it('ordinances', () => {
    fails((c) => (c.ordinances[0]!.effects = [{ kind: 'jobPayPct', value: 11 }]), /outside its bound/);
    fails(
      (c) =>
        (c.ordinances[0]!.effects = [
          { kind: 'jobPayPct', value: 5 },
          { kind: 'jobPayPct', value: 4 },
        ]),
      /at most one effect of each kind/,
    );
    fails((c) => (c.ordinances = c.ordinances.slice(1)), /the design's "ord.public-works" is missing/);
    fails(
      (c) => (c.factions[0]!.branchMotion = 'ord.curfew'),
      /branchMotion "ord.curfew" is not an ordinance/,
    );
  });

  it('candidates', () => {
    fails((c) => (c.candidates = c.candidates.slice(1)), /has 8 NPC candidates, not 9/);
    fails((c) => {
      const [a, b] = [c.candidates[0]!, c.candidates[1]!];
      c.candidates[0] = b;
      c.candidates[1] = a;
    }, /profiles must strictly descend/);
    fails((c) => (c.candidates[0]!.name = 'Petra Holm'), /shares a name with a secretary/);
    fails((c) => (c.candidates[0]!.id = 'holm'), /duplicate id "holm"/);
    fails((c) => (c.candidates[0]!.factionId = 'vanguard'), /is not of coalport's home faction/);
  });

  it('factions and crisis orders', () => {
    fails(
      (c) => (c.orderTemplates.find((t) => t.id === 'dir.restore-canvass')!.use = 'rotation'),
      /restoreOrders\[0\]/,
    );
    fails(
      (c) =>
        (c.factions.find((f) => f.id === 'collective')!.restoreOrders = [
          'dir.restore-speech',
          'dir.restore-canvass',
        ]),
      /slot A/,
    );
    fails(
      (c) =>
        (c.factions.find((f) => f.id === 'collective')!.restoreOrders = [
          'dir.v.restore-canvass',
          'dir.v.restore-speech',
        ]),
      /crisis template no faction names/,
    );
    fails((c) => (c.factions[0]!.platforms[1]!.id = c.factions[0]!.platforms[0]!.id), /three distinct ids/);
  });

  it('cities', () => {
    fails((c) => delete (c.cities[0] as { council?: unknown }).council, /home city without a council/);
    fails((c) => (c.cities[1]!.council = { offset: 2, seats: 7 }), /share the council offset 2/);
  });

  it('political headlines and texts', () => {
    fails(
      (c) =>
        (c.headlines.find((h) => h.id === 'hl.count')!.when = [
          { kind: 'countToday' },
          { kind: 'firstEdition' },
        ]),
      /mixes political and slice-1 conditions/,
    );
    fails(
      (c) => (c.headlines = c.headlines.filter((h) => h.id !== 'hl.v.moved')),
      /duskwall: the paper has no political "moved"/,
    );
    fails(
      (c) => (c.headlines.find((h) => h.id === 'hl.count')!.deck = 'Turnout {share}.'),
      /unknown political placeholder \{share\}/,
    );
    fails(
      (c) => (c.headlines.find((h) => h.id === 'hl.welcome')!.deck = 'Until {until}.'),
      /unknown placeholder \{until\}/,
    );
    fails((c) => (c.politics.results.ballot.body = 'One. Two. Three. Four. Five.'), /has 5 sentences/);
    fails((c) => (c.politics.results.ballot.body = 'For {rank}.'), /unknown political placeholder \{rank\}/);
  });
});
