import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { deductEnergy } from './energyService.js';
import { generateSeed, seededRandom } from '../lib/rng.js';
import type { CharacterFull } from '../types.js';

export const BAR_ACTIONS = {
  drink: {
    name: 'Have a Drink',
    description: 'A stiff drink settles the nerves. Grants a 30-minute +10% XP buff.',
    energyCost: 5,
    ironCost: 10,
    dailyLimit: 3,
  },
  meet_contact: {
    name: 'Meet a Contact',
    description: 'Buy a round for a local informant. They let something slip.',
    energyCost: 3,
    ironCost: 20,
    dailyLimit: 2,
  },
  gamble: {
    name: 'Gamble',
    description: 'Bet your Iron on a card game. 50/50 to double or lose.',
    energyCost: 2,
    ironCost: 0, // iron deducted from bet
    dailyLimit: 5,
  },
} as const;

type BarActionKey = keyof typeof BAR_ACTIONS;

/** Redis key for daily bar action counter */
function barKey(characterId: string, action: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `bar:${characterId}:${action}:${date}`;
}

export function listServices() {
  return Object.entries(BAR_ACTIONS).map(([id, svc]) => ({ id, ...svc }));
}

export async function performAction(
  character: CharacterFull,
  action: string,
  bet?: number,
): Promise<object> {
  const svc = BAR_ACTIONS[action as BarActionKey];
  if (!svc) throw new AppError(400, `Unknown bar action: ${action}`);

  // Daily limit check
  const key = barKey(character.id, action);
  const count = parseInt((await redis.get(key)) ?? '0', 10);
  if (count >= svc.dailyLimit) {
    throw AppError.dailyLimit(svc.name);
  }

  // Iron cost check
  const ironCost = action === 'gamble' ? (bet ?? 0) : svc.ironCost;
  if (character.ironMarks < ironCost) {
    throw AppError.insufficientIron(character.ironMarks, ironCost);
  }

  await deductEnergy(character.id, svc.energyCost);
  await prisma.character.update({
    where: { id: character.id },
    data: { ironMarks: { decrement: ironCost } },
  });

  // Increment daily counter (TTL = 26h to span midnight)
  await redis.setex(key, 93_600, String(count + 1));

  // Action-specific effects
  if (action === 'drink') {
    const buffKey = `buff:xp:${character.id}`;
    await redis.setex(buffKey, 1_800, '0.10'); // 30-min 10% XP buff
    return { effect: 'xp_buff', buffPct: 10, durationMinutes: 30 };
  }

  if (action === 'meet_contact') {
    // Generate a random intelligence snippet
    const snippets = [
      'Your contact mutters about a faction meeting planned for next week in the docks.',
      'A name is scrawled on a napkin: someone important is moving money.',
      'You overhear a shipment route that the Fascists don\'t want known.',
      'The barkeep leans in — the Communist cell leader has a second address.',
      'A loose tongue reveals the next police patrol schedule.',
    ];
    const seed = generateSeed();
    const idx = Math.floor(seededRandom(seed) * snippets.length);
    return { effect: 'intelligence', snippet: snippets[idx] };
  }

  if (action === 'gamble') {
    if (!bet || bet <= 0) throw new AppError(400, 'You must specify a bet amount > 0.');
    const seed = generateSeed();
    const win = seededRandom(seed) >= 0.5;
    const ironChange = win ? bet : -bet;
    await prisma.character.update({
      where: { id: character.id },
      data: { ironMarks: { increment: ironChange } },
    });
    return { effect: 'gamble', won: win, ironChange };
  }

  return { effect: 'unknown' };
}
