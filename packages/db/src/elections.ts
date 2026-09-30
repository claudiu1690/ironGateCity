/**
 * The slice-3 playtest report (tech design §14.1): "does the first vote, and the first seat, feel
 * like a big moment?" Pure maths over rows read from the domain collections (never requestLogs,
 * whose TTL would lose data; QA slice 2 m2). Votes are read without their choice: the report never
 * puts a voter next to a candidate (ADR 0019). Boosted testers (the admin script) are separated
 * from natural ones.
 */

const DAY_MS = 86_400_000;
const H = 3_600_000;
const dayOf = (d: Date) => Math.floor(d.getTime() / DAY_MS);
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export interface ElectionRow {
  id: string;
  cityId: string;
  cycle: number;
  nominationsFrom: number;
  pollsFrom: number;
  countDay: number;
  status: 'nominations' | 'polling' | 'counted';
  /** Ballot lines: kind only (the ballot is public after the close). */
  ballot: Array<{ kind: 'player' | 'npc'; key: string }> | null;
  result: {
    rows: Array<{ key: string; kind: 'player' | 'npc'; total: number; seated: boolean; place: number }>;
    turnout: { voters: number; eligible: number };
    npcSeats: number;
  } | null;
}

export interface CandidacyRow {
  electionId: string;
  characterId: string;
  status: 'filed' | 'withdrawn' | 'struck' | 'standing' | 'elected' | 'defeated';
  filedDay: number;
  members: number;
  branch: boolean;
  smallBranch: boolean | null;
}

/** One ballot, without its choice. */
export interface BallotRow {
  electionId: string;
  voterId: string;
  day: number;
  createdAt: Date;
}

/** Ballots per election that went to NPC lines (aggregated). */
export interface NpcBallots {
  electionId: string;
  npc: number;
  total: number;
}

export interface TermRow {
  cityId: string;
  councilKey: string;
  fromDay: number;
  toDay: number;
  playerId: string | null;
  frontPageSeenAt: Date | null;
}

export interface PaperRow {
  id: string;
  cityId: string;
  items: Array<{ kind: 'branch' | 'player'; characterId: string | null; at: Date }>;
  votes: Array<{ characterId: string; at: Date }>;
  status: 'open' | 'divided';
  passed: string | null;
  inForce: { fromDay: number; toDay: number } | null;
}

export interface MoraleLogRow {
  cityId: string;
  log: Array<{ day: number; share: number; state: 'fired' | 'steady' | 'unrest' }>;
}

export interface ElectionCharacter {
  id: string;
  name: string;
  homeCityId: string;
  createdAt: Date;
  boosted: boolean;
  boostedAt: Date | null;
}

export interface ElectionAction {
  characterId: string;
  createdAt: Date;
  cityId: string;
  kind: string;
  txAttempts: number;
  /** The rank reached by this action, when it rose. */
  rankTo: number | null;
}

export interface ElectionPaperRead {
  characterId: string;
  day: number;
  readAt: Date | null;
}

export interface ElectionsReport {
  elections: Array<{
    election: string;
    cityId: string;
    countDay: number;
    filed: number;
    withdrawn: number;
    struck: number;
    standing: number;
    npcsStanding: number;
    memberEndorsements: number;
    branchEndorsements: number;
    smallBranchDoubles: number;
    turnout: string | null;
    npcBallotShare: number | null;
    playerSeats: number | null;
    topTotal: number | null;
    seventhTotal: number | null;
    closestPlayerMargin: number | null;
    moraleAtCount: number | null;
  }>;
  councils: Array<{
    council: string;
    cityId: string;
    playerCouncillors: number;
    proposals: number;
    councilVotes: string;
    passed: string;
    actionsWhileInForce: number;
    shiftsWhileInForce: number;
  }>;
  firstVote: {
    /** Days from Rank 2 to the first ballot: 0 / 1 / 2 / more (target ≤ 2). */
    distribution: { d0: number; d1: number; d2: number; more: number };
    /** Minutes from the first paper read on the ballot's day to the ballot (target < 1). */
    medianMinutesFromPaper: number | null;
    /** Ballots cast / polling windows a Rank 2+ member was eligible for. */
    windowTurnout: number | null;
  };
  firstSeat: Record<
    'natural' | 'boosted',
    {
      players: number;
      rank3ToCandidacyDays: number | null;
      candidacyToSeatDays: number | null;
      seats: number;
      frontPageSeenHours: number | null;
      frontPageSeenOnCountDay: number | null;
      actInChamberWithin30Min: number | null;
      councilVoteRate: number | null;
    }
  >;
  /** The morning after the count (countDay + 1): who came back. */
  nextDayReturn: {
    winners: number | null;
    losers: number | null;
    voters: number | null;
    nonVoters: number | null;
  };
  morale: Array<{
    cityId: string;
    days: { fired: number; steady: number; unrest: number };
    crossings: number;
    firstFiredDay: number | null;
  }>;
  contention: { actionsNearMidnight: number; contendedNearMidnight: number | null };
}

export function buildElectionsReport(i: {
  elections: ElectionRow[];
  candidacies: CandidacyRow[];
  ballots: BallotRow[];
  npcBallots: NpcBallots[];
  terms: TermRow[];
  papers: PaperRow[];
  morale: MoraleLogRow[];
  characters: ElectionCharacter[];
  actions: ElectionAction[];
  paperReads: ElectionPaperRead[];
}): ElectionsReport {
  const elections = [...i.elections].sort(
    (a, b) => a.countDay - b.countDay || a.cityId.localeCompare(b.cityId),
  );
  const moraleOn = (cityId: string, day: number) =>
    i.morale.find((m) => m.cityId === cityId)?.log.find((l) => l.day === day)?.share ?? null;

  const electionRows = elections.map((e) => {
    const cands = i.candidacies.filter((c) => c.electionId === e.id);
    const npcB = i.npcBallots.find((b) => b.electionId === e.id);
    const rows = e.result?.rows ?? [];
    const seated = rows.filter((r) => r.seated);
    const seventh = seated.at(-1)?.total ?? null;
    const losers = rows.filter((r) => r.kind === 'player' && !r.seated);
    return {
      election: e.id,
      cityId: e.cityId,
      countDay: e.countDay,
      filed: cands.length,
      withdrawn: cands.filter((c) => c.status === 'withdrawn').length,
      struck: cands.filter((c) => c.status === 'struck').length,
      standing: cands.filter((c) => ['standing', 'elected', 'defeated'].includes(c.status)).length,
      npcsStanding: (e.ballot ?? []).filter((b) => b.kind === 'npc').length,
      memberEndorsements: cands.reduce((s, c) => s + c.members, 0),
      branchEndorsements: cands.filter((c) => c.branch).length,
      smallBranchDoubles: cands.filter((c) => c.branch && c.smallBranch).length,
      turnout: e.result ? `${e.result.turnout.voters} of ${e.result.turnout.eligible}` : null,
      npcBallotShare: npcB && npcB.total > 0 ? round(ratio(npcB.npc, npcB.total)) : null,
      playerSeats: e.result ? seated.filter((r) => r.kind === 'player').length : null,
      topTotal: rows[0]?.total ?? null,
      seventhTotal: seventh,
      closestPlayerMargin:
        losers.length && seventh !== null
          ? Math.min(...losers.map((r) => Math.max(0, seventh - r.total)))
          : null,
      moraleAtCount: e.result ? moraleOn(e.cityId, e.countDay) : null,
    };
  });

  const councils = [...i.papers]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => {
      const terms = i.terms.filter((t) => t.councilKey === p.id);
      const players = terms.filter((t) => t.playerId !== null).length;
      const inForce = p.inForce;
      const during = inForce
        ? i.actions.filter(
            (a) =>
              a.cityId === p.cityId &&
              dayOf(a.createdAt) >= inForce.fromDay &&
              dayOf(a.createdAt) < inForce.toDay,
          )
        : [];
      return {
        council: p.id,
        cityId: p.cityId,
        playerCouncillors: players,
        proposals: p.items.filter((x) => x.kind === 'player').length,
        councilVotes: `${p.votes.length} / ${players}`,
        passed: p.status === 'open' ? 'open' : (p.passed ?? 'rose without a motion'),
        actionsWhileInForce: during.filter((a) => a.kind !== 'shift').length,
        shiftsWhileInForce: during.filter((a) => a.kind === 'shift').length,
      };
    });

  // First vote: Rank 2 → the first ballot.
  const rankDay = (c: ElectionCharacter, rank: number): number | null => {
    const up = i.actions
      .filter((a) => a.characterId === c.id && a.rankTo !== null && a.rankTo >= rank)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (up) return dayOf(up.createdAt);
    return c.boosted && c.boostedAt ? dayOf(c.boostedAt) : null;
  };
  const dist = { d0: 0, d1: 0, d2: 0, more: 0 };
  const fromPaper: number[] = [];
  let windows = 0;
  let cast = 0;
  for (const c of i.characters) {
    const mine = i.ballots.filter((b) => b.voterId === c.id).sort((a, b) => a.day - b.day);
    const r2 = rankDay(c, 2);
    const first = mine[0];
    if (first && r2 !== null) {
      const d = first.day - r2;
      if (d <= 0) dist.d0 += 1;
      else if (d === 1) dist.d1 += 1;
      else if (d === 2) dist.d2 += 1;
      else dist.more += 1;
    }
    for (const b of mine) {
      const read = i.paperReads.find((p) => p.characterId === c.id && p.day === b.day)?.readAt;
      if (read && b.createdAt >= read) fromPaper.push((b.createdAt.getTime() - read.getTime()) / 60_000);
    }
    if (r2 !== null) {
      for (const e of elections.filter((x) => x.cityId === c.homeCityId && x.status !== 'nominations')) {
        if (e.countDay - 1 < r2) continue; // the polls closed before the member could vote
        windows += 1;
        if (mine.some((b) => b.electionId === e.id)) cast += 1;
      }
    }
  }

  // First seat, natural and boosted.
  const seatBlock = (boosted: boolean) => {
    const people = i.characters.filter((c) => c.boosted === boosted);
    const toCand: number[] = [];
    const toSeat: number[] = [];
    const seen: number[] = [];
    let seenOnCountDay = 0;
    let seenTotal = 0;
    let quickAct = 0;
    let seats = 0;
    let votesCast = 0;
    for (const c of people) {
      const cands = i.candidacies
        .filter((x) => x.characterId === c.id)
        .sort((a, b) => a.filedDay - b.filedDay);
      const r3 = rankDay(c, 3);
      if (cands[0] && r3 !== null) toCand.push(cands[0].filedDay - r3);
      const terms = i.terms.filter((t) => t.playerId === c.id).sort((a, b) => a.fromDay - b.fromDay);
      if (cands[0] && terms[0]) toSeat.push(terms[0].fromDay - cands[0].filedDay);
      seats += terms.length;
      for (const t of terms) {
        const p = i.papers.find((x) => x.id === t.councilKey);
        if (p?.votes.some((v) => v.characterId === c.id)) votesCast += 1;
        if (!t.frontPageSeenAt) continue;
        seenTotal += 1;
        seen.push((t.frontPageSeenAt.getTime() - t.fromDay * DAY_MS) / H);
        if (dayOf(t.frontPageSeenAt) === t.fromDay) seenOnCountDay += 1;
        const acts = [
          ...(p?.items.filter((x) => x.characterId === c.id).map((x) => x.at) ?? []),
          ...(p?.votes.filter((x) => x.characterId === c.id).map((x) => x.at) ?? []),
        ].filter((at) => at >= t.frontPageSeenAt!);
        const firstAct = acts.sort((a, b) => a.getTime() - b.getTime())[0];
        if (firstAct && firstAct.getTime() - t.frontPageSeenAt.getTime() <= 30 * 60_000) quickAct += 1;
      }
    }
    return {
      players: people.length,
      rank3ToCandidacyDays: median(toCand),
      candidacyToSeatDays: median(toSeat),
      seats,
      frontPageSeenHours: seen.length ? round(median(seen)!, 1) : null,
      frontPageSeenOnCountDay: seats ? round(ratio(seenOnCountDay, seats)) : null,
      actInChamberWithin30Min: seenTotal ? round(ratio(quickAct, seenTotal)) : null,
      councilVoteRate: seats ? round(ratio(votesCast, seats)) : null,
    };
  };

  // The morning after the count: did they come back the day after?
  const activeOn = (id: string, day: number) =>
    i.actions.some((a) => a.characterId === id && dayOf(a.createdAt) === day) ||
    i.paperReads.some((p) => p.characterId === id && p.day === day && p.readAt !== null);
  const groups = { winners: [0, 0], losers: [0, 0], voters: [0, 0], nonVoters: [0, 0] };
  for (const e of elections.filter((x) => x.result)) {
    const next = e.countDay + 1;
    for (const r of e.result!.rows.filter((x) => x.kind === 'player')) {
      const g = r.seated ? groups.winners : groups.losers;
      g[1]! += 1;
      if (activeOn(r.key.slice(2), next)) g[0]! += 1;
    }
    const voters = new Set(i.ballots.filter((b) => b.electionId === e.id).map((b) => b.voterId));
    for (const c of i.characters.filter((x) => x.homeCityId === e.cityId)) {
      const r2 = rankDay(c, 2);
      if (r2 === null || r2 > e.countDay - 1) continue;
      const g = voters.has(c.id) ? groups.voters : groups.nonVoters;
      g[1]! += 1;
      if (activeOn(c.id, next)) g[0]! += 1;
    }
  }
  const rate = (g: number[]) => (g[1]! ? round(ratio(g[0]!, g[1]!)) : null);

  const morale = i.morale.map((m) => {
    const days = { fired: 0, steady: 0, unrest: 0 };
    let crossings = 0;
    m.log.forEach((l, idx) => {
      days[l.state] += 1;
      if (idx > 0 && m.log[idx - 1]!.state !== l.state) crossings += 1;
    });
    return {
      cityId: m.cityId,
      days,
      crossings,
      firstFiredDay: m.log.find((l) => l.state === 'fired')?.day ?? null,
    };
  });

  const nearMidnight = i.actions.filter((a) => {
    const t = a.createdAt.getTime() % DAY_MS;
    return t < 10 * 60_000 || t > DAY_MS - 10 * 60_000;
  });

  return {
    elections: electionRows,
    councils,
    firstVote: {
      distribution: dist,
      medianMinutesFromPaper: fromPaper.length ? round(median(fromPaper)!, 1) : null,
      windowTurnout: windows ? round(ratio(cast, windows)) : null,
    },
    firstSeat: { natural: seatBlock(false), boosted: seatBlock(true) },
    nextDayReturn: {
      winners: rate(groups.winners),
      losers: rate(groups.losers),
      voters: rate(groups.voters),
      nonVoters: rate(groups.nonVoters),
    },
    morale,
    contention: {
      actionsNearMidnight: nearMidnight.length,
      contendedNearMidnight: nearMidnight.length
        ? round(ratio(nearMidnight.filter((a) => a.txAttempts > 1).length, nearMidnight.length), 3)
        : null,
    },
  };
}
