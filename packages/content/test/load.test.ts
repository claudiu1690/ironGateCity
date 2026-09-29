import { describe, expect, it } from 'vitest';
import { ContentError, getContent, loadContent, parseContent, rawContent } from '../src';
import type { Content } from '../src';

const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): Content => deepCopy(rawContent as Content);

describe('the real content', () => {
  it('validates and indexes', () => {
    const content = loadContent();
    expect(content.factions.map((f) => f.id)).toEqual(['vanguard', 'collective', 'alliance']);
    expect(content.faction('collective').homeCityId).toBe('coalport');
    expect(content.faction('vanguard').startingBonus).toEqual({ str: 3 });

    const coalport = content.city('coalport');
    expect(coalport?.role).toBe('home');
    expect(coalport?.homeFactionId).toBe('collective');
    expect(coalport?.baselineOpinion).toEqual({ vanguard: 9, collective: 70, alliance: 6, neutral: 15 });

    const found = content.action('coalport.mill-gate.canvass');
    expect(found?.city.id).toBe('coalport');
    expect(found?.location.id).toBe('coalport.mill-gate');
    expect(found?.location.kind).toBe('factory-gate');
    expect(found?.action).toMatchObject({ tier: 1, type: 'canvass', stat: 'int', energy: 10 });
    expect(found?.action.text.success.headline).toBe('The whistle goes, and they stop');
    expect(content.location('coalport.mill-gate')?.city.id).toBe('coalport');
    expect(content.action('nope')).toBeUndefined();
  });

  it('starts every character as the reference recruit (§8.5)', () => {
    expect(loadContent().startingCharacter).toEqual({
      factionId: 'collective',
      stats: { str: 10, int: 12, agi: 5, chaBase: 2 },
    });
  });

  it("rejects a starting faction whose home city isn't loaded", () => {
    const c = clone();
    c.startingCharacter.factionId = 'vanguard';
    expect(() => parseContent(c)).toThrow(/home city "duskwall" is not loaded/);
  });

  it('contains no designer placeholders any more', () => {
    expect(JSON.stringify(rawContent)).not.toMatch(/TODO|PLACEHOLDER/);
  });

  it('is memoised by getContent', () => {
    expect(getContent()).toBe(getContent());
  });

  it('throws for an unknown faction lookup', () => {
    // @ts-expect-error: not a faction id
    expect(() => getContent().faction('royalists')).toThrow(ContentError);
  });
});

describe('validation', () => {
  it('reports the Zod path of a bad field', () => {
    const c = clone();
    c.cities[0]!.locations[0]!.actions[0]!.energy = 40;
    expect(() => parseContent(c)).toThrow(/energy/);
  });

  it('rejects an unknown location kind', () => {
    const c = clone();
    (c.cities[0]!.locations[0] as { kind: string }).kind = 'castle';
    expect(() => parseContent(c)).toThrow(ContentError);
  });

  it('rejects a baseline that does not sum to 100', () => {
    const c = clone();
    c.cities[0]!.baselineOpinion.neutral = 20;
    expect(() => parseContent(c)).toThrow(/sums to 105/);
  });

  it('rejects duplicate ids', () => {
    const c = clone();
    const location = c.cities[0]!.locations[0]!;
    location.actions.push(deepCopy(location.actions[0]!));
    expect(() => parseContent(c)).toThrow(/duplicate id "coalport.mill-gate.canvass"/);
  });

  it('rejects ids not dotted by containment', () => {
    const c = clone();
    c.cities[0]!.locations[0]!.actions[0]!.id = 'coalport.docks.canvass';
    expect(() => parseContent(c)).toThrow(/must be dotted under its location/);
  });

  it('rejects a home city without a home faction', () => {
    const c = clone();
    delete c.cities[0]!.homeFactionId;
    expect(() => parseContent(c)).toThrow(/without a homeFactionId/);
  });

  it('rejects a home city whose faction does not point back to it', () => {
    const c = clone();
    c.cities[0]!.homeFactionId = 'alliance';
    expect(() => parseContent(c)).toThrow(/whose homeCityId is not "coalport"/);
  });

  it('rejects a faction whose loaded home city is not its home', () => {
    const c = clone();
    c.factions[0]!.homeCityId = 'coalport';
    expect(() => parseContent(c)).toThrow(/is not a home city of "vanguard"/);
  });

  it('rejects a battleground with a home faction', () => {
    const c = clone();
    c.cities.push({
      id: 'clearwater',
      name: 'Clearwater',
      role: 'battleground',
      homeFactionId: 'alliance',
      baselineOpinion: { vanguard: 25, collective: 25, alliance: 25, neutral: 25 },
      locations: [],
    });
    expect(() => parseContent(c)).toThrow(/battleground but has a homeFactionId/);
  });

  it('rejects unknown fields (strict objects)', () => {
    const c = clone() as unknown as { cities: Array<Record<string, unknown>> };
    c.cities[0]!.mayor = 'someone';
    expect(() => parseContent(c)).toThrow(ContentError);
  });
});
