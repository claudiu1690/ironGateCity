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

describe('quarters (ADR 0035)', () => {
  it('a home city needs its three quarters in order', () => {
    fails((c) => (cityOf(c, 'coalport').quarters[1]!.opens = { level: 10 }), /three quarters opening at Level 1, Level 6/);
    fails((c) => cityOf(c, 'duskwall').quarters.pop(), /three quarters/);
  });
  it('a locked quarter needs a teaser; every quarter an outline and a label', () => {
    fails((c) => delete cityOf(c, 'ashford').quarters[2]!.teaser, /ashford.station-road: a locked quarter needs a teaser/);
    fails((c) => delete cityOf(c, 'coalport').quarters[1]!.outline, /coalport.harbour: a quarter of a city with two or more needs an outline/);
    fails((c) => delete cityOf(c, 'coalport').quarters[2]!.label, /coalport.sidings: a quarter of a city with two or more needs a label/);
  });
  it('a pin outside its quarter\'s outline (a place, and a teaser quarter\'s survey pin)', () => {
    fails((c) => (cityOf(c, 'coalport').quarters[1]!.outline = [[0.6, 0.6], [0.99, 0.6], [0.99, 0.96], [0.6, 0.96], [0.58, 0.8], [0.59, 0.7]]), /location "coalport.infirmary": its pin is outside coalport.harbour's outline/);
    fails((c) => (cityOf(c, 'coalport').quarters[2]!.outline = [[0.36, 0.55], [0.53, 0.55], [0.53, 0.93], [0.36, 0.93], [0.35, 0.8], [0.35, 0.6]]), /survey pin "coalport.st-barbaras": outside coalport.sidings's outline/);
  });
  it('two outlines overlapping; a label outside its outline; labels under 0.25 apart', () => {
    fails((c) => {
      const q = cityOf(c, 'ashford').quarters;
      q[1]!.outline = [[0.0, 0.18], [0.3, 0.18], [0.3, 0.66], [0.4, 0.66], [0.45, 0.61], [0.6, 0.61], [0.66, 0.51], [1, 0.51], [1, 1], [0.0, 1]];
    }, /ashford.college and ashford.wharf: their outlines overlap/);
    fails((c) => (cityOf(c, 'duskwall').quarters[1]!.label = { x: 0.5, y: 0.5 }), /duskwall.pass: its label is outside its outline/);
    fails((c) => (cityOf(c, 'coalport').quarters[2]!.label = { x: 0.4, y: 0.5 }), /coalport.mill and coalport.sidings: their labels are under 0.25 apart|its label is outside/);
  });
  it("the capital's district anchor stays inside the quarter's outline", () => {
    fails((c) => (cityOf(c, 'irongate').quarters[0]!.district!.anchor = { x: 0.6, y: 0.42 }), /its anchor is outside its outline/);
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
