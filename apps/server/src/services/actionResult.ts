import type { GameContent, LocatedAction } from '@irongate/content';
import type { CharacterDoc } from '@irongate/db';
import { projectEnergy } from '@irongate/rules';
import type { ActionResult, BonusTag, Tier1Resolution } from '@irongate/rules';
import { toCharacterView } from './characterService';

/**
 * The result modal payload (GDD §13.1a), built in one place from the pure resolution, the content
 * text and the character before and after. Stored verbatim in `actionLogs.result` and returned
 * unchanged, so a retried request shows the same modal. The client computes nothing.
 */
export function buildActionResult(i: {
  content: GameContent;
  logId: string;
  idempotencyKey: string;
  now: number;
  located: LocatedAction;
  resolution: Tier1Resolution;
  before: CharacterDoc;
  after: CharacterDoc;
}): ActionResult {
  const { city, location, action } = i.located;
  const { resolution: r, before } = i;
  const text = r.outcome === 'success' ? action.text.success : action.text.partial;
  const energyAfter = projectEnergy(r.energy.after, i.now);

  const bonusTags: BonusTag[] = [];
  if (r.energy.restedUsed > 0) {
    // §6.3 modal tag: "Rested: 3 of 10 Energy, +15 % XP and Iron".
    const pct = Math.round((50 * r.energy.restedUsed) / r.energy.cost);
    bonusTags.push({
      id: 'rested',
      label: 'Rested',
      note: `${r.energy.restedUsed} of ${r.energy.cost} Energy, +${pct} % XP and Iron`,
    });
  }

  return {
    logId: i.logId,
    idempotencyKey: i.idempotencyKey,
    performedAt: new Date(i.now).toISOString(),
    seed: r.seed,
    place: {
      cityId: city.id,
      cityName: city.name,
      locationId: location.id,
      locationName: location.name,
      kind: location.kind,
    },
    action: { id: action.id, name: action.name, type: action.type, tier: action.tier },
    stamp: r.outcome === 'success' ? 'success' : 'partial',
    headline: text.headline,
    body: text.body,
    attempts: r.attempts,
    rewards: r.rewards,
    bonusTags,
    effects: {
      energy: {
        before: r.energy.before.value,
        after: r.energy.after.value,
        max: r.energy.before.max,
        nextTickAt: energyAfter.nextTickAt,
      },
      rested: { before: r.energy.before.rested, after: r.energy.after.rested },
      xp: { before: before.xp, after: before.xp + r.rewards.xp.total },
      fxp: { before: before.fxp, after: before.fxp + r.rewards.fxp.total },
      iron: { before: before.iron, after: before.iron + r.rewards.iron.total },
      level: i.after.level,
      // Slice 0 reports the swing but does not move the meter (tech design §15).
      opinion: { cityId: city.id, factionId: before.factionId, delta: r.rewards.opinion, applied: false },
    },
    character: toCharacterView(i.after, i.now, i.content),
  };
}
