import type { GameContent } from '@irongate/content';
import { City, OfficeTerm } from '@irongate/db';
import type { CharacterDoc, CityDoc, OfficeTermDoc } from '@irongate/db';
import {
  CAPITAL_COUNCIL,
  COUNCIL,
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  deskNext,
  nextMonday,
  nextNominationsAfter,
} from '@irongate/rules';
import type { TownHallView } from '@irongate/rules';
import type { Types } from 'mongoose';
import { gameError } from '../gameError';
import { cityIssueRows } from './cityService';
import { councilViewFor, hallView, politicsSummary, whatNowOf } from './politicsService';
import { residenceCityId } from './residence';

/**
 * Review 4 (answers §10–§11, ADR 0077): the Town Hall's sheet for any city with a council, the
 * council's public face. Built from `councilViewFor` (the seats, the order paper, the rule in force),
 * the city's Issues and, in the caller's own city, the Election card. `desk` and `whatNow` only for
 * a councillor of this council. A read: nothing is written.
 */
export async function townHallView(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  now: number,
): Promise<TownHallView> {
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });
  if (!city.council) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const hall = hallView(content, cityId);
  if (!hall) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const today = dayKey(now);
  const doc = await City.findById(cityId).lean<CityDoc>();
  // ELECTION_NOT_READY when the city has no order paper yet (not bootstrapped).
  const council = await councilViewFor(content, c, cityId, doc, today);
  const capital = content.isDistricted(cityId);
  const cal = councilDay(today, city.council.offset);
  const plain = (id: string) => content.ordinance(id)?.plainLine ?? '';
  const divided = council.paper.status === 'divided';

  const inForce = council.inForce
    ? {
        ordinanceId: council.inForce.ordinanceId,
        name: council.inForce.name,
        plainLine: plain(council.inForce.ordinanceId),
        daysLeft: council.inForce.daysLeft,
      }
    : null;
  const noRule = inForce
    ? null
    : divided && council.paper.rose
      ? { why: 'divided' as const, at: null }
      : { why: 'beforeVote' as const, at: council.window.divideAt };

  // The caller's own seat on this council (for *What now*), current and not vacated.
  const myTerm = council.you.councillor
    ? await OfficeTerm.findOne({
        councilKey: councilKey(cityId, cal.cycle),
        'holder.kind': 'player',
        'holder.characterId': c._id,
        vacatedDay: null,
      }).lean<OfficeTermDoc>()
    : null;

  const passedItem = council.paper.items.find((i) => i.passed) ?? null;
  const votedName =
    council.you.voted === null
      ? null
      : (council.paper.items.find((i) => i.ordinanceId === council.you.voted)?.name ?? 'None of these');
  const desk = council.you.councillor
    ? {
        ...council,
        next: deskNext({
          cycleDay: cal.cycleDay,
          voting: council.window.voting,
          divideAt: council.window.divideAt,
          voted: votedName,
          passed: passedItem ? { name: passedItem.name, untilDay: cal.ordinanceWindow.toDay } : null,
          nominationsFromDay: nextNominationsAfter(today, city.council.offset),
        }),
      }
    : null;

  const isResidence = residenceCityId(c) === cityId;
  const residenceDoc = isResidence ? doc : await City.findById(residenceCityId(c)).lean<CityDoc>();
  return {
    cityId,
    cityName: city.name,
    hall,
    seatCount: capital ? CAPITAL_COUNCIL.seats : COUNCIL.seats,
    passVotes: capital ? CAPITAL_COUNCIL.passVotes : COUNCIL.passVotes,
    termEndsAt: council.termEndsAt,
    inForce,
    noRule,
    seats: council.seats.map((s) => ({
      seat: s.seat,
      kind: s.kind,
      name: s.name,
      avatar: s.avatar,
      rankTitle: s.rankTitle,
      you: s.you,
      votedFor: s.votedFor,
      ...(s.factionId ? { factionId: s.factionId } : {}),
      ...(s.districtName !== undefined ? { districtName: s.districtName } : {}),
    })),
    paper: {
      status: council.paper.status,
      items: council.paper.items.map((i) => ({
        n: i.n,
        ordinanceId: i.ordinanceId,
        name: i.name,
        plainLine: plain(i.ordinanceId),
        effectLine: i.effectLine,
        movedBy: i.movedBy,
        votes: i.votes,
        passed: i.passed,
      })),
      against: council.paper.against,
      rose: council.paper.rose,
    },
    divideAt: council.window.divideAt,
    nextVoteAt: council.paper.status === 'open' ? council.window.divideAt : null,
    issues: await cityIssueRows(content, city, doc, today),
    issuesSettleAt: dayStart(nextMonday(today)),
    // The Election card is the reader's own city's (a visitor has no vote here).
    election: isResidence ? await politicsSummary(content, c, residenceDoc, now, today) : null,
    desk,
    whatNow: myTerm && !myTerm.whatNowSeenAt ? whatNowOf(content, myTerm) : null,
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
