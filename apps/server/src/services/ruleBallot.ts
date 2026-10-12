import type { GameContent } from '@irongate/content';
import { District, Election, OfficeTerm, RuleBallot, Vote } from '@irongate/db';
import type { CityDoc, DistrictDoc, ElectionDoc, OfficeTermDoc, RuleBallotDoc } from '@irongate/db';
import {
  FACTION_IDS,
  averageShares,
  capitalBallot,
  councilDay,
  councilKey,
  councilOrder,
  createRng,
  drawOrderOf,
  electionKey,
  homeBallot,
  moraleState,
  partyCardOf,
} from '@irongate/rules';
import type { CardBy, DayKey, FactionId, RuleCard, SeatRule } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { AlreadySettled } from './cityDayCore';

/**
 * The voting rework (docs/tech/voting-rework.md §7.1; ADR 0083, ADR 0085): what the city days, the
 * conversion and the views share about a rule ballot: the council's seats with their rules, the three
 * cards (home) or one per party (the capital), the set, the tally of the rule votes and the
 * provisional cards a view shows on days 0–1. The decisions are the pure functions of
 * `@irongate/rules` (`homeBallot`, `capitalBallot`, `partyCardOf`); this file reads and writes.
 */

type Session = ClientSession | null;
const s = <T extends { session: (x: ClientSession | null) => T }>(q: T, session: Session): T =>
  session ? q.session(session) : q;

/**
 * The secretary's default, the party's card wherever no office-holder or player councillor leads
 * (slice 7 adds them). The name is the secretary's `addressedAs` (design §8.8 Q4: *Secretary Holm*).
 */
export function secretaryCard(content: GameContent, factionId: FactionId): { ordinanceId: string; by: CardBy } {
  const faction = content.faction(factionId);
  return {
    ordinanceId: faction.branchMotion,
    by: {
      kind: 'party',
      factionId,
      via: 'secretary',
      name: faction.secretary.addressedAs,
      npcId: faction.secretary.npcId,
    },
  };
}

/**
 * The name a card's `by` prints (design §8.8 Q4, §8.9 Q2): a secretary's `addressedAs` from content
 * (a ballot set before phase 5 stored the full name), a councillor's stored name.
 */
export function cardByName(content: GameContent, by: CardBy): string {
  return by.kind === 'party' && by.via === 'secretary' ? content.faction(by.factionId).secretary.addressedAs : by.name;
}

/**
 * A term's rule (ADR 0084 §5): the stored rule; absent on an old term, a player's falls back to the
 * faction's default and a home local's to its content rule; a capital local names none.
 */
export function termRule(content: GameContent, t: Pick<OfficeTermDoc, 'rule' | 'holder' | 'factionId' | 'districtId'>, home: FactionId | null): string | null {
  if (t.rule) return t.rule;
  if (t.holder.kind === 'npc') {
    if (t.districtId) return null;
    return content.candidate(t.holder.npcId)?.rule ?? null;
  }
  const f = t.factionId ?? home;
  return f ? content.faction(f).branchMotion : null;
}

/** Council k's seats (not vacated) with their rules (tech design §7.1). */
export async function seatRules(
  content: GameContent,
  cityId: string,
  k: number,
  session: Session,
): Promise<SeatRule[]> {
  const home = content.city(cityId)?.homeFactionId ?? null;
  const terms = await s(
    OfficeTerm.find({ councilKey: councilKey(cityId, k), vacatedDay: null }).sort({ seat: 1 }),
    session,
  ).lean<OfficeTermDoc[]>();
  return terms.map((t) => seatRuleOf(content, t, home));
}

export function seatRuleOf(content: GameContent, t: OfficeTermDoc, home: FactionId | null): SeatRule {
  return {
    seat: t.seat,
    holder: t.holder.kind,
    name: t.holder.name,
    ...(t.holder.kind === 'player'
      ? { characterId: t.holder.characterId.toHexString() }
      : { npcId: t.holder.npcId }),
    factionId: (t.factionId ?? home)!,
    total: t.total,
    rule: termRule(content, t, home),
  };
}

/**
 * Design §8.1 Q11: the fill past the seated locals: the city's other local candidates' rules in
 * profile order, then the menu's order. Never reached with Appendix A (the loader's
 * `ballotFillProblems`).
 */
export function homeFill(content: GameContent, cityId: string, seats: readonly SeatRule[]): string[] {
  const seated = new Set(seats.flatMap((x) => (x.npcId ? [x.npcId] : [])));
  const others = content
    .slateOf(cityId)
    .filter((c) => !seated.has(c.id))
    .flatMap((c) => (c.rule ? [c.rule] : []));
  return [...others, ...content.ordinancesMenu().map((o) => o.id)];
}

/** The home city's three cards over council k's seats (design §3.3; Unrest takes the party's card off). */
export function homeCards(
  content: GameContent,
  cityId: string,
  seats: readonly SeatRule[],
  unrest: boolean,
): RuleCard[] {
  const home = content.city(cityId)!.homeFactionId!;
  return homeBallot({ party: secretaryCard(content, home), seats, fill: homeFill(content, cityId, seats), unrest });
}

/** The capital's cards (ADR 0085): one per party through the chain, shared rules merged, in `order`. */
export function capitalCards(
  content: GameContent,
  seats: readonly SeatRule[],
  order: readonly FactionId[],
): RuleCard[] {
  const parties = FACTION_IDS.map((f) => {
    const sec = secretaryCard(content, f);
    const secretary = sec.by as Extract<CardBy, { kind: 'party' }>;
    return {
      factionId: f,
      ...partyCardOf({
        factionId: f,
        defaultRule: sec.ordinanceId,
        secretary: { npcId: secretary.npcId ?? '', name: secretary.name },
        seats,
      }),
    };
  });
  return capitalBallot({ parties, order });
}

/** The seeded draw of a capital cycle that orders tied blocs (`{cityId}:{k}:order`, replayable). */
export const capitalDrawOrder = (cityId: string, k: number): FactionId[] =>
  drawOrderOf(createRng(`${cityId}:${k}:order`));

/**
 * The capital's card order for council k (design §8.4): its seats by party, then the last count's
 * ballots city-wide, the districts' average opinion and the cycle's draw.
 */
export async function capitalCardOrder(
  content: GameContent,
  cityId: string,
  k: number,
  seats: readonly SeatRule[],
  session: Session,
  opinion?: ReturnType<typeof averageShares>,
): Promise<FactionId[]> {
  const bySeat: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  for (const x of seats) bySeat[x.factionId] += 1;
  const ids = content.districtsOf(cityId).map((d) => electionKey(d.id, k - 1));
  const counted = await s(Election.find({ _id: { $in: ids }, status: 'counted' }, { result: 1 }), session).lean<
    ElectionDoc[]
  >();
  const ballots: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
  for (const e of counted) {
    const factions = (e.result as unknown as { factions?: Array<{ factionId: FactionId; ballots: number }> })
      ?.factions;
    for (const f of factions ?? []) ballots[f.factionId] += f.ballots;
  }
  let shares = opinion;
  if (!shares) {
    const docs = await s(District.find({ cityId }, { opinion: 1 }), session).lean<DistrictDoc[]>();
    shares = averageShares(docs.map((d) => d.opinion));
  }
  return councilOrder(bySeat, ballots, shares, capitalDrawOrder(cityId, k));
}

/** The cards council k puts to the town, as they stand now (or would be set now). */
export async function cardsFor(
  content: GameContent,
  cityId: string,
  k: number,
  i: { unrest: boolean; capital: boolean; order?: readonly FactionId[] },
  session: Session,
): Promise<RuleCard[]> {
  const seats = await seatRules(content, cityId, k, session);
  if (!i.capital) return homeCards(content, cityId, seats, i.unrest);
  const order = i.order ?? (await capitalCardOrder(content, cityId, k, seats, session));
  return capitalCards(content, seats, order);
}

/** An open rule ballot document (created at the count that seats council k, or by a bootstrap). */
export function openBallotDoc(cityId: string, k: number, fromDay: DayKey) {
  return {
    _id: councilKey(cityId, k),
    cityId,
    cycle: k,
    fromDay,
    setDay: fromDay + 2,
    countDay: fromDay + 5,
    status: 'open' as const,
    cards: null,
    unrest: null,
    changes: 0,
    result: null,
  };
}

/**
 * The set (tech design §7.1): ballot k's cards frozen over council k's rules as they stand after any
 * change before this boundary. `open → set`; a miss on an existing ballot throws AlreadySettled; a
 * missing ballot is created set (data loss, as the old code did for a missing paper).
 */
export async function setBallotStep(
  content: GameContent,
  i: { cityId: string; k: number; fromDay: DayKey; unrest: boolean; capital: boolean; order?: FactionId[] },
  session: ClientSession,
): Promise<RuleCard[]> {
  const cards = await cardsFor(content, i.cityId, i.k, i, session);
  const unrest = i.capital ? null : i.unrest;
  const id = councilKey(i.cityId, i.k);
  const existing = await RuleBallot.findById(id, { status: 1 }).session(session).lean<RuleBallotDoc>();
  if (!existing) {
    await RuleBallot.create([{ ...openBallotDoc(i.cityId, i.k, i.fromDay), status: 'set', cards, unrest }], {
      session,
    });
    return cards;
  }
  const done = await RuleBallot.updateOne(
    { _id: id, status: 'open' },
    { $set: { status: 'set', cards, unrest } },
    { session },
  );
  if (done.matchedCount === 0) throw new AlreadySettled();
  return cards;
}

/** The rule votes of the elections, by election then rule (the count's `$group`, ADR 0019). */
export async function tallyRules(
  electionIds: readonly string[],
  session: Session,
): Promise<Record<string, Record<string, number>>> {
  const rows = await s(
    Vote.aggregate<{ _id: { e: string; o: string }; n: number }>([
      { $match: { electionId: { $in: [...electionIds] }, ordinanceId: { $exists: true, $ne: null } } },
      { $group: { _id: { e: '$electionId', o: '$ordinanceId' }, n: { $sum: 1 } } },
    ]),
    session,
  );
  const out: Record<string, Record<string, number>> = {};
  for (const id of electionIds) out[id] = {};
  for (const r of rows) (out[r._id.e] ??= {})[r._id.o] = r.n;
  return out;
}

/**
 * The cards a view shows for ballot k (tech design §7.1): `set` ballots their frozen cards; on days
 * 0–1 the same pure function over the seats now (no write). `unrest` is read from the city's morale.
 */
export async function ballotCards(
  content: GameContent,
  cityId: string,
  k: number,
  city: Pick<CityDoc, 'opinion' | 'morale'> | null,
  session: Session = null,
): Promise<{ doc: RuleBallotDoc | null; cards: RuleCard[]; status: 'provisional' | 'set' }> {
  const doc = await s(RuleBallot.findById(councilKey(cityId, k)), session).lean<RuleBallotDoc>();
  if (doc?.cards && doc.status !== 'open') return { doc, cards: doc.cards, status: 'set' };
  const capital = content.isDistricted(cityId);
  const home = content.city(cityId)?.homeFactionId ?? null;
  const unrest = !capital && home && city?.opinion ? moraleState(city.opinion[home]) === 'unrest' : false;
  const cards = await cardsFor(content, cityId, k, { unrest: !!unrest, capital }, session);
  return { doc, cards, status: 'provisional' };
}

/** The cycle of the ballot open or set on `today` (council k's). */
export const ballotCycle = (content: GameContent, cityId: string, today: DayKey): number =>
  councilDay(today, content.city(cityId)?.council?.offset ?? 0).cycle;
