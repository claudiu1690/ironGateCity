import { randomBytes } from 'node:crypto';
import { copy } from '@irongate/content/copy';
import type { Chapter, GameContent } from '@irongate/content';
import { ActionLog, Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  AMBITION,
  WEEKDAY_NAMES,
  addToTally,
  applyGains,
  chooseInChapter,
  completeChapter,
  computeCheck,
  createRng,
  dayKey,
  dayStart,
  energyReadyAt,
  grantItem,
  isNight,
  projectEnergy,
  resolveChapterCheck,
  weekday,
} from '@irongate/rules';
import type { ActionResult, AmbitionView, DayKey, StoryScreenView } from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { progressOf, progressSet } from './actionService';
import { ensureSettled, loadCharacter } from './dayService';
import { runKeyedAction, storedResult } from './keyedAction';
import { fill, storyVars } from './story';
import { DayChanged, VersionConflict } from './txn';
import {
  ambitionStatus,
  assetView,
  dayMonth,
  energyState,
  firstDayBonuses,
  itemArt,
  preferredStat,
  toCharacterView,
  wornStats,
} from './views';

/**
 * Ambition chapters (GDD §17.1, ADR 0013): step 1 is a set-once choice, step 2 a check paid in
 * Energy with an idempotency key (a game action, ADR 0002), step 3 the result modal. A chapter
 * never fails as a chapter; its checks count for neither Standing nor Party orders.
 */

/** "Tuesday 6 October" (the hook's date, onboarding §13 Q2). */
function dayName(day: DayKey): string {
  return `${WEEKDAY_NAMES[weekday(day)]} ${dayMonth(dayStart(day))}`;
}

/** §13.5 rung 3: a crop of the home map, by day or night, centred on the faction's HQ. */
function hqCrop(content: GameContent, c: CharacterDoc, now: number): StoryScreenView['art'] {
  const { city, location } = content.hqOf(c.factionId);
  return {
    kind: 'map-crop',
    asset: assetView(content, isNight(now) ? city.map.night : city.map.day),
    x: location.map.x,
    y: location.map.y,
  };
}

function chapterScreen(
  content: GameContent,
  c: CharacterDoc,
  chapter: Chapter,
  now: number,
): StoryScreenView | null {
  const s = chapter.story;
  const amb = content.ambition(c.ambition.id);
  if (!s || !amb) return null;
  const vars = storyVars(content, c);
  const kicker = copy.chapterKicker(amb.title, chapter.n, amb.chaptersPlanned);
  const base = { kicker, art: hqCrop(content, c, now), portrait: null, prompt: null };
  if (c.ambition.step === 'choose') {
    return {
      ...base,
      title: fill(s.choose.title, vars),
      narrative: fill(s.choose.narrative, vars),
      echo: null,
      choices: s.choose.choices.map((x) => ({
        id: x.id,
        text: fill(x.text, vars),
        hint: fill(x.hint, vars),
      })),
      approaches: [],
      cta: null,
      progress: { step: 1, of: 3 },
    };
  }
  const values = wornStats(c, content);
  const energy = projectEnergy(energyState(c), now);
  const chosen = s.choose.choices.find((x) => x.id === c.ambition.choiceId);
  return {
    ...base,
    title: fill(s.check.title, vars),
    narrative: fill(s.check.narrative, vars),
    echo: chosen ? fill(chosen.text, vars) : null,
    choices: [],
    approaches: s.check.approaches.map((a) => ({
      id: a.id,
      text: fill(a.text, vars),
      // Review 1 (§8.4, answers §2): the First day row at home on the welcome day; Legwork's tie-break.
      check: computeCheck({
        stats: a.stats,
        values,
        difficulty: s.check.difficulty,
        bonuses: firstDayBonuses(content, c, c.homeCityId, dayKey(now)),
        prefer: preferredStat(content, c.factionId),
      }),
    })),
    cta: { label: s.check.cta, energy: s.check.energy, readyAt: energyReadyAt(energy, s.check.energy) },
    progress: { step: 2, of: 3 },
  };
}

export function ambitionView(content: GameContent, c: CharacterDoc, now: number): AmbitionView {
  const today = dayKey(now);
  const amb = content.ambition(c.ambition.id);
  const chapter = content.chapter(c.ambition.id, c.ambition.chapter);
  const status = ambitionStatus(content, c, today);
  const open = status.kind === 'ready' || status.kind === 'midway';
  // n13: the hook on the chapter screen, as the last chapter's modal gave it: seven City Days after
  // the chapter last played, at the next chapter's requirement (also a chapter not playable yet).
  const last = c.ambition.history?.at(-1);
  const waitsFrom =
    status.kind === 'waiting'
      ? status.readyFrom
      : status.kind === 'none' && chapter && last
        ? last.day + AMBITION.daysBetweenChapters
        : null;
  const needs = status.kind === 'waiting' ? status.needs : (chapter?.requires ?? null);
  return {
    id: c.ambition.id,
    title: amb?.title ?? c.ambition.id,
    chapter: c.ambition.chapter,
    of: amb?.chaptersPlanned ?? 0,
    chapterTitle: chapter?.title ?? '',
    status: status.kind,
    readyFrom: status.kind === 'waiting' ? dayStart(status.readyFrom) : null,
    needs: status.kind === 'waiting' ? status.needs : null,
    screen: open && chapter ? chapterScreen(content, c, chapter, now) : null,
    letterFrom: chapter?.story?.letterFrom ?? null,
    waitsUntil:
      !open && waitsFrom !== null
        ? copy.chapterWaitsUntil(dayName(waitsFrom), needs ? copy.chapterNeeds(needs) : null)
        : null,
  };
}

export async function getAmbition(
  content: GameContent,
  user: SessionUser,
  now: number,
): Promise<AmbitionView> {
  const { doc } = await loadCharacter(user, content, now);
  return ambitionView(content, doc, now);
}

/** Step 1: set-once (ADR 0013). A second tap, or a retry after the chapter moved on, returns the view. */
export async function chooseChapter(
  content: GameContent,
  user: SessionUser,
  n: number,
  choiceId: string,
  now: number,
): Promise<AmbitionView> {
  const { doc: c } = await loadCharacter(user, content, now);
  if (n < c.ambition.chapter) return ambitionView(content, c, now); // already played
  const status = ambitionStatus(content, c, dayKey(now));
  const spec = content.chapterRules(c.ambition.id, n);
  if (n !== c.ambition.chapter || !spec || status.kind === 'none' || status.kind === 'waiting') {
    throw gameError('PRECONDITION_FAILED', 'CHAPTER_NOT_READY', {
      readyFrom: status.kind === 'waiting' ? dayStart(status.readyFrom) : null,
      needs: status.kind === 'waiting' ? status.needs : null,
    });
  }
  const r = chooseInChapter(c.ambition, spec, n, choiceId);
  if (!r.ok) {
    throw gameError(r.reason === 'UNKNOWN_CHOICE' ? 'BAD_REQUEST' : 'PRECONDITION_FAILED', r.reason, {
      choiceId,
    });
  }
  if (!r.changed) return ambitionView(content, c, now);
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version, 'ambition.chapter': n, 'ambition.step': 'choose' },
    { $set: { ambition: r.state }, $inc: { version: 1 } },
    { returnDocument: 'after', lean: true },
  );
  // A concurrent tap chose first: its choice stands.
  const fresh = updated ?? (await Character.findById(c._id).lean<CharacterDoc>());
  return ambitionView(content, fresh!, now);
}

export interface AttemptInput {
  chapter: number;
  approachId: string;
  idempotencyKey: string;
}

/** Step 2: the check, a keyed game action (ADR 0002 via `runKeyedAction`). */
export async function attemptChapter(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: AttemptInput;
}): Promise<ActionResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const c0 = loaded.doc;
  const actionId = `${c0.ambition.id}.${input.chapter}`;
  return runKeyedAction<ActionResult>({
    stored: () =>
      storedResult(
        c0._id,
        input.idempotencyKey,
        (log) => log.actionId === actionId && log.result.story?.approachId === input.approachId,
      ),
    resettle: async () => {
      const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
      loaded.editionReadAt = null;
    },
    write: async (session, txAttempts) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const n = input.chapter;
      const status = ambitionStatus(content, c, today);
      const chapter = content.chapter(c.ambition.id, n);
      const spec = content.chapterRules(c.ambition.id, n);
      if (c.ambition.chapter !== n || !chapter?.story || !spec)
        throw new GameError('CHAPTER_NOT_READY', { chapter: n });
      if (c.ambition.step === 'choose') {
        if (status.kind !== 'ready') throw new GameError('CHAPTER_NOT_READY', { chapter: n });
        throw new GameError('CHOOSE_FIRST', { chapter: n });
      }
      if (status.kind !== 'midway') throw new GameError('CHAPTER_NOT_READY', { chapter: n });

      const seed = randomBytes(16).toString('hex');
      const r = resolveChapterCheck(
        {
          spec,
          approachId: input.approachId,
          values: wornStats(c, content),
          energy: energyState(c),
          now,
          bonuses: firstDayBonuses(content, c, c.homeCityId, today),
          prefer: preferredStat(content, c.factionId),
        },
        createRng(seed),
      );
      if (!r.ok) {
        if (r.reason === 'UNKNOWN_APPROACH') {
          throw new GameError('UNKNOWN_APPROACH', { approachId: input.approachId }, 'BAD_REQUEST');
        }
        throw new GameError('NOT_ENOUGH_ENERGY', {
          energy: r.energy.value,
          cost: r.cost,
          times: 1,
          nextTickAt: r.energy.nextTickAt,
        });
      }
      const res = r.resolution;
      const gains = applyGains(progressOf(c), {
        xp: res.rewards.xp.total,
        fxp: res.rewards.fxp.total,
        pc: 0,
      });
      const keepsake = content.itemSpec(chapter.story.keepsake)!;
      const inv = grantItem(c.inventory ?? [], keepsake, {
        uid: new Types.ObjectId().toHexString(),
        day: today,
        source: 'chapter',
      });
      const logId = new Types.ObjectId();
      const ambition = completeChapter(c.ambition, {
        approachId: input.approachId,
        outcome: res.outcome,
        day: today,
        logId: logId.toHexString(),
      });
      // §20 Q3: the chapter's Energy, XP, FXP and Iron count in Today; no attempt, no win.
      const tally = addToTally(c.today, today, {
        energy: res.energy.cost,
        xp: res.rewards.xp.total,
        fxp: res.rewards.fxp.total,
        iron: res.rewards.iron.total,
      });
      const updated = await Character.findOneAndUpdate(
        {
          _id: c._id,
          version: c.version,
          'day.settled': today,
          'ambition.chapter': n,
          'ambition.step': 'check',
        },
        {
          $set: {
            ...progressSet(gains),
            'energy.value': res.energy.after.value,
            'energy.updatedAt': new Date(res.energy.after.updatedAt),
            rested: res.energy.after.rested,
            inventory: inv.inventory,
            ambition,
            today: tally,
            lastActionAt: new Date(now),
          },
          $inc: { iron: res.rewards.iron.total, version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();

      const { city, location } = content.hqOf(c.factionId);
      const amb = content.ambition(c.ambition.id)!;
      const vars = storyVars(content, c);
      const text = chapter.story.result[res.outcome];
      const next = content.chapter(c.ambition.id, n + 1);
      const choice = chapter.story.choose.choices.find((x) => x.id === c.ambition.choiceId);
      const energyAfter = projectEnergy(res.energy.after, now);
      const bonusTags =
        res.energy.restedUsed > 0
          ? [
              {
                id: 'rested',
                label: 'Rested',
                note: `${res.energy.restedUsed} of ${res.energy.cost} Energy, +${Math.round((50 * res.energy.restedUsed) / res.energy.cost)} % XP and Iron`,
              },
            ]
          : [];
      const result: ActionResult = {
        logId: logId.toHexString(),
        idempotencyKey: input.idempotencyKey,
        performedAt: new Date(now).toISOString(),
        seed,
        place: {
          cityId: city.id,
          cityName: city.name,
          locationId: location.id,
          locationName: location.name,
          kind: location.kind,
        },
        kind: 'chapter',
        action: { id: `${amb.id}.${n}`, name: chapter.title, type: 'chapter', tier: 3, times: 1 },
        stamp: res.outcome,
        story: {
          ambitionId: amb.id,
          ambitionTitle: amb.title,
          chapter: n,
          of: amb.chaptersPlanned,
          approachId: input.approachId,
          choiceText: choice ? fill(choice.text, vars) : '',
        },
        successes: res.outcome === 'success' ? 1 : 0,
        headline: fill(text.headline, vars),
        body: fill(text.body, vars),
        art: {
          rung: 'map-crop',
          asset: assetView(content, isNight(now) ? city.map.night : city.map.day),
          x: location.map.x,
          y: location.map.y,
        },
        attempts: [
          { ...res.attempt, rewards: res.rewards, restedUsed: res.energy.restedUsed, orderId: null },
        ],
        rows: [],
        rewards: res.rewards,
        bonusTags,
        effects: {
          energy: {
            before: res.energy.before.value,
            after: res.energy.after.value,
            max: res.energy.before.max,
            nextTickAt: energyAfter.nextTickAt,
          },
          rested: { before: res.energy.before.rested, after: res.energy.after.rested },
          xp: { before: c.xp, after: updated.xp },
          fxp: { before: c.fxp, after: updated.fxp },
          iron: { before: c.iron, after: updated.iron },
          level: updated.level,
          opinion: null,
          standing: null,
          levelUp: gains.levelUp,
          rankUp: gains.rankUp
            ? {
                ...gains.rankUp,
                title: content.faction(c.factionId).rankTitles[gains.rankUp.to - 1] ?? '',
              }
            : null,
          pc: null,
          orders: [],
          ordersAllDone: null,
          stat: null,
          item: {
            itemId: keepsake.id,
            name: content.item(keepsake.id)!.name,
            keepsake: keepsake.keepsake,
            art: itemArt(content, c, keepsake.id),
          },
          hooks: next
            ? [
                copy.chapterHook(
                  next.n,
                  next.title,
                  dayName(today + AMBITION.daysBetweenChapters),
                  next.requires ? copy.chapterNeeds(next.requires) : null,
                ),
              ]
            : [],
        },
        today: tally,
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
            locationId: location.id,
            cityId: city.id,
            kind: 'chapter',
            times: 1,
            txAttempts: txAttempts(),
            seed,
            outcome: result.stamp,
            result,
          },
        ],
        { session },
      );
      return result;
    },
  });
}
