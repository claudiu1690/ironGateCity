/**
 * `pnpm report:playtest`: the playtest report, read-only, against MONGODB_URI (reads
 * apps/server/.env when it is not set). Prints a table per player and the overall numbers, the
 * arrival funnel (slice 2) and the elections section (slice 3, tech design §14.1), boosted testers
 * apart. Add `--json` for machine-readable output.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getContent } from '@irongate/content';
import type { ActionResult } from '@irongate/rules';
import {
  ActionLog,
  Arrival,
  Candidacy,
  Character,
  City,
  Election,
  OfficeTerm,
  OrderPaper,
  PaperEntry,
  RequestLog,
  Vote,
  connectDb,
  disconnectDb,
} from '../src';
import { buildElectionsReport } from '../src/elections';
import { buildArrivalFunnels, formatShare, jobTakeRows } from '../src/funnel';
import type { Funnel } from '../src/funnel';
import { buildPlaytestReport } from '../src/report';

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
    { name: 1, createdAt: 1, factionId: 1, job: 1, homeCityId: 1, playtest: 1 },
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
  const welcomeAction = (factionId: string) => {
    const f = content.factions.find((x) => x.id === factionId);
    const t = content.orderTemplates.find((x) => x.id === f?.welcomeOrders[0]);
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
      welcomeActionId: welcomeAction(c.factionId),
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

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...report, arrival: funnels, elections }, null, 2));
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
  }
} finally {
  await disconnectDb();
}
