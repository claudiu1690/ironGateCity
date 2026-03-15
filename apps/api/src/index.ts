import 'dotenv/config';
import './types.js'; // register Express Request augmentation
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';

import { initSocket } from './socket/index.js';
import { startWorkers, scheduleRecurringJobs } from './jobs/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  registerLimiter,
  loginLimiter,
  missionStartLimiter,
  dossierSurveillanceLimiter,
  paymentsLimiter,
  defaultAuthLimiter,
} from './middleware/rateLimiter.js';

// ─── Route modules ───────────────────────────────────────────────────────────
import healthRouter    from './routes/health.js';
import authRouter      from './routes/auth.js';
import characterRouter from './routes/character.js';
import missionsRouter  from './routes/missions.js';
import equipmentRouter from './routes/equipment.js';
import dossierRouter   from './routes/dossier.js';
import jobsRouter      from './routes/jobs.js';
import cityRouter      from './routes/city.js';
import bodyguardsRouter from './routes/bodyguards.js';
import politicsRouter  from './routes/politics.js';
import paymentsRouter  from './routes/payments.js';

const app = express();
const httpServer = createServer(app);

// ─── Trust proxy (needed for accurate req.ip behind load balancer / Railway) ──
app.set('trust proxy', 1);

// ─── Core Middleware ─────────────────────────────────────────────────────────

app.use(helmet());
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL ?? '']
  : [/^http:\/\/localhost(:\d+)?$/]; // allow any localhost port in dev

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Stripe webhook must receive raw body — registered BEFORE express.json()
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// ─── Routes with scoped rate limiters ────────────────────────────────────────

app.use('/api/health', healthRouter);

// Auth — IP-based limits (unauthenticated routes)
app.post('/api/v1/auth/register', registerLimiter);
app.post('/api/v1/auth/login',    loginLimiter);
app.use('/api/v1/auth', authRouter);

// Payments — user-based, tight limit
app.use('/api/v1/payments', paymentsLimiter, paymentsRouter);

// Mission start — per-user, prevents energy drain exploit
app.post('/api/v1/missions/:id/start', missionStartLimiter);
app.use('/api/v1/missions', missionsRouter);

// Dossier surveillance — per-user hourly limit
app.post('/api/v1/dossier/surveillance', dossierSurveillanceLimiter);
app.use('/api/v1/dossier', dossierRouter);

// All other authenticated routes — 100 req/min per user
app.use('/api/v1', defaultAuthLimiter);
app.use('/api/v1/character',  characterRouter);
app.use('/api/v1/equipment',  equipmentRouter);
app.use('/api/v1/jobs',       jobsRouter);
app.use('/api/v1/city',       cityRouter);
app.use('/api/v1/bodyguards', bodyguardsRouter);
app.use('/api/v1/politics',   politicsRouter);

app.get('/', (_req, res) => {
  res.json({ name: 'Irongate City API', version: '1.0.0', status: 'online' });
});

// ─── Error Handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001);

async function bootstrap() {
  initSocket(httpServer);
  startWorkers();
  await scheduleRecurringJobs();

  httpServer.listen(PORT, () => {
    console.log(`\n[API] Irongate City API → http://localhost:${PORT}`);
    console.log(`[API] Environment: ${process.env.NODE_ENV ?? 'development'}\n`);
  });
}

bootstrap().catch((err) => {
  console.error('[API] Fatal startup error:', err);
  process.exit(1);
});
