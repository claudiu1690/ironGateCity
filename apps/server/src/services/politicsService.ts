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
  CAPITAL_COUNCIL,
  COUNCIL,
  FACTION_IDS,
  ORDINALS,
  WEEKDAY_NAMES,
  councilDay,
  dayKey,
  councilKey,
  cycleOfKey,
  dayStart,
  effectiveEndorsements,
  electionKey,
  isSmallBranch,
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
  CouncilView,
  CountRow,
  CountView,
  DayKey,
  ElectionView,
  EndorsementsView,
  FactionId,
  FrontPageView,
  WhatNowView,
  GameErrorReason,
  HallView,
  LiveHeadline,
  PoliticalFacts,
  PoliticalPlaceholder,
  PoliticsState,
  PoliticsSummaryView,
  ElectionCardState,
  ElectionCardView,
  ElectionYourLine,
  ScoreboardTableView,
} from '@irongate/rules';
import { selectPoliticalHeadlines } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { gameError } from '../gameError';
import { activeMembersFilter } from './cityDayCore';
import { residenceOf, residenceSpec } from './residence';
import type { ResidenceSpec } from './residence';
import { ordinanceIdOn } from './modifiers';
import { assetView, namedStanding, rankTitle, standingSuccesses } from './views';
import { nightAt } from './night';

/**
 * The political views (ADR 0023): the Polling Day row and the HQ council card (one summary), the
 * slate and the ballot, the count, the chamber, the front page and the live political headlines.
 * Built at read from the domain collections; no view carries another voter's choice, the ballot
 * count or any total before the count (ADR 0019). Slice 4 (ADR 0026, 0027): every view reads the
 * residence's place: the home city, or in the capital the district registered in, where every
 * faction stands and two seats are counted.
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
  (isDistrict(spec) ? CAPITAL_COUNCIL.perDistrict : COUNCIL.seats) as 7 | 2;

/**
 * The endorsement given this cycle: at home keyed by the election, in the capital by the city's
 * cycle (one per member per cycle in the city, whichever district's candidate; ADR 0027 §4).
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

/** Other eligible endorsers today (the small-branch rule, live; the close re-counts it). */
async function otherEndorsers(
  cityId: string,
  faction: FactionId,
  today: DayKey,
  me: CharacterDoc['_id'],
  session: Session = null,
): Promise<number> {
  return s(
    Character.countDocuments({ ...activeMembersFilter(cityId, faction, today), _id: { $ne: me } }),
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

const secretaryOf = (content: GameContent, f: FactionId) =>
  content.npc(content.faction(f).secretary.npcId)?.name ?? '';

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
  const e = await s(Election.findById(electionId), session).lean<ElectionDoc>();
  const cand = await s(Candidacy.findOne({ electionId, characterId: c._id }), session).lean<CandidacyDoc>();
  const vote =
    cal.phase === 'polling'
      ? await s(Vote.findOne({ electionId, voterId: c._id }), session).lean<VoteDoc>()
      : null;
  const term = (c.offices ?? []).find((o) => o.councilKey === councilKey(cityId, cal.cycle));
  const paper =
    term && cal.council.voting
      ? await s(
          OrderPaper.findById(councilKey(cityId, cal.cycle), { votes: 1, status: 1, items: 1 }),
          session,
        ).lean<OrderPaperDoc>()
      : null;
  const councillorOpen =
    !!term &&
    cal.council.voting &&
    paper?.status === 'open' &&
    !paper.votes.some((v) => v.characterId.equals(c._id));
  // The last count: the Polling Day state on the count morning; the Election card on days 0–1.
  const lastCount =
    cal.cycleDay <= 1
      ? await s(
          Election.findById(electionKey(spec.place.id, cal.cycle - 1), { result: 1, status: 1, kind: 1 }),
          session,
        ).lean<ElectionDoc>()
      : null;
  const prev = cal.cycleDay === 0 ? lastCount : null;
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
  // ADR 0026 §3: registered after this cycle's polls opened (or during them) votes from the next.
  const notYetVoter = r.votesFromDay > cal.election.pollsFrom;

  let state: PoliticsState;
  if (c.rank < COUNCIL.voteRank) state = 'belowRank';
  else if (cal.phase === 'polling' && !vote && !notYetVoter) state = 'ballot';
  else if (councillorOpen) state = 'councilSits';
  else if (cand?.status === 'filed') state = 'filed';
  else if (canStand) state = 'stand';
  else if (prev?.status === 'counted' && prev.result) state = 'count';
  else if (cal.phase === 'polling') state = 'voted';
  else state = 'nominations';

  const branch = branchOf(spec, c);
  let endorsements: PoliticsSummaryView['endorsements'] = null;
  if (cand?.status === 'filed') {
    const small = isSmallBranch(await otherEndorsers(cityId, branch, today, c._id, session));
    const e2 = endorsementsOf(content, cand, small, secretaryOf(content, branch));
    endorsements = { n: e2.n, needed: e2.needed, branchWillMakeUp: small };
  }
  const votedFor = vote ? (e?.ballot?.find((b) => b.key === vote.candidateKey)?.name ?? null) : null;
  const top = prev?.result
    ? (prev.result.rows.find((x) => x.key === prev.result!.topKey) ?? prev.result.rows[0])
    : undefined;
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
    cityId,
    cityName: spec.city.name,
    cycleDay: cal.cycleDay,
    phase: cal.phase,
    state,
    closesAt: dayStart(cal.phase === 'nominations' ? cal.election.pollsFrom : cal.election.countDay),
    pollsOpenAt: dayStart(cal.election.pollsFrom),
    pollsFromWeekday: weekdayName(Math.max(nextPollsFrom(today, offset), r.votesFromDay)),
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
            seats: seatsOf(spec),
            turnout: prev.result.turnout,
          }
        : null,
    inForce:
      ord && city?.ordinance && city.ordinance.id === ord.id
        ? {
            ordinanceId: ord.id,
            name: ord.name,
            daysLeft: city.ordinance.toDay - today,
            plainLine: ord.plainLine,
          }
        : null,
    rank2Title: faction.rankTitles[1]!,
    rank3Title: faction.rankTitles[COUNCIL.standRank - 1]!,
    paperShortName: spec.city.paper?.shortName ?? 'paper',
    fxpToRank2: c.rank < COUNCIL.voteRank ? Math.max(0, RANK_FXP[1]! - c.fxp) : null,
    standCost: COUNCIL.cost.declare,
    councillor: councillorOpen,
    route,
    dot: state === 'ballot' || state === 'councilSits',
    card: await electionCard(content, c, {
      cal,
      spec,
      cand,
      vote: vote ? { key: vote.candidateKey, name: votedFor ?? '' } : null,
      term: !!term,
      paper,
      lastCount,
      canStand,
      endorsements,
      branchLine: cand?.status === 'filed' && cand.branch !== null && ordersAllDoneToday(c, today),
      notYetVoter,
      today,
      session,
    }),
    placeId: spec.place.id,
    placeName: spec.place.name,
    seats: seatsOf(spec),
  };
}

/**
 * Review 2 (slice-3 screens §1a, §2.1): the Election card, one view for the city screen, the paper's
 * row and the HQ sheet. The server picks the state; the client words it. Slice 4: *Registered* in
 * a district before the first vote there opens.
 */
async function electionCard(
  content: GameContent,
  c: CharacterDoc,
  i: {
    cal: ReturnType<typeof councilDay>;
    spec: ResidenceSpec;
    cand: CandidacyDoc | null;
    vote: { key: string; name: string } | null;
    term: boolean;
    paper: OrderPaperDoc | null;
    lastCount: ElectionDoc | null;
    canStand: boolean;
    endorsements: PoliticsSummaryView['endorsements'];
    branchLine: boolean;
    notYetVoter: boolean;
    today: DayKey;
    session: Session;
  },
): Promise<ElectionCardView> {
  const { cal, cand, vote, lastCount, today } = i;
  const counted = lastCount?.status === 'counted' && lastCount.result ? lastCount.result : null;
  const backingOf = givenThisCycle(c, i.spec, cal.cycle);
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
      const v = await s(
        Vote.findOne({ electionId: electionKey(i.spec.place.id, cal.cycle - 1), voterId: c._id }),
        i.session,
      ).lean<VoteDoc>();
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
  // Slice 4 (screens §7.2): registered, the first vote not yet open: a late registrant whose first
  // polls are the next cycle's, or one registered before this cycle's polls open (days 0–1).
  else if ((i.notYetVoter || today < residenceOf(c).votesFromDay) && !cand) state = 'registered';
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
    (await s(
      PaperEntry.exists({
        characterId: c._id,
        day: today,
        'headlines.templateId': { $regex: /rank-up-2$/ },
      }),
      i.session,
    )) !== null;
  const ruleName = (choice: string) =>
    choice === 'against' ? null : (content.ordinance(choice)?.name ?? choice);
  const winner = counted
    ? ((counted.rows as CountRow[]).find((r) => r.key === counted.topKey) ?? (counted.rows as CountRow[])[0])
    : undefined;
  // Slice 4 (screens §7.2): in a district, the two seats' parties and the capital's ten by party.
  let district: NonNullable<ElectionCardView['result']>['district'] = null;
  if (counted && isDistrict(i.spec)) {
    const seatsOf = (rows: CountRow[]) =>
      (rows as Array<CountRow & { factionId?: FactionId }>)
        .filter((r) => r.seated && r.factionId)
        .sort((a, b) => a.place - b.place)
        .map((r) => r.factionId!);
    const ids = content.districtsOf(i.spec.city.id).map((d) => electionKey(d.id, cal.cycle - 1));
    const all = await s(
      Election.find({ _id: { $in: ids }, status: 'counted' }, { result: 1 }),
      i.session,
    ).lean<ElectionDoc[]>();
    const capital: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
    for (const e of all) for (const f of seatsOf((e.result?.rows ?? []) as CountRow[])) capital[f] += 1;
    district = { seats: seatsOf(counted.rows as CountRow[]), capital, turnout: counted.turnout };
  }
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
          winner: winner?.name ?? '',
          yourLine,
          councilUntil: dayStart(cal.council.toDay),
          namesUntil: dayStart(cal.election.pollsFrom),
          district,
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
  const spec = specOf(content, c);
  if (!spec || c.rank < COUNCIL.voteRank) return 0;
  const cal = councilDay(today, spec.offset);
  const term = (c.offices ?? []).some((o) => o.councilKey === councilKey(spec.city.id, cal.cycle));
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
  now: number,
  session: Session = null,
): Promise<ElectionView> {
  const today = dayKey(now);
  const spec = residenceSpec(content, c);
  const { city, offset } = spec;
  const cal = councilDay(today, offset);
  const id = electionKey(spec.place.id, cal.cycle);
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
  const district = isDistrict(spec);
  const factionOfCand = (x: Pick<CandidacyDoc, 'factionId'>): FactionId => x.factionId ?? spec.home!;
  // The small-branch rule per faction standing here (the viewer excluded, as at home).
  const factions: FactionId[] = district ? [...FACTION_IDS] : [spec.home!];
  const small = new Map<FactionId, boolean>();
  for (const f of factions)
    small.set(f, isSmallBranch(await otherEndorsers(city.id, f, today, c._id, session)));
  const endorsedNow = givenThisCycle(c, spec, cal.cycle) ?? null;
  const r = residenceOf(c);

  // Lines: players (by filing) then NPCs (by profile); in nominations the provisional fill (nine
  // at home; two per faction in a district).
  type NpcEntry = ElectionDoc['npcSlate'][number];
  type Line = { kind: 'player'; cand: CandidacyDoc } | { kind: 'npc'; npc: NpcEntry; factionId: FactionId };
  let lines: Line[];
  if (e.status === 'nominations') {
    const filed = cands.filter((x) => x.status === 'filed');
    const npcs: Line[] = district
      ? FACTION_IDS.flatMap((f) =>
          e.npcSlate
            .filter((n) => n.factionId === f)
            .slice(0, npcFill(filed.filter((x) => factionOfCand(x) === f).length))
            .map((n) => ({ kind: 'npc' as const, npc: n, factionId: f })),
        )
      : e.npcSlate
          .slice(0, npcsStanding(filed.length))
          .map((n) => ({ kind: 'npc' as const, npc: n, factionId: spec.home! }));
    lines = [...filed.map((cand) => ({ kind: 'player' as const, cand })), ...npcs];
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
          cityName: city.name,
          successes: st.successes,
        },
        wardVote: l.npc.wardVote ?? 0,
        platform: npc?.line ?? '',
        endorsements: null,
        you: false,
        endorsedByYou: false,
        canEndorse: null,
      };
    }
    const f = factionOfCand(l.cand);
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
      else if (f !== c.factionId) canEndorse = { ok: false, reason: 'FACTION' };
      else if (c.pc < COUNCIL.cost.endorse) canEndorse = { ok: false, reason: 'PC' };
      else canEndorse = { ok: true };
    }
    return {
      key: `p:${l.cand.characterId.toHexString()}`,
      candidacyId: l.cand._id.toHexString(),
      kind: 'player',
      name: ch?.name ?? l.cand.name,
      avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
      factionId: f,
      rankTitle: ch ? rankTitle(content, ch, ch.rank) : null,
      standing: { name: named.name, cityName: city.name, successes },
      wardVote: wardVote(successes),
      platform: content.platform(f, l.cand.platformId)?.line ?? '',
      endorsements: endorsementsOf(content, l.cand, small.get(f) ?? false, secretaryOf(content, f)),
      you,
      endorsedByYou,
      canEndorse,
    };
  });

  const successes = standingSuccesses(c, city.id);
  const sitting = (c.offices ?? []).some(
    (o) => o.cityId === city.id && o.fromDay <= today && today < o.toDay,
  );
  let declare: ElectionView['declare'] = null;
  const faction = content.faction(c.factionId);
  if (e.status === 'nominations' && !mine) {
    const rankOk = c.rank >= COUNCIL.standRank;
    const knownOk = standingView(successes).level >= COUNCIL.knownLevel;
    const reason: GameErrorReason | null = !rankOk
      ? 'RANK_TOO_LOW'
      : r.standsFromDay > today
        ? 'NOT_YET_CANDIDATE'
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
          endorsements:
            mine.status === 'withdrawn'
              ? null
              : endorsementsOf(
                  content,
                  mine,
                  small.get(factionOfCand(mine)) ?? false,
                  secretaryOf(content, factionOfCand(mine)),
                ),
          branchLine: mine.status === 'filed' && mine.branch !== null && ordersAllDoneToday(c, today),
          canWithdraw: mine.status === 'filed' && e.status === 'nominations',
        }
      : null;

  const cast = vote
    ? { key: vote.candidateKey, name: e.ballot?.find((b) => b.key === vote.candidateKey)?.name ?? '' }
    : null;
  const ballotReason: GameErrorReason | null =
    c.rank < COUNCIL.voteRank
      ? 'RANK_TOO_LOW'
      : cast
        ? 'ALREADY_VOTED'
        : r.votesFromDay > e.pollsFrom
          ? 'NOT_YET_VOTER'
          : null;
  return {
    electionId: id,
    cityId: city.id,
    cityName: district ? `${city.name} · ${spec.place.name}` : city.name,
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
    hall: hallView(content, city.id, now),
  };
}

// ---------------------------------------------------------------------------------------------
// The count (council.count).
// ---------------------------------------------------------------------------------------------

export async function countView(
  content: GameContent,
  c: CharacterDoc,
  e: Pick<ElectionDoc, '_id' | 'cityId' | 'countDay' | 'result' | 'kind'>,
  now: number,
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
    seats: e.kind === 'district' ? CAPITAL_COUNCIL.perDistrict : COUNCIL.seats,
    npcSeats: r.npcSeats,
    hall: hallView(content, e.cityId, now),
  };
}

/** What a district election's result stores besides the slice-3 fields (capitalDay.ts). */
interface DistrictResultDoc {
  factions: CapitalCountView['districts'][number]['factions'];
  w: number;
  ballots: number;
  scoreboard?: ScoreboardTableView[];
}

/**
 * Tech design §10.5: the capital's count, five districts, built from the five counted elections of
 * a cycle: every number the two tables print, the player's own vote marked, nobody else's.
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
  const votes = await Vote.find(
    { electionId: { $in: ids }, voterId: c._id },
    { candidateKey: 1, electionId: 1 },
  ).lean<VoteDoc[]>();
  const playerIds = es.flatMap((e) =>
    e.result!.rows.flatMap((row) => (row.kind === 'player' ? [row.key.slice(2)] : [])),
  );
  const chars = await Character.find({ _id: { $in: playerIds } }, { avatarId: 1 }).lean<CharacterDoc[]>();
  const me = `p:${c._id.toHexString()}`;
  const mineFirst = residenceOf(c).districtId;
  const seatsByFaction: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  let npcSeats = 0;
  const districts = ds
    .map((d) => {
      const e = es.find((x) => x._id === electionKey(d.id, cycle))!;
      const r = e.result!;
      const extra = r as unknown as DistrictResultDoc;
      const myVote = votes.find((v) => v.electionId === e._id)?.candidateKey;
      const rows = (r.rows as Array<CountRow & { factionId: FactionId }>).map((row) => {
        const ch =
          row.kind === 'player' ? chars.find((x) => x._id.toHexString() === row.key.slice(2)) : undefined;
        return {
          ...row,
          avatar: ch?.avatarId ? assetView(content, ch.avatarId) : null,
          you: row.key === me,
          yourVote: myVote === row.key,
          local: row.kind === 'npc',
        };
      });
      const seats = rows.filter((x) => x.seated).map((x) => ({ factionId: x.factionId, name: x.name }));
      for (const seat of seats) seatsByFaction[seat.factionId] += 1;
      npcSeats += r.npcSeats;
      return {
        districtId: d.id,
        name: d.name,
        factions: extra.factions ?? [],
        w: extra.w ?? 0,
        ballots: extra.ballots ?? 0,
        rows,
        seats,
        turnout: r.turnout,
        scoreboard: (extra.scoreboard ?? []).map((b) => ({
          ...b,
          rows: b.rows.map((x) => ({ ...x, you: x.characterId === c._id.toHexString() })),
        })),
      };
    })
    // The player's own district first.
    .sort((a, b) => Number(b.districtId === mineFirst) - Number(a.districtId === mineFirst));
  return {
    kind: 'capital',
    hall: hallView(content, cityId, now),
    councilKey: councilKey(cityId, cycle + 1),
    cycle,
    countDay: es[0]!.countDay,
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
// The chamber (council.chamber).
// ---------------------------------------------------------------------------------------------

/** `council.chamber`: the residence's council (review 4: `councilViewFor` the residence city). */
export async function councilView(
  content: GameContent,
  c: CharacterDoc,
  city: CityDoc | null,
  now: number,
  session: Session = null,
): Promise<CouncilView> {
  return councilViewFor(content, c, residenceSpec(content, c).city.id, city, now, session);
}

/**
 * Review 4 (ADR 0077): a city's sitting council for the caller, the city and the capital flag taken
 * from `cityId` instead of the residence: the seats, the order paper, the window, the rule in force,
 * and `you` (a councillor only on this council). `city` is that city's document.
 */
export async function councilViewFor(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  city: CityDoc | null,
  now: number,
  session: Session = null,
): Promise<CouncilView> {
  const today = dayKey(now);
  const cityContent = content.city(cityId);
  if (!cityContent?.council) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const offset = cityContent.council.offset;
  const capital = content.isDistricted(cityId);
  const spec = { home: cityContent.homeFactionId ?? null };
  const cal = councilDay(today, offset);
  const key = councilKey(cityContent.id, cal.cycle);
  // A seat vacated at a move shows its new holder (ADR 0026).
  const terms = await s(
    OfficeTerm.find({ councilKey: key, vacatedDay: null }).sort({ seat: 1 }),
    session,
  ).lean<OfficeTermDoc[]>();
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
  const npcChoices =
    (divided
      ? (p.division as unknown as { npcChoices?: Partial<Record<FactionId, string>> }).npcChoices
      : undefined) ?? {};
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
  const ordId = ordinanceIdOn(city, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  return {
    councilKey: key,
    cityId: cityContent.id,
    cityName: cityContent.name,
    termEndsAt: dayStart(cal.council.toDay),
    npcSeats: terms.filter((t) => t.holder.kind === 'npc').length,
    seats: terms.map((t) => {
      const where = capital
        ? {
            factionId: t.factionId,
            districtId: t.districtId ?? null,
            districtName: t.districtId ? (content.district(t.districtId)?.quarter.name ?? null) : null,
          }
        : {};
      if (t.holder.kind === 'npc') {
        const npc = content.candidate(t.holder.npcId);
        const st = standingView((npc?.profile ?? 0) * 5);
        const npcChoice = capital
          ? t.factionId
            ? npcChoices[t.factionId]
            : undefined
          : p.division?.npcChoice;
        return {
          seat: t.seat,
          kind: 'npc' as const,
          name: t.holder.name,
          avatar: null,
          rankTitle: null,
          standingName: content.standingNames[st.level] ?? '',
          you: false,
          votedFor: divided && npcChoice ? name(npcChoice) : null,
          ...where,
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
        standingName: ch
          ? namedStanding(content, cityContent.id, standingSuccesses(ch, cityContent.id)).name
          : '',
        you: holder.characterId.equals(c._id),
        votedFor: v ? name(v.choice) : null,
        ...where,
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
        const by = it.movedBy.kind === 'branch' ? (it.movedBy.factionId ?? spec.home) : null;
        return {
          n: i + 1,
          ordinanceId: it.ordinanceId,
          name: o?.name ?? it.ordinanceId,
          line: o?.line ?? '',
          effectLine: o?.effectLine ?? '',
          movedBy:
            it.movedBy.kind === 'branch'
              ? {
                  kind: 'branch' as const,
                  name: by ? secretaryOf(content, by) || it.movedBy.name : it.movedBy.name,
                  you: false,
                }
              : { kind: 'player' as const, name: it.movedBy.name, you: it.movedBy.characterId.equals(c._id) },
          ...(capital ? { branchOf: by ?? null } : {}),
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
        ? (capital ? content.irongateMenu() : content.ordinancesMenu()).map((o) => ({
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
    hall: hallView(content, cityContent.id, now),
    passVotes: capital ? CAPITAL_COUNCIL.passVotes : COUNCIL.passVotes,
    seatCount: capital ? CAPITAL_COUNCIL.seats : COUNCIL.seats,
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
    whatNow: whatNowOf(content, term),
  };
}

/**
 * Review 4 (answers §10.1, ADR 0077): the *What now* card's fields for a player's term: the votes
 * that pass a rule, the seats, and the moment the council votes.
 */
export function whatNowOf(content: GameContent, term: Pick<OfficeTermDoc, '_id' | 'cityId' | 'fromDay'>): WhatNowView {
  const capital = content.isDistricted(term.cityId);
  const offset = content.city(term.cityId)?.council?.offset ?? 0;
  const hall = content.hallOf(term.cityId)?.location;
  return {
    termId: term._id.toHexString(),
    cityId: term.cityId,
    hall: { locationId: hall?.id ?? '', name: hall?.name ?? '' },
    seatCount: capital ? CAPITAL_COUNCIL.seats : COUNCIL.seats,
    passVotes: capital ? CAPITAL_COUNCIL.passVotes : COUNCIL.passVotes,
    divideAt: dayStart(councilDay(term.fromDay, offset).council.divideDay),
  };
}

/**
 * The live political headlines of the caller's residence this morning (the home city's; in the
 * capital, the district's election and the capital's council, from the Herald's templates).
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
  const cityId = spec.city.id;
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
  let voted: PoliticalFacts['voted'] = null;
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
    const branch = branchOf(spec, c);
    const small = isSmallBranch(await otherEndorsers(cityId, branch, today, c._id));
    byKind.filedYesterday = {
      endorsements: String(endorsementsOf(content, cur, small, secretaryOf(content, branch)).n),
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
  const key = councilKey(cityId, cal.cycle);
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
    ...(extra?.capital ? { capital: extra.capital } : {}),
    vars,
    varsByKind: byKind,
    until: {
      nominations: dayStart(cal.election.pollsFrom),
      polls: dayStart(cal.election.countDay),
      divide: dayStart(cal.council.divideDay),
    },
  };
  return selectPoliticalHeadlines(content.politicalHeadlinesOf(extra?.templatesOf ?? cityId), facts);
}
