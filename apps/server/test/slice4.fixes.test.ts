/**
 * The slice-4 fix round (docs/qa/slice-4-report.md; docs/design/slice-4-fixes.md): what QA's own
 * tests do not pin. The slot-C orders name the reader's residence and its verbs (§2, m1); the Issue
 * order points at its first Issue's first tagged place (§3, m2); the first-arrival deck counts the
 * close races (§5, m4); the arrival never says "Nothing happened" above a card to answer (§8, n2);
 * the art ladder's map crop where no scene is bound (the October art).
 */
import { randomUUID } from 'node:crypto';
import { copy } from '@irongate/content/copy';
import { District } from '@irongate/db';
import { ordersForDay } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pickArt } from '../src/services/art';
import { setupDb, teardownDb, testClock } from './helpers';
import { at, content, setLiveIssues, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const key = () => randomUUID();

beforeAll(async () => {
  await setupDb('slice4-fixes');
});
afterAll(teardownDb);

/** The first day from `from` whose rotation for `residence` carries the template. */
function dayWith(factionId: 'collective' | 'vanguard' | 'alliance', id: string, residence: 'home' | 'capital') {
  const templates = content.ordersOf(factionId);
  let day = DAY;
  while (!ordersForDay(templates, day, residence).some((t) => t.id === id)) day++;
  return day;
}

describe('slot C names the residence and its verbs (slice-4 fixes §2, QA m1)', () => {
  it('a capital resident reads Irongate and its verbs; a home resident Coalport and its', async () => {
    // Orders are frozen at the day's settlement: the resident is made the day before.
    const day = dayWith('collective', 'dir.sharpen-up', 'capital');
    const clock = testClock(at(day - 1));
    const capital = await traveller(clock, {
      name: 'Ida Verb',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.eastside' },
    });
    clock.set(at(day));
    const me = await capital.caller.character.me();
    const order = me.orders.items.find((o) => o.id === 'dir.sharpen-up')!;
    expect(order.title).toBe('Study, carry or run once in Irongate');
    expect(order.line).toBe("A tired organiser is a bad one. An hour's training, anywhere in Irongate; the pin says where.");
    for (const o of me.orders.items) expect(o.title).not.toMatch(/Coalport|\{/);

    const homeDay = dayWith('collective', 'dir.sharpen-up', 'home');
    clock.set(at(homeDay));
    const home = await traveller(clock, { name: 'Ole Verb' });
    const mine = (await home.caller.character.me()).orders.items.find((o) => o.id === 'dir.sharpen-up')!;
    // Slice 5: a Level-10 traveller has the Harbour, whose porters' *Carry* comes before *Run*.
    expect(mine.title).toBe('Study, lift or carry once in Coalport');
  });

  it('a Vanguard member in Irongate also lifts (the gymnasium is theirs)', async () => {
    const day = dayWith('vanguard', 'dir.v.sharpen-up', 'capital');
    const clock = testClock(at(day - 1));
    const p = await traveller(clock, {
      name: 'Vera Lift',
      factionId: 'vanguard',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.garrison-hill' },
    });
    clock.set(at(day));
    const o = (await p.caller.character.me()).orders.items.find((x) => x.id === 'dir.v.sharpen-up')!;
    expect(o.title).toBe('Study, lift or carry once in Irongate');
  });
});

describe('the Issue order’s pin (slice-4 fixes §3, QA m2)', () => {
  for (const [first, n, name] of [
    ['issue.tram-fares', 13, 'Market Square'],
    ['issue.press-raids', 7, 'Herald House'],
  ] as const) {
    it(`${first} first: pin ${n}, ${name}`, async () => {
      const day = dayWith('collective', 'dir.c.capital-issue', 'capital');
      const clock = testClock(at(day - 1));
      const p = await traveller(clock, {
        cityId: 'irongate',
        name: `Pia ${n}`,
        residence: { cityId: 'irongate', districtId: 'irongate.station-market' },
      });
      const other = first === 'issue.tram-fares' ? 'issue.press-raids' : 'issue.tram-fares';
      await setLiveIssues('irongate', [first, other], day);
      clock.set(at(day));
      const o = (await p.caller.character.me()).orders.items.find((x) => x.id === 'dir.c.capital-issue')!;
      expect(o.pin?.n).toBe(n);
      expect(content.location(o.pin!.locationId)?.location.name).toBe(name);
    });
  }
});

describe('the first arrival’s deck counts the close races (slice-4 fixes §5, QA m4)', () => {
  it('Five districts, {closeRaces}, from the districts’ state at the edition', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Nina Count' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.set(b.journey.arrivesAt + 1);
    await p.caller.travel.close({ journeyId: b.journey.id });
    clock.set(at(DAY + 1));
    const paper = await p.caller.paper.today();
    const close = await District.countDocuments({ cityId: 'irongate', 'state.battleground': true });
    const h = paper.headlines.find((x) => x.headline === 'Nina Count Arrives in the Capital')!;
    expect(h.deck).toBe(
      `Off the Coalport train into Station & Market. Five districts, ${copy.capital.closeRacesOfFive(close)}. The tram is free.`,
    );
    expect([0, 1, 2, 3, 4, 5].map(copy.capital.closeRacesOfFive)).toEqual([
      'none of them a close race today',
      'one of them a close race today',
      'two of them close races today',
      'three of them close races today',
      'four of them close races today',
      'all five close races today',
    ]);
  });
});

describe('the arrival’s body (slice-4 fixes §8, QA n2)', () => {
  it('a card still to answer: "it\'s below"; none drawn: "Nothing happened"; answered: the outcome', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6 && seen.size < 2; i++) {
      const clock = testClock(at(DAY + i));
      const p = await traveller(clock, { name: `Body ${i}` });
      const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
      clock.set(b.journey.arrivesAt + 1);
      const j = await p.caller.travel.journey();
      const body = j!.arrival!.body;
      if (j!.card) {
        expect(body).toBe(copy.travel.cardBelow);
        seen.add('card');
      } else {
        expect(body).toBe(copy.travel.nothingHappened);
        seen.add('none');
      }
    }
    expect(seen.has('card')).toBe(true);
  });
});

describe('the art ladder (the October art)', () => {
  // Slice 5 bound `hospital` (St Agnes, the first example here) to a scene; Parliament's is held.
  it('a kind with no scene (Parliament) still shows the map crop at its pin', () => {
    const located = content.location('irongate.parliament')!;
    expect(located.location.kind).toBe('parliament');
    const art = pickArt(content, located.city, located.location, at(DAY));
    expect(art).toMatchObject({ rung: 'map-crop', x: located.location.map.x, y: located.location.map.y });
    const gate = content.location('coalport.mill-gate')!;
    expect(pickArt(content, gate.city, gate.location, at(DAY))).toMatchObject({
      rung: 'scene',
      asset: { id: 'scene.factory-gate' },
    });
  });
});
