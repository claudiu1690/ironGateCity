/**
 * `pnpm report:playtest`: the slice-1 playtest report, read-only, against MONGODB_URI (reads
 * apps/server/.env when it is not set). Prints a table per player and the overall numbers.
 * Add `--json` for machine-readable output.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getContent } from '@irongate/content';
import type { ActionResult } from '@irongate/rules';
import { ActionLog, Arrival, Character, PaperEntry, connectDb, disconnectDb } from '../src';
import { buildArrivalFunnels } from '../src/funnel';
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
  const characters = await Character.find({}, { name: 1, createdAt: 1, factionId: 1, job: 1 }).lean();
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
      actionId: 1,
    },
  ).lean();
  const papers = await PaperEntry.find({}, { characterId: 1, day: 1, readAt: 1 }).lean();

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
    logs.map((l) => {
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
  );

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...report, arrival: funnels }, null, 2));
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
        'returns 2–4 h': p.returns2to4h,
        '×3 share': p.x3Share,
        'paper read': p.paperReadRate,
        'orders/day': p.ordersPerDay,
        'shifts/day': p.shiftsPerDay,
        'level d1/d2/d3': p.levelByDay.join('/'),
      })),
    );
    console.log('Overall:');
    console.table(report.overall);
    const show = (title: string, f: Funnel) => {
      console.log(`\n${title}`);
      console.table(f.steps);
      console.table(f.times);
      console.table({
        'first action was welcome order A': f.firstActionMatch,
        'second tap was Again': f.secondTapAgain,
        'resumed after 10+ minutes': f.resumes,
      });
    };
    console.log(
      '\nDoes a brand-new player understand what to do in the first 10 minutes? (times in seconds)',
    );
    show('Arrival funnel, all factions', funnels.all);
    for (const [faction, f] of Object.entries(funnels.byFaction)) show(`Arrival funnel, ${faction}`, f);
  }
} finally {
  await disconnectDb();
}
