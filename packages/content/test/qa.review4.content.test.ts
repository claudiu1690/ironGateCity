/**
 * QA, review 4 (docs/qa/review-4-report.md): content checks made independently of the developer's
 * own review-4 tests. Irongate's districts sampled point by point (no dead area, no double cover),
 * home cities with no shapes, the halls open at Level 1 wherever painted, the routes, the new texts
 * against the vocabulary and the content policy, the countdown style at its edges, and the rank
 * ladder against GDD §5.4.
 *
 * Known bugs are `it.fails` (they pass while the bug is there; drop the marker when it is fixed).
 */
import { describe, expect, it } from 'vitest';
import GDD from '../../../docs/GDD.md?raw';
import ANSWERS from '../../../docs/design/review-4-answers.md?raw';
import { loadContent } from '../src';
import { boundary, copy, when } from '../src/data/copy';

const content = loadContent();
type Pt = readonly [number, number];

/** Ray casting; independent of the loader's own `inPolygon`. */
function inside(p: Pt, poly: readonly Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const nearEdge = (p: Pt, poly: readonly Pt[], eps: number) =>
  poly.some((a, i) => distToSegment(p, a, poly[(i + 1) % poly.length]!) < eps);

/** Every string in a value, deep. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) for (const v of x) strings(v, out);
  else if (x && typeof x === 'object') for (const v of Object.values(x)) strings(v, out);
  return out;
}

describe("Irongate's districts cover the whole picture (note #8, answers §8.1)", () => {
  const quarters = content.quartersOf('irongate');
  const outlines = quarters.map((q) => ({ id: q.id, poly: (q.outline ?? []) as readonly Pt[] }));

  it('five districts, each with an outline', () => {
    expect(outlines).toHaveLength(5);
    for (const o of outlines) expect(o.poly.length, o.id).toBeGreaterThanOrEqual(3);
  });

  it('a 400 × 400 grid over the picture: every point off a border is in exactly one district', () => {
    const N = 400;
    const dead: Pt[] = [];
    const doubled: Pt[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const p: Pt = [(i + 0.5) / N, (j + 0.5) / N];
        if (outlines.some((o) => nearEdge(p, o.poly, 1e-4))) continue;
        const n = outlines.filter((o) => inside(p, o.poly)).length;
        if (n === 0) dead.push(p);
        if (n > 1) doubled.push(p);
      }
    }
    expect(dead, 'points in no district').toEqual([]);
    expect(doubled, 'points in two districts').toEqual([]);
  });

  it('the corners and the river (water included) belong to a district', () => {
    const probes: Pt[] = [
      [0.001, 0.001],
      [0.999, 0.001],
      [0.001, 0.999],
      [0.999, 0.999],
      // On the river's middle line's neighbourhood, either side (answers §8.2).
      [0.1, 0.38],
      [0.1, 0.39],
      [0.9, 0.52],
      [0.9, 0.53],
    ];
    for (const p of probes) expect(outlines.filter((o) => inside(p, o.poly)).length, String(p)).toBe(1);
  });

  it("every capital place (the City Hall included) is inside its own district's outline", () => {
    const city = content.city('irongate')!;
    for (const l of city.locations) {
      const o = outlines.find((x) => x.id === l.quarterId)!;
      expect(inside([l.map.x, l.map.y], o.poly), l.id).toBe(true);
    }
  });
});

describe('home cities are one map (note #21, answers §21)', () => {
  it('no quarter of Coalport, Duskwall or Ashford carries a frame, an outline, a label or a district', () => {
    for (const cityId of ['coalport', 'duskwall', 'ashford']) {
      for (const q of content.quartersOf(cityId)) {
        const shape = q as unknown as Record<string, unknown>;
        expect([shape.frame, shape.outline, shape.label, shape.district], q.id).toEqual([
          undefined,
          undefined,
          undefined,
          undefined,
        ]);
        expect(q.name.length, q.id).toBeGreaterThan(0);
      }
    }
  });

  it('each home city has exactly one town-hall place, and it is the last of its list (§29 Q10)', () => {
    for (const cityId of ['coalport', 'duskwall', 'ashford']) {
      const halls = content.city(cityId)!.locations.filter((l) => l.kind === 'town-hall');
      expect(halls.map((l) => l.id), cityId).toEqual([`${cityId}.town-hall`]);
      expect(content.city(cityId)!.locations.at(-1)!.id).toBe(`${cityId}.town-hall`);
    }
  });
});

describe('the journey routes (note #7, answers §7.1)', () => {
  it('every point is on the picture, and no leg doubles back on itself by more than half its length', () => {
    for (const r of content.nation.routes) {
      let len = 0;
      for (const [x, y] of r.points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
      for (let i = 1; i < r.points.length; i++)
        len += Math.hypot(r.points[i]![0] - r.points[i - 1]![0], r.points[i]![1] - r.points[i - 1]![1]);
      const a = r.points[0]!;
      const b = r.points.at(-1)!;
      const straight = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // A rail line wanders, but a leg three times its crow-fly length would be a tracing slip.
      expect(len / straight, r.to).toBeLessThan(3);
    }
  });
});

describe('the rank ladder (note #25, answers §25, GDD §5.4)', () => {
  it('the floors 0 · 400 · 2,000 · 6,000 · 15,000 · 25,000 · 60,000 and seven plain lines, as the answers table', () => {
    const lines = Object.values(copy.ranks.opens);
    expect(lines).toHaveLength(7);
    for (const l of lines) expect(ANSWERS.replace(/\*\*/g, ''), l).toContain(l);
    for (const f of ['400', '2,000', '6,000', '15,000', '25,000', '60,000']) expect(ANSWERS).toContain(`| ${f} |`);
  });

  it('the Me tab line reads the answers example', () => {
    expect(copy.ranks.meLine('Activist', '1,212', '2,000', 'Organiser')).toBe('Activist · 1,212 / 2,000 to Organiser');
    expect(copy.ranks.next('788')).toBe('next · 788 more');
  });

  it('the seven titles of every party are the GDD §5.4 titles', () => {
    for (const f of content.factions) {
      const titles = f.rankTitles;
      expect(titles, f.id).toHaveLength(7);
      for (const t of titles) expect(GDD, `${f.id} ${t}`).toContain(t);
    }
  });
});

describe('the countdown style at its edges (note #4, answers §4.2)', () => {
  const BERLIN = { timeZone: 'Europe/Berlin' };
  const DAY = 86_400_000;
  // Monday 5 October 2026, 10:00 UTC (12:00 in Berlin).
  const now = Date.UTC(2026, 9, 5, 10, 0);

  it('two to six days ahead is a bare weekday, never today’s', () => {
    for (let d = 2; d <= 6; d++) {
      const w = when(now + d * DAY, now, BERLIN);
      expect(w, `${d} days`).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/);
      expect(w).not.toBe('Monday');
    }
  });

  // QA n5 (fixed in the fix round): a moment seven or more days ahead printed the weekday it shares
  // with today (*Your bed until Monday* on a Monday, with fourteen nights paid). Now the date.
  it('a moment a week or more ahead does not read as today’s weekday', () => {
    expect(when(now + 7 * DAY, now, BERLIN)).not.toBe('Monday');
    expect(boundary(now + 7 * DAY, now, BERLIN)).not.toMatch(/^Monday/);
    expect(when(now + 7 * DAY, now, BERLIN)).toBe('12 October');
    expect(when(now + 14 * DAY, now, { ...BERLIN, withTime: true })).toBe('19 October 12:00');
    expect(boundary(now + 7 * DAY, now, BERLIN)).toBe('12 October 12:00');
    expect(when(now + 6 * DAY, now, BERLIN)).toBe('Sunday');
  });
});

describe('vocabulary and content policy over every review-4 string (CLAUDE.md rules 2 and 6)', () => {
  const WAR = /\b(front ?line|frontline|uprising|troops?|soldiers?|enemy|enemies|militia|regiment|invade|invasion|siege|conquer|march(?:ed|es)? on|war\b|warfare|battle(?!ground))/i;
  const EXTREMIST = /\b(swastika|fasces|blackshirt|brownshirt|sieg|heil|duce|f[üu]hrer|reich|SS\b|stormtrooper|salute)\b/i;
  const NEW_TEXT = () => [
    ...strings(content.originSpec),
    ...content.cities.flatMap((c) =>
      c.locations
        .filter((l) => l.kind === 'town-hall' || l.actions.some((a) => (a as { use?: string }).use === 'welcome'))
        .flatMap((l) => strings(l)),
    ),
    ...strings(content.ordinances.map((o) => (o as { plainLine?: string }).plainLine)),
    ...strings(content.nation.routes),
    ...strings(copy.ranks),
    ...strings(copy.lodgings),
    ...strings(copy.residence),
    ...strings(copy.paper),
  ];

  it('no war word and no extremist symbol', () => {
    const texts = NEW_TEXT();
    expect(texts.length).toBeGreaterThan(50);
    for (const t of texts) {
      expect(t, t).not.toMatch(WAR);
      expect(t, t).not.toMatch(EXTREMIST);
    }
  });

  it('no string anywhere in content invites the player to close the game (note #16)', () => {
    const all = strings(content).filter((s) => /close the game/i.test(s));
    expect(all).toEqual([]);
  });
});

describe('the favour and its order agree (note #2, answers §2.6)', () => {
  it('each party’s favour is the first ticket at its HQ and its welcome-B order names that HQ', () => {
    for (const f of content.factions) {
      const b = content.ordersOf(f.id).find((t) => t.id === f.welcomeOrders.B)!;
      expect((b as { use?: string }).use, f.id).toBe('welcome');
      const actionId = b.match.actionIds![0]!;
      const found = content.action(actionId)!;
      expect(found.location.kind, f.id).toBe('faction-hq');
      expect(found.location.actions[0]!.id, f.id).toBe(actionId);
      expect(b.title, f.id).toContain(found.location.name.replace(/^The /, ''));
    }
  });
});
