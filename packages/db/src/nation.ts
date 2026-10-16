import { FACTION_IDS, dayKey, termOf } from '@irongate/rules';
import type { DayKey, FactionId } from '@irongate/rules';
import { formatShare } from './funnel';
import { dayLabel } from './risk';
import { TEST_MEMBER_PREFIX } from './together';

/**
 * The slice-7 playtest report (tech design §15.2, design §18 Q14): "does holding office feel powerful,
 * and does losing it make players want to fight back?" Pure maths over rows read from `officeTerms`,
 * `candidacies`, `factionElections`, `nationalElections`, `bills`, `laws`, `factions`, `petitions`,
 * `cities` (Clearwater's state log), `votes`, `characters` and `actionLogs`. **Test members** (the
 * hooks' characters, `userId` starting `test:`) and **boosted testers** are left out of every count of
 * players; locals, secretaries and figures are counted as the game's.
 *
 * What the rows do not hold, and how the section handles it:
 * - **An office lost** is a player's term vacated early (a removal, a dissolution, a move) or completed
 *   without the same player holding the same office from its last day (a seat lost at a count, or not
 *   stood for). **Kept**: a completed term followed by any office of the same player from its last day.
 * - **Back** after a loss or a keep is any action log in the seven City Days after that day; days
 *   still inside the week count as far as they go.
 * - **The push's age** is today minus the standing orders' `fromDay` (Appendix C #69's stale push).
 */

export type Office = 'council' | 'governor' | 'chair' | 'deputy' | 'president';
export const OFFICES: readonly Office[] = ['council', 'governor', 'chair', 'deputy', 'president'];

export interface NationCharacterRow {
  id: string;
  userId: string;
  boosted: boolean;
  factionId: FactionId;
  residenceCityId: string | null;
}
export interface NationTermRow {
  /** null: a local (or a figure) held it. */
  characterId: string | null;
  office: Office;
  cityId: string;
  fromDay: DayKey;
  toDay: DayKey;
  vacatedDay: DayKey | null;
  completed: boolean;
}
export interface NationCandidacyRow {
  characterId: string;
  kind: 'council' | 'chair' | 'president' | 'list';
  factionId: FactionId | null;
  filedDay: DayKey;
  status: string;
  backers: number;
}
export interface NationFactionElectionRow {
  kind: 'chair' | 'confidence';
  factionId: FactionId;
  termIndex: number;
  status: 'names' | 'voting' | 'counted' | 'void';
  trigger: 'unrest' | 'petition' | null;
  voters: number | null;
  eligible: number | null;
  /** The Chair's count: the secretary kept the chair. */
  secretaryKept: boolean | null;
  /** A vote on the Chair: removed. */
  removed: boolean | null;
}
export interface NationalElectionRow {
  termIndex: number;
  status: string;
  picks: Partial<Record<FactionId, { ballots: number; voted: boolean }>>;
  ballots: number;
  eligible: number | null;
  w: number | null;
  backers: Partial<Record<FactionId, number>>;
  scores: Array<{
    factionId: FactionId;
    ballotShare: number;
    controlShare: number;
    backers: number;
    score: number;
  }>;
}
export interface NationBillRow {
  termIndex: number;
  kind: 'law' | 'strike' | 'removal' | 'override';
  tabler: 'player' | 'secretary' | 'figure' | 'clerk';
  needed: 31 | 36 | 40;
  status: string;
  /** The parties that set a line on it. */
  lines: number;
}
export interface NationLawRow {
  fromDay: DayKey;
  toDay: DayKey;
  endedDay: DayKey | null;
}
export interface NationFactionRow {
  id: FactionId;
  pushDays: Array<{ day: DayKey; target: number; count: number; met: boolean }>;
  /** The standing orders in force (`orders.current.fromDay`), null: none set. */
  standingFromDay: DayKey | null;
}
export interface NationPetitionRow {
  kind: 'dissolve' | 'chair';
  status: 'open' | 'succeeded' | 'failed';
  signatures: number;
  townHall: number;
}
export interface NationInput {
  now: Date;
  characters: NationCharacterRow[];
  terms: NationTermRow[];
  candidacies: NationCandidacyRow[];
  factionElections: NationFactionElectionRow[];
  nationalElections: NationalElectionRow[];
  bills: NationBillRow[];
  laws: NationLawRow[];
  factions: NationFactionRow[];
  petitions: NationPetitionRow[];
  clearwater: {
    stateLog: Array<{ day: DayKey; battleground: boolean; controlledBy: FactionId | null }>;
    ballotsByCycle: Array<{ cycle: number; ballots: number }>;
  };
  activity: Array<{ characterId: string; at: Date }>;
}

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const share = (a: number, b: number): number | null => (b > 0 ? round(a / b, 3) : null);
const WEEK = 7;

export function buildNationReport(i: NationInput) {
  const testers = new Set(
    i.characters.filter((c) => !c.userId.startsWith(TEST_MEMBER_PREFIX) && !c.boosted).map((c) => c.id),
  );
  const isTester = (id: string | null) => id !== null && testers.has(id);
  const today = dayKey(i.now.getTime());

  // ----- Offices: per term, seats held by players against the game's, and several at once -------
  const byTerm = new Map<number, Record<Office, { players: number; game: number }>>();
  for (const t of i.terms) {
    const n = termOf(t.fromDay).index;
    const row =
      byTerm.get(n) ??
      (Object.fromEntries(OFFICES.map((o) => [o, { players: 0, game: 0 }])) as Record<
        Office,
        { players: number; game: number }
      >);
    if (isTester(t.characterId)) row[t.office].players += 1;
    else if (t.characterId === null) row[t.office].game += 1;
    byTerm.set(n, row);
  }
  // Several offices at once: testers holding two or more kinds today.
  const heldToday = new Map<string, Set<Office>>();
  for (const t of i.terms) {
    if (!isTester(t.characterId) || t.fromDay > today || t.toDay <= today || t.vacatedDay !== null) continue;
    const set = heldToday.get(t.characterId!) ?? new Set<Office>();
    set.add(t.office);
    heldToday.set(t.characterId!, set);
  }
  const several = [...heldToday.values()].filter((s) => s.size >= 2).length;

  // ----- Parliament ------------------------------------------------------------------------------
  const passedStates = new Set(['inForce', 'awaitingSignature', 'vetoed', 'removed']);
  const decided = i.bills.filter((b) => b.status !== 'voting');
  const tablers = ['player', 'secretary', 'figure', 'clerk'] as const;
  const byTabler = tablers.map((k) => {
    const all = i.bills.filter((b) => b.tabler === k);
    const done = decided.filter((b) => b.tabler === k);
    return {
      tabler: k,
      tabled: all.length,
      passed: done.filter((b) => passedStates.has(b.status)).length,
      rate: share(done.filter((b) => passedStates.has(b.status)).length, done.length),
    };
  });
  const byNeeded = ([31, 36, 40] as const).map((needed) => {
    const done = decided.filter((b) => b.needed === needed);
    const passed = done.filter((b) => passedStates.has(b.status)).length;
    return { needed, decided: done.length, passed, rate: share(passed, done.length) };
  });
  const lawDays: Array<{ day: DayKey; inForce: number }> = [];
  const firstLawDay = Math.min(...i.laws.map((l) => l.fromDay), today);
  for (let d = Math.max(firstLawDay, today - 27); d <= today; d++)
    lawDays.push({
      day: d,
      inForce: i.laws.filter((l) => l.fromDay <= d && d < (l.endedDay ?? l.toDay)).length,
    });
  const lawBills = i.bills.filter((b) => b.kind === 'law' || b.kind === 'strike');
  const vetoed = i.bills.filter((b) => b.status === 'vetoed').length;
  const overrides = i.bills.filter((b) => b.kind === 'override');

  // ----- The Chair ---------------------------------------------------------------------------------
  const chairs = i.factionElections.filter(
    (e) => e.kind === 'chair' && (e.status === 'counted' || e.status === 'void'),
  );
  const pushes = i.factions.flatMap((f) => f.pushDays.map((p) => ({ ...p, factionId: f.id })));
  const pushTargets = [...new Set(pushes.map((p) => p.target))].sort((a, b) => a - b);

  // ----- The national election ---------------------------------------------------------------------
  const nationalRows = i.nationalElections
    .filter((e) => e.status === 'counted' || e.status === 'seated')
    .sort((a, b) => a.termIndex - b.termIndex);
  const standing = (kind: NationCandidacyRow['kind']) =>
    FACTION_IDS.map(
      (f) =>
        i.candidacies.filter((c) => c.kind === kind && c.factionId === f && isTester(c.characterId)).length,
    );

  // ----- Clearwater --------------------------------------------------------------------------------
  const residents = i.characters.filter(
    (c) => testers.has(c.id) && c.residenceCityId === 'clearwater',
  ).length;
  const controlDays = Object.fromEntries(
    FACTION_IDS.map((f) => [f, i.clearwater.stateLog.filter((s) => s.controlledBy === f).length]),
  ) as Record<FactionId, number>;
  const closeDays = i.clearwater.stateLog.filter((s) => s.battleground).length;

  // ----- Petitions and removals --------------------------------------------------------------------
  const dissolve = i.petitions.filter((p) => p.kind === 'dissolve');
  const chairPetitions = i.petitions.filter((p) => p.kind === 'chair');
  const removals = i.bills.filter((b) => b.kind === 'removal');
  const confidence = i.factionElections.filter((e) => e.kind === 'confidence' && e.status === 'counted');

  // ----- The question: back the week after losing an office, against keeping it --------------------
  const activeDays = new Map<string, Set<DayKey>>();
  for (const a of i.activity) {
    if (!testers.has(a.characterId)) continue;
    const set = activeDays.get(a.characterId) ?? new Set<DayKey>();
    set.add(dayKey(a.at.getTime()));
    activeDays.set(a.characterId, set);
  }
  const backWithin = (id: string, from: DayKey) => {
    const days = activeDays.get(id);
    if (!days) return false;
    for (let d = from + 1; d <= Math.min(from + WEEK, today); d++) if (days.has(d)) return true;
    return false;
  };
  const losses: Array<{ id: string; day: DayKey; office: Office }> = [];
  const keeps: Array<{ id: string; day: DayKey }> = [];
  for (const t of i.terms) {
    if (!isTester(t.characterId)) continue;
    const id = t.characterId!;
    if (t.vacatedDay !== null && t.vacatedDay <= today) {
      losses.push({ id, day: t.vacatedDay, office: t.office });
      continue;
    }
    if (!t.completed || t.toDay > today) continue;
    // Kept: the player holds an office again from the term's last day (the same seat, or the next
    // rung: a council term followed by the Governor's chair is not a loss).
    const again = i.terms.some((u) => u.characterId === id && u.fromDay === t.toDay);
    if (again) keeps.push({ id, day: t.toDay });
    else losses.push({ id, day: t.toDay, office: t.office });
  }
  const lostBack = losses.filter((l) => backWithin(l.id, l.day)).length;
  const keptBack = keeps.filter((k) => backWithin(k.id, k.day)).length;
  // Stood again: a candidacy filed after the loss, within the next term (28 days) and before today.
  const stoodAgain = losses.filter((l) =>
    i.candidacies.some((c) => c.characterId === l.id && c.filedDay > l.day && c.filedDay <= l.day + 28),
  ).length;

  return {
    testers: testers.size,
    offices: {
      byTerm: [...byTerm.entries()].sort(([a], [b]) => a - b).map(([term, r]) => ({ term, ...r })),
      severalAtOnce: several,
    },
    parliament: {
      byTabler,
      byNeeded,
      lawDays,
      linesPerBill: share(
        lawBills.reduce((n, b) => n + b.lines, 0),
        lawBills.length,
      ),
      vetoed,
      overrides: overrides.length,
      overridesPassed: overrides.filter((b) => passedStates.has(b.status)).length,
    },
    chair: {
      elections: chairs.map((e) => ({
        party: e.factionId,
        term: e.termIndex,
        status: e.status,
        turnout: e.voters !== null && e.eligible !== null ? `${e.voters} of ${e.eligible}` : '—',
        'secretary kept it': e.secretaryKept ?? false,
      })),
      secretaryWins: chairs.filter((e) => e.secretaryKept === true || e.status === 'void').length,
      pushHit: pushTargets.map((target) => {
        const rows = pushes.filter((p) => p.target === target);
        return {
          target,
          days: rows.length,
          met: rows.filter((p) => p.met).length,
          rate: share(rows.filter((p) => p.met).length, rows.length),
        };
      }),
      standingAge: i.factions.map((f) => ({
        party: f.id,
        'days since the orders were set': f.standingFromDay === null ? null : today - f.standingFromDay,
      })),
    },
    national: {
      candidates: {
        president: standing('president'),
        list: standing('list'),
      },
      terms: nationalRows.map((e) => ({
        term: e.termIndex,
        ballots: e.ballots,
        turnout: e.eligible !== null ? `${e.ballots} of ${e.eligible}` : '—',
        w: e.w,
        pickBallots: FACTION_IDS.map((f) => (e.picks[f]?.voted ? (e.picks[f]?.ballots ?? 0) : 0)).join(' / '),
        backers: FACTION_IDS.map((f) => e.backers[f] ?? 0).join(' / '),
        // The score split: the ballots' part against control's (w × ballot share vs (100 − w) × control).
        split: e.scores
          .map((s) =>
            e.w === null
              ? `${s.factionId} ${round(s.score, 1)}`
              : `${s.factionId} ${round(e.w * s.ballotShare, 1)} + ${round(((100 - e.w) * s.controlShare) / 100, 1)}`,
          )
          .join(' · '),
      })),
    },
    clearwater: {
      residents,
      ballotsByCycle: [...i.clearwater.ballotsByCycle].sort((a, b) => a.cycle - b.cycle),
      controlDays,
      closeDays,
      days: i.clearwater.stateLog.length,
    },
    petitions: {
      dissolveOpened: dissolve.length,
      dissolveSignatures: dissolve.reduce((n, p) => n + p.signatures, 0),
      townHallAdded: dissolve.reduce((n, p) => n + p.townHall, 0),
      dissolutions: dissolve.filter((p) => p.status === 'succeeded').length,
      chairPetitions: chairPetitions.length,
      removalMotions: {
        player: removals.filter((b) => b.tabler === 'player').length,
        clerk: removals.filter((b) => b.tabler === 'clerk').length,
      },
      removed: removals.filter((b) => b.status === 'removed').length,
      survived: removals.filter((b) => b.status === 'survived').length,
      votesOnTheChair: confidence.length,
      chairsRemoved: confidence.filter((e) => e.removed === true).length,
    },
    question: {
      losses: losses.length,
      lostBack: share(lostBack, losses.length),
      keeps: keeps.length,
      keptBack: share(keptBack, keeps.length),
      stoodAgain,
      lossesByOffice: OFFICES.map((o) => ({
        office: o,
        losses: losses.filter((l) => l.office === o).length,
      })),
    },
  };
}

export type NationReport = ReturnType<typeof buildNationReport>;

/** The section's tables, for the console. */
export function nationTables(r: NationReport): Array<{ title: string; rows: object[] }> {
  return [
    {
      title: 'Offices per term: seats held by players / by the game (locals, figures)',
      rows: r.offices.byTerm.map((t) => ({
        term: t.term,
        ...Object.fromEntries(OFFICES.map((o) => [o, `${t[o].players} / ${t[o].game}`])),
      })),
    },
    { title: 'Players holding several offices today', rows: [{ players: r.offices.severalAtOnce }] },
    {
      title: 'Bills by who tabled them',
      rows: r.parliament.byTabler.map((x) => ({ ...x, rate: formatShare(x.rate) })),
    },
    {
      title: 'Pass rate by the votes needed',
      rows: r.parliament.byNeeded.map((x) => ({ ...x, rate: formatShare(x.rate) })),
    },
    {
      title: 'Parliament: lines, vetoes, overrides',
      rows: [
        {
          'party lines per bill': r.parliament.linesPerBill,
          vetoed: r.parliament.vetoed,
          overrides: r.parliament.overrides,
          'overrides passed': r.parliament.overridesPassed,
        },
      ],
    },
    {
      title: 'Laws in force per day (the last 28 days)',
      rows: r.parliament.lawDays.map((x) => ({ day: dayLabel(x.day), 'in force': x.inForce })),
    },
    { title: "The Chair's elections", rows: r.chair.elections },
    {
      title: 'The secretary kept the chair (counts, and windows nobody stood in)',
      rows: [{ elections: r.chair.elections.length, 'secretary kept it': r.chair.secretaryWins }],
    },
    {
      title: 'The push: target hit rate by target',
      rows: r.chair.pushHit.map((x) => ({ ...x, rate: formatShare(x.rate) })),
    },
    { title: "The standing orders' age", rows: r.chair.standingAge },
    {
      title: 'The national election: player candidates per party (V / C / A)',
      rows: [
        { for: 'President', count: r.national.candidates.president.join(' / ') },
        { for: 'the lists', count: r.national.candidates.list.join(' / ') },
      ],
    },
    {
      title: "The national counts (the pick's ballots V / C / A; the score as ballots + control)",
      rows: r.national.terms,
    },
    {
      title: 'Clearwater',
      rows: [
        {
          residents: r.clearwater.residents,
          'days logged': r.clearwater.days,
          'close-race days': r.clearwater.closeDays,
          ...Object.fromEntries(FACTION_IDS.map((f) => [`held by ${f}`, r.clearwater.controlDays[f]])),
        },
        ...r.clearwater.ballotsByCycle.map((b) => ({ cycle: b.cycle, ballots: b.ballots })),
      ],
    },
    {
      title: 'Petitions and removals',
      rows: [
        {
          'dissolve petitions': r.petitions.dissolveOpened,
          signatures: r.petitions.dissolveSignatures,
          'from Town Halls': r.petitions.townHallAdded,
          dissolutions: r.petitions.dissolutions,
          'petitions on a Chair': r.petitions.chairPetitions,
        },
        {
          'removal motions (player / clerk)': `${r.petitions.removalMotions.player} / ${r.petitions.removalMotions.clerk}`,
          removed: r.petitions.removed,
          survived: r.petitions.survived,
          'votes on a Chair': r.petitions.votesOnTheChair,
          'Chairs removed': r.petitions.chairsRemoved,
        },
      ],
    },
    {
      title: 'Back within a week (the slice question)',
      rows: [
        {
          after: 'losing an office',
          players: r.question.losses,
          back: formatShare(r.question.lostBack),
          'stood again': r.question.stoodAgain,
        },
        {
          after: 'keeping it',
          players: r.question.keeps,
          back: formatShare(r.question.keptBack),
          'stood again': '—',
        },
        ...r.question.lossesByOffice.map((x) => ({ after: `lost: ${x.office}`, players: x.losses })),
      ],
    },
  ];
}
