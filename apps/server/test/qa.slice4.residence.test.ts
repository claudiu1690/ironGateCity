/**
 * QA slice 4: residence (GDD §14.11, design §7, screens §6, ADR 0026). What the developer's tests do
 * not already pin: a move with two keys at once, a move while the old place's candidacy is already
 * on the ballot (the polls are open), the sheet's warning line in that case, the room's same-day
 * renewal, and Eviction Notices on the room's price.
 */
import { randomUUID } from 'node:crypto';
import { Candidacy, Character, City, OfficeTerm, RequestLog } from '@irongate/db';
import type { CandidacyDoc, CharacterDoc, OfficeTermDoc } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { settleCityDay } from '../src/services/cityDay';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, content, setIssueEffect, traveller } from './slice4.helpers';

/** Review 4 #9: the room is taken at the Lodgings card (Tram Junction). */
const JUNCTION = 'irongate.tram-junction';
const DAY = 20732; // Tue 6 Oct 2026: Irongate cycle day 2, Coalport cycle day 0 (nominations)
const COALPORT_POLLS = 20734; // Thu 8 Oct: Coalport cycle day 2 (the close; polls open)
const COALPORT_COUNT = 20737; // Sun 11 Oct: Coalport cycle day 0 (election coalport:4146 counted)
const key = () => randomUUID();

beforeAll(async () => {
  await setupDb('qa-slice4-residence');
});
afterAll(teardownDb);

describe('a move is one transaction, once (ADR 0026 §5, tech design §18)', () => {
  it('three taps with three keys at once: one move, 500 Iron once, the others refused with nothing written', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Quinn Adler', cityId: 'irongate' });
    const settled = await Promise.allSettled(
      ['irongate.eastside', 'irongate.old-town', 'irongate.eastside'].map((districtId) =>
        p.caller.residence.register({ cityId: 'irongate', districtId, idempotencyKey: key() }),
      ),
    );
    const ok = settled.filter((s) => s.status === 'fulfilled');
    expect(ok).toHaveLength(1);
    for (const s of settled) {
      if (s.status === 'rejected') {
        // The loser sees the winner's move: cooldown, already resident, or the bounded retries.
        expect(['MOVE_COOLDOWN', 'ALREADY_RESIDENT', 'ACTION_CONFLICT']).toContain(
          gameData(s.reason).game?.reason,
        );
      }
    }
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(c.iron).toBe(500);
    expect(await RequestLog.countDocuments({ characterId: p.id, kind: 'residence.register' })).toBe(1);
  });

  it('the same key three times at once: one move, the same modal three times', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Rita Moll', cityId: 'irongate' });
    const k = key();
    const all = await Promise.all(
      [1, 2, 3].map(() =>
        p.caller.residence.register({ cityId: 'irongate', districtId: 'irongate.eastside', idempotencyKey: k }),
      ),
    );
    expect(new Set(all.map((r) => JSON.stringify(r))).size).toBe(1);
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.iron).toBe(500);
  });
});

describe('moving while the old candidacy is on the ballot (GDD §14.11, slice-4-fixes.md §1)', () => {
  /**
   * A Coalport member who stood at home and reached the ballot at the close (the polls are open).
   * QA found (M2) that the move went through and the member could then win a Coalport seat while
   * living in Eastside. The designer's decision (slice-4-fixes.md §1): while the name is on a ballot
   * where the member lives, a move is refused until the result; the card says so and names the day.
   */
  async function standingAtHome() {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, {
      name: 'Sara Brandl',
      fxp: 2_000,
      // 500 Successes in Coalport: a ward vote of 100, so she tops the Coalport poll.
      successes: 500,
      pc: 40,
      cityId: 'irongate',
    });
    await p.caller.council.declare({
      platformId: content.faction('collective').platforms[0]!.id,
      idempotencyKey: key(),
    });
    const cand = (await Candidacy.findOne({ characterId: p.id, electionId: 'coalport:4146' }).lean<CandidacyDoc>())!;
    // Two members' endorsements (the close counts them), so she stands.
    await Candidacy.updateOne(
      { _id: cand._id },
      {
        $push: {
          endorsements: {
            $each: [1, 2].map(() => ({
              characterId: new Character()._id,
              name: 'A Member',
              day: DAY,
              at: new Date(at(DAY)),
            })),
          },
        },
      },
    );
    clock.set(at(COALPORT_POLLS));
    await settleCityDay(content, 'coalport', clock.now());
    const onBallot = (await Candidacy.findById(cand._id).lean<CandidacyDoc>())!;
    expect(onBallot.status).toBe('standing');
    // Before the tap: the residence card for Eastside.
    const city = await p.caller.city.get({ cityId: 'irongate' });
    const card = city.districts!.find((d) => d.id === 'irongate.eastside')!.residence;
    return { p, clock, cand, card };
  }

  it('fixed (M2): the card says the member is a candidate until the result, with no button', async () => {
    const { card } = await standingAtHome();
    expect(card).toMatchObject({
      state: 'onBallot',
      livesIn: 'Coalport',
      canMoveFromDay: COALPORT_COUNT,
      button: null,
      sheet: null,
    });
  });

  it('fixed (M2): a move is refused with ON_BALLOT, nothing written, the name stays on the ballot', async () => {
    const { p, cand } = await standingAtHome();
    const err = await p.caller.residence
      .register({ cityId: 'irongate', districtId: 'irongate.eastside', idempotencyKey: key() })
      .catch((e: unknown) => e);
    expect(gameData(err)).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'ON_BALLOT', canMoveFromDay: COALPORT_COUNT },
    });
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(c.iron).toBe(1000);
    expect(c.residence?.cityId ?? 'coalport').toBe('coalport');
    expect((await Candidacy.findById(cand._id).lean<CandidacyDoc>())!.status).toBe('standing');
  });

  it('fixed (M2): at the count the member, still a Coalport resident, is seated normally; then they may move', async () => {
    const { p, clock } = await standingAtHome();
    clock.set(at(COALPORT_COUNT));
    await settleCityDay(content, 'coalport', clock.now());
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(c.residence?.cityId ?? 'coalport').toBe('coalport');
    const held = await OfficeTerm.findOne({
      councilKey: 'coalport:4147',
      'holder.kind': 'player',
      'holder.characterId': c._id,
    }).lean<OfficeTermDoc>();
    expect(held).not.toBeNull();
    // The result is in: the card offers the move again (and the sheet warns of the seat).
    const card = (await p.caller.city.get({ cityId: 'irongate' })).districts!.find(
      (d) => d.id === 'irongate.eastside',
    )!.residence;
    expect(card.state).toBe('visitingMay');
    expect(card.sheet!.lines.some((l) => l.warn)).toBe(true);
  });
});

describe('the room (design §7.4, screens §6.1)', () => {
  it('Eviction Notices halve it: 50 Iron, the price line names the Issue', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Tess Wahl', cityId: 'irongate' });
    await setIssueEffect('irongate', 'issue.evictions', DAY - 1, DAY + 6);
    const city = await p.caller.city.get({ cityId: 'irongate' });
    // Review 4 #9: the room is the Lodgings card at the Junction.
    const room = city.locations.find((l) => l.id === JUNCTION)!.lodgings!;
    expect(room.price).toEqual({ base: 100, total: 50, lines: [{ id: 'issue.evictions', label: expect.any(String), pct: -50 }] });
    const r = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(r.knockOns.iron).toEqual({ before: 1000, after: 950 });
    await City.updateOne({ _id: 'irongate' }, { $set: { 'issues.effects': [] } });
  });

  it('fixed (m5): a renewal on the day the room was taken adds seven nights; a second is refused', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Uwe Rand', cityId: 'irongate' });
    await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    // The card reads *Your bed until …* with *Seven more nights · 100 Iron* (slice-4-fixes.md §6, review 4 #9).
    const lodgings = async () =>
      (await p.caller.city.get({ cityId: 'irongate' })).locations.find((l) => l.id === JUNCTION)!.lodgings!;
    const card = await lodgings();
    expect(card).toMatchObject({ running: { untilDay: DAY + 7 }, tap: 'renew' });
    expect(card.renewFromDay).toBeNull();
    const r = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(r).toMatchObject({ act: 'renew', knockOns: { iron: { before: 900, after: 800 } } });
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.room).toMatchObject({
      fromDay: DAY,
      untilDay: DAY + 14,
    });
    // Fourteen nights paid: no Renew until seven remain, and a request that arrives anyway is refused.
    const after = await lodgings();
    expect(after).toMatchObject({ tap: 'notYet', renewFromDay: DAY + 7 });
    const err = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }).catch((e: unknown) => e);
    expect(gameData(err).game?.reason).toBe('ROOM_PAID_AHEAD');
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.iron).toBe(800);
  });

  it('two taps at once with two keys (no client guard): a room and at most one renewal', async () => {
    // Recorded: the client sends one key per tap and blocks a second tap (usePoliticalAct), so this
    // needs a hand-made request. Since the fix round the second tap can only add seven nights.
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Vera Holz', cityId: 'irongate' });
    await Promise.allSettled([
      p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }),
      p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }),
    ]);
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    // Slice-4 fixes §6: the second is a renewal (seven more nights) or loses the race; never more
    // than fourteen nights, and the Iron matches the nights.
    expect([DAY + 7, DAY + 14]).toContain(c.room!.untilDay);
    expect(c.iron).toBe(c.room!.untilDay === DAY + 14 ? 800 : 900);
  });
});
