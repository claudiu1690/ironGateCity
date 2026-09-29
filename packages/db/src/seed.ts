import type { Content } from '@irongate/content';
import { City } from './models/city';

/**
 * Upsert one `cities` state document per content city with its baseline opinion (ADR 0003).
 * `$setOnInsert` only, so running it again never changes live state.
 */
export async function seed(content: Pick<Content, 'cities'>): Promise<{ inserted: number }> {
  const now = new Date();
  const result = await City.bulkWrite(
    content.cities.map((c) => ({
      updateOne: {
        filter: { _id: c.id },
        update: { $setOnInsert: { opinion: c.baselineOpinion, createdAt: now, updatedAt: now } },
        upsert: true,
        timestamps: false,
      },
    })),
  );
  return { inserted: result.upsertedCount };
}
