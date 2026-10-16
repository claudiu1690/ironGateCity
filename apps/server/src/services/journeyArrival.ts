import type { GameContent } from '@irongate/content';
import { Character, Journey } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import { PATROL, asEquipment } from '@irongate/rules';
import { inTransaction } from './txn';

/**
 * Slice 4 (ADR 0025 §4): a journey's arrival, lazy or by the tidy `journey-arrive` job, the same
 * function for both: two conditional updates (the journey onTheWay → arrived, the character's
 * `cityId` and pointer), so it runs once however many runners race it.
 */

/** Settle a journey's arrival if it is due; true when this call settled it. */
export async function settleArrival(content: GameContent, journeyId: string, now: number): Promise<boolean> {
  const j = await Journey.findById(journeyId).lean<JourneyDoc>();
  if (!j || j.status !== 'onTheWay' || j.arrivesAt.getTime() > now) return false;
  return inTransaction(async (session) => {
    const moved = await Journey.updateOne(
      { _id: j._id, status: 'onTheWay' },
      { $set: { status: 'arrived', arrivedAt: new Date(now) } },
      { session },
    );
    if (moved.matchedCount === 0) return false;
    const c = await Character.findById(j.characterId, { firstCapitalArrivalAt: 1, outfits: 1 })
      .session(session)
      .lean<Pick<CharacterDoc, 'firstCapitalArrivalAt' | 'outfits'>>();
    const first = j.to === content.nation.capitalId && !c?.firstCapitalArrivalAt;
    // Slice 8 (T9, ADR 0051; tech design §3.2): dressed for arrival: plain clothes at the station.
    const dress = j.dress === 'plain' && c?.outfits?.plain ? asEquipment(c.outfits.plain) : null;
    await Character.updateOne(
      { _id: j.characterId, 'journey.id': j._id, 'journey.status': 'onTheWay' },
      {
        $set: {
          cityId: j.to,
          'journey.status': 'arrived',
          ...(first ? { firstCapitalArrivalAt: j.arrivesAt } : {}),
          ...(dress ? { equipment: dress, lastOutfit: 'plain' } : {}),
        },
        $inc: { version: 1 },
        // Review 5 (ADR 0081): no patrol stop within ten minutes of arriving by train.
        $max: { 'patrol.quietUntil': new Date(j.arrivesAt.getTime() + PATROL.quietAfterArrivalMs) },
      },
      { session },
    );
    return true;
  });
}

/** The lazy path (loadCharacter): a due journey arrives before anything reads where the character is. */
export async function ensureArrived(
  content: GameContent,
  c: CharacterDoc,
  now: number,
): Promise<CharacterDoc> {
  if (c.journey?.status !== 'onTheWay' || new Date(c.journey.arrivesAt).getTime() > now) return c;
  await settleArrival(content, c.journey.id.toHexString(), now);
  return (await Character.findById(c._id).lean<CharacterDoc>()) ?? c;
}
