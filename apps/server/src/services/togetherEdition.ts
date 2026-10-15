import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { CampaignEvent, Character, EventSignup, Stay } from '@irongate/db';
import type { CampaignEventDoc, CharacterDoc, EventSignupDoc, StayDoc } from '@irongate/db';
import { EVENT_BANDS, dayStart } from '@irongate/rules';
import type { DayKey, EventBand, EventFacts, HeadlineCondition } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { typeOf, venueOfEvent } from './eventPlace';
import { residenceCityId } from './residence';

/**
 * Slice 6 (tech design §8.4, §11.2): the settlement's reads of yesterday's events and favours, and
 * the placeholders each event headline fills. *Yesterday* is the event's `day` (the fixture of day
 * d is in the paper of d + 1); the read path resolved yesterday's events before the settlement.
 */

export type TogetherVars = Partial<Record<HeadlineCondition['kind'], Record<string, string>>>;
export interface TogetherEdition {
  facts: EventFacts;
  varsByKind: TogetherVars;
}

/** As the UI's `formatSwing` (Capital.tsx): two decimals at most, trailing zeros trimmed (+1, +0.8, −0.25). */
const swingText = (x: number): string => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(2).replace(/\.?0+$/, '')}`;
const bandRank = (b: EventBand) => EVENT_BANDS.indexOf(b);

function eventVars(content: GameContent, ev: CampaignEventDoc): Record<string, string> {
  const type = typeOf(content, ev.typeId);
  const r = ev.result;
  return {
    event: type.runningName,
    venue: venueOfEvent(content, ev).location.name,
    swing: swingText(r ? (r.opinion.mode === 'against' ? (r.opinion.toActor ?? 0) : r.opinion.applied) : 0),
    members: String(r?.participants.length ?? 0),
    outcome: r ? copy.together.band[r.band] : copy.together.calledOffWord,
    caller: ev.calledBy.kind === 'member' ? ev.calledBy.name : '',
  };
}

export async function readTogether(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  session: ClientSession,
): Promise<TogetherEdition> {
  const y = today - 1;
  const from = new Date(dayStart(y));
  const to = new Date(dayStart(today));
  const facts: EventFacts = {
    tookPart: null,
    city: false,
    calledOff: false,
    bailPostedFor: false,
    bailPostedBy: false,
    visited: false,
  };
  const varsByKind: TogetherVars = {};

  const mine = await EventSignup.find({ characterId: c._id, day: y, status: 'resolved' })
    .session(session)
    .lean<EventSignupDoc[]>();
  const best = mine
    .filter((s) => s.result)
    .sort((a, b) => bandRank(a.result!.band) - bandRank(b.result!.band))[0];
  if (best) {
    const ev = await CampaignEvent.findById(best.eventId).session(session).lean<CampaignEventDoc>();
    if (ev) {
      facts.tookPart = best.result!.band;
      varsByKind.eventResolvedYesterday = { ...eventVars(content, ev), pc: String(best.result!.pc.amount) };
    }
  }
  if (!best) {
    const city = await CampaignEvent.find({
      factionId: c.factionId,
      cityId: residenceCityId(c),
      day: y,
      status: 'resolved',
    })
      .sort({ startsAt: -1 })
      .limit(1)
      .session(session)
      .lean<CampaignEventDoc[]>();
    if (city[0]) {
      facts.city = true;
      varsByKind.eventResolvedYesterday = eventVars(content, city[0]);
    }
  }
  const off = await CampaignEvent.findOne({ 'calledBy.characterId': c._id, day: y, status: 'calledOff', kind: 'member' })
    .session(session)
    .lean<CampaignEventDoc>();
  if (off) {
    facts.calledOff = true;
    varsByKind.eventCalledOffYesterday = eventVars(content, off);
  }
  const placeOf = (s: StayDoc) => content.location(s.locationId)?.location.name ?? s.cityId;
  const freed = await Stay.findOne({ characterId: c._id, 'bailPostedBy.at': { $gte: from, $lt: to } })
    .session(session)
    .lean<StayDoc>();
  if (freed?.bailPostedBy) {
    facts.bailPostedFor = true;
    varsByKind.bailPostedForYesterday = {
      payer: freed.bailPostedBy.name,
      place: placeOf(freed),
      iron: String(freed.bailPostedBy.iron),
    };
  }
  const paid = await Stay.findOne({ 'bailPostedBy.characterId': c._id, 'bailPostedBy.at': { $gte: from, $lt: to } })
    .session(session)
    .lean<StayDoc>();
  if (paid?.bailPostedBy) {
    const prisoner = await Character.findById(paid.characterId, { name: 1 }).session(session).lean<Pick<CharacterDoc, 'name'>>();
    facts.bailPostedBy = true;
    varsByKind.bailPostedByYesterday = {
      prisoner: prisoner?.name ?? '',
      place: placeOf(paid),
      iron: String(paid.bailPostedBy.iron),
    };
  }
  const ward = await Stay.findOne({ characterId: c._id, 'visits.at': { $gte: from, $lt: to } })
    .session(session)
    .lean<StayDoc>();
  if (ward) {
    const names = [...new Set((ward.visits ?? []).filter((v) => v.at >= from && v.at < to).map((v) => v.name))];
    facts.visited = names.length > 0;
    varsByKind.visitedYesterday = {
      visitors: names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`,
    };
  }
  return { facts, varsByKind };
}
