import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { seedEnergyInRedis } from './energyService.js';
import type { AuthPayload } from '../middleware/auth.js';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_TTL_S = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── Token helpers ────────────────────────────────────────────────────────────

function issueAccessToken(userId: string, characterId: string): string {
  return jwt.sign(
    { userId, characterId } satisfies AuthPayload,
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: ACCESS_EXPIRY },
  );
}

function issueRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: REFRESH_EXPIRY },
  );
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  await redis.setex(`session:${userId}`, REFRESH_TTL_S, token);
}

// ─── Auth operations ──────────────────────────────────────────────────────────

export async function register(data: {
  email: string;
  username: string;
  password: string;
  characterName?: string;
}) {
  const { email, username, password } = data;
  const characterName = data.characterName ?? username;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new AppError(409, `That ${field} is already taken.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Fetch the default city (Irongate)
  const defaultCity = await prisma.city.findUnique({ where: { slug: 'irongate' } });
  if (!defaultCity) throw new AppError(500, 'Default city not found — has the database been seeded?');

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      character: {
        create: {
          name: characterName,
          // Faction is set as a placeholder; player chooses via /character/faction
          faction: 'FASCIST',
          currentCityId: defaultCity.id,
          energy: { create: { current: 100, max: 100 } },
          equipment: { create: {} },
        },
      },
    },
    include: { character: true },
  });

  const character = user.character!;

  // Seed energy in Redis
  await seedEnergyInRedis(character.id, 100, 100);

  const accessToken = issueAccessToken(user.id, character.id);
  const refreshToken = issueRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, username: user.username },
    character: { id: character.id, name: character.name, originStoryComplete: false },
    isNewCharacter: true,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { character: { include: { currentCity: true } } },
  });
  if (!user) throw AppError.unauthorised('Invalid email or password.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.unauthorised('Invalid email or password.');

  const character = user.character;
  if (!character) throw new AppError(404, 'No character found for this account.');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = issueAccessToken(user.id, character.id);
  const refreshToken = issueRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, username: user.username, isPremium: user.isPremium },
    character: {
      id: character.id,
      name: character.name,
      faction: character.faction,
      level: character.level,
      currentCity: character.currentCity.name,
      originStoryComplete: character.originStoryComplete,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload: { userId: string; type: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as typeof payload;
  } catch {
    throw AppError.unauthorised('Invalid or expired refresh token.');
  }

  if (payload.type !== 'refresh') throw AppError.unauthorised('Invalid token type.');

  const stored = await redis.get(`session:${payload.userId}`);
  if (!stored || stored !== refreshToken) {
    throw AppError.unauthorised('Refresh token not recognised — please log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { character: true },
  });
  if (!user?.character) throw new AppError(404, 'User not found.');

  const newAccessToken = issueAccessToken(user.id, user.character.id);
  const newRefreshToken = issueRefreshToken(user.id);
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string): Promise<void> {
  await redis.del(`session:${userId}`);
}
