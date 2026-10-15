import type { GameContent } from '@irongate/content';
import { turnoutOf } from '@irongate/content';
import { Candidacy, Character, District, Election, OfficeTerm, PaperEntry, RuleBallot, Vote } from '@irongate/db';
import type {
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  DistrictDoc,
  ElectionDoc,
  OfficeTermDoc,
  RuleBallotDoc,
  VoteDoc,
} from '@irongate/db';
import {
  CAPITAL_COUNCIL,
  COUNCIL,
  FACTION_IDS,
  ORDINALS,
  WEEKDAY_NAMES,
  backersOf,
  councilDay,
  dayKey,
  councilKey,
  cycleOfKey,
  dayStart,
  electionKey,
  marginToSeat,
  nextNominationsAfter,
  nextPollsFrom,
  npcFill,
  npcsStanding,
  standingView,
  wardVote,
  weekday,
} from '@irongate/rules';
import { RANK_FXP } from '@irongate/rules';
import type {
  CandidateView,
  CapitalCountView,
  CapitalPartyCardView,
  CountRow,
  CountView,
  CouncilRowView,
  DayKey,
  ElectionView,
  EndorsementsView,
  FactionId,
  FrontPageView,
  WhatNowView,
  GameErrorReason,
  HallView,
  LiveHeadline,
  OrdinanceMenuItemView,
  PoliticalFacts,
  PoliticalPlaceholder,
  PoliticsSummaryView,
  ElectionCardState,
  ElectionCardView,
  RuleBallotView,
  RuleCard,
  RuleCardView,
  RuleResultView,
  ScoreboardTableView,
  StandCardView,
} from '@irongate/rules';
import { selectPoliticalHeadlines } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { gameError } from '../gameError';
import { isContested, residenceCityId, residenceOf, residenceSpec } from './residence';
import type { ResidenceSpec } from './residence';
import { battlegroundFill } from './battlegroundDay';
import { ordinanceIdOn } from './modifiers';
import { ballotCards, cardByName, termRule } from './ruleBallot';
import { assetView, namedStanding, rankTitle, standingSuccesses } from './views';
import { nightAt } from './night';

/**
 * The political views (ADR 0023; the voting rework, tech design §8.3): the Election card and the
 * paper's row (one summary), the rule ballot, who's standing, the result (the rule and the council),
 * the front page and the live political headlines. Built at read from the domain collections; no view
 * carries another voter's choice, a ballot count or a tally before the ballot is counted (ADR 0019).
 * Slice 4 (ADR 0026, 0027): every view reads the residence's place: the home city, or in the capital
 * the district lived in, where every party stands and two seats are counted.
 */

type Session = ClientSession | null;
const s = <T extends { session: (x: ClientSession | null) => T }>(q: T, session: Session): T =>
  session ? q.session(session) : q;

export const weekdayName = (day: DayKey): string => WEEKDAY_NAMES[weekday(day)];
/** "Weiss": the name the count's headline and the Polling Day row use. */
export const surname = (name: string): string => name.trim().split(/\s+/).at(-1) ?? name;

/** The residence's spec, or null when it has no council to show. */
function specOf(content: GameContent, c: CharacterDoc): ResidenceSpec | null {
  try {
    return residenceSpec(content, c);
  } catch {
    return null;
  }
}

const isDistrict = (spec: ResidenceSpec) => spec.place.kind === 'district';
/** The faction whose branch a member belongs to at the residence: the home one, or their own. */
const branchOf = (spec: ResidenceSpec, c: Pick<CharacterDoc, 'factionId'>): FactionId =>
  spec.home ?? c.factionId;
/** The seats a place elects. */
const seatsOf = (spec: ResidenceSpec): 7 | 2 =>
  (isDistrict(spec) && !oneMeter(spec) ? CAPITAL_COUNCIL.perDistrict : COUNCIL.seats) as 7 | 2;
/** Slice 7 (ADR 0050): Clearwater votes as one place (the city), lists of three. */
const oneMeter = (spec: Pick<ResidenceSpec, 'place' | 'city'>) => spec.place.kind === 'district' && spec.place.id === spec.city.id;
/** The locals a faction lists when `n` of its members stand: two in a district, three in Clearwater. */
const fillOf = (spec: Pick<ResidenceSpec, 'place' | 'city'>, n: number) => (oneMeter(spec) ? battlegroundFill(n) : npcFill(n));

/**
 * The backing given this cycle: at home keyed by the election, in the capital by the city's cycle
 * (one per member per cycle in the city, whichever district's candidate; ADR 0027 §4).
 */
export function givenThisCycle(c: CharacterDoc, spec: ResidenceSpec, cycle: number) {
  const given = c.endorsementsGiven ?? [];
  return isDistrict(spec)
    ? given.find((g) => g.cityCycle === councilKey(spec.city.id, cycle))
    : given.find((g) => g.electionId === electionKey(spec.place.id, cycle));
}

/**
 * Review 3 (GDD §15.3, answers §6.1): the council's hall on the city picture and the map's two stills,
 * for the election screens' header crop (the client picks day or night by the map's rule). Review 4
 * (ADR 0077): read from the hall's location (its name, `ref` and pin).
 */
export function hallView(content: GameContent, cityId: string, now: number): HallView | null {
  const city = content.city(cityId);
  const hall = content.hallOf(cityId)?.location;
  if (!city || !hall) return null;
  return {
    name: hall.name,
    ref: hall.ref ?? `the ${hall.name}`,
    x: hall.map.x,
    y: hall.map.y,
    asset: { day: assetView(content, city.map.day), night: assetView(content, city.map.night) },
    night: nightAt(now),
  };
}

const ordersAllDoneToday = (c: CharacterDoc, today: DayKey) =>
  c.orders.day === today && c.orders.allDoneAt !== null;

/** The backers line of a standing candidacy (ADR 0084: members plus the branch's, once). */
export function endorsementsOf(
  content: GameContent,
  cand: Pick<CandidacyDoc, 'endorsements' | 'branch'>,
  secretaryName: string,
): EndorsementsView {
  const names = [
    ...(cand.branch ? [`${secretaryName} (the branch)`] : []),
    ...cand.endorsements.map((e) => e.name),
  ];
  return {
    n: backersOf({ members: cand.endorsements.length, branch: cand.branch !== null }),
    branch: cand.branch !== null,
    names: names.slice(0, 5),
    more: Math.max(0, names.length - 5),
  };
}

const secretaryOf = (content: GameContent, f: FactionId) =>
  content.npc(content.faction(f).secretary.npcId)?.name ?? '';

const ruleName = (content: GameContent, id: string) => content.ordinance(id)?.name ?? id;

// ---------------------------------------------------------------------------------------------
// The rule cards (the voting rework, tech design §8.3).
// ---------------------------------------------------------------------------------------------

/** One card as the screens show it; `yourVote` is the caller's own only (ADR 0019). */
export function ruleCardView(
  content: GameContent,
  card: RuleCard,
  me: { characterId: string; myVote: string | null },
): RuleCardView {
  const o = content.ordinance(card.ordinanceId);
  const first = card.by[0];
  const whose: RuleCardView['whose'] =
    first?.kind === 'councillor'
      ? { kind: 'councillor', name: first.name, local: first.holder === 'npc', you: first.characterId === me.characterId }
      : {
          kind: 'party',
          factionIds: [...card.factionIds],
          by: card.by.map((b) => cardByName(content, b)).join(' · '),
          // Design §8.9 Q2: which form `by` takes; a shared card's is its first party's.
          via: first?.kind === 'party' ? first.via : 'secretary',
        };
  return {
    ordinanceId: card.ordinanceId,
    name: o?.name ?? card.ordinanceId,
    plainLine: o?.plainLine ?? '',
    effectLine: o?.effectLine ?? '',
    whose,
    yourVote: me.myVote === card.ordinanceId,
  };
}

/** A district's cards by its parties' shares there (design §4.2, the capital). */
function byDistrictShares(cards: RuleCard[], opinion: DistrictDoc['opinion'] | null): RuleCard[] {
  if (!opinion) return cards;
  const best = (c: RuleCard) => Math.max(0, ...c.factionIds.map((f) => opinion[f]));
  return [...cards].sort((a, b) => best(b) - best(a));
}

/** The rule picker's rows (design §4.5): the branch's default first, then the city's menu. */
export function ruleMenu(
  content: GameContent,
  cityId: string,
  defaultRule: string,
  cards: readonly RuleCard[],
): OrdinanceMenuItemView[] {
  const menu = content.isDistricted(cityId) ? content.irongateMenu() : content.ordinancesMenu();
  const ordered = [...menu.filter((o) => o.id === defaultRule), ...menu.filter((o) => o.id !== defaultRule)];
  return ordered.map((o) => ({
    ordinanceId: o.id,
    name: o.name,
    line: o.line,
    plainLine: o.plainLine,
    effectLine: o.effectLine,
    onBallot: cards.some((c) => c.ordinanceId === o.id),
  }));
}

/** The election the caller votes in for a city: the residence's place, when the city is the residence. */
function voterPlace(content: GameContent, c: CharacterDoc, cityId: string): ResidenceSpec | null {
  if (residenceCityId(c) !== cityId) return null;
  return specOf(content, c);
}

/**
 * `council.ballot` (tech design §8.3): next week's rule for a city (default: the residence). Days
 * 0–1 the provisional cards (no write), days 2–4 the set cards; the caller's own vote and rule only.
 */
export async function ballotView(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  city: CityDoc | null,
  now: number,
  session: Session = null,
): Promise<RuleBallotView> {
  const cityContent = content.city(cityId);
  if (!cityContent?.council) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const today = dayKey(now);
  const offset = cityContent.council.offset;
  const cal = councilDay(today, offset);
  const k = cal.cycle;
  const capital = content.isDistricted(cityId);
  const spec = voterPlace(content, c, cityId);
  const place = spec?.place ?? { id: cityId, name: cityContent.name, kind: 'home' as const };
  const { cards: raw, status } = await ballotCards(content, cityId, k, city, session);
  let cards = raw;
  if (capital && place.kind === 'district') {
    const d = await s(District.findById(place.id, { opinion: 1 }), session).lean<DistrictDoc>();
    cards = byDistrictShares(raw, d?.opinion ?? null);
  }
  const electionId = electionKey(place.id, k);
  const vote =
    spec && cal.phase === 'polling'
      ? await s(Vote.findOne({ electionId, voterId: c._id }, { ordinanceId: 1 }), session).lean<VoteDoc>()
      : null;
  const myVote = vote?.ordinanceId ?? null;
  const r = residenceOf(c);
  const reason: GameErrorReason | null = !spec
    ? 'NOT_RESIDENT'
    : spec.home !== null && spec.home !== c.factionId
      ? 'WRONG_FACTION'
      : c.rank < COUNCIL.voteRank
        ? 'RANK_TOO_LOW'
        : cal.phase !== 'polling'
          ? 'NOT_POLLING'
          : r.votesFromDay > cal.election.pollsFrom
            ? 'NOT_YET_VOTER'
            : myVote
              ? 'ALREADY_VOTED'
              : null;
  const term = await s(
    OfficeTerm.findOne({
      councilKey: councilKey(cityId, k),
      'holder.kind': 'player',
      'holder.characterId': c._id,
      vacatedDay: null,
    }),
    session,
  ).lean<OfficeTermDoc>();
  const myRuleId = term ? termRule(content, term, cityContent.homeFactionId ?? null) : null;
  // The capital (design §8.6 Q4): the party has one card, set by the bloc's top seat.
  const partyCard = capital && term ? capitalPartyCard(content, raw, term.factionId ?? null, c._id.toHexString()) : null;
  // "2 players and 7 local candidates for 7 seats".
  const e = await s(Election.findById(electionId, { ballot: 1, status: 1 }), session).lean<ElectionDoc>();
  let players: number;
  let locals: number;
  if (e?.ballot) {
    players = e.ballot.filter((b) => b.kind === 'player').length;
    locals = e.ballot.length - players;
  } else {
    const standing = await s(
      Candidacy.find({ electionId, status: 'standing' }, { factionId: 1 }),
      session,
    ).lean<CandidacyDoc[]>();
    players = standing.length;
    locals =
      place.kind === 'district'
        ? FACTION_IDS.reduce((n, f) => n + fillOf({ place, city: cityContent }, standing.filter((x) => x.factionId === f).length), 0)
        : npcsStanding(players);
  }
  const me = { characterId: c._id.toHexString(), myVote };
  return {
    key: councilKey(cityId, k),
    cityId,
    cityName: cityContent.name,
    placeName: place.name,
    capital,
    status,
    cards: cards.map((x) => ruleCardView(content, x, me)),
    setAt: dayStart(cal.council.setDay),
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    countAt: dayStart(cal.election.countDay),
    runsUntil: dayStart(cal.nextRuleWindow.toDay),
    myVote: myVote ? { ordinanceId: myVote, name: ruleName(content, myVote) } : null,
    canVote: reason === null,
    reason,
    myRule: myRuleId
      ? {
          ordinanceId: myRuleId,
          name: ruleName(content, myRuleId),
          onBallot: partyCard ? partyCard.leadsBloc : raw.some((x) => x.ordinanceId === myRuleId),
          changeUntil: cal.council.ruleOpen ? dayStart(cal.council.setDay) : null,
          ...(capital ? { capital: partyCard } : {}),
        }
      : null,
    standing: { players, locals, seats: place.kind === 'district' ? 2 : 7 },
  };
}

/**
 * The voting rework, phase 4 (design §8.6 Q4): a capital councillor's party card: its rule, the
 * councillor who set it (the bloc's top seat, `partyCardOf`) and whether that is the reader. Null when
 * the party's card is the secretary's (no player councillor of the party names a rule).
 */
export function capitalPartyCard(
  content: GameContent,
  cards: readonly RuleCard[],
  factionId: FactionId | null,
  me: string,
): CapitalPartyCardView | null {
  if (!factionId) return null;
  const card = cards.find((x) => x.factionIds.includes(factionId));
  const by = card?.by.find((b) => b.kind === 'party' && b.factionId === factionId);
  if (!card || !by || by.kind !== 'party' || by.via !== 'councillor') return null;
  return { factionId, rule: ruleName(content, card.ordinanceId), by: by.name, leadsBloc: by.characterId === me };
}

/** A counted ballot's result for the screens (finishing order; the numbers stored at the count). */
export function ruleResultView(
  content: GameContent,
  b: RuleBallotDoc,
  me: { characterId: string; myVote: string | null },
): RuleResultView | null {
  const r = b.result;
  if (b.status !== 'counted' || !r) return null;
  const cards = b.cards ?? [];
  const tallies = r.tallies.length > 0 ? r.tallies : [{ ordinanceId: r.winner, votes: 0 }];
  const total = tallies.reduce((n, t) => n + t.votes, 0);
  return {
    key: b._id,
    countDay: b.countDay,
    weekday: weekdayName(b.countDay),
    cards: tallies.map((t) => {
      const card = cards.find((x) => x.ordinanceId === t.ordinanceId) ?? {
        ordinanceId: t.ordinanceId,
        factionIds: [],
        by: [],
      };
      return {
        ...ruleCardView(content, card, me),
        votes: t.votes,
        seats: t.seats ?? null,
        share: total > 0 ? t.votes / total : 0,
        won: t.ordinanceId === r.winner,
      };
    }),
    how: r.how,
    seatTie: r.how === 'seats' && seatTie(r.tallies, r.winner),
    turnout: r.turnout,
    runsUntil: dayStart(r.inForce.toDay),
  };
}

// ---------------------------------------------------------------------------------------------
// The summary: the Polling Day row, the HQ council card, the Paper tab dot.
// ---------------------------------------------------------------------------------------------

export async function politicsSummary(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  now: number,
  today: DayKey,
  session: Session = null,
): Promise<PoliticsSummaryView | null> {
  const spec = specOf(content, c);
  if (!spec || (spec.home !== null && spec.home !== c.factionId)) return null;
  const { offset, faction } = spec;
  const cityId = spec.city.id;
  const cal = councilDay(today, offset);
  const electionId = electionKey(spec.place.id, cal.cycle);
  const cand = await s(Candidacy.findOne({ electionId, characterId: c._id }), session).lean<CandidacyDoc>();
  const r = residenceOf(c);
  const successes = standingSuccesses(c, cityId);
  const sitting = (c.offices ?? []).some((o) => o.cityId === cityId && o.fromDay <= today && today < o.toDay);
  const canStand =
    cal.phase === 'nominations' &&
    c.rank >= COUNCIL.standRank &&
    standingView(successes).level >= COUNCIL.knownLevel &&
    r.standsFromDay <= today &&
    !sitting &&
    !cand;
  const term = (c.offices ?? []).some((o) => o.councilKey === councilKey(cityId, cal.cycle));
  const ballot =
    c.rank >= COUNCIL.voteRank && (cal.phase === 'polling' || term)
      ? await ballotView(content, c, cityId, city, now, session)
      : null;
  // The last count (ballot k − 1), for the card's result on days 0–1 and the rule in force's line.
  const lastBallot = await s(RuleBallot.findById(councilKey(cityId, cal.cycle - 1)), session).lean<RuleBallotDoc>();
  const card = await electionCard(content, c, {
    cal,
    spec,
    cand,
    ballot,
    lastBallot,
    inForce: city?.ordinance ?? null,
    canStand,
    notYetVoter: r.votesFromDay > cal.election.pollsFrom,
    today,
    session,
  });
  const ordId = ordinanceIdOn(city, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  const decided =
    city?.ordinance?.paperId && city.ordinance.paperId === lastBallot?._id
      ? lastBallot
      : city?.ordinance?.paperId
        ? await s(RuleBallot.findById(city.ordinance.paperId), session).lean<RuleBallotDoc>()
        : null;
  const won = decided?.result?.winner === ordId ? decided.result : null;
  const state = card.state;
  const route: PoliticsSummaryView['route'] =
    state === 'belowRank'
      ? null
      : state === 'vote' || state === 'voted'
        ? '/council/ballot'
        : state === 'councillor' || state === 'nextInLine'
          ? '/council'
          : state === 'result'
            ? '/council/count'
            : '/council/slate';
  return {
    cityId,
    cityName: spec.city.name,
    cycleDay: cal.cycleDay,
    phase: cal.phase,
    state,
    closesAt: card.closesAt,
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    pollsFromWeekday: weekdayName(Math.max(nextPollsFrom(today, offset), r.votesFromDay)),
    countAt: dayStart(cal.election.countDay),
    votedFor: card.votedFor,
    inForce:
      ord && city?.ordinance && city.ordinance.id === ord.id
        ? {
            ordinanceId: ord.id,
            name: ord.name,
            daysLeft: city.ordinance.toDay - today,
            plainLine: ord.plainLine,
            how: won?.how ?? null,
            votes: won ? (won.tallies.find((t) => t.ordinanceId === won.winner)?.votes ?? 0) : null,
            voters: won?.turnout?.voters ?? null,
          }
        : null,
    rank2Title: faction.rankTitles[1]!,
    rank3Title: faction.rankTitles[COUNCIL.standRank - 1]!,
    paperShortName: spec.city.paper?.shortName ?? 'paper',
    fxpToRank2: c.rank < COUNCIL.voteRank ? Math.max(0, RANK_FXP[1]! - c.fxp) : null,
    standCost: COUNCIL.cost.declare,
    route,
    dot: state === 'vote',
    card,
    ballot: cal.phase === 'polling' ? ballot : null,
    placeId: spec.place.id,
    placeName: spec.place.name,
    seats: seatsOf(spec),
  };
}

/**
 * Review 2 (slice-3 screens §1a, §2.1); the voting rework (design §4.1, tech design §8.3): the
 * Election card, one view for the city screen, the paper's row and the HQ sheet. The server picks the
 * state; the client words it.
 */
async function electionCard(
  content: GameContent,
  c: CharacterDoc,
  i: {
    cal: ReturnType<typeof councilDay>;
    spec: ResidenceSpec;
    cand: CandidacyDoc | null;
    ballot: RuleBallotView | null;
    lastBallot: RuleBallotDoc | null;
    /** The city's rule in force (a bootstrapped city has one before any count: *carried over*). */
    inForce: CityDoc['ordinance'] | null;
    canStand: boolean;
    notYetVoter: boolean;
    today: DayKey;
    session: Session;
  },
): Promise<ElectionCardView> {
  const { cal, cand, ballot, today } = i;
  const standing = cand && cand.status === 'standing' ? cand : null;
  const myRule = ballot?.myRule ?? null;
  let state: ElectionCardState;
  if (c.rank < COUNCIL.voteRank) state = 'belowRank';
  else if (cal.phase === 'polling') state = i.notYetVoter ? 'registered' : ballot?.myVote ? 'voted' : 'vote';
  else if (myRule) state = myRule.onBallot ? 'councillor' : 'nextInLine';
  else if (standing) state = 'standing';
  else if (today < residenceOf(c).votesFromDay) state = 'registered';
  else state = 'result';
  // The morning the rank-up to 2 is in the paper (the hl.*rank-up-2 headline): the note, once.
  const firstTime =
    c.rank >= COUNCIL.voteRank &&
    (await s(
      PaperEntry.exists({
        characterId: c._id,
        day: today,
        'headlines.templateId': { $regex: /rank-up-2$/ },
      }),
      i.session,
    )) !== null;

  // The last count (days 0–1): the rule ballot k − 1's result.
  let result: ElectionCardView['result'] = null;
  const r = i.lastBallot?.status === 'counted' ? i.lastBallot.result : null;
  if (r) {
    const card = (i.lastBallot!.cards ?? []).find((x) => x.ordinanceId === r.winner);
    const tally = r.tallies.find((t) => t.ordinanceId === r.winner);
    let capital: NonNullable<ElectionCardView['result']>['capital'];
    if (isDistrict(i.spec)) {
      const prev = await s(
        Election.findById(electionKey(i.spec.place.id, cal.cycle - 1), { result: 1 }),
        i.session,
      ).lean<ElectionDoc>();
      const rows = (prev?.result?.rows ?? []) as Array<CountRow & { factionId?: FactionId }>;
      capital = {
        factionIds: card?.factionIds ?? [],
        seats: tally?.seats ?? 0,
        districtSeats: rows
          .filter((x) => x.seated && x.factionId)
          .sort((a, b) => a.place - b.place)
          .map((x) => x.factionId!),
      };
    }
    result = {
      winner: ruleName(content, r.winner),
      votes: tally?.votes ?? 0,
      voters: r.turnout?.voters ?? r.tallies.reduce((n, t) => n + t.votes, 0),
      how: r.how,
      runsUntil: dayStart(r.inForce.toDay),
      nextVoteAt: dayStart(cal.election.pollsFrom),
      by: card?.by[0] ? cardByName(content, card.by[0]) : null,
      whose: card?.by[0]?.kind ?? null,
      ...(capital ? { capital } : {}),
      seatTie: r.how === 'seats' && seatTie(r.tallies, r.winner),
    };
  } else if (i.inForce && i.inForce.fromDay <= today && today < i.inForce.toDay) {
    // No count yet (a city bootstrapped this cycle): the rule in force is carried over (design §8.2).
    result = {
      winner: ruleName(content, i.inForce.id),
      votes: 0,
      voters: 0,
      how: 'carried',
      runsUntil: dayStart(i.inForce.toDay),
      nextVoteAt: dayStart(cal.election.pollsFrom),
      by: null,
      whose: null,
    };
  }
  return {
    state,
    closesAt: dayStart(cal.phase === 'nominations' ? cal.council.setDay : cal.election.countDay),
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    countAt: dayStart(cal.election.countDay),
    runsFrom: dayStart(cal.election.countDay),
    fxp: c.fxp,
    rank2Fxp: RANK_FXP[COUNCIL.voteRank - 1]!,
    canStand: i.canStand,
    votedFor: ballot?.myVote?.name ?? null,
    result,
    standing: standing
      ? {
          rule: ruleName(content, standing.rule ?? content.faction(branchOf(i.spec, c)).branchMotion),
          backers: backersOf({ members: standing.endorsements.length, branch: standing.branch !== null }),
          branchLine: standing.branch !== null && ordersAllDoneToday(c, today),
        }
      : null,
    councillor: myRule
      ? {
          rule: myRule.name,
          onBallot: myRule.onBallot,
          changeUntil: dayStart(cal.council.setDay),
          ...(myRule.capital !== undefined ? { capital: myRule.capital } : {}),
        }
      : null,
    firstTime,
  };
}

/** The Paper tab's politics dot (tech design §11): the town's vote waiting for the caller. */
export async function politicsWaiting(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  now: number,
  today: DayKey,
): Promise<0 | 1> {
  const spec = specOf(content, c);
  if (!spec || c.rank < COUNCIL.voteRank) return 0;
  const cal = councilDay(today, spec.offset);
  if (cal.phase !== 'polling') return 0;
  const summary = await politicsSummary(content, c, city, now, today);
  return summary?.dot ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------
// Who's standing (council.election).
// ---------------------------------------------------------------------------------------------

/** The stand card (design §4.5), or null when the caller is not one who could stand here today. */
async function standCard(
  content: GameContent,
  c: CharacterDoc,
  spec: ResidenceSpec,
  cal: ReturnType<typeof councilDay>,
  city: CityDoc | null,
  today: DayKey,
  session: Session,
): Promise<StandCardView | null> {
  if (cal.phase !== 'nominations') return null;
  if (spec.home !== null && spec.home !== c.factionId) return null;
  const sitting = (c.offices ?? []).some(
    (o) => o.cityId === spec.city.id && o.fromDay <= today && today < o.toDay,
  );
  if (sitting) return null;
  const successes = standingSuccesses(c, spec.city.id);
  const rankOk = c.rank >= COUNCIL.standRank;
  const knownOk = standingView(successes).level >= COUNCIL.knownLevel;
  const r = residenceOf(c);
  const reason: GameErrorReason | null = !rankOk
    ? 'RANK_TOO_LOW'
    : r.standsFromDay > today
      ? 'NOT_YET_CANDIDATE'
      : !knownOk
        ? 'NOT_KNOWN'
        : c.pc < COUNCIL.cost.declare
          ? 'NOT_ENOUGH_PC'
          : null;
  const faction = content.faction(branchOf(spec, c));
  const { cards } = await ballotCards(content, spec.city.id, cal.cycle, city, session);
  return {
    requirements: [
      {
        id: 'rank',
        met: rankOk,
        rankTitle: faction.rankTitles[COUNCIL.standRank - 1]!,
        fxpToGo: Math.max(0, RANK_FXP[COUNCIL.standRank - 1]! - c.fxp),
      },
      { id: 'known', met: knownOk, successes, need: 30 },
    ],
    defaultRule: faction.branchMotion,
    menu: ruleMenu(content, spec.city.id, faction.branchMotion, cards),
    cost: COUNCIL.cost.declare,
    canStand: reason === null,
    reason,
  };
}

/**
 * The hall's stand card (tech design §9.5 block 4): the residence city only, days 0–1, for a resident
 * who has no candidacy this cycle and is not sitting.
 */
export async function electionStandCard(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  city: CityDoc | null,
  now: number,
  session: Session = null,
): Promise<StandCardView | null> {
  const spec = voterPlace(content, c, cityId);
  if (!spec) return null;
  const today = dayKey(now);
  const cal = councilDay(today, spec.offset);
  if (cal.phase !== 'nominations') return null;
  const mine = await s(
    Candidacy.exists({ electionId: electionKey(spec.place.id, cal.cycle), characterId: c._id }),
    session,
  );
  if (mine) return null;
  return standCard(content, c, spec, cal, city, today, session);
}

export async function electionView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session: Session = null,
  city: CityDoc | null = null,
): Promise<ElectionView> {
  const today = dayKey(now);
  const spec = residenceSpec(content, c);
  const { offset } = spec;
  const cityContent = spec.city;
  const cal = councilDay(today, offset);
  const id = electionKey(spec.place.id, cal.cycle);
  const e = await s(Election.findById(id), session).lean<ElectionDoc>();
  if (!e) throw gameError('PRECONDITION_FAILED', 'ELECTION_NOT_READY');
  const cands = await s(Candidacy.find({ electionId: id }).sort({ filedAt: 1 }), session).lean<
    CandidacyDoc[]
  >();
  const mine = cands.find((x) => x.characterId.equals(c._id)) ?? null;
  const district = isDistrict(spec);
  const factionOfCand = (x: Pick<CandidacyDoc, 'factionId'>): FactionId => x.factionId ?? spec.home!;
  const backedNow = givenThisCycle(c, spec, cal.cycle) ?? null;
  const standingCands = cands.filter((x) => x.status === 'standing');

  // Lines: players (by filing) then locals (by profile); on days 0–1 the provisional fill (nine at
  // home; two per faction in a district).
  type NpcEntry = ElectionDoc['npcSlate'][number];
  type Line = { kind: 'player'; cand: CandidacyDoc } | { kind: 'npc'; npc: NpcEntry; factionId: FactionId };
  let lines: Line[];
  if (e.status === 'nominations') {
    const npcs: Line[] = district
      ? FACTION_IDS.flatMap((f) =>
          e.npcSlate
            .filter((n) => n.factionId === f)
            .slice(0, fillOf(spec, standingCands.filter((x) => factionOfCand(x) === f).length))
            .map((n) => ({ kind: 'npc' as const, npc: n, factionId: f })),
        )
      : e.npcSlate
          .slice(0, npcsStanding(standingCands.length))
          .map((n) => ({ kind: 'npc' as const, npc: n, factionId: spec.home! }));
    lines = [...standingCands.map((cand) => ({ kind: 'player' as const, cand })), ...npcs];
  } else {
    lines = (e.ballot ?? []).flatMap((b): Line[] => {
      if (b.kind === 'player') {
        const cand = cands.find((x) => x.characterId.equals(b.characterId!));
        return cand ? [{ kind: 'player', cand }] : [];
      }
      const npc = e.npcSlate.find((n) => n.npcId === b.npcId);
      return npc ? [{ kind: 'npc', npc, factionId: b.factionId ?? npc.factionId ?? spec.home! }] : [];
    });
  }
  const playerIds = lines.flatMap((l) => (l.kind === 'player' ? [l.cand.characterId] : []));
  const chars = await s(
    Character.find(
      { _id: { $in: playerIds } },
      { name: 1, avatarId: 1, rank: 1, factionId: 1, localStanding: 1 },
    ),
    session,
  ).lean<CharacterDoc[]>();
  const rule = (id: string) => ({ ordinanceId: id, name: ruleName(content, id) });

  const candidates: CandidateView[] = lines.map((l): CandidateView => {
    if (l.kind === 'npc') {
      const npc = content.candidate(l.npc.npcId);
      const st = standingView((l.npc.profile ?? 0) * 5);
      return {
        key: `n:${l.npc.npcId}`,
        candidacyId: null,
        kind: 'npc',
        name: npc?.name ?? l.npc.npcId,
        avatar: null,
        factionId: l.factionId,
        rankTitle: null,
        standing: {
          name: content.standingNames[st.level] ?? '',
          cityName: cityContent.name,
          successes: st.successes,
        },
        wardVote: l.npc.wardVote ?? 0,
        rule: !district && npc?.rule ? rule(npc.rule) : null,
        backers: null,
        you: false,
        backedByYou: false,
        canBack: null,
      };
    }
    const f = factionOfCand(l.cand);
    const ch = chars.find((x) => x._id.equals(l.cand.characterId));
    const successes = ch ? standingSuccesses(ch, cityContent.id) : 0;
    const named = namedStanding(content, cityContent.id, successes);
    const you = l.cand.characterId.equals(c._id);
    const backedByYou = l.cand.endorsements.some((x) => x.characterId.equals(c._id));
    let canBack: CandidateView['canBack'] = null;
    if (e.status !== 'counted') {
      if (you) canBack = { ok: false, reason: 'SELF' };
      else if (l.cand.status !== 'standing') canBack = { ok: false, reason: 'CLOSED' };
      else if (backedNow) canBack = { ok: false, reason: 'ALREADY' };
      else if (c.rank < COUNCIL.voteRank) canBack = { ok: false, reason: 'RANK' };
      else if (f !== c.factionId) canBack = { ok: false, reason: 'FACTION' };
      else if (c.pc < COUNCIL.cost.endorse) canBack = { ok: false, reason: 'PC' };
      else canBack = { ok: true };
    }
    return {
      key: `p:${l.cand.characterId.toHexString()}`,
      candidacyId: l.cand._id.toHexString(),
      kind: 'player',
      name: ch?.name ?? l.cand.name,
      avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
      factionId: f,
      rankTitle: ch ? rankTitle(content, ch, ch.rank) : null,
      standing: { name: named.name, cityName: cityContent.name, successes },
      wardVote: wardVote(successes),
      rule: rule(l.cand.rule ?? content.faction(f).branchMotion),
      backers: endorsementsOf(content, l.cand, secretaryOf(content, f)),
      you,
      backedByYou,
      canBack,
    };
  });

  const stand = mine ? null : await standCard(content, c, spec, cal, city, today, session);
  const candidacy: ElectionView['candidacy'] =
    mine && mine.status === 'standing'
      ? {
          candidacyId: mine._id.toHexString(),
          rule: rule(mine.rule ?? content.faction(factionOfCand(mine)).branchMotion),
          backers: endorsementsOf(content, mine, secretaryOf(content, factionOfCand(mine))),
          branchLine: mine.branch !== null && ordersAllDoneToday(c, today),
        }
      : null;
  return {
    electionId: id,
    cityId: cityContent.id,
    cityName: district && !oneMeter(spec) ? `${cityContent.name} · ${spec.place.name}` : cityContent.name,
    phase: cal.phase,
    nominationsCloseAt: dayStart(cal.council.setDay),
    pollsOpenAt: dayStart(e.pollsFrom),
    countAt: dayStart(e.countDay),
    candidates,
    stand,
    candidacy,
    backed: backedNow ? { candidacyId: backedNow.candidacyId.toHexString(), name: backedNow.name } : null,
    pc: c.pc,
    seats: seatsOf(spec),
    hall: hallView(content, cityContent.id, now),
  };
}

// ---------------------------------------------------------------------------------------------
// The result (council.count): the rule and the council.
// ---------------------------------------------------------------------------------------------

/** A stored count row read in the v2 shape (old rows carry `endorsements` and `votes`; tech design §8.3). */
type StoredRow = CountRow & { endorsements?: number; factionId?: FactionId };
const backersOfRow = (row: StoredRow) => row.backers ?? row.endorsements ?? 0;

/** The council rows of a count: the seated, then the unseated with how far short they were. */
async function councilRows(
  content: GameContent,
  c: CharacterDoc,
  e: Pick<ElectionDoc, 'cityId' | 'ballot' | 'kind'>,
  rows: StoredRow[],
): Promise<CouncilRowView[]> {
  const ids = rows.flatMap((row) => (row.kind === 'player' ? [row.key.slice(2)] : []));
  const chars = await Character.find(
    { _id: { $in: ids } },
    { avatarId: 1, rank: 1, factionId: 1, localStanding: 1, name: 1 },
  ).lean<CharacterDoc[]>();
  const me = `p:${c._id.toHexString()}`;
  const ordered = [...rows].sort((a, b) => a.place - b.place);
  const all = { rows: ordered };
  const capital = e.kind === 'district' || e.kind === 'battleground';
  return ordered.map((row) => {
    const line = (e.ballot ?? []).find((b) => b.key === row.key);
    if (row.kind === 'npc') {
      const npcId = row.key.slice(2);
      const npc = content.candidate(npcId);
      const st = standingView((npc?.profile ?? 0) * 5);
      const ruleId = capital ? null : (npc?.rule ?? null);
      return {
        key: row.key,
        kind: 'npc' as const,
        name: row.name,
        avatar: null,
        rankTitle: null,
        standingName: content.standingNames[st.level] ?? '',
        ...(row.factionId ? { factionId: row.factionId } : {}),
        place: row.place,
        seated: row.seated,
        wardVote: row.wardVote,
        backers: backersOfRow(row),
        total: row.total,
        short: row.seated ? null : marginToSeat(row, all),
        you: false,
        rule: ruleId ? { ordinanceId: ruleId, name: ruleName(content, ruleId) } : null,
      };
    }
    const ch = chars.find((x) => x._id.toHexString() === row.key.slice(2));
    const ruleId = line?.rule ?? null;
    return {
      key: row.key,
      kind: 'player' as const,
      name: ch?.name ?? row.name,
      avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
      rankTitle: ch ? rankTitle(content, ch, ch.rank) : null,
      standingName: ch ? namedStanding(content, e.cityId, standingSuccesses(ch, e.cityId)).name : '',
      ...(row.factionId ? { factionId: row.factionId } : {}),
      place: row.place,
      seated: row.seated,
      wardVote: row.wardVote,
      backers: backersOfRow(row),
      total: row.total,
      short: row.seated ? null : marginToSeat(row, all),
      you: row.key === me,
      rule: ruleId ? { ordinanceId: ruleId, name: ruleName(content, ruleId) } : null,
    };
  });
}

/** The caller's own vote on a counted election (their card marked on the result; ADR 0019). */
async function myRuleVote(c: CharacterDoc, electionIds: string[]): Promise<string | null> {
  const v = await Vote.findOne({ electionId: { $in: electionIds }, voterId: c._id }, { ordinanceId: 1 }).lean<VoteDoc>();
  return v?.ordinanceId ?? null;
}

export async function countView(
  content: GameContent,
  c: CharacterDoc,
  e: Pick<ElectionDoc, '_id' | 'cityId' | 'countDay' | 'result' | 'kind' | 'cycle' | 'ballot'>,
  now: number,
): Promise<CountView> {
  const r = e.result!;
  const b = await RuleBallot.findById(councilKey(e.cityId, e.cycle)).lean<RuleBallotDoc>();
  const myVote = await myRuleVote(c, [e._id]);
  return {
    electionId: e._id,
    cityId: e.cityId,
    cityName: content.city(e.cityId)?.name ?? e.cityId,
    countDay: e.countDay,
    weekday: weekdayName(e.countDay),
    rule: b ? ruleResultView(content, b, { characterId: c._id.toHexString(), myVote }) : null,
    council: await councilRows(content, c, e, r.rows as StoredRow[]),
    turnout: r.turnout,
    seats: e.kind === 'district' ? CAPITAL_COUNCIL.perDistrict : COUNCIL.seats,
    npcSeats: r.npcSeats,
    hall: hallView(content, e.cityId, now),
  };
}

/** What a district election's result stores besides the seats' fields (capitalDay.ts). */
interface DistrictResultDoc {
  scoreboard?: ScoreboardTableView[];
  seatsByFaction?: Record<FactionId, number>;
  /** The voting rework: the district's votes by card. */
  cardVotes?: Record<string, number>;
}

/**
 * Tech design §10.5; the voting rework (tech design §8.3): the capital's count, five districts, built
 * from the five counted elections of a cycle and ballot k − 1: the cards with their seats, per
 * district three party rows and the council rows; the player's own vote marked, nobody else's.
 */
export async function capitalCountView(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  cycle: number,
  now: number,
): Promise<CapitalCountView | null> {
  const ds = content.districtsOf(cityId);
  const ids = ds.map((d) => electionKey(d.id, cycle));
  const es = await Election.find({ _id: { $in: ids }, status: 'counted' }).lean<ElectionDoc[]>();
  if (es.length < ds.length) return null;
  const b = await RuleBallot.findById(councilKey(cityId, cycle)).lean<RuleBallotDoc>();
  const cards = b?.cards ?? [];
  const myVote = await myRuleVote(c, ids);
  const mineFirst = residenceOf(c).districtId;
  const seatsByFaction: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  let npcSeats = 0;
  const districts = [];
  for (const d of ds) {
    const e = es.find((x) => x._id === electionKey(d.id, cycle))!;
    const r = e.result!;
    const extra = r as unknown as DistrictResultDoc;
    const rows = r.rows as StoredRow[];
    const seats = rows
      .filter((x) => x.seated && x.factionId)
      .sort((a, b2) => a.place - b2.place)
      .map((x) => ({ factionId: x.factionId!, name: x.name }));
    for (const seat of seats) seatsByFaction[seat.factionId] += 1;
    npcSeats += r.npcSeats;
    const council = await councilRows(content, c, e, rows);
    districts.push({
      districtId: d.id,
      name: d.name,
      parties: FACTION_IDS.map((f) => {
        const card = cards.find((x) => x.factionIds.includes(f));
        return {
          factionId: f,
          votes: card ? (extra.cardVotes?.[card.ordinanceId] ?? 0) : 0,
          shared: (card?.factionIds.length ?? 0) > 1,
          seats: seats.filter((x) => x.factionId === f).length,
        };
      }),
      council: [...council.filter((x) => x.seated), ...council.filter((x) => !x.seated)],
      seats,
      turnout: r.turnout,
      scoreboard: (extra.scoreboard ?? []).map((sb) => ({
        ...sb,
        rows: sb.rows.map((x) => ({ ...x, you: x.characterId === c._id.toHexString() })),
      })),
    });
  }
  // The player's own district first.
  districts.sort((a, b2) => Number(b2.districtId === mineFirst) - Number(a.districtId === mineFirst));
  return {
    kind: 'capital',
    hall: hallView(content, cityId, now),
    councilKey: councilKey(cityId, cycle + 1),
    cycle,
    countDay: es[0]!.countDay,
    weekday: weekdayName(es[0]!.countDay),
    rule: b ? ruleResultView(content, b, { characterId: c._id.toHexString(), myVote }) : null,
    seatsByFaction,
    npcSeats,
    districts,
  };
}

/**
 * council.count: the residence's latest counted election by default (in the capital, the district's
 * own); null while the asked-for election is open.
 */
export async function getCount(
  content: GameContent,
  c: CharacterDoc,
  electionId: string | undefined,
  now: number,
): Promise<CountView | null> {
  const spec = residenceSpec(content, c);
  const place = spec.place.id;
  if (electionId !== undefined) {
    const placeId = electionId.slice(0, electionId.lastIndexOf(':'));
    if (placeId !== place)
      throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: place, requested: placeId });
    const e = await Election.findById(electionId).lean<ElectionDoc>();
    if (!e) throw gameError('NOT_FOUND', 'UNKNOWN_ELECTION', { electionId });
    return e.status === 'counted' && e.result ? countView(content, c, e, now) : null;
  }
  const filter = isDistrict(spec)
    ? { placeId: place, status: 'counted' as const }
    : { cityId: place, status: 'counted' as const };
  const e = await Election.findOne(filter).sort({ cycle: -1 }).lean<ElectionDoc>();
  return e?.result ? countView(content, c, e, now) : null;
}

/**
 * council.capitalCount (tech design §8.1, §10.5): the capital's five districts of a cycle, addressed by
 * its key ('irongate:4146'), by default the latest counted; for a capital resident.
 */
export async function getCapitalCount(
  content: GameContent,
  c: CharacterDoc,
  cycleKey: string | undefined,
  now: number,
): Promise<CapitalCountView | null> {
  const capital = content.nation.capitalId;
  if (cycleKey !== undefined) {
    const cityId = cycleKey.slice(0, cycleKey.lastIndexOf(':'));
    if (cityId !== capital)
      throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: capital, requested: cityId });
    return capitalCountView(content, c, capital, cycleOfKey(cycleKey), now);
  }
  const latest = await Election.findOne({ cityId: capital, kind: 'district', status: 'counted' })
    .sort({ cycle: -1 })
    .lean<ElectionDoc>();
  return latest ? capitalCountView(content, c, capital, latest.cycle, now) : null;
}

// ---------------------------------------------------------------------------------------------
// The paper: the front page and the live political headlines (ADR 0023).
// ---------------------------------------------------------------------------------------------

/** The term the front page celebrates: held today, and first seen today or not yet. */
export async function frontPageTerm(c: CharacterDoc, today: DayKey): Promise<OfficeTermDoc | null> {
  const t = await OfficeTerm.findOne({
    'holder.kind': 'player',
    'holder.characterId': c._id,
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
  }).lean<OfficeTermDoc>();
  if (!t) return null;
  if (t.frontPageSeenAt && Math.floor(t.frontPageSeenAt.getTime() / 86_400_000) < today) return null;
  return t;
}

const ordinal = (place: number) => ORDINALS[place - 1] ?? String(place);
const turnoutText = (t: { voters: number; eligible: number }) => turnoutOf(t.voters, t.eligible);

export async function frontPageView(
  content: GameContent,
  c: CharacterDoc,
  term: OfficeTermDoc,
  now: number,
  city: CityDoc | null = null,
): Promise<FrontPageView | null> {
  const e = await Election.findById(term.electionId).lean<ElectionDoc>();
  if (!e?.result) return null;
  const me = `p:${c._id.toHexString()}`;
  const row = e.result.rows.find((r) => r.key === me);
  const top = row?.place === 1;
  const templates = content.politicalHeadlinesOf(term.cityId);
  const t = templates.find((h) => h.when.some((w) => w.kind === 'seatWon' && w.top === top));
  const vars: Partial<Record<PoliticalPlaceholder | 'district' | 'faction' | 'seatsFaction', string>> = {
    name: c.name,
    ordinal: ordinal(row?.place ?? term.place),
    votes: String(row?.total ?? term.total),
    ...(term.districtId
      ? {
          district: content.district(term.districtId)?.quarter.name ?? term.districtId,
          faction: content.faction(c.factionId).shortName,
        }
      : {}),
  };
  if (term.districtId) {
    const seats = await OfficeTerm.countDocuments({
      councilKey: term.councilKey,
      factionId: c.factionId,
      vacatedDay: null,
    });
    vars.seatsFaction = String(seats);
  }
  const fill = (x: string) => {
    const out = x.replace(
      /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
      (whole, k: string) => vars[k as keyof typeof vars] ?? whole,
    );
    return out.charAt(0).toUpperCase() + out.slice(1);
  };
  return {
    avatar: c.avatarId ? assetView(content, c.avatarId) : null,
    caption: {
      name: c.name,
      rankTitle: rankTitle(content, c, c.rank),
      cityName: content.city(term.cityId)?.name ?? term.cityId,
    },
    animate: term.frontPageSeenAt === null,
    headline: t ? fill(t.headline) : c.name,
    deck: t?.deck ? fill(t.deck) : '',
    count: await countView(content, c, e, now),
    // Review 4 (answers §10.1): *What now* rides on the front page (shown once by `frontPageSeenAt`).
    whatNow: await whatNowOf(content, term, city),
  };
}

/**
 * Review 4 (answers §10.1, ADR 0077); the voting rework (design §4.6): the *What now* card's fields
 * for a player's term: the councillor's rule and whether it is a card, the change window (until the
 * set), the vote and the result; in the capital, whether their rule is their party's card.
 */
export async function whatNowOf(
  content: GameContent,
  term: Pick<OfficeTermDoc, '_id' | 'cityId' | 'fromDay' | 'rule' | 'holder' | 'factionId' | 'districtId' | 'councilKey'>,
  city: CityDoc | null,
  session: Session = null,
): Promise<WhatNowView> {
  const capital = isContested(content, term.cityId);
  const offset = content.city(term.cityId)?.council?.offset ?? 0;
  const cal = councilDay(term.fromDay, offset);
  const hall = content.hallOf(term.cityId)?.location;
  const home = content.city(term.cityId)?.homeFactionId ?? null;
  const ruleId = termRule(content, term, home) ?? '';
  const { cards } = await ballotCards(content, term.cityId, cycleOfKey(term.councilKey), city, session);
  let capitalLine: WhatNowView['capital'] = null;
  if (capital && term.factionId) {
    const card = cards.find((x) => x.factionIds.includes(term.factionId!));
    const by = card?.by.find((b) => b.kind === 'party' && b.factionId === term.factionId);
    const me = term.holder.kind === 'player' ? term.holder.characterId.toHexString() : null;
    capitalLine = {
      leadsBloc: !!by && by.characterId === me,
      by: by?.name ?? '',
      factionId: term.factionId,
      rule: card ? ruleName(content, card.ordinanceId) : '',
    };
  }
  return {
    termId: term._id.toHexString(),
    cityId: term.cityId,
    hall: { locationId: hall?.id ?? '', name: hall?.name ?? '' },
    rule: { name: ruleName(content, ruleId), onBallot: cards.some((x) => x.ordinanceId === ruleId) },
    capital: capitalLine,
    changeUntil: dayStart(cal.council.setDay),
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    countAt: dayStart(cal.election.countDay),
  };
}

/**
 * The fix round (design §8.12): the capital's winner is level on seats with another card (settled on
 * votes or opinion when `how` is `seats`).
 */
export const seatTie = (tallies: ReadonlyArray<{ ordinanceId: string; seats?: number | null }>, winner: string): boolean => {
  const w = tallies.find((t) => t.ordinanceId === winner)?.seats;
  return w != null && tallies.some((t) => t.ordinanceId !== winner && t.seats === w);
};

/** "the Vanguard" · "the Collective and the Alliance": a card's party or parties (design §8.4 `{parties}`). */
const partiesOf = (content: GameContent, factionIds: readonly FactionId[]): string =>
  factionIds.map((f) => `the ${content.faction(f).shortName}`).join(' and ');

/**
 * The voting rework, phase 5 (tech design §10; design §8.4, §8.9.2): what the paper knows of a city's
 * rule ballots this morning, with the templates' values. `ruleDecided` is ballot k − 1 counted today;
 * `votedRule` the caller's own vote on it (`myVote`, by election; none for a visitor); `ruleOnBallot`
 * the set morning, the caller's card among the set cards (in the capital, the first party's carrier
 * of a shared card, design §8.4); `voteOpen` cycle day 2 (§8.1 Q12).
 */
export async function ruleHeadlineFacts(
  content: GameContent,
  cityId: string,
  today: DayKey,
  me: { c: CharacterDoc; electionId: string } | null,
): Promise<{ rule: NonNullable<PoliticalFacts['rule']>; varsByKind: NonNullable<PoliticalFacts['varsByKind']>; ruleEnds?: number }> {
  const cal = councilDay(today, content.city(cityId)?.council?.offset ?? 0);
  const varsByKind: NonNullable<PoliticalFacts['varsByKind']> = {};
  const rule: NonNullable<PoliticalFacts['rule']> = {
    decided: null,
    voted: null,
    onBallot: false,
    voteOpen: cal.cycleDay === 2,
  };
  let ruleEnds: number | undefined;
  const plain = (id: string) => content.ordinance(id)?.plainLine ?? '';
  if (cal.cycleDay === 0) {
    const b = await RuleBallot.findById(councilKey(cityId, cal.cycle - 1)).lean<RuleBallotDoc>();
    const r = b?.status === 'counted' && b.countDay === today ? b.result : null;
    if (b && r) {
      const cards = b.cards ?? [];
      const tallyOf = (id: string) => r.tallies.find((t) => t.ordinanceId === id);
      const won = tallyOf(r.winner);
      const of = r.turnout?.voters ?? r.tallies.reduce((n, t) => n + t.votes, 0);
      const winnerCard = cards.find((x) => x.ordinanceId === r.winner);
      // The fix round (design §8.12): a tie is level on votes at home (`how: 'tie'`), or level on
      // seats in the capital and settled on votes or opinion (not the draw); Unrest's fallback is
      // card 1 being a councillor's (the party's card was off the ballot).
      const tie = r.how === 'tie' || (r.how === 'seats' && seatTie(r.tallies, r.winner));
      const by = winnerCard?.by[0];
      const unrest = r.how === 'fallback' && by?.kind === 'councillor';
      rule.decided = { fallback: r.how === 'fallback', drawn: r.how === 'draw', tie, unrest };
      ruleEnds = dayStart(r.inForce.toDay);
      varsByKind.ruleDecided = {
        ...(unrest && by?.kind === 'councillor' ? { name: by.name } : {}),
        rule: ruleName(content, r.winner),
        votes: String(won?.votes ?? 0),
        of: String(of),
        line: plain(r.winner),
        seats: String(won?.seats ?? 0),
        parties: partiesOf(content, winnerCard?.factionIds ?? []),
      };
      const mine = me ? await myRuleVote(me.c, [me.electionId]) : null;
      if (mine) {
        const t = tallyOf(mine);
        rule.voted = { won: mine === r.winner, tie };
        varsByKind.votedRule = {
          rule: ruleName(content, mine),
          votes: String(t?.votes ?? 0),
          seats: String(t?.seats ?? 0),
          of: String(of),
          winner: ruleName(content, r.winner),
          winnerVotes: String(won?.votes ?? 0),
          winnerSeats: String(won?.seats ?? 0),
        };
      }
    }
  }
  if (cal.cycleDay === 2 && me) {
    const meId = me.c._id.toHexString();
    const b = await RuleBallot.findById(councilKey(cityId, cal.cycle)).lean<RuleBallotDoc>();
    const capital = isContested(content, cityId);
    const card =
      b?.status === 'set' && b.setDay === today
        ? (b.cards ?? []).find((x) =>
            capital
              ? x.by[0]?.kind === 'party' && x.by[0].via === 'councillor' && x.by[0].characterId === meId
              : x.by[0]?.kind === 'councillor' && x.by[0].characterId === meId,
          )
        : undefined;
    if (card) {
      rule.onBallot = true;
      varsByKind.ruleOnBallot = {
        rule: ruleName(content, card.ordinanceId),
        line: plain(card.ordinanceId),
        parties: partiesOf(content, card.factionIds.slice(0, 1)),
      };
    }
  }
  return { rule, varsByKind, ...(ruleEnds !== undefined ? { ruleEnds } : {}) };
}

/**
 * The live political headlines of the caller's residence this morning (the home city's; in the
 * capital, the district's election and the capital's council, from the Herald's templates). The
 * voting rework, phase 5: the rule ballot's facts (`ruleHeadlineFacts`); the person ballot's and the
 * division's are gone with their templates.
 */
export async function politicalHeadlines(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  today: DayKey,
  extra?: {
    capital?: PoliticalFacts['capital'];
    vars?: PoliticalFacts['vars'];
    varsByKind?: PoliticalFacts['varsByKind'];
    templatesOf?: string;
  },
): Promise<LiveHeadline[]> {
  const spec = specOf(content, c);
  if (!spec || (spec.home !== null && spec.home !== c.factionId)) return [];
  const offset = spec.offset;
  const cal = councilDay(today, offset);
  const curId = electionKey(spec.place.id, cal.cycle);
  const prevId = electionKey(spec.place.id, cal.cycle - 1);
  const countToday = cal.cycleDay === 0;
  const prev = countToday ? await Election.findById(prevId).lean<ElectionDoc>() : null;
  const counted = prev?.status === 'counted' && prev.result ? prev.result : null;
  const cur = await Candidacy.findOne({ electionId: curId, characterId: c._id }).lean<CandidacyDoc>();
  const me = `p:${c._id.toHexString()}`;
  const vars: PoliticalFacts['vars'] = {
    name: c.name,
    city: spec.city.name,
    weekday: weekdayName(nextNominationsAfter(today, offset)),
    rank3: content.faction(c.factionId).rankTitles[COUNCIL.standRank - 1]!,
    ...(isDistrict(spec)
      ? { district: spec.place.name, faction: content.faction(c.factionId).shortName }
      : {}),
    ...extra?.vars,
  };
  const byKind: NonNullable<PoliticalFacts['varsByKind']> = { ...extra?.varsByKind };
  let seat: PoliticalFacts['seat'] = null;
  if (counted) {
    const rows = counted.rows as Array<CountRow & { factionId?: FactionId }>;
    const last = rows.find((r) => r.key === counted.lastSeatKey);
    const top = rows.find((r) => r.key === counted.topKey) ?? rows[0];
    vars.winner = surname(top?.name ?? '');
    vars.npcSeats = String(counted.npcSeats);
    vars.turnout = turnoutText(counted.turnout);
    const mine = rows.find((r) => r.key === me);
    if (mine) {
      const margin = marginToSeat(mine, { rows });
      const bloc = isDistrict(spec) && !rows.some((r) => r.seated && r.factionId === c.factionId);
      seat = { won: mine.seated, top: mine.place === 1, tie: !mine.seated && margin === 0, bloc };
      const v = {
        ordinal: ordinal(mine.place),
        votes: String(mine.total),
        margin: String(margin),
        last: last?.name ?? '',
      };
      byKind.seatWon = v;
      byKind.seatLost = v;
    }
  }
  if (cur?.status === 'standing') {
    // Design §8.9.2 #2: the candidacy's rule by name; `{weekday}` the count morning's.
    byKind.filedYesterday = {
      rule: ruleName(content, cur.rule ?? content.faction(branchOf(spec, c)).branchMotion),
      weekday: weekdayName(cal.election.countDay),
    };
  }
  const termEnded = countToday
    ? (await OfficeTerm.exists({
        'holder.kind': 'player',
        'holder.characterId': c._id,
        toDay: today,
        vacatedDay: null,
      })) !== null
    : false;
  // News only when a count put a rule in force this morning, not a bootstrap's.
  const ruleFromToday = city?.ordinance?.fromDay === today && city.world?.bootstrappedDay !== today;
  const rf = await ruleHeadlineFacts(content, spec.city.id, today, { c, electionId: prevId });
  Object.assign(byKind, rf.varsByKind);
  const facts: PoliticalFacts = {
    seat,
    filedYesterday: cur?.status === 'standing' && cur.filedDay === today - 1,
    termEnded,
    countToday: counted !== null,
    phase: cal.phase,
    cycleDay: cal.cycleDay,
    ruleFromToday,
    rule: rf.rule,
    leftUnrest: city?.morale?.previous === 'unrest' && city.morale.since === today,
    ...(extra?.capital ? { capital: extra.capital } : {}),
    vars,
    varsByKind: byKind,
    until: {
      nominations: dayStart(cal.council.setDay),
      polls: dayStart(cal.election.countDay),
      ...(rf.ruleEnds !== undefined ? { ruleEnds: rf.ruleEnds } : {}),
    },
  };
  return selectPoliticalHeadlines(content.politicalHeadlinesOf(extra?.templatesOf ?? spec.city.id), facts);
}
