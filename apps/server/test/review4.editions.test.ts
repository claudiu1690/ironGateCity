/**
 * Review 4, T22 (docs/tech/review-4.md §5.3, §5.5; ADR 0074; answers §23, §29.1; GDD §3.3): every
 * player reads the paper of where they live; away from home it is printed as a local edition, composed
 * at read: the edition line, the dateline, the local line, the local ambient line, the local Issues
 * first and the local election's line. The stored edition is the residence's; nothing new is stored.
 */
import { randomUUID } from 'node:crypto';
import { Character, PaperEntry } from '@irongate/db';
import { ambientFor, councilDay, dayStart } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupDb, teardownDb, testClock } from './helpers';
import { nextCycleDay } from './politics.helpers';
import { at, content, setLiveIssues, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const key = () => randomUUID();

beforeAll(async () => {
  await setupDb('review4-editions-test');
});
afterAll(teardownDb);

/** A Level-10 Collective member living in Coalport, standing in `cityId`, a day after joining. */
async function reader(name: string, day: number, opts: Parameters<typeof traveller>[1] = {}) {
  const clock = testClock(at(day - 1));
  const p = await traveller(clock, { name, ...opts });
  await p.caller.paper.today();
  clock.set(at(day));
  return { ...p, clock };
}
const ambientLine = (cityId: string, day: number) => ambientFor(content.headlinesOf(cityId), day)!.headline;
const texts = (p: { headlines: Array<{ headline: string }> }) => p.headlines.map((h) => h.headline);

describe('a Coalport resident away from home', () => {
  it('in Duskwall: The Coalport Clarion · Duskwall edition, Duskwall’s dateline, ambient, local line and Issues first', async () => {
    const day = nextCycleDay('duskwall', 3, DAY); // the council sits: no phase line in Duskwall
    const p = await reader('Ada Away', day, { cityId: 'duskwall' });
    await setLiveIssues('duskwall', ['issue.checkpoints', 'issue.curfew'], day).catch(() => undefined);
    const paper = await p.caller.paper.today();
    expect(paper.paper.name).toBe('The Coalport Clarion');
    expect(paper.edition).toEqual({ cityId: 'duskwall', cityName: 'Duskwall' });
    expect(paper.dateline.city).toBe('Duskwall');
    // The stored edition is the Clarion's; nothing new is stored.
    const entry = (await PaperEntry.findOne({ characterId: p.id, day }).lean())!;
    expect(entry.cityId).toBe('coalport');
    // The one local line (no count, no phase, no rule, no rival pressure: the home party's share),
    // and Duskwall's ambient line in place of the Clarion's.
    expect(texts(paper)).toContain('Vanguard Holds Duskwall at 70.0 %');
    expect(texts(paper)).not.toContain(ambientLine('coalport', day));
    if (paper.headlines.length === 3 && !texts(paper).includes(ambientLine('duskwall', day)))
      expect(paper.headlines.at(-1)!.headline).not.toBe(ambientLine('coalport', day));
    // The Issues: Duskwall's first (marked local), then Coalport's.
    const rows = paper.issues!.rows;
    const firstHome = rows.findIndex((r) => r.cityId === 'coalport');
    expect(rows.slice(0, firstHome).every((r) => r.cityId === 'duskwall' && r.local === true)).toBe(true);
    expect(rows.filter((r) => r.cityId === 'coalport').every((r) => !r.local)).toBe(true);
    // The reader's own parts follow them: the orders, the Election row of their residence.
    expect(paper.pollingDay?.cityId).toBe('coalport');
    expect(paper.orders.items.length).toBeGreaterThan(0);
    // The local election's Courier line.
    const cal = councilDay(day, content.city('duskwall')!.council!.offset);
    expect(paper.localElection).toEqual({
      cityName: 'Duskwall',
      phase: cal.phase,
      until: dayStart(cal.phase === 'nominations' ? cal.election.pollsFrom : cal.election.countDay),
    });
    // Rival ground's desk row is unchanged.
    expect(paper.desk.where).toEqual({ rivalGround: { cityName: 'Duskwall' } });
  });

  it('in Duskwall on its nominations morning: the candidates line, {until} left for the client', async () => {
    const day = nextCycleDay('duskwall', 0, DAY + 5);
    const p = await reader('Ada Names', day, { cityId: 'duskwall' });
    const paper = await p.caller.paper.today();
    const local = paper.headlines.find((h) => /^Duskwall (Council: Candidates Wanted|Has a New Council)$/.test(h.headline));
    expect(local).toBeDefined();
    if (local!.headline === 'Duskwall Council: Candidates Wanted') {
      expect(local!.deck).toContain('until {until}');
      expect(local!.until).toBe(dayStart(councilDay(day, content.city('duskwall')!.council!.offset).election.pollsFrom));
    }
  });

  it('in Irongate: the Clarion’s Irongate edition, the Herald’s city line as the local line; the Herald is not forced', async () => {
    const day = nextCycleDay('irongate', 2, DAY); // polling in the capital
    const p = await reader('Ada Capital', day, { cityId: 'irongate' });
    const paper = await p.caller.paper.today();
    expect(paper.paper.name).toBe('The Coalport Clarion');
    expect(paper.edition).toEqual({ cityId: 'irongate', cityName: 'Irongate' });
    expect(paper.dateline.city).toBe('Irongate');
    expect(texts(paper)).toContain('Voting Open Across the Capital');
    expect(paper.issues!.rows[0]!.cityId).toBe('irongate');
    expect(paper.issues!.rows[0]!.local).toBe(true);
  });

  it('on a train to Duskwall: the edition is Duskwall’s', async () => {
    const p = await reader('Ada Riding', DAY + 1);
    await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const paper = await p.caller.paper.today();
    expect(paper.edition).toEqual({ cityId: 'duskwall', cityName: 'Duskwall' });
    expect(paper.dateline.city).toBe('Duskwall');
    expect(paper.paper.name).toBe('The Coalport Clarion');
  });
});

describe('a capital resident away, and everyone at home', () => {
  it('a capital resident in Coalport reads The Irongate Herald · Coalport edition', async () => {
    const p = await reader('Ida Eastside', DAY + 1, {
      cityId: 'coalport',
      residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
    });
    // The edition printed today is the Herald (the residence's paper).
    await Character.updateOne({ _id: p.id }, { $set: { cityId: 'coalport' } });
    const paper = await p.caller.paper.today();
    expect(paper.paper.name).toBe('The Irongate Herald');
    expect(paper.edition).toEqual({ cityId: 'coalport', cityName: 'Coalport' });
    expect(paper.dateline.city).toBe('Coalport');
    expect(paper.localElection?.cityName).toBe('Coalport');
  });

  it('at home: no edition, no local election line, no local Issues; the dateline is the paper’s city', async () => {
    const p = await reader('Ada Home', DAY + 1);
    const paper = await p.caller.paper.today();
    expect(paper.edition).toBeNull();
    expect(paper.localElection).toBeNull();
    expect(paper.dateline.city).toBe('Coalport');
    expect(paper.issues!.rows.every((r) => !r.local)).toBe(true);
  });

  it('a visitor’s Herald stored before the change renders as the Herald (the stored city decides)', async () => {
    const p = await reader('Ada Herald', DAY + 1, { cityId: 'irongate' });
    await p.caller.paper.today();
    await PaperEntry.updateOne({ characterId: p.id, day: DAY + 1 }, { $set: { cityId: 'irongate' } });
    const paper = await p.caller.paper.today();
    expect(paper.paper.name).toBe('The Irongate Herald');
    expect(paper.edition).toBeNull();
    expect(paper.dateline.city).toBe('Irongate');
  });
});
