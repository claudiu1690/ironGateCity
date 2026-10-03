import type { GameContent } from '@irongate/content';
import { City, IssueModel, issueDocId } from '@irongate/db';
import type { CityDoc } from '@irongate/db';
import { dayKey, weekOf } from '@irongate/rules';
import { settleCityDay } from '../services/cityDay';

/**
 * The e2e Issues hook (`POST /api/test/issues`, memory mode only): this week's live Issues of a city
 * set to the given ones (none clears them), so a spec that pins opinion or ticket numbers does not
 * depend on the calendar's draw. No game rule here: the documents are the ones the draw writes.
 */
export async function setWeekIssues(
  content: GameContent,
  cityId: string,
  issueIds: string[],
  now: number,
): Promise<{ weekDay: number; live: string[] }> {
  const eligible = content.issuesFor(cityId);
  const unknown = issueIds.filter((id) => !eligible.some((x) => x.issue.id === id));
  if (unknown.length > 0) throw new RangeError(`not eligible in ${cityId}: ${unknown.join(', ')}`);
  await settleCityDay(content, cityId, now);
  const week = weekOf(dayKey(now));
  await IssueModel.deleteMany({ cityId, weekDay: week });
  const docs = issueIds.slice(0, 2).map((issueId, i) => {
    const where = eligible.find((x) => x.issue.id === issueId)!;
    return {
      _id: issueDocId(cityId, week, issueId),
      cityId,
      districtId: where.districtId,
      issueId,
      weekDay: week,
      order: (i + 1) as 1 | 2,
      seed: 'e2e',
      status: 'live' as const,
      momentum: { vanguard: 0, collective: 0, alliance: 0 },
      result: null,
      resolvedAt: null,
    };
  });
  if (docs.length > 0) await IssueModel.insertMany(docs);
  const city = await City.findById(cityId).lean<CityDoc>();
  await City.updateOne(
    { _id: cityId },
    {
      $set: {
        issues: {
          weekDay: week,
          live: docs.map((d) => ({
            docId: d._id,
            issueId: d.issueId,
            districtId: d.districtId,
            order: d.order,
          })),
          effects: city?.issues?.effects ?? [],
        },
      },
    },
  );
  return { weekDay: week, live: docs.map((d) => d.issueId) };
}
