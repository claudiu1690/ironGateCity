import { MISSION_TYPES, RECORD } from './constants';
import type { MarkKind, MissionType } from './constants';
import type { DayKey } from './day';
import type { FactionId } from './types';

/**
 * Your record (GDD §11.3–§11.4, design §7.3, ADR 0033): marks, one unit each, with their kind and
 * day. The level, the fading of minor marks and the penalties are computed on read. Pure.
 */

export type RecordLevel = 'clean' | 'onFile' | 'repeat' | 'notorious';

export interface Mark {
  day: DayKey;
  kind: MarkKind;
  /** The action log that earned it (null for a test hook). */
  logId: string | null;
}

/**
 * The marks still on the record today: minor marks are gone once today ≥ the latest mark's day (of
 * any kind) + 14; moderate and serious marks never fade in slice 5 (a theft mark on day 10 keeps
 * day-1 minor marks until day 24).
 */
export function liveMarks(
  marks: readonly Mark[],
  today: DayKey,
  /**
   * Slice 7 (ADR 0044): the fade on a day (the smallest `markFadeDays` in force then, else 14). Minor
   * marks are gone once any day X with latest <= X <= today has X >= latest + fadeDaysOn(X): monotone,
   * so a law that ends never brings a mark back. Absent: 14 every day (slice 5).
   */
  fadeDaysOn?: (day: DayKey) => number,
): Mark[] {
  if (marks.length === 0) return [];
  const latest = Math.max(...marks.map((m) => m.day));
  let faded = today >= latest + RECORD.minorFadeDays;
  if (!faded && fadeDaysOn) {
    for (let x = latest; x <= today && !faded; x++) if (x >= latest + fadeDaysOn(x)) faded = true;
  }
  return marks.filter((m) => !(faded && m.kind === 'minor')).map((m) => ({ ...m }));
}

/** 0 Clean · 1–2 On file · 3–5 Repeat offender · 6+ Notorious. */
export function recordLevel(n: number): RecordLevel {
  if (n >= RECORD.levels.notorious) return 'notorious';
  if (n >= RECORD.levels.repeat) return 'repeat';
  if (n >= RECORD.levels.onFile) return 'onFile';
  return 'clean';
}

export interface RecordView {
  level: RecordLevel;
  marks: number;
  /** The day the live minor marks fade (if no other mark comes first), or null. */
  fadesOn: DayKey | null;
  /** How many marks fade then. */
  fading: number;
  /** On missions' Iron: 0, −10, −20, −30. */
  ironPct: 0 | -10 | -20 | -30;
  /** Repeat offender or worse: +5 on run-ins and the caught check. */
  repeatBonus: 0 | 5;
  /** Notorious: bail doubled. */
  bailNotorious: boolean;
  /** Notorious: barred from courts, universities and the Alliance's HQs. */
  barred: boolean;
}

export function recordView(marks: readonly Mark[], today: DayKey): RecordView {
  const live = liveMarks(marks, today);
  const level = recordLevel(live.length);
  const minor = live.filter((m) => m.kind === 'minor');
  const latest = live.length > 0 ? Math.max(...live.map((m) => m.day)) : null;
  const notorious = level === 'notorious';
  return {
    level,
    marks: live.length,
    fadesOn: minor.length > 0 && latest !== null ? latest + RECORD.minorFadeDays : null,
    fading: minor.length,
    ironPct: RECORD.ironPct[level],
    repeatBonus: level === 'repeat' || notorious ? RECORD.repeatBonus : 0,
    bailNotorious: notorious,
    barred: notorious,
  };
}

/** The +5 of a Repeat offender or worse (run-ins and the caught check). */
export const recordBonus = (level: RecordLevel): number =>
  level === 'repeat' || level === 'notorious' ? RECORD.repeatBonus : 0;

/**
 * The marks a mission (or a run-in on a tap) adds (design §7.2; review 4 #20, ADR 0078): the type's,
 * one unit each, and **an arrest always marks**: one minor mark when the work carried none (legal
 * work, a tier-1 tap, `type: null`). An arrest within seven City Days of an earlier one becomes three
 * serious marks (day 0 and day 6 escalate, day 0 and day 7 do not). `arrests` are the days of every
 * earlier arrest (review 4: slice 5's "an arrest with no marks never escalates" is moot). A caught
 * check that is no arrest adds the type's marks, never escalated.
 */
export function marksFor(i: {
  type: MissionType | null;
  arrested: boolean;
  arrests: readonly DayKey[];
  today: DayKey;
  logId: string | null;
}): { add: Mark[]; escalated: boolean } {
  const spec = i.type ? MISSION_TYPES[i.type] : null;
  const carries = !!spec && spec.marks > 0 && spec.markKind !== null;
  if (!carries && !i.arrested) return { add: [], escalated: false };
  const escalated =
    i.arrested && i.arrests.some((d) => i.today - d >= 0 && i.today - d < RECORD.escalateWithinDays);
  const n = escalated ? RECORD.escalatedMarks : carries ? spec.marks : RECORD.arrestMarks;
  const kind: MarkKind = escalated ? 'serious' : carries ? spec.markKind! : 'minor';
  return {
    add: Array.from({ length: n }, () => ({ day: i.today, kind, logId: i.logId })),
    escalated,
  };
}

/** Arrests kept for the seven-day escalation: the last three, every arrest (review 4, ADR 0078). */
export function recordArrest(arrests: readonly DayKey[], day: DayKey): DayKey[] {
  return [...arrests, day].slice(-3);
}

/**
 * Review 4 #20 (ADR 0078): the record after an arrest that is not a mission's (`finishMission` does
 * its own): a run-in with the police lost on a tier-1 tap, the test hook. The marks (one minor, or
 * three serious within seven days of an earlier arrest), the stored marks after (faded ones pruned)
 * and the arrests kept for the escalation.
 */
export function arrestOnRecord(i: {
  marks: readonly Mark[];
  arrests: readonly DayKey[];
  today: DayKey;
  logId: string | null;
  type?: MissionType | null;
}): { added: Mark[]; escalated: boolean; before: RecordLevel; after: RecordLevel; marks: Mark[]; arrests: DayKey[] } {
  const live = liveMarks(i.marks, i.today);
  const m = marksFor({ type: i.type ?? null, arrested: true, arrests: i.arrests, today: i.today, logId: i.logId });
  const marks = [...live, ...m.add];
  return {
    added: m.add,
    escalated: m.escalated,
    before: recordLevel(live.length),
    after: recordLevel(marks.length),
    marks,
    arrests: recordArrest(i.arrests, i.today),
  };
}

/**
 * *Have a mark struck off* (30 Political Capital): the oldest live mark goes; the stored array
 * comes back as the live marks without it (faded ones pruned). Null when there is none.
 */
export function strikeOldest(
  marks: readonly Mark[],
  today: DayKey,
): { marks: Mark[]; struck: Mark } | null {
  const live = liveMarks(marks, today);
  if (live.length === 0) return null;
  let oldest = 0;
  live.forEach((m, i) => {
    if (m.day < live[oldest]!.day) oldest = i;
  });
  const struck = live[oldest]!;
  return { marks: live.filter((_, i) => i !== oldest), struck };
}

/** Notorious (design §7.3, §23.1 #18): barred from `court`, `university` and any Alliance HQ. */
export function barredByRecord(level: RecordLevel, place: { kind: string; factionId?: FactionId }): boolean {
  if (level !== 'notorious') return false;
  if ((RECORD.notoriousBars.kinds as readonly string[]).includes(place.kind)) return true;
  return place.kind === 'faction-hq' && place.factionId === RECORD.notoriousBars.hqOf;
}
