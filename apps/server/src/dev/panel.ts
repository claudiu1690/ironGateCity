import { togetherAction, togetherStatus } from './together';
import { NATION_DEV_ACTIONS, nationAction, nationStatus } from './nationPanel';
import { LIFE_DEV_ACTIONS, lifeAction, lifeStatus } from './life';
import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { BOOST, Character, District, IssueModel, Journey, RuleBallot } from '@irongate/db';
import type { CharacterDoc, CityDoc, DistrictDoc, IssueDoc, RuleBallotDoc } from '@irongate/db';
import {
  ENERGY,
  RANK_FXP,
  RECORD,
  RESIDENCE,
  STANDING,
  TRAVEL,
  WEEKDAY_NAMES,
  councilDay,
  councilKey,
  cycleOf,
  dayKey,
  dayStart,
  healthMax,
  heatState,
  isMonday,
  projectEnergy,
  weekOf,
  weekday,
} from '@irongate/rules';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Auth } from '../auth';
import { ensureCityDay, runCityDay } from '../services/cityDay';
import { loadCharacter } from '../services/dayService';
import { moraleOf, ordinanceIdOn, homeCapOf, restedCapToday } from '../services/modifiers';
import { residenceCityId, residenceOf, residenceSpec } from '../services/residence';
import { ballotCards } from '../services/ruleBallot';
import { groundswellOn } from '../services/modifiers';
import { nightAt, nightHooks } from '../services/night';
import { patrolStatus } from '../services/patrol';
import { patrolHooks } from '../services/patrolHooks';
import { energyState } from '../services/views';
import type { SessionUser } from '../trpc/context';
import { applyCharacterSeed } from './characterSeed';
import { HOUR_MS, formatUtc, nextDayAt, nextPhaseAt, phaseLabel, phaseOf, toDuskAt } from './clock';
import {
  DevRefusal,
  decideNow,
  releaseNow,
  rivalHomes,
  riskStatus,
  sendHeld,
  setNextRunIn,
  setStreet,
  tapRunInChance,
} from './risk';
import type { DevAction, DevActionResult, DevHomeCity, DevStatus } from './types';
import { UnrestBody, pushIntoUnrest } from './unrest';
import { addRuleVotes, seatMe } from './voting';

/**
 * The dev time-skip panel's routes (README "Reviewing with the dev panel"). Registered only inside
 * the E2E_TEST_HOOKS guard in app.ts, which env.ts allows only with DB_MODE=memory, so outside
 * memory mode these routes do not exist (404), and the client, which asks the status route first,
 * renders nothing. No game rule here: the panel moves the shared test clock and then runs the
 * existing city day (the worker's job) and the player's settlement (the lazy path), or writes
 * through the existing e2e character hook.
 */

export interface DevClock {
  now: () => number;
  offsetMs: () => number;
  /** Forward only (QA n11); kept in the database (review 6 leftovers, dev/clockStore.ts). */
  advance: (ms: number) => Promise<void>;
}

export interface DevPanelDeps {
  auth: Auth;
  content: GameContent;
  clock: DevClock;
}

const DEV_ACTIONS: readonly DevAction[] = [
  // Slice 7 (tech design §8.7).
  ...NATION_DEV_ACTIONS,
  // Slice 8 phase B, lane 2 (tech design §8.7).
  ...LIFE_DEV_ACTIONS,
  // Slice 6 (tech design §8.7).
  'members',
  'fillEvent',
  'startEvent',
  'rolls',
  'memberCells',
  'memberWard',
  'memberSays',
  'chatReset',
  // Review 7.
  'iron',
  'hour',
  'day',
  'phase',
  'boost',
  'energy',
  'arrive',
  'monday',
  'level10',
  'irongate',
  'live',
  // Slice 5 (tech design §8.6).
  'heat',
  'health',
  'record',
  'runIn',
  'caught',
  'cells',
  'infirmary',
  'release',
  'decide',
  'level6',
  'rank3',
  'goto',
  'unbar',
  // Review 5 (ADR 0079, 0081).
  'dusk',
  'patrol',
  // Review 5 (ADR 0082).
  'unrest',
  // The voting rework (tech design §12, design §8.9.2 #15).
  'seat',
  'townVotes',
];
/** Slice 5 (tech design §8.6): the panel's *Level 6* and *Rank 3*. */
const DEV_LEVEL = 6;
const DEV_RANK = 3;
/** Review 7: the panel's *Give 2,000 Iron*. */
const DEV_IRON = 2_000;
const weekdayOf = (day: number) => WEEKDAY_NAMES[weekday(day)];
/**
 * Boost me: Rank 3 and One of Us at home, and PC for a declare and more. Higher Standing than the
 * operator `admin:boost` (Known) so a lone reviewer can top the poll: ward 150 ÷ 5 = 30 + 2 branch
 * endorsements × 3 + their own ballot = 37 against the seventh NPC seat's ~19.
 */
export const DEV_BOOST = { fxp: BOOST.fxp, successes: STANDING.thresholds[4], pc: 30 } as const;

async function sessionUser(auth: Auth, request: FastifyRequest): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  return session ? { id: session.user.id, name: session.user.name } : null;
}

async function homeView(
  content: GameContent,
  cityId: string,
  city: CityDoc | null,
  now: number,
): Promise<DevHomeCity> {
  const spec = content.city(cityId);
  const today = dayKey(now);
  const offset = spec?.council?.offset;
  let council: DevHomeCity['council'] = null;
  if (offset !== undefined) {
    const { cycleDay } = cycleOf(today, offset);
    const next = nextPhaseAt(now, offset);
    council = {
      cycleDay,
      phase: phaseOf(cycleDay),
      phaseLabel: phaseLabel(cycleDay),
      next: { phase: next.phase, at: next.startsAt, atUtc: formatUtc(next.startsAt) },
    };
  }
  const state = moraleOf(content, city);
  const home = spec?.homeFactionId;
  const ordId = ordinanceIdOn(city, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  // The voting rework (tech design §12): this cycle's ballot (its cards provisional on days 0–1) and
  // how the rule in force won.
  let ballot: DevHomeCity['ballot'] = null;
  if (offset !== undefined) {
    const k = cycleOf(today, offset).cycle;
    const b = await ballotCards(content, cityId, k, city);
    ballot = {
      status: b.doc?.status ?? 'open',
      cards: b.cards.map((x) => content.ordinance(x.ordinanceId)?.name ?? x.ordinanceId),
    };
  }
  const paperId = city?.ordinance?.id === ordId ? city?.ordinance?.paperId : null;
  const decided = paperId ? await RuleBallot.findById(paperId, { result: 1 }).lean<RuleBallotDoc>() : null;
  return {
    cityId,
    cityName: spec?.name ?? cityId,
    council,
    morale:
      state && city && home
        ? { state, word: copy.moraleWord[state] ?? state, share: city.opinion![home] }
        : null,
    ordinance: ord
      ? {
          id: ord.id,
          name: ord.name,
          daysLeft: city?.ordinance?.id === ord.id ? city.ordinance.toDay - today : null,
          how: decided?.result?.winner === ord.id ? decided.result.how : null,
        }
      : null,
    ballot,
  };
}

async function statusFor(
  deps: DevPanelDeps,
  user: SessionUser | null,
): Promise<{ status: DevStatus; character: CharacterDoc | null }> {
  const { content, clock } = deps;
  const now = clock.now();
  const c = user ? await Character.findOne({ userId: user.id }).lean<CharacterDoc>() : null;
  // The same lazy settle every city read does (ADR 0017), so the phase and morale are today's.
  // Slice 4 (ADR 0026): the residence city, whose council and paper are the character's.
  const city = c ? await ensureCityDay(content, residenceCityId(c), now) : null;
  const energy = c
    ? projectEnergy(energyState(c), now, ENERGY.max, restedCapToday(content, city, dayKey(now), c.room, c.factionId, homeCapOf(c)))
    : null;
  // Slice 4 (tech design §8.7): where, where you live, the capital's districts, the Issues.
  const capitalId = content.nation.capitalId;
  const districts = await District.find({ cityId: capitalId }).sort({ _id: 1 }).lean<DistrictDoc[]>();
  const today = dayKey(now);
  const r = c ? residenceOf(c) : null;
  const resCity = r ? city : null;
  const live = resCity?.issues?.weekDay === weekOf(today) ? resCity.issues.live : [];
  const issueDocs = live.length
    ? await IssueModel.find({ _id: { $in: live.map((l) => l.docId) } })
        .sort({ order: 1 })
        .lean<IssueDoc[]>()
    : [];
  const where: DevStatus['where'] = !c
    ? null
    : c.journey?.status === 'onTheWay'
      ? {
          train: {
            to: c.journey.to,
            toName: content.city(c.journey.to)?.name ?? c.journey.to,
            minutesLeft: Math.max(0, Math.ceil((new Date(c.journey.arrivesAt).getTime() - now) / 60_000)),
          },
        }
      : { cityId: c.cityId, cityName: content.city(c.cityId)?.name ?? c.cityId };
  return {
    character: c,
    status: {
      where,
      residence: r
        ? {
            cityName: content.city(r.cityId)?.name ?? r.cityId,
            districtName: r.districtId
              ? (content.district(r.districtId)?.quarter.name ?? r.districtId)
              : null,
            votesFrom: weekdayOf(r.votesFromDay),
            standsFrom: weekdayOf(r.standsFromDay),
            canMoveFrom: weekdayOf(r.canMoveFromDay),
          }
        : null,
      capital: districts.map((d) => {
        const g = groundswellOn(d, today);
        return {
          id: d._id,
          name: content.district(d._id)?.quarter.name ?? d._id,
          shares: d.opinion,
          closeRace: d.state.battleground,
          comeback: g ? `${content.faction(g.factionId).shortName} +${g.pct} %` : null,
        };
      }),
      issues: issueDocs.map((d) => ({
        name: content.issue(d.issueId)?.name ?? d.issueId,
        placeName: d.districtId
          ? (content.district(d.districtId)?.quarter.name ?? d.districtId)
          : (content.city(d.cityId)?.name ?? d.cityId),
        momentum: d.momentum,
      })),
      hooks: true,
      now,
      utc: formatUtc(now),
      offsetMs: clock.offsetMs(),
      cityDay: dayKey(now),
      night: (() => {
        const n = nightAt(now);
        return {
          night: n.night,
          nextDusk: n.nextDusk,
          nextDuskUtc: formatUtc(n.nextDusk),
          nextDawn: n.nextDawn,
          nextDawnUtc: formatUtc(n.nextDawn),
          mode: nightHooks.mode,
          tapRunIn: c ? tapRunInChance(content, c, city, now) : null,
        };
      })(),
      patrol: c
        ? (() => {
            const p = patrolStatus(content, c, now, city);
            return { ...p, quietUntilUtc: p.quietUntil !== null ? formatUtc(p.quietUntil) : null };
          })()
        : null,
      character:
        c && energy
          ? { name: c.name, rank: c.rank, pc: c.pc, energy: energy.value, energyMax: energy.max }
          : null,
      home: c ? await homeView(content, residenceCityId(c), city, now) : null,
      risk: c ? await riskStatus(content, c, city, now) : null,
      together: c ? await togetherStatus(c, now) : null,
      nation: await nationStatus(content, c, now),
      life: await lifeStatus(content, c, now),
    },
  };
}

/** What changed in the home city, for the result line: the phase entered, morale, the ordinance. */
function cityChanges(before: DevStatus, after: DevStatus): string[] {
  const a = after.home;
  const b = before.home;
  if (!a) return [];
  const out: string[] = [];
  const city = a.cityName;
  const days = after.cityDay - before.cityDay;
  if (days > 0 && a.council) {
    // A new phase, or a whole cycle skipped (the same phase again, a cycle on).
    const entered = a.council.phase !== b?.council?.phase || days >= 5;
    if (entered && a.council.phase === 'result-day')
      out.push(`the count is in · ${a.ordinance?.name ?? 'no rule'} runs in ${city}`);
    else if (entered && a.council.phase === 'vote') out.push(`the vote opens in ${city}`);
    else out.push(`${a.council.phaseLabel.toLowerCase()} in ${city}`);
  }
  if (days > 1) out.push(`${days} days on`);
  if (a.morale && b?.morale && a.morale.state !== b.morale.state) {
    out.push(`${city} morale ${b.morale.word} → ${a.morale.word}`);
  }
  if ((a.ordinance?.id ?? null) !== (b?.ordinance?.id ?? null)) {
    out.push(a.ordinance ? `${a.ordinance.name} in force` : 'no rule in force');
  }
  return out;
}

async function runAction(
  deps: DevPanelDeps,
  action: DevAction,
  user: SessionUser | null,
  body: { target?: unknown } = {},
): Promise<DevActionResult> {
  const { content, clock } = deps;
  const { status: before, character: c } = await statusFor(deps, user);
  const needCharacter = (): { me: SessionUser; home: CharacterDoc } => {
    if (!user) throw new DevRefusal(401, 'sign in first');
    if (!c) throw new DevRefusal(409, 'no character yet: finish the arrival first');
    return { me: user, home: c };
  };

  let moved = false;
  let did = '';
  /** Slice 5: the read path settles what the hook made due (a release, a run-in decided). */
  let settle = false;
  switch (action) {
    case 'hour':
      await clock.advance(HOUR_MS);
      moved = true;
      break;
    case 'day':
      await clock.advance(nextDayAt(clock.now()) - clock.now());
      moved = true;
      break;
    case 'dusk':
      await clock.advance(toDuskAt(clock.now()) - clock.now());
      moved = true;
      break;
    case 'phase': {
      const { home } = needCharacter();
      const residence = residenceCityId(home);
      const offset = content.city(residence)?.council?.offset;
      if (offset === undefined) throw new DevRefusal(409, `${residence} has no council`);
      await clock.advance(nextPhaseAt(clock.now(), offset).landAt - clock.now());
      moved = true;
      break;
    }
    case 'boost': {
      const { me } = needCharacter();
      // Settle first (the lazy path), then lift what is below the mark; nothing is ever lowered.
      const { doc } = await loadCharacter(me, content, clock.now());
      // The boost's One of Us is in the faction's home city (characterSeed).
      // eslint-disable-next-line no-restricted-properties -- the faction's home
      const successes = doc.localStanding.find((s) => s.cityId === doc.homeCityId)?.successes ?? 0;
      const set = await applyCharacterSeed(
        doc,
        {
          ...(doc.fxp < DEV_BOOST.fxp ? { fxp: DEV_BOOST.fxp } : {}),
          ...(successes < DEV_BOOST.successes ? { successes: DEV_BOOST.successes } : {}),
          ...(doc.pc < DEV_BOOST.pc ? { pc: DEV_BOOST.pc } : {}),
          energy: ENERGY.max,
        },
        clock.now(),
      );
      const changes = [
        ...(set.rank !== undefined && set.rank !== doc.rank
          ? [`Rank ${doc.rank} → ${String(set.rank)}`]
          : []),
        ...(set.fxp !== undefined ? [`FXP ${doc.fxp} → ${String(set.fxp)}`] : []),
        ...(set.localStanding !== undefined
          ? [
              // eslint-disable-next-line no-restricted-properties -- the faction's home
              `One of Us in ${content.city(doc.homeCityId)?.name ?? doc.homeCityId} (${DEV_BOOST.successes} Successes)`,
            ]
          : []),
        ...(set.pc !== undefined ? [`Political Capital ${doc.pc} → ${String(set.pc)}`] : []),
      ];
      did =
        changes.length > 0
          ? `Boosted: ${changes.join(', ')} · Energy ${ENERGY.max}`
          : `Already boosted · Energy ${ENERGY.max}`;
      break;
    }
    case 'arrive': {
      // On a train: the journey arrives now (the next read settles it, as the e2e hook).
      const { home } = needCharacter();
      if (home.journey?.status !== 'onTheWay') throw new DevRefusal(409, 'not on a train');
      const at = new Date(clock.now());
      await Journey.updateOne({ _id: home.journey.id, status: 'onTheWay' }, { $set: { arrivesAt: at } });
      await Character.updateOne(
        { _id: home._id, 'journey.id': home.journey.id },
        { $set: { 'journey.arrivesAt': at } },
      );
      await loadCharacter(needCharacter().me, content, clock.now());
      did = `Arrived in ${content.city(home.journey.to)?.name ?? home.journey.to}`;
      break;
    }
    case 'monday': {
      // Forward to the next Monday 00:01: last week's Issues resolve and two new are drawn.
      const t0 = clock.now();
      let d = dayKey(t0) + 1;
      while (!isMonday(d)) d += 1;
      await clock.advance(dayStart(d) + 60_000 - t0);
      moved = true;
      break;
    }
    case 'level10': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const set = await applyCharacterSeed(
        doc,
        {
          ...(doc.level < TRAVEL.level ? { level: TRAVEL.level } : {}),
          ...(doc.rank < RESIDENCE.rank ? { fxp: RANK_FXP[RESIDENCE.rank - 1]! } : {}),
        },
        clock.now(),
      );
      did =
        Object.keys(set).length > 0
          ? `Level ${TRAVEL.level}, Rank ${Math.max(doc.rank, RESIDENCE.rank)}`
          : 'Already Level 10';
      break;
    }
    case 'irongate': {
      // No ticket, no card: the character simply stands in the capital.
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await applyCharacterSeed(doc, { cityId: content.nation.capitalId }, clock.now());
      did = `Now in ${content.capitalCity().name}`;
      break;
    }
    case 'live': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const target = String(body.target ?? '');
      const capital = content.nation.capitalId;
      // eslint-disable-next-line no-restricted-properties -- 'home' is the faction's home
      const home = doc.homeCityId;
      const residence =
        target === 'home'
          ? { cityId: home, districtId: null }
          : content.district(target)?.city.id === capital
            ? { cityId: capital, districtId: target }
            : null;
      if (!residence) throw new DevRefusal(400, 'target is a capital district id or "home"');
      await applyCharacterSeed(doc, { residence }, clock.now());
      did = `Lives in ${residence.districtId ? content.district(residence.districtId)!.quarter.name : content.city(residence.cityId)!.name}`;
      break;
    }
    case 'energy': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await applyCharacterSeed(doc, { energy: ENERGY.max }, clock.now());
      did = `Energy ${ENERGY.max} / ${ENERGY.max}`;
      break;
    }
    // Slice 5 (tech design §8.6): each is a test hook's write, then the read path's settle.
    case 'heat': {
      const { me } = needCharacter();
      const value = Number(body.target);
      if (!Number.isInteger(value) || value < 0 || value > 100)
        throw new DevRefusal(400, 'target is Heat 0..100');
      const { doc } = await loadCharacter(me, content, clock.now());
      await applyCharacterSeed(doc, { heat: value }, clock.now());
      did = `Heat ${value} · ${heatState(value)}`;
      break;
    }
    case 'health': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const max = healthMax(doc.level);
      const value =
        body.target === 'full' ? max : body.target === 'half' ? Math.floor(max / 2) : Number(body.target);
      if (!Number.isInteger(value) || value < 0) throw new DevRefusal(400, 'target is full, half or a value');
      await applyCharacterSeed(doc, { health: value }, clock.now());
      did = `Health ${Math.min(value, max)} / ${max}`;
      break;
    }
    case 'record': {
      const { me } = needCharacter();
      const n = Number(body.target);
      if (!Number.isInteger(n) || n < 0 || n > 20)
        throw new DevRefusal(400, 'target is a number of marks 0..20');
      const { doc } = await loadCharacter(me, content, clock.now());
      // Today's minor marks: they fade together, 14 days on.
      await applyCharacterSeed(
        doc,
        { marks: Array.from({ length: n }, () => ({ kind: 'minor' as const, daysAgo: 0 })) },
        clock.now(),
      );
      did =
        n === 0
          ? 'Record clean'
          : `Record: ${n} mark${n === 1 ? '' : 's'} (fade in ${RECORD.minorFadeDays} days)`;
      break;
    }
    case 'runIn': {
      const { home } = needCharacter();
      const target = String(body.target ?? '');
      const f = setNextRunIn(content, home, target);
      did =
        f.runIn === 'never'
          ? 'Next act: no run-in'
          : f.opponentId
            ? `Next act: a run-in with ${content.opponent(f.opponentId)?.label ?? f.opponentId}`
            : 'Next act: a run-in (the place draws the opponent)';
      break;
    }
    case 'caught': {
      const { home } = needCharacter();
      setStreet(content, home, { caught: 'always' });
      did = 'Next act: caught';
      break;
    }
    case 'cells':
    case 'infirmary': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await sendHeld(content, doc, action, clock.now());
      did = action === 'cells' ? 'Taken in: the cells' : 'Taken to the infirmary';
      settle = true;
      break;
    }
    case 'release': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await releaseNow(doc, clock.now());
      did = 'Released now (the release modal waits)';
      settle = true;
      break;
    }
    case 'decide': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await decideNow(doc, clock.now());
      did = 'The run-in is decided by luck (the result modal waits)';
      settle = true;
      break;
    }
    case 'level6': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      if (doc.level >= DEV_LEVEL) {
        did = `Already Level ${DEV_LEVEL}`;
        break;
      }
      await applyCharacterSeed(doc, { level: DEV_LEVEL }, clock.now());
      did = `Level ${DEV_LEVEL}`;
      break;
    }
    case 'rank3': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      if (doc.rank >= DEV_RANK) {
        did = `Already Rank ${DEV_RANK}`;
        break;
      }
      await applyCharacterSeed(doc, { rank: DEV_RANK }, clock.now());
      did = `Rank ${DEV_RANK} (FXP ${RANK_FXP[DEV_RANK - 1]!})`;
      break;
    }
    case 'goto': {
      // No ticket, no card: the character simply stands in a rival home city.
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const target = rivalHomes(content, doc).find((x) => x.cityId === String(body.target ?? ''));
      if (!target) throw new DevRefusal(400, 'target is a rival home city id');
      if (doc.held?.state === 'in') throw new DevRefusal(409, `in the ${doc.held.kind}`);
      await applyCharacterSeed(doc, { cityId: target.cityId }, clock.now());
      did = `Now in ${target.cityName} (rival ground)`;
      break;
    }
    case 'patrol': {
      const { home } = needCharacter();
      const mode = String(body.target ?? '');
      if (mode !== 'next' && mode !== 'never' && mode !== 'auto')
        throw new DevRefusal(400, 'target is next, never or auto');
      patrolHooks.set(home._id.toHexString(), mode);
      did =
        mode === 'next'
          ? 'The next read of a rival town at night stops you'
          : mode === 'never'
            ? 'No patrol rolls for you'
            : 'Patrols roll as the game does';
      break;
    }
    case 'unrest': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const target = rivalHomes(content, doc).find((x) => x.cityId === String(body.target ?? ''));
      if (!target) throw new DevRefusal(400, 'target is a rival home city id');
      // A town already in Unrest is lifted out first, so this is always a fresh entry.
      await pushIntoUnrest(
        content,
        doc,
        UnrestBody.parse({ cityId: target.cityId, share: 65, pushed: 0 }),
        clock.now(),
      );
      const r = await pushIntoUnrest(content, doc, UnrestBody.parse({ cityId: target.cityId }), clock.now());
      did = `${r.cityName} pushed into Unrest (${r.share.toFixed(1)} %, ${r.pushed} points in your name): the prize is decided at the next day's turn`;
      break;
    }
    case 'seat': {
      // The voting rework (tech design §12): the lowest-ranked local seat of the sitting council.
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      try {
        const r = await seatMe(content, doc, {}, clock.now());
        did = `Seat ${r.seat} on ${r.councilKey}: your rule is the branch's until you change it at your desk`;
      } catch (err) {
        if (err instanceof DevRefusal && err.message.startsWith('already seated'))
          throw new DevRefusal(409, copy.dev.alreadySeated);
        throw err;
      }
      settle = true;
      break;
    }
    case 'townVotes': {
      // Days 2–4: three synthetic votes for card 2 of the residence's set ballot (a councillor's card
      // winning without three accounts).
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const spec = residenceSpec(content, doc);
      const cal = councilDay(dayKey(clock.now()), spec.offset);
      const b =
        cal.cycleDay >= 2
          ? await RuleBallot.findById(councilKey(spec.city.id, cal.cycle)).lean<RuleBallotDoc>()
          : null;
      const card = b?.status === 'set' ? b.cards?.[1] : undefined;
      if (!card) throw new DevRefusal(409, copy.dev.notTheVote);
      const r = await addRuleVotes(content, doc, { votes: { [card.ordinanceId]: 3 } }, clock.now());
      did = `${r.added} votes for ${content.ordinance(card.ordinanceId)?.name ?? card.ordinanceId} (card 2) in ${r.electionId}`;
      break;
    }
    case 'unbar': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const n = (doc.barred ?? []).length;
      if (n > 0) await Character.updateOne({ _id: doc._id }, { $set: { barred: [] }, $inc: { version: 1 } });
      did = n > 0 ? 'The bar is lifted' : 'No bar to lift';
      break;
    }
    case 'iron': {
      // Review 7: enough to post bail (and more) without the console.
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await Character.updateOne({ _id: doc._id }, { $inc: { iron: DEV_IRON, version: 1 } });
      did = `+${DEV_IRON.toLocaleString('en-GB')} Iron (now ${(doc.iron + DEV_IRON).toLocaleString('en-GB')})`;
      settle = true;
      break;
    }
    case 'dossierThree':
    case 'dossierStale':
    case 'dossierNext':
    case 'dossierFile':
    case 'rentToday':
    case 'rentOut':
    case 'legacy20':
    case 'partyCoat':
    case 'greatcoatHat':
    case 'pressKit':
    case 'forgedPapers':
    case 'doorman':
    case 'steward':
    case 'minder':
    case 'minderLastDay':
    case 'minderLapse':
    case 'wellFed5':
    case 'spirits9':
    case 'roundsUsed': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      did = await lifeAction(content, doc, action, clock.now());
      settle = true;
      break;
    }
    case 'termDay':
    case 'office':
    case 'ladder':
    case 'secretaryBill':
    case 'deputies':
    case 'deputiesVote':
    case 'residentsSign':
    case 'chairBackers':
    case 'chairVotes':
    case 'nationVotes':
    case 'chairPetitionSign':
    case 'lead': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      const r = await nationAction(content, doc, action, body.target, clock);
      did = r.did;
      if (r.moved) moved = true;
      else settle = true;
      break;
    }
    case 'members':
    case 'fillEvent':
    case 'startEvent':
    case 'rolls':
    case 'memberCells':
    case 'memberWard':
    case 'memberSays':
    case 'chatReset': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      did = await togetherAction(content, doc, action, body.target, clock.now);
      settle = true;
      break;
    }
  }

  if (moved) {
    // What the worker's job does at 00:01, then the player's own settlement (today's paper).
    await runCityDay(content, clock.now());
    if (user && c) await loadCharacter(user, content, clock.now());
  } else if (settle && user) {
    await loadCharacter(user, content, clock.now());
  }
  const { status: after } = await statusFor(deps, user);
  const line = moved ? [`Now ${after.utc}`, ...cityChanges(before, after)].join(' · ') : did;
  return { line, status: after };
}

export function registerDevPanel(app: FastifyInstance, deps: DevPanelDeps): void {
  app.get('/api/test/dev/status', async (request) => {
    const { status } = await statusFor(deps, await sessionUser(deps.auth, request));
    return status;
  });

  app.post(
    '/api/test/dev/:action',
    async (request: FastifyRequest<{ Params: { action: string } }>, reply: FastifyReply) => {
      const action = request.params.action as DevAction;
      if (!DEV_ACTIONS.includes(action)) {
        return reply.code(404).send({ error: `no dev action "${request.params.action}"` });
      }
      try {
        return await runAction(
          deps,
          action,
          await sessionUser(deps.auth, request),
          (request.body ?? {}) as { target?: unknown },
        );
      } catch (err) {
        if (err instanceof DevRefusal) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    },
  );
}
