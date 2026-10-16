import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { ActionLog, Character, DossierEntry } from '@irongate/db';
import type { CharacterDoc, DossierEntryDoc } from '@irongate/db';
import {
  EXPOSE,
  ENERGY,
  ISSUES,
  addPressure,
  addToTally,
  applyGains,
  applyToNeutral,
  burnUntil,
  computeCheck,
  createRng,
  dayKey,
  exposeDifficulty,
  exposeGate,
  exposeLegacy,
  exposeRewards,
  exposeSwing,
  isBurned,
  issueTags,
  liveBurns,
  outcomeForRoll,
  pointsFor,
  printable,
  projectEnergy,
  spendEnergy,
} from '@irongate/rules';
import type {
  ActionDescriptor,
  ActionResult,
  CheckStatSpec,
  ExposeOutcome,
  ExposeView,
  FactionId,
  Outcome,
} from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { progressOf, progressSet } from './actionService';
import { ensureSettled, loadCharacter } from './dayService';
import { runKeyedAction, storedResult } from './keyedAction';
import { keySeed } from './keyGuard';
import { toThousandths, writeLedger, addInfluence } from './ledger';
import { entryLine } from './dossierService';
import { addLegacyInTx, legacyKnock } from './legacyService';
import { liveIssuesOf, restedCapToday } from './modifiers';
import { moveOpinion, placeWrites, readPlace } from './place';
import type { PlaceCtx } from './place';
import { assertFree, notFree } from './risk';
import { sceneArt } from './story';
import { DayChanged, VersionConflict } from './txn';
import { assetView, energyState, preferredStat, toCharacterView, wornStats } from './views';

/**
 * Slice 8 phase B, lane 2 (T12; tech design §3.6, §8.2; ADR 0054): the exposé. Step 1 is a set-once
 * pointer `characters.expose { fileId, angle, locationId, day }` (no Energy, no key, ADR 0013);
 * step 2 a keyed game action (`actionLogs` kind `expose`) that in one transaction writes the
 * character, the file, the swing in the NAME's town (its district in the capital), the ledger, the
 * contributions, the tagged Issues, Legacy and the log. A Failure keeps the file. The twist
 * multiplier is a constant 1: seasons are deferred (16 Oct 2026).
 */

type WayId = 'write' | 'talk' | 'legwork';
const WAYS: Record<WayId, CheckStatSpec> = {
  write: ['int'],
  talk: ['cha', 'int'],
  legwork: ['best'],
};
const WAY_COPY: Record<WayId, 'straight' | 'talk' | 'legwork'> = { write: 'straight', talk: 'talk', legwork: 'legwork' };

/** The press place at a location id, or undefined. */
function pressAt(content: GameContent, locationId: string) {
  const at = content.location(locationId);
  return at && at.location.kind === 'press' ? at : undefined;
}

/** The meter the swing writes: the name's district in the capital, else its city (any place there). */
function nameTown(content: GameContent, file: Pick<DossierEntryDoc, 'cityId' | 'districtId'>) {
  const city = content.city(file.cityId);
  if (!city) return undefined;
  const location =
    (file.districtId ? city.locations.find((l) => l.quarterId === file.districtId) : undefined) ?? city.locations[0];
  return location ? { city, location } : undefined;
}

async function heldFiles(characterId: Types.ObjectId, session?: ClientSession): Promise<DossierEntryDoc[]> {
  const q = DossierEntry.find({ characterId, kind: 'file', status: 'held' }).sort({ day: -1 });
  return (session ? q.session(session) : q).lean<DossierEntryDoc[]>();
}

const partyName = (content: GameContent, f: FactionId | null) => (f ? content.faction(f).shortName : '');

/** Step 1's or step 2's screen (`expose.get`). */
export async function exposeViewFor(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  locationId: string | undefined,
): Promise<ExposeView> {
  const today = dayKey(now);
  const e = c.expose ?? null;
  const at = pressAt(content, e?.locationId ?? locationId ?? '');
  const paper = at?.location.name ?? '';
  const burns = liveBurns(c.dossierBurns ?? [], today);
  const printedToday = c.today?.day === today && c.today.expose === true;
  const base: ExposeView = {
    step: e ? 2 : 1,
    locationId: at?.location.id ?? locationId ?? '',
    paper,
    kicker: copy.life.expose.kicker(paper, e ? 2 : 1),
    title: e ? copy.life.expose.step2 : copy.life.expose.step1,
    files: [],
    angles: [
      { id: 'plain', text: copy.life.expose.plainly, hint: copy.life.expose.plainlyHint },
      { id: 'headline', text: copy.life.expose.headline, hint: copy.life.expose.headlineHint },
    ],
    chosen: null,
    ways: [],
    cta: null,
    refusal: null,
  };
  if (!at) return { ...base, refusal: copy.life.expose.noFile };
  if (!e) {
    const files = (await heldFiles(c._id)).filter(
      (f) => printable({ kinds: f.kinds ?? [] }) && f.subjectFactionId !== null && f.subjectFactionId !== c.factionId && !isBurned(burns, f.subjectId, today),
    );
    return {
      ...base,
      files: files.map((f) => ({
        id: f._id.toHexString(),
        name: content.name(f.subjectId)?.name ?? f.subjectId,
        party: partyName(content, f.subjectFactionId),
        lines: f.lines?.length ?? 0,
        weight: f.weight ?? 0,
      })),
      refusal: printedToday ? copy.life.expose.printedToday : files.length === 0 ? copy.life.expose.noFile : null,
    };
  }
  const file = await DossierEntry.findById(e.fileId).lean<DossierEntryDoc>();
  const values = wornStats(c, content, now);
  const role = content.city(at.city.id)?.role ?? 'home';
  const difficulty = exposeDifficulty(file?.weight ?? 0, e.angle, role);
  const restedCap = restedCapToday(content, null, today, c.room, c.factionId);
  const energy = projectEnergy(energyState(c), now, ENERGY.max, restedCap);
  const ok = energy.value + energy.rested >= EXPOSE.energy && !printedToday;
  return {
    ...base,
    chosen: file
      ? { fileId: file._id.toHexString(), name: content.name(file.subjectId)?.name ?? file.subjectId, angle: e.angle }
      : null,
    ways: (Object.keys(WAYS) as WayId[]).map((id) => {
      const check = computeCheck({ stats: WAYS[id], values, difficulty, prefer: preferredStat(content, c.factionId) });
      return { id, text: copy.life.expose.ways[WAY_COPY[id]], odds: copy.odds.band(check.chance) };
    }),
    cta: {
      label: copy.life.expose.cta,
      energy: EXPOSE.energy,
      ok,
      why: printedToday ? copy.life.expose.printedToday : ok ? null : copy.life.expose.cta,
    },
    refusal: file && file.status === 'held' ? null : copy.life.expose.noFile,
  };
}

interface Deps<I> {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: I;
}

export async function getExpose(deps: Deps<{ locationId?: string | undefined }>): Promise<ExposeView> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  return exposeViewFor(deps.content, loaded.doc, now, deps.input.locationId);
}

/** Step 1: set-once (`expose: null`), at a press, a printable file on another party's name. */
export async function chooseExpose(
  deps: Deps<{ locationId: string; fileId: string; angle: 'plain' | 'headline' }>,
): Promise<ExposeView> {
  const { content, input } = deps;
  const now = deps.now();
  const today = dayKey(now);
  const loaded = await loadCharacter(deps.user, content, now);
  const c = loaded.doc;
  if (c.expose) throw gameError('PRECONDITION_FAILED', 'IN_STORY');
  const at = pressAt(content, input.locationId);
  if (c.journey && c.journey.status === 'onTheWay') throw gameError('PRECONDITION_FAILED', 'IN_TRANSIT');
  if (at && at.city.id !== c.cityId) throw gameError('PRECONDITION_FAILED', 'WRONG_CITY', { cityId: at.city.id });
  if (!Types.ObjectId.isValid(input.fileId)) throw gameError('PRECONDITION_FAILED', 'FILE_NOT_FOUND');
  const file = await DossierEntry.findOne({ _id: new Types.ObjectId(input.fileId), characterId: c._id, kind: 'file' }).lean<DossierEntryDoc>();
  if (!file) throw gameError('PRECONDITION_FAILED', 'FILE_NOT_FOUND');
  const gate = exposeGate({
    atPress: !!at,
    file: { status: file.status, kinds: file.kinds ?? [], subjectFactionId: file.subjectFactionId },
    actor: c.factionId,
    burned: isBurned(c.dossierBurns ?? [], file.subjectId, today),
    printedToday: c.today?.day === today && c.today.expose === true,
  });
  if (gate) throw gameError('PRECONDITION_FAILED', gate.reason);
  const set = await Character.updateOne(
    { _id: c._id, version: c.version, $or: [{ expose: null }, { expose: { $exists: false } }] },
    {
      $set: { expose: { fileId: file._id, angle: input.angle, locationId: at!.location.id, day: today } },
      $inc: { version: 1 },
    },
  );
  const fresh = await Character.findById(c._id).lean<CharacterDoc>();
  if (set.modifiedCount !== 1 && !fresh?.expose) throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: 1 });
  return exposeViewFor(content, fresh!, now, at!.location.id);
}

/** The swing's write in the name's town (tech design §3.6): `toNeutral` (plain) or `against` (headline). */
function swingMove(
  ctx: PlaceCtx,
  session: ClientSession,
  i: { actor: FactionId; target: FactionId; amount: number; mode: 'toNeutral' | 'against' },
) {
  if (i.mode === 'against') return moveOpinion(ctx, session, { actor: i.actor, swing: i.amount, mode: 'against', target: i.target });
  const { city, district, cityState, today } = ctx;
  if (i.amount <= 0) return null;
  if (district) {
    const op = applyToNeutral(district.opinion, { target: i.target, amount: i.amount });
    return {
      effect: { applied: op.taken, shareBefore: district.opinion[i.target], shareAfter: op.shares[i.target], mode: 'against' as const, targetFactionId: i.target, toActor: 0, capped: false },
      write: async () => {
        const { District } = await import('@irongate/db');
        return District.updateOne({ _id: district._id }, { $set: { opinion: op.shares } }, { session });
      },
      morale: null,
      legs: [{ factionId: i.target, swing: -op.taken }],
      contribution: 0,
    };
  }
  const shares = cityState?.opinion ?? city.baselineOpinion;
  const capped = ctx.rival !== null && i.target === ctx.rival.homeFactionId;
  const cap = capped ? ctx.rival!.pressureLeft : null;
  const op = applyToNeutral(shares, { target: i.target, amount: i.amount, ...(city.homeFactionId ? { homeFactionId: city.homeFactionId } : {}), cap });
  const pressure = capped && op.taken > 0 ? addPressure(cityState?.rivalPressure ?? null, today, toThousandths(op.taken), i.actor) : undefined;
  return {
    effect: {
      applied: op.taken,
      shareBefore: shares[i.target],
      shareAfter: op.shares[i.target],
      mode: 'against' as const,
      targetFactionId: i.target,
      toActor: 0,
      capped: cap !== null && toThousandths(i.amount) > toThousandths(cap),
    },
    write: async () => {
      const { City } = await import('@irongate/db');
      return City.updateOne(
        { _id: city.id },
        { $set: { opinion: op.shares, ...(pressure !== undefined ? { rivalPressure: pressure } : {}) } },
        { session, upsert: true },
      );
    },
    morale: null,
    legs: [{ factionId: i.target, swing: -op.taken }],
    contribution: 0,
  };
}

/** Step 2: the check (ADR 0002 via `runKeyedAction`). */
export async function attemptExpose(deps: Deps<{ wayId: WayId; idempotencyKey: string }>): Promise<ActionResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  assertFree(c0);
  return runKeyedAction<ActionResult>({
    key: { characterId: c0._id, idempotencyKey: input.idempotencyKey },
    stored: () =>
      storedResult(c0._id, input.idempotencyKey, (log) => log.actionId === `expose.${input.wayId}`),
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    write: async (session, txAttempts) => {
      const now = deps.now();
      const today = dayKey(now);
      const at = new Date(now);
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const blocked = notFree(c);
      if (blocked) throw blocked;
      const e = c.expose;
      if (!e) throw new GameError('NO_STORY');
      const press = pressAt(content, e.locationId);
      if (!press) throw new GameError('NO_STORY');
      if (press.city.id !== c.cityId || (c.journey && c.journey.status === 'onTheWay'))
        throw new GameError('STORY_ELSEWHERE', { locationId: e.locationId });
      if (c.today?.day === today && c.today.expose === true) throw new GameError('PRINTED_TODAY');
      const file = await DossierEntry.findOne({ _id: e.fileId, characterId: c._id }).session(session).lean<DossierEntryDoc>();
      if (!file || file.status !== 'held') {
        // Sold or spent since: the story is cleared (tech design §7.2).
        await Character.updateOne({ _id: c._id }, { $set: { expose: null } }, { session });
        throw new GameError('FILE_NOT_FOUND');
      }
      const target = file.subjectFactionId;
      if (!target) throw new GameError('NO_PARTY');
      if (target === c.factionId) throw new GameError('OWN_PARTY');
      if (isBurned(c.dossierBurns ?? [], file.subjectId, today)) throw new GameError('BURNED');

      // The press's place (Rested cap, rival ground for the odds) and the name's town (the swing).
      const pressCtx = await readPlace(content, session, c, press, today);
      const town = nameTown(content, file);
      if (!town) throw new GameError('NO_STORY');
      const townCtx = town.city.id === press.city.id && (town.location.quarterId ?? null) === (press.location.quarterId ?? null)
        ? pressCtx
        : await readPlace(content, session, c, town, today);

      const role = press.city.role ?? 'home';
      const difficulty = exposeDifficulty(file.weight ?? 0, e.angle, role);
      const seed = keySeed(c._id, input.idempotencyKey);
      const rng = createRng(seed);
      const before = projectEnergy(energyState(c), now, ENERGY.max, pressCtx.restedCap);
      const spent = spendEnergy(before, EXPOSE.energy);
      if (!spent.ok)
        throw new GameError('NOT_ENOUGH_ENERGY', { energy: before.value, cost: EXPOSE.energy, times: 1, nextTickAt: before.nextTickAt });
      const check = computeCheck({
        stats: WAYS[input.wayId],
        values: wornStats(c, content, now),
        difficulty,
        prefer: preferredStat(content, c.factionId),
      });
      const roll = rng.roll100();
      const outcome: Outcome = outcomeForRoll(roll, check.chance, 3);
      const rewards = exposeRewards(outcome, spent.restedUsed);
      const logId = new Types.ObjectId();
      const descriptor: ActionDescriptor = {
        kind: 'expose',
        type: 'expose',
        cityId: town.city.id,
        locationId: town.location.id,
        locationKind: town.location.kind,
        ...(townCtx.districtId ? { districtId: townCtx.districtId } : {}),
      };
      const live = liveIssuesOf(content, town.city.id, townCtx.cityState, today);
      const tagged = outcome === 'failure' ? [] : issueTags(live, descriptor);
      const swing = exposeSwing({ outcome, angle: e.angle, factors: tagged.map(() => ({ pct: ISSUES.swingPct })) });
      const move = outcome === 'failure' ? null : swingMove(townCtx, session, { actor: c.factionId, target, amount: swing.amount, mode: swing.mode });
      if (move?.write) await move.write();
      // The ledger (kind `expose`), the actor's leg as a contribution, the tagged Issues' points.
      if (move && move.legs.length > 0) {
        await writeLedger(
          content,
          move.legs.map((l) => ({
            cityId: town.city.id,
            placeId: townCtx.placeId,
            factionId: l.factionId,
            swing: l.swing,
            kind: 'expose' as const,
            characterId: c._id,
            ref: logId.toHexString(),
            day: today,
            at,
          })),
          session,
        );
        if (move.contribution > 0)
          await addInfluence(content, session, {
            c: { _id: c._id, name: c.name, factionId: c.factionId, level: c.level },
            cityId: town.city.id,
            placeId: townCtx.placeId,
            points: move.contribution,
            day: today,
            at,
          });
      }
      const points = tagged.length > 0 ? pointsFor(EXPOSE.energy, outcome) : 0;
      const issueEffects =
        points > 0
          ? (
              await placeWrites(content, session, {
                c,
                cityId: town.city.id,
                placeId: townCtx.placeId,
                placeName: townCtx.placeName,
                move: null,
                givesOpinion: false,
                issues: tagged.map((t) => ({ docId: t.docId, issueId: t.issueId, name: t.name, points })),
                logId: logId.toHexString(),
                today,
                at,
              })
            ).issues
          : [];

      const printed = outcome !== 'failure';
      const pc = outcome === 'success' ? EXPOSE.pc : 0;
      const gains = applyGains(progressOf(c), { xp: rewards.xp.total, fxp: rewards.fxp.total, pc });
      const tally = addToTally(c.today, today, {
        energy: EXPOSE.energy,
        xp: rewards.xp.total,
        fxp: rewards.fxp.total,
        iron: rewards.iron.total,
      });
      const burns = printed
        ? [...liveBurns(c.dossierBurns ?? [], today).filter((b) => b.subjectId !== file.subjectId), { subjectId: file.subjectId, until: burnUntil(today) }]
        : liveBurns(c.dossierBurns ?? [], today);
      const updated0 = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, 'expose.fileId': e.fileId },
        {
          $set: {
            ...progressSet(gains),
            'energy.value': spent.state.value,
            'energy.updatedAt': new Date(spent.state.updatedAt),
            rested: spent.state.rested,
            today: { ...tally, expose: true },
            expose: null,
            dossierBurns: burns,
            lastActionAt: at,
          },
          $inc: { iron: rewards.iron.total, version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated0) throw new VersionConflict();
      if (printed) {
        const spentFile = await DossierEntry.updateOne(
          { _id: file._id, status: 'held' },
          { $set: { status: 'spent', used: { how: 'expose', day: today, ref: logId.toHexString() } } },
          { session },
        );
        if (spentFile.modifiedCount !== 1) throw new VersionConflict();
      }
      // Legacy +2 on a Success (`expose:{logId}`).
      let legacy = null;
      if (outcome === 'success') {
        const row = { ...exposeLegacy(logId.toHexString(), today), params: { subjectId: file.subjectId } as never };
        const added = await addLegacyInTx(session, c._id, [row]);
        if (added.length > 0) legacy = legacyKnock(content, added[0]!, (updated0.legacy?.total ?? 0) + added[0]!.points);
      }
      const updated = legacy ? ((await Character.findById(c._id).session(session).lean<CharacterDoc>()) ?? updated0) : updated0;

      const subject = content.name(file.subjectId)?.name ?? file.subjectId;
      const fileLines = (file.lines ?? []).map((l) => entryLine(content, { ...l, subjectId: file.subjectId, cityId: file.cityId }));
      const party = partyName(content, target);
      const t = copy.life.expose.text[e.angle === 'plain' ? 'plainly' : 'headline'];
      const text =
        outcome === 'failure'
          ? t.failure()
          : outcome === 'success'
            ? t.success(party, subject)
            : (t.partial as (p: string, s: string) => { headline: string; body: string })(party, subject);
      const stamp = outcome === 'success' ? 'printed' : outcome === 'partial' ? 'pageThree' : 'spiked';
      const applied = move?.effect?.applied ?? 0;
      const lines: string[] = [];
      if (printed) lines.push(copy.life.expose.opinion(townCtx.placeName, party, applied.toFixed(1)));
      if (pc > 0) lines.push(copy.life.knock.pcGained(pc));
      if (legacy) lines.push(legacy.line);
      lines.push(printed ? copy.life.expose.fileSpent : copy.life.expose.fileKept);
      if (outcome === 'success') lines.push(copy.life.expose.inTomorrows(subject));
      const exposeOut: ExposeOutcome = {
        stamp,
        outcome,
        subjectId: file.subjectId,
        subject,
        partyId: target,
        angle: e.angle,
        fileKept: !printed,
        swing: move?.effect
          ? { placeId: townCtx.placeId, placeName: townCtx.placeName, amount: applied, mode: swing.mode, capped: !!move.effect.capped }
          : null,
        pc,
        legacy,
        lines,
        printed: {
          author: c.name,
          line1: fileLines[0] ?? '',
          line2: fileLines[1] ?? '',
          city: townCtx.placeName,
        },
      };
      const energyAfter = projectEnergy(spent.state, now, ENERGY.max, pressCtx.restedCap);
      const result: ActionResult = {
        logId: logId.toHexString(),
        idempotencyKey: input.idempotencyKey,
        performedAt: at.toISOString(),
        seed,
        place: {
          cityId: press.city.id,
          cityName: press.city.name,
          locationId: press.location.id,
          locationName: press.location.name,
          kind: press.location.kind,
        },
        kind: 'expose',
        action: { id: `expose.${input.wayId}`, name: copy.life.expose.ways[WAY_COPY[input.wayId]], type: 'expose', tier: 3, times: 1 },
        stamp: outcome,
        story: null,
        successes: outcome === 'success' ? 1 : 0,
        headline: text.headline,
        body: text.body,
        art: sceneArtOf(content),
        attempts: [{ index: 1, check, roll, outcome, rewards, restedUsed: spent.restedUsed, orderId: null }],
        rows: [],
        rewards,
        bonusTags: [],
        effects: {
          energy: { before: before.value, after: spent.state.value, max: before.max, nextTickAt: energyAfter.nextTickAt },
          rested: { before: before.rested, after: spent.state.rested },
          xp: { before: c.xp, after: updated.xp },
          fxp: { before: c.fxp, after: updated.fxp },
          iron: { before: c.iron, after: updated.iron },
          level: updated.level,
          opinion: move?.effect
            ? {
                cityId: town.city.id,
                placeId: townCtx.placeId,
                placeName: townCtx.placeName,
                factionId: target,
                delta: swing.amount,
                ...move.effect,
              }
            : null,
          standing: null,
          levelUp: gains.levelUp,
          rankUp: gains.rankUp
            ? { ...gains.rankUp, title: content.faction(c.factionId).rankTitles[gains.rankUp.to - 1] ?? '' }
            : null,
          pc: pc > 0 ? { before: c.pc, after: updated.pc } : null,
          orders: [],
          ordersAllDone: null,
          stat: null,
          item: null,
          hooks: [],
          issues: issueEffects,
          expose: exposeOut,
        },
        today: { ...tally, expose: true } as ActionResult['today'],
        again: null,
        character: toCharacterView(updated, now, content, loaded.editionReadAt),
      };
      await ActionLog.create(
        [
          {
            _id: logId,
            characterId: c._id,
            idempotencyKey: input.idempotencyKey,
            actionId: result.action.id,
            locationId: press.location.id,
            cityId: press.city.id,
            kind: 'expose',
            times: 1,
            txAttempts: txAttempts(),
            seed,
            outcome,
            result,
          },
        ],
        { session },
      );
      return result;
    },
  });
}

/** The front-page scene (`scene.front-page`), else the press's map crop is not needed: a scene. */
function sceneArtOf(content: GameContent): ActionResult['art'] {
  const s = sceneArt(content, 'scene.front-page');
  return { rung: 'scene', asset: s.kind === 'scene' ? s.asset : assetView(content, 'scene.front-page') };
}
