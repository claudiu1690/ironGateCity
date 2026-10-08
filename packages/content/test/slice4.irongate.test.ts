/**
 * Slice 4 (T8): Irongate's content, word for word against docs/design/slice-4-battleground.md §4
 * (the city, §4.1 districts, §4.2 frames, §4.3 locations, §4.4 actions, §4.5 jobs, §4.6 texts) and
 * the overview anchors in docs/design/slice-4-screens.md §5.1. Pins equal the survey (`mapPins`).
 */
import { describe, expect, it } from 'vitest';
import DESIGN from '../../../docs/design/slice-4-battleground.md?raw';
import SCREENS from '../../../docs/design/slice-4-screens.md?raw';
import { irongate } from '../src/data/cities/irongate';
import { irongateJobs } from '../src/data/jobs';
import { mapPins } from '../src/data/mapPins';
import { City, isCheckedAction, isTrainingAction } from '../src/schemas';
import type { Action } from '../src/schemas';

const unq = (s: string) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\*/g, '');

function section(doc: string, start: string, end: string): string {
  const from = doc.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = doc.indexOf(end, from + 1);
  expect(to, end).toBeGreaterThan(from);
  return doc.slice(from, to);
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
const pair = (s: string) => s.split(',').map((v) => Number(v.trim()));

const S41 = section(DESIGN, '### 4.1 ', '### 4.2 ');
const S42 = section(DESIGN, '### 4.2 ', '**How the frame behaves**');
const S43 = section(DESIGN, '### 4.3 ', '**Content-policy note.**');
const S44 = section(DESIGN, '### 4.4 ', '### 4.5 ');
const S45 = section(DESIGN, '### 4.5 ', '### 4.6 ');
const S46 = section(DESIGN, '### 4.6 ', '## 5. Moving within Irongate');

/** The design's 29 places; review 4's City Hall (ADR 0077, the 30th) is in review4.hall.test.ts. */
const places = irongate.locations.filter((l) => l.kind !== 'town-hall');
const actions: Action[] = places.flatMap((l) => l.actions);

describe('Irongate, the city (design §4)', () => {
  it('parses against the City schema', () => {
    expect(() => City.parse(irongate)).not.toThrow();
  });

  it('is the battleground with the Herald and the City Hall (§4, §19 #7)', () => {
    expect(irongate).toMatchObject({
      id: 'irongate',
      name: 'Irongate',
      role: 'battleground',
      map: { day: 'map.irongate.day', night: 'map.irongate.night' },
      clouds: true,
      paper: {
        name: 'The Irongate Herald',
        shortName: 'Herald',
        strapline: 'All the republic, every morning',
        price: '6 marks',
      },
      // Review 4 (ADR 0077): the hall is a place, read from its pin (0.57, 0.345).
      council: { offset: 0, seats: 10, hall: { locationId: 'irongate.city-hall' } },
    });
    expect(irongate.homeFactionId).toBeUndefined();
    // The design's own words for the hall.
    expect(DESIGN).toContain("`council.hall { name: 'City Hall', ref: 'the City Hall', x: 0.57, y: 0.345 }`");
    expect(DESIGN).toContain(
      '***The Irongate Herald*** · short name *Herald* · strapline *All the republic, every morning* · 6 marks',
    );
  });

  it('has a baseline that is the equal average of the five districts: 21 / 21 / 21 / 37', () => {
    const ds = irongate.quarters.map((q) => q.district!.baselineOpinion);
    const avg = (k: keyof (typeof ds)[number]) => ds.reduce((s, d) => s + d[k], 0) / ds.length;
    expect({
      vanguard: avg('vanguard'),
      collective: avg('collective'),
      alliance: avg('alliance'),
      neutral: avg('neutral'),
    }).toEqual(irongate.baselineOpinion);
    expect(irongate.baselineOpinion).toEqual({ vanguard: 21, collective: 21, alliance: 21, neutral: 37 });
  });
});

describe('the five districts (§4.1, §4.2; screens §5.1)', () => {
  const table = rows(S41, /^\| `irongate\./);
  const frames = rows(S42, /^\| .+\(`irongate\./);
  const anchors = rows(section(SCREENS, '| # | District | Anchor x, y |', '\n\n'), /^\| \d \| /);

  it('are the quarters, in §4.1 order, word for word', () => {
    expect(table).toHaveLength(5);
    expect(frames).toHaveLength(5);
    expect(anchors).toHaveLength(5);
    expect(
      irongate.quarters.map((q) => [
        q.id,
        q.name,
        q.blurb,
        q.district!.n,
        [
          q.district!.baselineOpinion.vanguard,
          q.district!.baselineOpinion.collective,
          q.district!.baselineOpinion.alliance,
          q.district!.baselineOpinion.neutral,
        ],
      ]),
    ).toEqual(table.map((r, i) => [unq(r[0]!), r[1], r[2], i + 1, r[3]!.split(' / ').map(Number)]));
  });

  it('have the §4.2 frames and the screens §5.1 anchors', () => {
    expect(irongate.quarters.map((q) => [q.id, q.frame])).toEqual(
      frames.map((r) => {
        const id = /\(`(irongate\.[a-z-]+)`\)/.exec(r[0]!)![1];
        const [x0, y0, x1, y1] = pair(unq(r[2]!));
        return [id, { x0, y0, x1, y1 }];
      }),
    );
    expect(irongate.quarters.map((q) => [q.district!.n, q.name, q.district!.anchor])).toEqual(
      anchors.map((r) => {
        const [x, y] = pair(r[2]!);
        return [Number(r[0]), r[1], { x, y }];
      }),
    );
  });

  it('every baseline sums to 100', () => {
    for (const q of irongate.quarters) {
      const b = q.district!.baselineOpinion;
      expect(b.vanguard + b.collective + b.alliance + b.neutral, q.id).toBe(100);
    }
  });

  it('every place pin lies at least 0.02 inside its district frame', () => {
    for (const l of irongate.locations) {
      const q = irongate.quarters.find((d) => d.id === l.quarterId);
      expect(q, l.id).toBeDefined();
      const f = q!.frame!;
      const inset = Math.min(l.map.x - f.x0, f.x1 - l.map.x, l.map.y - f.y0, f.y1 - l.map.y);
      expect(inset, l.id).toBeGreaterThanOrEqual(0.02 - 1e-9);
    }
  });
});

describe('the 29 locations (§4.3)', () => {
  // Rows with the district heading each sits under.
  const table: { row: string[]; district: string }[] = [];
  let district = '';
  for (const line of S43.split('\n')) {
    const h = /^\*\*(.+)\*\*$/.exec(line.trim());
    if (h) district = h[1]!;
    if (/^\| \d+ \| `irongate\./.test(line)) table.push({ row: rows(line, /./)[0]!, district });
  }

  it('are the design table word for word, in pin order', () => {
    expect(table).toHaveLength(29);
    expect(places).toHaveLength(29);
    expect(irongate.locations).toHaveLength(30);
    const districtId = (name: string) => irongate.quarters.find((q) => q.name === name)?.id;
    expect(
      places.map((l, i) => [
        i + 1,
        l.id,
        l.name,
        l.kind,
        l.factionId,
        l.map.x,
        l.map.y,
        l.blurb,
        l.quarterId,
      ]),
    ).toEqual(
      table.map(({ row: r, district: d }) => {
        const kind = unq(r[3]!);
        const hq = /^faction-hq \((\w+)\)$/.exec(kind);
        const [x, y] = pair(r[4]!);
        return [
          Number(r[0]),
          unq(r[1]!),
          r[2],
          hq ? 'faction-hq' : kind,
          hq ? hq[1]!.toLowerCase() : undefined,
          x,
          y,
          r[5],
          districtId(d),
        ];
      }),
    );
  });

  it('the three HQs are members-only faction HQs', () => {
    expect(irongate.locations.filter((l) => l.kind === 'faction-hq').map((l) => [l.id, l.factionId])).toEqual(
      [
        ['irongate.concord-house', 'alliance'],
        ['irongate.union-house', 'collective'],
        ['irongate.vanguard-house', 'vanguard'],
      ],
    );
    expect(irongate.locations.filter((l) => l.factionId).every((l) => l.kind === 'faction-hq')).toBe(true);
  });

  it('every map equals its survey pin, in the survey order, district by district', () => {
    const pins = mapPins.irongate!.pins;
    expect(irongate.locations.map((l) => l.id)).toEqual(pins.map((p) => p.id));
    for (const l of irongate.locations) {
      const p = pins.find((s) => s.id === l.id)!;
      expect(l.map, l.id).toEqual({ x: p.x, y: p.y });
      expect(irongate.quarters.find((q) => q.id === l.quarterId)!.district!.n, l.id).toBe(p.quarter);
    }
  });

  it('a name that takes an article has a lower-case ref', () => {
    for (const l of irongate.locations) {
      if (l.name.startsWith('The ')) expect(l.ref, l.id).toBe(`the ${l.name.slice(4)}`);
    }
  });
});

describe('the actions (§4.4)', () => {
  const table = rows(S44, /^\| `irongate\./);
  const STATS: Record<string, string[]> = {
    INT: ['int'],
    'CHA+INT': ['cha', 'int'],
    'CHA+STR': ['cha', 'str'],
    STR: ['str'],
    AGI: ['agi'],
  };
  const ENERGY: Record<string, number> = { canvass: 10, speech: 12, propaganda: 8, council: 10 };
  const VERBS: Record<string, string> = {
    'irongate.supreme-court.law-library': 'Study',
    'irongate.st-agnes.porters': 'Carry',
    'irongate.central-station.platforms': 'Run',
    'irongate.foundry-row.run': 'Run',
    'irongate.vanguard-house.gymnasium': 'Lift',
  };

  it('are the design table, in its order, with the mapped stats and Energy', () => {
    expect(actions.map((a) => a.id)).toEqual(table.map((r) => unq(r[0]!)));
    for (const [i, r] of table.entries()) {
      const a = actions[i]!;
      const id = unq(r[0]!);
      expect(a.name, id).toBe(r[1]!.replace(' · *members only*', ''));
      expect(a.tier, id).toBe(1);
      const training = /^training \((INT|STR|AGI)\)$/.exec(r[2]!);
      if (training) {
        expect(isTrainingAction(a), id).toBe(true);
        if (!isTrainingAction(a)) continue;
        expect(a.trains, id).toBe(training[1]!.toLowerCase());
        expect(a.verb, id).toBe(VERBS[id]);
        expect(r[4], id).toBe(`20 + 2×${training[1]}`);
        continue;
      }
      expect(isCheckedAction(a), id).toBe(true);
      if (!isCheckedAction(a)) continue;
      expect(a.type, id).toBe(r[2]);
      if (a.type === 'council') {
        // GDD §8.4 (review 1): a committee session is a best-stat check (design §4.4, 3 Oct 2026).
        expect(r[3], id).toBe('best (§8.4)');
        expect(a.stats, id).toEqual(['best']);
      } else {
        expect(a.stats, id).toEqual(STATS[r[3]!]);
      }
      expect(a.energy, id).toBe(Number(r[4]));
      if (a.type !== 'intelligence') expect(a.energy, id).toBe(ENERGY[a.type]);
      else expect([3, 4], id).toContain(a.energy);
      expect([a.givesFxp, a.givesOpinion], id).toEqual(
        a.type === 'intelligence' ? [false, false] : a.type === 'council' ? [true, false] : [true, true],
      );
    }
  });

  it('every action belongs to its location (ids dotted by containment)', () => {
    for (const l of irongate.locations) {
      for (const a of l.actions) expect(a.id.startsWith(`${l.id}.`), a.id).toBe(true);
    }
  });

  it('the members-only actions are exactly the HQ actions', () => {
    const membersOnly = table.filter((r) => r[1]!.endsWith(' · *members only*')).map((r) => unq(r[0]!));
    const atHq = irongate.locations.filter((l) => l.factionId).flatMap((l) => l.actions.map((a) => a.id));
    expect(atHq).toEqual(membersOnly);
  });

  it('counts by type: the table and its count line agree (62, decided 3 Oct 2026)', () => {
    const count = (xs: string[]) =>
      xs.reduce<Record<string, number>>((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {});
    const tableTypes = table.map((r) => (r[2]!.startsWith('training') ? 'training' : r[2]!));
    const built = count(actions.map((a) => a.type));
    expect(built).toEqual(count(tableTypes));
    expect(built).toEqual({
      canvass: 21,
      speech: 10,
      propaganda: 12,
      intelligence: 11,
      council: 3,
      training: 5,
    });
    expect(actions).toHaveLength(62);
    // The design's count line, pinned so that a change to either shows here.
    expect(S44).toContain(
      '**Count by type:** canvass 21 · speech 10 · propaganda 12 · intelligence 11 · council 3 · training 5 = **62**',
    );
    expect(S44).toContain(
      'Checked actions: 57, of which INT 22, CHA+INT 15, STR 7, CHA+STR 4, AGI 6 (propaganda), and the three committee sessions at the **best stat**',
    );
    const checked = table.filter((r) => !r[2]!.startsWith('training'));
    expect(checked).toHaveLength(57);
    expect(count(checked.map((r) => r[3]!))).toEqual({
      INT: 22,
      'CHA+INT': 15,
      STR: 7,
      'CHA+STR': 4,
      AGI: 6,
      'best (§8.4)': 3,
    });
  });
});

describe('the outcome texts (§4.6)', () => {
  type Texts = {
    title: string;
    success?: [string, string];
    partial?: [string, string];
    trained?: [string, string];
  };
  const blocks = new Map<string, Texts>();
  let current: Texts | undefined;
  for (const line of S46.split('\n')) {
    const head = /^\*\*(.+?)\*\* \(`(irongate\.[a-z.-]+)`/.exec(line);
    if (head) {
      current = { title: head[1]! };
      expect(blocks.has(head[2]!), head[2]).toBe(false);
      blocks.set(head[2]!, current);
      continue;
    }
    const t = /^- (Success|Partial|Trained) — \*(.+?)\* — (.+)$/.exec(line);
    if (t) {
      expect(current, line).toBeDefined();
      current![t[1]!.toLowerCase() as 'success' | 'partial' | 'trained'] = [t[2]!, t[3]!];
    }
  }

  it('one block per action, titled as the action', () => {
    expect([...blocks.keys()]).toEqual(actions.map((a) => a.id));
    for (const a of actions) expect(blocks.get(a.id)!.title, a.id).toBe(a.name);
  });

  it('every headline and body word for word', () => {
    for (const a of actions) {
      const b = blocks.get(a.id)!;
      if (a.type === 'training') {
        expect(b.success ?? b.partial, a.id).toBeUndefined();
        expect([a.text.success.headline, a.text.success.body], a.id).toEqual(b.trained);
      } else {
        expect(b.trained, a.id).toBeUndefined();
        expect([a.text.success.headline, a.text.success.body], a.id).toEqual(b.success);
        expect([a.text.partial.headline, a.text.partial.body], a.id).toEqual(b.partial);
      }
    }
  });

  it('every body is at most 240 characters', () => {
    for (const a of actions) {
      const texts = a.type === 'training' ? [a.text.success] : [a.text.success, a.text.partial];
      for (const t of texts) expect(t.body.length, a.id).toBeLessThanOrEqual(240);
    }
  });
});

describe('the three Irongate jobs (§4.5)', () => {
  const table = rows(S45, /^\| \*\*[A-Z]/);
  const where: Record<string, string> = {
    'Central Station': 'irongate.central-station',
    'Market Square': 'irongate.market-square',
    'Riverside Quays': 'irongate.riverside-quays',
  };

  it('word for word, at Irongate locations, with no faction fifth', () => {
    expect(table).toHaveLength(3);
    expect(irongateJobs.map((j) => [j.name, j.id, j.locationId, j.unlock, j.dailyPay, j.blurb])).toEqual(
      table.map((r) => {
        const unlock = /^Level (\d+)(?:, (STR|INT|AGI) (\d+))?$/.exec(r[3]!)!;
        return [
          unq(r[0]!),
          unq(r[1]!),
          where[r[2]!],
          unlock[2]
            ? { level: Number(unlock[1]), stats: { [unlock[2].toLowerCase()]: Number(unlock[3]) } }
            : { level: Number(unlock[1]) },
          // Review 5 (GDD §9.2): the bold figure (*240* (was 200 until review 5)).
          Number(/\d+/.exec(unq(r[4]!))![0]),
          r[5],
        ];
      }),
    );
    for (const j of irongateJobs) {
      expect(j.factionPayBonus, j.id).toBeUndefined();
      expect(
        irongate.locations.some((l) => l.id === j.locationId),
        j.id,
      ).toBe(true);
    }
  });
});
