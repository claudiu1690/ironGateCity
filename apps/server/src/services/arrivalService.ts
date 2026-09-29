import { copy } from '@irongate/content/copy';
import type { GameContent } from '@irongate/content';
import { Arrival, Character, City, PaperEntry, isDuplicateKeyError } from '@irongate/db';
import type { ArrivalDoc, CharacterDoc } from '@irongate/db';
import { buildNewCharacter, resolveOrigin } from '@irongate/rules';
import type {
  ArrivalView,
  CharacterView,
  FactionCardView,
  FactionId,
  StoryScreenView,
} from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { computeSettlement, loadCharacter } from './dayService';
import { fill, sceneArt, storyVars } from './story';
import { MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { assetView, toCharacterView } from './views';

/**
 * The arrival (ADR 0011, slice-2 tech design §7.2): the face, the origin's six answers (set-once,
 * in order, by question index) and the faction, in an `arrivals` draft per user; the join creates
 * the character, its first City Day and its welcome edition in one transaction.
 */

const NAME_MAX = 60;

type Landing = { cityId: string; locationId: string };

function landingOf(content: GameContent, factionId: FactionId): Landing {
  const city = content.city(content.faction(factionId).homeCityId)!;
  return { cityId: city.id, locationId: city.locations[0]!.id };
}

function questionsOf(content: GameContent) {
  return content.origin.steps.flatMap((step, s) => step.questions.map((q, k) => ({ q, step, s, k })));
}

/** The next question's screen: the step's art and kicker, the echo of the answer just given. */
function storyScreen(content: GameContent, a: ArrivalDoc): StoryScreenView {
  const all = questionsOf(content);
  const i = a.answers.length;
  const { q, step, s, k } = all[i]!;
  const vars = storyVars(content, { name: a.name });
  let echo: string | null = null;
  if (k === 1) {
    const first = step.questions[0];
    const given = a.answers[i - 1];
    echo = first.answers.find((x) => x.id === given?.answerId)?.echo ?? null;
  }
  return {
    kicker: fill(step.kicker, vars),
    title: fill(step.title, vars),
    narrative: fill(step.narrative, vars),
    art: sceneArt(content, step.art),
    portrait: assetView(content, step.portrait),
    echo,
    prompt: fill(q.prompt, vars),
    choices: q.answers.map((x) => ({ id: x.id, text: fill(x.text, vars), hint: x.hint ?? null })),
    approaches: [],
    cta: null,
    progress: { step: s + 1, of: content.origin.steps.length },
  };
}

/** §7.3: the street, three cards, the wish tag on the card of the father's wish. */
function street(content: GameContent, a: ArrivalDoc): NonNullable<ArrivalView['street']> {
  const st = content.origin.street;
  const vars = storyVars(content, { name: a.name });
  let wish: { factionId: FactionId; fxp: number } | null = null;
  for (const { q } of questionsOf(content)) {
    const given = a.answers.find((x) => x.questionId === q.id);
    const effect = q.answers.find((x) => x.id === given?.answerId)?.effects.find((e) => e.kind === 'wish');
    if (effect?.kind === 'wish') wish = { factionId: effect.factionId, fxp: effect.fxp };
  }
  const cards: FactionCardView[] = content.factions.map((f) => {
    const city = content.city(f.homeCityId)?.name ?? f.homeCityId;
    const mine = wish?.factionId === f.id;
    return {
      factionId: f.id,
      name: f.name,
      crest: assetView(content, f.crestArt),
      blurb: f.card.blurb,
      facts: [copy.statBonus(f.startingBonus), copy.startsIn(city), copy.theirEvent(f.card.signatureEvent)],
      wish: mine,
      wishLabel: mine && wish ? copy.hisWish(wish.fxp) : null,
      confirm: copy.joinFaction(f.name, city),
    };
  });
  return {
    screen: {
      kicker: fill(st.kicker, vars),
      title: fill(st.title, vars),
      narrative: fill(st.narrative, vars),
      art: sceneArt(content, st.art),
      portrait: null,
      echo: null,
      prompt: null,
      choices: [],
      approaches: [],
      cta: null,
      progress: { step: content.origin.steps.length, of: content.origin.steps.length },
    },
    note: st.note,
    cards,
  };
}

function arrivalView(content: GameContent, a: ArrivalDoc | null, user: SessionUser): ArrivalView {
  const name = a?.name ?? user.name;
  const avatar = a?.avatarId ? assetView(content, a.avatarId) : null;
  const base = { name, avatar, faces: null, screen: null, questionId: null, street: null, landing: null };
  if (!a || !a.avatarId) {
    return { ...base, phase: 'face', faces: content.avatars.map((id) => assetView(content, id)) };
  }
  if (a.completedAt && a.factionId)
    return { ...base, phase: 'arrived', landing: landingOf(content, a.factionId) };
  if (a.answers.length < questionsOf(content).length) {
    return {
      ...base,
      phase: 'story',
      screen: storyScreen(content, a),
      questionId: questionsOf(content)[a.answers.length]!.q.id,
    };
  }
  return { ...base, phase: 'street', street: street(content, a) };
}

/** A user who already has a character (joined, or migrated from slices 0–1) has arrived. */
async function arrivedView(
  content: GameContent,
  user: SessionUser,
  c: Pick<CharacterDoc, 'factionId' | 'name' | 'avatarId'>,
): Promise<ArrivalView> {
  return {
    phase: 'arrived',
    name: c.name,
    avatar: c.avatarId ? assetView(content, c.avatarId) : null,
    faces: null,
    screen: null,
    questionId: null,
    street: null,
    landing: landingOf(content, c.factionId),
  };
}

const findCharacter = (user: SessionUser) =>
  Character.findOne({ userId: user.id }, { factionId: 1, name: 1, avatarId: 1 }).lean<
    Pick<CharacterDoc, '_id' | 'factionId' | 'name' | 'avatarId'>
  >();

export async function getArrival(content: GameContent, user: SessionUser): Promise<ArrivalView> {
  const c = await findCharacter(user);
  if (c) return arrivedView(content, user, c);
  return arrivalView(content, await Arrival.findOne({ userId: user.id }).lean<ArrivalDoc>(), user);
}

/** Sign-up's face (§7.3): upsert the draft; last write wins on this cosmetic value (ADR 0008). */
export async function startArrival(
  content: GameContent,
  user: SessionUser,
  avatarId: string,
): Promise<ArrivalView> {
  if (!content.avatars.includes(avatarId)) throw gameError('BAD_REQUEST', 'UNKNOWN_AVATAR', { avatarId });
  const c = await findCharacter(user);
  if (c) return arrivedView(content, user, c);
  try {
    const a = await Arrival.findOneAndUpdate(
      { userId: user.id, completedAt: null },
      {
        $setOnInsert: {
          userId: user.id,
          name: user.name.trim().slice(0, NAME_MAX) || 'Comrade',
          answers: [],
        },
        $set: { avatarId },
      },
      { upsert: true, returnDocument: 'after', lean: true },
    );
    return arrivalView(content, a as ArrivalDoc, user);
  } catch (err) {
    // A completed draft (the filter missed it) or a racing first call: read what is there.
    if (!isDuplicateKeyError(err)) throw err;
    return getArrival(content, user);
  }
}

/** One origin answer: set-once, in order (ADR 0011). A retry or a second tap returns the view. */
export async function answerArrival(
  content: GameContent,
  user: SessionUser,
  questionId: string,
  answerId: string,
  now: number,
): Promise<ArrivalView> {
  const all = questionsOf(content);
  const i = all.findIndex((x) => x.q.id === questionId);
  if (i < 0 || !all[i]!.q.answers.some((x) => x.id === answerId)) {
    throw gameError('BAD_REQUEST', 'UNKNOWN_ANSWER', { questionId, answerId });
  }
  if (await findCharacter(user)) throw gameError('PRECONDITION_FAILED', 'ALREADY_ARRIVED');
  const r = await Arrival.findOneAndUpdate(
    { userId: user.id, completedAt: null, avatarId: { $ne: null }, answers: { $size: i } },
    { $push: { answers: { questionId, answerId, at: new Date(now) } } },
    { returnDocument: 'after', lean: true },
  );
  if (r) return arrivalView(content, r as ArrivalDoc, user);

  const a = await Arrival.findOne({ userId: user.id }).lean<ArrivalDoc>();
  if (!a || !a.avatarId) throw gameError('PRECONDITION_FAILED', 'NO_FACE');
  if (a.completedAt) throw gameError('PRECONDITION_FAILED', 'ALREADY_ARRIVED', { factionId: a.factionId });
  if (a.answers.length > i) return arrivalView(content, a, user); // answered already: the first tap won
  throw gameError('BAD_REQUEST', 'OUT_OF_ORDER', { next: all[a.answers.length]?.q.id ?? null });
}

export interface JoinResult {
  character: CharacterView;
  landing: Landing;
}

/**
 * §7.3, ADR 0011: create the character from the answers, settle its first City Day (the welcome
 * set, ADR 0012) and print the welcome edition, in one transaction. The natural key is the user: a
 * concurrent join loses on the unique `characters.userId` or the `completedAt: null` guard and
 * returns the winner's character; a different faction afterwards is ALREADY_ARRIVED.
 */
export async function joinArrival(
  content: GameContent,
  user: SessionUser,
  factionId: FactionId,
  now: () => number,
): Promise<JoinResult> {
  const existing = async (): Promise<JoinResult | null> => {
    const c = await Character.findOne({ userId: user.id }, { factionId: 1 }).lean<
      Pick<CharacterDoc, 'factionId'>
    >();
    if (!c) return null;
    if (c.factionId !== factionId) {
      throw gameError('CONFLICT', 'ALREADY_ARRIVED', { factionId: c.factionId });
    }
    const loaded = await loadCharacter(user, content, now());
    return {
      character: toCharacterView(loaded.doc, now(), content, loaded.editionReadAt),
      landing: landingOf(content, factionId),
    };
  };

  const before = await existing();
  if (before) return before;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await inTransaction(async (session) => {
        const t = now();
        const a = await Arrival.findOne({ userId: user.id }).session(session).lean<ArrivalDoc>();
        if (!a || !a.avatarId) throw new GameError('NO_FACE');
        if (a.completedAt) throw new VersionConflict(); // someone joined first: read their character
        const faction = content.faction(factionId);
        const answers = a.answers.map((x) => ({ questionId: x.questionId, answerId: x.answerId }));
        const o = resolveOrigin({ origin: content.originSpec, answers, faction });
        if (!o.ok) throw new GameError('ORIGIN_INCOMPLETE', { answered: o.answered });

        const _id = new Types.ObjectId();
        const state = buildNewCharacter({
          userId: user.id,
          name: a.name,
          avatarId: a.avatarId,
          factionId,
          homeCityId: faction.homeCityId,
          outcome: o.outcome,
          answers,
          now: t,
          uid: () => new Types.ObjectId().toHexString(),
        });
        const at = new Date(t);
        const doc: CharacterDoc = {
          ...state,
          _id,
          energy: { value: state.energy.value, updatedAt: at },
          orders: { day: 0, items: [], allDoneAt: null },
          origin: { answers: state.origin.answers, arrivedAt: at },
          createdAt: at,
          updatedAt: at,
        };
        const home = await City.findById(faction.homeCityId, { opinion: 1 }).session(session).lean();
        const w = computeSettlement(content, doc, t, { previous: null, home });
        if (!w) throw new Error('a new character always has a first City Day to settle');
        await Character.create(
          [
            {
              ...doc,
              day: { settled: w.set['day.settled'] },
              job: w.set.job,
              sickDays: w.set.sickDays,
              today: w.set.today,
              orders: w.set.orders,
              iron: doc.iron + w.inc.iron,
            },
          ],
          { session },
        );
        await PaperEntry.create([w.edition], { session });
        const done = await Arrival.updateOne(
          { _id: a._id, completedAt: null },
          { $set: { completedAt: at, characterId: _id, factionId } },
          { session },
        );
        if (done.matchedCount === 0) throw new VersionConflict();
        const created = await Character.findById(_id).session(session).lean<CharacterDoc>();
        return {
          character: toCharacterView(created!, t, content, null),
          landing: landingOf(content, factionId),
        };
      });
    } catch (err) {
      if (err instanceof VersionConflict || isDuplicateKeyError(err)) {
        const winner = await existing();
        if (winner) return winner;
        continue;
      }
      if (err instanceof GameError) throw err.toTRPC();
      throw err;
    }
  }
  const winner = await existing();
  if (winner) return winner;
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: MAX_ATTEMPTS });
}
