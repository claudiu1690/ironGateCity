import type { GameContent } from '@irongate/content';
import { Character, OfficeTerm, RuleBallot } from '@irongate/db';
import type { CharacterDoc, CityDoc, OfficeTermDoc, RuleBallotDoc } from '@irongate/db';
import {
  CAPITAL_COUNCIL,
  COUNCIL,
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  nextMonday,
} from '@irongate/rules';
import type { TownHallView } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';
import { gameError } from '../gameError';
import { ensureCityDay } from './cityDay';
import { cityIssueRows } from './cityService';
import { ordinanceIdOn } from './modifiers';
import { ballotView, electionStandCard, hallView, ruleMenu, seatTie, whatNowOf } from './politicsService';
import { cardByName, termRule } from './ruleBallot';
import { assetView, rankTitle } from './views';

/**
 * Review 4 (answers §10–§11, ADR 0077); the voting rework (design §4.4, tech design §8.3): the Town
 * Hall's sheet for any city with a council, the council's public face: the rule in force and how it
 * won, next week's rule (the ballot: provisional on days 0–1, set on days 2–4), the council's seats
 * with their rules, the stand card for a resident on days 0–1, and the week's Issues. `councillor`
 * and `whatNow` only for a councillor of this council. A read: nothing is written.
 */
export async function townHallView(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  now: number,
  /** Inside an act's transaction (`council.setRule`): its session and the city as read in it. */
  tx?: { session: ClientSession; city: CityDoc | null },
): Promise<TownHallView> {
  const session = tx?.session ?? null;
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });
  if (!city.council) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const hall = hallView(content, cityId, now);
  if (!hall) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const today = dayKey(now);
  // QA n3: settle (and bootstrap) the city's day first, as `city.get` does, so the hall answers for a
  // city nobody has touched yet. One read by `_id` once it is settled.
  const doc = tx ? tx.city : await ensureCityDay(content, cityId, now);
  const capital = content.isDistricted(cityId);
  const home = city.homeFactionId ?? null;
  const cal = councilDay(today, city.council.offset);
  const key = councilKey(cityId, cal.cycle);

  // The council's seats, with their rules (a seat vacated at a move shows its new holder).
  const terms = await OfficeTerm.find({ councilKey: key, vacatedDay: null })
    .sort({ seat: 1 })
    .session(session)
    .lean<OfficeTermDoc[]>();
  const playerIds = terms.flatMap((t) => (t.holder.kind === 'player' ? [t.holder.characterId] : []));
  const chars = await Character.find({ _id: { $in: playerIds } }, { name: 1, avatarId: 1, rank: 1, factionId: 1 }).lean<
    CharacterDoc[]
  >();
  const ruleName = (id: string | null) => (id ? (content.ordinance(id)?.name ?? id) : null);
  const myTerm =
    terms.find((t) => t.holder.kind === 'player' && t.holder.characterId.equals(c._id)) ?? null;

  // The rule in force and how it won (the ballot that decided it).
  const ordId = ordinanceIdOn(doc, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  const paperId = doc?.ordinance?.id === ordId ? (doc?.ordinance?.paperId ?? null) : null;
  const decided = paperId ? await RuleBallot.findById(paperId).session(session).lean<RuleBallotDoc>() : null;
  const won = decided?.status === 'counted' && decided.result?.winner === ordId ? decided.result : null;
  const wonCard = won ? (decided!.cards ?? []).find((x) => x.ordinanceId === won.winner) : undefined;
  const inForce: TownHallView['inForce'] =
    ord && doc?.ordinance
      ? {
          ordinanceId: ord.id,
          name: ord.name,
          plainLine: ord.plainLine,
          daysLeft: doc.ordinance.toDay - today,
          how: won?.how ?? null,
          countDay: won ? decided!.countDay : null,
          votes: won ? (won.tallies.find((t) => t.ordinanceId === won.winner)?.votes ?? 0) : null,
          voters: won?.turnout?.voters ?? null,
          seats: won ? (won.tallies.find((t) => t.ordinanceId === won.winner)?.seats ?? null) : null,
          factionIds: wonCard?.factionIds ?? [],
          by: wonCard?.by[0] ? cardByName(content, wonCard.by[0]) : null,
          councillor: wonCard?.by[0]?.kind === 'councillor' ? wonCard.by[0].name : null,
          seatTie: !!won && won.how === 'seats' && seatTie(won.tallies, won.winner),
        }
      : null;

  const next = await ballotView(content, c, cityId, doc, now, session);
  const myRuleId = myTerm ? termRule(content, myTerm, home) : null;
  const councillor: TownHallView['councillor'] =
    myTerm && myRuleId
      ? {
          rule: { ordinanceId: myRuleId, name: ruleName(myRuleId)! },
          onBallot: next.myRule?.onBallot ?? false,
          changeUntil: cal.council.ruleOpen ? dayStart(cal.council.setDay) : null,
          menu: cal.council.ruleOpen
            ? ruleMenu(
                content,
                cityId,
                content.faction(myTerm.factionId ?? home ?? c.factionId).branchMotion,
                next.cards.map((x) => ({ ordinanceId: x.ordinanceId, factionIds: [], by: [] })),
              )
            : [],
          ...(next.myRule?.capital !== undefined ? { capital: next.myRule.capital } : {}),
        }
      : null;

  return {
    cityId,
    cityName: city.name,
    hall,
    night: hall.night,
    seatCount: capital ? CAPITAL_COUNCIL.seats : COUNCIL.seats,
    termEndsAt: dayStart(cal.council.toDay),
    inForce,
    next,
    seats: terms.map((t) => {
      const where = capital
        ? {
            ...(t.factionId ? { factionId: t.factionId } : {}),
            districtName: t.districtId ? (content.district(t.districtId)?.quarter.name ?? null) : null,
          }
        : {};
      const rule = ruleName(termRule(content, t, home));
      if (t.holder.kind === 'npc') {
        return {
          seat: t.seat,
          kind: 'npc' as const,
          name: t.holder.name,
          avatar: null,
          rankTitle: null,
          you: false,
          rule,
          ...where,
        };
      }
      const holder = t.holder;
      const ch = chars.find((x) => x._id.equals(holder.characterId));
      return {
        seat: t.seat,
        kind: 'player' as const,
        name: ch?.name ?? holder.name,
        avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
        rankTitle: ch ? rankTitle(content, ch, ch.rank) : null,
        you: holder.characterId.equals(c._id),
        rule,
        ...where,
      };
    }),
    stand: await electionStandCard(content, c, cityId, doc, now, session),
    issues: await cityIssueRows(content, city, doc, today),
    issuesSettleAt: dayStart(nextMonday(today)),
    councillor,
    whatNow: myTerm && !myTerm.whatNowSeenAt ? await whatNowOf(content, myTerm, doc, session) : null,
    serverNow: now,
  };
}

/**
 * Review 4 (answers §10.1, ADR 0077): *What now* was shown. A conditional `$set` to a target state
 * (ADR 0008): only the holder's own term, only while unseen; a repeat or a race keeps the first
 * moment. Returns the stored moment (null for a term that is not the caller's).
 */
export async function markWhatNowSeen(
  c: Pick<CharacterDoc, '_id'>,
  termId: Types.ObjectId,
  now: number,
): Promise<{ seenAt: number | null }> {
  await OfficeTerm.updateOne(
    { _id: termId, 'holder.kind': 'player', 'holder.characterId': c._id, whatNowSeenAt: null },
    { $set: { whatNowSeenAt: new Date(now) } },
  );
  const t = await OfficeTerm.findOne(
    { _id: termId, 'holder.characterId': c._id },
    { whatNowSeenAt: 1 },
  ).lean<OfficeTermDoc>();
  return { seenAt: t?.whatNowSeenAt ? t.whatNowSeenAt.getTime() : null };
}
