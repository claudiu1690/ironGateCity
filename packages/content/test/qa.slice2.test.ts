/**
 * QA (slice 2; review 4): the onboarding content and rules checked against the GDD itself (§7.1 beats,
 * §7.3 faction bonuses, §8.5 reference recruits, §17.1 chapter numbers, §21.4 catalogue, §3.3
 * mastheads, §13.7 secretaries) rather than against the design documents the developer transcribed
 * from; the marginal effect of every answer through the real resolver; the kit and worn CHA for
 * every coat choice in every faction; and the content-policy checklist (content-policy review §7)
 * over every player-facing string, including art alt texts.
 */
import { buildNewCharacter, equippedItems, resolveOrigin, wornCha } from '@irongate/rules';
import type { FactionId, OriginAnswerRef } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import GDD from '../../../docs/GDD.md?raw';
import { copy, loadContent, rawContent } from '../src';

const content = loadContent();
const FACTIONS: FactionId[] = ['vanguard', 'collective', 'alliance'];
const REF = content.origin.reference;

function gddSection(start: string, end: string): string {
  const from = GDD.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = GDD.indexOf(end, from + 1);
  return GDD.slice(from, to < 0 ? undefined : to);
}
function outcome(answers: OriginAnswerRef[]) {
  const r = resolveOrigin({ origin: content.originSpec, answers, factions: content.factions });
  if (!r.ok) throw new Error(r.reason);
  return r.outcome;
}
const withAnswer = (questionId: string, answerId: string): OriginAnswerRef[] =>
  REF.map((a) => (a.questionId === questionId ? { questionId, answerId } : { ...a }));
/** The platform's row for each party (whom you help is your party). */
const HELPS: Record<FactionId, string> = { vanguard: 'stahl', collective: 'holm', alliance: 'grey' };
const joining = (f: FactionId, answers: OriginAnswerRef[] = REF) =>
  answers.map((a) => (a.questionId === 'origin.platform' ? { ...a, answerId: HELPS[f] } : { ...a }));

function wornOf(o: ReturnType<typeof outcome>, factionId: FactionId) {
  const doc = buildNewCharacter({
    userId: 'u',
    name: 'Q',
    avatarId: 'avatar.man-20s',
    factionId,
    homeCityId: content.faction(factionId).homeCityId,
    outcome: o,
    answers: REF,
    now: Date.UTC(2026, 8, 29, 9),
    uid: (() => {
      let n = 0;
      return () => `uid-${++n}`;
    })(),
  });
  const equipped = equippedItems(doc.inventory, doc.equipment, (id) => content.itemSpec(id));
  return { doc, cha: wornCha(doc.stats.chaBase, equipped), equipped: equipped.map((i) => i.id) };
}

describe('GDD §7.1: the three beats of *The Last Train In*, and each answer’s effect through the resolver', () => {
  const table = gddSection('### 7.1 *The Last Train In*', '### 7.2')
    .split('\n')
    .filter((l) => /^\| [123] \*/.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  const steps = content.origin.steps;

  it('has three beats in the order of the content, with the same titles, places and art', () => {
    expect(table).toHaveLength(3);
    table.forEach((row, i) => {
      const step = steps[i]!;
      expect(row[0], step.id).toBe(`${i + 1} *${step.title}*`);
      expect(row[1]!.split(' (`')[0], step.id).toBe(step.kicker);
      if (row[1]!.includes('(`')) expect(row[1], step.id).toContain(`(\`${step.art}\`)`);
      expect(step.questions).toHaveLength(1);
    });
  });

  it('beat 1: Holm, Stahl and Grey, each their party’s secretary; whom you help is your party', () => {
    expect(table[0]![2]).toMatch(/^Holm's parcel · Stahl's bundle · Grey's signature;/);
    expect(table[0]![2]).toContain("*Help Holm · the six o'clock to Coalport*");
    const platform = steps[0].questions[0];
    expect(platform.answers.map((a) => a.id)).toEqual(['holm', 'stahl', 'grey']);
    for (const a of platform.answers) {
      const f = a.effects[0]!;
      expect(f.kind).toBe('faction');
      if (f.kind !== 'faction') continue;
      expect(content.faction(f.factionId).secretary.npcId, a.id).toBe(a.id);
      expect(f.person).toBe(a.id);
      expect(a.confirm).toBe(
        `Help ${content.npc(a.id)!.name.split(' ')[1]} · the six o'clock to ${content.city(content.faction(f.factionId).homeCityId)!.name}`,
      );
      // The party, and so the home city (§7.4), through the real resolver.
      expect(outcome(joining(f.factionId)).factionId).toBe(f.factionId);
    }
    // §7.1: the GDD names the three people with their parties.
    const intro = gddSection('### 7.1 *The Last Train In*', '| Beat |');
    expect(intro).toContain('**Petra Holm**, the Collective');
    expect(intro).toContain('**Viktor Stahl**, the Vanguard');
    expect(intro).toContain('**Thomas Grey**, the Alliance');
  });

  it('beat 2: the suitcase’s answers and their +6 / +1 change exactly what the GDD says', () => {
    const cell = table[1]![2]!;
    const parsed = [...cell.matchAll(/\*([^*]+)\* \(\+6 (STR|INT|AGI), \+1 (STR|INT|AGI)\)/g)].map((m) => ({
      text: m[1]!.replace(/…$/, ''),
      six: m[2]!.toLowerCase(),
      one: m[3]!.toLowerCase(),
    }));
    expect(parsed).toHaveLength(3);
    const answers = steps[1].questions[0].answers;
    parsed.forEach((p, i) => {
      const a = answers[i]!;
      expect(a.text.startsWith(p.text), `${a.id}: ${p.text}`).toBe(true);
      // Marginal effect through the real resolver, in every party.
      for (const f of FACTIONS) {
        const base = { ...outcome(joining(f, withAnswer('origin.suitcase', 'books'))).stats };
        const got = outcome(joining(f, withAnswer('origin.suitcase', a.id))).stats;
        const books = { str: 1, int: 6, agi: 0 };
        const want = { str: 0, int: 0, agi: 0, [p.six]: 6, [p.one]: 1 } as Record<'str' | 'int' | 'agi', number>;
        for (const k of ['str', 'int', 'agi'] as const) {
          expect(got[k] - base[k], `${f} ${a.id} ${k}`).toBe(want[k] - books[k]);
        }
      }
    });
  });

  it('beat 3: the lining chooses the Ambition (§17.1), and his coat is worn by everyone', () => {
    expect(table[2]![2]).toBe('*His ward book* · *His letter from prison* · *The marker*');
    const ambitions = { 'ward-book': 'finish-his-work', letter: 'clear-his-name', marker: 'settle-his-debts' };
    const answers = steps[2].questions[0].answers;
    expect(answers.map((a) => a.text.replace(/\.$/, ''))).toEqual(['His ward book', 'His letter from prison', 'The marker']);
    for (const [aid, amb] of Object.entries(ambitions)) {
      for (const f of FACTIONS) {
        const o = outcome(joining(f, withAnswer('origin.lining', aid)));
        expect(o.ambitionId).toBe(amb);
        const w = wornOf(o, f);
        // §7.1, §8.5: his coat (Tier I, CHA 5) worn from here on; the party's outfit kept.
        expect(w.cha, `${f} ${aid}`).toBe(5);
        expect(w.equipped).toEqual(['outfit.fathers-coat', 'doc.party-card']);
        expect(w.doc.inventory.map((e) => e.itemId)).toContain(content.faction(f).kit.outfit);
      }
    }
    expect(table[2]![3]).toMatch(/\*\*his coat\*\*, worn from here on \(Tier I, CHA 5\)/);
    expect(content.item('outfit.fathers-coat')?.keepsake).toBe(false);
  });

  it('no Iron and no FXP seed any more (the wish and the refused coat are gone)', () => {
    expect(gddSection('### 7.1 *The Last Train In*', '### 7.2')).toMatch(/the father's \*wish\* \(\+50 FXP\) are gone/);
    for (const f of FACTIONS) {
      const o = outcome(joining(f));
      expect([o.iron, o.fxp, o.stats.chaBase]).toEqual([0, 0, 0]);
    }
  });
});

describe('GDD §7.3, §8.5, §21.4: bonuses, the reference recruits and the kit', () => {
  it('§7.3 faction bonuses are +3 (Vanguard +3 STR; Collective +2 STR +1 INT; Alliance +3 INT)', () => {
    expect(gddSection('### 7.3', '### 7.4')).toMatch(
      /Vanguard \+3 STR; Collective \+2 STR \+1 INT; Alliance \+3 INT/,
    );
    expect(FACTIONS.map((f) => content.faction(f).startingBonus)).toEqual([
      { str: 3 },
      { str: 2, int: 1 },
      { int: 3 },
    ]);
  });

  it('§8.5 (review 4) the reference recruit 8 / 12 / 5 / 5; the tuning characters Vanguard tools 14 / 6 / 5 / 5, Alliance books 6 / 14 / 5 / 5', () => {
    const gdd = gddSection('### 8.5', '## 9.');
    expect(gdd).toMatch(/\| 8 \| 12 \| 5 \| 5 \|/);
    expect(gdd).toContain('**Vanguard STR 14 / INT 6 / AGI 5 / CHA 5** (*tools*)');
    expect(gdd).toContain('**Alliance STR 6 / INT 14 / AGI 5 / CHA 5** (*books*)');
    const sheet = (answers: OriginAnswerRef[]) => {
      const o = outcome(answers);
      const w = wornOf(o, o.factionId);
      return [o.factionId, o.stats.str, o.stats.int, o.stats.agi, w.cha, o.iron, o.fxp];
    };
    expect(sheet(REF)).toEqual(['collective', 8, 12, 5, 5, 0, 0]);
    expect(outcome(REF).ambitionId).toBe('finish-his-work');
    expect(sheet(joining('vanguard', withAnswer('origin.suitcase', 'tools')))).toEqual(['vanguard', 14, 6, 5, 5, 0, 0]);
    expect(sheet(joining('alliance'))).toEqual(['alliance', 6, 14, 5, 5, 0, 0]);
  });

  it('§21.4 catalogue: ids, names, slots, CHA and the keepsake flag, from the GDD table', () => {
    const t = gddSection('### 21.4', '## 22.')
      .split('\n')
      .filter((l) => /^\| `/.test(l))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    const rows = t.flatMap((r) => {
      const ids = r[0]!.split(' · ').map((x) => x.replace(/`/g, ''));
      const names = r[1]!.split(' · ');
      return ids.map((id, i) => ({ id, name: names[i] ?? names[0]!, slot: r[2]!, cha: r[4]!, notes: r[5]! }));
    });
    // Keepsakes of later slices (the GDD's table runs ahead: *(slice 7)*) are not content yet.
    const now = rows.filter((r) => !/\(slice ([6-9]|\d\d)\)/.test(r.notes));
    expect(now.map((r) => r.id).sort()).toEqual(content.items.map((i) => i.id).sort());
    for (const r of now) {
      const item = content.item(r.id)!;
      expect(item.name, r.id).toBe(r.name);
      expect(item.slot ?? 'none', r.id).toBe(r.slot);
      expect(String(item.cha === 0 && item.slot === null ? '—' : item.cha), r.id).toBe(r.cha);
      const keepsake = /keepsake/i.test(r.notes) && !/not a keepsake/i.test(r.notes);
      expect(item.keepsake, r.id).toBe(keepsake || item.slot === null);
    }
  });

  it('§21.4 / onboarding §4.1: each faction wears its own Tier I outfit and carries a party card', () => {
    const outfits: Record<FactionId, string> = {
      vanguard: 'outfit.work-jacket',
      collective: 'outfit.mill-coat',
      alliance: 'outfit.worn-overcoat',
    };
    for (const f of FACTIONS) {
      expect(content.faction(f).kit).toEqual({ outfit: outfits[f], card: 'doc.party-card' });
      const item = content.item(outfits[f])!;
      expect([item.slot, item.tier, item.cha]).toEqual(['clothing', 1, 2]);
    }
  });
});

describe('GDD §17.1: chapter 1 of every Ambition', () => {
  it('10 Energy, difficulty 8, rewards 150/40/100 · 75/20/50 · 25/0/0, a keepsake, chapter 2 teasers as the GDD lists', () => {
    const gdd = gddSection('### 17.1 Ambitions', '### 17.2');
    expect(gdd).toMatch(/costs \*\*10 Energy\*\* at \*\*difficulty 8\*\*/);
    expect(gdd).toMatch(
      /Success \*\*150 XP \/ 40 FXP \/ 100 Iron\*\*, Partial \*\*75 \/ 20 \/ 50\*\*, Failure \*\*25 \/ 0 \/ 0\*\*/,
    );
    const titles = {
      // Slice 3 (design §17 Q21): Finish His Work chapter 2 is written and opens after the first ballot.
      'finish-his-work': ['His ward book', { ballotCast: true }, 'keep.ward-book'],
      'clear-his-name': ['The prison letter', { level: 6 }, 'keep.prison-letter'],
      'settle-his-debts': ['The marker', { level: 6 }, 'keep.marker'],
    } as const;
    for (const [id, [title, req, keepsake]] of Object.entries(titles)) {
      const amb = content.ambition(id)!;
      expect(amb.chaptersPlanned).toBe(12);
      const ch1 = amb.chapters[0]!;
      expect(ch1.title).toBe(title);
      expect(gdd).toContain(`*${title}*`);
      expect(ch1.requires).toBeUndefined();
      expect(ch1.story?.check).toMatchObject({ difficulty: 8, energy: 10 });
      expect(ch1.story?.rewards).toEqual({
        success: { xp: 150, fxp: 40, iron: 100 },
        partial: { xp: 75, fxp: 20, iron: 50 },
        failure: { xp: 25, fxp: 0, iron: 0 },
      });
      expect(ch1.story?.keepsake).toBe(keepsake);
      expect(amb.chapters[1]?.requires).toEqual(req);
      // Slice 5 (design §13): *Settle His Debts* chapter 2 is written too.
      if (id !== 'finish-his-work' && id !== 'settle-his-debts') expect(amb.chapters[1]?.story).toBeUndefined();
      // §17.1: no text in the chapter says "failed" (the stamp alone reads Failure).
      const s = ch1.story!;
      const words = [
        s.choose.title,
        s.choose.narrative,
        ...s.choose.choices.flatMap((c) => [c.text, c.hint]),
        s.check.title,
        s.check.narrative,
        s.check.cta,
        ...s.check.approaches.map((a) => a.text),
        ...Object.values(s.result).flatMap((r) => [r.headline, r.body]),
      ].join(' ');
      expect(words).not.toMatch(/\bfail(ed|s|ure)?\b/i);
    }
  });
});

describe('GDD §3.3 and §13.7: mastheads and secretaries', () => {
  it('each home city prints its own paper with the GDD strapline and price', () => {
    const gdd = gddSection('**Mastheads.**', '**Dateline');
    for (const cityId of ['coalport', 'duskwall', 'ashford']) {
      const p = content.city(cityId)!.paper!;
      expect(gdd).toContain(`*${p.name}* ("${p.strapline}", ${p.price})`);
    }
    expect(copy.paperIsIn('Sentinel')).toBe('The Sentinel is in');
  });

  it('the secretaries sign as §13.7 says', () => {
    const gdd = gddSection('### 13.7', '### 14');
    const sig: Record<FactionId, [string, string]> = {
      collective: ['Petra Holm', '— P.H.'],
      vanguard: ['Viktor Stahl', '— V.S.'],
      alliance: ['Thomas Grey', '— T.G.'],
    };
    for (const f of FACTIONS) {
      const s = content.faction(f).secretary;
      expect(content.npc(s.npcId)?.name).toBe(sig[f][0]);
      expect(s.signature).toBe(sig[f][1]);
      expect(gdd).toContain(`**${sig[f][0]}**`);
      expect(gdd).toContain(`signs "${sig[f][1]}"`);
    }
  });
});

describe('Content policy (CLAUDE.md rules 2 and 6; content-policy review §7 checklist)', () => {
  const samples = Object.values(copy)
    .filter((v) => typeof v === 'function')
    .map((fn) => {
      try {
        return (fn as (...a: unknown[]) => string)(1, 'x', 'y', null);
      } catch {
        return '';
      }
    })
    .join(' ');
  // Ids are never shown (review §1, "Ids: no id changes"): drop every JSON value that is an id.
  // Every JSON string with no space and a dot or hyphen in it is an id or a file name.
  // Slice 5 (design §23.1 #22): the duty officer's art source keeps its file name (`sergeant.png`);
  // nothing a player reads says it.
  const text = (JSON.stringify(rawContent) + JSON.stringify(copy) + samples)
    .replace(/"[a-z0-9_]+([.-][a-z0-9_]+)+(\.(png|jpg|svg))?"/gi, '"[id]"')
    .replace(/"mvp\/portraits\/sergeant\.png"/g, '"[id]"');

  it('uses none of the checklist’s militia, real-world or war words in any display string or alt text', () => {
    const banned =
      /\b(footsoldiers?|sergeants?|lieutenants?|captains?|commanders?|marshals?|colonels?|generals?|drill(ed|ing|s)?|musters?|garrisons?|barracks|billets?|parades?|bugles?|patrols?|roll call|uniforms?|hold the line|conscription|martial law|torch(es|light)?|above all|the nation first|purity|blood|race|storm(ing|troopers?)?|purges?|salutes?|runes?|fasces|eagles?|wreaths?|commissars?|politburo|presidium|political officer|people's hero|comrades?|war|troops|army|militia|invasion|siege|front|uprising|enemy|enemies)\b/gi;
    const hits = [...text.matchAll(banned)].map((m) =>
      text.slice(Math.max(0, m.index! - 25), m.index! + m[0].length + 25),
    );
    // Allowed by the review (§6) and slice 1: "the General Strike" (a union event), "the front row"
    // (seats) and "columns out front" (a building).
    // Slice 4 (tech design §12.5): *Garrison Hill* (a place name) and *the war* (the historical war);
    // design §18: *the front room* (a room); GDD §1.5: *close race* (the plain word for a
    // battleground). All four kept by the designer on 3 Oct 2026 (design §18); the Police
    // Headquarters' *desk sergeant* became *the duty officer*, so no rank is allowed. Slice 5 (design
    // §23.7): *the front door* (the Union Hall briefing), a door in its everyday sense.
    const allowed = hits.filter(
      (h) =>
        !/General Strike|front row|out front|front room|front door|Garrison Hill|(since|by) the war|the war gutted|close ?race/i.test(
          h,
        ),
    );
    expect(allowed).toEqual([]);
  });

  it('the Vanguard card and the platform’s Vanguard row read as reviewed (review §3; answers §26)', () => {
    const v = content.faction('vanguard');
    expect(v.card.signatureEvent).toBe('the Grand Rally');
    expect(v.card.blurb).not.toMatch(/soldier|garrison|nation above all/i);
    // Review 4: a steward, a meeting and a bundle of flyers; no uniform, march, symbol or slogan.
    const stahl = content.origin.steps[0].questions[0].answers.find((a) => a.id === 'stahl')!;
    expect(stahl.lines).toEqual([
      'Viktor Stahl · steward · Duskwall',
      'Iron Vanguard · order, discipline and a strong hand · +3 Strength',
    ]);
    expect(`${stahl.text} ${stahl.lines!.join(' ')}`).not.toMatch(/uniform|march|salute|veteran|soldier|banner/i);
    expect(v.rankTitles).toEqual([
      'Initiate',
      'Steward',
      'Bailiff',
      'Prefect',
      'Intendant',
      'Guardian',
      'Keeper of the Gate',
    ]);
    expect(content.faction('collective').rankTitles).toEqual([
      'Recruit',
      'Activist',
      'Organiser',
      'Convenor',
      'Delegate',
      'Tribune',
      'Chairman',
    ]);
  });

  // Content-policy review §5, decided by the user (fix round 1): the Collective crest stays as drawn,
  // a hammer raised through a gear wheel. Its alt text stays honest about what is drawn.
  it('the Collective crest is the one decided (review §5), with an alt text that says what is drawn', () => {
    const crest = content.asset('crest.collective');
    expect(content.faction('collective').crestArt).toBe('crest.collective');
    expect(crest.alt).toBe('Red Collective crest: a hammer raised through a gear wheel.');
  });
});
