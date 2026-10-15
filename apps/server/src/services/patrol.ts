import { PATROL_EVENT_ID } from '@irongate/content';
import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import {
  JOURNEY_SET_ASIDE,
  PATROL,
  addHeat,
  coolAndClean,
  createRng,
  dayKey,
  dayStart,
  gameDayIndex,
  heatState,
  journeyChoiceCheck,
  liveMarks,
  patrolBucket,
  patrolChance,
  patrolDecision,
  projectHeat,
  resolveJourneyChoice,
  standingBonus,
} from '@irongate/rules';
import { fadeDaysFor } from './lawBook';
import type {
  CardOutcome,
  CheckStats,
  CityView,
  JourneyChoiceSpec,
  JourneyChoiceView,
  PatrolCardResult,
  PatrolState,
  StatKey,
} from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import type { LoadedCharacter } from './dayService';
import { nightAt } from './night';
import { patrolHooks } from './patrolHooks';
import { withRequestKey } from './requestKey';
import { flagsToday, heatDoc, heatRateOn, heatTimerOf, isRivalGround, marksOf } from './risk';
import { partialReason, withFlag } from './travelService';
import { DayChanged, VersionConflict } from './txn';
import { namedStanding, standingSuccesses, toCharacterView, wornStats } from './views';

/**
 * Review 5 (answers §16.1, GDD §14.12, ADR 0081, tech design §8.3): the night patrol on rival ground.
 * A read of the city view, for the city the player stands in, may roll the patrol: one seeded roll
 * per ten-minute bucket per city, one version-guarded write, nothing for a read inside a rolled
 * bucket, inside the quiet or past the night's cap. A stop leaves a card that holds Energy acts and
 * boarding (`notFree`) until `patrol.answer` resolves it.
 */

/** The stored state as the rules read it (absent: no nights, no quiet, no card). */
export function patrolStateOf(c: Pick<CharacterDoc, 'patrol'>): PatrolState {
  const p = c.patrol;
  const card = p?.card ?? null;
  return {
    nights: (p?.nights ?? []).map((n) => ({ cityId: n.cityId, night: n.night, bucket: n.bucket, stops: n.stops })),
    quietUntil: p?.quietUntil ? new Date(p.quietUntil).getTime() : null,
    card: card
      ? {
          id: card.id.toHexString(),
          cityId: card.cityId,
          night: card.night,
          bucket: card.bucket,
          at: new Date(card.at).getTime(),
          seed: card.seed,
        }
      : null,
  };
}

const storedOf = (s: PatrolState) => ({
  nights: s.nights,
  quietUntil: s.quietUntil === null ? null : new Date(s.quietUntil),
  card: s.card
    ? {
        id: new Types.ObjectId(s.card.id),
        cityId: s.card.cityId,
        night: s.card.night,
        bucket: s.card.bucket,
        at: new Date(s.card.at),
        seed: s.card.seed,
      }
    : null,
});

/** The town's night index at `now` through the seam (a pinned night counts), or null by day. */
const nightIndex = (now: number): number | null => (nightAt(now).night ? gameDayIndex(now) : null);

/** The chance of a roll for `c` in `cityId` now (the dev status prints it too). */
export function patrolChanceFor(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  now: number,
  residenceCity: CityDoc | null,
): number {
  const heat = projectHeat(heatTimerOf(c), now, heatRateOn(content, residenceCity, c.factionId)).value;
  // The Curfew Order (slice 7) doubles it; not in force anywhere yet.
  return patrolChance({ heatState: heatState(heat), flags: flagsToday(c, cityId, dayKey(now)), curfew: false });
}

/**
 * `city.get`'s patrol (ADR 0081 §3): only for the city the player stands in. Returns the character as
 * it is after the roll (unchanged when nothing was written).
 */
export async function ensurePatrol(content: GameContent, loaded: LoadedCharacter, now: number): Promise<CharacterDoc> {
  let doc = loaded.doc;
  const id = doc._id.toHexString();
  const mode = patrolHooks.mode(id);
  // QA n2: a reader that loaded the character just before the forced stop's write answers with the
  // written document (with its card), as every reader does in `auto`.
  if (mode === 'never')
    return patrolHooks.spent(id) ? ((await Character.findById(doc._id).lean<CharacterDoc>()) ?? doc) : doc;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const cityId = doc.cityId;
    const bucket = patrolBucket(now);
    const seed = `patrol:${id}:${cityId}:${bucket}`;
    const decision = patrolDecision({
      state: patrolStateOf(doc),
      cityId,
      now,
      night: nightIndex(now),
      rivalGround: isRivalGround(content, doc, cityId),
      held: !!doc.held && doc.held.state === 'in',
      inTransit: doc.journey?.status === 'onTheWay',
      runInPending: doc.runIn?.state === 'pending',
      chance: patrolChanceFor(content, doc, cityId, now, loaded.city),
      // The bucket's seed: every reader of the bucket gets the same number (a refresh never re-rolls).
      roll: mode === 'next' ? 1 : createRng(seed).roll100(),
      cardId: () => new Types.ObjectId().toHexString(),
      seed,
    });
    if ('skip' in decision) return doc;
    const written = await Character.findOneAndUpdate(
      { _id: doc._id, version: doc.version },
      { $set: { patrol: storedOf(decision.next) }, $inc: { version: 1 } },
      { returnDocument: 'after', lean: true },
    );
    if (written) {
      if (decision.stop) patrolHooks.spend(id);
      return written;
    }
    // The version moved (an act, another read): decide again once on the fresh document.
    const fresh = await Character.findById(doc._id).lean<CharacterDoc>();
    if (!fresh) return doc;
    doc = fresh;
  }
  return doc;
}

/** *Rampart Row*: the city's street-kind place (answers §18 Q5), else the city's name. */
function streetOf(content: GameContent, cityId: string): string {
  const city = content.city(cityId);
  return city?.locations.find((l) => l.kind === 'street')?.name ?? city?.name ?? cityId;
}

/** The card's checks: the player's worn stats and Reputation in the card's city. */
function checkInputs(content: GameContent, c: CharacterDoc, cityId: string) {
  const values = wornStats(c, content);
  const named = namedStanding(content, cityId, standingSuccesses(c, cityId));
  const bonus = standingBonus(standingSuccesses(c, cityId), `${named.name} in ${content.city(cityId)?.name ?? cityId}`);
  return { values, bonus };
}

/** `CityView.patrol`: the pending card when it waits in this city (tech design §8.3), else null. */
export function patrolCityView(content: GameContent, c: CharacterDoc, cityId: string): CityView['patrol'] {
  const card = c.patrol?.card;
  if (!card || card.cityId !== cityId) return null;
  const ev = content.journeyEvent(PATROL_EVENT_ID);
  if (!ev) return null;
  const { values, bonus } = checkInputs(content, c, cityId);
  const choices: JourneyChoiceView[] = ev.choices.map((ch) => ({
    id: ch.id,
    title: ch.title,
    detail: ch.detail,
    stat: ch.stats && ch.stats[0] !== 'best' ? { stats: ch.stats as CheckStats } : null,
    chance: ch.stats
      ? journeyChoiceCheck({ stats: ch.stats, values, standingBonus: bonus, difficulty: PATROL.difficulty }).chance
      : null,
    cost: null,
    affordable: true,
    gated: !!ch.gate,
  }));
  choices.push({
    id: JOURNEY_SET_ASIDE,
    title: copy.travel.letItPass,
    detail: copy.travel.letItPassLine(ev.ignoreEffects),
    stat: null,
    chance: null,
    cost: null,
    affordable: true,
    setAside: true,
  });
  return {
    card: { eventId: ev.id, title: ev.title, setup: ev.setup, ignore: ev.ignore, choices, chosen: null, deck: 'patrol' },
    kicker: copy.patrol.kicker(streetOf(content, cityId)),
  };
}

/**
 * `patrol.answer` (tech design §8.3): request-keyed; the journey card's rules at 14 (the papers' gate
 * is Cool and Clean), or *Let it pass* and its `ignoreEffects`. Writes Heat (no rival ×2, §21.1 Q7),
 * the *Watched* flag in the card's city, and clears the card, under the version guard.
 */
export async function answerPatrol(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { choiceId: string; idempotencyKey: string };
}): Promise<PatrolCardResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PatrolCardResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'patrol.answer',
    input: { choiceId: input.choiceId },
    resettle: async () => {
      const again = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (again) await ensureSettled(content, again, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const at = new Date(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const card = c.patrol?.card;
      if (!card) throw new GameError('NO_PATROL');
      const ev = content.journeyEvent(PATROL_EVENT_ID)!;
      const cityId = card.cityId;
      const rateOn = heatRateOn(content, loaded.city, c.factionId);
      const heatNow = projectHeat(heatTimerOf(c), now, rateOn).value;

      let outcome: Omit<CardOutcome, 'rewards' | 'flag'>;
      let rw: { heat?: number; flag?: 'watched' | 'warned' };
      if (input.choiceId === JOURNEY_SET_ASIDE) {
        rw = { ...ev.ignoreEffects };
        outcome = {
          eventId: ev.id,
          choiceId: JOURNEY_SET_ASIDE,
          stamp: null,
          headline: copy.travel.letItPass,
          body: ev.ignore,
          reason: null,
        };
      } else {
        const ch = ev.choices.find((x) => x.id === input.choiceId);
        if (!ch) throw new GameError('UNKNOWN_CHOICE', { choiceId: input.choiceId }, 'BAD_REQUEST');
        const { values, bonus } = checkInputs(content, c, cityId);
        const spec: JourneyChoiceSpec = {
          id: ch.id,
          ...(ch.stats ? { stats: ch.stats } : {}),
          success: { rewards: ch.success.rewards },
          ...(ch.partial ? { partial: { rewards: ch.partial.rewards } } : {}),
          ...(ch.gate ? { gate: ch.gate } : {}),
        };
        const r = resolveJourneyChoice({
          choice: spec,
          values,
          standingBonus: bonus,
          rng: createRng(`${card.seed}:choice`),
          difficulty: PATROL.difficulty,
          ...(ch.gate ? { gateHolds: coolAndClean(heatNow, liveMarks(marksOf(c), today, fadeDaysFor(c.factionId)).length) } : {}),
        });
        const text = r.branch === 'stopped' || r.outcome === 'partial' ? ch.partial!.text : ch.success.text;
        const statsUsed = ch.stats && ch.stats[0] !== 'best' ? (ch.stats as StatKey[]) : [];
        rw = { ...(r.rewards.heat ? { heat: r.rewards.heat } : {}), ...(r.rewards.flag ? { flag: r.rewards.flag } : {}) };
        outcome = {
          eventId: ev.id,
          choiceId: ch.id,
          stamp: r.outcome === 'chosen' ? null : r.outcome,
          headline: text.headline,
          body: text.body,
          reason:
            r.outcome === 'partial' && statsUsed.length > 0 ? partialReason(content, cityId, statsUsed, values) : null,
        };
      }

      const heatChange = rw.heat ? addHeat(heatTimerOf(c), now, rateOn, rw.heat) : null;
      const set: Record<string, unknown> = { 'patrol.card': null };
      if (heatChange) set.heat = heatDoc(heatChange.timer);
      if (rw.flag) set.flags = withFlag(c, cityId, today, rw.flag);
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, 'patrol.card.id': card.id },
        { $set: set, $inc: { version: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const flags = flagsToday(updated, cityId, today);
      const rewards: CardOutcome['rewards'] =
        heatChange && heatChange.after !== heatChange.before
          ? [{ id: 'heat', amount: heatChange.after - heatChange.before }]
          : [];
      return {
        ...outcome,
        kind: 'patrolCard',
        cityId,
        rewards,
        ...(rw.flag
          ? {
              flag: {
                flag: rw.flag,
                line: copy.risk.flags[rw.flag](content.city(cityId)?.name ?? cityId, '{until}'),
                until: dayStart(today + 1),
              },
            }
          : {}),
        heat: heatChange ? { before: heatChange.before, after: heatChange.after } : null,
        flags: [...(flags.watched ? (['watched'] as const) : []), ...(flags.warned ? (['warned'] as const) : [])],
        performedAt: at.toISOString(),
        idempotencyKey: input.idempotencyKey,
        character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: loaded.city }),
      };
    },
  });
}

/** The dev status's patrol block (memory mode only). */
export function patrolStatus(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  residenceCity: CityDoc | null,
): {
  mode: string;
  chance: number | null;
  /** The start of the last bucket rolled here tonight (epoch ms), or null. */
  lastRollAt: number | null;
  stops: number;
  quietUntil: number | null;
  card: string | null;
} {
  const s = patrolStateOf(c);
  const night = nightIndex(now);
  const mine = s.nights.filter((n) => n.night === night && n.cityId === c.cityId);
  return {
    mode: patrolHooks.mode(c._id.toHexString()),
    chance: isRivalGround(content, c, c.cityId) ? patrolChanceFor(content, c, c.cityId, now, residenceCity) : null,
    lastRollAt: mine[0] ? mine[0].bucket * PATROL.bucketMs : null,
    stops: mine[0]?.stops ?? 0,
    quietUntil: s.quietUntil,
    card: s.card ? (content.city(s.card.cityId)?.name ?? s.card.cityId) : null,
  };
}
