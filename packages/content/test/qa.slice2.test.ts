/**
 * QA (slice 2): the onboarding content and rules checked against the GDD itself (§7.2 answer table,
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
const norm = (s: string) =>
  s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/[“”"]/g, '').replace(/[.]+$/, '').trim();

function outcome(answers: OriginAnswerRef[], factionId: FactionId) {
  const r = resolveOrigin({ origin: content.originSpec, answers, faction: content.faction(factionId) });
  if (!r.ok) throw new Error(r.reason);
  return r.outcome;
}
const withAnswer = (questionId: string, answerId: string): OriginAnswerRef[] =>
  REF.map((a) => (a.questionId === questionId ? { questionId, answerId } : { ...a }));

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

describe('GDD §7.2: the answer table, and each answer’s effect through the resolver', () => {
  const table = gddSection('### 7.2 Dialogue', '**The answers stack')
    .split('\n')
    .filter((l) => /^\| [123]/.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  const questions = content.origin.steps.flatMap((s) => s.questions);

  it('has six rows in the order of the content, with the same prompts and answer texts', () => {
    expect(table).toHaveLength(6);
    table.forEach((row, i) => {
      const q = questions[i]!;
      expect(norm(q.prompt)).toBe(norm(row[1]!));
      q.answers.forEach((a, k) => expect(norm(a.text), `${q.id} ${a.id}`).toBe(norm(row[2 + k]!)));
    });
  });

  it('the stat answers (summer, trouble, talent) change exactly what the GDD says, from the reference build', () => {
    // Effect column, as written in the GDD, per stat question.
    const expected: Record<
      string,
      Record<string, Partial<Record<'str' | 'int' | 'agi' | 'chaBase', number>>>
    > = {
      'origin.summer': { a: { agi: 3 }, b: { str: 3 }, c: { int: 3 } },
      'origin.trouble': { a: { str: 2 }, b: { chaBase: 2 }, c: { int: 2 } },
      'origin.talent': { a: { agi: 3 }, b: { str: 3, int: 1 }, c: { chaBase: 1, int: 3 } },
    };
    // The GDD effect cells, parsed, must say the same thing as the map above.
    const parse = (cell: string) =>
      Object.fromEntries(
        cell.split(' · ').map((part) => {
          const [letter, ...rest] = part.trim().split(' ');
          const effects: Record<string, number> = {};
          for (const m of rest.join(' ').matchAll(/\+(\d) (STR|INT|AGI|CHA)/g)) {
            effects[m[2] === 'CHA' ? 'chaBase' : m[2]!.toLowerCase()] = Number(m[1]);
          }
          return [letter!.toLowerCase(), effects];
        }),
      );
    expect(parse(table[0]![5]!)).toEqual(expected['origin.summer']);
    expect(parse(table[1]![5]!)).toEqual(expected['origin.trouble']);
    expect(parse(table[2]![5]!)).toEqual(expected['origin.talent']);

    // Marginal effect through the real resolver: swap one answer of the reference build to each
    // answer in turn; the difference between two answers equals the difference of their effects.
    for (const [qid, answers] of Object.entries(expected)) {
      for (const f of FACTIONS) {
        const zero = { str: 0, int: 0, agi: 0, chaBase: 0 };
        const base = outcome(withAnswer(qid, 'a'), f).stats;
        for (const [aid, eff] of Object.entries(answers)) {
          const got = outcome(withAnswer(qid, aid), f).stats;
          const effA = { ...zero, ...answers.a };
          const want = { ...zero, ...eff };
          for (const k of ['str', 'int', 'agi', 'chaBase'] as const) {
            expect(got[k] - base[k], `${f} ${qid} ${aid} ${k}`).toBe(want[k] - effA[k]);
          }
        }
      }
    }
  });

  it('the coat: A wears the father’s coat (CHA 5), B pays +150 Iron in the faction outfit (CHA 2), C wears the promised coat (keepsake) and +1 CHA base', () => {
    const cell = table[3]![5]!;
    expect(cell).toMatch(/CHA 5/);
    expect(cell).toMatch(/\+150 IM/);
    expect(cell).toMatch(/keepsake.*\+1 CHA base/);
    for (const f of FACTIONS) {
      const outfit = content.faction(f).kit.outfit;
      const a = outcome(withAnswer('origin.coat', 'a'), f);
      const b = outcome(withAnswer('origin.coat', 'b'), f);
      const c = outcome(withAnswer('origin.coat', 'c'), f);
      // Iron: 0, 150, 0 (§21.4: every new character starts with 0 Iron; +150 if refused).
      expect([a.iron, b.iron, c.iron]).toEqual([0, 150, 0]);
      // The reference build's CHA base is 0; the promised coat adds 1.
      expect([a.stats.chaBase, b.stats.chaBase, c.stats.chaBase]).toEqual([0, 0, 1]);
      // Worn CHA: 5, 2, 6 (onboarding §4.1 "2 (refused) · 5 (accepted) · 6 (promised)").
      const wa = wornOf(a, f);
      const wb = wornOf(b, f);
      const wc = wornOf(c, f);
      expect([wa.cha, wb.cha, wc.cha], f).toEqual([5, 2, 6]);
      expect(wa.equipped).toEqual(['outfit.fathers-coat', 'doc.party-card']);
      expect(wb.equipped).toEqual([outfit, 'doc.party-card']);
      expect(wc.equipped).toEqual(['outfit.fathers-coat-promised', 'doc.party-card']);
      // The outfit is kept (not worn) when a coat is taken: nothing is destroyed at the start.
      for (const w of [wa, wc]) expect(w.doc.inventory.map((e) => e.itemId)).toContain(outfit);
      expect(content.item('outfit.fathers-coat-promised')?.keepsake).toBe(true);
      expect(content.item('outfit.fathers-coat')?.keepsake).toBe(false);
    }
  });

  it('the promise chooses the Ambition; the wish pays +50 FXP only when the chosen faction matches (3 × 3)', () => {
    const ambitions = { a: 'clear-his-name', b: 'settle-his-debts', c: 'finish-his-work' };
    for (const [aid, amb] of Object.entries(ambitions)) {
      expect(outcome(withAnswer('origin.promise', aid), 'collective').ambitionId).toBe(amb);
    }
    const wishes: Record<string, FactionId> = { a: 'vanguard', b: 'collective', c: 'alliance' };
    for (const [aid, wished] of Object.entries(wishes)) {
      for (const f of FACTIONS) {
        const o = outcome(withAnswer('origin.wish', aid), f);
        expect(o.fxp, `wish ${aid} joining ${f}`).toBe(f === wished ? 50 : 0);
      }
    }
    expect(table[5]![5]).toMatch(
      /\+50 FXP seed toward Vanguard \/ Collective \/ Alliance, paid if you join that faction/,
    );
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

  it('§8.5 reference recruits: Collective 10/12/5 CHA 2 with 150 Iron and +50 FXP; Vanguard 11/11/5/2; Alliance 8/14/5/2', () => {
    const want: Record<FactionId, [number, number, number, number, number]> = {
      collective: [10, 12, 5, 2, 50],
      vanguard: [11, 11, 5, 2, 0],
      alliance: [8, 14, 5, 2, 0],
    };
    for (const f of FACTIONS) {
      const o = outcome(REF, f);
      const w = wornOf(o, f);
      expect([o.stats.str, o.stats.int, o.stats.agi, w.cha, o.fxp], f).toEqual(want[f]);
      expect(o.iron).toBe(150);
      expect(o.ambitionId).toBe('finish-his-work');
    }
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
    expect(rows.map((r) => r.id).sort()).toEqual(content.items.map((i) => i.id).sort());
    for (const r of rows) {
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
      'finish-his-work': ['His ward book', { rank: 2 }, 'keep.ward-book'],
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
      expect(amb.chapters[1]?.story).toBeUndefined();
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
  const text = (JSON.stringify(rawContent) + JSON.stringify(copy) + samples).replace(
    /"[a-z0-9_]+([.-][a-z0-9_]+)+(\.(png|jpg|svg))?"/gi,
    '"[id]"',
  );

  it('uses none of the checklist’s militia, real-world or war words in any display string or alt text', () => {
    const banned =
      /\b(footsoldiers?|sergeants?|lieutenants?|captains?|commanders?|marshals?|colonels?|generals?|drill(ed|ing|s)?|musters?|garrisons?|barracks|billets?|parades?|bugles?|patrols?|roll call|uniforms?|hold the line|conscription|martial law|torch(es|light)?|above all|the nation first|purity|blood|race|storm(ing|troopers?)?|purges?|salutes?|runes?|fasces|eagles?|wreaths?|commissars?|politburo|presidium|political officer|people's hero|comrades?|war|troops|army|militia|invasion|siege|front|uprising|enemy|enemies)\b/gi;
    const hits = [...text.matchAll(banned)].map((m) =>
      text.slice(Math.max(0, m.index! - 25), m.index! + m[0].length + 25),
    );
    // Allowed by the review (§6) and slice 1: "the General Strike" (a union event), "the front row"
    // (seats) and "columns out front" (a building).
    const allowed = hits.filter((h) => !/General Strike|front row|out front/.test(h));
    expect(allowed).toEqual([]);
  });

  it('the Vanguard card and wish read as reviewed (review §3)', () => {
    const v = content.faction('vanguard');
    expect(v.card.signatureEvent).toBe('the Grand Rally');
    expect(v.card.blurb).not.toMatch(/soldier|garrison|nation above all/i);
    const wish = content.origin.steps[2]!.questions[1]!.answers[0]!;
    expect(wish.text).toBe('Order. Somebody has to keep the streets quiet.');
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
