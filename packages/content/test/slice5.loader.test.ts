/**
 * Slice 5, T6 (docs/tech/slice-5.md §4.1–§4.2, §15): the schemas and the loader's cross-checks. The
 * real content validates; every check has a failing fixture.
 */
import { describe, expect, it } from 'vitest';
import { loadContent, parseContent, rawContent } from '../src';
import type { ContentInput } from '../src';

const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): ContentInput => deepCopy(rawContent as ContentInput);
const fails = (mutate: (c: ContentInput) => void, problem: RegExp) => {
  const c = clone();
  mutate(c);
  expect(() => parseContent(c)).toThrow(problem);
};
const cityOf = (c: ContentInput, id: string) => c.cities.find((x) => x.id === id)!;
const placeOf = (c: ContentInput, id: string) => c.cities.flatMap((x) => x.locations).find((l) => l.id === id)!;
const missionOf = (c: ContentInput, id: string) =>
  c.cities.flatMap((x) => x.locations).flatMap((l) => l.missions ?? []).find((m) => m.id === id)!;

describe('the real content validates (slice 5)', () => {
  it('loads', () => {
    expect(() => loadContent()).not.toThrow();
  });
});

describe('quarters (ADR 0035; review 4, ADR 0076)', () => {
  it('a home city needs its three quarters in order', () => {
    fails((c) => (cityOf(c, 'coalport').quarters[1]!.opens = { level: 10 }), /three quarters opening at Level 1, Level 6/);
    fails((c) => cityOf(c, 'duskwall').quarters.pop(), /three quarters/);
  });
  it('a home city is one map: no frame, outline or label on its quarters; a district needs all of them', () => {
    fails(
      (c) => (cityOf(c, 'ashford').quarters[1]!.outline = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0.5], [0, 0.2]]),
      /ashford.wharf: only the capital's districts have outline/,
    );
    fails((c) => delete cityOf(c, 'irongate').quarters[2]!.outline, /irongate.station-market: a district needs its outline/);
    fails((c) => delete cityOf(c, 'irongate').quarters[3]!.label, /irongate.eastside: a district needs its label/);
  });
  it('the capital tiles the picture: a gap, an overlap, an unshared point each fail by name', () => {
    // A gap: Garrison Hill pulled in from the top-right corner.
    fails((c) => {
      const q = cityOf(c, 'irongate').quarters.find((x) => x.id === 'irongate.garrison-hill')!;
      q.outline![1] = [0.98, 0];
    }, /cities\.irongate: the outlines cover 0\.99\d+ of the picture, not 1 \(a gap or an overlap\)/);
    // An overlap: the Old Town pushed east over the Government Quarter's top.
    fails((c) => {
      const q = cityOf(c, 'irongate').quarters.find((x) => x.id === 'irongate.old-town')!;
      q.outline![1] = [0.5, 0];
    }, /cities\.irongate: the outlines cover 1\.0\d+ of the picture, not 1 \(a gap or an overlap\)/);
    // A T-junction: a point on the river's middle in the Old Town only (the area is unchanged).
    fails((c) => {
      const q = cityOf(c, 'irongate').quarters.find((x) => x.id === 'irongate.old-town')!;
      q.outline!.splice(6, 0, [0.315, 0.415]);
    }, /irongate\.old-town: the edge \(0\.43, 0\.43\) → \(0\.315, 0\.415\) is not shared with a neighbour \(an unshared point\)/);
  });
  it("the capital's anchors and labels inside their own district; labels 0.25 apart", () => {
    fails((c) => (cityOf(c, 'irongate').quarters[0]!.district!.anchor = { x: 0.3, y: 0.6 }), /its anchor is outside its outline/);
    fails((c) => (cityOf(c, 'irongate').quarters[1]!.label = { x: 0.6, y: 0.8 }), /irongate.old-town: its label is outside its outline/);
    fails(
      (c) => (cityOf(c, 'irongate').quarters[2]!.label = { x: 0.3, y: 0.45 }),
      /irongate.old-town and irongate.station-market: their labels are under 0.25 apart/,
    );
  });
});

describe('places and services (design §2.3, §8.1, §9.2)', () => {
  it('a new pin off the survey', () => {
    fails((c) => (placeOf(c, 'coalport.far-bank').map = { x: 0.92, y: 0.62 }), /"coalport.far-bank": its pin is not its survey pin/);
  });
  it('services: a jail (or the capital\'s ministry) and a hospital of the city; required on a council city', () => {
    fails((c) => delete cityOf(c, 'coalport').services, /cities.coalport: a council city needs its services/);
    fails((c) => (cityOf(c, 'coalport').services!.cells = 'coalport.union-hall'), /services.cells must be a jail place of coalport/);
    fails((c) => (cityOf(c, 'duskwall').services!.infirmary = 'coalport.infirmary'), /services.infirmary must be a hospital of duskwall/);
  });
  it('a run-in pool names known opponents; a home city needs one', () => {
    fails((c) => (cityOf(c, 'ashford').runInPool = ['nobody']), /runInPool: unknown opponent "nobody"/);
    fails((c) => delete cityOf(c, 'ashford').runInPool, /a home city needs a runInPool/);
  });
  it('a jail or a hospital has exactly its two tickets', () => {
    fails((c) => placeOf(c, 'ashford.police').actions.pop(), /"ashford.police": a jail has exactly two tickets/);
  });
});

describe('missions (ADR 0031, design §4–§5)', () => {
  it('the wrong Energy or difficulty', () => {
    fails((c) => (missionOf(c, 'coalport.far-bank.posters').energy = 12), /Energy 12 is not the type's 10/);
    fails((c) => (missionOf(c, 'irongate.forecourt.rally').difficulty = 18), /difficulty 18 is not the ladder's 20/);
  });
  it('an illegal mission without a target or Rank; a legal one with either', () => {
    fails((c) => delete missionOf(c, 'coalport.union-hall.spike').target, /an illegal mission needs a target/);
    fails((c) => delete missionOf(c, 'coalport.union-hall.spike').requires, /an illegal mission needs Rank 3/);
    fails((c) => (missionOf(c, 'coalport.shipyard.launch').target = 'vanguard'), /a legal mission has no target/);
  });
  it('`leader` only in the capital; a mission at an HQ targets its faction', () => {
    fails((c) => (missionOf(c, 'coalport.far-bank.posters').target = 'leader'), /`leader` only in a city with districts/);
    fails((c) => (missionOf(c, 'duskwall.beacon-house.roll').target = 'alliance'), /a mission at an HQ targets that HQ's faction/);
  });
  it('a pool with an unknown opponent; duplicate ways; two best ways; a card that is not a scene', () => {
    fails((c) => (missionOf(c, 'ashford.wharf.watch').pool = ['city-police', 'night-watchman']), /unknown opponent "night-watchman"/);
    fails((c) => (missionOf(c, 'ashford.wharf.watch').ways[1]!.id = 'int'), /duplicate way ids/);
    fails((c) => {
      const w = missionOf(c, 'coalport.terraces.stair-meeting').ways;
      w[0]!.stats = ['best'];
      w[1]!.stats = ['best'];
    }, /at most one best way/);
    fails((c) => (missionOf(c, 'ashford.wharf.watch').card = 'portrait.matron'), /its card must be a scene/);
  });
  it('a duplicate id across actions and missions; a text over 240; a briefing over 4 sentences', () => {
    fails((c) => (missionOf(c, 'coalport.shipyard.launch').id = 'coalport.shipyard.riveters'), /duplicate id "coalport.shipyard.riveters"/);
    fails((c) => (missionOf(c, 'coalport.shipyard.launch').text.failure.body = 'x'.repeat(241)), /failure text is 241 characters/);
    fails((c) => (missionOf(c, 'coalport.shipyard.launch').briefing = 'One. Two. Three. Four. Five.'), /briefing has more than 4 sentences/);
  });
  it('a mission card per type', () => {
    fails((c) => (c.art.missionCards = c.art.missionCards.filter((m) => m.missionType !== 'theft')), /theft needs exactly one card/);
  });
});

describe('opponents, cards, Issues, orders, papers (design §10–§14)', () => {
  it("an opponent that won't be bought has no paid line; one is the police; its portrait is a portrait", () => {
    fails((c) => (c.opponents.find((o) => o.id === 'branch-inspector')!.lines.paid = 'He takes it.'), /won't be bought exactly when there is no paid line/);
    fails((c) => (c.opponents.find((o) => o.id === 'city-police')!.side = 'vanguard'), /exactly one is the police/);
    fails((c) => (c.opponents[0]!.portrait = 'scene.docks'), /its portrait must be a portrait/);
  });
  it('a hostile card without a partial; a gate on a checked choice; the list card', () => {
    fails((c) => {
      const ch = c.journeyEvents.find((j) => j.id === 'jev.informer')!.choices.find((x) => x.stats)!;
      delete ch.partial;
    }, /a checked choice needs a partial/);
    fails((c) => {
      const ch = c.journeyEvents.find((j) => j.id === 'jev.informer')!.choices.find((x) => x.stats)!;
      ch.gate = 'coolAndClean';
    }, /a gate is on an unchecked choice/);
    fails((c) => delete c.journeyEvents.find((j) => j.id === 'jev.listed')!.heatAtLeast, /jev.listed alone has heatAtLeast 50/);
    fails((c) => delete c.journeyEvents.find((j) => j.id === 'jev.checkpoint')!.first, /exactly one hostile card is drawn first/);
  });
  it('a bailPct of −60; a heatCoolPct over 100', () => {
    fails((c) => {
      const e = c.issues.flatMap((i) => i.effects).find((x) => x.kind === 'bailPct')!;
      e.value = -60;
    }, /bailPct -60 is outside its bound -50…0/);
    fails((c) => {
      const e = c.issues.flatMap((i) => i.effects).find((x) => x.kind === 'heatCoolPct')!;
      e.value = 120;
    }, /heatCoolPct 120 is outside its bound 0…100/);
  });
  it('one slot-B mission order per faction', () => {
    fails((c) => (c.orderTemplates = c.orderTemplates.filter((t) => t.id !== 'dir.v.mission')), /factions.vanguard: one slot-B mission order/);
  });
  it('the ten risk headlines per home paper; the Herald has no quarter-open', () => {
    fails((c) => (c.headlines = c.headlines.filter((h) => h.id !== 'hl.v.seen')), /cities.duskwall: the paper has no "seen" headline/);
    fails((c) => {
      const h = deepCopy(c.headlines.find((x) => x.id === 'hl.quarter-open')!);
      c.headlines.push({ ...h, id: 'hl.ig.quarter-open', cityId: 'irongate' });
    }, /the Herald has no "quarter-open" headline/);
  });
});
