import type { GameContent } from '@irongate/content';
import { Character, City, FactionState, Nation, OfficeTerm } from '@irongate/db';
import type { CharacterDoc, CityDoc, NationDoc, OfficeTermDoc } from '@irongate/db';
import {
  COUNCIL,
  FACTION_IDS,
  TERM,
  TERM_DAYS,
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  termOf,
} from '@irongate/rules';
import type { DayKey, FactionId } from '@irongate/rules';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { Types } from 'mongoose';
import { z } from 'zod';
import type { Auth } from '../auth';
import { runCityDay } from '../services/cityDay';
import { governorKey } from '../services/governorService';
import { nationDayHooks, settleNationDay } from '../services/nationDay';
import { DevRefusal } from './risk';
import { UnrestBody, pushIntoUnrest } from './unrest';

/**
 * Slice 7 (docs/tech/slice-7.md §8.6): the nation's test hooks, only with `E2E_TEST_HOOKS` (memory
 * mode). They move the clock to a term day and run the days, steer the next control snapshot, and
 * seat a character in an office for the current term (the term row and its projections). No game
 * rule here: what a seat or a snapshot does is decided by the services and the next boundary.
 *
 * Lane 2's hooks (`/api/test/parliament`, `members.deputies`, `nation.secretaryBill`) register in
 * `registerNationHooks2` when their services land (tech §8.6's table).
 */

class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const TermBody = z
  .object({
    termDay: z
      .number()
      .int()
      .min(0)
      .max(TERM.days - 1),
    next: z.boolean().optional(),
    hour: z.number().int().min(0).max(23).optional(),
  })
  .strict();

export const NationBody = z.union([
  z
    .object({ control: z.record(z.enum(['vanguard', 'collective', 'alliance']), z.number().min(0).max(100)) })
    .strict(),
  z.object({ unrest: z.string().min(1) }).strict(),
]);

const Oid = z.string().regex(/^[0-9a-f]{24}$/);
export const OfficeBody = z.union([
  z
    .object({
      seat: z
        .object({
          characterId: z.union([Oid, z.literal('me')]),
          office: z.enum(['governor', 'chair', 'deputy', 'president']),
          cityId: z.string().min(1).optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      record: z
        .object({
          characterId: z.union([Oid, z.literal('me')]),
          council: z.number().int().min(0).max(10).optional(),
          governor: z.number().int().min(0).max(10).optional(),
          deputy: z.number().int().min(0).max(10).optional(),
        })
        .strict(),
    })
    .strict(),
]);

/** The first day on or after today that is `termDay` (this term; the next with `next` or when passed). */
export function termTarget(today: DayKey, termDay: number, next = false): DayKey {
  const t = termOf(today);
  let d = t.fromDay + termDay;
  if (next) d += TERM.days;
  if (d <= today && !next) d += TERM.days;
  return d;
}

/**
 * Seat a character in an office for the current term (tech §8.6): the office term row (natural
 * key `{councilKey, seat, fromDay}`) and the projections the views read (`city.council.governor`,
 * `factions.chair`, `nation.government.president`, `characters.offices`). A deputy takes the next
 * list place. Writes only what the office's own writer would.
 */
export async function seatOffice(
  content: GameContent,
  c: CharacterDoc,
  office: 'governor' | 'chair' | 'deputy' | 'president',
  cityId: string | undefined,
  now: number,
): Promise<{ termId: string; councilKey: string }> {
  const today = dayKey(now);
  const term = termOf(today);
  const holder = { kind: 'player' as const, characterId: c._id, name: c.name };
  let key: string;
  let fromDay: DayKey;
  let toDay: DayKey;
  let city = cityId ?? c.cityId;
  let seat = 1;
  if (office === 'governor') {
    const spec = content.city(city);
    if (!spec?.council) throw new Refusal(400, 'a council cityId');
    const cal = councilDay(today, spec.council.offset);
    key = governorKey(city, cal.cycle);
    fromDay = cal.council.fromDay;
    toDay = fromDay + COUNCIL.termDays;
  } else {
    // Lane 2's national terms: `cityId: 'nation'`; a deputy's seat is 100 × the faction's index + the place.
    city = 'nation';
    key = office === 'chair' ? `chair:${c.factionId}:${term.index}` : `${office}:${term.index}`;
    fromDay = office === 'chair' ? today : term.fromDay;
    // A Chair's term ends at the calendar's next handover (the next term day 14), as an elected one's.
    toDay =
      office === 'chair'
        ? term.fromDay + TERM_DAYS.chair.countDay + (term.termDay < TERM_DAYS.chair.countDay ? 0 : TERM.days)
        : term.toDay;
    if (office === 'deputy') {
      const base = 100 * FACTION_IDS.indexOf(c.factionId);
      const mine = await OfficeTerm.countDocuments({ councilKey: key, seat: { $gt: base, $lt: base + 100 } });
      seat = base + mine + 1;
    }
  }
  const _id = new Types.ObjectId();
  await OfficeTerm.updateOne(
    { councilKey: key, seat, fromDay },
    {
      $setOnInsert: {
        _id,
        cityId: city,
        councilKey: key,
        electionId: `test:${key}`,
        office,
        seat,
        factionId: c.factionId,
        districtId: null,
        vacatedDay: null,
        fromDay,
        toDay,
        holder,
        place: seat,
        total: 0,
        completed: false,
        frontPageSeenAt: null,
        rule: null,
        ...(office === 'president' ? { pledges: [], via: 'election' } : {}),
      },
    },
    { upsert: true },
  );
  const row = await OfficeTerm.findOne({ councilKey: key, seat, fromDay }).lean<OfficeTermDoc>();
  const termId = row!._id;
  if (office === 'governor') {
    await City.updateOne(
      { _id: city },
      {
        $set: {
          'council.governor': {
            kind: 'player',
            characterId: c._id.toHexString(),
            name: c.name,
            factionId: c.factionId,
            termId: termId.toHexString(),
            local: false,
          },
        },
      },
    );
  } else if (office === 'chair') {
    await FactionState.updateOne(
      { _id: c.factionId },
      { $set: { chair: { holder: { characterId: c._id, name: c.name }, termId, fromDay, toDay } } },
    );
  } else if (office === 'president') {
    await Nation.updateOne(
      { _id: 'republic' },
      {
        $set: {
          'government.president': {
            holder: { ...holder, factionId: c.factionId },
            termId,
            since: today,
            consecutive: 1,
            via: 'election',
          },
        },
      },
    );
    // Lane 2's note: a removal needs a runner-up; with none, another party's figure stands as one.
    const other = FACTION_IDS.find((f) => f !== c.factionId)!;
    const figure = content.faction(other).nationalFigure;
    if (figure)
      await Nation.updateOne(
        { _id: 'republic', 'government.runnerUp': null },
        {
          $set: {
            'government.runnerUp': {
              holder: { kind: 'npc', npcId: figure.npcId, name: figure.name, factionId: other },
              termId: null,
            },
          },
        },
      );
  } else {
    const n = await Nation.findById('republic').lean<NationDoc>();
    if (n) {
      await Nation.updateOne(
        { _id: 'republic' },
        { $inc: { [`government.parliament.players.${c.factionId}`]: 1 } },
      );
    }
  }
  const entry = { termId, office, key, councilKey: key, cityId: city, seat, fromDay, toDay };
  await Character.updateOne({ _id: c._id, 'offices.termId': { $ne: termId } }, { $push: { offices: entry } });
  return { termId: termId.toHexString(), councilKey: key };
}

/** Completed past terms for the ladder (§8.6 `record`). */
export async function recordOffices(
  c: CharacterDoc,
  counts: { council?: number; governor?: number; deputy?: number },
  now: number,
): Promise<{ inserted: number }> {
  const today = dayKey(now);
  // eslint-disable-next-line no-restricted-properties -- past terms are placed in the faction's home
  const home = c.homeCityId;
  let inserted = 0;
  for (const [office, n] of Object.entries(counts) as Array<
    ['council' | 'governor' | 'deputy', number | undefined]
  >) {
    for (let i = 0; i < (n ?? 0); i++) {
      const fromDay = today - 400 - i * 30 - (office === 'governor' ? 7 : office === 'deputy' ? 14 : 0);
      const key =
        office === 'council'
          ? councilKey(home, -1000 - i)
          : office === 'governor'
            ? `governor:${home}:${-1000 - i}`
            : `deputy:${-1000 - i}`;
      const res = await OfficeTerm.updateOne(
        { councilKey: key, seat: 1, fromDay },
        {
          $setOnInsert: {
            cityId: office === 'deputy' ? 'nation' : home,
            councilKey: key,
            electionId: `test:${key}`,
            ...(office === 'council' ? {} : { office }),
            seat: 1,
            factionId: c.factionId,
            districtId: null,
            vacatedDay: null,
            fromDay,
            toDay: fromDay + (office === 'deputy' ? TERM.days : COUNCIL.termDays),
            holder: { kind: 'player', characterId: c._id, name: c.name },
            place: 1,
            total: 0,
            completed: true,
            frontPageSeenAt: new Date(now),
            rule: null,
          },
        },
        { upsert: true },
      );
      inserted += res.upsertedCount;
    }
  }
  return { inserted };
}

export function registerNationHooks(
  app: FastifyInstance,
  deps: {
    auth: Auth;
    content: GameContent;
    clock: { now: () => number; advance: (ms: number) => Promise<void> };
  },
): void {
  const { auth, content, clock } = deps;
  async function me(request: FastifyRequest): Promise<CharacterDoc> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new Refusal(401, 'sign in first');
    const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
    if (!c) throw new Refusal(404, 'no character yet');
    return c;
  }
  const who = async (request: FastifyRequest, id: string) => {
    if (id === 'me') return me(request);
    const c = await Character.findById(id).lean<CharacterDoc>();
    if (!c) throw new Refusal(404, 'no such character');
    return c;
  };
  const handle =
    <S extends z.ZodType>(schema: S, fn: (body: z.output<S>, request: FastifyRequest) => Promise<object>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = schema.safeParse(request.body ?? {});
        if (!parsed.success)
          return reply.code(400).send({ error: parsed.error.issues.map((i) => i.message).join('; ') });
        return { ok: true, ...(await fn(parsed.data, request)) };
      } catch (err) {
        if (err instanceof Refusal) return reply.code(err.status).send({ error: err.message });
        throw err;
      }
    };

  /** Move the clock to the start (hour, default 9) of a term day and run every city's and the nation's days. */
  app.post(
    '/api/test/term',
    handle(TermBody, async (body) => {
      const t0 = clock.now();
      const target = termTarget(dayKey(t0), body.termDay, body.next ?? false);
      const at = dayStart(target) + (body.hour ?? 9) * 3_600_000;
      if (at > t0) await clock.advance(at - t0);
      const r = await runCityDay(content, clock.now());
      const n = await settleNationDay(content, clock.now());
      const t = termOf(n.world.settledDay);
      return { now: clock.now(), day: target, term: t.index, termDay: t.termDay, cities: r.settled };
    }),
  );

  /** Steer the next control snapshot (consumed once), or push a home city into Unrest by the next boundary. */
  app.post(
    '/api/test/nation',
    handle(NationBody, async (body, request) => {
      if ('control' in body) {
        const control = Object.fromEntries(FACTION_IDS.map((f) => [f, body.control[f] ?? 0])) as Record<
          FactionId,
          number
        >;
        nationDayHooks.controlOverride = control;
        return { control };
      }
      const city = content.city(body.unrest);
      if (!city?.homeFactionId) throw new Refusal(400, 'a home cityId');
      const c = await me(request);
      let r: object;
      try {
        r = await pushIntoUnrest(content, c, UnrestBody.parse({ cityId: body.unrest }), clock.now());
      } catch (err) {
        if (err instanceof DevRefusal) throw new Refusal(err.statusCode, err.message);
        throw err;
      }
      const doc = await City.findById(body.unrest).lean<CityDoc>();
      return { unrest: body.unrest, result: r, morale: doc?.morale ?? null };
    }),
  );

  /** Seat a character in an office for the current term, or give them completed past terms (the ladder). */
  app.post(
    '/api/test/office',
    handle(OfficeBody, async (body, request) => {
      if ('seat' in body) {
        const c = await who(request, body.seat.characterId);
        return seatOffice(content, c, body.seat.office, body.seat.cityId, clock.now());
      }
      const c = await who(request, body.record.characterId);
      return recordOffices(c, body.record, clock.now());
    }),
  );
}
