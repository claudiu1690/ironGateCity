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
import type { FactionId } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import CITIES from '../../../docs/design/slice-2-cities.md?raw';
import ONB from '../../../docs/design/slice-2-onboarding.md?raw';
import {
  ContentError,
  copy,
  isCheckedAction,
  isShiftAction,
  loadContent,
  parseContent,
  rawContent,
} from '../src';
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

describe('the real content, slice 2', () => {
  it('has 3 cities, 64 actions, 9 jobs, 36 order templates, 3 papers, 10 items, 3 Ambitions, 6 faces', () => {
    expect(content.cities.map((c) => c.id)).toEqual(['coalport', 'duskwall', 'ashford']);
    expect(content.cities.flatMap((c) => c.locations.flatMap((l) => l.actions))).toHaveLength(64);
    expect(content.jobs).toHaveLength(9);
    // Slice 3 adds six crisis templates (Restore the base, two per faction), which never rotate.
    expect(content.orderTemplates.filter((t) => t.use === 'rotation')).toHaveLength(36);
    expect(content.cities.map((c) => c.paper?.shortName)).toEqual(['Clarion', 'Sentinel', 'Gazette']);
    // Slice 2's nine, and chapter 2's keepsake that GDD §21.4 catalogues for slice 3.
    expect(content.items).toHaveLength(10);
    expect(content.ambitions.map((a) => [a.id, a.chaptersPlanned])).toEqual([
      ['finish-his-work', 12],
      ['clear-his-name', 12],
      ['settle-his-debts', 12],
    ]);
    expect(content.avatars).toHaveLength(6);
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
      [
        'vanguard',
        'stahl',
        'Organiser Stahl',
        'Beacon House',
        ['dir.v.guard-change', 'dir.v.report', 'dir.v.work-shift'],
      ],
      [
        'collective',
        'holm',
        'Secretary Holm',
        'the Union Hall',
        ['dir.shift-change', 'dir.report', 'dir.work-shift'],
      ],
      ['alliance', 'grey', 'Mr Grey', 'the Rooms', ['dir.a.print-room', 'dir.a.report', 'dir.a.work-shift']],
    ]);
    expect(content.factions.map((f) => f.kit.outfit)).toEqual([
      'outfit.work-jacket',
      'outfit.mill-coat',
      'outfit.worn-overcoat',
    ]);
    expect(content.factions.map((f) => copy.theirEvent(f.card.signatureEvent))).toEqual([
      'Their event: the Grand Rally',
      'Their event: the General Strike',
      'Their event: the Headline Story',
    ]);
    expect(content.factions.map((f) => copy.statBonus(f.startingBonus))).toEqual([
      '+3 Strength',
      '+2 Strength, +1 Intelligence',
      '+3 Intelligence',
    ]);
    expect(content.hqOf('vanguard').location.id).toBe('duskwall.beacon-house');
    expect(content.hqOf('alliance').location.id).toBe('ashford.assembly-rooms');
  });

  it('builds the reference recruits exactly (onboarding §2.4) and pays the seed only to Justice', () => {
    const recruit = (factionId: FactionId) => {
      const f = content.faction(factionId);
      const r = resolveOrigin({ origin: content.originSpec, answers: content.origin.reference, faction: f });
      if (!r.ok) throw new Error(r.reason);
      const c = buildNewCharacter({
        userId: 'u',
        name: 'Mara',
        avatarId: null,
        factionId,
        homeCityId: f.homeCityId,
        outcome: r.outcome,
        answers: content.origin.reference,
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
      return [c.stats.str, c.stats.int, c.stats.agi, cha, c.iron, c.fxp];
    };
    expect(recruit('collective')).toEqual([10, 12, 5, 2, 150, 50]);
    expect(recruit('vanguard')).toEqual([11, 11, 5, 2, 150, 0]);
    expect(recruit('alliance')).toEqual([8, 14, 5, 2, 150, 0]);
  });

  it('shows the first-pin canvass at 66 % / 62 % / 74 % for the reference recruits', () => {
    const odds = (cityId: string, values: { str: number; int: number; agi: number; cha: number }) => {
      const city = content.city(cityId)!;
      const a = city.locations[0]!.actions.find((x) => x.type === 'canvass');
      if (!a || !isCheckedAction(a)) throw new Error('no canvass at pin 1');
      return computeCheck({ stats: a.stats, values, difficulty: tier1Difficulty(city.role) }).chance;
    };
    expect(odds('coalport', { str: 10, int: 12, agi: 5, cha: 2 })).toBe(66);
    expect(odds('duskwall', { str: 11, int: 11, agi: 5, cha: 2 })).toBe(62);
    expect(odds('ashford', { str: 8, int: 14, agi: 5, cha: 2 })).toBe(74);
  });
});

describe.each([
  ['duskwall', 'vanguard', '## 1. Duskwall', '## 2. Ashford', 'dir.v.', 'hl.v.'],
  ['ashford', 'alliance', '## 2. Ashford', '## 3. Notes', 'dir.a.', 'hl.a.'],
] as const)('%s vs docs/design/slice-2-cities.md', (cityId, factionId, start, end, dirPrefix, hlPrefix) => {
  const doc = section(CITIES, start, end);
  const city = content.city(cityId)!;
  const actions = city.locations.flatMap((l) => l.actions);

  it('locations: ids, names, kinds, map positions and blurbs, in pin order', () => {
    const r = rows(section(doc, 'Locations (6)', '**Reserved'), /^\| \d+ \| `/);
    expect(r).toHaveLength(6);
    r.forEach(([n, id, name, kind, xy, blurb], i) => {
      const loc = city.locations[i]!;
      expect(Number(n)).toBe(i + 1);
      expect([loc.id, loc.name, loc.kind, loc.blurb]).toEqual([unq(id!), name, unq(kind!), blurb]);
      const [x, y] = xy!.split(',').map((v) => Number(v.trim()));
      expect(loc.map).toEqual({ x, y });
    });
  });

  it('actions: ids, titles, types, stats, Energy, and the reward columns from the §5.5 rates', () => {
    const r = rows(section(doc, 'Tier-1 actions', '**Count by type'), /^\| `/);
    expect(r).toHaveLength(actions.length);
    for (const [id, title, type, std, e, xp, fxp, iron, opinion] of r.map((c) => c.map(unq))) {
      const a = actions.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.name, id).toBe(title);
      if (isCheckedAction(a!)) {
        expect([a.type, a.stats.map((s) => s.toUpperCase()).join('+'), a.energy], id).toEqual([
          type,
          std,
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
      } else if (isShiftAction(a!)) {
        expect(type).toMatch(/^job/);
        expect(content.job(a.jobId)!.shiftEnergy, id).toBe(Number(e));
      } else {
        expect(type).toBe(`training (${a!.trains.toUpperCase()})`);
      }
    }
  });

  it('outcome text word for word', () => {
    const block = section(doc, 'Outcome text', '\n## ');
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
    for (const [name, id, , unlock, e, pay] of r) {
      const job = content.job(unq(id!))!;
      expect(job.name).toBe(unq(name!));
      expect(job.shiftEnergy).toBe(Number(e));
      expect(job.dailyPay).toBe(Number(unq(pay!).match(/\d+/)![0]));
      const level = Number(unlock!.match(/Level (\d+)/)![1]);
      expect(job.unlock.level).toBe(level);
      if (/216/.test(pay!)) expect(job.factionPayBonus).toEqual({ [factionId]: 0.2 });
      const blurb = doc.match(new RegExp(`- \\*\\*${unq(name!)}\\*\\* — (.+)`))![1];
      expect(job.blurb).toBe(blurb);
    }
  });

  it('twelve order templates: slots, titles, targets and the secretary lines', () => {
    const r = rows(section(doc, 'Order templates (12)', '### '), /^\| `dir\./);
    const mine = content.orderTemplates.filter((t) => t.id.startsWith(dirPrefix));
    expect(r).toHaveLength(12);
    expect(mine.map((t) => t.factionId).every((f) => f === factionId)).toBe(true);
    r.forEach(([id, slot, title, , target, line], i) => {
      const t = mine[i]!;
      expect([t.id, t.slot, t.line, t.target]).toEqual([
        unq(id!),
        slot,
        line,
        Number(target!.match(/\d+/)![0]),
      ]);
      expect(title!.startsWith(t.title), `${t.id}: ${title}`).toBe(true);
    });
  });

  it('the paper: headlines and decks, the morale no-break space, the ambient pool', () => {
    const r = rows(section(doc, 'headline templates', '**Ambient'), /^\| `hl\./);
    const mine = content.headlines.filter((h) => h.id.startsWith(hlPrefix));
    for (const [id, , , headline, deck] of r) {
      const ids = id!.includes('/') ? [`${hlPrefix}streak-5`, `${hlPrefix}streak-10`] : [unq(id!)];
      if (ids[0]!.includes('ambient')) continue;
      for (const hid of ids) {
        const h = mine.find((x) => x.id === hid);
        expect(h, hid).toBeDefined();
        const want = headline!.includes('Five / Ten')
          ? `${hid.endsWith('5') ? 'Five' : 'Ten'} Straight Shifts and Counting`
          : headline!.replace(' %', ' %');
        expect(h!.headline, hid).toBe(want);
        expect(h!.deck, hid).toBe(deck);
        expect(h!.cityId).toBe(cityId);
      }
    }
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

  it('§2: three steps, their kickers and narratives', () => {
    const got = steps.map((s) => [s.title, s.kicker, s.narrative]);
    for (const [title, kicker, narrative] of got) {
      const sec = section(ONB, `— ${title}`, '###');
      expect(sec).toContain(`Kicker: *${kicker}*`);
      expect(sec).toContain(`Narrative: ${narrative}`);
    }
    expect(got.map((g) => g[0])).toEqual(['The room', 'The talent', 'The promise']);
  });

  it('§2: every question, answer and hint word for word; no number on any origin screen', () => {
    for (const q of questions) {
      expect(ONB, q.id).toContain(`**"${q.prompt}"**`);
      const table = ONB.slice(ONB.indexOf(`**"${q.prompt}"**`)).split('\n\n')[1]!;
      const r = rows(table, /^\| [ABC] \|/);
      expect(
        r.map((x) => x[1]),
        q.id,
      ).toEqual(q.answers.map((a) => a.text));
      for (const [i, a] of q.answers.entries()) {
        if (r[i]!.length === 4) expect(a.hint, `${q.id} ${a.id}`).toBe(r[i]![2]);
        else expect(a.hint).toBeUndefined();
        // No game number; the only digits are the year of the Mill Fire ('19).
        expect(`${a.text} ${a.hint ?? ''} ${a.echo ?? ''}`.replace("'19", '')).not.toMatch(/\d/);
      }
    }
  });

  it('§2: the nine echo lines, on the first question of each step only (§13 Q1)', () => {
    const table = rows(section(ONB, '**Echo lines**', '### 2.1'), /^\| \d \*/);
    expect(table).toHaveLength(3);
    steps.forEach((s, i) => {
      expect(s.questions[0].answers.map((a) => a.echo)).toEqual(table[i]!.slice(1));
      expect(s.questions[1].answers.every((a) => a.echo === undefined)).toBe(true);
    });
  });

  it('§5: the street, its note, and the three cards word for word', () => {
    const street = content.origin.street;
    expect(ONB).toContain(`Kicker *${street.kicker}*`);
    expect(ONB).toContain(`**${street.title}** ${street.narrative.replace('the Herald', 'the *Herald*')}`);
    expect(ONB).toContain(`*${street.note}*`);
    for (const f of content.factions) {
      const line = ONB.split('\n').find((l) => l.includes(` ${f.name}** — `))!;
      expect(line.split(' — ')[1]).toBe(f.card.blurb);
      const facts = ONB.split('\n')[ONB.split('\n').indexOf(line) + 1]!;
      const city = content.city(f.homeCityId)!.name;
      expect(facts).toBe(
        `*${copy.statBonus(f.startingBonus)} · ${copy.startsIn(city)} · ${copy.theirEvent(f.card.signatureEvent)}*`,
      );
    }
  });

  it('§4.2: the nine items with slot, tier, CHA and keepsake flag', () => {
    const r = rows(section(ONB, '### 4.2', '§21.2'), /^\| `/);
    // The slice-3 keepsake (GDD §21.4) is not in the slice-2 design's list.
    const slice2 = content.items.filter((i) => i.id !== 'keep.election-bill');
    expect(r.map((x) => unq(x[0]!))).toEqual(slice2.map((i) => i.id));
    for (const [id, name, slot, , effects, flags] of r) {
      const item = content.item(unq(id!))!;
      expect(item.name).toBe(name);
      expect(item.slot ?? 'keepsake (no slot)').toBe(
        slot!.startsWith('keepsake') ? 'keepsake (no slot)' : slot,
      );
      expect(item.cha).toBe(Number(effects!.match(/CHA (\d)/)?.[1] ?? 0));
      expect(item.keepsake).toBe(flags!.includes('keepsake'));
    }
  });

  it('§3: each chapter 1 word for word, with its numbers (§3.1)', () => {
    const sections = {
      'finish-his-work': '### 3.2',
      'clear-his-name': '### 3.3',
      'settle-his-debts': '### 3.4',
    };
    for (const amb of content.ambitions) {
      const doc = section(ONB, sections[amb.id as keyof typeof sections], '\n### ');
      const ch = amb.chapters[0]!;
      const s = ch.story!;
      expect(doc).toContain(`Chapter 1: *${ch.title}*`);
      expect(doc).toContain(s.choose.narrative);
      expect(doc).toContain(`**Step 2** · *${s.check.title}*\n${s.check.narrative}`);
      expect(doc).toContain(`CTA: **${s.check.cta} · ${s.check.energy} Energy**`);
      for (const c of s.choose.choices) expect(doc).toContain(`| ${c.text} | ${c.hint} |`);
      for (const a of s.check.approaches) {
        expect(doc).toContain(
          `| ${a.text} | ${a.stats.map((x) => x.toUpperCase()).join('+')} vs ${s.check.difficulty}`,
        );
      }
      for (const [label, o] of [
        ['Success', 'success'],
        ['Partial', 'partial'],
        ['Failure', 'failure'],
      ] as const) {
        expect(doc).toContain(`- ${label} — *${s.result[o].headline}* — ${s.result[o].body}`);
      }
      const hook = amb.chapters[1]!;
      // The requirement part is superseded in slice 3 (slice-3-politics.md §17 Q21: chapter 2 keys
      // off the first ballot); until then the content keeps the slice-2 requirement.
      expect(doc).toContain(`Chapter 2, "${hook.title}": from {date}, `);
      // Slice 3: Finish His Work chapter 2 opens "after your first ballot".
      expect(copy.chapterNeeds(hook.requires!)).toMatch(/^((Rank|Level) \d+|after your first ballot)$/);
      expect(doc).toContain(copy.keepsakeLine(content.item(s.keepsake)!.name));
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
      expect([h.headline, h.deck]).toEqual([headline, deck]);
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
    expect(r.map((x) => unq(x[0]!))).toEqual(content.avatars);
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

  it('the origin', () => {
    fails((c) => (c.origin.steps[0].questions[0].answers[1]!.id = 'a'), /duplicate answer ids/);
    fails((c) => {
      c.origin.steps[2].questions[0].answers[0]!.effects = [{ kind: 'iron', value: 1 }];
    }, /exactly one Ambition/);
    fails((c) => {
      c.origin.steps[2].questions[1].answers[0]!.effects = [{ kind: 'wish', factionId: 'alliance', fxp: 50 }];
    }, /a wish for each faction/);
    fails((c) => (c.origin.reference[0]!.answerId = 'z'), /unknown answer "z"/);
    fails((c) => (c.origin.steps[0].art = 'portrait.father'), /a portrait, not a scene/);
    fails((c) => {
      c.origin.steps[1].questions[1].answers[0]!.effects = [{ kind: 'wear', itemId: 'doc.party-card' }];
    }, /which is not clothing/);
    fails((c) => (c.origin.steps[0].narrative = 'One. Two. Three. Four. Five.'), /5 sentences/);
    fails((c) => (c.origin.steps[0].narrative = 'Hello {rank}.'), /unknown story placeholder \{rank\}/);
  });

  it('factions', () => {
    fails((c) => (c.factions[0]!.welcomeOrders[0] = 'dir.v.report'), /not a vanguard template in slot A/);
    fails((c) => (c.factions[0]!.welcomeOrders[2] = 'dir.v.sharpen-up'), /has no noJob variant/);
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
