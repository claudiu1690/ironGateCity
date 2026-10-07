/**
 * `pnpm report:playtest`: the playtest report, read-only, against MONGODB_URI (reads
 * apps/server/.env when it is not set). Prints a table per player and the overall numbers, the
 * arrival funnel (slice 2), the elections section (slice 3, tech design §14.1), the battleground (slice
 * 4), risk (slice 5, tech design §15.2) and review 4 (tech design docs/tech/review-4.md §18.3: the
 * prologue, the favour, the journey's cards, the Town Hall, the cells' marks and orders off), boosted
 * testers apart where a section says so. Add `--json` for machine-readable output.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getContent, isWelcomeAction } from '@irongate/content';
import { bestTrainedStat } from '@irongate/rules';
import type { ActionResult } from '@irongate/rules';
import {
  ActionLog,
  Arrival,
  Award,
  Candidacy,
  Character,
  City,
  Contribution,
  District,
  Election,
  Encounter,
  InfluenceLedger,
  IssueModel,
  Journey,
  OfficeTerm,
  OrderPaper,
  PaperEntry,
  RequestLog,
  Stay,
  Vote,
  connectDb,
  disconnectDb,
} from '../src';
import { buildBattlegroundReport } from '../src/battleground';
import type { Faction } from '../src/battleground';
import { buildElectionsReport } from '../src/elections';
import { buildArrivalFunnels, formatShare, jobTakeRows } from '../src/funnel';
import type { Funnel } from '../src/funnel';
import { buildPlaytestReport } from '../src/report';
import { buildRiskReport, riskTables } from '../src/risk';
import type { RiskResult } from '../src/risk';
import { buildReview4Report, review4Tables } from '../src/review4Report';

const serverEnv = fileURLToPath(new URL('../../../apps/server/.env', import.meta.url));
if (!process.env.MONGODB_URI && existsSync(serverEnv)) process.loadEnvFile(serverEnv);
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set (set it, or create apps/server/.env from .env.example).');
  process.exit(1);
}

await connectDb(uri, { log: console.log });
try {
  const characters = await Character.find(
    {},
    { name: 1, createdAt: 1, factionId: 1, job: 1, homeCityId: 1, playtest: 1, stats: 1, residence: 1 },
  ).lean();
  const arrivals = await Arrival.find({}).lean();
  const logs = await ActionLog.find(
    {},
    {
      characterId: 1,
      createdAt: 1,
      kind: 1,
      times: 1,
      txAttempts: 1,
      'result.effects.energy': 1,
      'result.effects.level': 1,
      'result.effects.orders': 1,
      'result.effects.ordersAllDone': 1,
      'result.effects.rankUp': 1,
      actionId: 1,
      cityId: 1,
      'result.effects.opinion.placeId': 1,
    },
  ).lean();
  const papers = await PaperEntry.find({}, { characterId: 1, day: 1, readAt: 1 }).lean();
  // QA m2: taking a job is a request log (ADR 0008), not an action log; it completes order C.
  // Request logs expire after 7 days, so run the report within a week of the playtest.
  const jobTakes = await RequestLog.find(
    { kind: 'job.take' },
    {
      characterId: 1,
      createdAt: 1,
      'result.job.id': 1,
      'result.outcome': 1,
      'result.character.orders.allDone': 1,
    },
  ).lean();

  const report = buildPlaytestReport(
    characters.map((c) => ({ id: c._id.toHexString(), name: c.name, createdAt: c.createdAt })),
    logs.map((l) => {
      const effects = (l.result as Partial<ActionResult> | undefined)?.effects;
      return {
        characterId: l.characterId.toHexString(),
        createdAt: l.createdAt,
        kind: l.kind ?? 'checked',
        times: l.times ?? 1,
        txAttempts: l.txAttempts ?? 1,
        energy: effects ? effects.energy.before - effects.energy.after : 0,
        level: effects?.level ?? 1,
        ordersCompleted: effects?.orders?.filter((o) => o.fxp > 0).length ?? 0,
      };
    }),
    papers.map((p) => ({ characterId: p.characterId.toHexString(), day: p.day, read: p.readAt !== null })),
  );

  // Slice 2 (tech design §14.1): the arrival funnel, overall and per faction.
  const content = getContent();
  // Review 4 (§7.5, ADR 0073): the first landing opens the favour (welcome slot B) at the HQ, so the
  // first action that "matches" is the favour. (Review 1's slot A by the best stat is kept for a party
  // without a welcome ticket.)
  const welcomeAction = (c: { factionId: string; stats: { str: number; int: number; agi: number } }) => {
    const f = content.factions.find((x) => x.id === c.factionId);
    if (!f) return '';
    const b = content.orderTemplates.find((x) => x.id === f.welcomeOrders.B);
    if (b?.use === 'welcome' && b.match.actionIds?.[0]) return b.match.actionIds[0];
    const bonus = f.startingBonus;
    const prefer = (['str', 'int', 'agi'] as const).reduce(
      (a, s) => ((bonus[s] ?? 0) > (bonus[a] ?? 0) ? s : a),
      'int',
    );
    const t = content.orderTemplates.find(
      (x) => x.id === f.welcomeOrders.A[bestTrainedStat(c.stats, prefer)],
    );
    return t?.match.actionIds?.[0] ?? '';
  };
  const funnels = buildArrivalFunnels(
    arrivals.map((a) => ({
      userId: a.userId,
      createdAt: a.createdAt,
      hasFace: a.avatarId !== null,
      answeredAt: a.answers.map((x) => x.at),
      completedAt: a.completedAt,
      factionId: a.factionId,
      characterId: a.characterId ? a.characterId.toHexString() : null,
    })),
    characters.map((c) => ({
      id: c._id.toHexString(),
      factionId: c.factionId,
      createdAt: c.createdAt,
      jobSinceDay: c.job?.since ?? null,
      welcomeActionId: welcomeAction(c),
    })),
    [
      ...logs.map((l) => {
        const effects = (l.result as Partial<ActionResult> | undefined)?.effects;
        return {
          characterId: l.characterId.toHexString(),
          createdAt: l.createdAt,
          kind: l.kind ?? 'checked',
          actionId: l.actionId,
          ordersCompleted: effects?.orders?.filter((o) => o.fxp > 0).length ?? 0,
          allOrdersDone: !!effects?.ordersAllDone,
        };
      }),
      ...jobTakeRows(
        jobTakes.map((j) => ({
          characterId: j.characterId.toHexString(),
          createdAt: j.createdAt,
          result: j.result,
        })),
      ),
    ],
  );

  // Slice 3 (tech design §14.1): the elections, from the domain collections. Ballots are read
  // without their choice; the NPC share is aggregated per election (ADR 0019).
  const npcBallots = await Vote.aggregate<{ _id: string; npc: number; total: number }>([
    {
      $group: {
        _id: '$electionId',
        npc: { $sum: { $cond: [{ $eq: [{ $substrCP: ['$candidateKey', 0, 2] }, 'n:'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);
  const elections = buildElectionsReport({
    elections: (await Election.find({}).lean()).map((e) => ({
      id: e._id,
      cityId: e.cityId,
      cycle: e.cycle,
      nominationsFrom: e.nominationsFrom,
      pollsFrom: e.pollsFrom,
      countDay: e.countDay,
      status: e.status,
      ballot: e.ballot?.map((b) => ({ kind: b.kind, key: b.key })) ?? null,
      result: e.result
        ? {
            rows: e.result.rows.map((r) => ({
              key: r.key,
              kind: r.kind,
              total: r.total,
              seated: r.seated,
              place: r.place,
            })),
            turnout: e.result.turnout,
            npcSeats: e.result.npcSeats,
          }
        : null,
    })),
    candidacies: (await Candidacy.find({}).lean()).map((c) => ({
      electionId: c.electionId,
      characterId: c.characterId.toHexString(),
      status: c.status,
      filedDay: c.filedDay,
      members: c.endorsements.length,
      branch: c.branch !== null,
      smallBranch: c.smallBranch,
    })),
    ballots: (await Vote.find({}, { electionId: 1, voterId: 1, day: 1, createdAt: 1 }).lean()).map((v) => ({
      electionId: v.electionId,
      voterId: v.voterId.toHexString(),
      day: v.day,
      createdAt: v.createdAt,
    })),
    npcBallots: npcBallots.map((b) => ({ electionId: b._id, npc: b.npc, total: b.total })),
    terms: (await OfficeTerm.find({}).lean()).map((t) => ({
      cityId: t.cityId,
      councilKey: t.councilKey,
      fromDay: t.fromDay,
      toDay: t.toDay,
      playerId: t.holder.kind === 'player' ? t.holder.characterId.toHexString() : null,
      frontPageSeenAt: t.frontPageSeenAt,
    })),
    papers: (await OrderPaper.find({}).lean()).map((p) => ({
      id: p._id,
      cityId: p.cityId,
      items: p.items.map((x) => ({
        kind: x.movedBy.kind,
        characterId: x.movedBy.kind === 'player' ? x.movedBy.characterId.toHexString() : null,
        at: x.at,
      })),
      votes: p.votes.map((v) => ({ characterId: v.characterId.toHexString(), at: v.at })),
      status: p.status,
      passed: p.division?.passed ?? null,
      inForce: p.division?.inForce ?? null,
    })),
    morale: (await City.find({}, { moraleLog: 1 }).lean()).map((c) => ({
      cityId: c._id,
      log: c.moraleLog ?? [],
    })),
    characters: characters.map((c) => ({
      id: c._id.toHexString(),
      name: c.name,
      homeCityId: c.homeCityId,
      createdAt: c.createdAt,
      boosted: c.playtest?.boosted === true,
      boostedAt: c.playtest?.boostedAt ?? null,
    })),
    actions: logs.map((l) => ({
      characterId: l.characterId.toHexString(),
      createdAt: l.createdAt,
      cityId: l.cityId,
      kind: l.kind ?? 'checked',
      txAttempts: l.txAttempts ?? 1,
      rankTo: (l.result as Partial<ActionResult> | undefined)?.effects?.rankUp?.to ?? null,
    })),
    paperReads: papers.map((p) => ({
      characterId: p.characterId.toHexString(),
      day: p.day,
      readAt: p.readAt,
    })),
  });

  // Slice 4 (tech design §15.2): the battleground. Moves and rooms come from request logs (seven days).
  const capitalId = content.nation.capitalId;
  const byChar = (id: string) =>
    logs.filter((l) => l.characterId.toHexString() === id).sort((a, b) => +a.createdAt - +b.createdAt);
  const firstAt = (id: string, ok: (e: Partial<ActionResult>['effects']) => boolean) =>
    byChar(id).find((l) => ok((l.result as Partial<ActionResult> | undefined)?.effects))?.createdAt ?? null;
  const factionOf = new Map(characters.map((c) => [c._id.toHexString(), c.factionId as Faction]));
  const regs = await RequestLog.find(
    { kind: { $in: ['residence.register', 'residence.room'] } },
    { characterId: 1, createdAt: 1, kind: 1, 'result.character.residence': 1 },
  ).lean();
  const battleground = buildBattlegroundReport({
    capitalId,
    districts: content.districtsOf(capitalId).map((q) => ({ id: q.id, name: q.name })),
    characters: characters.map((c) => {
      const id = c._id.toHexString();
      return {
        id,
        name: c.name,
        homeCityId: c.homeCityId,
        createdAt: c.createdAt,
        level10At: firstAt(id, (e) => (e?.level ?? 0) >= 10),
        rank2At: firstAt(id, (e) => (e?.rankUp?.to ?? 0) >= 2),
        residence: {
          cityId: c.residence?.cityId ?? c.homeCityId,
          districtId: c.residence?.districtId ?? null,
        },
        boosted: c.playtest?.boosted === true,
      };
    }),
    journeys: (await Journey.find({}).lean()).map((j) => ({
      characterId: j.characterId.toHexString(),
      from: j.from,
      to: j.to,
      boardedAt: j.boardedAt,
      arrivesAt: j.arrivesAt,
      closedAt: j.closedAt,
      card: j.card !== null,
      choiceAt: j.choice?.at ?? null,
      sleptThrough: j.sleptThrough,
    })),
    moves: regs
      .filter((r) => r.kind === 'residence.register')
      .map((r) => {
        // The register's stored result carries the character after the move.
        const to =
          (r.result as { character?: { residence?: { cityId: string; districtId: string | null } } } | null)
            ?.character?.residence ?? null;
        return {
          characterId: r.characterId.toHexString(),
          at: r.createdAt,
          cityId: to?.cityId ?? '',
          districtId: to?.districtId ?? null,
        };
      }),
    rooms: regs
      .filter((r) => r.kind === 'residence.room')
      .map((r) => ({ characterId: r.characterId.toHexString(), at: r.createdAt })),
    elections: (await Election.find({ kind: 'district', status: 'counted' }).lean()).map((e) => {
      const r = e.result as unknown as {
        w?: number;
        ballots?: number;
        tie?: 'draw' | null;
        turnout: { voters: number; eligible: number };
        rows: Array<{ seated: boolean; kind: 'player' | 'npc'; factionId?: Faction }>;
      };
      return {
        districtId: e.placeId ?? e.cityId,
        cycle: e.cycle,
        ballots: r.ballots ?? 0,
        w: r.w ?? 0,
        turnout: r.turnout,
        seats: r.rows
          .filter((x) => x.seated && x.factionId)
          .map((x) => ({ factionId: x.factionId!, kind: x.kind })),
        tie: r.tie ?? null,
      };
    }),
    councils: (await OrderPaper.find({ cityId: capitalId }).lean()).map((p) => {
      const passed = p.division?.passed ?? null;
      const npc =
        (p.division as unknown as { npcChoices?: Partial<Record<Faction, string>> } | null)?.npcChoices ?? {};
      return {
        councilKey: p._id,
        passed,
        coalition: passed
          ? [
              ...p.votes
                .filter((v) => v.choice === passed)
                .flatMap((v) => {
                  const f = factionOf.get(v.characterId.toHexString());
                  return f ? [f] : [];
                }),
              ...(Object.entries(npc) as Array<[Faction, string]>)
                .filter(([, c]) => c === passed)
                .map(([f]) => f),
            ]
          : [],
      };
    }),
    districtLogs: (await District.find({ cityId: capitalId }, { stateLog: 1 }).lean()).map((d) => ({
      districtId: d._id,
      log: (d.stateLog ?? []).map((x) => ({
        day: x.day,
        battleground: x.battleground,
        controlledBy: x.controlledBy,
      })),
    })),
    issues: (await IssueModel.find({}).lean()).map((x) => ({
      cityId: x.cityId,
      weekDay: x.weekDay,
      issueId: x.issueId,
      status: x.status,
      momentum: x.momentum,
      ownerId: x.result?.ownerId ?? null,
      top: x.result?.top.length ?? 0,
      effect: !!x.result?.effect,
    })),
    ledger: (
      await InfluenceLedger.find({ cityId: capitalId }, { placeId: 1, cycleKey: 1, kind: 1, swing: 1 }).lean()
    ).map((r) => ({ placeId: r.placeId, cycleKey: r.cycleKey, kind: r.kind, swing: r.swing })),
    contributions: (await Contribution.find({ cityId: capitalId }, { placeId: 1, ref: 1, kind: 1 }).lean()).map(
      (c) => ({ placeId: c.placeId, ref: c.ref, kind: c.kind }),
    ),
    heroes: (await Award.find({ kind: 'hero' }, { placeId: 1, ref: 1, bracket: 1 }).lean()).map((a) => ({
      placeId: a.placeId,
      ref: a.ref,
      bracket: a.bracket,
    })),
    actions: logs.map((l) => {
      const placeId = (l.result as Partial<ActionResult> | undefined)?.effects?.opinion?.placeId;
      return {
        cityId: l.cityId,
        districtId: l.cityId === capitalId && placeId ? placeId : null,
        txAttempts: l.txAttempts ?? 1,
        createdAt: l.createdAt,
      };
    }),
    slice4From: (await Journey.findOne({}).sort({ boardedAt: 1 }).lean())?.boardedAt ?? null,
  });

  // Slice 5 (tech design §15.2): risk, from actionLogs, encounters, stays, journeys and characters only.
  const riskLogs = await ActionLog.find(
    {},
    {
      characterId: 1,
      createdAt: 1,
      kind: 1,
      actionId: 1,
      cityId: 1,
      times: 1,
      outcome: 1,
      encounterId: 1,
      'result.action.type': 1,
      'result.mission': 1,
      'result.attempts.outcome': 1,
      'result.attempts.dropped': 1,
      'result.street': 1,
      'result.effects.fxp': 1,
      'result.effects.opinion': 1,
      'result.effects.heat': 1,
    },
  ).lean();
  const risk = buildRiskReport({
    now: new Date(),
    homeCities: content.factions.map((f) => ({ cityId: f.homeCityId, factionId: f.id })),
    characters: (
      await Character.find({}, { name: 1, factionId: 1, homeCityId: 1, 'record.marks': 1 }).lean()
    ).map((c) => ({
      id: c._id.toHexString(),
      name: c.name,
      factionId: c.factionId,
      homeCityId: c.homeCityId,
      marks: c.record?.marks ?? [],
    })),
    actionLogs: riskLogs.map((l) => ({
      characterId: l.characterId.toHexString(),
      createdAt: l.createdAt,
      kind: l.kind ?? 'checked',
      actionId: l.actionId,
      cityId: l.cityId,
      times: l.times ?? 1,
      outcome: l.outcome,
      encounterId: l.encounterId ? l.encounterId.toHexString() : null,
      result: (l.result as RiskResult | undefined) ?? null,
    })),
    encounters: (await Encounter.find({}, { held: 0, you: 0, chances: 0 }).lean()).map((e) => ({
      id: e._id.toHexString(),
      characterId: e.characterId.toHexString(),
      kind: e.kind,
      refId: e.refId,
      cityId: e.cityId,
      day: e.day,
      rivalGround: e.rivalGround,
      state: e.state,
      choice: e.choice,
      by: e.by,
      outcome: e.outcome,
      payOff: e.opponent?.payOff ?? null,
      createdAt: e.createdAt,
    })),
    stays: (await Stay.find({}, { result: 0, bail: 0 }).lean()).map((s) => ({
      characterId: s.characterId.toHexString(),
      kind: s.kind,
      cityId: s.cityId,
      rivalGround: s.rivalGround,
      since: s.since,
      releasedAt: s.releasedAt,
      how: s.how,
      ironPaid: s.ironPaid ?? 0,
      heatAtArrest: s.heatAtArrest,
      heatAfter: s.heatAfter,
    })),
    journeys: (await Journey.find({}, { fare: 0 }).lean()).map((j) => {
      // T17: a card's Heat is stored beside the choice (`choice.heat`, the field is Mixed).
      const choice = j.choice as
        | (NonNullable<typeof j.choice> & { heat?: { before: number; after: number } })
        | null;
      return {
        characterId: j.characterId.toHexString(),
        to: j.to,
        boardedAt: j.boardedAt,
        kind: j.kind ?? 'ticket',
        rivalGround: j.rivalGround === true,
        card: j.card ? { eventId: j.card.eventId, deck: j.card.deck ?? 'ordinary' } : null,
        choice: choice
          ? {
              choiceId: choice.choiceId,
              at: choice.at,
              flag: choice.result?.flag?.flag ?? null,
              heat: choice.heat ?? null,
            }
          : null,
        sleptThrough: j.sleptThrough,
      };
    }),
  });

  // Review 4 (T29): the notes in play: the prologue and the favour, cards on the way, the Town Hall,
  // the cells' marks and orders off.
  const allActions = content.cities.flatMap((c) => c.locations.flatMap((l) => l.actions));
  const review4 = buildReview4Report({
    arrivals: arrivals.map((a) => ({
      answers: a.answers.map((x) => ({ questionId: x.questionId, answerId: x.answerId })),
      completedAt: a.completedAt,
    })),
    characters: characters.map((c) => ({ id: c._id.toHexString(), createdAt: c.createdAt, factionId: c.factionId })),
    actions: logs.map((l) => ({ characterId: l.characterId.toHexString(), createdAt: l.createdAt, actionId: l.actionId })),
    journeys: (await Journey.find({}, { card: 1, choice: 1, arrivesAt: 1 }).lean()).map((j) => ({
      card: j.card !== null,
      cardAt: (j.card as { at?: Date } | null)?.at ?? null,
      choiceAt: j.choice?.at ?? null,
      arrivesAt: j.arrivesAt,
    })),
    stays: (await Stay.find({}, { kind: 1, marks: 1, since: 1 }).lean()).map((s) => ({
      kind: s.kind,
      marks: s.marks,
      since: s.since,
    })),
    favourIds: allActions.filter(isWelcomeAction).map((a) => a.id),
    galleryIds: allActions.filter((a) => a.id.endsWith('.gallery')).map((a) => a.id),
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...report, arrival: funnels, elections, battleground, risk, review4 }, null, 2));
  } else {
    console.log('\nIs spending a bar of Energy fun, and do players want to come back in 3 hours?\n');
    console.table(
      report.players.map((p) => ({
        player: p.name,
        actions: p.actions,
        days: p.daysActive,
        'sessions/day': p.sessionsPerDay,
        'energy/session': p.energyPerSession,
        'median return h': p.medianReturnHours,
        'returns 2–4 h': formatShare(p.returns2to4h),
        '×3 share': formatShare(p.x3Share),
        'paper read': formatShare(p.paperReadRate),
        'orders/day': p.ordersPerDay,
        'shifts/day': p.shiftsPerDay,
        'level d1/d2/d3': p.levelByDay.join('/'),
      })),
    );
    console.log('Overall:');
    console.table({
      ...report.overall,
      returns2to4h: formatShare(report.overall.returns2to4h),
      x3Share: formatShare(report.overall.x3Share),
      paperReadRate: formatShare(report.overall.paperReadRate),
      contendedTransactions: formatShare(report.overall.contendedTransactions),
    });
    const show = (title: string, f: Funnel) => {
      console.log(`\n${title}`);
      console.table(f.steps);
      console.table(f.times);
      console.table({
        // n12: shares as the game prints them, "62 %", beside the player counts.
        'first action was welcome order A': formatShare(f.firstActionMatch),
        'second tap was Again': formatShare(f.secondTapAgain),
        'resumed after 10+ minutes': f.resumes,
      });
    };
    console.log(
      '\nDoes a brand-new player understand what to do in the first 10 minutes? (times in seconds)',
    );
    show('Arrival funnel, all factions', funnels.all);
    for (const [faction, f] of Object.entries(funnels.byFaction)) show(`Arrival funnel, ${faction}`, f);

    console.log('\nDoes the first vote, and the first seat, feel like a big moment?\n');
    console.log('Elections');
    console.table(elections.elections);
    console.log('Councils');
    console.table(elections.councils);
    console.log('First vote (Rank 2 → first ballot, days)');
    console.table({
      ...elections.firstVote.distribution,
      'minutes from paper to ballot (median)': elections.firstVote.medianMinutesFromPaper,
      'ballots / eligible windows': formatShare(elections.firstVote.windowTurnout),
    });
    console.log('First seat: natural testers and boosted testers (the admin boost script)');
    console.table(elections.firstSeat);
    console.log('Next-day return after a count');
    console.table(elections.nextDayReturn);
    console.log('Morale');
    console.table(
      elections.morale.map((m) => ({
        city: m.cityId,
        fired: m.days.fired,
        steady: m.days.steady,
        unrest: m.days.unrest,
        crossings: m.crossings,
        'first Fired up day': m.firstFiredDay,
      })),
    );
    console.log('Contention around 00:00 UTC');
    console.table(elections.contention);

    const b = battleground;
    console.log('\nDo players choose to move to the capital, and does the three-way fight feel alive?\n');
    console.log('Travel');
    console.table({
      journeys: b.travel.journeys,
      travellers: b.travel.travellers,
      'journeys per traveller-day': b.travel.journeysPerTravellerDay,
      'cards drawn': b.travel.cards.drawn,
      'answered on the way': b.travel.cards.answeredOnTheWay,
      'answered on arrival': b.travel.cards.answeredOnArrival,
      'slept through': b.travel.cards.sleptThrough,
      'waited for the arrival (closed within 2 min)': formatShare(b.travel.dwell.waitedShare),
      'cards answered before arrival': formatShare(b.travel.answeredBeforeArrival),
      'first trip, days after Level 10 (median)': b.travel.firstTripDaysAfterLevel10.median,
    });
    console.table(b.travel.legs);
    console.log('Residence');
    console.table({
      movers: b.residence.movers,
      'first move, days after sign-up (median)': b.residence.firstMoveDay.median,
      'after Level 10': b.residence.firstMoveDay.afterLevel10,
      'after Rank 2': b.residence.firstMoveDay.afterRank2,
      'moves back home': b.residence.movesBackHome,
      rooms: b.residence.rooms,
    });
    console.table(b.residence.residents);
    console.log("The capital's counts");
    console.table(b.counts);
    console.log("The capital's councils");
    console.table(b.councils);
    console.log('District states');
    console.table(b.states);
    console.log('Issues of the Week');
    console.table(b.issues);
    console.log('The ledger');
    console.table(b.ledger.contributors);
    console.table(b.ledger.heroes);
    console.table({
      actions: formatShare(b.ledger.movedBy.actions),
      cards: formatShare(b.ledger.movedBy.cards),
      issues: formatShare(b.ledger.movedBy.issues),
      drift: formatShare(b.ledger.movedBy.drift),
    });
    console.log('Contention (transactions run more than once)');
    console.table(b.contention.capital.map((x) => ({ ...x, contended: formatShare(x.contended) })));
    console.table({
      'home, before slice 4': formatShare(b.contention.home.before),
      'home, after': formatShare(b.contention.home.after),
    });

    console.log('\nIs risk exciting rather than punishing? (all testers, boosted included)\n');
    for (const t of riskTables(risk)) {
      console.log(t.title);
      if (t.rows.length > 0) console.table(t.rows);
      else console.log('  none');
    }

    console.log('\nReview 4: does each of the twenty-five notes read as answered, in play?\n');
    for (const t of review4Tables(review4)) {
      console.log(t.title);
      console.table(t.rows);
    }
  }
} finally {
  await disconnectDb();
}
