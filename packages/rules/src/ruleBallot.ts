import { COUNCIL } from './constants';
import type { DayKey } from './day';
import type { FactionId } from './types';

/**
 * The voting rework (docs/tech/voting-rework.md §4.2; ADR 0083, ADR 0085; docs/design/
 * voting-simplified.md §3.3–§3.4): the town votes on a rule. These pure functions build the three
 * rule cards from the council's seats and decide a home city's rule from the votes. Nothing here
 * rolls: a ballot is a count.
 */

/** Whose a card is: the party's (the secretary's default, or a councillor leading the party), or a councillor's own. */
export type CardBy =
  | {
      kind: 'party';
      factionId: FactionId;
      via: 'secretary' | 'councillor';
      name: string;
      characterId?: string;
      /** The secretary's NPC id when `via: 'secretary'`. */
      npcId?: string;
    }
  | {
      kind: 'councillor';
      holder: 'player' | 'npc';
      seat: number;
      name: string;
      characterId?: string;
      npcId?: string;
    };

/** One card of a ballot. `by` has more than one entry only on a shared card (the capital). */
export interface RuleCard {
  ordinanceId: string;
  factionIds: FactionId[];
  by: CardBy[];
}

/** A seat of the council and the rule its holder named (`null`: none, e.g. a capital local). */
export interface SeatRule {
  seat: number;
  holder: 'player' | 'npc';
  name: string;
  characterId?: string;
  npcId?: string;
  factionId: FactionId;
  /** The count total that seated them (ranks player councillors across the capital's districts). */
  total: number;
  rule: string | null;
}

const bySeat = (a: SeatRule, b: SeatRule) => a.seat - b.seat;

const councillorBy = (s: SeatRule): CardBy => ({
  kind: 'councillor',
  holder: s.holder,
  seat: s.seat,
  name: s.name,
  ...(s.characterId !== undefined ? { characterId: s.characterId } : {}),
  ...(s.npcId !== undefined ? { npcId: s.npcId } : {}),
});

/**
 * Design §3.3, §3.4 (Unrest). Not Unrest: [the party's card, the rules of the two top-seated player
 * councillors (by seat) not already on, then the seated locals' rules by seat, then `fill`] to three
 * distinct cards. Unrest: no party card; [player councillors by seat (up to three), then locals by
 * seat, then `fill`] to three. Card 1 is the fallback.
 *
 * A councillor whose rule is already on the ballot is skipped and the next in line fills the place
 * (§20 Q10). `fill` (the city's other locals' rules, then the menu's order) carries ids only; a card
 * from it is shown as the party's pick. With Appendix A's content it is never reached (the loader's
 * `ballotFillProblems` proves it).
 */
export function homeBallot(i: {
  party: { ordinanceId: string; by: CardBy };
  seats: readonly SeatRule[];
  fill: readonly string[];
  unrest: boolean;
}): RuleCard[] {
  const size = COUNCIL.ballotCards;
  const partyFaction = i.party.by.kind === 'party' ? i.party.by.factionId : (i.seats[0]?.factionId ?? null);
  const cards: RuleCard[] = [];
  const has = (id: string) => cards.some((c) => c.ordinanceId === id);
  const push = (ordinanceId: string, by: CardBy, factionId: FactionId | null) => {
    if (cards.length >= size || has(ordinanceId)) return false;
    cards.push({ ordinanceId, factionIds: factionId ? [factionId] : [], by: [by] });
    return true;
  };

  if (!i.unrest) push(i.party.ordinanceId, i.party.by, partyFaction);

  const seated = [...i.seats].sort(bySeat);
  const players = seated.filter((s) => s.holder === 'player' && s.rule !== null);
  const locals = seated.filter((s) => s.holder === 'npc' && s.rule !== null);
  // Two player cards beside the party's; in Unrest the player councillors may take all three.
  const playerPlaces = i.unrest ? size : size - 1;
  let fromPlayers = 0;
  for (const s of players) {
    if (fromPlayers >= playerPlaces) break;
    if (push(s.rule!, councillorBy(s), s.factionId)) fromPlayers += 1;
  }
  for (const s of locals) push(s.rule!, councillorBy(s), s.factionId);
  for (const id of i.fill) push(id, i.party.by, partyFaction);
  return cards;
}

/**
 * ADR 0085: the party's card in a contested city: its top-seated player councillor with a rule
 * (highest count total, then the lower seat), else the secretary's default. Slice 7 prepends the
 * Governor or Mayor and inserts the Chair.
 */
export function partyCardOf(i: {
  factionId: FactionId;
  defaultRule: string;
  secretary: { npcId: string; name: string };
  seats: readonly SeatRule[];
}): { ordinanceId: string; by: CardBy } {
  const lead = i.seats
    .filter((s) => s.factionId === i.factionId && s.holder === 'player' && s.rule !== null)
    .sort((a, b) => b.total - a.total || a.seat - b.seat)[0];
  if (lead)
    return {
      ordinanceId: lead.rule!,
      by: {
        kind: 'party',
        factionId: i.factionId,
        via: 'councillor',
        name: lead.name,
        ...(lead.characterId !== undefined ? { characterId: lead.characterId } : {}),
      },
    };
  return {
    ordinanceId: i.defaultRule,
    by: {
      kind: 'party',
      factionId: i.factionId,
      via: 'secretary',
      name: i.secretary.name,
      npcId: i.secretary.npcId,
    },
  };
}

/**
 * ADR 0085: one card per party, equal rules merged (both crests, `by` concatenated), in `order`
 * (`councilOrder`) of their first party. A party missing from `order` (no seat) comes after, in the
 * order given.
 */
export function capitalBallot(i: {
  parties: ReadonlyArray<{ factionId: FactionId; ordinanceId: string; by: CardBy }>;
  order: readonly FactionId[];
}): RuleCard[] {
  const rank = (f: FactionId) => {
    const at = i.order.indexOf(f);
    return at === -1 ? i.order.length + i.parties.findIndex((p) => p.factionId === f) : at;
  };
  const sorted = [...i.parties].sort((a, b) => rank(a.factionId) - rank(b.factionId));
  const cards: RuleCard[] = [];
  for (const p of sorted) {
    const same = cards.find((c) => c.ordinanceId === p.ordinanceId);
    if (same) {
      same.factionIds.push(p.factionId);
      same.by.push(p.by);
    } else cards.push({ ordinanceId: p.ordinanceId, factionIds: [p.factionId], by: [p.by] });
  }
  return cards;
}

export interface RuleTally {
  ordinanceId: string;
  votes: number;
  /** The capital: the seats behind the card (the sum of its parties'). */
  seats?: number;
}

/**
 * How a rule won: `votes` (most votes), `tie` (leaders level: card 1, else the earliest), `fallback`
 * (no votes: card 1), `seats` and `draw` (the capital), `carried` (the switch cycle, ADR 0086).
 */
export type RuleHow = 'votes' | 'tie' | 'fallback' | 'seats' | 'draw' | 'carried';

/** `tallies` in finishing order; the winner first. */
export interface RuleDecision {
  winner: string;
  how: RuleHow;
  tallies: RuleTally[];
}

/**
 * Design §3.4: the card with the most votes; leaders tied → card 1 if among them, else the earliest
 * card (`tie`); no votes → card 1 (`fallback`). Votes for an id not on the cards are ignored.
 */
export function decideHomeRule(
  cards: readonly RuleCard[],
  votes: Readonly<Record<string, number>>,
): RuleDecision {
  if (cards.length === 0) throw new Error('decideHomeRule: a ballot has at least one card');
  const tallies = cards.map((c, idx) => ({
    idx,
    ordinanceId: c.ordinanceId,
    votes: Math.max(0, votes[c.ordinanceId] ?? 0),
  }));
  const total = tallies.reduce((sum, t) => sum + t.votes, 0);
  // Finishing order: most votes, then card order (card 1 first), so the winner always leads.
  const ordered = [...tallies].sort((a, b) => b.votes - a.votes || a.idx - b.idx);
  const leaders = ordered.filter((t) => t.votes === ordered[0]!.votes);
  const how: RuleHow = total === 0 ? 'fallback' : leaders.length > 1 ? 'tie' : 'votes';
  return {
    winner: ordered[0]!.ordinanceId,
    how,
    tallies: ordered.map(({ ordinanceId, votes: v }) => ({ ordinanceId, votes: v })),
  };
}

/** Design §3.2: what a count at `countDay` puts in force; `toDay` exclusive. */
export const ruleWindowFrom = (countDay: DayKey): { fromDay: DayKey; toDay: DayKey } => ({
  fromDay: countDay,
  toDay: countDay + COUNCIL.ordinanceDays,
});
