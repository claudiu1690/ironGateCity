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
  sentenceCount,
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
    // Review 1: the three job-shift actions are gone (a job is a wage).
    expect(actions).toHaveLength(18);
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
    });
    // Slice 2: Coalport's job ids are prefixed by city (cities §3 Q1).
    expect(content.jobs.filter((j) => j.id.startsWith('coalport-')).map((j) => [j.id, j.dailyPay])).toEqual([
      ['coalport-street-vendor', 100],
      ['coalport-factory-worker', 180],
      ['coalport-driver', 200],
    ]);
    expect(content.jobsAt('coalport.mill-gate').map((j) => j.id)).toEqual(['coalport-factory-worker']);
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
    // Review 1: the committee checks the best trained stat (INT 12 for the reference recruit).
    expect(Object.fromEntries(odds)).toEqual({
      int: 66,
      'cha+int': 46,
      agi: 38,
      str: 58,
      'cha+str': 42,
      best: 66,
    });
  });

  it('has Holm, twelve order templates, the Clarion and its headlines', () => {
    expect(content.npc('holm')).toMatchObject({ name: 'Petra Holm', factionId: 'collective' });
    expect(content.faction('collective').secretary).toEqual({
      npcId: 'holm',
      signature: '— P.H.',
      addressedAs: 'Secretary Holm',
    });
    expect(content.faction('collective').rankTitles[1]).toBe('Activist');
    expect(content.faction('collective').rankTitles[4]).toBe('Delegate');
    // Slice 3 adds the two crisis templates (Restore the base), review 1 the welcome-only ones;
    // neither rotates.
    const orders = content.ordersOf('collective').filter((o) => o.use === 'rotation');
    expect(orders).toHaveLength(12);
    expect(orders.filter((o) => o.slot === 'A')).toHaveLength(5);
    expect(orders.filter((o) => o.slot === 'B')).toHaveLength(4);
    expect(orders.filter((o) => o.slot === 'C')).toHaveLength(3);
    expect(city.paper?.name).toBe('The Coalport Clarion');
    const hl = content.headlinesOf('coalport');
    expect(hl.filter((h) => h.group === 'ambient')).toHaveLength(10);
    expect(hl.filter((h) => h.group === 'personal')).toHaveLength(13);
    // Slice 2: hl.first-day became hl.welcome (onboarding §7.2).
    expect(hl.find((h) => h.id === 'hl.welcome')?.priority).toBe(1);
    expect(content.standingNames).toEqual(['Stranger', 'Familiar', 'Known', 'Trusted', 'One of Us']);
    expect(content.asset('portrait.holm').widths).toEqual([256, 512]);
    expect(
      fillTemplate(hl.find((h) => h.id === 'hl.rank-up')!.headline, { name: 'Mara', rank: 'Convenor' }),
    ).toBe('Mara Made Convenor by the Branch');
    expect(city.paper?.shortName).toBe('Clarion');
  });

  it('names the reference recruit in the origin (§8.5; startingCharacter is gone, ADR 0011)', () => {
    expect(content.origin.reference.map((r) => `${r.questionId}:${r.answerId}`)).toEqual([
      'origin.summer:c',
      'origin.trouble:c',
      'origin.talent:b',
      'origin.coat:b',
      'origin.promise:c',
      'origin.wish:b',
    ]);
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
    // Review 1 (answers §7): the waiting badge says nothing is lost by choosing later.
    expect(copy.pointsToPlace(1)).toBe('1 point to place · nothing is lost by choosing later');
    expect(copy.jobPayLine(216)).toBe('216 a day · paid at midnight');
    expect(copy.switchJob).toBe('Switch · seniority resets');
    expect(copy.deskPaid(216, 'Stores hand', 4, 8)).toBe(
      'Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)',
    );
    expect(copy.orderTag(1, 3, 25)).toBe('Party order 1 / 3 · +25 % Party XP'); // review 2: Party XP
    // Content §13 (QA fix round 1).
    expect(copy.paperIsIn('Clarion')).toBe('The Clarion is in');
    expect(copy.meNoJob(['Mill Gate', 'Market Row', 'Harbour Quays'])).toBe(
      'No job yet · take one at Mill Gate, Market Row or Harbour Quays',
    );
    expect(copy.meNoJob(['Mill Gate'])).toBe('No job yet · take one at Mill Gate');
    expect([copy.signupTitle, copy.loginTitle]).toEqual(['Join the campaign', 'Sign in']);
  });

  it('keeps every outcome text within GDD §1.2: at most 240 characters and 4 sentences', () => {
    expect(sentenceCount('One. Two? Three! "Four." Five')).toBe(5);
    expect(sentenceCount(`Secretary Holm: "That's how it's done." Next.`)).toBe(2);
    for (const l of city.locations)
      for (const a of l.actions)
        for (const t of Object.values(a.text) as Array<{ body: string }>) {
          expect(t.body.length, a.id).toBeLessThanOrEqual(240);
          expect(sentenceCount(t.body), a.id).toBeLessThanOrEqual(4);
        }
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
      quarters: [{ id: 'clearwater.lido', name: 'The Lido', frame: { x0: 0, y0: 0, x1: 1, y1: 1 } }],
      locations: [],
    });
    expect(() => parseContent(c)).toThrow(/battleground but has a homeFactionId/);
  });

  it('rejects unknown fields (strict objects)', () => {
    const c = clone() as unknown as { cities: Array<Record<string, unknown>> };
    c.cities[0]!.mayor = 'someone';
    expect(() => parseContent(c)).toThrow(ContentError);
  });

  it("rejects a faction whose home city isn't loaded (slice 2: every home city is)", () => {
    const c = clone();
    c.cities = c.cities.filter((x) => x.id !== 'duskwall');
    expect(() => parseContent(c)).toThrow(/"duskwall" is not loaded/);
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
    coalport(a).locations[1]!.map = { x: 0.42, y: 0.37 }; // 0.02 from the Union Hall
    expect(() => parseContent(a)).toThrow(/too close/);
    const b = clone();
    coalport(b).locations[1]!.map = { x: 1.2, y: 0.5 };
    expect(() => parseContent(b)).toThrow(ContentError);
  });

  it('rejects a job at an unknown location, and a welcome slot A that does not check its stat (review 1)', () => {
    const a = clone();
    a.jobs[0]!.locationId = 'coalport.nowhere';
    expect(() => parseContent(a)).toThrow(/unknown location "coalport.nowhere"/);
    const b = clone();
    b.factions.find((f) => f.id === 'collective')!.welcomeOrders.A.str = 'dir.shift-change';
    expect(() => parseContent(b)).toThrow(/must name a home action that checks STR/);
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
    // Slice 2 loads Duskwall; Clearwater is still not a city.
    b.orderTemplates[0]!.match = { cityId: 'clearwater' };
    expect(() => parseContent(b)).toThrow(/city "clearwater" is not loaded/);
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

  it('rejects an outcome text over 240 characters or 4 sentences (GDD §1.2)', () => {
    const a = clone();
    const action = coalport(a).locations[0]!.actions[0]!;
    action.text.success.body = 'x'.repeat(241);
    expect(() => parseContent(a)).toThrow('241 characters (at most 240)');
    const b = clone();
    coalport(b).locations[0]!.actions[0]!.text.success.body = 'One. Two. Three. Four. Five.';
    expect(() => parseContent(b)).toThrow('5 sentences (at most 4)');
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
