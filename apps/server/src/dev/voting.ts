import type { GameContent } from '@irongate/content';
import { Character, City, Election, OfficeTerm, RuleBallot, Vote } from '@irongate/db';
import type { CharacterDoc, ElectionDoc, OfficeTermDoc, RuleBallotDoc } from '@irongate/db';
import { councilDay, councilKey, dayKey, electionKey } from '@irongate/rules';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ensureCityDay } from '../services/cityDay';
import { residenceSpec } from '../services/residence';
import { inTransaction } from '../services/txn';
import { DevRefusal } from './risk';

/**
 * The voting rework (tech design §12): the e2e hooks for the rule vote, memory mode only
 * (E2E_TEST_HOOKS). No game rule lives here: they stand in for other players (synthetic votes) or for
 * a count already won (a seat), and the next boundary decides everything as in play.
 */

/** `POST /api/test/rule-votes`: synthetic votes into the open election of the residence (or `placeId`). */
export const RuleVotesBody = z
  .object({
    votes: z.record(z.string().min(1), z.number().int().min(0).max(50)),
    placeId: z.string().min(1).optional(),
  })
  .strict();

/** `POST /api/test/seat`: the caller takes a local's seat on the residence's sitting council. */
export const SeatBody = z.object({ seat: z.number().int().min(1).max(10).optional() }).strict();

/**
 * Synthetic votes (fresh voter ids) for cards of the set ballot, into the election of the residence
 * place (or `placeId`, a city or a capital district) while it is `polling`; `$inc ballots` filtered on
 * `polling`, as a real vote is. Refused for a rule that is not a card.
 */
export async function addRuleVotes(
  content: GameContent,
  c: CharacterDoc,
  body: z.output<typeof RuleVotesBody>,
  now: number,
): Promise<{ electionId: string; added: number }> {
  const spec = residenceSpec(content, c);
  const placeId = body.placeId ?? spec.place.id;
  const district = content.district(placeId);
  const cityId = district ? district.city.id : placeId;
  const city = content.city(cityId);
  if (!city?.council) throw new DevRefusal(400, `${placeId} has no council`);
  await ensureCityDay(content, cityId, now);
  const today = dayKey(now);
  const cal = councilDay(today, city.council.offset);
  const electionId = electionKey(placeId, cal.cycle);
  const added = await inTransaction(async (session) => {
    const e = await Election.findById(electionId, { status: 1 }).session(session).lean<ElectionDoc>();
    if (e?.status !== 'polling') throw new DevRefusal(409, `${electionId} is not polling`);
    const b = await RuleBallot.findById(councilKey(cityId, cal.cycle), { cards: 1, status: 1 })
      .session(session)
      .lean<RuleBallotDoc>();
    if (!b?.cards || b.status !== 'set') throw new DevRefusal(409, 'the ballot is not set');
    const rows: Array<{ electionId: string; voterId: Types.ObjectId; ordinanceId: string; day: number }> = [];
    for (const [ordinanceId, n] of Object.entries(body.votes)) {
      if (!b.cards.some((x) => x.ordinanceId === ordinanceId)) {
        throw new DevRefusal(400, `${ordinanceId} is not a card of ${b._id}`);
      }
      for (let i = 0; i < n; i++) rows.push({ electionId, voterId: new Types.ObjectId(), ordinanceId, day: today });
    }
    if (rows.length === 0) return 0;
    const open = await Election.updateOne(
      { _id: electionId, status: 'polling' },
      { $inc: { ballots: rows.length } },
      { session },
    );
    if (open.matchedCount === 0) throw new DevRefusal(409, `${electionId} is not polling`);
    await Vote.insertMany(rows, { session });
    return rows.length;
  });
  return { electionId, added };
}

/**
 * *Seat me* (tech design §12): the caller takes a local's seat on the residence's sitting council for
 * the rest of the term: the lowest-ranked local seat (in the capital, of the residence district), or
 * `seat`. The local's term is vacated from today (a seat won this morning simply changes holder); the
 * player's term runs from today with the faction's default rule; the `offices` projection is written
 * as the settlement writes it. Refused when the caller already sits.
 */
export async function seatMe(
  content: GameContent,
  c: CharacterDoc,
  body: z.output<typeof SeatBody>,
  now: number,
): Promise<{ councilKey: string; seat: number }> {
  const spec = residenceSpec(content, c);
  const cityId = spec.city.id;
  await ensureCityDay(content, cityId, now);
  const today = dayKey(now);
  const cal = councilDay(today, spec.offset);
  const key = councilKey(cityId, cal.cycle);
  return inTransaction(async (session) => {
    const terms = await OfficeTerm.find({ councilKey: key, vacatedDay: null })
      .session(session)
      .lean<OfficeTermDoc[]>();
    if (terms.some((t) => t.holder.kind === 'player' && t.holder.characterId.equals(c._id))) {
      throw new DevRefusal(409, 'already seated on this council');
    }
    const locals = terms
      .filter((t) => t.holder.kind === 'npc')
      .filter((t) => spec.place.kind !== 'district' || t.districtId === spec.place.id)
      .sort((a, b) => b.seat - a.seat);
    const term = body.seat !== undefined ? locals.find((t) => t.seat === body.seat) : locals[0];
    if (!term) throw new DevRefusal(409, `no local seat ${body.seat ?? ''} to take on ${key}`);
    const holder = { kind: 'player' as const, characterId: c._id, name: c.name };
    const rule = content.faction(term.factionId ?? spec.home ?? c.factionId).branchMotion;
    let termId: Types.ObjectId;
    if (term.fromDay === today) {
      await OfficeTerm.updateOne(
        { _id: term._id, vacatedDay: null },
        { $set: { holder, rule, ruleSetAt: null } },
        { session },
      );
      termId = term._id;
    } else {
      await OfficeTerm.updateOne({ _id: term._id, vacatedDay: null }, { $set: { vacatedDay: today } }, { session });
      termId = new Types.ObjectId();
      await OfficeTerm.create(
        [
          {
            _id: termId,
            cityId,
            councilKey: key,
            electionId: term.electionId,
            seat: term.seat,
            factionId: term.factionId,
            districtId: term.districtId ?? null,
            vacatedDay: null,
            fromDay: today,
            toDay: term.toDay,
            holder,
            place: term.place,
            total: term.total,
            completed: false,
            rule,
          },
        ],
        { session },
      );
    }
    await City.updateOne(
      { _id: cityId, 'council.key': key },
      {
        $inc: {
          'council.npcSeats': -1,
          ...(term.districtId && term.factionId ? { [`council.npcSeatsByFaction.${term.factionId}`]: -1 } : {}),
        },
      },
      { session },
    );
    await Character.updateOne(
      { _id: c._id },
      {
        $push: {
          offices: { termId, cityId, councilKey: key, seat: term.seat, fromDay: today, toDay: term.toDay },
        },
        $inc: { version: 1 },
      },
      { session },
    );
    return { councilKey: key, seat: term.seat };
  });
}
