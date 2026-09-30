import type { GameContent } from '@irongate/content';
import { turnoutOf } from '@irongate/content';
import { Candidacy, Character, Election, OfficeTerm, OrderPaper, PaperEntry, Vote } from '@irongate/db';
import type {
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  ElectionDoc,
  OfficeTermDoc,
  OrderPaperDoc,
  VoteDoc,
} from '@irongate/db';
import {
  AGAINST_ALL,
  COUNCIL,
  ORDINALS,
  WEEKDAY_NAMES,
  councilDay,
  councilKey,
  dayStart,
  effectiveEndorsements,
  electionKey,
  isSmallBranch,
  marginToSeat,
  nextNominationsAfter,
  nextPollsFrom,
  npcsStanding,
  standingView,
  wardVote,
  weekday,
} from '@irongate/rules';
import { RANK_FXP } from '@irongate/rules';
import type {
  CandidateView,
  CouncilView,
  CountRow,
  CountView,
  DayKey,
  ElectionView,
  EndorsementsView,
  FrontPageView,
  GameErrorReason,
  LiveHeadline,
  PoliticalFacts,
  PoliticalPlaceholder,
  PoliticsState,
  PoliticsSummaryView,
  ElectionCardState,
  ElectionCardView,
  ElectionYourLine,
} from '@irongate/rules';
import { selectPoliticalHeadlines } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { gameError } from '../gameError';
import { activeMembersFilter } from './cityDay';
import { ordinanceIdOn } from './modifiers';
import { assetView, namedStanding, rankTitle, standingSuccesses } from './views';

/**
 * The political views (ADR 0023): the Polling Day row and the HQ council card (one summary), the
 * slate and the ballot, the count, the chamber, the front page and the live political headlines.
 * Built at read from the domain collections; no view carries another voter's choice, the ballot
 * count or any total before the count (ADR 0019).
 */

type Session = ClientSession | null;
const s = <T extends { session: (x: ClientSession | null) => T }>(q: T, session: Session): T =>
  session ? q.session(session) : q;

export const weekdayName = (day: DayKey): string => WEEKDAY_NAMES[weekday(day)];
/** "Weiss": the name the count's headline and the Polling Day row use. */
export const surname = (name: string): string => name.trim().split(/\s+/).at(-1) ?? name;

export function homeSpec(content: GameContent, c: Pick<CharacterDoc, 'homeCityId'>) {
  const city = content.city(c.homeCityId);
  if (!city?.council || !city.homeFactionId) throw gameError('PRECONDITION_FAILED', 'ELECTION_NOT_READY');
  const faction = content.faction(city.homeFactionId);
  return { city, offset: city.council.offset, home: city.homeFactionId, faction };
}

const ordersAllDoneToday = (c: CharacterDoc, today: DayKey) =>
  c.orders.day === today && c.orders.allDoneAt !== null;

/** Other eligible endorsers today (the small-branch rule, live; the close re-counts it). */
async function otherEndorsers(
  cityId: string,
  home: CharacterDoc['factionId'],
  today: DayKey,
  me: CharacterDoc['_id'],
  session: Session = null,
): Promise<number> {
  return s(
    Character.countDocuments({ ...activeMembersFilter(cityId, home, today), _id: { $ne: me } }),
    session,
  );
}

/** The endorsements line of a filed or standing candidacy. */
export function endorsementsOf(
  content: GameContent,
  cand: Pick<CandidacyDoc, 'endorsements' | 'branch' | 'effective' | 'smallBranch' | 'status'>,
  small: boolean,
  secretaryName: string,
): EndorsementsView {
  const closed = cand.status !== 'filed' && cand.effective !== null;
  const smallBranch = closed ? (cand.smallBranch ?? small) : small;
  const n = closed
    ? cand.effective!
    : effectiveEndorsements({ members: cand.endorsements.length, branch: cand.branch !== null, smallBranch });
  const names = [
    ...(cand.branch ? [`${secretaryName} (the branch)`] : []),
    ...cand.endorsements.map((e) => e.name),
  ];
  return {
    n,
    needed: COUNCIL.endorsementsNeeded,
    branch: cand.branch !== null,
    branchCounts: smallBranch ? 2 : 1,
    names: names.slice(0, 5),
    more: Math.max(0, names.length - 5),
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
): Promise<PoliticsSummaryView | null> {
  const spec = content.city(c.homeCityId);
  if (!spec?.council || !spec.homeFactionId || spec.homeFactionId !== c.factionId) return null;
  const { offset, home, faction } = homeSpec(content, c);
  const cal = councilDay(today, offset);
  const e = await Election.findById(electionKey(spec.id, cal.cycle)).lean<ElectionDoc>();
  const cand = await Candidacy.findOne({
    electionId: electionKey(spec.id, cal.cycle),
    characterId: c._id,
  }).lean<CandidacyDoc>();
  const vote =
    cal.phase === 'polling'
      ? await Vote.findOne({ electionId: electionKey(spec.id, cal.cycle), voterId: c._id }).lean<VoteDoc>()
      : null;
  const term = (c.offices ?? []).find((o) => o.councilKey === councilKey(spec.id, cal.cycle));
  const paper =
    term && cal.council.voting
      ? await OrderPaper.findById(councilKey(spec.id, cal.cycle), {
          votes: 1,
          status: 1,
          items: 1,
        }).lean<OrderPaperDoc>()
      : null;
  const councillorOpen =
    !!term &&
    cal.council.voting &&
    paper?.status === 'open' &&
    !paper.votes.some((v) => v.characterId.equals(c._id));
  // The last count: the Polling Day state on the count morning; the Election card on days 0–1.
  const lastCount =
    cal.cycleDay <= 1
      ? await Election.findById(electionKey(spec.id, cal.cycle - 1), {
          result: 1,
          status: 1,
        }).lean<ElectionDoc>()
      : null;
  const prev = cal.cycleDay === 0 ? lastCount : null;
  const successes = standingSuccesses(c, spec.id);
  const sitting = (c.offices ?? []).some(
    (o) => o.cityId === spec.id && o.fromDay <= today && today < o.toDay,
  );
  const canStand =
    cal.phase === 'nominations' &&
    c.rank >= COUNCIL.standRank &&
    standingView(successes).level >= COUNCIL.knownLevel &&
    !sitting &&
    !cand;

  let state: PoliticsState;
  if (c.rank < COUNCIL.voteRank) state = 'belowRank';
  else if (cal.phase === 'polling' && !vote) state = 'ballot';
  else if (councillorOpen) state = 'councilSits';
  else if (cand?.status === 'filed') state = 'filed';
  else if (canStand) state = 'stand';
  else if (prev?.status === 'counted' && prev.result) state = 'count';
  else if (cal.phase === 'polling') state = 'voted';
  else state = 'nominations';

  const secretary = content.npc(faction.secretary.npcId)?.name ?? '';
  let endorsements: PoliticsSummaryView['endorsements'] = null;
  if (cand?.status === 'filed') {
    const small = isSmallBranch(await otherEndorsers(spec.id, home, today, c._id));
    const e2 = endorsementsOf(content, cand, small, secretary);
    endorsements = { n: e2.n, needed: e2.needed, branchWillMakeUp: small };
  }
  const votedFor = vote ? (e?.ballot?.find((b) => b.key === vote.candidateKey)?.name ?? null) : null;
  const top = prev?.result?.rows[0];
  const ordId = ordinanceIdOn(city, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  const route: PoliticsSummaryView['route'] =
    state === 'belowRank'
      ? null
      : state === 'ballot' || state === 'voted'
        ? '/council/ballot'
        : state === 'councilSits'
          ? '/council'
          : state === 'count'
            ? '/council/count'
            : '/council/slate';
  return {
    cityId: spec.id,
    cityName: spec.name,
    cycleDay: cal.cycleDay,
    phase: cal.phase,
    state,
    closesAt: dayStart(cal.phase === 'nominations' ? cal.election.pollsFrom : cal.election.countDay),
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    pollsFromWeekday: weekdayName(nextPollsFrom(today, offset)),
    countAt: dayStart(cal.election.countDay),
    divideAt: cal.council.voting ? dayStart(cal.council.divideDay) : null,
    endorsements,
    branchLine: cand?.status === 'filed' && cand.branch !== null && ordersAllDoneToday(c, today),
    votedFor,
    count:
      prev?.result && top
        ? {
            winner: surname(top.name),
            npcSeats: prev.result.npcSeats,
            seats: COUNCIL.seats,
            turnout: prev.result.turnout,
          }
        : null,
    inForce:
      ord && city?.ordinance && city.ordinance.id === ord.id
        ? { ordinanceId: ord.id, name: ord.name, daysLeft: city.ordinance.toDay - today }
        : null,
    rank2Title: faction.rankTitles[1]!,
    rank3Title: faction.rankTitles[COUNCIL.standRank - 1]!,
    paperShortName: spec.paper?.shortName ?? 'paper',
    fxpToRank2: c.rank < COUNCIL.voteRank ? Math.max(0, RANK_FXP[1]! - c.fxp) : null,
    standCost: COUNCIL.cost.declare,
    councillor: councillorOpen,
    route,
    dot: state === 'ballot' || state === 'councilSits',
    card: await electionCard(content, c, {
      cal,
      spec: { id: spec.id },
      cand,
      vote: vote ? { key: vote.candidateKey, name: votedFor ?? '' } : null,
      e,
      term: !!term,
      paper,
      lastCount,
      canStand,
      endorsements,
      branchLine: cand?.status === 'filed' && cand.branch !== null && ordersAllDoneToday(c, today),
      today,
    }),
  };
}

/**
 * Review 2 (slice-3 screens §1a, §2.1): the Election card, one view for the city screen, the paper's
 * row and the HQ sheet. The server picks the state; the client words it.
 */
async function electionCard(
  content: GameContent,
  c: CharacterDoc,
  i: {
    cal: ReturnType<typeof councilDay>;
    spec: { id: string };
    cand: CandidacyDoc | null;
    vote: { key: string; name: string } | null;
    e: ElectionDoc | null;
    term: boolean;
    paper: OrderPaperDoc | null;
    lastCount: ElectionDoc | null;
    canStand: boolean;
    endorsements: PoliticsSummaryView['endorsements'];
    branchLine: boolean;
    today: DayKey;
  },
): Promise<ElectionCardView> {
  const { cal, cand, vote, lastCount, today } = i;
  const counted = lastCount?.status === 'counted' && lastCount.result ? lastCount.result : null;
  const backingOf = (c.endorsementsGiven ?? []).find(
    (g) => g.electionId === electionKey(i.spec.id, cal.cycle),
  );
  const myRuleVote = i.paper?.votes.find((v) => v.characterId.equals(c._id)) ?? null;
  const ruleOpen = i.term && cal.council.voting && i.paper !== null;
  let yourLine: ElectionYourLine | null = null;
  if (counted) {
    const rows = counted.rows as CountRow[];
    const mine = rows.find((r) => r.key === `p:${c._id.toHexString()}`);
    if (mine) {
      yourLine = mine.seated
        ? { kind: 'elected', place: mine.place }
        : { kind: 'missed', margin: marginToSeat(mine, { rows }) };
    } else {
      const v = await Vote.findOne({
        electionId: electionKey(i.spec.id, cal.cycle - 1),
        voterId: c._id,
      }).lean<VoteDoc>();
      const theirs = v ? rows.find((r) => r.key === v.candidateKey) : undefined;
      if (theirs)
        yourLine = theirs.seated
          ? { kind: 'voteWon', name: theirs.name }
          : { kind: 'voteLost', name: theirs.name };
    }
  }
  let state: ElectionCardState;
  if (c.rank < COUNCIL.voteRank) state = 'belowRank';
  else if (ruleOpen && i.paper!.status === 'open') state = myRuleVote ? 'councilVoted' : 'councilSits';
  else if (cal.phase === 'polling')
    state = vote ? 'voted' : cand?.status === 'standing' ? 'candidateVoting' : 'voting';
  else if (cand?.status === 'filed') state = 'standing';
  else if (backingOf) state = 'backing';
  else if (counted) state = 'result';
  else state = 'candidates';
  const closesAt =
    state === 'councilSits' || state === 'councilVoted'
      ? dayStart(cal.council.divideDay)
      : dayStart(cal.phase === 'nominations' ? cal.election.pollsFrom : cal.election.countDay);
  // The morning the rank-up to 2 is in the paper (the hl.*rank-up-2 headline): the note, once.
  const firstTime =
    c.rank >= COUNCIL.voteRank &&
    (await PaperEntry.exists({
      characterId: c._id,
      day: today,
      'headlines.templateId': { $regex: /rank-up-2$/ },
    })) !== null;
  const ruleName = (choice: string) =>
    choice === 'against' ? null : (content.ordinance(choice)?.name ?? choice);
  return {
    state,
    closesAt,
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    countAt: dayStart(cal.election.countDay),
    fxp: c.fxp,
    rank2Fxp: RANK_FXP[COUNCIL.voteRank - 1]!,
    canStand: i.canStand,
    backers:
      cand?.status === 'filed' && i.endorsements
        ? {
            n: i.endorsements.n,
            needed: i.endorsements.needed,
            branchLine: i.branchLine,
            branchWillMakeUp: i.endorsements.branchWillMakeUp,
          }
        : null,
    backing: backingOf?.name ?? null,
    votedFor: vote?.name ?? null,
    result: counted
      ? {
          winner: (counted.rows as CountRow[])[0]?.name ?? '',
          yourLine,
          councilUntil: dayStart(cal.council.toDay),
          namesUntil: dayStart(cal.election.pollsFrom),
        }
      : null,
    rule: ruleOpen
      ? {
          votedFor: myRuleVote ? ruleName(myRuleVote.choice) : null,
          divideAt: dayStart(cal.council.divideDay),
        }
      : null,
    firstTime,
  };
}

/** The Paper tab's politics dot (tech design §11): a ballot or a council vote waiting. */
export async function politicsWaiting(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  now: number,
  today: DayKey,
): Promise<0 | 1> {
  const spec = content.city(c.homeCityId);
  if (!spec?.council || c.rank < COUNCIL.voteRank) return 0;
  const cal = councilDay(today, spec.council.offset);
  const term = (c.offices ?? []).some((o) => o.councilKey === councilKey(spec.id, cal.cycle));
  if (cal.phase !== 'polling' && !(term && cal.council.voting)) return 0;
  const summary = await politicsSummary(content, c, city, now, today);
  return summary?.dot ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------
// The slate and the ballot (council.election).
// ---------------------------------------------------------------------------------------------

export async function electionView(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  session: Session = null,
): Promise<ElectionView> {
  const { city, offset, home, faction } = homeSpec(content, c);
  const cal = councilDay(today, offset);
  const id = electionKey(city.id, cal.cycle);
  const e = await s(Election.findById(id), session).lean<ElectionDoc>();
  if (!e) throw gameError('PRECONDITION_FAILED', 'ELECTION_NOT_READY');
  const cands = await s(Candidacy.find({ electionId: id }).sort({ filedAt: 1 }), session).lean<
    CandidacyDoc[]
  >();
  const mine = cands.find((x) => x.characterId.equals(c._id)) ?? null;
  const vote =
    e.status === 'polling'
      ? await s(Vote.findOne({ electionId: id, voterId: c._id }), session).lean<VoteDoc>()
      : null;
  const secretary = content.npc(faction.secretary.npcId)?.name ?? '';
  const small = isSmallBranch(await otherEndorsers(city.id, home, today, c._id, session));
  const endorsedNow = (c.endorsementsGiven ?? []).find((g) => g.electionId === id) ?? null;

  // Lines: players (by filing) then NPCs (by profile); in nominations the provisional 9 − p.
  type Line = { kind: 'player'; cand: CandidacyDoc } | { kind: 'npc'; npcId: string };
  let lines: Line[];
  if (e.status === 'nominations') {
    const filed = cands.filter((x) => x.status === 'filed');
    lines = [
      ...filed.map((cand) => ({ kind: 'player' as const, cand })),
      ...e.npcSlate
        .slice(0, npcsStanding(filed.length))
        .map((n) => ({ kind: 'npc' as const, npcId: n.npcId })),
    ];
  } else {
    lines = (e.ballot ?? []).map((b) =>
      b.kind === 'player'
        ? { kind: 'player' as const, cand: cands.find((x) => x.characterId.equals(b.characterId!))! }
        : { kind: 'npc' as const, npcId: b.npcId! },
    );
  }
  const playerIds = lines.flatMap((l) => (l.kind === 'player' && l.cand ? [l.cand.characterId] : []));
  const chars = await s(
    Character.find(
      { _id: { $in: playerIds } },
      { name: 1, avatarId: 1, rank: 1, factionId: 1, localStanding: 1 },
    ),
    session,
  ).lean<CharacterDoc[]>();

  const candidates: CandidateView[] = lines.flatMap((l): CandidateView[] => {
    if (l.kind === 'npc') {
      const npc = content.candidate(l.npcId);
      const slate = e.npcSlate.find((n) => n.npcId === l.npcId);
      const st = standingView((slate?.profile ?? 0) * 5);
      return [
        {
          key: `n:${l.npcId}`,
          candidacyId: null,
          kind: 'npc',
          name: npc?.name ?? l.npcId,
          avatar: null,
          factionId: home,
          rankTitle: null,
          standing: {
            name: content.standingNames[st.level] ?? '',
            cityName: city.name,
            successes: st.successes,
          },
          wardVote: slate?.wardVote ?? 0,
          platform: npc?.line ?? '',
          endorsements: null,
          you: false,
          endorsedByYou: false,
          canEndorse: null,
        },
      ];
    }
    if (!l.cand) return [];
    const ch = chars.find((x) => x._id.equals(l.cand.characterId));
    const successes = ch ? standingSuccesses(ch, city.id) : 0;
    const named = namedStanding(content, city.id, successes);
    const you = l.cand.characterId.equals(c._id);
    const endorsedByYou = l.cand.endorsements.some((x) => x.characterId.equals(c._id));
    let canEndorse: CandidateView['canEndorse'] = null;
    if (e.status === 'nominations') {
      if (you) canEndorse = { ok: false, reason: 'SELF' };
      else if (l.cand.status !== 'filed') canEndorse = { ok: false, reason: 'CLOSED' };
      else if (endorsedNow) canEndorse = { ok: false, reason: 'ALREADY' };
      else if (c.rank < COUNCIL.voteRank) canEndorse = { ok: false, reason: 'RANK' };
      else if (c.pc < COUNCIL.cost.endorse) canEndorse = { ok: false, reason: 'PC' };
      else canEndorse = { ok: true };
    }
    return [
      {
        key: `p:${l.cand.characterId.toHexString()}`,
        candidacyId: l.cand._id.toHexString(),
        kind: 'player',
        name: ch?.name ?? l.cand.name,
        avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
        factionId: home,
        rankTitle: ch ? rankTitle(content, ch, ch.rank) : null,
        standing: { name: named.name, cityName: city.name, successes },
        wardVote: wardVote(successes),
        platform: content.platform(home, l.cand.platformId)?.line ?? '',
        endorsements: endorsementsOf(content, l.cand, small, secretary),
        you,
        endorsedByYou,
        canEndorse,
      },
    ];
  });

  const successes = standingSuccesses(c, city.id);
  const sitting = (c.offices ?? []).some(
    (o) => o.cityId === city.id && o.fromDay <= today && today < o.toDay,
  );
  let declare: ElectionView['declare'] = null;
  if (e.status === 'nominations' && !mine) {
    const rankOk = c.rank >= COUNCIL.standRank;
    const knownOk = standingView(successes).level >= COUNCIL.knownLevel;
    const reason: GameErrorReason | null = !rankOk
      ? 'RANK_TOO_LOW'
      : !knownOk
        ? 'NOT_KNOWN'
        : sitting
          ? 'SITTING_COUNCILLOR'
          : c.pc < COUNCIL.cost.declare
            ? 'NOT_ENOUGH_PC'
            : null;
    declare = {
      requirements: [
        {
          id: 'rank',
          met: rankOk,
          rankTitle: faction.rankTitles[COUNCIL.standRank - 1]!,
          fxpToGo: Math.max(0, RANK_FXP[COUNCIL.standRank - 1]! - c.fxp),
        },
        { id: 'known', met: knownOk, successes, need: 30 },
        { id: 'endorsements', met: false, need: COUNCIL.endorsementsNeeded },
      ],
      platforms: faction.platforms.map((p) => ({ id: p.id, line: p.line })),
      cost: COUNCIL.cost.declare,
      canDeclare: reason === null,
      reason,
    };
  }

  const candidacy: ElectionView['candidacy'] =
    mine && mine.status !== 'elected' && mine.status !== 'defeated'
      ? {
          candidacyId: mine._id.toHexString(),
          status: mine.status,
          endorsements: mine.status === 'withdrawn' ? null : endorsementsOf(content, mine, small, secretary),
          branchLine: mine.status === 'filed' && mine.branch !== null && ordersAllDoneToday(c, today),
          canWithdraw: mine.status === 'filed' && e.status === 'nominations',
        }
      : null;

  const cast = vote
    ? { key: vote.candidateKey, name: e.ballot?.find((b) => b.key === vote.candidateKey)?.name ?? '' }
    : null;
  const ballotReason: GameErrorReason | null =
    c.rank < COUNCIL.voteRank ? 'RANK_TOO_LOW' : cast ? 'ALREADY_VOTED' : null;
  return {
    electionId: id,
    cityId: city.id,
    cityName: city.name,
    phase: cal.phase,
    nominationsCloseAt: dayStart(e.pollsFrom),
    pollsOpenAt: dayStart(e.pollsFrom),
    countAt: dayStart(e.countDay),
    candidates,
    declare,
    candidacy,
    ballot: e.status === 'polling' ? { cast, canVote: ballotReason === null, reason: ballotReason } : null,
    endorsed: endorsedNow
      ? { candidacyId: endorsedNow.candidacyId.toHexString(), name: endorsedNow.name }
      : null,
    pc: c.pc,
  };
}

// ---------------------------------------------------------------------------------------------
// The count (council.count).
// ---------------------------------------------------------------------------------------------

export async function countView(
  content: GameContent,
  c: CharacterDoc,
  e: Pick<ElectionDoc, '_id' | 'cityId' | 'countDay' | 'result'>,
): Promise<CountView> {
  const r = e.result!;
  const vote = await Vote.findOne({ electionId: e._id, voterId: c._id }, { candidateKey: 1 }).lean<VoteDoc>();
  const ids = r.rows.flatMap((row) => (row.kind === 'player' ? [row.key.slice(2)] : []));
  const chars = await Character.find({ _id: { $in: ids } }, { avatarId: 1 }).lean<CharacterDoc[]>();
  const me = `p:${c._id.toHexString()}`;
  return {
    electionId: e._id,
    cityId: e.cityId,
    cityName: content.city(e.cityId)?.name ?? e.cityId,
    countDay: e.countDay,
    weekday: weekdayName(e.countDay),
    rows: r.rows.map((row) => {
      const ch =
        row.kind === 'player' ? chars.find((x) => x._id.toHexString() === row.key.slice(2)) : undefined;
      return {
        ...row,
        avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
        you: row.key === me,
        yourVote: vote?.candidateKey === row.key,
      };
    }),
    turnout: r.turnout,
    seats: COUNCIL.seats,
    npcSeats: r.npcSeats,
  };
}

/** council.count: the home city's latest counted election by default; null while it is open. */
export async function getCount(
  content: GameContent,
  c: CharacterDoc,
  electionId: string | undefined,
): Promise<CountView | null> {
  const home = c.homeCityId;
  if (electionId !== undefined) {
    const cityId = electionId.slice(0, electionId.lastIndexOf(':'));
    if (cityId !== home) throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: home, requested: cityId });
    const e = await Election.findById(electionId).lean<ElectionDoc>();
    if (!e) throw gameError('NOT_FOUND', 'UNKNOWN_ELECTION', { electionId });
    return e.status === 'counted' && e.result ? countView(content, c, e) : null;
  }
  const e = await Election.findOne({ cityId: home, status: 'counted' })
    .sort({ cycle: -1 })
    .lean<ElectionDoc>();
  return e?.result ? countView(content, c, e) : null;
}

// ---------------------------------------------------------------------------------------------
// The chamber (council.chamber).
// ---------------------------------------------------------------------------------------------

export async function councilView(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  today: DayKey,
  session: Session = null,
): Promise<CouncilView> {
  const { city: spec, offset, faction } = homeSpec(content, c);
  const cal = councilDay(today, offset);
  const key = councilKey(spec.id, cal.cycle);
  const terms = await s(OfficeTerm.find({ councilKey: key }).sort({ seat: 1 }), session).lean<
    OfficeTermDoc[]
  >();
  const p = await s(OrderPaper.findById(key), session).lean<OrderPaperDoc>();
  if (!p) throw gameError('PRECONDITION_FAILED', 'ELECTION_NOT_READY');
  const playerIds = terms.flatMap((t) => (t.holder.kind === 'player' ? [t.holder.characterId] : []));
  const chars = await s(
    Character.find(
      { _id: { $in: playerIds } },
      { name: 1, avatarId: 1, rank: 1, factionId: 1, localStanding: 1 },
    ),
    session,
  ).lean<CharacterDoc[]>();
  const name = (id: string) => (id === AGAINST_ALL ? 'Against all' : (content.ordinance(id)?.name ?? id));
  const divided = p.status === 'divided' && p.division;
  const myTerm = terms.find((t) => t.holder.kind === 'player' && t.holder.characterId.equals(c._id));
  const myVote = p.votes.find((v) => v.characterId.equals(c._id));
  const myProposal = p.items.find((i) => i.movedBy.kind === 'player' && i.movedBy.characterId.equals(c._id));
  const proposals = p.items.filter((i) => i.movedBy.kind === 'player').length;
  const voting = cal.council.voting && p.status === 'open';
  const proposeReason: GameErrorReason | null = !myTerm
    ? 'NOT_COUNCILLOR'
    : !voting
      ? 'COUNCIL_CLOSED'
      : myProposal
        ? 'ALREADY_PROPOSED'
        : proposals >= COUNCIL.maxProposals
          ? 'PAPER_FULL'
          : c.pc < COUNCIL.cost.propose
            ? 'NOT_ENOUGH_PC'
            : null;
  const tally = (choice: string) => {
    const t = divided ? p.division!.tallies.find((x) => x.choice === choice) : undefined;
    return t ? t.player + t.npc : divided ? 0 : null;
  };
  const secretary = content.npc(faction.secretary.npcId);
  const ordId = ordinanceIdOn(city, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  return {
    councilKey: key,
    cityId: spec.id,
    cityName: spec.name,
    termEndsAt: dayStart(cal.council.toDay),
    npcSeats: terms.filter((t) => t.holder.kind === 'npc').length,
    seats: terms.map((t) => {
      if (t.holder.kind === 'npc') {
        const npc = content.candidate(t.holder.npcId);
        const st = standingView((npc?.profile ?? 0) * 5);
        return {
          seat: t.seat,
          kind: 'npc' as const,
          name: t.holder.name,
          avatar: null,
          rankTitle: null,
          standingName: content.standingNames[st.level] ?? '',
          you: false,
          votedFor: divided && p.division!.npcChoice ? name(p.division!.npcChoice) : null,
        };
      }
      const holder = t.holder;
      const ch = chars.find((x) => x._id.equals(holder.characterId));
      const v = p.votes.find((x) => x.characterId.equals(holder.characterId));
      return {
        seat: t.seat,
        kind: 'player' as const,
        name: ch?.name ?? holder.name,
        avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
        rankTitle: ch ? rankTitle(content, ch, ch.rank) : null,
        standingName: ch ? namedStanding(content, spec.id, standingSuccesses(ch, spec.id)).name : '',
        you: holder.characterId.equals(c._id),
        votedFor: v ? name(v.choice) : null,
      };
    }),
    window: {
      voting,
      divideAt: dayStart(cal.council.divideDay),
      opensAt: voting ? null : dayStart(cal.council.toDay),
    },
    paper: {
      status: p.status,
      items: p.items.map((it, i) => {
        const o = content.ordinance(it.ordinanceId);
        return {
          n: i + 1,
          ordinanceId: it.ordinanceId,
          name: o?.name ?? it.ordinanceId,
          line: o?.line ?? '',
          effectLine: o?.effectLine ?? '',
          movedBy:
            it.movedBy.kind === 'branch'
              ? { kind: 'branch' as const, name: secretary?.name ?? it.movedBy.name, you: false }
              : { kind: 'player' as const, name: it.movedBy.name, you: it.movedBy.characterId.equals(c._id) },
          votes: tally(it.ordinanceId),
          passed: !!divided && p.division!.passed === it.ordinanceId,
        };
      }),
      against: tally(AGAINST_ALL),
      rose: !!divided && p.division!.passed === null,
    },
    you: {
      councillor: !!myTerm,
      voted: myVote?.choice ?? null,
      proposed: myProposal?.ordinanceId ?? null,
      canPropose: proposeReason === null,
      proposeReason,
      pc: c.pc,
    },
    menu:
      myTerm && voting
        ? content.ordinancesMenu().map((o) => ({
            ordinanceId: o.id,
            name: o.name,
            line: o.line,
            effectLine: o.effectLine,
            onPaper: p.items.some((i) => i.ordinanceId === o.id),
          }))
        : null,
    inForce:
      ord && city?.ordinance?.id === ord.id
        ? { ordinanceId: ord.id, name: ord.name, line: ord.line, daysLeft: city.ordinance.toDay - today }
        : null,
  };
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
): Promise<FrontPageView | null> {
  const e = await Election.findById(term.electionId).lean<ElectionDoc>();
  if (!e?.result) return null;
  const me = `p:${c._id.toHexString()}`;
  const row = e.result.rows.find((r) => r.key === me);
  const top = row?.place === 1;
  const templates = content.politicalHeadlinesOf(c.homeCityId);
  const t = templates.find((h) => h.when.some((w) => w.kind === 'seatWon' && w.top === top));
  const vars: Partial<Record<PoliticalPlaceholder, string>> = {
    name: c.name,
    ordinal: ordinal(row?.place ?? term.place),
    votes: String(row?.total ?? term.total),
  };
  const fill = (x: string) => {
    const out = x.replace(/\{([a-zA-Z]+)\}/g, (whole, k: string) => vars[k as PoliticalPlaceholder] ?? whole);
    return out.charAt(0).toUpperCase() + out.slice(1);
  };
  return {
    avatar: c.avatarId ? assetView(content, c.avatarId) : null,
    caption: {
      name: c.name,
      rankTitle: rankTitle(content, c, c.rank),
      cityName: content.city(c.homeCityId)?.name ?? c.homeCityId,
    },
    animate: term.frontPageSeenAt === null,
    headline: t ? fill(t.headline) : c.name,
    deck: t?.deck ? fill(t.deck) : '',
    count: await countView(content, c, e),
  };
}

/** The live political headlines of the caller's paper this morning. */
export async function politicalHeadlines(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  today: DayKey,
): Promise<LiveHeadline[]> {
  const spec = content.city(c.homeCityId);
  if (!spec?.council || !spec.homeFactionId || spec.homeFactionId !== c.factionId) return [];
  const cal = councilDay(today, spec.council.offset);
  const curId = electionKey(spec.id, cal.cycle);
  const prevId = electionKey(spec.id, cal.cycle - 1);
  const countToday = cal.cycleDay === 0;
  const prev = countToday ? await Election.findById(prevId).lean<ElectionDoc>() : null;
  const counted = prev?.status === 'counted' && prev.result ? prev.result : null;
  const cur = await Candidacy.findOne({ electionId: curId, characterId: c._id }).lean<CandidacyDoc>();
  const me = `p:${c._id.toHexString()}`;
  const vars: Partial<Record<PoliticalPlaceholder, string>> = {
    name: c.name,
    city: spec.name,
    weekday: weekdayName(nextNominationsAfter(today, spec.council.offset)),
  };
  const byKind: Record<string, Partial<Record<PoliticalPlaceholder, string>>> = {};
  let seat: PoliticalFacts['seat'] = null;
  let voted: PoliticalFacts['voted'] = null;
  if (counted) {
    const rows = counted.rows as CountRow[];
    const last = rows.find((r) => r.key === counted.lastSeatKey);
    vars.winner = surname(rows[0]?.name ?? '');
    vars.npcSeats = String(counted.npcSeats);
    vars.turnout = turnoutText(counted.turnout);
    const mine = rows.find((r) => r.key === me);
    if (mine) {
      const margin = marginToSeat(mine, { rows });
      seat = { won: mine.seated, top: mine.place === 1, tie: !mine.seated && margin === 0 };
      const v = {
        ordinal: ordinal(mine.place),
        votes: String(mine.total),
        margin: String(margin),
        last: last?.name ?? '',
      };
      byKind.seatWon = v;
      byKind.seatLost = v;
    }
    const vote = await Vote.findOne({ electionId: prevId, voterId: c._id }).lean<VoteDoc>();
    const theirs = vote ? rows.find((r) => r.key === vote.candidateKey) : undefined;
    if (theirs) {
      const margin = marginToSeat(theirs, { rows });
      voted = { won: theirs.seated, tie: !theirs.seated && margin === 0 };
      byKind.votedFor = {
        voted: theirs.name,
        ordinal: ordinal(theirs.place),
        votes: String(theirs.total),
        margin: String(margin),
        last: last?.name ?? '',
        turnout: turnoutText(counted.turnout),
      };
    }
  }

  let nominationsClosed: PoliticalFacts['nominationsClosed'] = null;
  if (cal.cycleDay === 2 && cur && cur.status !== 'filed' && cur.status !== 'withdrawn') {
    nominationsClosed = { struck: cur.status === 'struck' };
    byKind.nominationsClosed = { endorsements: String(cur.effective ?? 0) };
  }
  if (cur?.status === 'filed') {
    const faction = content.faction(c.factionId);
    const small = isSmallBranch(await otherEndorsers(spec.id, spec.homeFactionId, today, c._id));
    byKind.filedYesterday = {
      endorsements: String(
        endorsementsOf(content, cur, small, content.npc(faction.secretary.npcId)?.name ?? '').n,
      ),
    };
  }
  const termEnded = countToday
    ? (await OfficeTerm.exists({ 'holder.kind': 'player', 'holder.characterId': c._id, toDay: today })) !==
      null
    : false;
  const key = councilKey(spec.id, cal.cycle);
  const sat = (c.offices ?? []).some((o) => o.councilKey === key);
  const paper = await OrderPaper.findById(key).lean<OrderPaperDoc>();
  let divided: PoliticalFacts['divided'] = null;
  if (sat && cal.cycleDay === 2 && paper?.division) {
    divided = { passed: paper.division.passed !== null };
    const o = paper.division.passed ? content.ordinance(paper.division.passed) : undefined;
    byKind.divided = { ordinance: o?.name ?? '', ordinanceLine: o?.line ?? '' };
  }
  const moved = paper?.items.find(
    (i) => i.movedBy.kind === 'player' && i.movedBy.characterId.equals(c._id) && i.day === today - 1,
  );
  if (moved) {
    const o = content.ordinance(moved.ordinanceId);
    byKind.movedYesterday = { ordinance: o?.name ?? '', ordinanceLine: o?.line ?? '' };
  }
  // News only when a division passed it this morning, not a bootstrap's synthetic motion.
  const ordinanceFromToday = city?.ordinance?.fromDay === today && city.world?.bootstrappedDay !== today;
  if (ordinanceFromToday && city?.ordinance) {
    const o = content.ordinance(city.ordinance.id);
    byKind.ordinanceFromToday = { ordinance: o?.name ?? '', ordinanceLine: o?.line ?? '' };
  }
  const facts: PoliticalFacts = {
    seat,
    voted,
    filedYesterday: cur?.status === 'filed' && cur.filedDay === today - 1,
    nominationsClosed,
    termEnded,
    divided,
    movedYesterday: moved !== undefined,
    countToday: counted !== null,
    phase: cal.phase,
    cycleDay: cal.cycleDay,
    ordinanceFromToday,
    leftUnrest: city?.morale?.previous === 'unrest' && city.morale.since === today,
    vars,
    varsByKind: byKind,
    until: {
      nominations: dayStart(cal.election.pollsFrom),
      polls: dayStart(cal.election.countDay),
      divide: dayStart(cal.council.divideDay),
    },
  };
  return selectPoliticalHeadlines(content.politicalHeadlinesOf(spec.id), facts);
}
