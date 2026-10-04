/**
 * Slice 5 (T8): the risk headlines of the three home papers and the Herald, word for word against
 * docs/design/slice-5-risk.md §14, with their conditions and priorities (tech design §11.2); the new
 * UI copy against docs/design/slice-5-screens.md §11, the help notes of §2.3 and the duty officer's
 * and matron's lines (§6.2, §7.2); vocabulary over every new string. The arrays are imported
 * directly; the loader's wiring is checked in its own describe.
 */
import {
  PLACEHOLDERS,
  POLITICAL_PLACEHOLDERS,
  CAPITAL_PLACEHOLDERS,
  RISK_PLACEHOLDERS,
  TIME_TOKENS,
  isPoliticalTemplate,
  placeholdersIn,
} from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import DESIGN from '../../../docs/design/slice-5-risk.md?raw';
import SCREENS from '../../../docs/design/slice-5-screens.md?raw';
import { loadContent } from '../src';
import { HeadlineTemplateSchema } from '../src/schemas';
import { ambitions } from '../src/data/ambitions';
import { copy } from '../src/data/copy';
import { held } from '../src/data/held';
import { riskHeadlines } from '../src/data/headlines';
import { issues } from '../src/data/issues';
import { items } from '../src/data/items';
import { journeyEvents } from '../src/data/journeyEvents';
import { opponents } from '../src/data/opponents';
import { orderTemplates } from '../src/data/orders';
import { playerStrings, systemTermHits } from './vocabulary';

const hl = HeadlineTemplateSchema.array().parse(riskHeadlines);
const byId = new Map(hl.map((h) => [h.id, h]));
const get = (id: string) => {
  const h = byId.get(id);
  expect(h, id).toBeDefined();
  return h!;
};
const plain = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
function section(doc: string, start: string, end: string): string {
  const from = doc.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = doc.indexOf(end, from + 1);
  expect(to, end).toBeGreaterThan(from);
  return doc.slice(from, to);
}
/** The italic segments of a paragraph, in order. */
const italics = (text: string) => [...text.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]!);

const NAMES = [
  'quarter-open',
  'mission-first',
  'seen',
  'name-taken',
  'cells',
  'infirmary',
  'record-up',
  'rival-trip',
  'deported',
  'rival-pressure',
] as const;
const HERALD_NAMES = NAMES.filter((n) => n !== 'quarter-open' && n !== 'rival-pressure');
const WHEN: Record<(typeof NAMES)[number], unknown[]> = {
  'quarter-open': [{ kind: 'levelCrossed', level: 6 }],
  'mission-first': [{ kind: 'missionFirstYesterday' }],
  seen: [{ kind: 'heatState', min: 'hot' }],
  'name-taken': [{ kind: 'markYesterday' }],
  cells: [{ kind: 'arrestedYesterday' }],
  infirmary: [{ kind: 'admittedYesterday' }],
  'record-up': [{ kind: 'recordRose' }],
  'rival-trip': [{ kind: 'rivalGroundYesterday' }],
  deported: [{ kind: 'deportedYesterday' }],
  'rival-pressure': [{ kind: 'moraleLostToRivals', min: 1 }],
};
const PAPERS = [
  { prefix: 'hl.', cityId: 'coalport', names: NAMES },
  { prefix: 'hl.v.', cityId: 'duskwall', names: NAMES },
  { prefix: 'hl.a.', cityId: 'ashford', names: NAMES },
  { prefix: 'hl.ig.', cityId: 'irongate', names: HERALD_NAMES },
] as const;

const CLARION = section(DESIGN, '**The Coalport Clarion**', '`{how}` is one of')
  .split('\n')
  .filter((l) => l.startsWith('| `hl.'))
  .map((l) =>
    l
      .split('|')
      .slice(1, -1)
      .map((c) => plain(c.trim())),
  );
const paragraph = (start: string) => {
  const p = section(DESIGN, start, '\n\n');
  return p.slice(p.indexOf('decks:') + 'decks:'.length);
};

describe('the risk headlines (design §14)', () => {
  it('ten per home paper and eight for the Herald, each in its paper, ids unique', () => {
    expect(hl.map((h) => h.id).sort()).toEqual(
      PAPERS.flatMap((p) => p.names.map((n) => `${p.prefix}${n}`)).sort(),
    );
    for (const p of PAPERS) for (const n of p.names) expect(get(`${p.prefix}${n}`).cityId).toBe(p.cityId);
    expect(byId.has('hl.ig.quarter-open') || byId.has('hl.ig.rival-pressure')).toBe(false);
  });

  it("the Clarion's ten word for word, with group, priority and condition", () => {
    expect(CLARION).toHaveLength(10);
    for (const [id, gp, , headline, deck] of CLARION) {
      const h = get(id!);
      expect([h.headline, h.deck], id).toEqual([headline, deck]);
      const [, group, priority] = /^(personal|city) (\d)/.exec(gp!)!;
      expect([h.group, h.priority], id).toEqual([group, Number(priority)]);
    }
  });

  it("the other papers' decks word for word, and their headlines as the Clarion's with their own police", () => {
    const decks: Record<string, string[]> = {
      'hl.v.': italics(paragraph('**The Duskwall Sentinel**')).slice(0, 10),
      'hl.a.': italics(paragraph('**The Ashford Gazette**')).slice(0, 10),
      'hl.ig.': italics(paragraph('**The Irongate Herald**')).slice(0, 8),
    };
    for (const p of PAPERS.slice(1))
      expect(
        p.names.map((n) => get(`${p.prefix}${n}`).deck),
        p.prefix,
      ).toEqual(decks[p.prefix]);
    // The substitutions the design names, and (a deviation: the Clarion's headline names its own
    // quarter and city) the paper's own second quarter and city.
    const swap: Record<string, Array<[string, string]>> = {
      'hl.v.': [
        ['the Harbour Police', 'the Lock-up'],
        ['The Harbour', 'The Pass'],
        ['Coalport', 'Duskwall'],
      ],
      'hl.a.': [
        ['the Harbour Police', 'the Police Station'],
        ['The Harbour', 'The Wharf'],
        ['Coalport', 'Ashford'],
      ],
      'hl.ig.': [['the Harbour Police', 'Police Headquarters']],
    };
    expect(DESIGN).toContain(
      "Headlines as the Clarion's with *the Lock-up* for *the Harbour Police* and *Beacon House* for *the branch*.",
    );
    expect(DESIGN).toContain("Headlines as the Clarion's with *the Police Station* and *the Rooms*.");
    expect(DESIGN).toContain("Headlines as the Clarion's with *Police Headquarters*.");
    for (const p of PAPERS.slice(1))
      for (const n of p.names) {
        let want = get(`hl.${n}`).headline;
        for (const [a, b] of swap[p.prefix]!) want = want.replace(a, b);
        expect(get(`${p.prefix}${n}`).headline, `${p.prefix}${n}`).toBe(want);
      }
  });

  it('conditions, groups and priorities as the Clarion has them in every paper (tech design §11.2)', () => {
    for (const p of PAPERS)
      for (const n of p.names) {
        const h = get(`${p.prefix}${n}`);
        expect(h.when, h.id).toEqual(WHEN[n]);
        expect([h.group, h.priority], h.id).toEqual([get(`hl.${n}`).group, get(`hl.${n}`).priority]);
      }
    // Live: only Rival Callers (a political-kind condition); the rest are stored.
    expect(
      hl
        .filter((h) => isPoliticalTemplate(h))
        .map((h) => h.id)
        .sort(),
    ).toEqual(['hl.rival-pressure', 'hl.v.rival-pressure', 'hl.a.rival-pressure'].sort());
    // In Print (marked by id on the server): the four the design marks.
    const inPrint = CLARION.filter((r) => r[1]!.includes('In Print')).map((r) => r[0]!.slice(3));
    expect(inPrint).toEqual(['seen', 'cells', 'infirmary', 'deported']);
  });

  it('placeholders only from the risk set and the existing ones, of the right kind', () => {
    const stored = new Set<string>([...PLACEHOLDERS, ...RISK_PLACEHOLDERS]);
    const live = new Set<string>([
      ...POLITICAL_PLACEHOLDERS,
      ...TIME_TOKENS,
      ...CAPITAL_PLACEHOLDERS,
      ...RISK_PLACEHOLDERS,
    ]);
    for (const h of hl) {
      const used = placeholdersIn(`${h.headline} ${h.deck ?? ''}`);
      expect(
        used.filter((x) => !(isPoliticalTemplate(h) ? live : stored).has(x)),
        h.id,
      ).toEqual([]);
    }
  });

  it('headline ≤ 80 as written; deck ≤ 200 filled with the longest tokens', () => {
    const missionNames = [...DESIGN.matchAll(/^\*\*(.+?)\*\* \(`[a-z-]+\.[a-z-]+\.[a-z-]+`\) · /gm)].map(
      (m) => m[1]!,
    );
    expect(missionNames).toHaveLength(22);
    const longest = (xs: string[]) => xs.reduce((a, b) => (b.length > a.length ? b : a), '');
    const how = /`\{how\}` is one of \*(.+?)\* \/ \*(.+?)\* \/ \*(.+?)\*;/.exec(DESIGN)!.slice(1);
    const LONGEST: Record<string, string> = {
      name: 'N'.repeat(40),
      missionTitle: longest(missionNames),
      minutes: '90',
      how: longest(how),
      opponent: longest(opponents.map((o) => o.label)),
      recordLevel: 'a Repeat Offender',
      marks: '99',
      pct: '30',
      rivalCity: 'Coalport',
      lost: '2.0',
    };
    const fill = (s: string) => s.replace(/\{(\w+)\}/g, (w, k: string) => LONGEST[k] ?? w);
    const over: string[] = [];
    for (const h of hl) {
      expect(h.headline.length, h.id).toBeLessThanOrEqual(80);
      const n = fill(h.deck!).length;
      if (n > 200) over.push(`${h.id}: ${n}`);
    }
    // DESIGN, recorded for the designer: three decks run over 200 once filled with the longest
    // mission title (*Tear down the Collective's posters on the brewery wall*, 54) and the longest
    // {how} (35). Transcribed word for word; the raw templates are within 200 (the schema's bound).
    expect(LONGEST.missionTitle).toBe("Tear down the Collective's posters on the brewery wall");
    expect(over).toEqual(['hl.cells: 215', 'hl.a.name-taken: 203', 'hl.a.cells: 205']);
  });
});

/** A placeholder token as an argument, so a copy function prints the design's `{token}`. */
const P = (name: string) => `{${name}}` as never;

describe('the new UI copy, word for word against slice-5-screens.md §11', () => {
  const r = copy.risk;
  const listed = italics(section(SCREENS, '## 11. Copy', 'British English, no exclamation'))
    // "{n} mark{s}" is a plural; the copy prints "1 mark" and "{n} marks" (checked below).
    .map((s) => s.replace('{n} mark{s}', '{n} marks'));
  const ledger = ambitions.find((a) => a.id === 'settle-his-debts')!.chapters[1]!;
  const produced: string[] = [
    r.missions,
    r.label.speech,
    r.label.watch,
    r.label.against(P('faction')),
    r.chooseAWay,
    r.again,
    r.chooseAnotherWay,
    r.lastTime,
    r.wayCost(P('way'), P('n')),
    r.needsEnergy(P('n')),
    r.locked.level(P('n')),
    r.locked.rank(P('rank3')),
    copy.needsReputation(2),
    r.locked.record,
    r.heatPlus(P('n')),
    r.riskWord.safe,
    r.riskWord.littleRisk,
    r.riskWord.risky,
    r.riskWord.dangerous,
    r.ifCaught(1),
    r.ifCaught(2),
    r.ifCaught(3),
    r.runInWord(P('word')),
    r.outcome.success,
    r.outcome.partial,
    r.outcome.failure,
    r.takenIn,
    r.carriedOff,
    r.dropped.ran,
    r.dropped.lost,
    copy.reason.failure(P('cause')),
    r.outmatched,
    r.remembered,
    r.agility(P('n')),
    r.heatMove(P('a'), P('b'), P('state'), P('time')),
    r.heatLine(P('n'), P('state')),
    r.heatState.cool,
    r.heatState.noticed,
    r.heatState.hot,
    r.heatState.wanted,
    r.heatCard.noticed,
    r.heatCard.hot,
    r.heatCard.wanted,
    r.nameTaken(P('n'), P('level')),
    r.secondTime,
    r.recordCard,
    r.yourRecord,
    r.recordLevel.clean,
    r.recordLevel.onFile,
    r.recordLevel.repeat,
    r.recordLevel.notorious,
    r.recordLine(P('level'), P('n')),
    r.fadesOn(P('weekday')),
    r.bailDoubled,
    r.strikeOff(30),
    copy.needsPc(30),
    r.struck.stamp,
    r.struck.headline,
    r.struck.body(P('n')),
    copy.pcLeft(30, P('left')),
    r.health,
    r.healthValue(P('hp'), P('max')),
    r.healthMove(P('a'), P('b'), P('time')),
    r.runInKicker(P('place')),
    r.you(P('hp'), P('max'), P('n'), P('state')),
    r.rows.fight,
    r.rows.run,
    r.rows.talk,
    r.rows.pay(P('n')),
    r.nearlyAlways,
    r.wontBeBought,
    r.needsIron(P('n')),
    r.bestFreeOdds,
    r.leaveItToLuck,
    r.oneChoice,
    r.parts.fullStrength(P('n')),
    r.parts.paidOff(P('n')),
    r.yourRecordPart(P('n')),
    r.parts.rivalGround(P('n')),
    r.opinionAgainst(P('faction'), P('city')),
    r.cells.kicker(P('place')),
    r.minutes(P('n')),
    r.cells.outAt(P('time')),
    r.cells.youCanClose(P('time')),
    r.cells.payBail(P('n')),
    r.cells.bailDouble,
    r.cells.legalAid,
    r.cells.tap,
    r.released.stamp,
    r.released.headline,
    r.released.body,
    r.bailPaid(P('n')),
    r.deported.stamp,
    r.deported.headline,
    r.deported.body(P('city')),
    r.barredFrom(P('city'), P('time')),
    r.infirmary.kicker,
    r.infirmary.outAt(P('time'), P('hp'), P('max')),
    r.infirmary.youCanClose(P('time')),
    r.infirmary.walkOut(5, 100),
    r.infirmary.discharge(5),
    r.infirmary.tap,
    r.discharged.stamp,
    r.discharged.headline,
    r.discharged.headlineWell,
    r.discharged.body(P('hp'), P('max')),
    r.wardPaid(100),
    r.desk.cells(P('place'), P('n'), P('iron')),
    r.desk.infirmary(P('place'), P('n')),
    r.desk.whereYouAre,
    r.desk.rivalGround(P('city')),
    copy.travel.rivalGround,
    r.rival.cardLine(P('faction')),
    r.rival.cardNote,
    r.rival.barred(P('time')),
    r.rival.placeLine(P('city')),
    r.rivalGroundTag,
    r.rival.ordersIn(P('city')),
    r.cantLiveHere,
    r.rival.drawsFrom(P('faction'), P('left')),
    r.pressureCapped,
    r.rival.arrivalWarning,
    r.flags.watched(P('city')),
    r.flags.warned(P('city')),
    r.cards.papersDetail,
    r.cards.payTheLamp(30),
    r.quarters.title,
    r.quarters.opensAt(6),
    r.quarters.later,
    r.quarters.kicker(6),
    r.quarters.kickerLater,
    r.quarters.levelOpens(6, P('n')),
    r.quarters.subtitle(P('city'), P('quarter')),
    // Content, not copy: the Letters row's sender and the keepsake's name.
    ledger.story!.letterFrom,
    r.chapterHeat(6),
    copy.keepsakeLine(items.find((i) => i.id === ledger.story!.keepsake)!.name),
  ];

  it('every §11 string is produced, and nothing else', () => {
    expect([...new Set(produced)].sort()).toEqual([...new Set(listed)].sort());
    expect(new Set(produced).size).toBe(produced.length);
  });

  it('the plural, article and state forms beyond the design string', () => {
    expect(r.nameTaken(1, 'On file')).toBe('The police took your name · 1 mark · On file');
    expect(r.nameTaken(3, 'Repeat offender')).toBe('The police took your name · 3 marks · Repeat offender');
    expect(r.recordLine('On file', 1)).toBe('On file · 1 mark');
    expect(r.minutes(1)).toBe('1 minute');
    expect(r.heatMove('+6', 6, r.heatState.cool, null)).toBe('Heat +6 → 6 · Cool');
    expect(r.heatMove('+8', 32, r.heatState.noticed, '20:40')).toBe(
      'Heat +8 → 32 · Noticed · cools by 20:40',
    );
    expect(r.locked.rank('Organiser')).toBe('Organisers and above');
    // Design §13's quiet-way knock-on.
    expect(DESIGN).toContain(`${r.heatMove('+6', 6, r.heatState.cool, null)} · ${r.heatFirstCool}`);
    // The screens' examples, as the copy builds them.
    expect(SCREENS).toContain(r.ifCaught(1));
    expect(SCREENS).toContain(r.desk.cells('Harbour Police', 24, 150));
    expect(SCREENS).toContain(r.you(125, 125, 14, 'Cool'));
  });

  it('the help notes word for word (screens §2.3)', () => {
    const table = section(SCREENS, '### 2.3 Help notes', '### 2.4')
      .split('\n')
      .filter((l) => l.startsWith('| `'))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    expect(table).toHaveLength(8);
    for (const [keyCell, kicker, note] of table) {
      const key = /`(\w+)`/.exec(keyCell!)![1] as keyof typeof r.help;
      expect(r.help[key](), key).toEqual([kicker, note]);
    }
    expect(Object.keys(r.help).sort()).toEqual(table.map((t) => /`(\w+)`/.exec(t[0]!)![1]).sort());
  });

  it("the duty officer's and the matron's lines word for word (screens §6.2, §7.2)", () => {
    const cells = section(SCREENS, 'one line in body italic, by case: ', '3. **The sentence**');
    expect(italics(cells)).toEqual([r.dutyOfficer.home, r.dutyOfficer.rival, r.dutyOfficer.again]);
    const ward = section(SCREENS, '48 px) and one line: ', '3. **The sentence:**');
    expect(italics(ward)).toEqual([r.matron.first, r.matron.again]);
    // The release modals' texts as tech design §10.3 and screens §6.6, §7.6 give them.
    expect(SCREENS).toContain(
      `stamp **${r.released.stamp}**, headline *${r.released.headline}*, body *${r.released.body}*`,
    );
    expect(SCREENS).toContain(
      `the stamp is **${r.deported.stamp}**, the headline *${r.deported.headline}*, the body *${r.deported.body('Duskwall')}*`,
    );
    expect(SCREENS).toContain(
      `stamp **${r.discharged.stamp}**, headline *${r.discharged.headline}* / *${r.discharged.headlineWell}* (paid)`,
    );
    expect(SCREENS).toContain(
      `stamp **${r.struck.stamp}**, headline *${r.struck.headline}*, body *${r.struck.body(P('n'))}*`,
    );
  });

  it("the run-in's did line (drafts for the designer) in the order of the steps", () => {
    expect(r.didLine('player', [{ row: 'pay', ok: true }])).toBe('You paid them off.');
    expect(
      r.didLine('player', [
        { row: 'run', ok: false },
        { row: 'fight', ok: false },
      ]),
    ).toBe('You tried to run; they were faster. You fought. You lost.');
    expect(r.didLine('luck', [{ row: 'talk', ok: true }])).toBe(
      'You left it to luck. You talked your way out.',
    );
    expect(r.didLine('auto', [{ row: 'fight', ok: true }])).toBe(
      'You left it, so luck chose. You fought. You won.',
    );
  });
});

describe('vocabulary over the new strings (screens §1; review 2 §1.13; content-policy §7)', () => {
  const hostile = journeyEvents.filter((j) => j.deck === 'hostile');
  const sources = [
    { name: 'headlines', value: riskHeadlines },
    { name: 'opponents', value: opponents },
    { name: 'held', value: held },
    { name: 'cards', value: hostile },
    { name: 'issues', value: issues.slice(-5) },
    { name: 'orders', value: orderTemplates.filter((t) => t.minLevel !== undefined) },
    { name: 'chapter', value: ambitions.find((a) => a.id === 'settle-his-debts')!.chapters.slice(1) },
    { name: 'copy', value: copy.risk },
  ];
  // Every player-facing string (ids and enums skipped), the copy's functions called with neutral
  // arguments, and a did line built once.
  const text = [
    // A card's `deck: 'hostile'` is an enum, not a headline's deck.
    ...sources.flatMap((s) =>
      playerStrings(s.value)
        .filter((p) => !(p.key === 'deck' && p.text === 'hostile'))
        .map((p) => p.text),
    ),
    copy.risk.didLine('luck', [{ row: 'fight', ok: false }]),
  ].join('\n');

  it('no system term (the hospital ward is allowed in its everyday sense, design §23.8)', () => {
    expect(systemTermHits(sources)).toEqual([]);
  });

  it("none of the screens' banned words: encounter, bluff, bribe, flee, approach, criminal record, jail, hospital, surveillance, sabotage, hostile", () => {
    const banned =
      /.{0,30}\b(encounters?|bluff\w*|brib\w*|flee\w*|approach\w*|criminal record|jail\w*|hospital\w*|surveillance|sabotage|hostile)\b.{0,30}/gi;
    expect([...text.matchAll(banned)].map((m) => m[0])).toEqual([]);
  });

  it('no war framing, no rank, no torch, no "in front of", no weapon; British English without exclamation marks', () => {
    const war =
      /\b(war|wars|warfare|battle|battles|battlefield|uprising|insurrection|revolt|troops|soldiers?|army|armies|militia|invade|invasion|attack|assault|siege|combat|enemy|enemies|weapon|guns?|rifles?|knife|knives|bomb|kill|killed|garrisons?|barracks|drill(s|ed|ing)?|musters?|mustered|marshals?|sergeants?|uniforms?|purges?|purged|torch(es|light)?|patrols?|comrades?|race)\b/gi;
    expect([...text.matchAll(war)].map((m) => m[0])).toEqual([]);
    expect(text).not.toMatch(/\bfront\b/i);
    expect(text).not.toMatch(/UTC|!/);
  });
});

describe('the loaded content (needs the city half of T8 too)', () => {
  it('every paper carries its risk set through the loader, the stored ones in the settlement selector', () => {
    const content = loadContent();
    for (const p of PAPERS) {
      const stored = content.headlinesOf(p.cityId).map((h) => h.id);
      const live = content.politicalHeadlinesOf(p.cityId).map((h) => h.id);
      for (const n of p.names)
        expect(n === 'rival-pressure' ? live : stored, `${p.prefix}${n}`).toContain(`${p.prefix}${n}`);
    }
  });
});
