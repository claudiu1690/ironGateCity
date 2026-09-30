import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { BOOST, Character } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import { ENERGY, STANDING, cycleOf, dayKey, projectEnergy } from '@irongate/rules';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Auth } from '../auth';
import { ensureCityDay, runCityDay } from '../services/cityDay';
import { loadCharacter } from '../services/dayService';
import { moraleOf, ordinanceIdOn, restedCapToday } from '../services/modifiers';
import { energyState } from '../services/views';
import type { SessionUser } from '../trpc/context';
import { applyCharacterSeed } from './characterSeed';
import { HOUR_MS, formatUtc, nextDayAt, nextPhaseAt, phaseLabel, phaseOf } from './clock';
import type { DevAction, DevActionResult, DevHomeCity, DevStatus } from './types';

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
  /** Forward only (QA n11). */
  advance: (ms: number) => void;
}

export interface DevPanelDeps {
  auth: Auth;
  content: GameContent;
  clock: DevClock;
}

const DEV_ACTIONS: readonly DevAction[] = ['hour', 'day', 'phase', 'boost', 'energy'];
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

function homeView(content: GameContent, cityId: string, city: CityDoc | null, now: number): DevHomeCity {
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
  return {
    cityId,
    cityName: spec?.name ?? cityId,
    council,
    morale:
      state && city && home
        ? { state, word: copy.moraleWord[state] ?? state, share: city.opinion[home] }
        : null,
    ordinance: ord
      ? {
          id: ord.id,
          name: ord.name,
          daysLeft: city?.ordinance?.id === ord.id ? city.ordinance.toDay - today : null,
        }
      : null,
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
  const city = c ? await ensureCityDay(content, c.homeCityId, now) : null;
  const energy = c
    ? projectEnergy(energyState(c), now, ENERGY.max, restedCapToday(content, city, dayKey(now)))
    : null;
  return {
    character: c,
    status: {
      hooks: true,
      now,
      utc: formatUtc(now),
      offsetMs: clock.offsetMs(),
      cityDay: dayKey(now),
      character:
        c && energy
          ? { name: c.name, rank: c.rank, pc: c.pc, energy: energy.value, energyMax: energy.max }
          : null,
      home: c ? homeView(content, c.homeCityId, city, now) : null,
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
    if (entered && a.council.phase === 'count-day') out.push(`the count is in · nominations open in ${city}`);
    else if (entered && a.council.phase === 'polls') out.push(`polls open in ${city}`);
    else out.push(`${a.council.phaseLabel.toLowerCase()} in ${city}`);
  }
  if (days > 1) out.push(`${days} days on`);
  if (a.morale && b?.morale && a.morale.state !== b.morale.state) {
    out.push(`${city} morale ${b.morale.word} → ${a.morale.word}`);
  }
  if ((a.ordinance?.id ?? null) !== (b?.ordinance?.id ?? null)) {
    out.push(a.ordinance ? `${a.ordinance.name} in force` : 'no ordinance in force');
  }
  return out;
}

class DevRefusal extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function runAction(
  deps: DevPanelDeps,
  action: DevAction,
  user: SessionUser | null,
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
  switch (action) {
    case 'hour':
      clock.advance(HOUR_MS);
      moved = true;
      break;
    case 'day':
      clock.advance(nextDayAt(clock.now()) - clock.now());
      moved = true;
      break;
    case 'phase': {
      const { home } = needCharacter();
      const offset = content.city(home.homeCityId)?.council?.offset;
      if (offset === undefined) throw new DevRefusal(409, `${home.homeCityId} has no council`);
      clock.advance(nextPhaseAt(clock.now(), offset).landAt - clock.now());
      moved = true;
      break;
    }
    case 'boost': {
      const { me } = needCharacter();
      // Settle first (the lazy path), then lift what is below the mark; nothing is ever lowered.
      const { doc } = await loadCharacter(me, content, clock.now());
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
    case 'energy': {
      const { me } = needCharacter();
      const { doc } = await loadCharacter(me, content, clock.now());
      await applyCharacterSeed(doc, { energy: ENERGY.max }, clock.now());
      did = `Energy ${ENERGY.max} / ${ENERGY.max}`;
      break;
    }
  }

  if (moved) {
    // What the worker's job does at 00:01, then the player's own settlement (today's paper).
    await runCityDay(content, clock.now());
    if (user && c) await loadCharacter(user, content, clock.now());
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
        return await runAction(deps, action, await sessionUser(deps.auth, request));
      } catch (err) {
        if (err instanceof DevRefusal) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    },
  );
}
