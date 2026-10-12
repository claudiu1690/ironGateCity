import type { GameContent } from '@irongate/content';
import { Candidacy, City, District, Election, OfficeTerm, RuleBallot, Vote } from '@irongate/db';
import type { CandidacyDoc, CityDoc, DistrictDoc, OfficeTermDoc } from '@irongate/db';
import {
  COUNCIL,
  averageShares,
  councilDay,
  councilKey,
  createRng,
  decideCapitalRule,
  drawOrderOf,
  electionKey,
  moraleState,
} from '@irongate/rules';
import type { DayKey, FactionId, RuleCard } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { AlreadySettled, cityDayHooks } from './cityDayCore';
import { ordinanceIdOn } from './modifiers';
import { capitalCardOrder, capitalCards, homeCards, seatRules } from './ruleBallot';

/**
 * The voting rework (docs/tech/voting-rework.md §6.1, ADR 0086): a city settled before the rework
 * becomes a rule-vote city, **as of its settled day S**, in one transaction. Only future days of a
 * window move (`start + 5 > S`), so the per-day reads of settled days (ADR 0021) do not change. Run by
 * `settleCityDay` before any boundary while `world.voting !== 2`; the commit is guarded by
 * `world.settledDay: S` and `world.voting: { $ne: 2 }`, so a racing runner throws AlreadySettled.
 */
export async function convertCityVoting(
  content: GameContent,
  cityId: string,
  S: DayKey,
  session: ClientSession,
): Promise<void> {
  const spec = content.city(cityId);
  if (!spec?.council) throw new Error(`city "${cityId}" has no council`);
  // 1. Re-read in the session.
  const city = await City.findById(cityId).session(session).lean<CityDoc>();
  if (!city?.world || city.world.voting === 2 || city.world.settledDay !== S) throw new AlreadySettled();
  const capital = content.isDistricted(cityId);
  const home: FactionId | null = spec.homeFactionId ?? null;
  const cal = councilDay(S, spec.council.offset);
  const k = cal.cycle;
  const start = cal.council.fromDay;
  const end = start + COUNCIL.ordinanceDays;
  const defaultOf = (f: FactionId | null | undefined) => content.faction((f ?? home)!).branchMotion;

  // 2. Council k's rules: a player's proposal on old paper k, else their candidacy's rule, else the
  // faction's default; a home local's from content; a capital local's none.
  const oldPaperK = await RuleBallot.collection.findOne<OldPaper>(
    { _id: councilKey(cityId, k) } as Record<string, unknown>,
    { session },
  );
  const terms = await OfficeTerm.find({ councilKey: councilKey(cityId, k), vacatedDay: null })
    .session(session)
    .lean<OfficeTermDoc[]>();
  for (const t of terms) {
    let rule: string | null;
    if (t.holder.kind === 'npc') {
      rule = t.districtId ? null : (content.candidate(t.holder.npcId)?.rule ?? null);
    } else {
      const holder = t.holder;
      const proposed = (oldPaperK?.items ?? []).find(
        (i) => i.movedBy?.kind === 'player' && String(i.movedBy.characterId) === holder.characterId.toHexString(),
      );
      const cand = proposed
        ? null
        : await Candidacy.findOne({ electionId: t.electionId, characterId: holder.characterId }, { rule: 1 })
            .session(session)
            .lean<CandidacyDoc>();
      rule = proposed?.ordinanceId ?? cand?.rule ?? defaultOf(t.factionId);
    }
    await OfficeTerm.updateOne({ _id: t._id }, { $set: { rule } }, { session });
  }

  // The district opinions (the capital's card order, its card 1 and nothing else).
  const districts = capital
    ? await District.find({ cityId }, { opinion: 1 }).session(session).lean<DistrictDoc[]>()
    : [];
  const cityOpinion = capital ? averageShares(districts.map((d) => d.opinion)) : null;
  const seats = await seatRules(content, cityId, k, session);

  // 3. The rule in force on S, clipped or extended to `end`; none → card 1 from S + 1.
  const set: Record<string, unknown> = { 'world.voting': 2 };
  const history = [...(city.ordinanceHistory ?? [])];
  const cur = ordinanceIdOn(city, S);
  let inForce: { id: string; fromDay: DayKey; toDay: DayKey } | null = null;
  if (cur) {
    const o = city.ordinance;
    const fromDay =
      o && o.id === cur && o.fromDay <= S && S < o.toDay
        ? o.fromDay
        : (history.find((h) => h.id === cur && h.fromDay <= S && S < h.toDay)?.fromDay ?? S);
    inForce = { id: cur, fromDay, toDay: end };
    const at = history.findIndex((h) => h.fromDay <= S && S < h.toDay);
    if (at >= 0) history[at] = { ...history[at]!, toDay: end };
    else history.push({ ...inForce });
  } else if (!cityDayHooks.noBranchMotion?.has(cityId)) {
    let id: string;
    if (capital) {
      const bySeat: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
      for (const x of seats) bySeat[x.factionId] += 1;
      const order = await capitalCardOrder(content, cityId, k, seats, session, cityOpinion!);
      id = decideCapitalRule({
        cards: capitalCards(content, seats, order),
        seatsByFaction: bySeat,
        votes: {},
        opinion: cityOpinion!,
        drawOrder: drawOrderOf(createRng(`${cityId}:${k}:convert`)),
      }).winner;
    } else id = homeCards(content, cityId, seats, false)[0]!.ordinanceId;
    inForce = { id, fromDay: S + 1, toDay: end };
    history.push({ ...inForce });
  }
  if (inForce) {
    set.ordinance = { ...inForce, paperId: councilKey(cityId, k - 1) };
    set.ordinanceHistory = history.slice(-4);
  }

  // 4. Ballot k − 1: counted, carried over (the old paper's fields under `legacy`).
  const prev = councilDay(start - 1, spec.council.offset);
  await toBallot(
    cityId,
    k - 1,
    prev.council.fromDay,
    {
      status: 'counted',
      result: inForce
        ? {
            winner: inForce.id,
            how: 'carried',
            tallies: [],
            turnout: null,
            inForce: { fromDay: inForce.fromDay, toDay: end },
          }
        : null,
    },
    session,
  );

  // 5. Ballot k: open on days 0–1; set on days 2–4 over step 2's rules (and Unrest on S).
  let cards: RuleCard[] | null = null;
  let unrest: boolean | null = null;
  if (cal.cycleDay >= 2) {
    if (capital) {
      const order = await capitalCardOrder(content, cityId, k, seats, session, cityOpinion!);
      cards = capitalCards(content, seats, order);
    } else {
      unrest = moraleState(city.opinion![home!]) === 'unrest';
      cards = homeCards(content, cityId, seats, unrest);
    }
  }
  await toBallot(
    cityId,
    k,
    start,
    { status: cal.cycleDay >= 2 ? 'set' : 'open', cards, unrest, result: null },
    session,
  );

  // 6. The open election(s) k: filed → standing with the default rule; person ballots discarded.
  const electionIds = capital
    ? content.districtsOf(cityId).map((d) => electionKey(d.id, k))
    : [electionKey(cityId, k)];
  const cands = await Candidacy.find({ electionId: { $in: electionIds }, status: { $in: ['filed', 'standing'] } })
    .session(session)
    .lean<CandidacyDoc[]>();
  for (const c of cands) {
    await Candidacy.updateOne(
      { _id: c._id },
      {
        $set: {
          status: 'standing',
          deposit: 'spent',
          rule: c.rule ?? defaultOf(c.factionId),
        },
      },
      { session },
    );
  }
  if (cal.cycleDay >= 2) {
    await Vote.deleteMany({ electionId: { $in: electionIds }, ordinanceId: { $exists: false } }, { session });
    await Election.updateMany({ _id: { $in: electionIds } }, { $set: { ballots: 0 } }, { session });
  }

  // 7. Commit, guarded.
  const done = await City.updateOne(
    { _id: cityId, 'world.settledDay': S, 'world.voting': { $ne: 2 } },
    { $set: set },
    { session },
  );
  if (done.matchedCount === 0) throw new AlreadySettled();
}

/** An order paper as stored before the voting rework (read raw: the model no longer has its fields). */
interface OldPaper {
  _id: string;
  items?: Array<{ ordinanceId: string; movedBy?: { kind: string; characterId?: unknown } }>;
}

/**
 * Upsert rule ballot k in the target state, moving an old paper's `items`, `votes` and `division`
 * under `legacy` (an update pipeline on the driver: the model no longer knows the old fields).
 */
async function toBallot(
  cityId: string,
  k: number,
  fromDay: DayKey,
  v: { status: 'open' | 'set' | 'counted'; cards?: RuleCard[] | null; unrest?: boolean | null; result: unknown },
  session: ClientSession,
): Promise<void> {
  await RuleBallot.collection.updateOne(
    { _id: councilKey(cityId, k) } as Record<string, unknown>,
    [
      {
        $set: {
          legacy: {
            $cond: [
              { $eq: [{ $type: '$items' }, 'missing'] },
              '$legacy',
              { items: '$items', votes: { $ifNull: ['$votes', []] }, division: { $ifNull: ['$division', null] } },
            ],
          },
        },
      },
      { $unset: ['items', 'votes', 'division', 'divideDay'] },
      {
        $set: {
          cityId,
          cycle: k,
          fromDay,
          setDay: fromDay + 2,
          countDay: fromDay + COUNCIL.cycleDays,
          status: v.status,
          cards: v.cards !== undefined ? { $literal: v.cards } : { $ifNull: ['$cards', null] },
          unrest: v.unrest !== undefined ? v.unrest : { $ifNull: ['$unrest', null] },
          changes: { $ifNull: ['$changes', 0] },
          result: { $literal: v.result },
          createdAt: { $ifNull: ['$createdAt', '$$NOW'] },
          updatedAt: '$$NOW',
        },
      },
    ],
    { session, upsert: true },
  );
}
