import type { GameContent } from '@irongate/content';
import { City } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import { OPINION_FLOORS, addPressure, applyMoraleLoss, dayKey, moraleState } from '@irongate/rules';
import { z } from 'zod';
import { ensureCityDay } from '../services/cityDay';
import { toThousandths, writeLedger } from '../services/ledger';
import { inTransaction } from '../services/txn';
import { DevRefusal } from './risk';

const round3 = (x: number) => Math.round(x * 1_000) / 1_000;

/**
 * Review 5 (ADR 0082, T22): push a rival home city into Unrest as the caller, for the e2e and the dev
 * panel. Memory mode only (E2E_TEST_HOOKS). It stands in for a week of the caller's party work there:
 * one `action` ledger leg of `pushed` points against the home party in the caller's name (what the
 * prize's aggregate reads), the same points on the city's push ring (the header), and the home share
 * lowered to `share` with the morale record an act would write. No game rule here: whether and whom
 * the prize pays is decided by the next boundary (`processBoundary`), as in play.
 */
export const UnrestBody = z
  .object({
    cityId: z.string().min(1),
    /** Points the caller pushed (the prize needs 0.5). */
    pushed: z.number().min(0).max(10).default(1.8),
    /**
     * The home share after (under 59.8 stays in Unrest through the boundary's drift). A share of 60 or
     * more lifts the town out of Unrest first (from Neutral), so a spec can make a fresh entry.
     */
    share: z.number().min(50).max(80).default(58),
  })
  .strict();

export async function pushIntoUnrest(
  content: GameContent,
  c: CharacterDoc,
  body: z.output<typeof UnrestBody>,
  now: number,
): Promise<{ cityName: string; share: number; pushed: number }> {
  const spec = content.city(body.cityId);
  const home = spec?.homeFactionId;
  if (!spec || !home || home === c.factionId) throw new DevRefusal(400, 'cityId is a rival home city id');
  await ensureCityDay(content, spec.id, now);
  const today = dayKey(now);
  const at = new Date(now);
  const share = await inTransaction(async (session) => {
    const city = await City.findById(spec.id).session(session).lean<CityDoc>();
    if (!city?.opinion) throw new DevRefusal(409, `${spec.name} has no meter yet`);
    const o = city.opinion;
    const lift = Math.min(Math.max(0, body.share - o[home]), Math.max(0, o.neutral - OPINION_FLOORS.neutral));
    const moved =
      lift > 0
        ? { shares: { ...o, [home]: round3(o[home] + lift), neutral: round3(o.neutral - lift) } }
        : applyMoraleLoss(o, home, Math.max(0, o[home] - body.share));
    const pushedK = toThousandths(body.pushed);
    const after = moved.shares[home];
    const before = city.morale?.state ?? moraleState(city.opinion[home]);
    const state = moraleState(after);
    if (pushedK > 0)
      await writeLedger(
        content,
        [
          {
            cityId: spec.id,
            placeId: spec.id,
            factionId: home,
            swing: -body.pushed,
            kind: 'action',
            characterId: c._id,
            ref: `test:unrest:${now}`,
            day: today,
            at,
          },
        ],
        session,
      );
    await City.updateOne(
      { _id: spec.id },
      {
        $set: {
          opinion: moved.shares,
          ...(pushedK > 0
            ? { rivalPressure: addPressure(city.rivalPressure, today, pushedK, c.factionId) }
            : {}),
          ...(state !== before ? { morale: { state, since: today, previous: before } } : {}),
        },
      },
      { session },
    );
    return after;
  });
  return { cityName: spec.name, share, pushed: body.pushed };
}
