import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character, DossierEntry } from '@irongate/db';
import type { CharacterDoc, DossierEntryDoc } from '@irongate/db';
import {
  DOSSIER,
  bindFile,
  bindGate,
  createRng,
  dayKey,
  dossierCapacity,
  entryWeight,
  fillTemplate,
  informantSpan,
  isBurned,
  isFresh,
  lineIdOf,
  liveBurns,
  nameWeight,
  perkDossierSlots,
  pickName,
  printable,
  rollEntry,
  sellValue,
  staleOn,
  tierOf,
  turnGate,
  NO_PERKS,
} from '@irongate/rules';
import type {
  ActionDescriptor,
  DayKey,
  DossierCategory,
  DossierFileView,
  DossierKnock,
  DossierNameView,
  DossierSource,
  DossierView,
  FactionId,
  LegacyPerks,
  PatronTier,
  PoliticalResult,
  StationCardView,
} from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { lifePolitical, weekdayName } from './lifeResult';
import { withRequestKey } from './requestKey';
import { VersionConflict } from './txn';

/**
 * Slice 8 phase B, lane 2 (T11; tech design §3.4–§3.5, §8.2; ADR 0053): the Dossier. Entries,
 * Case Files and informants are rows of `dossierEntries`; the slot count is counted in the session
 * (`held` and `attached`), never stored. Every path that lands an entry writes the character in the
 * same transaction (`dossierLastAt` here, and the caller's own version-guarded write), so two
 * landings on one character conflict and one is retried: the count cannot be raced.
 */

// ---------------------------------------------------------------------------------------------
// Test hooks (tech design §8.6: `POST /api/test/force { dossier }`): the caller's next landing.
// ---------------------------------------------------------------------------------------------

const pending = new Map<string, 'land' | 'never'>();
const byTap = new Map<string, 'land' | 'never' | null>();

export const dossierHooks = {
  enabled: false,
  /** The last roll per character (the dev panel's status). */
  last: new Map<string, { chance: number; roll: number; landed: boolean; source: string; at: number }>(),
  set(characterId: string, force: 'land' | 'never'): void {
    pending.set(characterId, force);
  },
  /** The force for this tap (the act's seed and row), kept so a retried transaction rolls the same. */
  take(characterId: string, tap: string): 'land' | 'never' | null {
    if (!dossierHooks.enabled) return null;
    const k = `${characterId}|${tap}`;
    if (byTap.has(k)) return byTap.get(k) ?? null;
    const f = pending.get(characterId) ?? null;
    pending.delete(characterId);
    byTap.set(k, f);
    if (byTap.size > 500) byTap.delete(byTap.keys().next().value!);
    return f;
  },
  clear(): void {
    pending.clear();
    byTap.clear();
    dossierHooks.last.clear();
  },
};

// ---------------------------------------------------------------------------------------------
// Shared reads.
// ---------------------------------------------------------------------------------------------

export const perksOf = (c: Pick<CharacterDoc, 'legacy'>): LegacyPerks => c.legacy?.perks ?? NO_PERKS;

/** GDD §10.1: slots by the trained Intelligence and the perk. */
export const capacityOf = (c: Pick<CharacterDoc, 'stats' | 'legacy'>): number =>
  dossierCapacity(c.stats.int, perkDossierSlots(perksOf(c)));

/** Entries and Case Files each take a slot (an attached file is still yours). */
export async function slotsUsed(characterId: Types.ObjectId, session?: ClientSession): Promise<number> {
  const q = DossierEntry.countDocuments({ characterId, status: { $in: ['held', 'attached'] } });
  return session ? q.session(session) : q;
}

/** A patron's tier for the turn gate (the embedded `patrons[]`, lane 1's writer). */
export function patronTierOf(c: Pick<CharacterDoc, 'patrons'>, patronId: string): PatronTier | null {
  const p = (c.patrons ?? []).find((x) => x.id === patronId);
  return p ? tierOf(p.favour) : null;
}

/** Design §16.4: an entry's line, filled from its stored params. */
export function entryLine(
  content: GameContent,
  row: { subjectId: string; category?: DossierCategory; lineId?: string; params?: { placeId?: string | null; weekday?: number } | null; cityId: string },
): string {
  const name = content.name(row.subjectId);
  const [cat, idx] = (row.lineId ?? '').split('.');
  const text = content.dossierLine((row.category ?? cat) as DossierCategory, Number(idx ?? 0)) ?? '';
  const place = row.params?.placeId ? content.location(row.params.placeId)?.location : undefined;
  return fillTemplate(text, {
    name: name?.name ?? row.subjectId,
    party: name?.factionId ? content.faction(name.factionId).shortName : '',
    place: place ? (place.ref ?? place.name) : (content.city(row.cityId)?.name ?? ''),
    weekday: weekdayName(row.params?.weekday ?? 0),
    city: content.city(row.cityId)?.name ?? row.cityId,
  });
}

// ---------------------------------------------------------------------------------------------
// landEntry: the one helper every source calls inside its own transaction.
// ---------------------------------------------------------------------------------------------

export interface LandInput {
  source: DossierSource;
  category: DossierCategory;
  /** The town the name is drawn from (the act's city, the informant's, the patron's). */
  cityId: string;
  districtId?: string;
  /** A name of this party (a mission's target party). */
  party?: FactionId;
  /** A named subject (a mission's figure, the morgue file's chosen name, a chapter's). */
  subjectId?: string;
  /** Percent; 100 certain (before the worn `dossierChance`, which the caller adds). */
  chancePct: number;
  /** The act's seed; the entry rolls on `{seed}:dossier:{row}`. */
  seed: string;
  row: number | string;
  now: number;
  /** The settlement's landings are dated at their boundary. */
  day?: DayKey;
}

export interface LandResult {
  landed: boolean;
  /** The knock-on line (null when nothing rolled). */
  knock: DossierKnock | null;
  /** For patrons' Requests (`kind: 'dossierEntry'`; lane 1's matcher). */
  descriptor: ActionDescriptor | null;
}

/**
 * Tech design §3.4: pick the name, roll the entry on its own stream, count the slots, insert (or
 * refuse: *Dossier full · an entry went begging*). The character's `dossierLastAt` is written here
 * (no version bump), which also serialises two landings on one character.
 */
export async function landEntry(
  session: ClientSession,
  content: GameContent,
  c: Pick<CharacterDoc, '_id' | 'factionId' | 'stats' | 'legacy'>,
  i: LandInput,
): Promise<LandResult> {
  const rng = createRng(`${i.seed}:dossier:${i.row}`);
  const names = content.names();
  const named = i.subjectId ? content.name(i.subjectId) : undefined;
  const subject =
    named ??
    pickName({
      names,
      cityId: i.cityId,
      actor: c.factionId,
      ...(i.party ? { party: i.party } : {}),
      ...(i.districtId ? { districtId: i.districtId } : {}),
      rng,
    });
  const force = dossierHooks.take(c._id.toHexString(), `${i.seed}:${i.row}`);
  const chance = force === 'land' ? 100 : force === 'never' ? 0 : i.chancePct;
  const subjectCity = subject?.cityId ?? i.cityId;
  const places = (content.city(subjectCity)?.locations ?? []).map((l) => l.id);
  const r = rollEntry({ chance, category: i.category, subject: subject ?? null, cityPlaces: places, rng });
  dossierHooks.last.set(c._id.toHexString(), {
    chance: r.chance,
    roll: r.roll,
    landed: r.lands,
    source: i.source,
    at: i.now,
  });
  if (!r.lands || !r.entry || !subject) return { landed: false, knock: null, descriptor: null };
  const day = i.day ?? dayKey(i.now);
  const line = staleOn(day);
  const used = await slotsUsed(c._id, session);
  const dev = { chance: r.chance, roll: r.roll, source: i.source };
  const base = {
    subjectId: subject.id,
    name: subject.name,
    category: i.category,
    staleOn: line,
    dev,
  };
  if (used >= capacityOf(c)) {
    return { landed: false, knock: { ...base, refused: true, line: copy.life.dossier.knockFull }, descriptor: null };
  }
  await DossierEntry.create(
    [
      {
        characterId: c._id,
        kind: 'entry',
        subjectId: subject.id,
        subjectFactionId: subject.factionId ?? null,
        cityId: subject.cityId,
        districtId: subject.districtId ?? null,
        category: i.category,
        lineId: lineIdOf(i.category, r.entry.lineIndex),
        params: r.entry.params,
        day,
        source: i.source,
        status: 'held',
      },
    ],
    { session },
  );
  await Character.updateOne({ _id: c._id }, { $set: { dossierLastAt: new Date(i.now) } }, { session });
  return {
    landed: true,
    knock: {
      ...base,
      refused: false,
      line: copy.life.dossier.knockEntry(subject.name, copy.life.dossier.category[i.category].toLowerCase(), weekdayName(line)),
    },
    descriptor: {
      kind: 'dossierEntry',
      cityId: subject.cityId,
      ...(subject.districtId ? { districtId: subject.districtId } : {}),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The tab (`dossier.get`, `dossier.seen`).
// ---------------------------------------------------------------------------------------------

/** The press places and stations, for the files' *nearest* lines. */
function placesOfKind(content: GameContent, kind: string): Array<{ locationId: string; name: string; cityId: string }> {
  const out: Array<{ locationId: string; name: string; cityId: string }> = [];
  for (const city of content.cities)
    for (const l of city.locations) if (l.kind === kind) out.push({ locationId: l.id, name: l.name, cityId: city.id });
  return out;
}

export function dossierViewOf(
  content: GameContent,
  c: CharacterDoc,
  rows: readonly DossierEntryDoc[],
  today: DayKey,
): DossierView {
  const held = rows.filter((r) => r.kind === 'entry' && r.status === 'held');
  const files = rows.filter((r) => r.kind === 'file' && (r.status === 'held' || r.status === 'attached'));
  const informants = rows.filter((r) => r.kind === 'file' && r.status === 'informant' && (r.informant?.untilDay ?? 0) >= today);
  const cap = capacityOf(c);
  const used = held.length + files.length;
  const fresh = held.filter((r) => isFresh(r.day, today)).length;
  const burns = liveBurns(c.dossierBurns ?? [], today);
  const presses = placesOfKind(content, 'press');
  const stations = placesOfKind(content, 'station');
  const nearest = (xs: typeof presses) => {
    const here = xs.find((x) => x.cityId === c.cityId) ?? xs[0];
    return here ? { locationId: here.locationId, name: here.name } : null;
  };
  const bySubject = new Map<string, DossierEntryDoc[]>();
  for (const r of held) bySubject.set(r.subjectId, [...(bySubject.get(r.subjectId) ?? []), r]);
  const names: DossierNameView[] = [...bySubject.entries()]
    .map(([subjectId, es]) => {
      const n = content.name(subjectId);
      const sorted = [...es].sort((a, b) => b.day - a.day);
      const weight = nameWeight(es, today);
      const fileHeld = files.some((f) => f.subjectId === subjectId);
      const gate = bindGate({ level: c.level, entries: es, fileHeld, today });
      const clock: DossierNameView['clock'] = [];
      for (const e of sorted.slice(0, DOSSIER.fileWeight)) clock.push(isFresh(e.day, today) ? 'fresh' : 'stale');
      while (clock.length < DOSSIER.fileWeight) clock.push('empty');
      const burn = burns.find((b) => b.subjectId === subjectId);
      return {
        subjectId,
        name: n?.name ?? subjectId,
        factionId: n?.factionId ?? null,
        city: content.city(es[0]!.cityId)?.name ?? es[0]!.cityId,
        district: es[0]!.districtId ? (content.district(es[0]!.districtId)?.quarter.name ?? null) : null,
        weight,
        clock,
        canBind: gate === null,
        why:
          gate === null
            ? null
            : gate.reason === 'CASE_FILES_LEVEL'
              ? copy.life.wardrobe.fromLevel(DOSSIER.caseFileLevel)
              : gate.reason === 'FILE_HELD'
                ? copy.life.dossier.chips.files
                : copy.life.dossier.nameLine(es.length, String(weight)),
        burned: burn ? { until: burn.until } : null,
        entries: sorted.map((e) => ({
          id: e._id.toHexString(),
          category: e.category ?? 'neutral',
          line: entryLine(content, e),
          source: e.source,
          day: e.day,
          staleOn: staleOn(e.day),
          fresh: isFresh(e.day, today),
        })),
      };
    })
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  const informantCount = rows.filter((r) => r.status === 'informant' && (r.informant?.untilDay ?? 0) >= today).length;
  const caseFiles: DossierFileView[] = files.map((f) => {
    const n = content.name(f.subjectId);
    const kinds = f.kinds ?? [];
    const own = f.subjectFactionId === c.factionId;
    const burned = isBurned(burns, f.subjectId, today);
    const printWhy = !printable({ kinds })
      ? copy.life.expose.noFile
      : f.subjectFactionId === null
        ? copy.life.dossier.noParty
        : own
          ? copy.life.dossier.notOwnParty
          : burned
            ? copy.life.dossier.burned(weekdayName(burns.find((b) => b.subjectId === f.subjectId)!.until), DOSSIER.burnDays)
            : f.status === 'attached'
              ? copy.life.errors.inStory
              : null;
    const patron = content.patronOf(f.cityId);
    const tg = turnGate({
      kinds,
      patronId: patron?.id ?? null,
      patronTier: patron ? patronTierOf(c, patron.id) : null,
      informants: informantCount,
    });
    return {
      id: f._id.toHexString(),
      subjectId: f.subjectId,
      name: n?.name ?? f.subjectId,
      factionId: f.subjectFactionId,
      city: content.city(f.cityId)?.name ?? f.cityId,
      kinds,
      lines: (f.lines ?? []).map((l) => entryLine(content, { ...l, subjectId: f.subjectId, cityId: f.cityId })),
      weight: f.weight ?? 0,
      status: f.status === 'attached' ? 'attached' : 'held',
      print: { ok: printWhy === null, why: printWhy, nearest: nearest(presses) },
      sell: { value: sellValue({ kind: 'file', day: f.day }, today), nearest: nearest(stations) },
      turn: {
        ok: tg === null && f.status === 'held',
        why:
          tg === null
            ? null
            : tg.reason === 'NEEDS_PATTERN'
              ? copy.life.dossier.needsPattern
              : tg.reason === 'NEEDS_ASSOCIATE'
                ? copy.life.dossier.needsAssociate(patron?.name ?? '')
                : tg.reason === 'INFORMANTS_FULL'
                  ? copy.life.dossier.twoAtMost
                  : copy.life.dossier.needsAssociate(patron?.name ?? ''),
      },
    };
  });
  return {
    used,
    cap,
    fresh,
    stale: held.length - fresh,
    files: files.length,
    full: used >= cap,
    header: copy.life.dossier.header(used, cap, fresh, held.length - fresh, files.length),
    staleTomorrow: held.filter((r) => r.day === today - (DOSSIER.freshDays - 1)).length,
    names,
    caseFiles,
    informants: informants.map((f) => {
      const span = f.informant!;
      const reported = span.reported;
      const next = span.fromDay + DOSSIER.informant.every * (reported + 1);
      return {
        id: f._id.toHexString(),
        name: content.name(f.subjectId)?.name ?? f.subjectId,
        city: content.city(span.cityId)?.name ?? span.cityId,
        daysLeft: Math.max(0, span.untilDay - today),
        next: next <= span.untilDay ? next : null,
        last: null,
      };
    }),
    dot: !!c.dossierLastAt && (!c.dossierSeenAt || new Date(c.dossierLastAt).getTime() > new Date(c.dossierSeenAt).getTime()),
  };
}

async function rowsOf(characterId: Types.ObjectId, session?: ClientSession): Promise<DossierEntryDoc[]> {
  const q = DossierEntry.find({ characterId, status: { $in: ['held', 'attached', 'informant'] } }).sort({ day: -1, _id: -1 });
  return (session ? q.session(session) : q).lean<DossierEntryDoc[]>();
}

export async function dossierViewFor(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session?: ClientSession,
): Promise<DossierView> {
  return dossierViewOf(content, c, await rowsOf(c._id, session), dayKey(now));
}

interface Deps<I> {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: I;
}

export async function getDossier(deps: Omit<Deps<unknown>, 'input'>): Promise<DossierView> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  return dossierViewFor(deps.content, loaded.doc, now);
}

/** Unversioned (ADR 0040's pattern): the tab opened, the dot cleared. */
export async function seenDossier(deps: Omit<Deps<unknown>, 'input'>): Promise<{ ok: true }> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  await Character.updateOne({ _id: loaded.doc._id }, { $set: { dossierSeenAt: new Date(now) } });
  return { ok: true };
}

const resettleOf = (content: GameContent, id: Types.ObjectId, now: () => number) => async () => {
  const fresh = await Character.findById(id).lean<CharacterDoc>();
  if (fresh) await ensureSettled(content, fresh, now());
};

/** The character in the session, settled for today (an act on a stale day is retried). */
async function sessionCharacter(session: ClientSession, id: Types.ObjectId, today: DayKey): Promise<CharacterDoc> {
  const c = await Character.findById(id).session(session).lean<CharacterDoc>();
  if (!c) throw new Error('character disappeared');
  if (c.day.settled !== today) throw new VersionConflict();
  return c;
}

/** The character's version bump that every Dossier act makes (the transaction's guard). */
async function bump(session: ClientSession, c: CharacterDoc, extra: Record<string, unknown> = {}, inc: Record<string, number> = {}) {
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, ...(inc.iron && inc.iron < 0 ? { iron: { $gte: -inc.iron } } : {}) },
    { ...(Object.keys(extra).length ? { $set: extra } : {}), $inc: { ...inc, version: 1 } },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  return updated;
}

// ---------------------------------------------------------------------------------------------
// dossier.bind: three entries' worth on one name into a Case File (Level 16).
// ---------------------------------------------------------------------------------------------

/** The bind's writes, shared with the test hook (`{ file: subjectId }`). */
export async function bindInTx(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  subjectId: string,
  now: number,
  opts: { skipLevel?: boolean } = {},
): Promise<{ file: DossierEntryDoc; entries: number }> {
  const today = dayKey(now);
  const entries = await DossierEntry.find({ characterId: c._id, kind: 'entry', status: 'held', subjectId })
    .session(session)
    .lean<DossierEntryDoc[]>();
  const fileHeld = await DossierEntry.exists({
    characterId: c._id,
    kind: 'file',
    subjectId,
    status: { $in: ['held', 'attached'] },
  }).session(session);
  const gate = bindGate({ level: opts.skipLevel ? 99 : c.level, entries, fileHeld: !!fileHeld, today });
  if (gate) throw new GameError(gate.reason, gate.weight !== undefined ? { weight: gate.weight } : {});
  const bound = bindFile(
    entries.map((e) => ({
      category: e.category ?? 'neutral',
      lineId: e.lineId ?? 'neutral.0',
      params: e.params ?? {},
      day: e.day,
      source: e.source,
    })),
    today,
  );
  const first = entries[0]!;
  const [file] = await DossierEntry.create(
    [
      {
        characterId: c._id,
        kind: 'file',
        subjectId,
        subjectFactionId: first.subjectFactionId,
        cityId: first.cityId,
        districtId: first.districtId,
        day: today,
        source: first.source,
        lines: bound.lines,
        kinds: bound.kinds,
        weight: bound.weight,
        status: 'held',
      },
    ],
    { session },
  );
  const moved = await DossierEntry.updateMany(
    { _id: { $in: entries.map((e) => e._id) }, status: 'held' },
    { $set: { status: 'bound', fileId: file!._id } },
    { session },
  );
  if (moved.modifiedCount !== entries.length) throw new VersionConflict();
  return { file: file!.toObject() as DossierEntryDoc, entries: entries.length };
}

export async function bindDossier(deps: Deps<{ subjectId: string; idempotencyKey: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'dossier.bind',
    input: { subjectId: deps.input.subjectId },
    resettle: resettleOf(content, loaded.doc._id, deps.now),
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await sessionCharacter(session, loaded.doc._id, today);
      const { file, entries } = await bindInTx(session, content, c, deps.input.subjectId, now);
      const updated = await bump(session, c, {
        ...(c.milestones?.caseFileAt ? {} : { 'milestones.caseFileAt': new Date(now) }),
      });
      const view = await dossierViewFor(content, updated, now, session);
      const name = content.name(deps.input.subjectId)?.name ?? deps.input.subjectId;
      const kinds = (file.kinds ?? []).map((k) => copy.life.dossier.category[k].toLowerCase()).join(', ');
      const m = copy.life.modals.caseFile(name, entries, kinds);
      return lifePolitical({
        content,
        session,
        updated,
        now,
        idempotencyKey: deps.input.idempotencyKey,
        act: 'caseFile',
        stamp: copy.life.stamps.caseFile,
        headline: m.headline,
        body: m.body,
        knockOns: {
          dossier: { line: copy.life.dossier.knockSlots(view.used, view.cap), used: view.used, cap: view.cap },
          life: [copy.life.dossier.knockFile(name, kinds)],
        },
        view: { kind: 'dossier', dossier: view },
      });
    },
  });
}

// ---------------------------------------------------------------------------------------------
// dossier.sell: at a station, an entry 50 (25 stale), a file 200.
// ---------------------------------------------------------------------------------------------

export function stationCard(
  content: GameContent,
  c: CharacterDoc,
  rows: readonly DossierEntryDoc[],
  today: DayKey,
): StationCardView {
  const s = copy.life.dossier.station;
  return {
    kicker: s.kicker,
    line: s.line,
    rows: rows
      .filter((r) => r.status === 'held')
      .map((r) => ({
        id: r._id.toHexString(),
        kind: r.kind,
        name: content.name(r.subjectId)?.name ?? r.subjectId,
        line: r.kind === 'file' ? copy.life.dossier.chips.files : entryLine(content, r),
        price: sellValue({ kind: r.kind, day: r.day }, today),
      })),
  };
}

export async function getStation(deps: Deps<{ locationId: string }>): Promise<StationCardView> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  const place = deps.content.location(deps.input.locationId);
  if (!place || place.location.kind !== 'station') throw gameError('PRECONDITION_FAILED', 'NOT_A_STATION');
  return stationCard(deps.content, loaded.doc, await rowsOf(loaded.doc._id), dayKey(now));
}

export async function sellDossier(
  deps: Deps<{ locationId: string; id: string; idempotencyKey: string }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const place = content.location(deps.input.locationId);
  if (!place || place.location.kind !== 'station') throw gameError('PRECONDITION_FAILED', 'NOT_A_STATION');
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'dossier.sell',
    input: { locationId: deps.input.locationId, id: deps.input.id },
    resettle: resettleOf(content, loaded.doc._id, deps.now),
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await sessionCharacter(session, loaded.doc._id, today);
      if (c.journey && c.journey.status === 'onTheWay') throw new GameError('IN_TRANSIT');
      if (place.city.id !== c.cityId) throw new GameError('WRONG_CITY', { cityId: place.city.id });
      const row = await DossierEntry.findOne({ _id: new Types.ObjectId(deps.input.id), characterId: c._id })
        .session(session)
        .lean<DossierEntryDoc>();
      if (!row || (row.status !== 'held' && row.status !== 'attached')) throw new GameError('FILE_NOT_FOUND');
      if (row.status === 'attached' || (c.expose && c.expose.fileId.equals(row._id))) throw new GameError('IN_STORY');
      const price = sellValue({ kind: row.kind, day: row.day }, today);
      const sold = await DossierEntry.updateOne(
        { _id: row._id, status: 'held' },
        { $set: { status: 'sold', used: { how: 'sold', day: today, ref: null } } },
        { session },
      );
      if (sold.modifiedCount !== 1) throw new VersionConflict();
      const updated = await bump(session, c, {}, { iron: price });
      const view = await dossierViewFor(content, updated, now, session);
      const m = copy.life.modals.dossierSold();
      return lifePolitical({
        content,
        session,
        updated,
        now,
        idempotencyKey: deps.input.idempotencyKey,
        act: 'dossierSold',
        stamp: copy.life.stamps.dossierSold,
        headline: m.headline,
        body: m.body,
        knockOns: {
          iron: { before: c.iron, after: updated.iron },
          dossier: { line: copy.life.dossier.knockSlots(view.used, view.cap), used: view.used, cap: view.cap },
        },
        view: { kind: 'dossier', dossier: view },
      });
    },
  });
}

// ---------------------------------------------------------------------------------------------
// dossier.turn: a pattern file, Associate with the patron of the name's town, < 2 informants.
// ---------------------------------------------------------------------------------------------

export async function turnInTx(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  fileId: Types.ObjectId,
  now: number,
  opts: { skipPatron?: boolean } = {},
): Promise<DossierEntryDoc> {
  const today = dayKey(now);
  const file = await DossierEntry.findOne({ _id: fileId, characterId: c._id, kind: 'file' })
    .session(session)
    .lean<DossierEntryDoc>();
  if (!file || (file.status !== 'held' && file.status !== 'attached')) throw new GameError('FILE_NOT_FOUND');
  if (file.status === 'attached' || (c.expose && c.expose.fileId.equals(file._id))) throw new GameError('IN_STORY');
  const informants = await DossierEntry.countDocuments({
    characterId: c._id,
    status: 'informant',
    'informant.untilDay': { $gte: today },
  }).session(session);
  const patron = content.patronOf(file.cityId);
  const gate = turnGate({
    kinds: file.kinds ?? [],
    patronId: patron?.id ?? null,
    patronTier: opts.skipPatron ? 'protege' : patron ? patronTierOf(c, patron.id) : null,
    informants,
  });
  if (gate && !(opts.skipPatron && gate.reason === 'NO_PATRON_HERE'))
    throw new GameError(gate.reason, gate.patronId ? { patronId: gate.patronId } : {});
  const span = informantSpan(today);
  const turned = await DossierEntry.findOneAndUpdate(
    { _id: file._id, status: 'held' },
    {
      $set: {
        status: 'informant',
        informant: { ...span, reported: 0, cityId: file.cityId },
        used: { how: 'informant', day: today, ref: null },
      },
    },
    { session, returnDocument: 'after', lean: true },
  );
  if (!turned) throw new VersionConflict();
  return turned as DossierEntryDoc;
}

export async function turnDossier(deps: Deps<{ fileId: string; idempotencyKey: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: deps.input.idempotencyKey,
    kind: 'dossier.turn',
    input: { fileId: deps.input.fileId },
    resettle: resettleOf(content, loaded.doc._id, deps.now),
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await sessionCharacter(session, loaded.doc._id, today);
      const turned = await turnInTx(session, content, c, new Types.ObjectId(deps.input.fileId), now);
      const updated = await bump(session, c);
      const view = await dossierViewFor(content, updated, now, session);
      const city = content.city(turned.cityId)?.name ?? turned.cityId;
      const subject = content.name(turned.subjectId)?.name ?? turned.subjectId;
      const m = copy.life.modals.informant(city, subject);
      return lifePolitical({
        content,
        session,
        updated,
        now,
        idempotencyKey: deps.input.idempotencyKey,
        act: 'informant',
        stamp: copy.life.stamps.informant,
        headline: m.headline,
        body: m.body,
        knockOns: {
          life: [
            copy.life.knock.fileSpent,
            copy.life.knock.twoInformants,
            copy.life.dossier.informantLine(DOSSIER.informant.days, weekdayName(turned.informant!.fromDay + DOSSIER.informant.every)),
          ],
        },
        view: { kind: 'dossier', dossier: view },
      });
    },
  });
}

// ---------------------------------------------------------------------------------------------
// The settlement's landings (tech design §8.2 steps 4–5): informants' reports and patrons' gossip.
// ---------------------------------------------------------------------------------------------

export interface SettledLanding {
  kind: 'informant' | 'gossip';
  day: DayKey;
  subject: string;
  line: string;
  category: DossierCategory;
  daysLeft: number;
  patronId?: string;
  landed: boolean;
}

/** Exported for the settlement: an informant's or a gossip's entry, dated at its boundary. */
export async function landSettled(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  i: { kind: 'informant' | 'gossip'; cityId: string; category: DossierCategory; day: DayKey; now: number; seed: string; patronId?: string; daysLeft: number },
): Promise<SettledLanding | null> {
  const r = await landEntry(session, content, c, {
    source: i.kind,
    category: i.category,
    cityId: i.cityId,
    chancePct: 100,
    seed: i.seed,
    row: i.day,
    now: i.now,
    day: i.day,
  });
  if (!r.knock) return null;
  const row = r.landed
    ? await DossierEntry.findOne({ characterId: c._id, source: i.kind, day: i.day, subjectId: r.knock.subjectId })
        .sort({ _id: -1 })
        .session(session)
        .lean<DossierEntryDoc>()
    : null;
  return {
    kind: i.kind,
    day: i.day,
    subject: r.knock.name,
    line: row ? entryLine(content, row) : r.knock.line,
    category: i.category,
    daysLeft: i.daysLeft,
    ...(i.patronId ? { patronId: i.patronId } : {}),
    landed: r.landed,
  };
}

/** Weighs for the views: exported for the paper's *one entry short* clock. */
export const weightOf = (rows: ReadonlyArray<{ day: DayKey }>, today: DayKey) =>
  rows.reduce((n, r) => n + entryWeight(r.day, today), 0);

// ---------------------------------------------------------------------------------------------
// The Headline Story's *Attach a Case File* (design §4.3; tech design §8.2): attached at the call,
// back to held on the caller's withdrawal or a called-off event, spent at the resolution.
// ---------------------------------------------------------------------------------------------

/** The headline factor an attached file adds to the event's swing (+50 %, slice 6's ruling). */
export const CASE_FILE_FACTOR = { id: 'caseFile', label: 'A Case File', pct: 50 } as const;

export async function attachCaseFileInTx(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  fileId: Types.ObjectId,
  ev: { _id: Types.ObjectId; targetFactionId: FactionId | null },
  now: number,
): Promise<{ fileId: Types.ObjectId; subjectId: string; name: string }> {
  const today = dayKey(now);
  const file = await DossierEntry.findOne({ _id: fileId, characterId: c._id, kind: 'file' }).session(session).lean<DossierEntryDoc>();
  if (!file || file.status !== 'held') throw new GameError('FILE_NOT_FOUND');
  if (c.expose && c.expose.fileId.equals(file._id)) throw new GameError('IN_STORY');
  if (!printable({ kinds: file.kinds ?? [] })) throw new GameError('NO_PRINTABLE_FILE');
  if (!ev.targetFactionId || file.subjectFactionId !== ev.targetFactionId) throw new GameError('WRONG_PARTY');
  const burns = liveBurns(c.dossierBurns ?? [], today);
  if (isBurned(burns, file.subjectId, today)) throw new GameError('BURNED');
  const moved = await DossierEntry.updateOne(
    { _id: file._id, status: 'held' },
    { $set: { status: 'attached', attachedTo: ev._id } },
    { session },
  );
  if (moved.modifiedCount !== 1) throw new VersionConflict();
  await Character.updateOne(
    { _id: c._id },
    { $set: { dossierBurns: [...burns, { subjectId: file.subjectId, until: today + DOSSIER.burnDays }] } },
    { session },
  );
  return { fileId: file._id, subjectId: file.subjectId, name: content.name(file.subjectId)?.name ?? file.subjectId };
}

/** The caller withdrew, or nobody came: the file is held again and the burn lifted. */
export async function detachCaseFileInTx(
  session: ClientSession,
  characterId: Types.ObjectId,
  caseFile: { fileId: Types.ObjectId; subjectId: string },
): Promise<void> {
  await DossierEntry.updateOne(
    { _id: caseFile.fileId, status: 'attached' },
    { $set: { status: 'held', attachedTo: null } },
    { session },
  );
  await Character.updateOne({ _id: characterId }, { $pull: { dossierBurns: { subjectId: caseFile.subjectId } } }, { session });
}

/** The event resolved: the attached file is spent (`used.how: 'headlineStory'`). */
export async function spendCaseFileInTx(
  session: ClientSession,
  caseFile: { fileId: Types.ObjectId },
  eventId: Types.ObjectId,
  day: DayKey,
): Promise<void> {
  await DossierEntry.updateOne(
    { _id: caseFile.fileId, status: 'attached' },
    { $set: { status: 'spent', used: { how: 'headlineStory', day, ref: eventId.toHexString() } } },
    { session },
  );
}
