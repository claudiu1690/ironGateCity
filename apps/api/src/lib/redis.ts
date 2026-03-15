import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));

// ─── Key Helpers ────────────────────────────────────────────────────────────

export const RedisKeys = {
  energy: (characterId: string) => `energy:${characterId}`,
  session: (userId: string) => `session:${userId}`,
  dossierFresh: (entryId: string) => `dossier:fresh:${entryId}`,
} as const;
