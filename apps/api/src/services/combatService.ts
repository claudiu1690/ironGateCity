import { prisma } from '../lib/prisma.js';
import { seededRandom, seededRandomInt } from '../lib/rng.js';
import type { CharacterFull } from '../types.js';

export interface CombatRound {
  round: number;
  playerDamage: number;
  npcDamage: number;
  playerHpAfter: number;
  npcHpAfter: number;
}

export interface CombatResult {
  outcome: 'WIN' | 'LOSS';
  hpRemaining: number;
  rounds: number;
  combatLog: CombatRound[];
}

/**
 * Resolves a PvE combat encounter.
 * All randomness is seeded so the log is fully reproducible.
 *
 * playerDamage = (char.str × 1.5) + weaponStrBonus + rand(0..10, seed) − npcDef(0)
 * npcDamage    = max(0, npcStr − charArmourDef)
 *              × bodyguard reduction (tier1=0.9, tier2=0.8, tier3=0.7)
 */
export async function resolveEncounter(
  character: CharacterFull,
  npcSlug: string,
  seed: string,
): Promise<CombatResult> {
  const npc = await prisma.npcTemplate.findUnique({ where: { slug: npcSlug } });
  if (!npc) {
    // Fallback if NPC not found — use generic city police stats
    return resolveWithStats(character, { str: 16, hp: 55 }, seed);
  }
  return resolveWithStats(character, { str: npc.str, hp: npc.hp }, seed);
}

function resolveWithStats(
  character: CharacterFull,
  npc: { str: number; hp: number },
  seed: string,
): CombatResult {
  const weaponBonus = character.equipment?.weapon?.strBonus ?? 0;
  const armourDef   = character.equipment?.armour?.defBonus ?? 0;

  // Bodyguard damage reduction — apply the highest tier active
  const bodyguardTiers = character.bodyguards.filter((b) => b.active).map((b) => b.tier);
  const maxTier = bodyguardTiers.length > 0 ? Math.max(...bodyguardTiers) : 0;
  const bgReduction = maxTier === 3 ? 0.7 : maxTier === 2 ? 0.8 : maxTier === 1 ? 0.9 : 1.0;

  let playerHp = character.currentHealth;
  let npcHp = npc.hp;
  const combatLog: CombatRound[] = [];

  for (let round = 1; round <= 10; round++) {
    const randBonus = seededRandomInt(`${seed}_r${round}_atk`, 0, 10);
    const playerDamage = Math.max(
      1,
      Math.floor(character.str * 1.5) + weaponBonus + randBonus,
    );

    const rawNpcDamage = Math.max(0, npc.str - armourDef);
    const npcDamage = Math.max(0, Math.floor(rawNpcDamage * bgReduction));

    npcHp -= playerDamage;
    playerHp -= npcDamage;

    combatLog.push({
      round,
      playerDamage,
      npcDamage,
      playerHpAfter: Math.max(0, playerHp),
      npcHpAfter: Math.max(0, npcHp),
    });

    if (npcHp <= 0) {
      return { outcome: 'WIN', hpRemaining: Math.max(1, playerHp), rounds: round, combatLog };
    }
    if (playerHp <= 0) {
      return { outcome: 'LOSS', hpRemaining: 0, rounds: round, combatLog };
    }
  }

  // 10 rounds exhausted — player wins if they dealt more total damage
  const playerTotalDmg = combatLog.reduce((s, r) => s + r.playerDamage, 0);
  const npcTotalDmg    = combatLog.reduce((s, r) => s + r.npcDamage, 0);
  const outcome = playerTotalDmg >= npcTotalDmg ? 'WIN' : 'LOSS';

  return { outcome, hpRemaining: Math.max(0, playerHp), rounds: 10, combatLog };
}
