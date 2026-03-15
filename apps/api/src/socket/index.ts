import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket, Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../middleware/auth.js';

let io: SocketServer;
let worldNs: Namespace;   // /world — all clients, no auth
let playerNs: Namespace;  // /player — authenticated clients, per-user rooms

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── /world namespace — no authentication required ──────────────────────────
  worldNs = io.of('/world');
  worldNs.on('connection', (socket: Socket) => {
    console.log(`[Socket /world] Client connected: ${socket.id}`);
    socket.on('disconnect', () =>
      console.log(`[Socket /world] Client disconnected: ${socket.id}`),
    );
  });

  // ── /player namespace — JWT required ──────────────────────────────────────
  playerNs = io.of('/player');

  playerNs.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;
      socket.data.auth = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  playerNs.on('connection', (socket: Socket) => {
    const auth = socket.data.auth as AuthPayload;
    // Each player joins a personal room for targeted pushes
    socket.join(`user:${auth.userId}`);
    console.log(`[Socket /player] Authenticated: userId=${auth.userId}`);

    socket.on('disconnect', () =>
      console.log(`[Socket /player] Disconnected: userId=${auth.userId}`),
    );
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialised — call initSocket() first');
  return io;
}

// ─── /world Broadcast Helpers ─────────────────────────────────────────────────

/**
 * influence:update — after every mission that changes city influence.
 * Payload: { cityId, citySlug, fascistPct, communistPct, democratPct, nationalControl }
 */
export function broadcastInfluenceUpdate(citySlug: string, data: object) {
  safeWorldEmit('influence:update', data);
  safeWorldEmit('news:tick', { message: `Influence shifted in ${citySlug}.`, type: 'influence' });
}

/**
 * weather:change — emitted daily by the weather rotation job.
 * Payload: { season, weather, effectDescription }
 */
export function broadcastWeather(data: { season: string; weather: string; effectDescription: string }) {
  safeWorldEmit('weather:change', data);
  safeWorldEmit('news:tick', { message: `Weather changed: ${data.weather} (${data.season})`, type: 'weather' });
}

/**
 * law:activated — when a proposed law reaches majority.
 * Payload: { lawId, title, description, effect, expiresAt, proposedByFaction? }
 */
export function broadcastLawActivated(data: object) {
  safeWorldEmit('law:activated', data);
  safeWorldEmit('news:tick', { message: 'A new law has been enacted.', type: 'law' });
}

/**
 * law:expired — when the law:expire job runs.
 */
export function broadcastLawExpired(data: object) {
  safeWorldEmit('law:expired', data);
  safeWorldEmit('news:tick', { message: 'A law has expired and is no longer in effect.', type: 'law' });
}

/**
 * election:started — when national control crosses 55%.
 * Payload: { faction, nominationEnds, votingEnds }
 */
export function broadcastElectionStarted(data: object) {
  safeWorldEmit('election:started', data);
  safeWorldEmit('news:tick', { message: 'A faction election has begun — nominations are open.', type: 'election' });
}

/**
 * election:concluded — after votes are tallied.
 * Payload: { faction, winnerId, winnerName, voteCount }
 */
export function broadcastElectionConcluded(data: object) {
  safeWorldEmit('election:concluded', data);
  safeWorldEmit('news:tick', { message: 'An election has concluded — a new leader has been chosen.', type: 'election' });
}

/**
 * president:elected — after ActivePresident is created/updated.
 * Payload: { faction, characterId, name, termEnds }
 */
export function broadcastPresidentElected(data: object) {
  safeWorldEmit('president:elected', data);
  safeWorldEmit('news:tick', { message: 'A new President has been inaugurated.', type: 'president' });
}

/**
 * news:tick — general world event feed.
 * Can be called directly for arbitrary events.
 */
export function broadcastNewsTick(message: string, type: 'election' | 'law' | 'influence' | 'president' | 'weather') {
  safeWorldEmit('news:tick', { message, type });
}

// ─── /player Targeted Push Helpers ───────────────────────────────────────────

/** energy:updated — push to a specific player when energy changes significantly. */
export function pushEnergyUpdate(userId: string, data: { current: number; max: number }) {
  safePlayerEmit(userId, 'energy:updated', data);
}

/** health:updated — push to a specific player when HP changes. */
export function pushHealthUpdate(userId: string, data: { currentHealth: number; maxHealth: number }) {
  safePlayerEmit(userId, 'health:updated', data);
}

/** mission:completed — push result after a mission finishes. */
export function pushMissionCompleted(userId: string, data: object) {
  safePlayerEmit(userId, 'mission:completed', data);
}

/** hospitalised — push when character is knocked out. */
export function pushHospitalised(userId: string, data: { hospitalisedUntil: Date }) {
  safePlayerEmit(userId, 'hospitalised', data);
}

/** released — push when character is discharged from hospital. */
export function pushReleased(userId: string) {
  safePlayerEmit(userId, 'released', {});
}

/** dossier:stale — push when a dossier entry expires. */
export function pushDossierStale(userId: string, data: { entryId: string }) {
  safePlayerEmit(userId, 'dossier:stale', data);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function safeWorldEmit(event: string, data: object) {
  try {
    if (worldNs) worldNs.emit(event, data);
  } catch (err) {
    console.error(`[Socket] Failed to emit ${event} on /world:`, err);
  }
}

function safePlayerEmit(userId: string, event: string, data: object) {
  try {
    if (playerNs) playerNs.to(`user:${userId}`).emit(event, data);
  } catch (err) {
    console.error(`[Socket] Failed to emit ${event} to user:${userId}:`, err);
  }
}

// Legacy alias — keeps existing callers working during migration
export function broadcastLaw(data: object) {
  safeWorldEmit('law:activated', data);
}
