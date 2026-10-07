/**
 * Review 4 (tech design docs/tech/review-4.md §18.3, T29): the playtest report's review-4 section.
 * Does each of the twenty-five notes read as answered in play? Pure maths over rows read from the
 * database; where a number says "nobody did this", the note's answer has not reached the players.
 *
 * - **The prologue** (#2): how far drafts get through the three beats, whom players help (the party),
 *   and how many reach the favour's result, how fast.
 * - **The journey** (#7): cards answered on the way (from their moment) and on arrival.
 * - **The Town Hall** (#11): the public gallery's sits, and the players who sat.
 * - **The cells** (#20): stays in the cells, the arrests that marked the record, and the day's orders
 *   taken off by them (every arrest from review 4 closes the day's orders, ADR 0078).
 */

/** The three beats' question ids, in order (content `origin.steps[n].questions[0].id`). */
export const BEATS = ['origin.platform', 'origin.suitcase', 'origin.lining'] as const;

export interface R4Arrival {
  answers: Array<{ questionId: string; answerId: string }>;
  completedAt: Date | null;
}

export interface R4Character {
  id: string;
  createdAt: Date;
  factionId: string;
}

export interface R4Action {
  characterId: string;
  createdAt: Date;
  actionId: string;
}

export interface R4Journey {
  card: boolean;
  /** The card's moment (`card.at`); null for a journey without a card or from before review 4. */
  cardAt: Date | null;
  choiceAt: Date | null;
  arrivesAt: Date;
}

export interface R4Stay {
  kind: 'cells' | 'infirmary';
  marks: number;
  since: Date;
}

export interface Review4Input {
  arrivals: R4Arrival[];
  characters: R4Character[];
  actions: R4Action[];
  journeys: R4Journey[];
  stays: R4Stay[];
  /** The favours' action ids (`use: 'welcome'`), from content. */
  favourIds: readonly string[];
  /** The Town Hall galleries' action ids, from content. */
  galleryIds: readonly string[];
}

export interface Review4Report {
  prologue: {
    drafts: number;
    /** Drafts (and joined players) with at least n beats answered. */
    beats: [number, number, number];
    /** Whom they helped on the platform, by answer id (`holm`, `stahl`, `grey`). */
    helped: Record<string, number>;
    joined: number;
  };
  favour: {
    /** Joined players who did the favour. */
    done: number;
    /** Of those, on their first City Day (the welcome day). */
    onDay1: number;
    /** Seconds from the join to the favour's result: median and 75th percentile. */
    joinToFavour: { median: number | null; p75: number | null };
  };
  journeys: {
    withCard: number;
    answered: number;
    /** Answered on the way (before the arrival), at or after the card's moment. */
    onTheWay: number;
    /** Answered in the arrival modal (the moment passed while away). */
    onArrival: number;
  };
  hall: { sits: number; players: number };
  cells: {
    stays: number;
    /** Arrests that put a mark on the record (from review 4: every one). */
    marked: number;
    marks: number;
    /** The day's orders taken off by an arrest (ADR 0078: every marked arrest in the cells). */
    ordersOff: number;
  };
}

const DAY = 86_400_000;
const dayOf = (d: Date) => Math.floor(d.getTime() / DAY);

function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]!;
}

export function buildReview4Report(i: Review4Input): Review4Report {
  const beatsOf = (a: R4Arrival) => BEATS.filter((q) => a.answers.some((x) => x.questionId === q)).length;
  const helped: Record<string, number> = {};
  for (const a of i.arrivals) {
    const p = a.answers.find((x) => x.questionId === BEATS[0]);
    if (p) helped[p.answerId] = (helped[p.answerId] ?? 0) + 1;
  }
  const favours = new Set(i.favourIds);
  const galleries = new Set(i.galleryIds);
  const joinedAt = new Map(i.characters.map((c) => [c.id, c.createdAt]));
  const firstFavour = new Map<string, Date>();
  for (const a of i.actions) {
    if (!favours.has(a.actionId)) continue;
    const prev = firstFavour.get(a.characterId);
    if (!prev || a.createdAt < prev) firstFavour.set(a.characterId, a.createdAt);
  }
  const waits: number[] = [];
  let onDay1 = 0;
  for (const [id, at] of firstFavour) {
    const joined = joinedAt.get(id);
    if (!joined) continue;
    waits.push(Math.round((at.getTime() - joined.getTime()) / 1000));
    if (dayOf(at) === dayOf(joined)) onDay1 += 1;
  }
  const sits = i.actions.filter((a) => galleries.has(a.actionId));
  const cards = i.journeys.filter((j) => j.card);
  const answered = cards.filter((j) => j.choiceAt !== null);
  const cells = i.stays.filter((s) => s.kind === 'cells');
  const marked = cells.filter((s) => s.marks > 0);
  return {
    prologue: {
      drafts: i.arrivals.length,
      beats: [1, 2, 3].map((n) => i.arrivals.filter((a) => beatsOf(a) >= n).length) as [number, number, number],
      helped,
      joined: i.arrivals.filter((a) => a.completedAt !== null).length,
    },
    favour: {
      done: [...firstFavour.keys()].filter((id) => joinedAt.has(id)).length,
      onDay1,
      joinToFavour: { median: percentile(waits, 0.5), p75: percentile(waits, 0.75) },
    },
    journeys: {
      withCard: cards.length,
      answered: answered.length,
      onTheWay: answered.filter((j) => j.choiceAt! < j.arrivesAt && (!j.cardAt || j.choiceAt! >= j.cardAt)).length,
      onArrival: answered.filter((j) => j.choiceAt! >= j.arrivesAt).length,
    },
    hall: { sits: sits.length, players: new Set(sits.map((a) => a.characterId)).size },
    cells: {
      stays: cells.length,
      marked: marked.length,
      marks: marked.reduce((s, x) => s + x.marks, 0),
      ordersOff: marked.length,
    },
  };
}

/** The section as rows for `console.table`, one table per note group. */
export function review4Tables(r: Review4Report): Array<{ title: string; rows: Array<Record<string, string | number>> }> {
  const helped = Object.entries(r.prologue.helped).map(([who, n]) => `${who} ${n}`).join(' · ') || '—';
  return [
    {
      title: 'Review 4 #2 · The Last Train In',
      rows: [
        {
          drafts: r.prologue.drafts,
          'beat 1 (the platform)': r.prologue.beats[0],
          'beat 2 (the suitcase)': r.prologue.beats[1],
          'beat 3 (the lining)': r.prologue.beats[2],
          joined: r.prologue.joined,
          helped,
          'the favour': r.favour.done,
          'favour on day 1': r.favour.onDay1,
          'join → favour median s': r.favour.joinToFavour.median ?? '—',
          'p75 s': r.favour.joinToFavour.p75 ?? '—',
        },
      ],
    },
    {
      title: 'Review 4 #7, #11, #20 · the journey, the Town Hall, the cells',
      rows: [
        {
          'cards drawn': r.journeys.withCard,
          answered: r.journeys.answered,
          'on the way': r.journeys.onTheWay,
          'on arrival': r.journeys.onArrival,
          'gallery sits': r.hall.sits,
          'gallery players': r.hall.players,
          'cells stays': r.cells.stays,
          'arrests marked': r.cells.marked,
          'marks added': r.cells.marks,
          'orders off': r.cells.ordersOff,
        },
      ],
    },
  ];
}
