/**
 * Slice 2 content (docs/tech/slice-2.md §4, §14): Duskwall and Ashford against
 * docs/design/slice-2-cities.md, the onboarding against docs/design/slice-2-onboarding.md (texts
 * word for word), the reference recruits through the rules, and the §4.3 cross-checks.
 */
import {
  FXP_TYPE_MULTIPLIER,
  buildNewCharacter,
  computeCheck,
  computeRewards,
  equippedItems,
  resolveOrigin,
  tier1Difficulty,
  wornCha,
} from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import CITIES from '../../../docs/design/slice-2-cities.md?raw';
import ONB from '../../../docs/design/slice-2-onboarding.md?raw';
import R1 from '../../../docs/design/review-1-answers.md?raw';
import {
  ContentError,
  copy,
  isCheckedAction,
  isWelcomeAction,
  loadContent,
  parseContent,
  rawContent,
} from '../src';
import type { ContentInput } from '../src';
import { mapPins } from '../src/data/mapPins';
import { plainHeadline, plainProse } from './review2';
import { expectChapterRestrung, itemNameNow, welcomeDeckNow } from './review5';

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

describe('the real content, slice 2', () => {
  it('has 3 cities, 55 actions, 9 jobs, 36 order templates, 3 papers, 10 items, 3 Ambitions, 6 faces', () => {
    // Slice 4 adds the capital (its city, jobs, papers and orders: slice4.*.test.ts); the slice-2
    // numbers are the home cities'.
    const home = content.cities.filter((c) => c.role === 'home');
    expect(home.map((c) => c.id)).toEqual(['coalport', 'duskwall', 'ashford']);
    // Review 1: the nine job-shift actions are gone (a job is a wage).
    // Slice 5's second quarters add 35 (slice5.cities.test.ts); slice 2's are the first quarters'.
    // Review 4's Town Halls (ADR 0077) are in review4.hall.test.ts.
    const first = (c: (typeof home)[number]) =>
      c.locations.filter((l) => l.quarterId === c.quarters[0]!.id && l.kind !== 'town-hall');
    // Review 4's favours (ADR 0073) are in review4.prologue.test.ts.
    expect(
      home.flatMap((c) => first(c).flatMap((l) => l.actions.filter((a) => !isWelcomeAction(a)))),
    ).toHaveLength(55);
    expect(content.jobs.filter((j) => !j.id.startsWith('irongate'))).toHaveLength(9);
    // Slice 3 adds six crisis templates (Restore the base, two per faction), which never rotate.
    expect(
      content.orderTemplates.filter(
        (t) => t.use === 'rotation' && t.residence !== 'capital' && t.minLevel === undefined,
      ),
    ).toHaveLength(36);
    expect(home.map((c) => c.paper?.shortName)).toEqual(['Clarion', 'Sentinel', 'Gazette']);
    // Slice 2's nine, and the chapter-2 keepsakes GDD §21.4 catalogues for slices 3 and 5.
    expect(content.items).toHaveLength(11);
    expect(content.ambitions.map((a) => [a.id, a.chaptersPlanned])).toEqual([
      ['finish-his-work', 12],
      ['clear-his-name', 12],
      ['settle-his-debts', 12],
    ]);
    // Six in slice 2; eighteen since the October art (art-wiring-oct.md §2, art-oct.test.ts).
    expect(content.avatars).toHaveLength(18);
    expect(content.faction('alliance').rankTitles[2]).toBe('Agent');
  });

  it('gives every faction a secretary, an HQ reference, a kit, a welcome set and a card', () => {
    expect(
      content.factions.map((f) => [
        f.id,
        f.secretary.npcId,
        f.secretary.addressedAs,
        f.hqRef,
        f.welcomeOrders,
      ]),
    ).toEqual([
      // Review 1 (answers §2): slot A by best trained stat; C Take a job. Review 4 (answers §2.6): B
      // the favour from the platform (it was the committee).
      [
        'vanguard',
        'stahl',
        'Organiser Stahl',
        'Beacon House',
        {
          A: { str: 'dir.v.guard-change', int: 'dir.v.w.ration-queue', agi: 'dir.v.w.leaflets-market' },
          B: 'dir.v.welcome-b',
          C: 'dir.v.take-a-job',
        },
      ],
      [
        'collective',
        'holm',
        'Secretary Holm',
        'the Union Hall',
        {
          A: { str: 'dir.noon-break', int: 'dir.shift-change', agi: 'dir.w.leaflets-market-row' },
          B: 'dir.welcome-b',
          C: 'dir.take-a-job',
        },
      ],
      [
        'alliance',
        'grey',
        'Mr Grey',
        'the Rooms',
        {
          A: { str: 'dir.a.w.bills', int: 'dir.a.print-room', agi: 'dir.a.w.evening-run' },
          B: 'dir.a.welcome-b',
          C: 'dir.a.take-a-job',
        },
      ],
    ]);
    expect(content.factions.map((f) => f.kit.outfit)).toEqual([
      'outfit.work-jacket',
      'outfit.mill-coat',
      'outfit.worn-overcoat',
    ]);
    // Review 4: the street's cards are gone; each party's event stays on its faction.
    expect(content.factions.map((f) => f.card.signatureEvent)).toEqual([
      'the Grand Rally',
      'the General Strike',
      'the Headline Story',
    ]);
    expect(content.factions.map((f) => copy.statBonus(f.startingBonus))).toEqual([
      '+3 Strength',
      '+2 Strength, +1 Intelligence',
      '+3 Intelligence',
    ]);
    expect(content.hqOf('vanguard').location.id).toBe('duskwall.beacon-house');
    expect(content.hqOf('alliance').location.id).toBe('ashford.assembly-rooms');
  });

  it('builds the reference recruit and the tuning characters exactly (review 4, GDD §8.5)', () => {
    const recruit = (helper: string, suitcase: string) => {
      const answers = [
        { questionId: 'origin.platform', answerId: helper },
        { questionId: 'origin.suitcase', answerId: suitcase },
        { questionId: 'origin.lining', answerId: 'ward-book' },
      ];
      const r = resolveOrigin({ origin: content.originSpec, answers, factions: content.factions });
      if (!r.ok) throw new Error(r.reason);
      const f = content.faction(r.outcome.factionId);
      const c = buildNewCharacter({
        userId: 'u',
        name: 'Mara',
        avatarId: null,
        factionId: f.id,
        homeCityId: f.homeCityId,
        outcome: r.outcome,
        answers,
        now: Date.UTC(2026, 8, 29, 9),
        uid: (() => {
          let n = 0;
          return () => `u${++n}`;
        })(),
      });
      const cha = wornCha(
        c.stats.chaBase,
        equippedItems(c.inventory, c.equipment, (id) => content.itemSpec(id)),
      );
      return [c.factionId, c.stats.str, c.stats.int, c.stats.agi, cha, c.iron, c.fxp];
    };
    expect(content.origin.reference.map((r) => r.answerId)).toEqual(['holm', 'books', 'ward-book']);
    expect(recruit('holm', 'books')).toEqual(['collective', 8, 12, 5, 5, 0, 0]);
    expect(recruit('stahl', 'tools')).toEqual(['vanguard', 14, 6, 5, 5, 0, 0]);
    expect(recruit('grey', 'books')).toEqual(['alliance', 6, 14, 5, 5, 0, 0]);
  });

  it('shows the first-pin canvass at 66 % / 74 % / 74 % (GDD §8.5: INT unchanged; Vanguard tools STR 14)', () => {
    const odds = (cityId: string, values: { str: number; int: number; agi: number; cha: number }) => {
      const city = content.city(cityId)!;
      const a = city.locations[0]!.actions.find((x) => x.type === 'canvass');
      if (!a || !isCheckedAction(a)) throw new Error('no canvass at pin 1');
      return computeCheck({ stats: a.stats, values, difficulty: tier1Difficulty(city.role) }).chance;
    };
    expect(odds('coalport', { str: 8, int: 12, agi: 5, cha: 5 })).toBe(66);
    expect(odds('duskwall', { str: 14, int: 6, agi: 5, cha: 5 })).toBe(74);
    expect(odds('ashford', { str: 6, int: 14, agi: 5, cha: 5 })).toBe(74);
  });
});

describe.each([
  ['duskwall', 'vanguard', '## 1. Duskwall', '## 2. Ashford', 'dir.v.', 'hl.v.'],
  ['ashford', 'alliance', '## 2. Ashford', '## 3. Notes', 'dir.a.', 'hl.a.'],
] as const)('%s vs docs/design/slice-2-cities.md', (cityId, factionId, start, end, dirPrefix, hlPrefix) => {
  const doc = section(CITIES, start, end);
  const city = content.city(cityId)!;
  // Review 4's Town Halls (ADR 0077) are in review4.hall.test.ts.
  const actions = city.locations
    .filter((l) => l.quarterId === city.quarters[0]!.id && l.kind !== 'town-hall')
    .flatMap((l) => l.actions)
    // Review 4 (ADR 0073): the favour from the platform is answers §2.6's (review4.prologue.test.ts).
    .filter((a) => !isWelcomeAction(a));

  // Maps v3 (design §5.3): the doc's positions were measured on the retired pen-and-ink map; a
  // location now sits at its approved pin in the survey (pins.json).
  it('locations: ids, names, kinds, map positions and blurbs, in pin order', () => {
    const r = rows(section(doc, 'Locations (6)', '**Reserved'), /^\| \d+ \| `/);
    expect(r).toHaveLength(6);
    r.forEach(([n, id, name, kind, , blurb], i) => {
      const loc = city.locations[i]!;
      expect(Number(n)).toBe(i + 1);
      expect([loc.id, loc.name, loc.kind, loc.blurb]).toEqual([unq(id!), name, unq(kind!), blurb]);
      const pin = mapPins[cityId]!.pins.find((p) => p.id === loc.id)!;
      expect(loc.map).toEqual({ x: pin.x, y: pin.y });
    });
  });

  it('actions: ids, titles, types, stats, Energy, and the reward columns from the §5.5 rates', () => {
    // Review 1: the job shifts left the content; the committee checks the best stat.
    const r = rows(section(doc, 'Tier-1 actions', '**Count by type'), /^\| `/).filter(
      (c) => !/^job/.test(unq(c[2]!)),
    );
    expect(r).toHaveLength(actions.length);
    for (const [id, title, type, std, e, xp, fxp, iron, opinion] of r.map((c) => c.map(unq))) {
      const a = actions.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.name, id).toBe(title);
      if (isCheckedAction(a!)) {
        expect([a.type, a.stats.map((s) => s.toUpperCase()).join('+'), a.energy], id).toEqual([
          type,
          a.type === 'council' ? 'BEST' : std,
          Number(e),
        ]);
        const reward = (outcome: 'success' | 'partial') =>
          computeRewards({
            tier: 1,
            energy: a.energy,
            outcome,
            givesFxp: a.givesFxp,
            givesOpinion: a.givesOpinion,
            restedUsed: 0,
            fxpRateMultiplier: FXP_TYPE_MULTIPLIER[a.type] ?? 1,
          });
        const s = reward('success');
        const p = reward('partial');
        expect(`${s.xp.total} / ${p.xp.total}`, `${id} XP`).toBe(xp);
        expect(a.givesFxp ? `${s.fxp.total} / ${p.fxp.total}` : '—', `${id} FXP`).toBe(fxp);
        expect(`${s.iron.total} / ${p.iron.total}`, `${id} Iron`).toBe(iron);
        expect(a.givesOpinion ? `${s.opinion} / ${p.opinion}` : '—', `${id} opinion`).toBe(opinion);
      } else {
        expect(type).toBe(`training (${a!.trains.toUpperCase()})`);
      }
    }
  });

  it('outcome text word for word', () => {
    // Review 2 (answers §1.5, §1.6, §1.13): the doc's prose predates the plain-words swaps.
    const block = plainProse(section(doc, 'Outcome text', '\n## '));
    for (const a of actions) {
      const at = block.indexOf(`(\`${a.id}\``);
      expect(at, a.id).toBeGreaterThan(-1);
      const lines = block.slice(at).split('\n').slice(1, 3);
      const parse = (line: string | undefined) => {
        const m = line?.match(/^- (Success|Partial|Worked|Trained) — \*(.+?)\* — (.+)$/);
        expect(m, `${a.id}: ${line}`).not.toBeNull();
        return { headline: m![2]!, body: m![3]! };
      };
      expect(a.text.success, a.id).toEqual(parse(lines[0]));
      if (isCheckedAction(a)) expect(a.text.partial, a.id).toEqual(parse(lines[1]));
    }
  });

  it('jobs with pinned pay, faction bonus, Energy, unlocks and blurbs', () => {
    const r = rows(
      section(doc, 'Jobs (§9', '### 1.4'.replace('1', cityId === 'duskwall' ? '1' : '2')),
      /^\| \*\*/,
    );
    expect(r).toHaveLength(3);
    for (const [name, id, , unlock, , pay] of r) {
      const job = content.job(unq(id!))!;
      expect(job.name).toBe(unq(name!));
      expect(job.dailyPay).toBe(Number(unq(pay!).match(/\d+/)![0]));
      const level = Number(unlock!.match(/Level (\d+)/)![1]);
      expect(job.unlock.level).toBe(level);
      if (/216/.test(pay!)) expect(job.factionPayBonus).toEqual({ [factionId]: 0.2 });
      const blurb = doc.match(new RegExp(`- \\*\\*${unq(name!)}\\*\\* — (.+)`))![1];
      expect(job.blurb).toBe(blurb);
    }
  });

  it('the order templates: slots and targets (review 1 rewrote the titles and lines, checked word for word in qa.content)', () => {
    const r = rows(section(doc, 'Order templates (12)', '### '), /^\| `dir\./);
    const mine = content.orderTemplates.filter((t) => t.id.startsWith(dirPrefix));
    expect(r).toHaveLength(12);
    expect(mine.map((t) => t.factionId).every((f) => f === factionId)).toBe(true);
    for (const [id, slot, , , target] of r) {
      // Review 1: the Work your shift orders left the rotation.
      if (unq(id!).endsWith('work-shift')) {
        expect(mine.some((t) => t.id === unq(id!))).toBe(false);
        continue;
      }
      const t = mine.find((x) => x.id === unq(id!))!;
      expect([t.slot, t.target], t.id).toEqual([slot, Number(target!.match(/\d+/)![0])]);
    }
  });

  it('the paper: headlines and decks, the morale no-break space, the ambient pool', () => {
    const r = rows(section(doc, 'headline templates', '**Ambient'), /^\| `hl\./);
    const mine = content.headlines.filter((h) => h.id.startsWith(hlPrefix));
    for (const [id, , , headline, deck] of r) {
      // Review 1 (answers §1.2): the streak headlines became the seniority ones (checked below).
      if (id!.includes('/')) continue;
      const hid = unq(id!);
      if (hid.includes('ambient')) continue;
      const h = mine.find((x) => x.id === hid);
      expect(h, hid).toBeDefined();
      // Review 2 (answers §1.8): the plain-words headlines and decks.
      expect(h!.headline, hid).toBe(plainHeadline(headline!.replace(' %', ' %')));
      // Review 1: no half pay any more (the developer's wording, marked for the designer).
      expect(h!.deck, hid).toBe(
        plainHeadline(deck!.replace('days of half pay', 'days of pay').replace('no half pay', 'no pay')),
      );
      expect(h!.cityId).toBe(cityId);
    }
    const five = mine.find((h) => h.id === `${hlPrefix}seniority-5`)!;
    const ten = mine.find((h) => h.id === `${hlPrefix}seniority-10`)!;
    expect(R1).toContain(`***${five.headline}***`);
    expect(R1).toContain(`deck *${five.deck}*`);
    expect(R1).toContain(`***${ten.headline}***`);
    expect(R1).toContain(`deck *${ten.deck}*`);
    expect([five.when, ten.when]).toEqual([
      [{ kind: 'seniorityHitYesterday', values: [5] }],
      [{ kind: 'seniorityHitYesterday', values: [10] }],
    ]);
    const pool = doc
      .match(/\*\*Ambient pool[^\n]*?\*\*(?: \(headline only\):)? (.+)\n/)![1]!
      .replace(/\.$/, '')
      .split(' · ');
    expect(mine.filter((h) => h.group === 'ambient').map((h) => h.headline)).toEqual(pool);
  });
});

describe('the onboarding vs docs/design/slice-2-onboarding.md', () => {
  const steps = content.origin.steps;
  const questions = steps.flatMap((s) => s.questions);

  // Review 4 (answers §2, GDD §7.1): onboarding §2 (the deathbed's six questions) and §5 (the street)
  // were superseded by *The Last Train In*, and that by review 5's *Coming home* (answers §19); its
  // texts are checked word for word against the answers in review5.opening.test.ts.
  it('§2, §5: superseded by review 5 (the counter, the kitbag, the post)', () => {
    expect(steps.map((s) => s.title)).toEqual(['The counter', 'The kitbag', 'The post']);
    expect(questions).toHaveLength(3);
    expect(ONB).toContain('— The room');
  });

  it('§4.2: the nine items with slot, tier, CHA and keepsake flag', () => {
    const r = rows(section(ONB, '### 4.2', '§21.2'), /^\| `/);
    // The slice-3 and slice-5 keepsakes (GDD §21.4) are not in the slice-2 design's list.
    const slice2 = content.items.filter((i) => !['keep.election-bill', 'keep.ledger-page'].includes(i.id));
    expect(r.map((x) => unq(x[0]!))).toEqual(slice2.map((i) => i.id));
    for (const [id, name, slot, , effects, flags] of r) {
      const item = content.item(unq(id!))!;
      // Review 5 (answers §19.4, §19.6): the suit and the keepsakes renamed, ids kept.
      expect(item.name).toBe(itemNameNow(name!));
      expect(item.slot ?? 'keepsake (no slot)').toBe(
        slot!.startsWith('keepsake') ? 'keepsake (no slot)' : slot,
      );
      expect(item.cha).toBe(Number(effects!.match(/CHA (\d)/)?.[1] ?? 0));
      expect(item.keepsake).toBe(flags!.includes('keepsake'));
    }
  });

  it('§3: each chapter 1 with its numbers (§3.1); the words are review 5’s (answers §19.10)', () => {
    const sections = {
      'finish-his-work': ['### 3.2', '19.10.1'],
      'clear-his-name': ['### 3.3', '19.10.3'],
      'settle-his-debts': ['### 3.4', '19.10.4'],
    } as const;
    for (const amb of content.ambitions) {
      const [onb, restrung] = sections[amb.id as keyof typeof sections];
      const doc = plainProse(section(ONB, onb, '\n### '));
      const ch = amb.chapters[0]!;
      const s = ch.story!;
      // Review 5 (answers §19.10): every string re-strung under *Coming home*; the ids, the stats,
      // the flags and the numbers are the slice-2 design's.
      expectChapterRestrung(ch, restrung);
      expect(doc).toContain(`CTA: **`);
      expect(doc).toContain(` · ${s.check.energy} Energy**`);
      for (const c of s.choose.choices) expect(c.flag).toMatch(/^[a-z-]+$/);
      for (const a of s.check.approaches) {
        // Review 1 (answers §2.1): the third approach, Legwork, on the best stat.
        if (a.id === 'legwork') {
          expect(a.stats).toEqual(['best']);
          continue;
        }
        expect(doc).toContain(`| ${a.stats.map((x) => x.toUpperCase()).join('+')} vs ${s.check.difficulty}`);
      }
      // Slice 3: chapter 2 of *The Names on the Stone* opens "after your first ballot".
      expect(copy.chapterNeeds(amb.chapters[1]!.requires!)).toMatch(/^((Rank|Level) \d+|after your first vote)$/);
      expect([s.check.difficulty, s.check.energy, s.rewards]).toEqual([
        8,
        10,
        {
          success: { xp: 150, fxp: 40, iron: 100 },
          partial: { xp: 75, fxp: 20, iron: 50 },
          failure: { xp: 25, fxp: 0, iron: 0 },
        },
      ]);
    }
  });

  it('§7: mastheads and the welcome and arrival headlines of every city', () => {
    const r = rows(section(ONB, '### 7.2', '### 7.3'), /^\| (Coalport|Duskwall|Ashford) \| `/);
    expect(r).toHaveLength(6);
    for (const [cityName, id, group, headline, deck] of r) {
      const h = content.headlines.find((x) => x.id === unq(id!).split(' ')[0])!;
      expect(h.cityId).toBe(cityName!.toLowerCase());
      // Review 1 (answers §3.4): the welcome deck named slot A's place; review 4 (answers §2.6): it
      // names the favour and the HQ; review 5 (answers §19.5): the favour from the counter.
      const want = deck!.replace(/Spend it at (.+) first\.$/, 'Spend it at {place} first.');
      expect([h.headline, h.deck]).toEqual([headline, welcomeDeckNow(want)]);
      expect(`${h.group} ${h.priority}`).toBe(group!.split(',')[0]);
      expect(h.when).toEqual([{ kind: 'firstEdition' }]);
    }
    const papers = rows(section(ONB, '### 7.1', 'Dateline'), /^\| (Coalport|Duskwall|Ashford) \|/);
    for (const [cityName, name, short, strap, price] of papers) {
      expect(content.city(cityName!.toLowerCase())!.paper).toEqual({
        name: unq(name!),
        shortName: short,
        strapline: strap,
        price,
      });
    }
  });

  it('§13.2: the six avatar alt texts', () => {
    const r = rows(section(ONB, '### 13.2', '### 13.3'), /^\| `avatar\./);
    // Still offered, among the eighteen of the October art (the order: art-oct.test.ts).
    expect(content.avatars).toEqual(expect.arrayContaining(r.map((x) => unq(x[0]!))));
    for (const [id, alt] of r) expect(content.asset(unq(id!)).alt).toBe(alt);
  });
});

describe('slice-2 cross-checks (tech design §4.3): one failing fixture each', () => {
  const fails = (mutate: (c: ContentInput) => void, message: RegExp) => {
    const c = clone();
    mutate(c);
    expect(() => parseContent(c)).toThrow(message);
  };

  it('items', () => {
    fails(
      (c) => (c.items.find((i) => i.id === 'keep.marker')!.keepsake = false),
      /no slot, so it must be a keepsake/,
    );
    fails((c) => (c.items[0]!.art = 'scene.newsroom'), /a scene, not a item or vector/);
    fails((c) => (c.factions[0]!.kit.outfit = 'doc.party-card'), /which is not clothing/);
    fails((c) => (c.factions[0]!.kit.card = 'outfit.mill-coat'), /which is not document/);
    fails((c) => (c.factions[0]!.kit.outfit = 'outfit.tuxedo'), /unknown item "outfit.tuxedo"/);
    fails((c) => (c.ambitions[0]!.chapters[0]!.story!.keepsake = 'outfit.mill-coat'), /is not a keepsake/);
  });

  it('the origin (review 4: the three beats, ADR 0073)', () => {
    fails((c) => (c.origin.steps[0].questions[0].answers[1]!.id = 'holm'), /duplicate answer ids/);
    fails((c) => {
      c.origin.steps[2].questions[0].answers[0]!.effects = [{ kind: 'wear', itemId: 'outfit.fathers-coat' }];
    }, /one Ambition and outfit.fathers-coat/);
    fails((c) => {
      c.origin.steps[0].questions[0].answers[1]!.effects = [{ kind: 'faction', factionId: 'collective', person: 'holm' }];
    }, /each party once/);
    fails((c) => {
      c.origin.steps[0].questions[0].answers[0]!.effects = [{ kind: 'faction', factionId: 'collective', person: 'stahl' }];
    }, /is not the collective secretary/);
    fails((c) => {
      delete c.origin.steps[0].questions[0].answers[0]!.confirm;
    }, /a portrait, two lines and a confirm/);
    fails((c) => {
      c.origin.steps[1].questions[0].answers[0]!.effects = [{ kind: 'stat', stat: 'str', value: 6 }];
    }, /\+6 to one stat and \+1 to another/);
    fails((c) => {
      c.origin.steps[1].questions[0].answers[0]!.effects = [
        { kind: 'stat', stat: 'str', value: 6 },
        { kind: 'stat', stat: 'str', value: 1 },
      ];
    }, /\+6 to one stat and \+1 to another/);
    fails((c) => {
      c.origin.steps[1].questions[0].answers[0]!.effects.push({ kind: 'faction', factionId: 'vanguard', person: 'stahl' });
    }, /only the platform carries a faction/);
    fails((c) => {
      c.origin.steps[1].questions[0].answers[0]!.effects = [
        { kind: 'stat', stat: 'str', value: 7 },
        { kind: 'stat', stat: 'int', value: 1 },
      ];
    }, ContentError as unknown as RegExp);
    fails((c) => (c.origin.reference[0]!.answerId = 'z'), /unknown answer "z"/);
    fails((c) => (c.origin.steps[0].art = 'portrait.holm'), /a portrait, not a scene/);
    fails((c) => {
      c.origin.steps[2].questions[0].answers[0]!.effects = [
        { kind: 'ambition', ambitionId: 'finish-his-work' },
        { kind: 'wear', itemId: 'doc.party-card' },
      ];
    }, /which is not clothing/);
    fails((c) => (c.origin.steps[1].narrative = 'One. Two. Three. Four. Five.'), /5 sentences \(at most 4\)/);
    // Review 5 (answers §19.2): the counter's news may run beat 1 to five sentences, not six.
    fails((c) => (c.origin.steps[0].narrative = 'One. Two. Three. Four. Five. Six.'), /6 sentences \(at most 5\)/);
    fails((c) => (c.origin.steps[0].narrative = 'Hello {rank}.'), /unknown story placeholder \{rank\}/);
    fails((c) => {
      delete c.npcs.find((n) => n.id === 'holm')!.pronoun;
    }, /needs a pronoun/);
  });

  it('the favour (review 4: a welcome ticket at the party HQ, ADR 0073)', () => {
    const favour = (c: ContentInput) =>
      c.cities.find((x) => x.id === 'coalport')!.locations.find((l) => l.id === 'coalport.union-hall')!
        .actions[0] as { use?: string; type: string };
    fails((c) => (favour(c).type = 'canvass'), /must be a council session/);
    fails((c) => {
      c.factions.find((f) => f.id === 'collective')!.welcomeOrders.B = 'dir.report';
    }, /its welcomeOrders.B/);
    fails((c) => {
      const mill = c.cities.find((x) => x.id === 'coalport')!.locations.find((l) => l.id === 'coalport.mill-gate')!;
      const a = mill.actions[0] as { use?: string };
      a.use = 'welcome';
    }, /must be at a party HQ/);
    // The favour is first on the HQ's sheet.
    expect(favour(clone()).use).toBe('welcome');
  });

  it('factions', () => {
    fails((c) => (c.factions[0]!.welcomeOrders.A.str = 'dir.v.report'), /not a vanguard template in slot A/);
    fails((c) => (c.factions[0]!.welcomeOrders.C = 'dir.v.sharpen-up'), /must match takeJob/);
    fails((c) => (c.factions[0]!.crestArt = 'portrait.stahl'), /a portrait, not a vector/);
    fails((c) => (c.factions[0]!.secretary.npcId = 'holm'), /is not of that faction/);
    fails((c) => {
      c.cities[1]!.locations[0]!.kind = 'faction-hq';
    }, /exactly one faction-hq/);
    fails((c) => {
      delete c.cities[1]!.paper;
    }, /home city without a paper/);
    fails(
      (c) => {
        (c.factions[0]!.startingBonus as Record<string, number>).cha = 1;
      },
      ContentError as unknown as RegExp,
    );
  });

  it('Ambitions and avatars', () => {
    fails((c) => (c.ambitions[0]!.chapters[1]!.n = 3), /numbered 1, 2/);
    fails((c) => {
      c.ambitions[0]!.chapters[0]!.requires = { rank: 2 };
    }, /chapter 1 must be playable with no requirement/);
    fails((c) => {
      const s = c.ambitions[0]!.chapters[0]!.story!;
      s.check.approaches[1]!.id = s.check.approaches[0]!.id;
    }, /duplicate approach ids/);
    fails((c) => (c.avatars[1] = c.avatars[0]!), /avatars must be distinct/);
    fails((c) => (c.avatars[0] = 'portrait.holm'), /a portrait, not a avatar/);
    fails(
      (c) => (c.art.assets.find((a) => a.id === 'crest.vanguard')!.widths = [128]),
      /a vector has no widths/,
    );
  });
});
