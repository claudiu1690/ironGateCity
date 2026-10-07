/**
 * Review 4, T29 (tech design docs/tech/review-4.md §18.3): the playtest report's review-4 section.
 */
import { describe, expect, it } from 'vitest';
import { buildReview4Report, review4Tables } from '../src/review4Report';

const T0 = Date.UTC(2026, 9, 7, 9);
const at = (s: number) => new Date(T0 + s * 1000);
const answers = (n: number, helper = 'holm') =>
  [
    { questionId: 'origin.platform', answerId: helper },
    { questionId: 'origin.suitcase', answerId: 'books' },
    { questionId: 'origin.lining', answerId: 'ward-book' },
  ].slice(0, n);

describe('the review-4 section of the playtest report', () => {
  const report = buildReview4Report({
    arrivals: [
      { answers: answers(3), completedAt: at(60) },
      { answers: answers(3, 'stahl'), completedAt: at(90) },
      { answers: answers(1, 'grey'), completedAt: null },
      { answers: [], completedAt: null },
    ],
    characters: [
      { id: 'a', createdAt: at(60), factionId: 'collective' },
      { id: 'b', createdAt: at(90), factionId: 'vanguard' },
    ],
    actions: [
      { characterId: 'a', createdAt: at(120), actionId: 'coalport.union-hall.favour' },
      { characterId: 'b', createdAt: at(90 + 86_400), actionId: 'duskwall.beacon-house.favour' },
      { characterId: 'a', createdAt: at(300), actionId: 'coalport.town-hall.gallery' },
      { characterId: 'a', createdAt: at(400), actionId: 'coalport.town-hall.gallery' },
      { characterId: 'a', createdAt: at(500), actionId: 'coalport.mill-gate.canvass' },
    ],
    journeys: [
      { card: true, cardAt: at(100), choiceAt: at(150), arrivesAt: at(700) },
      { card: true, cardAt: at(100), choiceAt: at(800), arrivesAt: at(700) },
      { card: true, cardAt: at(100), choiceAt: null, arrivesAt: at(700) },
      { card: false, cardAt: null, choiceAt: null, arrivesAt: at(700) },
    ],
    stays: [
      { kind: 'cells', marks: 1, since: at(10) },
      { kind: 'cells', marks: 3, since: at(20) },
      { kind: 'cells', marks: 0, since: at(30) },
      { kind: 'infirmary', marks: 0, since: at(40) },
    ],
    favourIds: ['coalport.union-hall.favour', 'duskwall.beacon-house.favour', 'ashford.assembly-rooms.favour'],
    galleryIds: ['coalport.town-hall.gallery'],
  });

  it('counts the beats, whom players helped, the joins and the favours (and how fast)', () => {
    expect(report.prologue).toEqual({
      drafts: 4,
      beats: [3, 2, 2],
      helped: { holm: 1, stahl: 1, grey: 1 },
      joined: 2,
    });
    expect(report.favour).toEqual({ done: 2, onDay1: 1, joinToFavour: { median: 60, p75: 86_400 } });
  });

  it('cards on the way and on arrival; gallery sits; the cells’ marks and orders off', () => {
    expect(report.journeys).toEqual({ withCard: 3, answered: 2, onTheWay: 1, onArrival: 1 });
    expect(report.hall).toEqual({ sits: 2, players: 1 });
    expect(report.cells).toEqual({ stays: 3, marked: 2, marks: 4, ordersOff: 2 });
  });

  it('prints as two tables', () => {
    const t = review4Tables(report);
    expect(t.map((x) => x.title)).toEqual([
      'Review 4 #2 · The Last Train In',
      'Review 4 #7, #11, #20 · the journey, the Town Hall, the cells',
    ]);
    expect(t[0]!.rows[0]).toMatchObject({ helped: 'holm 1 · stahl 1 · grey 1', 'the favour': 2 });
  });
});
