import type { Content } from '@irongate/content';
import { Character } from '../models/character';
import { Candidacy, Election, OfficeTerm, OrderPaper } from '../models/politics';

/**
 * Slice 4 (tech design §5.9, ADR 0025, 0026): the travel and residence fields. Idempotent: every
 * step filters on its field's absence, so a second run changes nothing.
 *
 * 1. Characters live at home with every window open (`residence`), no journey, no room; an
 *    endorsement given keys its one-per-cycle guard by `cityCycle` (at home: the election id).
 * 2. Elections are home elections of their city; their ballot lines carry the election's faction.
 * 3. Candidacies carry their election's faction and place.
 * 4. Office terms carry their city's home faction, no district and no vacated day.
 * 5. Order-paper items carry the city's home faction on `movedBy`.
 *
 * Cities are not migrated: the capital bootstraps lazily and the home cities draw their first
 * Issues lazily (tech design §7.4). Returns the number of documents changed.
 */
export async function migrateSlice4TravelResidence(content: Pick<Content, 'cities'>): Promise<number> {
  let changed = 0;
  const homeFaction = new Map(content.cities.map((c) => [c.id, c.homeFactionId ?? null]));

  // 1. Characters (native pipelines: the residence comes from each document's own home).
  const chars = Character.collection;
  changed += (
    await chars.updateMany({ residence: { $exists: false } }, [
      {
        $set: {
          residence: {
            cityId: '$homeCityId',
            districtId: null,
            sinceDay: 0,
            votesFromDay: 0,
            standsFromDay: 0,
            canMoveFromDay: 0,
          },
        },
      },
    ])
  ).modifiedCount;
  for (const [field, value] of [
    ['journey', null],
    ['journeysMade', 0],
    ['journeyDeck', { seen: [] }],
    ['room', null],
    ['firstCapitalArrivalAt', null],
    ['lastQuoted', null],
  ] as const) {
    changed += (await chars.updateMany({ [field]: { $exists: false } }, { $set: { [field]: value } }))
      .modifiedCount;
  }
  changed += (
    await chars.updateMany({ endorsementsGiven: { $elemMatch: { cityCycle: { $exists: false } } } }, [
      {
        $set: {
          endorsementsGiven: {
            $map: {
              input: '$endorsementsGiven',
              as: 'e',
              in: { $mergeObjects: ['$$e', { cityCycle: { $ifNull: ['$$e.cityCycle', '$$e.electionId'] } }] },
            },
          },
        },
      },
    ])
  ).modifiedCount;

  // 2. Elections: home elections of their city, ballot lines with the election's faction.
  changed += (
    await Election.collection.updateMany({ kind: { $exists: false } }, [
      {
        $set: {
          kind: 'home',
          placeId: '$cityId',
          ballot: {
            $cond: [
              { $isArray: '$ballot' },
              {
                $map: {
                  input: '$ballot',
                  as: 'b',
                  in: { $mergeObjects: ['$$b', { factionId: { $ifNull: ['$$b.factionId', '$factionId'] } }] },
                },
              },
              '$ballot',
            ],
          },
        },
      },
    ])
  ).modifiedCount;

  // 3. Candidacies: their election's faction and place.
  const pending = await Candidacy.collection.distinct('electionId', { placeId: { $exists: false } });
  if (pending.length > 0) {
    const elections = await Election.collection
      .find({ _id: { $in: pending as never[] } }, { projection: { factionId: 1, placeId: 1, cityId: 1 } })
      .toArray();
    for (const e of elections) {
      const r = await Candidacy.collection.updateMany(
        { electionId: e._id as unknown as string, placeId: { $exists: false } },
        {
          $set: {
            placeId: (e.placeId as string | undefined) ?? (e.cityId as string),
            ...(e.factionId ? { factionId: e.factionId } : {}),
          },
        },
      );
      changed += r.modifiedCount;
    }
  }

  // 4. Office terms: the city's home faction; no district; never vacated.
  for (const [cityId, factionId] of homeFaction) {
    if (!factionId) continue;
    changed += (
      await OfficeTerm.collection.updateMany(
        { cityId, factionId: { $exists: false } },
        { $set: { factionId, districtId: null, vacatedDay: null } },
      )
    ).modifiedCount;
  }

  // 5. Order papers: every item's mover is of the city's home faction.
  for (const [cityId, factionId] of homeFaction) {
    if (!factionId) continue;
    changed += (
      await OrderPaper.collection.updateMany(
        { cityId, items: { $elemMatch: { 'movedBy.factionId': { $exists: false } } } },
        [
          {
            $set: {
              items: {
                $map: {
                  input: '$items',
                  as: 'it',
                  in: {
                    $mergeObjects: [
                      '$$it',
                      {
                        movedBy: {
                          $mergeObjects: [
                            '$$it.movedBy',
                            { factionId: { $ifNull: ['$$it.movedBy.factionId', factionId] } },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      )
    ).modifiedCount;
  }
  return changed;
}
