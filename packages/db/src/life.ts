import { DOSSIER, PATRON_TIERS, dayKey } from '@irongate/rules';
import type { DayKey, PatronTier } from '@irongate/rules';
import { formatShare } from './funnel';
import { TEST_MEMBER_PREFIX } from './together';

/**
 * The slice-8 playtest report (tech design §15.2, design §18 Q12): "does a life in the city give
 * players a reason to come back tomorrow?" Pure maths over rows read from `characters`, `actionLogs`,
 * `requestLogs`, `dossierEntries` and `legacyEntries`. **Test members** (`userId` starting `test:`) and
 * **boosted testers** are left out of every count; items with `source: 'test'` (the dev hooks) are not
 * counted as bought. The season's lines are deferred with the season (design §23).
 *
 * What the rows do not hold, and how the section handles it:
 * - **Outfit changes and worn Charisma by day** are not recorded (a wear or an outfit tap writes the
 *   character, not a log): the section says so instead of guessing.
 * - **Sales, rents paid and perks taken by day** come from `requestLogs`, which expire after 7 days
 *   (`REQUEST_LOG_TTL_SECONDS`): those counts are the last week's. Perks taken overall read the
 *   characters' `legacy.perks`.
 * - **Requests** are the stored ones: open (not done, before `untilDay`), done (paid at the next
 *   boundary), expired (past `untilDay`, not done). A Request paid and pruned is not counted.
 * - **The day-14 clocks** are rebuilt from what is stored: a name at two entries' worth or more (fresh 1,
 *   stale ½ at day 14, every entry landed by then, whatever became of it later); a patron visited by day
 *   14 and not yet Protégé then (any Favour short of a tier is within 30 of the next); rent paid through
 *   day 14 or later on a flat bought by then; an informant reporting on day 14. *A chapter dated* is
 *   not rebuilt (the Ambition state keeps only today's chapter).
 * - **Back at day 21** is any action log on the player's 21st City Day or later.
 */

export interface LifeCharacterRow {
  id: string;
  userId: string;
  boosted: boolean;
  /** The City Day of the character's creation. */
  joinDay: DayKey;
  inventory: Array<{ itemId: string; day: DayKey; source: string }>;
  patrons: Array<{
    id: string;
    favour: number;
    firstVisitDay: DayKey | null;
    tierDays: Partial<Record<PatronTier, DayKey>>;
    requests: Array<{ arrivedDay: DayKey; untilDay: DayKey; doneAt: number | null }>;
  }>;
  flat: { cityId: string; boughtDay: DayKey; paidThroughDay: DayKey } | null;
  legacy: { total: number; perks: Record<string, number> };
}

export interface LifeInput {
  now: Date;
  characters: LifeCharacterRow[];
  /** The catalogue's tier for each item id (null: no tier, e.g. a keepsake or a paper). */
  itemTier: Record<string, number | null>;
  actions: Array<{
    characterId: string;
    day: DayKey;
    kind: string;
    outcome: string;
    angle: 'plain' | 'headline' | null;
  }>;
  requests: Array<{ characterId: string; kind: string; day: DayKey }>;
  dossier: Array<{
    characterId: string;
    kind: 'entry' | 'file';
    subjectId: string;
    day: DayKey;
    source: string;
    status: string;
    informant: { fromDay: DayKey; untilDay: DayKey } | null;
  }>;
  legacy: Array<{ characterId: string; kind: string; points: number; day: DayKey }>;
}

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const share = (a: number, b: number): number | null => (b > 0 ? round(a / b, 3) : null);
const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : round((s[m - 1]! + s[m]!) / 2, 1);
};
/** Days since joining, in the report's weeks. */
const AGE_BUCKETS = [
  ['day 0–6', 0, 6],
  ['day 7–13', 7, 13],
  ['day 14–20', 14, 20],
  ['day 21–29', 21, 29],
  ['day 30+', 30, Infinity],
] as const;
const bucketOf = (d: number): string => AGE_BUCKETS.find(([, a, b]) => d >= a && d <= b)?.[0] ?? 'day 30+';

export function buildLifeReport(i: LifeInput) {
  const today = dayKey(i.now.getTime());
  const players = i.characters.filter((c) => !c.userId.startsWith(TEST_MEMBER_PREFIX) && !c.boosted);
  const ids = new Set(players.map((c) => c.id));
  const playerDays = players.reduce((n, c) => n + Math.max(1, today - c.joinDay + 1), 0);
  const actions = i.actions.filter((a) => ids.has(a.characterId));
  const requests = i.requests.filter((r) => ids.has(r.characterId));
  const dossier = i.dossier.filter((d) => ids.has(d.characterId));
  const legacy = i.legacy.filter((l) => ids.has(l.characterId));
  const reqCount = (kind: string) => requests.filter((r) => r.kind === kind).length;

  // ----- The Wardrobe ---------------------------------------------------------------------------
  const bought = players.flatMap((c) =>
    c.inventory
      .filter((x) => x.source === 'shop')
      .map((x) => ({ tier: i.itemTier[x.itemId] ?? null, age: x.day - c.joinDay })),
  );
  const tiers = [...new Set(bought.map((b) => b.tier))].sort((a, b) => (a ?? 0) - (b ?? 0));
  const boughtByTier = tiers.map((tier) => ({
    tier: tier === null ? 'no tier' : `Tier ${tier}`,
    ...Object.fromEntries(
      AGE_BUCKETS.map(([label]) => [
        label,
        bought.filter((b) => b.tier === tier && bucketOf(b.age) === label).length,
      ]),
    ),
    total: bought.filter((b) => b.tier === tier).length,
  }));

  // ----- The Dossier ----------------------------------------------------------------------------
  const entries = dossier.filter((d) => d.kind === 'entry');
  const sources = [...new Set(entries.map((e) => e.source))].sort();
  const held = entries.filter((e) => e.status === 'held');
  const exposes = actions.filter((a) => a.kind === 'expose');
  const exposeRows = (['plain', 'headline'] as const).map((angle) => ({
    angle: angle === 'plain' ? 'the facts, plainly' : 'the story, with a headline',
    success: exposes.filter((e) => e.angle === angle && e.outcome === 'success').length,
    partial: exposes.filter((e) => e.angle === angle && e.outcome === 'partial').length,
    failure: exposes.filter((e) => e.angle === angle && e.outcome === 'failure').length,
  }));

  // ----- Patrons --------------------------------------------------------------------------------
  const patronIds = [...new Set(players.flatMap((c) => c.patrons.map((p) => p.id)))].sort();
  const patrons = patronIds.map((pid) => {
    const rows = players.flatMap((c) => c.patrons.filter((p) => p.id === pid && p.firstVisitDay !== null));
    const favourPerDay = rows.map((p) => p.favour / Math.max(1, today - (p.firstVisitDay as DayKey) + 1));
    const reqs = rows.flatMap((p) => p.requests);
    return {
      patron: pid,
      visited: rows.length,
      'Favour per player-day': favourPerDay.length
        ? round(favourPerDay.reduce((a, b) => a + b, 0) / favourPerDay.length)
        : null,
      ...Object.fromEntries(
        PATRON_TIERS.map((t) => [
          `days to ${t} (median, reached)`,
          median(
            rows
              .filter((p) => p.tierDays[t] !== undefined)
              .map((p) => (p.tierDays[t] as DayKey) - (p.firstVisitDay as DayKey)),
          ),
        ]),
      ),
      'Requests open': reqs.filter((q) => !q.doneAt && q.untilDay >= today).length,
      'Requests done': reqs.filter((q) => !!q.doneAt).length,
      'Requests expired': reqs.filter((q) => !q.doneAt && q.untilDay < today).length,
    };
  });

  // ----- The home and Legacy --------------------------------------------------------------------
  const flats = players.filter((c) => c.flat);
  const lapsed = flats.filter(
    (c) => (c.flat as NonNullable<LifeCharacterRow['flat']>).paidThroughDay < today,
  );
  const perkNames = [...new Set(players.flatMap((c) => Object.keys(c.legacy.perks)))].sort();
  const thirty = players.filter((c) => today - c.joinDay >= 30);
  const legacyBy30 = thirty.map((c) =>
    legacy.filter((l) => l.characterId === c.id && l.day <= c.joinDay + 30).reduce((n, l) => n + l.points, 0),
  );

  // ----- The question: an unfilled clock at day 14, and day-21 return --------------------------
  const old = players.filter((c) => today - c.joinDay >= 21);
  const clocksAt14 = (c: LifeCharacterRow): string[] => {
    const d14 = c.joinDay + 14;
    const out: string[] = [];
    const weights = new Map<string, number>();
    for (const e of entries)
      if (e.characterId === c.id && e.day <= d14)
        weights.set(
          e.subjectId,
          (weights.get(e.subjectId) ?? 0) + (d14 - e.day < DOSSIER.freshDays ? 1 : 0.5),
        );
    if ([...weights.values()].some((w) => w >= 2)) out.push('a name');
    if (
      c.patrons.some(
        (p) =>
          p.firstVisitDay !== null &&
          p.firstVisitDay <= d14 &&
          !(p.tierDays.protege !== undefined && p.tierDays.protege <= d14),
      )
    )
      out.push('a patron');
    if (c.flat && c.flat.boughtDay <= d14 && c.flat.paidThroughDay >= d14) out.push('rent ahead');
    if (
      dossier.some(
        (d) =>
          d.characterId === c.id && d.informant && d.informant.fromDay <= d14 && d.informant.untilDay >= d14,
      )
    )
      out.push('an informant');
    return out;
  };
  const back21 = (c: LifeCharacterRow) =>
    actions.some((a) => a.characterId === c.id && a.day >= c.joinDay + 21);
  const withClock = old.filter((c) => clocksAt14(c).length > 0);
  const without = old.filter((c) => clocksAt14(c).length === 0);
  const clockKinds = ['a name', 'a patron', 'rent ahead', 'an informant'].map((k) => ({
    clock: k,
    players: old.filter((c) => clocksAt14(c).includes(k)).length,
  }));

  return {
    testers: players.length,
    playerDays,
    wardrobe: {
      boughtByTier,
      bought: bought.length,
      soldLastWeek: reqCount('shop.sell'),
      bribesLastWeek: reqCount('shop.bribe'),
      outfitChanges: null as null,
      wornChaByDay: null as null,
    },
    dossier: {
      bySource: sources.map((s) => ({
        source: s,
        entries: entries.filter((e) => e.source === s).length,
        'per player-day': round(entries.filter((e) => e.source === s).length / Math.max(1, playerDays), 3),
      })),
      entries: entries.length,
      staleShare: share(held.filter((e) => today - e.day >= DOSSIER.freshDays).length, held.length),
      files: dossier.filter((d) => d.kind === 'file').length,
      exposes: exposeRows,
      sold: dossier.filter((d) => d.status === 'sold').length,
      informants: dossier.filter((d) => d.status === 'informant').length,
    },
    patrons,
    home: {
      flats: flats.length,
      boughtOnDay: median(
        flats.map((c) => (c.flat as NonNullable<LifeCharacterRow['flat']>).boughtDay - c.joinDay),
      ),
      lapsedNow: lapsed.length,
      daysLapsed: median(
        lapsed.map((c) => today - (c.flat as NonNullable<LifeCharacterRow['flat']>).paidThroughDay - 1),
      ),
      rentsPaidLastWeek: reqCount('home.payRent'),
    },
    legacy: {
      perks: perkNames.map((p) => ({
        perk: p,
        taken: players.reduce((n, c) => n + (c.legacy.perks[p] ?? 0), 0),
      })),
      by30: { players: thirty.length, median: median(legacyBy30) },
    },
    question: {
      players: old.length,
      withClock: {
        players: withClock.length,
        back21: share(withClock.filter(back21).length, withClock.length),
      },
      without: { players: without.length, back21: share(without.filter(back21).length, without.length) },
      clockKinds,
    },
  };
}

export type LifeReport = ReturnType<typeof buildLifeReport>;

/** The section's tables, in §15.2's order. */
export function lifeTables(r: LifeReport): Array<{ title: string; rows: object[] }> {
  return [
    { title: 'The Wardrobe: items bought by tier and by days since joining', rows: r.wardrobe.boughtByTier },
    {
      title: 'The Wardrobe: sales and bribes (the last 7 days; request logs expire)',
      rows: [
        {
          bought: r.wardrobe.bought,
          'sold, last week': r.wardrobe.soldLastWeek,
          'bribes, last week': r.wardrobe.bribesLastWeek,
        },
      ],
    },
    {
      title:
        'The Wardrobe: outfit changes per player-day, before a rival-ground journey, worn Charisma by day',
      rows: [{ note: 'not recorded (a wear or an outfit tap writes the character, not a log)' }],
    },
    { title: 'The Dossier: entries by source', rows: r.dossier.bySource },
    {
      title: 'The Dossier: the stale share, files, sales, informants',
      rows: [
        {
          entries: r.dossier.entries,
          'stale share (held)': formatShare(r.dossier.staleShare),
          'files made': r.dossier.files,
          sold: r.dossier.sold,
          informants: r.dossier.informants,
        },
      ],
    },
    { title: 'Exposés by angle and outcome', rows: r.dossier.exposes },
    { title: 'Patrons: Favour, days from the first visit to each tier, Requests', rows: r.patrons },
    {
      title: 'The home: flats, the day bought, lapses',
      rows: [
        {
          flats: r.home.flats,
          'bought on day (median since joining)': r.home.boughtOnDay,
          'lapsed now': r.home.lapsedNow,
          'days lapsed (median)': r.home.daysLapsed,
          'rents paid, last week': r.home.rentsPaidLastWeek,
        },
      ],
    },
    { title: 'Legacy: perks taken', rows: r.legacy.perks },
    {
      title: 'Legacy by day 30 (players 30 days old or more)',
      rows: [{ players: r.legacy.by30.players, median: r.legacy.by30.median }],
    },
    {
      title: 'An unfilled clock at day 14 against day-21 return (players 21 days old or more)',
      rows: [
        {
          group: 'at least one clock',
          players: r.question.withClock.players,
          'back at day 21': formatShare(r.question.withClock.back21),
        },
        {
          group: 'none',
          players: r.question.without.players,
          'back at day 21': formatShare(r.question.without.back21),
        },
      ],
    },
    { title: 'The day-14 clocks by kind (a chapter dated is not rebuilt)', rows: r.question.clockKinds },
  ];
}
