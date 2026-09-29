import { computeCheck, fillTemplate, tier1Difficulty } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import {
  ContentError,
  copy,
  getContent,
  isCheckedAction,
  loadContent,
  parseContent,
  rawContent,
} from '../src';
import type { ContentInput } from '../src';

const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): ContentInput => deepCopy(rawContent as ContentInput);
const coalport = (c: ContentInput) => c.cities[0]!;

describe('the real content', () => {
  const content = loadContent();
  const city = content.city('coalport')!;
  const actions = city.locations.flatMap((l) => l.actions);

  it('validates and indexes', () => {
    expect(content.factions.map((f) => f.id)).toEqual(['vanguard', 'collective', 'alliance']);
    expect(content.faction('collective').homeCityId).toBe('coalport');
    expect(city.baselineOpinion).toEqual({ vanguard: 9, collective: 70, alliance: 6, neutral: 15 });
    const found = content.action('coalport.mill-gate.canvass');
    expect(found?.location.kind).toBe('factory-gate');
    expect(found?.action).toMatchObject({ tier: 1, type: 'canvass', stats: ['int'], energy: 10 });
    expect(found?.action.text.success.headline).toBe('The whistle goes, and they stop');
    expect(content.action('nope')).toBeUndefined();
  });

  it("has Coalport's 6 locations, 21 actions, 3 jobs (content §1–§3)", () => {
    expect(city.locations.map((l) => [l.id, l.kind])).toEqual([
      ['coalport.mill-gate', 'factory-gate'],
      ['coalport.market-row', 'market'],
      ['coalport.union-hall', 'faction-hq'],
      ['coalport.terraces', 'street'],
      ['coalport.quays', 'docks'],
      ['coalport.anchor', 'bar'],
    ]);
    expect(actions).toHaveLength(21);
    const byType = actions.reduce<Record<string, number>>(
      (m, a) => ({ ...m, [a.type]: (m[a.type] ?? 0) + 1 }),
      {},
    );
    expect(byType).toEqual({
      canvass: 5,
      speech: 3,
      propaganda: 4,
      training: 3,
      intelligence: 2,
      council: 1,
      job: 3,
    });
    expect(content.jobs.map((j) => [j.id, j.dailyPay, j.shiftEnergy])).toEqual([
      ['street-vendor', 100, 3],
      ['factory-worker', 180, 4],
      ['driver', 200, 4],
    ]);
    expect(content.jobsAt('coalport.mill-gate').map((j) => j.id)).toEqual(['factory-worker']);
  });

  it('gives the reference recruit the §2.2 odds: INT 66 · STR 58 · CHA+INT 46 · CHA+STR 42 · AGI 38', () => {
    const values = { str: 10, int: 12, agi: 5, cha: 2 };
    const odds = new Map<string, number>();
    for (const a of actions.filter(isCheckedAction)) {
      odds.set(
        a.stats.join('+'),
        computeCheck({ stats: a.stats, values, difficulty: tier1Difficulty('home') }).chance,
      );
    }
    expect(Object.fromEntries(odds)).toEqual({ int: 66, 'cha+int': 46, agi: 38, str: 58, 'cha+str': 42 });
  });

  it('has Holm, twelve order templates, the Clarion and its headlines', () => {
    expect(content.npc('holm')).toMatchObject({ name: 'Petra Holm', factionId: 'collective' });
    expect(content.faction('collective').secretary).toEqual({ npcId: 'holm', signature: '— P.H.' });
    expect(content.faction('collective').rankTitles[1]).toBe('Activist');
    expect(content.faction('collective').rankTitles[4]).toBe('Delegate');
    const orders = content.ordersOf('collective');
    expect(orders).toHaveLength(12);
    expect(orders.filter((o) => o.slot === 'A')).toHaveLength(5);
    expect(orders.filter((o) => o.slot === 'B')).toHaveLength(4);
    expect(orders.filter((o) => o.slot === 'C')).toHaveLength(3);
    expect(city.paper?.name).toBe('The Coalport Clarion');
    const hl = content.headlinesOf('coalport');
    expect(hl.filter((h) => h.group === 'ambient')).toHaveLength(10);
    expect(hl.filter((h) => h.group === 'personal')).toHaveLength(9);
    expect(hl.find((h) => h.id === 'hl.first-day')?.priority).toBe(1);
    expect(content.standingNames).toEqual(['Stranger', 'Familiar', 'Known', 'Trusted', 'One of Us']);
    expect(content.asset('portrait.holm').widths).toEqual([256, 512]);
    expect(
      fillTemplate(hl.find((h) => h.id === 'hl.rank-up')!.headline, { name: 'Mara', rank: 'Activist' }),
    ).toBe('Mara Made Activist by the Branch');
  });

  it('starts every character as the reference recruit (§8.5)', () => {
    expect(content.startingCharacter).toEqual({
      factionId: 'collective',
      stats: { str: 10, int: 12, agi: 5, chaBase: 2 },
    });
  });

  it('contains no designer placeholders any more', () => {
    expect(JSON.stringify(rawContent)).not.toMatch(/TODO|PLACEHOLDER/);
  });

  it('is memoised by getContent; unknown lookups throw', () => {
    expect(getContent()).toBe(getContent());
    // @ts-expect-error: not a faction id
    expect(() => getContent().faction('royalists')).toThrow(ContentError);
    expect(() => getContent().asset('nope')).toThrow(ContentError);
  });

  it('exposes the UI copy (§12.1)', () => {
    expect(copy.needsEnergy(10, '14:20')).toBe('Needs 10 Energy · ready at 14:20');
    expect(copy.jobNeeds(['Level 3', 'AGI 10'])).toBe('Needs Level 3, AGI 10');
    expect(copy.pointsToPlace(1)).toBe('1 point to place');
    expect(copy.orderTag(1, 3, 25)).toBe('Party order 1 / 3 · +25 % FXP');
  });
});

describe('validation', () => {
  it('reports the Zod path of a bad field', () => {
    const c = clone();
    (coalport(c).locations[0]!.actions[0] as { energy: number }).energy = 40;
    expect(() => parseContent(c)).toThrow(/energy/);
  });

  it('rejects an unknown location kind', () => {
    const c = clone();
    (coalport(c).locations[0] as { kind: string }).kind = 'castle';
    expect(() => parseContent(c)).toThrow(ContentError);
  });

  it('rejects a baseline that does not sum to 100', () => {
    const c = clone();
    coalport(c).baselineOpinion.neutral = 20;
    expect(() => parseContent(c)).toThrow(/sums to 105/);
  });

  it('rejects duplicate ids', () => {
    const c = clone();
    const location = coalport(c).locations[0]!;
    location.actions.push(deepCopy(location.actions[0]!));
    expect(() => parseContent(c)).toThrow(/duplicate id "coalport.mill-gate.canvass"/);
  });

  it('rejects ids not dotted by containment', () => {
    const c = clone();
    coalport(c).locations[0]!.actions[0]!.id = 'coalport.docks.canvass';
    expect(() => parseContent(c)).toThrow(/must be dotted under its location/);
  });

  it('rejects home-city inconsistencies', () => {
    const a = clone();
    delete coalport(a).homeFactionId;
    expect(() => parseContent(a)).toThrow(/without a homeFactionId/);
    const b = clone();
    coalport(b).homeFactionId = 'alliance';
    expect(() => parseContent(b)).toThrow(/whose homeCityId is not "coalport"/);
    const d = clone();
    d.factions[0]!.homeCityId = 'coalport';
    expect(() => parseContent(d)).toThrow(/is not a home city of "vanguard"/);
  });

  it('rejects a battleground with a home faction', () => {
    const c = clone();
    c.cities.push({
      id: 'clearwater',
      name: 'Clearwater',
      role: 'battleground',
      homeFactionId: 'alliance',
      baselineOpinion: { vanguard: 25, collective: 25, alliance: 25, neutral: 25 },
      map: { day: 'map.coalport.day', night: 'map.coalport.night' },
      locations: [],
    });
    expect(() => parseContent(c)).toThrow(/battleground but has a homeFactionId/);
  });

  it('rejects unknown fields (strict objects)', () => {
    const c = clone() as unknown as { cities: Array<Record<string, unknown>> };
    c.cities[0]!.mayor = 'someone';
    expect(() => parseContent(c)).toThrow(ContentError);
  });

  it("rejects a starting faction whose home city isn't loaded", () => {
    const c = clone();
    c.startingCharacter.factionId = 'vanguard';
    expect(() => parseContent(c)).toThrow(/home city "duskwall" is not loaded/);
  });

  // §4.3 cross-checks, one failing fixture each.
  it('rejects a missing or wrong-kind asset', () => {
    const a = clone();
    coalport(a).map.night = 'map.nowhere';
    expect(() => parseContent(a)).toThrow(/unknown asset "map.nowhere"/);
    const b = clone();
    b.npcs[0]!.portrait = 'scene.union-hq';
    expect(() => parseContent(b)).toThrow(/a scene, not a portrait/);
  });

  it('rejects a dotted city id and hotspots off the map or too close', () => {
    const a = clone();
    coalport(a).locations[1]!.map = { x: 0.37, y: 0.45 };
    expect(() => parseContent(a)).toThrow(/too close/);
    const b = clone();
    coalport(b).locations[1]!.map = { x: 1.2, y: 0.5 };
    expect(() => parseContent(b)).toThrow(ContentError);
  });

  it('rejects a job and shift action that do not point at each other', () => {
    const a = clone();
    a.jobs[0]!.shiftActionId = 'coalport.mill-gate.shift';
    expect(() => parseContent(a)).toThrow(/must point at each other/);
    const b = clone();
    (coalport(b).locations[0]!.actions[2] as { jobId: string }).jobId = 'miner';
    expect(() => parseContent(b)).toThrow(/unknown job "miner"/);
  });

  it('rejects a secretary of the wrong faction or a missing slot', () => {
    const a = clone();
    a.npcs[0]!.factionId = 'alliance';
    expect(() => parseContent(a)).toThrow(/is not of that faction/);
    const b = clone();
    b.orderTemplates = b.orderTemplates.filter((t) => t.slot !== 'B');
    expect(() => parseContent(b)).toThrow(/no order template in slot B/);
  });

  it('rejects order matches naming unknown things', () => {
    const a = clone();
    a.orderTemplates[1]!.match = { actionIds: ['coalport.mill-gate.strike'] };
    expect(() => parseContent(a)).toThrow(/unknown action "coalport.mill-gate.strike"/);
    const b = clone();
    b.orderTemplates[0]!.match = { cityId: 'duskwall' };
    expect(() => parseContent(b)).toThrow(/city "duskwall" is not loaded/);
    const d = clone();
    d.orderTemplates[0]!.match = {};
    expect(() => parseContent(d)).toThrow(ContentError);
  });

  it('rejects unknown placeholders and a paper without ambient headlines', () => {
    const a = clone();
    a.headlines[0]!.headline = 'Welcome, {nickname}';
    expect(() => parseContent(a)).toThrow(/unknown placeholder \{nickname\}/);
    const b = clone();
    b.headlines = b.headlines.filter((h) => h.group !== 'ambient');
    expect(() => parseContent(b)).toThrow(/no ambient headline/);
  });

  it('needs 5 standing levels and 7 rank titles', () => {
    const a = clone();
    a.standingLevels.pop();
    expect(() => parseContent(a)).toThrow(ContentError);
    const b = clone();
    b.factions[0]!.rankTitles.pop();
    expect(() => parseContent(b)).toThrow(ContentError);
  });
});
