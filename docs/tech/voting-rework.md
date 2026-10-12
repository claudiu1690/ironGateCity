# The voting rework — technical design

| | |
|---|---|
| **Goal** | **The ballot is a vote on a rule.** Three rule cards, one tap, most votes wins, and a tie or no votes goes to the party's card. The winner runs the city for five days from the count. Councillors set the rule that goes on the ballot, and the capital puts up one card per party.<br>**Seats** are won by reputation + 3 × backers. Standing is 10 PC spent; backers are an optional +3.<br>**Out:** the council's division, proposals, *None of these*, the 4-of-7 and 6-of-10 bars, the deposit refund, the backer gate, striking, withdrawing, the small-branch doubling, and members' votes in the seat count |
| **Question** | **Does a Rank 2 player understand what they vote for, and see their vote reach every ticket?** §15.4 is the checklist |
| **Builds on** | Slices 0–5, review 4 and review 5 as built on branch `slice-0` (HEAD `d217941`) |
| **Design inputs** | `docs/design/voting-simplified.md` (cited *design §n*), **approved as written on 10 Oct 2026**. The user's answers to its §7: **Q1** seats by reputation + 3 × backers with no members' votes; **Q2** no backer requirement (10 PC spent, backers +3); **Q3** the capital's rule is the largest bloc's, and parties that share a rule add their seats.<br>GDD §15, §14.11, §6.5 and §1.5, as the designer is amending them now.<br>`docs/tech/slice-3.md`, `slice-4.md` §6.5 and §7.2, and `slice-7.md`.<br>ADRs 0017–0021, 0026, 0027 and 0077 |
| **ADRs** | [0083 the town votes on a rule](../adr/0083-the-town-votes-on-a-rule-three-cards-set-at-day-2.md) · [0084 seats, standing and backing](../adr/0084-seats-by-reputation-and-backers-standing-is-spent-with-a-rule.md) · [0085 the contested city's rule](../adr/0085-the-contested-citys-rule-is-the-largest-blocs.md) · [0086 converting a city](../adr/0086-converting-a-city-to-the-rule-vote.md) |
| **Environment** | **Local only.** Played in `pnpm dev:mem` (a fresh database each start) or `pnpm dev` (Docker, persisted). The conversion and migration 009 are written for the persisted case (§6). No new dependency, collection or job |
| **Testing** | **No unit tests** (the user's decision). Every *Done when* is a Playwright spec, the cached check `pnpm art:check && pnpm turbo run lint typecheck build`, or a script. Each phase runs only its e2e specs, with `--no-deps`. The full e2e runs once, at the end (§15) |

Every number below is a GDD or design number. Where the design leaves a point open, this document takes a default and lists the question in §20.

---

## 1. Scope

| # | Feature | Design | Section | Phase |
|---|---|---|---|---|
| F1 | **The rule vote:** the calendar's new reading, the three cards (home), the set at day 2, the vote by rule, the count of the rule, the fallback, Unrest | §3.1–§3.4 | §3, §4, §7 | 1–2 |
| F2 | **Seats, standing, backing:** reputation + 3 × backers; stand with a rule for 10 PC spent; backing until the count; the branch's backing as a bonus | §3.5–§3.6 | §4.1, §8.1 | 1–2 |
| F3 | **The councillor's rule:** set at standing, changed on cycle days 0–1, free | §3.3, §3.7 | §8.1 | 2 |
| F4 | **The capital:** a card per party, shared cards, the score with card ballots, the largest bloc's rule | §3.3–§3.4 | §4.3, §7.3 | 2, 4 |
| F5 | **The conversion and migration 009** | — | §6 | 2 |
| F6 | **The home screens:**<br>• the Election card's seven states;<br>• the `RuleCard` ballot;<br>• the desktop card as the ballot;<br>• the result;<br>• the Town Hall's five blocks;<br>• the stand card;<br>• *What now*;<br>• the front page | §4.1–§4.6 | §9 | 3 |
| F7 | **The capital's screens** | §4.1–§4.3 (capital) | §9.8 | 4 |
| F8 | **The paper, the headlines, the rule chip, the Me line, the help notes, the dev panel** | §4.7–§4.9 | §9.9, §10, §12 | 5 |

**Out:** §18.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| The calendar | Days unchanged. **Days 0–1:** candidates stand and councillors set their rule. **Boundary into 2 (the set):** the list and the three cards freeze. **Days 2–4:** the vote. **Boundary into 0 (the count):** seats and the rule. The winner is in force `[count, count + 5)`. `boundaryWork → { count, set }` | ADR 0083, §3 |
| Where the ballot lives | **`ordinances` documents become rule ballots** (model `RuleBallot`, same collection and `_id = councilKey(city, k)`): `status open → set → counted`, `cards`, `unrest`, `changes`, `result`; old order-paper fields under `legacy` | ADR 0083, §5.1 |
| The cards | Pure functions: `homeBallot` (party card, the two top-seated player councillors' rules, then the seated locals' rules by seat, then the fill), `capitalBallot` (one per party, shared cards merged), `partyCardOf` (the chain). Read at the set from `officeTerms.rule`; provisional at read on days 0–1 | ADR 0083, §4.2 |
| The councillor's rule | `officeTerms.rule`, copied at the count from `candidacies.rule` (players) or `NpcCandidate.rule` (home locals). **`council.setRule`** on days 0–1, free, request-keyed, serialised with the set by `$inc changes` on the ballot | ADR 0084, §8.1 |
| The vote | `votes.ordinanceId` (new; `candidateKey` stays optional for slice 7). Unique `{ electionId, voterId }`. `$inc elections.ballots` filtered on `polling`. Secret until the count | ADR 0083 §4, ADR 0019 |
| The count | In the boundary's transaction: `countSeats`, then `decideHomeRule` or `decideCapitalRule`; `cities.ordinance` from `d` to `d + 5`; ballot `counted`; ballot k + 1 open. **A city always has a rule** | ADR 0083, §7 |
| Seats | `total = wardVote + 3 × min(backers, 5)`, with backers = members + the branch's. Ties: backers, successes, order. **No members' votes** | ADR 0084, §4.1 |
| Standing | `standing` from the declare, with `rule`, 10 PC spent. No `filed`, `struck`, `withdrawn`, refund or small branch. `ON_BALLOT` from the declare | ADR 0084, §8.1 |
| Backing | Days 0–4 (until the count), candidacy `status: 'standing'`. The branch's +3 once, on a day the three orders are done | ADR 0084, §8.1 |
| Unrest | The party's card comes off. The ballot is three councillor cards, and the fallback is card 1 of those | ADR 0083 §6, §4.2, §20 Q2 |
| The capital | Card per party (top-seated player councillor → secretary; slice 7 adds the Mayor and the Chair). A shared card's votes are split equally for the score. The largest bloc's card wins; ties: votes, opinion, draw | ADR 0085, §4.3 |
| The conversion | A guarded step of `settleCityDay`, as of `world.settledDay`, one transaction per city, `world.voting: 2`. Migration 009 refunds `deposit: 'due'` once | ADR 0086, §6 |
| Jobs | **None new.** The set and the count ride the city-day boundary (ADR 0017) | §13 |
| Old Vitest files | Not run (8 Oct rule), but **typechecked**. Files about the removed model are deleted; mixed files lose the removed cases only | §15.3 |

---

## 3. The calendar (`packages/rules/src/calendar.ts`)

```ts
export type CouncilPhase = 'nominations' | 'polling';   // internal names kept: days 0–1 standing open; days 2–4 the rule vote
export interface CouncilDay {
  cycle: number;
  cycleDay: CycleDay;
  phase: CouncilPhase;
  election: { cycle: number; nominationsFrom: DayKey; pollsFrom: DayKey; countDay: DayKey };  // unchanged
  /** The council seated at `fromDay`; `ruleOpen` on days 0–1 (councillors set their rule); `setDay` = fromDay + 2. */
  council: { cycle: number; fromDay: DayKey; toDay: DayKey; ruleOpen: boolean; setDay: DayKey };
  /** The rule in force this cycle (ballot k − 1's result, decided at fromDay). `toDay` exclusive. */
  ruleWindow: { fromDay: DayKey; toDay: DayKey };          // [start, start + 5)
  /** What this cycle's vote decides (in force from the next count). */
  nextRuleWindow: { fromDay: DayKey; toDay: DayKey };      // [start + 5, start + 10)
}
export function boundaryWork(day: DayKey, offset: number): { count: boolean; set: boolean };  // day 0 · day 2
export const ruleBallotKey = councilKey;   // "coalport:4146": the ballot council k puts to the town
```

- `council.voting`, `council.divideDay` and `ordinanceWindow` are removed. Every reader moves:
  - `politicsService` (the card's `closesAt`, the desk);
  - `townHallService`;
  - `councilService.councillorTerm`;
  - the dev panel's `clock.ts`.
- `nextNominationsAfter` and `nextPollsFrom` are unchanged.
- **Check:** `pnpm check` (the type change forces every reader).

---

## 4. Rules (pure, `packages/rules`)

### 4.1 `council.ts` v4: seats

```ts
export const wardVote: (successes: number) => number;                 // unchanged (÷ 5)
export function drawNpcSlate(...): NpcSlateEntry[];                     // unchanged
export const npcsStanding: (playersStanding: number) => number;         // unchanged (fill to nine)

/** ADR 0084: members' backings plus the branch's, uncapped (the tie-break uses them all). */
export const backersOf = (c: { members: number; branch: boolean }): number => c.members + (c.branch ? 1 : 0);

export interface CountLine { key: string; kind: 'player' | 'npc'; name: string; wardVote: number;
  successes: number; backers: number; order: number }
export interface CountRow extends CountLine { backersCounted: number; total: number; place: number; seated: boolean }
export interface CountResult { rows: CountRow[]; seated: CountRow[]; npcSeats: number; topKey: string; lastSeatKey: string }

/** §3.5: total = wardVote + 3 × min(backers, 5); the `seats` highest are seated. Ties: backers, successes, order. */
export function countSeats(lines: readonly CountLine[], seats?: number): CountResult;   // replaces countElection
export function marginToSeat(row, r): number;                                            // unchanged
/** The set (boundary into day 2): every standing player by filing, then the slate's top 9 − p locals. */
export function freezeList(i: { standing: ReadonlyArray<{ id: string; filedAt: number }>;
  npcSlate: ReadonlyArray<{ npcId: string }> }): { standing: string[]; ballotNpcs: string[] };  // replaces closeNominations
export function stipendBoundaries(...): number;                                          // unchanged
```

**Removed:** `isSmallBranch`, `effectiveEndorsements`, `closeNominations`, `NominationsClose`, `countElection`, `divide`, `Division`, `DivisionItem`, `AGAINST_ALL`, `deskNext` and `DeskNext`.

**Constants** (`COUNCIL`):

- Removed: `passVotes`, `maxProposals`, `endorsementsNeeded`, `smallBranchBelow`, `cost.propose`.
- Added: `ballotCards: 3`.
- `endorsementsCounted: 5`, `endorsementWeight: 3` and `cost.declare` / `cost.endorse: 10` stay.

`CAPITAL_COUNCIL.passVotes` and `maxProposals` are removed.

### 4.2 `ruleBallot.ts` (new): the cards and the home decision

```ts
export type CardBy =
  | { kind: 'party'; factionId: FactionId; via: 'secretary' | 'councillor'; name: string; characterId?: string }
  | { kind: 'councillor'; holder: 'player' | 'npc'; seat: number; name: string; characterId?: string; npcId?: string };
export interface RuleCard { ordinanceId: string; factionIds: FactionId[]; by: CardBy[] }   // by.length > 1 only when shared

export interface SeatRule { seat: number; holder: 'player' | 'npc'; name: string; characterId?: string;
  npcId?: string; factionId: FactionId; total: number; rule: string | null }

/**
 * Design §3.3, §3.4 (Unrest). Not Unrest: [the party's card, the rules of the two top-seated player
 * councillors (by seat) not already on, then the seated locals' rules by seat, then `fill`] to three
 * distinct cards. Unrest: no party card; [player councillors by seat (up to three), then locals by seat,
 * then `fill`] to three. Card 1 is the fallback.
 */
export function homeBallot(i: { party: { ordinanceId: string; by: CardBy }; seats: readonly SeatRule[];
  fill: readonly string[]; unrest: boolean }): RuleCard[];

/** ADR 0085: the party's card: its top-seated player councillor with a rule (highest total, then
 *  the lower seat), else the secretary's default. Slice 7 prepends the Governor or Mayor and inserts the Chair. */
export function partyCardOf(i: { factionId: FactionId; defaultRule: string; secretary: { npcId: string; name: string };
  seats: readonly SeatRule[] }): { ordinanceId: string; by: CardBy };

/** ADR 0085: one card per party, equal rules merged, in `order` (councilOrder) of their first party. */
export function capitalBallot(i: { parties: ReadonlyArray<{ factionId: FactionId; ordinanceId: string; by: CardBy }>;
  order: readonly FactionId[] }): RuleCard[];

export interface RuleTally { ordinanceId: string; votes: number; seats?: number }
export type RuleHow = 'votes' | 'tie' | 'fallback' | 'seats' | 'draw' | 'carried';
export interface RuleDecision { winner: string; how: RuleHow; tallies: RuleTally[] }   // tallies in finishing order

/** §3.4: most votes; leaders tied → card 1 if among them ('tie'), else the earliest card ('tie');
 *  no votes → card 1 ('fallback'). Votes for an id not on the cards are ignored. */
export function decideHomeRule(cards: readonly RuleCard[], votes: Readonly<Record<string, number>>): RuleDecision;

/** §3.2: what a count at `countDay` puts in force. */
export const ruleWindowFrom = (countDay: DayKey) => ({ fromDay: countDay, toDay: countDay + COUNCIL.ordinanceDays });
```

**`fill`**, so a ballot always has three different cards: the city's other local candidates' rules in profile order, then the content menu's order (`content.ordinances`). Neither is reached with the Appendix A content (§11). A loader check proves it.

### 4.3 `capitalCount.ts` v2

```ts
export function turnoutWeight(ballots: number): number;                // unchanged
export function districtScores(i): FactionScore[];                     // unchanged (ballots may be fractional)
export function dhondt(...): { seats; drawn };                          // unchanged
export function drawOrderOf(rng): FactionId[];                          // unchanged
export function councilOrder(seats, ballots, opinion, drawOrder): FactionId[];  // unchanged; now orders the cards
export const npcFill: (p: number) => number;                            // unchanged

/** ADR 0085: a district's ballots by party from its card votes; a shared card's votes split equally. */
export function cardBallots(cards: readonly RuleCard[], votes: Readonly<Record<string, number>>): Record<FactionId, number>;

/** §3.5 + slice 4 §6.5: within each party by `countSeats`' total and ties; across parties D'Hondt on the
 *  scores from `ballotsByFaction` (cardBallots). Lines carry backers, no votes. */
export function countDistrict(i: { lines: readonly DistrictCountLine[]; ballotsByFaction: Record<FactionId, number>;
  opinion: OpinionShares; rng: Rng }): DistrictCount;

/** ADR 0085: a card's seats = Σ its parties' seats; most seats wins; ties: card votes city-wide, Σ its
 *  parties' opinion share (the city's average), the earliest party in `drawOrder`. how: 'seats' | 'draw'. */
export function decideCapitalRule(i: { cards: readonly RuleCard[]; seatsByFaction: Record<FactionId, number>;
  votes: Readonly<Record<string, number>>; opinion: OpinionShares; drawOrder: readonly FactionId[] }): RuleDecision;
```

**Removed:** `divideCapital`, `CapitalDivision` and `CapitalDivisionItem`.

### 4.4 Types (`types.ts`): the views and results that change

```ts
export type ElectionCardState =
  | 'belowRank' | 'vote' | 'voted' | 'result' | 'standing' | 'councillor' | 'nextInLine'
  | 'registered';                                                     // the capital's, kept (design §4.1)

export interface RuleCardView {
  ordinanceId: string; name: string; plainLine: string; effectLine: string;
  whose:
    | { kind: 'party'; factionIds: FactionId[]; by: string }          // "Secretary Holm" · "Councillor Varga"
    | { kind: 'councillor'; name: string; local: boolean; you: boolean };
  yourVote: boolean;                                                  // the caller's own, only (ADR 0019)
}
export interface RuleBallotView {
  key: string; cityId: string; cityName: string; placeName: string; capital: boolean;
  status: 'provisional' | 'set';                                      // days 0–1 the cards as they stand; days 2–4 frozen
  cards: RuleCardView[];                                              // a district's view: ordered by its parties' shares
  setAt: number; pollsOpenAt: number; countAt: number; runsUntil: number;
  myVote: { ordinanceId: string; name: string } | null;
  canVote: boolean; reason: GameErrorReason | null;
  /** A councillor of this council: their rule, whether it is a card, and the change window. */
  myRule: { ordinanceId: string; name: string; onBallot: boolean; changeUntil: number | null } | null;
  standing: { players: number; locals: number; seats: 7 | 2 };      // "2 players and 7 local candidates for 7 seats"
}
export interface RuleResultView {
  key: string; countDay: DayKey; weekday: string;
  cards: Array<RuleCardView & { votes: number; seats: number | null; share: number; won: boolean }>;  // finishing order
  how: RuleHow; turnout: { voters: number; eligible: number } | null; runsUntil: number;
}
export interface ElectionCardView {
  state: ElectionCardState; closesAt: number; pollsOpenAt: number; countAt: number; runsFrom: number;
  fxp: number; rank2Fxp: number; canStand: boolean; votedFor: string | null;
  result: { winner: string; votes: number; voters: number; how: RuleHow; runsUntil: number; nextVoteAt: number;
    capital?: { factionIds: FactionId[]; seats: number; districtSeats: FactionId[] } } | null;
  standing: { rule: string; backers: number; branchLine: boolean } | null;
  councillor: { rule: string; onBallot: boolean; changeUntil: number } | null;
  firstTime: boolean;
}
```

The other views (§8.4):

- **Changed:** `PoliticsSummaryView` (+ `ballot: RuleBallotView | null`, a smaller `state`), `ElectionView` (the list + `stand`), `CountView`, `CapitalCountView`, `FrontPageView`, `WhatNowView` and `TownHallView`.
- **New:** `StandCardView` and `CouncilRowView`.
- **Removed:** `CouncilView`, `OrderPaperItemView`, `OrdinanceMenuItemView`'s `onPaper` (it becomes `onBallot`), `EndorsementsView`'s `needed` and `branchCounts`, and `TownHallView.paper`, `.desk`, `.noRule`, `.passVotes` and `.divideAt`.

**Acts:**

- `PoliticalAct` gains `'setRule'` and loses `'withdraw'`, `'propose'` and `'councilVote'`.
- `PoliticalResult.knockOns.endorsements` becomes `backers: { name: string; n: number } | null`.

**Errors** (`GameErrorReason`, words in `copy.errors.*`):

- **New:** `NOT_ON_BALLOT { ordinanceId }` and `RULE_WINDOW_CLOSED { opensAt }`.
- **Changed:** `ALREADY_VOTED { ordinanceId, name }`.
- **Removed:** `NOT_FILED`, `UNKNOWN_PLATFORM`, `UNKNOWN_CANDIDATE`, `ALREADY_PROPOSED`, `ALREADY_ON_PAPER`, `PAPER_FULL`, `COUNCIL_CLOSED`, `ALREADY_COUNCIL_VOTED` and `NOT_ON_PAPER`.

**Headline conditions** (`PoliticalCondition`):

- **New:** `ruleDecided { fallback: boolean }` (the count morning), `votedRule { won: boolean }` (the player's card won or lost), `ruleOnBallot` (a councillor whose rule is a card of the ballot set last night) and `voteOpen` (cycle days 2–4).
- **Removed:** `votedFor`, `nominationsClosed`, `divided`, `movedYesterday` and `ordinanceFromToday`.
- **Kept:** `seatWon`, `seatLost`, `filedYesterday`, `termEnded`, `countToday`, `phaseToday` and `leftUnrest`.

---

## 5. Data model (`packages/db`)

### 5.1 Collections

| Collection | Change | Absent reads as |
|---|---|---|
| `ordinances` → model **`RuleBallot`** (file `politics.ts`; `OrderPaper` is removed) | `{ _id: councilKey, cityId, cycle, fromDay, setDay, countDay, status: 'open' \| 'set' \| 'counted', cards: RuleCard[] \| null, unrest: boolean \| null, changes: number, result: { winner, how, tallies, turnout, inForce } \| null, legacy?: { items, votes, division } }`. Index `{ cityId: 1, countDay: -1 }` replaces `{ cityId: 1, divideDay: -1 }` | an unconverted doc is never read: the conversion runs first (§6) |
| `elections` | `ballot` now means **the candidate list** (frozen at the set; the name stays). `smallBranch` is not written. `status` is unchanged | — |
| `candidacies` | `rule: string` (new). `platformId` optional. Statuses written: `standing`, `elected` and `defeated`; `filed`, `struck` and `withdrawn` are legacy. `deposit` is written `spent`; `effective` and `smallBranch` are not written. **The partial index `{ characterId, deposit }` is dropped** | `rule` absent → the faction's default (old rows only) |
| `votes` | `ordinanceId?: string` (new), `candidateKey?: string` (now optional; slice 7). Validator: exactly one is set. Index `{ electionId: 1, ordinanceId: 1 }` is added. The unique `{ electionId, voterId }` is unchanged | old rows have `candidateKey` |
| `officeTerms` | `rule?: string \| null`, `ruleSetAt?: Date \| null` | `null` → a local's rule from content; a player's falls back to the faction's default |
| `cities` | `world.voting?: 2` (the conversion's guard). `ordinance.paperId` now points at the rule ballot whose result it is. **The shape is unchanged** | absent → not converted (§6) |
| `characters` | `endorsementsGiven[]` unchanged (the one-backing guard) | — |
| `requestLogs` | kind `'council.setRule'`. `council.withdraw`, `.propose` and `.councilVote` are no longer written | — |

### 5.2 What is embedded and what is referenced

- **Unchanged rule** (CLAUDE.md engineering 5): votes, candidacies, terms and ballots each grow per cycle and live in their own collections.
- The city document keeps only what every request reads: the rule in force and its history (ADR 0021).
- The ballot is not projected onto the city. The Election card reads it by `_id` on days 2–4, only for Rank 2+, which is one indexed read on a view that already reads the election.

---

## 6. The conversion and migration 009 (ADR 0086)

### 6.1 `convertCityVoting(content, cityId)`: `apps/server/src/services/votingConversion.ts` (new)

`settleCityDay` gains one step:

```ts
const needsVoting = !!city?.world && city.world.voting !== 2;
// … in the loop, before needsIssues and the boundary:
if (needsVoting) return convertCityVoting(content, cityId, city.world.settledDay, session);   // throws AlreadySettled on a miss
```

**As of `S = world.settledDay`** (`cal = councilDay(S, offset)`, `k = cal.cycle`, `start = cal.council.fromDay`, `end = start + 5`), in **one transaction**:

1. **Re-read the city in the session.** If `world.voting === 2` or `settledDay !== S`, throw `AlreadySettled`.
2. **Council k's terms** (`councilKey(cityId, k)`, `vacatedDay: null`). Set `rule` for each:
   - **a player:** the ordinance they proposed on the old paper k (`items[].movedBy.characterId`), else their candidacy's `rule` (election k − 1, absent on old rows), else their faction's `branchMotion`;
   - **a home local:** `content.candidate(npcId).rule`;
   - **a capital local:** `null`.
3. **The rule in force.** `cur = ordinanceIdOn(city, S)`:
   - **if there is one:** `ordinance = { id: cur, fromDay: <its fromDay>, toDay: end, paperId: councilKey(cityId, k − 1) }`. The history entry whose window holds S gets `toDay: end`. Days ≤ S are unchanged because `end > S`.
   - **else:** card 1, `{ id, fromDay: S + 1, toDay: end, … }`, and a history entry is pushed. Card 1 is the home party's `branchMotion`, or the capital's `decideCapitalRule` over council k's seats with no votes, the district average and a seeded draw `"{cityId}:{k}:convert"`.
4. **Ballot k − 1:** upsert `counted`, with `result: { winner: id, how: 'carried', tallies: [], turnout: null, inForce: { fromDay, toDay: end } }`. An existing old paper's `items`, `votes` and `division` move to `legacy` through an update pipeline (`$set legacy`, `$unset` the old fields).
5. **Ballot k:** move the old paper k's fields to `legacy` (if there is one).
   - **Cycle day ≤ 1:** `status: 'open'`, `cards: null`, `changes: 0`.
   - **Cycle day ≥ 2:** `status: 'set'`, with `cards` from `homeBallot` / `capitalBallot` over step 2's rules and `unrest` = `moraleState(city.opinion[home]) === 'unrest'` on S.
6. **The open election(s) k** (home: `city:k`; capital: the five `district:k`):
   - candidacies `filed` → `standing` (`deposit: 'spent'`, `rule` = the faction's `branchMotion`);
   - `standing` without `rule` → the default;
   - `struck` and `withdrawn` stay as they are.
   - **On cycle day ≥ 2:** `votes.deleteMany({ electionId, ordinanceId: { $exists: false } })` and `elections.ballots: 0`.
7. **Commit:** `City.updateOne({ _id, 'world.settledDay': S, 'world.voting': { $ne: 2 } }, { $set: { ordinance, ordinanceHistory, 'world.voting': 2 } })`. A miss throws `AlreadySettled`.

**Bootstraps** (`bootstrap`, `bootstrapCapital`) write `world.voting: 2`. Each one also:

- creates ballot k (`open`, or `set` on days 2–4 with cards over the NPC council);
- puts card 1 (home) or the largest bloc's card (capital) in force for `[start, end)`.

### 6.2 Migration `009-voting-rework.ts` (`packages/db`, run by `ensureIndexes` after 008)

```ts
export async function refundDueDeposits(): Promise<StepCounts>;   // per candidacy, one transaction:
//   Candidacy.updateOne({ _id, deposit: 'due' }, { $set: { deposit: 'returned' } }) → modified 1 ⇒
//   Character.updateOne({ _id: characterId }, [{ $set: { pc: { $min: [PC.cap, { $add: ['$pc', 10] }] },
//                                                        version: { $add: ['$version', 1] } } }])
export async function migrateVotingRework(): Promise<{ refunds: StepCounts }>;
```

- **Idempotent:** a second run matches nothing.
- The start-up log prints the counts, as migration 008's do.
- The indexes follow the schemas through `syncIndexes`, which runs before the migrations.

### 6.3 What a converted city looks like (the script asserts this table)

| S's cycle day | Rule in force | Ballot k − 1 | Ballot k | Election k | Votes k |
|---|---|---|---|---|---|
| 0–1 | the old rule, `toDay` → `start + 5` (or card 1 from S + 1) | `counted`, `carried` | `open` | `nominations`; `filed` → `standing` with a rule | none |
| 2–4 | the old rule, `toDay` → `start + 5` (or card 1 from S + 1) | `counted`, `carried` | `set`, three cards (the proposer's rule among them when they are a top-two player) | `polling`; the frozen list kept | person ballots deleted, `ballots: 0` |

---

## 7. The city day v3 (`apps/server`)

### 7.1 Shared helpers: `services/ruleBallot.ts` (new)

```ts
export async function seatRules(content, cityId: string, k: number, session): Promise<SeatRule[]>;  // council k, not vacated
export async function setBallotStep(content, i: { cityId; k; d; at; unrest: boolean; capital: boolean;
  order?: FactionId[] }, session): Promise<void>;
//   cards = homeBallot | capitalBallot over seatRules(k); RuleBallot.updateOne({ _id, status: 'open' },
//   { status: 'set', cards, unrest }) → 0 ⇒ AlreadySettled (a missing ballot is created set, as the old code did)
export async function tallyRules(electionIds: readonly string[], session): Promise<Record<string, Record<string, number>>>;
//   votes.$match { electionId ∈ ids, ordinanceId exists } → $group { electionId, ordinanceId }
export async function provisionalBallot(content, cityId: string, today: DayKey, city: CityDoc | null): Promise<RuleCard[]>;
//   the same pure function over the seats now (views, days 0–1); no write
```

`cityDayCore.ts`:

- `tally` is replaced by `tallyRules`.
- `countLines` reads `backersOf({ members: endorsements.length, branch: branch !== null })` from each candidacy **at the count**, not `effective`.
- `turnoutOf` is unchanged.

### 7.2 `processBoundary` (home)

Drift → Issues on Mondays → **the count** (cycle day 0) → **the set** (day 2) → the morale record → the Unrest prize → the guarded city write. The work of each step:

- **The count** (`work.count`):
  1. Election k − 1, status `polling`:
     - `r = countSeats(countLines(e))`;
     - `turnout = turnoutOf(e._id, activeMembersFilter(…), votes)`, where the votes are the rule votes;
     - the heroes step;
     - `Election.updateOne({ status: 'polling' }, counted)`.
  2. **The rule:** `b = RuleBallot(k − 1)` (status `set`), `dec = decideHomeRule(b.cards, tallyRules([e._id])[e._id])`.
     - `RuleBallot.updateOne({ _id, status: 'set' }, { status: 'counted', result: { ...dec, turnout, inForce: ruleWindowFrom(d) } })`. A miss throws `AlreadySettled`.
     - `set.ordinance = { id: dec.winner, ...ruleWindowFrom(d), paperId: b._id }`.
     - `push.ordinanceHistory` is `$slice: -4`.
  3. **Candidacies** become `elected` or `defeated` with their place, as built. Council k − 1's terms are `completed`.
  4. **Council k's terms**, with `rule` = the candidacy's `rule` (a player) or `content.candidate(npcId).rule` (a local).
  5. **Morale:** +2 for each player seat; −3 when `turnout.voters === 0`. Unchanged; the voters are now the rule's.
  6. **Open election k** (`nominations`) and **ballot k** (`open`, `changes: 0`). Then `set.council`.
- **The set** (`work.set`):
  - election k, `nominations` → `polling`, with `ballot = freezeList(…)`'s lines (players carry `rule` instead of `platform`);
  - `setBallotStep({ unrest: moraleState(shares[home]) === 'unrest' })`, read after this boundary's drift.
- `cityDayHooks.noBranchMotion` keeps its meaning for the old server tests: the count writes `ordinance: null` for those cities. The hook is read in one place.

### 7.3 `processCapitalBoundary`

- **The count** (day 0):
  1. `cards = RuleBallot(k − 1).cards`, and `votesBy = tallyRules(five election ids)`.
  2. **Per district:** `countDistrict({ lines, ballotsByFaction: cardBallots(cards, votesBy[e._id]), opinion, rng: createRng(`${e.seed}:draw`) })`. The district results and the candidacies are written as now.
  3. **The rule:** `decideCapitalRule({ cards, seatsByFaction: Σ districts, votes: Σ votesBy, opinion: averageShares(districts), drawOrder: drawOrderOf(createRng(`${firstSeed}:rule`)) })`, then the ballot is `counted` and the city's `ordinance` is set as at home.
  4. Ten terms with `rule` (players from their candidacy; locals `null`). Five elections k, and ballot k `open`.
- **The set** (day 2): the five lists are frozen (`closeDistrict` without the strike), then `setBallotStep({ capital: true, order: councilOrder(seats of council k, the last count's ballots, opinion, drawOrder) })`.
- Ballots and seats never move a district's opinion, as before.

### 7.4 Ordering and lazy time

- The ordering invariant of ADR 0017 holds:
  - a vote cast before the boundary is in the count;
  - a rule change before the boundary into day 2 is on the cards (§13).
- Nothing waits on a job. The views compute the provisional cards on days 0–1, and every window is a whole City Day.

---

## 8. Server and API

### 8.1 The acts (`services/councilService.ts`)

Every act runs through `runAct` (the request key, `withRequestKey`, the settled-day guard) as now.

| Act | Input (Zod) | Window | Guards, in the transaction | Writes | Errors |
|---|---|---|---|---|---|
| **`council.declare`** (stand) | `{ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }` | cycle days 0–1 | Rank 3, Known, `standsFromDay ≤ today`, not sitting, the ordinance exists, no candidacy (unique index), `pc ≥ 10` | `$inc elections.filed` filtered `nominations`; candidacy `standing` with `rule`, `deposit: 'spent'`, `branch` = today's orders done ? today : null; PC −10 (version guard) | `NOT_NOMINATIONS`, `RANK_TOO_LOW`, `NOT_YET_CANDIDATE`, `NOT_KNOWN`, `SITTING_COUNCILLOR`, `UNKNOWN_ORDINANCE`, `ALREADY_FILED`, `NOT_ENOUGH_PC`, `ELECTION_NOT_READY` |
| **`council.endorse`** (back) | `{ candidacyId, idempotencyKey }` (unchanged) | cycle days 0–4 | Rank 2, not self, the same race (the capital: any district this cycle), own faction, candidacy `standing`, the one-backing guard, `pc ≥ 10` | `$push endorsements` filtered `status: 'standing'`; PC −10 with `endorsementsGiven` | as now; `CANDIDACY_CLOSED` after the count |
| **`council.vote`** | `{ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }` | cycle days 2–4 | Rank 2, `votesFromDay ≤ pollsFrom`, ballot k `set` and the id among its cards, no vote yet | `$inc elections.ballots` filtered `polling`; `votes` insert `{ electionId, voterId, ordinanceId, day }`; `firstBallotAt` once; at home morale +0.5 and the ledger row, as now | `NOT_POLLING`, `RANK_TOO_LOW`, `NOT_YET_VOTER`, `ELECTION_NOT_READY`, `NOT_ON_BALLOT`, `ALREADY_VOTED { ordinanceId, name }` |
| **`council.setRule`** (new) | `{ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }` | cycle days 0–1 of the term | a player term on council k of the residence city, not vacated; the ordinance exists | `OfficeTerm.updateOne({ _id, 'holder.characterId': me, vacatedDay: null }, { rule, ruleSetAt })`; `RuleBallot.updateOne({ _id: k, status: 'open' }, { $inc: { changes: 1 } })`, where a miss gives `RULE_WINDOW_CLOSED` | `NOT_COUNCILLOR`, `RULE_WINDOW_CLOSED { opensAt }`, `UNKNOWN_ORDINANCE` |

- **The capital:** the vote's `electionId` is the district's (`irongate.eastside:k`, the one-vote guard per district), and its cards are read from the city's ballot (`irongate:k`).
- **Free and changeable:**
  - every change is a new key;
  - the same rule again is accepted and returns the modal;
  - a rule already on the provisional ballot is accepted: the chain skips duplicates, and the client dims it (§20 Q10).
- **The branch's backing** is `branchBackIfStanding(content, session, c, today, now)`, called where `branchEndorseIfFiled` is today:
  - it applies on cycle days 0–4;
  - `Candidacy.findOneAndUpdate({ electionId, characterId, status: 'standing', branch: null }, { branch })`;
  - it returns `{ backers: n }` for the result modal's knock-on line, *the branch backs you · 2 backers*.
- **Removed:** `withdraw`, `propose`, `councilVote`, `councillorTerm`'s voting window and `branchEndorseIfFiled`.
- **The move** (`residenceService`): `ON_BALLOT` applies from the declare (`status: 'standing'` on every cycle day). The `filed` → `withdrawn` path and `candidacyWithdrawn` go.

### 8.2 The settlement (`dayService`)

- The `deposit: 'due'` read, the refund and `desk.deposits` are removed (migration 009 credits what is left).
- The stipend is unchanged.

### 8.3 The views (`services/politicsService.ts`, `townHallService.ts`)

| Builder | Returns | Reads |
|---|---|---|
| `ballotView(content, c, cityId, today, session?)` (new) | `RuleBallotView` | the ballot by `_id` (`set` → cards; `open` → `provisionalBallot`), the caller's vote by `{ electionId, voterId }`, the caller's term (`myRule`), the candidacy counts (players) |
| `politicsSummary` v2 | `PoliticsSummaryView`: `card`; `ballot` (days 2–4, Rank 2+); `inForce { ordinanceId, name, plainLine, daysLeft, how, votes, voters }`; `route`; `dot` (state `vote`) | as now, minus the order paper; the last ballot `counted` on days 0–1 |
| `electionCard` v2 | the first that applies: `belowRank` → (days 2–4) `registered` if not yet a voter, else `vote` / `voted` → (days 0–1) `councillor` / `nextInLine` (a player term on council k) → `standing` (a candidacy) → `registered` (a district before the first vote) → `result` | the term, the candidacy, the vote, ballot k − 1's result |
| `electionView` v2 (`/council/slate`) | the list (players then locals, each with `rule`, `backers`, `canBack`); `stand: StandCardView \| null` (days 0–1, not a candidate, not sitting); `candidacy { rule, backers, branchLine }`; `backed`; `pc` | as now |
| `countView` v2 | `{ rule: RuleResultView, council: CouncilRowView[] (the seated, then the unseated with `short`), seats, npcSeats, turnout, hall }`. Old rows are read through `rowV2` (`backers ?? endorsements ?? 0`) | election k − 1, ballot k − 1 |
| `capitalCountView` v2 | the cards with seats; per district three party rows `{ factionId, votes, seats }` plus the council rows; no `w`, score or opinion columns. `votes` is the card's district votes, marked `shared` for a shared card (§20 Q1) | five elections, ballot k − 1 |
| `townHallView` v2 | the five blocks (§9.5): `inForce`, `next: RuleBallotView`, `seats` (+ `rule` on player rows), `stand`, `issues`, `whatNow`, `councillor` | as now, minus the paper; `ballotView` |
| `frontPageView` v2 | `{ …, count: CountView }`, rendered as the cards plus *What now* | — |
| `whatNowOf` v2 | `{ termId, cityId, hall, rule: { name, onBallot }, capital: { leadsBloc, by, factionId } \| null, changeUntil, pollsOpenAt, countAt }` | the term, the ballot |
| `toCharacterView` | + `cityRule: { cityId, cityName, name, daysLeft } \| null` (the Me line, §9.9), from the residence city document it already has | — |

**Secrecy (ADR 0019).** No view carries `elections.ballots`, a tally or another voter's row before ballot k is `counted`. `RuleBallotView.myVote` is read by `{ electionId, voterId: me }`.

### 8.4 API summary (tRPC, `trpc/routers/council.ts`)

| Procedure | Input | Output | New errors |
|---|---|---|---|
| `council.election` | unchanged | `ElectionView` v2 | — |
| **`council.ballot`** (new) | `z.object({ cityId: z.string().min(1) }).optional()` (default: the residence) | `RuleBallotView` | — |
| `council.count` | unchanged | `CountView` v2 \| null | — |
| `council.capitalCount` | unchanged | `CapitalCountView` v2 \| null | — |
| `council.hall` | unchanged | `TownHallView` v2 | — |
| `council.whatNowSeen` | unchanged | unchanged | — |
| `council.declare` | `{ ordinanceId, idempotencyKey }` | `PoliticalResult` (`act: 'declare'`, `view: { kind: 'election' }`) | `UNKNOWN_ORDINANCE` |
| `council.endorse` | unchanged | `PoliticalResult` (`knockOns.backers`) | — |
| `council.vote` | `{ ordinanceId, idempotencyKey }` | `PoliticalResult` (`act: 'ballot'`, `view: { kind: 'ballot', ballot: RuleBallotView }`) | `NOT_ON_BALLOT` |
| **`council.setRule`** | `{ ordinanceId, idempotencyKey }` | `PoliticalResult` (`act: 'setRule'`, `view: { kind: 'hall', hall: TownHallView }`) | `RULE_WINDOW_CLOSED` |
| `paper.today`, `character.me`, `city.get` | unchanged | the Election row v2, the front page v2, `cityRule`; `city.get`'s HQ card v2 | — |
| **Removed** | `council.withdraw`, `council.propose`, `council.councilVote`, `council.chamber` | — | — |
| Test only (`E2E_TEST_HOOKS`) | `POST /api/test/rule-votes`, `POST /api/test/seat` (§12) | — | — |

---

## 9. Client (`apps/client`) and UI (`packages/ui`)

Every string comes from design §4, word for word, through `copy`. Weekdays are rendered in the player's clock (`formatWeekday`, `formatUntil`). Vocabulary: *rule*, *back*, *stand*; never *ordinance*, *endorse* or *motion* (the review-4 guard regex).

### 9.1 `RuleCard` and `RuleCards` (`packages/ui/src/components/RuleCard.tsx`, new)

- **`RuleCard`** (props `card: RuleCardView`, `selected`, `cast`, `onSelect`, `mode: 'vote' | 'show' | 'result'`, `result?`, `layout: 'stack' | 'row'`):
  - a button with `role="radio"`, at least 88 px tall, with a 1.5 px ink border;
  - when selected, inverted as a `StoryScreen` row;
  - the name (body 600, 16) · the plain line (body 14) · the effect line (Oswald caps 10, petrol, `effectLine · 5 DAYS`) · the Courier *whose* line (with the crest, or two crests) · a radio ring on the right.
- **Already voted:** *your vote* on the chosen card, and the others at 50 %.
- **Result mode:** the vote count (Oswald 16) at the right; a share bar under the name; the in-line **PASSED** stamp and *runs until Thursday* on the winner; *the branch's · no votes cast* on a fallback.
- **`RuleCards`:** a `radiogroup` with arrow keys, `stack` (phone) or `row` (≥ 960, three columns of 160 px). `data-testid="rule-card"`, `data-ordinance`.
- **`useRuleVote(ballot)`** (`apps/client/src/features/council/useRuleVote.ts`): the selection and the `council.vote` act through `usePoliticalAct`. It is shared by the ballot page, the hall's block 2 and the desktop card.
- **Removed from `packages/ui`:** `OrderPaper`, `OrdinanceMenu`, `CountTable`, `DistrictResultTable`, `HowElectionsWork`, and `Slate`'s ballot mode. `OrdinanceRow` stays for the rule picker.

### 9.2 The Election card (`Politics.tsx` `ElectionCard`, `electionLines` v2)

- **The kicker:** *COUNCIL RULE · COALPORT* (the capital: *· EASTSIDE*). The paper row's kicker is *Council rule*. A tap opens `help.rule`.
- **Line 3**, the rule in force (*Now: Street Fund · … · 3 days left*), shows in every state but `result`.
- The seven states and their lines and buttons are design §4.1's table. The capital's `registered` and the *first appearance* line are kept.
- **`layout: 'card'`** gains `ballotInline`. With it, on days 2–4, the card renders `RuleCards` (stack, radio rings) and **Vote for {rule}** under them. **Desktop vote = two taps.**
  - `city.tsx` passes `ballotInline` for the side column (from 640 px, where the card renders as a card in the plate's column).
  - The HQ sheet and the paper row keep the link (§20 Q9).
- **Phone (390 × 844):** at most 120 px unfolded. **Folded** (`compact`, under the plate) it keeps the kicker and line 1 with ›.

### 9.3 The ballot (`/council/ballot`, `BallotPage`)

- The hall header (the short-phone rule stays) · `Plate` kicker *COALPORT COUNCIL · THE VOTE*, title **Which rule for next week?**, and the Courier line.
- `RuleCards`, then sticky **Vote for {rule}** / *Choose a rule*, with the caption.
- Then the folded row **Who's standing · n players and m local candidates for 7 seats ›** (`/council/slate`), *How the vote works* (the help note) and *Last result · Sunday*.
- **Closed** (days 0–1): *Coalport votes from Wednesday*, the provisional cards (show mode, *the ballot is set at Tuesday midnight*), **See the result** and *See who's standing*.
- **Above the fold** is checked in Playwright:
  - **390 × 844:** all three cards and the CTA in the viewport, unscrolled (header 150 + plate 80 + cards 264 + sticky 64 = 558 of 728);
  - **375 × 667:** the header at its 64 px band and the third card's top edge visible;
  - **≥ 960:** the 720 px sheet with one row of three and the button under them.

### 9.4 The result (`/council/count`, `CountPage`)

- The plate *COALPORT COUNCIL · THE RESULT*, *{weekday}'s result*, and *6 of 9 members voted · final*.
- `RuleCards` in result mode, in finishing order.
- **The council** (kicker): `CouncilRows`.
  - The seven seated, as `PersonMark` · name · *Player · Organiser · One of Us · 3 backers* or *Local candidate · Trusted*, with *you* and *· the rule you named: …*.
  - *the line*, then the unseated (*8th · 4 short*).
  - A row tap opens a `Popover` with *local support 40 · backers 2*.
  - The Courier sentence under the list.
- The links.

### 9.5 The Town Hall (`TownHall.tsx` → `TownHallBlocks` v2; `features/council/TownHall.tsx`)

The blocks, in order after the ticket:

1. **THE RULE IN FORCE**:
   - the name, the plain line, *3 days left*;
   - the Courier *won Sunday with 4 of 6 votes*, *the branch's · no votes cast*, *the Vanguard's · 4 seats of 10*, or *carried over* (`how: 'carried'`, §20 Q8);
   - the kicker opens `help.rule`.
2. **NEXT WEEK'S RULE:** `RuleCards` from `TownHallView.next`.
   - **Days 2–4:** radio rings and **Vote for …** in the block, or *your vote*.
   - **Days 0–1:** the cards as they stand, plus *the ballot is set at Tuesday midnight*.
   - **A councillor:** their card carries *your rule* and **Change ›**. It opens a `BottomSheet` titled *Your rule · choose one* with eleven `OrdinanceRow`s (one tap → `council.setRule`), where rows on the ballot are dimmed *on the ballot*. A councillor whose rule is not a card reads the *next in line* line.
   - Then the Courier **Next** line, by cycle day, and the pay line for councillors.
3. **THE COUNCIL:** rows as now. A player row adds *· rule: …*. Then *Term ends Thursday* and the locals' line.
4. **STAND FOR THE COUNCIL:** the stand card (§9.6), on days 0–1 for an eligible resident.
5. **THIS WEEK'S ISSUES:** unchanged.

`YourDesk`, `UpForAVoteReadOnly` and `deskNextLine` are removed, and the Election card is no longer appended. **`/council`** (`CouncilPage`) renders the same five blocks on the paper ground.

### 9.6 Who's standing and the stand card (`/council/slate`)

- **The plate:** *COALPORT COUNCIL · CANDIDATES*, *Who's standing*, *Seven seats · counted Sunday morning · stand until Monday midnight*, and the one sentence.
- **`StandCard`** (`packages/ui`, new; replaces `DeclareCard` and `CandidacyCard`):
  - two ticks, or a cross with its line and no button;
  - the seat line;
  - **Your rule:** one row (the branch's default first) with *Change ›* to the same eleven-row sheet. The choice is local until the stand;
  - **Stand · 10 Political Capital** (*Needs 10 Political Capital* when short), and the Courier price line;
  - after standing, *You're standing · your rule: … · 1 backer*, plus the branch's line.
- **The list:**
  - *Players standing* (name · *Organiser · Trusted in Coalport · 2 backers* · *rule: …*, **Back · 10 Political Capital**, *Backed* or *You*);
  - then *Local candidates*, with the one line and their rows (*· rule: …*).
- The *last seat is usually close* line, the backers progress bar, *withdraw* and the struck lines are removed.

### 9.7 *What now* (`WhatNowCard` v2)

- The kicker *WHAT NOW · YOUR FIVE DAYS*, two numbered lines (design §4.6, with the capital variant) and **To your desk at the Town Hall**.
- It is shown once per term (`whatNowSeenAt`), on the front page and at the first hall visit, as built.

### 9.8 The capital (lane K)

- **The card:** the kicker with the district; *Which rule for Irongate next week?*; the result lines; `registered` as built.
- **The ballot:**
  - the line *Each party puts up a rule. Votes and opinion in Eastside together decide: …*;
  - the three cards ordered by the parties' shares in the district;
  - a shared card shows two crests and *the Collective's and the Alliance's rule*.
- **The result:**
  - the plate line *Rally Permits won · 4 seats of 10 behind it · local candidates 7 of 10 · final*;
  - the cards with seat bars;
  - the `DistrictSwitcher` as built;
  - per district three `PartyRow`s (crest · party · *votes n* · seat bars), with *Votes and opinion together · final*;
  - the party's candidates as council rows.
- **The help note's More line** carries the formula.

### 9.9 The rule always visible

- **The plate's line:** unchanged (*Council rule: Street Fund · … · 3 days left*, a tap opens the hall).
- **`RuleChip`** (new, `packages/ui`): *STREET FUND · 3 DAYS*, Oswald caps on paper-2. Default placement (§20 Q6):
  - on a phone, right of the plate's kicker whenever the plate's rule line is folded away (the `max-height: 700px` rule);
  - on a phone, in the place sheet's header row while a sheet covers the plate (`layout === 'sheet' && loc`).
  - A tap opens the Town Hall.
- **Tickets and the result modal's bonus lines:** unchanged.
- **The Me tab:** *Coalport · Street Fund · 3 days left* under the party card, from `CharacterView.cityRule`.
- **The capital's district plate and the district list:** the same line, city-wide (they already read the capital's `ordinance`).

---

## 10. The paper and headlines

- **The Election row** (`paper.tsx`): the kicker *Council rule*, the states of §9.2 and the `dot` on `vote`.
- **The front page** (a seat won on the count morning): the photograph, ELECTED, the headline and the deck stay. Under them come the three result cards (not the table), then *What now*, then **To your desk at the Town Hall**.
- **Templates** (`politicalHeadlines.ts`; the Clarion's wording from design §4.8; the Sentinel, the Gazette and the Herald in their voices):

  | Id | Condition | Kind |
  |---|---|---|
  | `hl.rule-won` | `ruleDecided { fallback: false }` | city 0 |
  | `hl.rule-fallback` | `ruleDecided { fallback: true }` | city 0 |
  | `hl.your-rule-won` | `votedRule { won: true }` | personal 2 |
  | `hl.your-rule-lost` | `votedRule { won: false }` | personal 2 |
  | `hl.your-rule-on-ballot` | `ruleOnBallot` | personal 2 |
  | `hl.vote-open` | `voteOpen` (days 2–4) | city 0 |
  | `hl.filed` | `filedYesterday` (reworded: the rule) | as now |
  | `hl.seat-*`, `hl.count`, `hl.nominations`, `hl.stands-firm` | as now | decks lose *members' votes* |

  **Removed:** `hl.on-ballot`, `hl.struck`, `hl.moved`, `hl.council-passed`, `hl.council-failed`, `hl.voted-won`, `hl.voted-lost`, `hl.voted-lost-tie`, `hl.ordinance-city` and `hl.polls-open` (replaced by `hl.vote-open`), in every voice.
- **The facts, at read** (`politicalHeadlines`):
  - `ruleDecided` is ballot k − 1 `counted` with `countDay === today`;
  - `votedRule` is the caller's vote on that ballot, against `result.winner`;
  - `ruleOnBallot` is today `=== setDay` and the caller's term `rule` among the set cards.
  - The variables: `{rule}`, `{winner}`, `{votes}`, `{of}`, `{until}` and `{line}`.
- **`localEdition.ts`:** `ordinanceFromToday` becomes `ruleFromToday` (`ordinance.fromDay === today` and not the bootstrap day). The rival edition's *Duskwall elects its council* line becomes the designer's rule wording (`copy.paper.localElection`).
- **`capitalPaper.ts`:** the count line names the rule and its seats (*Rally Permits · 4 seats of 10*) next to the seats by party.
- **The desk:** the *Deposit returned* line goes.

---

## 11. Content (`packages/content`)

| File | Change | Check |
|---|---|---|
| `schemas.ts` | `NpcCandidate.rule: Id.optional()`; `Faction.platforms` removed; `politics.results` keys `ballot`, `declare`, `endorse`, `setRule` (+ the slice-4 acts) | `pnpm check` |
| `data/candidates.ts` (design App. A says `people.ts`; the locals live here) | the 27 home locals gain `rule` (App. A); Clearwater and the capital none | loader: **`ballotFillProblems`**: every home local has a rule that is an ordinance; each home city's NPC-only ballot (party card + seven seated locals by profile) gives **three distinct cards**, and those cards are App. A's line (*Coalport: Long Service Order · Public Works Order · Rally Permits*; *Duskwall: Rally Permits · Public Works Order · Long Service Order*; *Ashford: Reading Room Grant · Public Meetings Order · Public Works Order*) |
| `data/factions.ts` | `platforms` removed; `branchMotion` kept (the secretary's default, *the branch's rule*) | loader as now |
| `data/politics.ts` | design §4.8's four modals (*Vote cast*, *You're standing*, *Backed*, *Changed*); `withdraw`, `propose` and `councilVote` removed | loader: every `CouncilAct` has a text |
| `data/copy.ts` | `election.*` (the seven states), `hall.*` (five blocks), `council.whatNow.lines` (two), `help.rule` (three lines, the capital variant, *More*), `ballot.*`, `result.*`, `stand.*`. **Removed:** design §5.3's list (`formula`, `howDecided`, `capitalElection.howSeatsAreWon`, `votesCast`, `lastSeatClose`, `againstAll`, `roseWithoutMotion`, `propose`, `paperFull`, `youMoved`, `depositRule`, `depositStays`, `withdraw*`, `struckLine`, `onTheBallotLine`, `branchMakesUpTheNumber`, `help.election`, `help.capitalElection`, `help.backers`, `help.localSupport`) | `pnpm check` (unused exports are a lint error where the lint rule applies; otherwise a grep in phase 5's *Done when*) |
| `data/politicalHeadlines.ts`, `heraldHeadlines.ts`, `localHeadlines.ts` | §10's set in four voices | loader: every condition kind is known; vocabulary and content-policy regexes |

**Strings.** The developer transcribes design §4 word for word. The other voices' strings (the Sentinel, the Gazette, the Herald) come from the game designer. Until then they are `TODO(game-designer)` stand-ins, which the loader lists at start-up (as review 5 did).

---

## 12. The dev panel and test hooks

| Item | Change |
|---|---|
| Phases (`dev/clock.ts`) | `'count-day' \| 'nominations' \| 'polls'` → `'result-day' \| 'standing' \| 'vote'`. Labels: *Result day · stand and set rules (day 1 of 2)* · *Stand and set rules (day 2 of 2)* · *The vote (day n of 3)*. Lines: *the vote opens in Coalport* · *the count is in · Street Fund runs in Coalport* |
| Status (`DevHomeCity`) | + `ballot { status, cards: string[] }`; `ordinance` + `how` |
| **Seat me** (new action `seat`) | the session's character takes the lowest-ranked local seat on its residence's sitting council for the rest of the term (`vacateSeat` for the local; a player term from today, `rule` = the faction's default; the `offices` projection written as the settlement writes it). It refuses when already seated |
| **Votes for card 2 × 3** (new action `townVotes`) | days 2–4: three synthetic votes for card 2 of the residence's set ballot (fresh voter ids, `$inc ballots` filtered `polling`). It shows a councillor's card winning without three accounts |
| `POST /api/test/rule-votes` | `{ votes: Record<ordinanceId, number>, placeId?: string }`: synthetic votes into the open election of the session's residence (or `placeId`), filtered `polling`. E2E only |
| `POST /api/test/seat` | `{ seat?: number }`: as *Seat me*, at a given seat (to build *next in line* with three accounts). E2E only |
| `POST /api/test/unrest` | unchanged; it is used for the Unrest ballot |
| README | the dev-panel steps: seat me, set a rule, skip to the vote, add votes, skip to the count |

---

## 13. Scheduled jobs, idempotency and atomicity

**Jobs: none new, none rescheduled.** `city-day` (00:01 UTC and at worker start, ADR 0017) runs, per city:

- the conversion (once per city);
- the drift;
- the Issues (Mondays);
- **the count** (cycle day 0: seats and the rule);
- **the set** (cycle day 2: the list and the cards);
- the morale record and the Unrest prize.

Each boundary is one transaction guarded by `world.settledDay: d − 1`. A re-run throws `AlreadySettled`.

| Write | Exactly once by | Serialised with its window's close by |
|---|---|---|
| Stand | unique `{ electionId, characterId }`; the PC spend's version guard | `$inc elections.filed` filtered `nominations` (the set flips it) |
| Back | the candidacy's `endorsements.characterId: { $ne }` and the character's `endorsementsGiven` guard | the candidacy filtered `standing` (the count flips it) |
| The branch's backing | `branch: null` on the candidacy | the same |
| Vote | unique `{ electionId, voterId }` | `$inc elections.ballots` filtered `polling` (the count flips it) |
| Set your rule | a target-state `$set` on the term; the request key returns the stored modal | `$inc changes` on the ballot filtered `open` (the set flips it) |
| The set | `RuleBallot` `open → set`; `Election` `nominations → polling` | the boundary's guard |
| The count | `RuleBallot` `set → counted`; `Election` `polling → counted`; unique terms `{ councilKey, seat, fromDay }` | the boundary's guard |
| The conversion | `world.voting: { $ne: 2 }` with `world.settledDay: S` | the next boundary (ADR 0086) |
| A refund (009) | `deposit: 'due' → 'returned'` before the credit | — |

- **A retry with the same key** returns the stored modal byte for byte (`withRequestKey`).
- **A new key after success** meets the natural guard and gets the domain refusal carrying the state (`ALREADY_VOTED { ordinanceId, name }`), which the client renders as the settled screen.
- **Lazy timers:** nothing ticks. The rule is day-constant (ADR 0021), and the provisional cards are computed at read.

---

## 14. The result modal: how each breakdown is produced

| Act | Kind | Stamp · headline | Knock-on lines | Source |
|---|---|---|---|---|
| Vote | `political` | *Vote cast* · *Your vote is in* (body names the rule, secret, the result morning, *runs from Sunday for five days*) | *Coalport morale +0.5 → 84.5 %* (home) · *Next: the result, Sunday morning.* | `council.vote`: `knockOns.morale`, `next`, `at = dayStart(countDay)` |
| Stand | `political` | *You're standing* · *Your name is on the list* (your rule, the seats sentence, the orders line) | *−10 Political Capital · 35 left* · *Next: …* | `council.declare`: `knockOns.pc` |
| Back | `political` | *Backed* · *{name} has your backing* (*three more to {name}'s count at Sunday's result*) | *−10 Political Capital · 25 left* · *Next: …* | `council.endorse`: `knockOns.pc`, `knockOns.backers` |
| Change your rule | `political` | *Changed* · *Your rule is {rule}* (the plain line, *On the ballot from Wednesday*) | *Next: the vote opens Wednesday.* | `council.setRule` |
| The branch's backing (in an action's modal) | `action` | — | *All orders carried out · the branch backs you · 2 backers* | `branchBackIfStanding` → the `branch` knock-on |
| The count | the paper | the front page, the cards with votes and PASSED, the council rows with their two numbers on a tap | — | `CountView` v2, as stored at the count |

Every figure the result prints is stored at the count: `RuleBallot.result.tallies`, `turnout`, `how` and `Election.result.rows` with `wardVote`, `backers` and `total`. So the page is the count, not a recomputation (rule 6). No odds are shown; nothing here rolls.

---

## 15. Testing (no unit tests)

### 15.1 How to run

- **The check:** `pnpm art:check && pnpm turbo run lint typecheck build` (cached, never `--force`).
- **One spec:** `pnpm --filter @irongate/client exec playwright test --project=<name> --no-deps`.
- **Scripts:** `pnpm --filter @irongate/server check:voting-conversion`, `pnpm report:playtest`.
- **The full e2e** (`pnpm e2e`) runs **once**, in phase 6.

### 15.2 E2E specs: rewritten (not weakened) and new

| Spec (project) | Today | After |
|---|---|---|
| `council.spec.ts` (`council`) | declare → endorsed → ballot (9 names) → count → ELECTED → propose + council vote → ordinance | **stand with a rule** (ticks, *Change ›*, no backer line) → the orders give *1 backer* → the vote (three App. A cards, 390 × 844 above the fold, one tap) → the count, lazily → ELECTED, the three cards with PASSED, *What now* (two lines) → the desk: **your rule on the ballot**, **Change › Street Fund** (*Changed*) → the next vote for Street Fund → in force: the plate line, the ticket tag *Street Fund · +25 % Iron*, the result modal's tag, *Street Fund Wins the Vote in Coalport* |
| `qa.slice3.spec.ts` (`qa-council`) | double tap on a row and the CTA; keyboard ballot; the six-column count at 360 | a double tap on a card and on the CTA casts one vote and one modal; no side scroll at 360; the ballot by keyboard (Tab into the radiogroup, arrows, Space, Tab, Enter); the result at 360 (cards, council rows, the popover's two numbers) |
| `capital.spec.ts` (`capital`) | register → vote among names of three parties → the count's two tables | register → *Which rule for Irongate next week?* → three party cards with crests, in Eastside's order → vote (no morale line) → the count: the plate line, five chips, three party rows per district, **no** *votes count n % of the score* line, the help's *More* line, no side scroll at 360 |
| `qa.slice4.spec.ts` (`qa-capital`), *the capital ballot on a short phone* | the first name above the CTA | the three cards and the CTA at 390 × 844; the third card's top edge at 375 × 667 and 360 × 640; one row of three at 1440 × 900 |
| `review3.spec.ts`, *the election screens* | `how-decided` with the formula; *How elections work* with five lines | the hall header; *Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest.*; *How the vote works* with three lines |
| `qa.review4.spec.ts` #11 | the halls as a visitor | the rule in force block; *Next week's rule* read-only for a visitor (no Vote button, no Change); 7 and 10 council rows; no stand card; no Election card |
| `devpanel.spec.ts` | steps 5–6, 8: the phase labels | the new labels and lines (§12); the paper row `data-state` `result` / `vote` |
| `rival.spec.ts` | *Duskwall elects its council* | the designer's rule line |
| **`voting.spec.ts`** (new project `voting`, serial, after `qa-review5`) | — | **API** (phase 2): stand without backers; `NOT_ON_BALLOT`; one key twice gives the same body; a second key gives `ALREADY_VOTED`; `setRule` on day 2 gives `RULE_WINDOW_CLOSED`; Rank 1 gives `RANK_TOO_LOW`; **secrecy on the wire** (no `tallies` or `votes` numbers in `council.ballot`, `council.hall`, `paper.today` or `city.get` during the vote); the fallback (no votes, card 1 in force from the count); most votes wins (`rule-votes` 3–1 for card 3); a 2–2 tie between cards 2 and 3 goes to card 2; Unrest (`/api/test/unrest`): no party card at the set; backing on day 3 counts +3 at the count. **Screens** (phases 3–5): the desktop card is the ballot (1440 × 900, two taps); *next in line* (three accounts seated 1–3); the change sheet's *on the ballot* rows; the Me line; the rule chip (a sheet open on a phone, and 390 × 640); the headlines `hl.rule-fallback`, `hl.your-rule-won` and `hl.your-rule-on-ballot` |

### 15.3 The old Vitest files

They are not run (the 8 Oct rule), but `tsc` includes `test/`, so they must compile. They are retired as follows; nothing is added:

- **Deleted** (their subject is the removed model):
  - `packages/rules/test/council.test.ts`;
  - `packages/rules/test/review4.hall.test.ts` (`deskNext`);
  - `apps/server/test/council.test.ts`;
  - `apps/server/test/cycle.test.ts`;
  - `packages/ui/test/politics.test.tsx`.
- **Trimmed** (the removed model's cases deleted, and the rest made to compile against the new signatures without new assertions):
  - `packages/rules/test/{qa.slice3.rules,qa.slice4.rules,slice4.capital}.test.ts`;
  - `apps/server/test/{qa.slice3.server,qa.slice4.capital,slice4.capital,slice4.cityDay,slice4.integration,slice4.register,cityDay,chapter2,qa.slice3.worker,qa.slice4.residence,qa.slice4.travel,review4.hall}.test.ts`, `helpers.ts`;
  - `packages/db/test/{elections,qa.slice4.db,review1.db,review2.db,slice3.db,slice4.db}.test.ts`;
  - `packages/ui/test/{review4.maps,slice4,vocabulary}.test.tsx`.
- The phase's Deviations list each file and what went.

### 15.4 The playtest checklist (the question, in play)

- [ ] A Rank 2 player opens the paper, reads *Which rule for Coalport next week?*, taps one of three cards and votes in three taps (two on a desktop). The modal says what happens and when.
- [ ] The next morning the plate, the tickets and the Me tab show the winner. With no votes, the branch's rule runs and the paper says so.
- [ ] A Rank 3 player who is Known stands in one tap for 10 Political Capital with a rule, and needs no backers.
- [ ] A councillor sees their rule on the ballot, changes it on day 0 or 1 in two taps, and reads *next in line* when two seats above chose first.
- [ ] Nothing on the path prints a formula, a threshold or *None of these*. The capital says *votes and opinion together* once, and its rule always runs.
- [ ] Every result waits in the paper; no step needs the player online at a set time.

---

## 16. Risks

| Risk | Mitigation |
|---|---|
| **The switch mid-cycle** on a persisted database: a rule's window moved over settled days, or a boundary on old state | The conversion as of `settledDay`, only future days moved, `world.voting` guarding every boundary (ADR 0086); the conversion script at every cycle day, twice |
| **Phase 2 leaves the client compiling but bare** (the tRPC types flow to the client) | Planned: phase 2's *Done when* is API-level. The UI specs listed in §15.2 are expected red until phases 3–5 and are recorded. Local only, nothing is shipped |
| **A ballot with fewer than three distinct cards** | `fill` beyond the seated locals, and the loader's `ballotFillProblems` on every content load |
| **Secrecy regressions** (a view leaking `result` or counts before the count) | Views read `result` only from `counted` ballots; `voting.spec` scans the wire during the vote |
| **The capital's shared-card split** reads oddly (a shared card's votes on two party rows) | The *shared* marker on the rows; the designer's question (§20 Q1) |
| **`city.tsx`, `copy.ts` and `politicsService.ts`** are edited by lanes H, K and P | One `copy.<block>` per lane, append only; lane H lands the components and the hall in phase 3 before K and P start |
| **Thirty old Vitest files** must still typecheck | §15.3's list: delete or trim, never patch to assert new behaviour |
| **The new e2e project on the shared clock** interferes with later projects | `voting` runs last in the chain (after `qa-review5`) and restores the residence's cycle day with `advanceTo` at its end |

---

## 17. Knock-ons on the slice 7–9 tech docs (not built; record before each is built)

**Slice 7 (`docs/tech/slice-7.md`).** Copy these as a dated note in phase 6.

1. **The Governor** (§2 *The Governor*, §6.8, §8.2 `governorService.setRule`, ADR 0048):
   - the Governor's rule is **card 1** of the home ballot: `partyCardOf`'s chain head, ahead of the Chair and the secretary;
   - `governor.setRule` writes the `governor` term's `rule` on cycle days 0–1, guarded by the ballot's `status: 'open'` (`$inc changes`) instead of the order paper's `$position: 0` push;
   - `ALREADY_ON_PAPER` and *goes to the vote first* go, and the modal reads *card 1 on the town's ballot*;
   - **the locals' chain and `divide` v3 are removed** (no council vote), and `orderPaperItems` is replaced by `partyCardOf` with `governorRule`.
2. **The Mayor** (the capital): the head of their party's card chain. `governorOf`'s largest-bloc rule is unchanged.
3. **The Chair's rule per city** (`factions.rules`, ADR 0046): read at **the set** (boundary into day 2) of the next ballot, not written into the order paper at the count; it is the party's card wherever no Governor or Mayor of the party sits and no player councillor of the party leads (contested cities: Mayor → top-seated player councillor → Chair → secretary; home: Governor → Chair → secretary).
4. **Clearwater** (ADR 0050):
   - `countBattleground` with seven seats takes `ballotsByFaction` from `cardBallots`;
   - **`divideBlocs` and the four-of-seven bar are removed**, and the rule is `decideCapitalRule` generalised (`decideBlocRule`) on one meter;
   - the Casino's hall shows the five blocks.
5. **Petitions** (ADR 0049): the dissolve petition closes **before the set** (it was before the division). Dissolution vacates the terms, and the open ballot keeps or takes its cards from the party chain and the seats' locals. Whether *strikes the rule* still cuts the rule in force is §20 Q16.
6. **The Chair's election** (§4.1, §8.2 `chairElectionService`): no two-backer gate (25 PC spent; backers +3, optional); no strike, no `deposit: 'due'`; the settlement's struck-Chair refund goes; `CHAIR.backers` goes.
7. **ADR 0047:** `votes` rows carry `candidateKey` (Chair, pick) or `ordinanceId` (councils), and the national vote's key is unchanged. `termBackings[]` is unchanged.
8. **The tests listed** (§15): `governor.spec.ts` reads *card 1 on the ballot* and, with no votes, *Public Works Order runs from Sunday* (`hl.rule-fallback`), not *Council Passes*. The council and capital cases of §6.12 are rewritten against `homeBallot` and `decideCapitalRule`.
9. **Ambition chapter 3, *The deposit*,** and `keep.deposit-receipt`: the deposit is no longer returned, so the designer re-reads the chapter.
10. **Laws:** unchanged; the law book's rows read as council rules with the *LAW* kicker. Parliament's For / Against is unchanged.

**Slice 8:** Legacy for a seat or a term is unchanged. A Legacy for a *rule that won* is not designed (out).

**Slice 9:**

- Telemetry gains `rule.vote`, `rule.set`, `council.stand`, `council.back` and `rule.decided` (with `how`).
- The axe matrix adds `RuleCard`, `StandCard`, the rule picker sheet and the hall's five blocks.
- The audit (ADR 0061, *linked accounts count once*) applies to `votes` by `ordinanceId` the same way.

---

## 18. Deliberately left out

| Left out | Why / where |
|---|---|
| Running totals during the vote | Appendix C #25: the first lever if turnout reads low (design §3.10). The data supports it (a view change, ADR 0019) |
| Members' votes for candidates; a card's votes counting for its champions | The user's Q1. Lever Appendix C #105 |
| Platform lines for players | Removed (design §3.9). The locals keep their lines as flavour |
| A candidate changing their rule before the count | Not in the design. They change it as a councillor (§20 Q4) |
| Backfilling old counted results to the v2 row shape | Read tolerantly (`rowV2`); local only |
| The Governor, the Mayor, the Chair, Clearwater and petitions | Slice 7 (§17) |
| Unit tests | The user's rule. §15 covers in play |
| Any hosting step | Local only |

---

## 19. Task list (phases, lanes, *Done when*)

**One developer per phase.**

- **While working:** the cached check, and the phase's own specs with `--no-deps`.
- **At the end of each phase:** the check, then the phase's specs, then commit the phase (verify, then commit).
- **The full e2e** runs once, in phase 6.

```
Phase 0 (baseline) ─► Phase 1 (lane A: foundations, additive) ─► Phase 2 (lane A: the back end switch)
                                                                    └─► Phase 3 (lane H: the home screens)
                                                                          ├─► Phase 4 (lane K: the capital's screens)
                                                                          └─► Phase 5 (lane P: paper, chip, help, dev panel)
                                                                                         all ─► Phase 6 (integration)
```

### Phase 0 — Baseline (lane A)

**T0.** On `slice-0` at HEAD, run the cached check and the projects `council`, `qa-council`, `dev-panel`, `capital`, `qa-capital`, `review3` (the election test) and `qa-review4` (#11), each with `--no-deps`. *Done when:* the results are recorded under *Baseline* at the end of this file (a red that predates this round is noted, not fixed here).

### Phase 1 — Foundations, additive (lane A)

Nothing visible changes in this phase. New code sits beside the old.

**T1. Rules.** §4.2 `ruleBallot.ts`; §4.3's `cardBallots` and `decideCapitalRule`; `backersOf`, `countSeats` and `freezeList` **added** next to the old functions; the calendar's new fields **added** (`ruleOpen`, `setDay`, `ruleWindow`, `nextRuleWindow`) with the old ones kept; the new types of §4.4 added under their own names; the new error reasons and condition kinds added.

**T2. Content.**
- `NpcCandidate.rule` and the 27 rules (App. A);
- the `ballotFillProblems` loader check;
- the new `politics.results.setRule` and the four modals' new texts (old keys kept);
- the new `copy` blocks (old kept);
- the new headline templates in the Clarion's voice, with `TODO(game-designer)` stand-ins for the other voices, listed at load.

**T3. DB.** The optional fields of §5.1 on the existing models; the `RuleBallot` fields on the `ordinances` schema (beside the old ones); `votes.ordinanceId` and its index; migration 009 written and **not wired**.

*Done when:*
- the cached check is green;
- `pnpm dev:mem` starts and the loader prints no `ballotFillProblems`. A deliberately broken fixture (a local without a rule, tried once by hand) is refused by name;
- `council` and `capital` are green, unchanged.

### Phase 2 — The back end switch (lane A, after phase 1)

**T4. The city days and the conversion.**
- §7 and §6.1: `processBoundary` and `processCapitalBoundary` v3;
- the bootstraps;
- `services/ruleBallot.ts`;
- `votingConversion.ts` and its step in `settleCityDay`;
- migration 009 wired into `ensureIndexes`;
- `apps/server/scripts/checkVotingConversion.ts` and `check:voting-conversion`.

**T5. The acts, the views and the router.** §8: declare, endorse, vote, setRule, `branchBackIfStanding`, the move, the settlement; every view builder; the router (`council.ballot` and `council.setRule` added, four procedures removed).

**T6. Remove the old model.** The old functions, types, errors, constants, `OrderPaper`, the order-paper copy and acts, and the platform lines. §15.3's Vitest retirements.

**T7. Test hooks and the minimum client.**
- `/api/test/rule-votes` and `/api/test/seat`;
- the dev panel's phases and status (§12; the actions come in phase 5);
- the client compiles: the council routes render the v2 views with existing primitives and `TODO(phase 3)` where a component is new.

*Done when:*
- the cached check is green;
- `check:voting-conversion` passes for the three home cities and the capital at cycle days 0–4, twice each, plus the next count, and migration 009 credits each due deposit once over two runs;
- `voting.spec.ts`'s **API** block is green;
- `grep -rnE "divide\(|divideCapital|closeNominations|OrderPaper|AGAINST_ALL|councilVote|platformId" packages/rules/src apps/server/src packages/db/src/models` finds nothing;
- the specs of §15.2 that read the old screens are recorded as expected-red in the phase's Deviations.

### Phase 3 — The home screens (lane H, after phase 2)

**T8. Components.** `RuleCard`, `RuleCards`, `StandCard`, `CouncilRows` (with the popover), `RuleChip` (built, placed in phase 5), `WhatNowCard` v2, `TownHallBlocks` v2 and the rule picker sheet. The removed components go.

**T9. Routes.**
- `/council/ballot`, `/council/count`, `/council/slate` and `/council`;
- the hall sheet's five blocks;
- `ElectionCard` v2 (seven states, `ballotInline` on the side column);
- the front page's cards and *What now*;
- `useRuleVote`, and `usePoliticalAct`'s view kinds (`ballot`, `hall`).

*Done when:*
- the cached check is green;
- `council.spec.ts` and `qa.slice3.spec.ts` are rewritten (§15.2) and green;
- `review3`'s election test and `qa.review4` #11 are green;
- `voting.spec.ts`'s screens: the desktop card is the ballot, *next in line*, and the change sheet's *on the ballot* rows are green;
- the 390 × 844 and 375 × 667 measurements of §9.3 are asserted.

### Phase 4 — The capital's screens (lane K, after phase 3)

**T10.** §9.8: the card's capital lines, the ballot's line and order, shared cards, the result's plate line, the cards with seats, the `PartyRow`s, the council rows per party, and the help's *More* line. *Done when:*
- the cached check is green;
- `capital.spec.ts` and `qa.slice4.spec.ts`'s capital ballot test are rewritten (§15.2) and green;
- `voting.spec.ts`'s capital API cases are still green.

### Phase 5 — The paper, the chip, the help notes, the dev panel (lane P, after phase 3; parallel with phase 4)

**T11. The paper.** §10: the Election row, the front page's last details, the templates in four voices (the designer's strings or the listed stand-ins), the facts, `localEdition`, `capitalPaper` and the desk line.

**T12. Always visible.** §9.9: `RuleChip` placed, and the Me line.

**T13. Help notes and copy.** `help.rule` (three lines, the capital variant, *More*) and `help.pc` reworded. Design §5.3's removals: `grep` finds none of the removed `copy` keys.

**T14. The dev panel.** The *Seat me* and *Votes for card 2 × 3* actions, and the README steps.

*Done when:*
- the cached check is green;
- `devpanel.spec.ts` and `rival.spec.ts` are updated and green;
- `review4.spec.ts`'s vocabulary guard passes on the new screens;
- `voting.spec.ts`'s chip, Me line and headline cases are green.

### Phase 6 — Integration (one developer, last)

**T15. The walk-through.** The full `pnpm e2e`, once. *Done when:* green (a flaky test is fixed, not re-run), and `pnpm report:playtest` prints the council section v2 (ballots set, turnout per ballot, the fallback rate, the winning card's kind, councillor rule changes, stands and backings) on a `dev:mem` database after two cycles.

**T16. Docs.** *Done when:* the README's steps reproduce the councillor walk-through from a fresh `pnpm dev:mem`. The docs:
- a **Deviations** section at the end of this file;
- ADRs 0083–0086 accepted;
- §17 copied into `slice-7.md` as a dated note, with the slice 8 and 9 lines into theirs;
- `docs/IMPLEMENTATION_PLAN.md` §5's row for the rework;
- §21's notes passed to the designer.

---

## 20. Questions

### 20.1 For the game designer (each has a default, so the build does not wait)

All sixteen settled by the game designer on 10 Oct 2026: `docs/design/voting-simplified.md` §8 (cited *design §8.n*).

1. **A shared card's votes in a district's score.** *Default:* split equally between the sharing parties (ADR 0085). The rows show the card's full votes with *shared*. Alternative: each party counts them in full. **Settled: confirmed** (design §8.1).
2. **The Unrest ballot.** *Default:* three cards from the councillors' chain (player councillors by seat, then locals), with card 1 of those as the fallback. Alternative: two cards. **Settled: confirmed.**
3. **The branch's backing.** *Default:* +3 **once**, on any day 0–4 until the count on which the candidate does all three orders. Alternative: +3 per such day (up to the five counted). **Settled: confirmed.**
4. **A candidate changing their rule after standing.** *Default:* no (the stand card's choice is final for the candidacy; they change it as a councillor on days 0–1). **Settled: confirmed.**
5. **The capital's "top-seated" player councillor.** *Default:* the highest count total, then the lower seat number (seat numbers are per district). **Settled: confirmed.**
6. **Where the rule chip sits** on *the folded plate*. *Default:* on a phone, right of the plate's kicker when the rule line is folded away (under 700 px tall), and in the place sheet's header while a sheet covers the plate. **Settled: confirmed.**
7. **The Election card's `result` line for a fallback.** *Default:* *Long Service Order runs · the branch's rule · no votes cast*. **Settled: changed to two lines** (design §8.2: *Long Service Order runs · the branch's rule* / *No votes were cast · runs until Thursday · the next vote opens Wednesday*; the Unrest, tie, seats, shared and draw lines are there too, with the hall's *how it won* words, `copy.rule.how.*`).
8. **The switch cycle's result line** (`how: 'carried'`, the first days after the conversion). *Default:* *Street Fund · carried over · runs until Thursday*. **Settled: changed to two lines** (design §8.2: *Street Fund runs · carried over* / *Runs until Thursday · the first vote on a rule opens Wednesday*).
9. **The desktop card as the ballot.** *Default:* in the city screen's side column from 640 px. The HQ sheet and the paper row keep the link to the ballot. **Settled: confirmed.**
10. **A councillor choosing a rule already on the ballot.** *Default:* allowed (their card is skipped and the next in line fills it); the sheet dims those rows *on the ballot* but does not disable them. **Settled: confirmed**; the dimmed note reads *already on the ballot · yours would be skipped*.
11. **The fill past the seated locals.** *Default:* the city's other locals by profile, then the menu's order (never reached with App. A). **Settled: confirmed.**
12. **`hl.vote-open` on each of days 2–4.** Taken as written (design §4.8), so the headline prints three mornings running. Confirm, or limit it to day 2. **Settled: day 2 only** (the *Council rule* row carries the vote every morning; design §8.1).
13. **The Clearwater and capital locals** carry no rule (the chain ends at the secretary). Confirm that they never fill a card. **Settled: confirmed.**
14. **The rival edition's *Duskwall elects its council* line** needs the rule wording. **Settled: written** (design §8.3: *Duskwall votes on its rule until {until}.* / *Duskwall chooses next week's ballot · voting opens {weekday}.*; on days 0–1 the helper's third argument is the set day).
15. **The other voices' strings** (the Sentinel, the Gazette, the Herald) for §10's set, and the `local-election` line. **Settled: written** (design §8.4, all four voices with ids and tokens; `hl.nominations` is kept and reworded in each voice; the Herald's `how: 'draw'` form is `hl.ig.rule-drawn`; the Courier's set waits for slice 7).
16. **Slice 7: dissolution "strikes the rule"** contradicts *a city always has a rule*. *Default for slice 7:* the rule in force runs out its window, and the open ballot proceeds with the party chain and the locals. **Settled: as the default** (GDD §15.9 and the slice-7 addendum now say so; §17 item 5's open point is closed).

### 20.2 For the user

None blocking. Note:
- the old ballots for people cast during the switch cycle are discarded on a persisted local database (ADR 0086);
- five old Vitest files are deleted and the rest trimmed (§15.3), because they are typechecked but test the removed model.

---

## 21. Notes on the design documents (for the designer)

All four answered in design §8.5 (10 Oct 2026):

- Design App. A and §5.3 name `people.ts`. The local candidates live in `packages/content/src/data/candidates.ts`; `people.ts` holds the secretaries. **Corrected in the design.**
- Design §4.1's state table lists seven rows; the capital's `registered` is the eighth, as §6 says. **Agreed; noted in design §8.5.**
- Design §4.8 lists `hl.vote-open` as new but not `hl.polls-open` as removed. This design replaces `hl.polls-open` with it. **The mapping is now in design §4.8 and §5.3; `hl.nominations` stays (reworded in §8.4), which §10's table already assumed.**
- GDD §15.3's *Seat allocation in battlegrounds* should say a shared card's ballots split (Q1), once settled. **Done: *split equally*.**

*Baseline (phase 0) and Deviations are recorded below as the phases are built.*

---

## Deviations

### Phase 1 — Foundations (10 Oct 2026)

Built additively: nothing visible changes. The old functions, types, fields and copy all stay until phase 2 (back end) and phases 3–5 (screens). Phase 0's *Baseline* was not recorded in this file before phase 1 started; phase 1 ran `council` and `capital` green (below).

**Rules (`packages/rules`)**

- **Names that collide with the old model carry a `V2` suffix** until phase 2 removes the old ones and drops it: `CountLineV2`, `CountRowV2`, `CountResultV2` (the plan's `CountLine` / `CountRow` / `CountResult` v4); `countDistrictV2`, `DistrictCountLineV2`, `DistrictCountRowV2`, `DistrictCountV2` (§4.3's `countDistrict` v2); `ElectionCardStateV2`, `ElectionCardViewV2` (§4.4). New names without a collision are as planned: `ruleBallot.ts` (`CardBy`, `RuleCard`, `SeatRule`, `homeBallot`, `partyCardOf`, `capitalBallot`, `RuleTally`, `RuleHow`, `RuleDecision`, `decideHomeRule`, `ruleWindowFrom`), `backersOf`, `countSeats`, `freezeList`, `cardBallots`, `decideCapitalRule`, `RuleCardView`, `RuleBallotView`, `RuleResultView`, `COUNCIL.ballotCards`.
- **The calendar** keeps `council.voting`, `council.divideDay` and `ordinanceWindow` beside the new `council.ruleOpen`, `council.setDay`, `ruleWindow` and `nextRuleWindow`; `boundaryWork` returns `{ count, close, divide, set }`. `ruleBallotKey = councilKey`.
- **`marginToSeat`** takes any rows with `total` and `seated`, so it serves the v2 rows too.
- **`homeBallot`'s `fill`** is ids only (as planned); a card from it is shown as the party's pick (`by` = the party's), since a fill card has no seated person. Never reached with Appendix A.
- **`CardBy`'s party form** gains an optional `npcId` (the secretary's).
- **`capitalBallot`:** a party missing from `order` (no seat on the council) comes after the ordered ones.
- **`decideCapitalRule`'s `how`** is `draw` only when the top two cards are level on seats, votes and opinion; otherwise `seats`.
- **`ruleDecided` gains an optional `drawn`** (the Herald's `hl.ig.rule-drawn`, design §8.4); absent matches either. `PoliticalFacts` gains an optional `rule: RuleFacts` and `until.ruleEnds?`; the selector's cases for the four new kinds are in place and hold only once phase 5 fills `rule`. `untilFor`: `voteOpen` and `ruleOnBallot` name the vote's close; `ruleDecided` and `votedRule` the end of the rule's five days. `voteOpen` is **day 2 only** (design §8.1 Q12).
- **Placeholders** (design §8.4's tokens): `rule`, `line`, `of`, `winnerVotes`, `winnerSeats`, `seats` and `parties` join `POLITICAL_PLACEHOLDERS`. `PoliticalAct` gains `setRule`; `PoliticalResult.knockOns` gains an optional `backers` beside `endorsements`; `GameErrorReason` gains `NOT_ON_BALLOT` and `RULE_WINDOW_CLOSED`.
- **Not added in phase 1:** `StandCardView` and `CouncilRowView` (§4.4 names them without a shape; phase 2 defines them with their view builders), and the changed views (`PoliticsSummaryView`, `ElectionView`, `CountView`, …), which change with their builders in phase 2.

**Content (`packages/content`)**

- **`NpcCandidate.rule`** (optional in the schema) and the 27 Appendix A rules in `data/candidates.ts`. **`ballotFillProblems`** (exported; run by the loader):
  - a home local must name a rule on the menu, and a non-home local must not;
  - each home city's ballot with no player (the branch's card and the seven top locals by profile) gives three distinct cards **without the fill**, in Unrest too;
  - and it equals Appendix A's line (`APPENDIX_A_BALLOTS`).

  Checked by script: the content loads with no problem, and a fixture with `npc.c.weiss`'s rule removed is refused by name (*candidate "npc.c.weiss" (a home local of coalport) has no rule*, plus the Coalport ballot line).
- **The modals:** `politics.results.setRule` (*Changed*) is new. The new texts of the vote, the stand and the backing (design §4.8) are in a **`politics.resultsV2`** block beside the old `results.ballot/declare/endorse`; phase 2 moves them into `results` and drops the block. The loader's length, sentence and placeholder checks cover both blocks. `setRule`'s body uses `{line}` (filled capitalised) and `{weekday}` = the vote's last day.
- **Headlines** (`data/ruleHeadlines.ts`, new): the design's §8.4 strings in all four voices. The designer settled §20.1 Q15 during the phase, so there are **no stand-ins** and no start-up list. `hl.ig.rule-drawn` replaces the Herald's fallback. The Herald's on-ballot headline is written `{parties}'s Card`, because the design's `{parties}' Card` would print *the Vanguard' Card*: **for the designer to confirm.** `hl.filed` and `hl.nominations` are reworded in place in phase 5 (not additive).
- **Copy:** new blocks and keys beside the old ones. Where a design name collides with a live key, the new one is renamed until its phase swaps it:
  - `election.v2.*`: the seven states, the kickers, `firstTime`, and the result lines by `how` from design §8.2 (`result`, `resultTie`, `resultFallback`, `resultFallbackUnrest`, `resultSeats`, `resultSharedSeats`, `resultDraw`, `resultCarried`);
  - `help.ruleV2` (with the city's two voting weekdays as parameters, since *Wednesday to Saturday* differs by city), `help.ruleMore`, `help.pcV2`;
  - `ruleResult.*` (the design's `result.*`; `copy.result` is the action result's block);
  - `council.whatNow.rule.*` (the design's `council.whatNow.lines`);
  - `capitalElection.ballotLineV2` and `.resultLineV2`; `paper.localElectionV2` (design §8.3).

  The rest use the design's names:
  - `election.seeTheBallot`, `.toYourDesk`, `.ruleNow`;
  - `hall.nextWeeksRule`, `.ballotSetAt`, `.change`, `.yourRule`, `.nextInLine`, `.standForTheCouncil`, `.ruleOf`, `.pickerTitle`, and `.onTheBallot` (§8.1 Q10's *already on the ballot · yours would be skipped*);
  - `council.deskNext.townVotes`, `.theResult`, `.pay`;
  - `ballot.*`; `rule.whose.*`, `rule.effect`, `rule.how.*` (design §8.2; the hall's *how it won* words live here, not in `hall.*`); `seats.*`; `stand.*`; `plate.ruleChip`; `me.rule`;
  - `capitalElection.question`, `.votesAndOpinion`, `.partyVotes`.

  **Words the design does not give, written plainly for the designer to confirm:**
  - `errors.notOnBallot`: *That rule isn't on this ballot.*;
  - `errors.ruleWindowClosed`: *Councillors set their rule on the term's first two days · next {when}*;
  - the head of `council.whatNow.rule.capitalChosen`: *Your rule is next in line*, as the player's rule is not the card;
  - `capitalElection.partyVotes`'s *· shared* marker (Q1).

**Database (`packages/db`)**

- **No second Mongoose model on `ordinances` yet.** Two models on one collection would each drop the other's indexes at `syncIndexes`. Instead:
  - the rule ballot's fields (`setDay`, `countDay`, `cards`, `unrest`, `changes`, `result`, `legacy`) are on the order paper's schema **with no defaults**, so old papers stay as they were;
  - its `status` enum gains `set` and `counted`;
  - the shape is exported as `RuleBallotDoc` / `RuleBallotResult`;
  - the index `{ cityId: 1, countDay: -1 }` is added beside `{ cityId: 1, divideDay: -1 }`.

  Phase 2 renames the model `RuleBallot` and removes `OrderPaper` and the old index.
- **`votes`:** `ordinanceId?` and the index `{ electionId: 1, ordinanceId: 1 }`. `candidateKey` stays **required** until phase 2, which writes the first rule vote and adds the *exactly one of the two* validator.
- **`candidacies`:** `rule?` is added; `platformId` stays required until phase 2. `BallotLine` gains `rule?`.
- **`officeTerms`:** `rule?` and `ruleSetAt?`, with no defaults. **`cities`:** `world.voting?: 2`. **`requestLogs`:** the kind `council.setRule`.
- **Migration 009** (`migrations/009-voting-rework.ts`: `refundDueDeposits`, `migrateVotingRework`) is written and exported from `@irongate/db`, **not wired** into `ensureIndexes`. It credits `COUNCIL.cost.declare` (10), capped at `PC.cap`, after the candidacy's `due → returned` flip, one transaction per candidacy.

**§20.1** was settled by the designer during the phase (design §8). Phase 1 follows the settled answers:

- Q1: `cardBallots` splits equally;
- Q2: Unrest gives three councillor cards;
- Q5: `partyCardOf` ranks by total, then seat;
- Q7 and Q8: two-line results and `rule.how.*`;
- Q10: the dimmed row's words; duplicates are skipped and the next in line fills;
- Q11: `fill`;
- Q12: `voteOpen` on day 2 only;
- Q13: the loader refuses a rule on a non-home local;
- Q14: `paper.localElectionV2`;
- Q15: the four voices.

**Checks**

- `pnpm art:check && pnpm turbo run lint typecheck build` (cached): green, 14 of 14 tasks. The old Vitest files typecheck unchanged (nothing in phase 1 needed them edited).
- `council` and `capital` with `--no-deps` (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`): 3 of 3 passed, unchanged. Their server starts in memory mode with the new content, so the loader ran with no `ballotFillProblems`. The user's own `pnpm dev:mem` was left alone (not restarted).
- A scratch script over the new rules functions (not a Vitest test) covered:
  - the three Appendix A ballots;
  - players filling cards 2–3, with a duplicate skipped;
  - Unrest, the fill and the fallback;
  - most votes, the 2–2 tie going to card 2, and a tie with card 1;
  - the capital's merged card and split ballots, the largest bloc with shared seats, and the draw;
  - `countSeats`' backers tie-break, `freezeList` and the calendar fields.

### Phase 2 — The back end switch (12 Oct 2026)

The server now runs the rule vote end to end; the old model is gone from `packages/rules`, `packages/db`, `packages/content` (acts and platforms) and `apps/server`. The client compiles against the new views with plain stand-ins (phases 3–4 build the real screens).

**Rules (`packages/rules`)**

- The `V2` suffixes are dropped: `CountLine` / `CountRow` / `CountResult` (backers, no votes), `countDistrict` (`ballotsByFaction`), `DistrictCountLine` / `Row`, `ElectionCardState`, `ElectionCardView`. **Removed:** `isSmallBranch`, `effectiveEndorsements`, `closeNominations`, `countElection`, `divide`, `Division`, `DivisionItem`, `AGAINST_ALL`, `deskNext`, `DeskNext`, `divideCapital`, `CapitalDivision*`, the old `countDistrict`; `COUNCIL.passVotes`, `maxProposals`, `endorsementsNeeded`, `smallBranchBelow`, `cost.propose`; `CAPITAL_COUNCIL.passVotes`, `maxProposals`; the calendar's `council.voting`, `council.divideDay`, `ordinanceWindow`; `boundaryWork` returns `{ count, set }`.
- **The views** (§4.4, §8.3) are defined here, since §4.4 named some without a shape:
  - `StandCardView` (requirements rank and known, `defaultRule`, the eleven-row `menu`, cost, `canStand`, reason) and `CouncilRowView` (place, seated, ward vote, backers, total, `short`, the row's rule);
  - `OrdinanceMenuItemView` gains `plainLine` and `onBallot`;
  - `PoliticsSummaryView.state` **is the card's state** (the "smaller state"); `endorsements`, `branchLine`, `count`, `councillor` and `divideAt` go; `inForce` gains `how`, `votes`, `voters`;
  - `ElectionCardView.result` gains `by` (the **name** of whoever put the winning card up; the client words it) and `whose` (`party` | `councillor`, for the Unrest fallback's line, design §8.2);
  - `CapitalCountView` v2: `rule`, `weekday`, and per district `parties` (`votes`, `shared`, `seats`) and `council` rows; no `w`, score, opinion or ballot columns;
  - `TownHallView` v2: `inForce` (with `how`, `countDay`, `votes`, `voters`, `seats`, `factionIds`, `by`), `next: RuleBallotView`, `seats[].rule`, `stand`, `councillor` (rule, `onBallot`, `changeUntil`, the picker's `menu` on days 0–1); `passVotes`, `noRule`, `paper`, `divideAt`, `nextVoteAt`, `election` and `desk` go;
  - `WhatNowView` v2 as §8.3 (`rule`, `capital`, `changeUntil`, `pollsOpenAt`, `countAt`);
  - `EndorsementsView` loses `needed` and `branchCounts`; `CandidateView` has `rule`, `backers`, `backedByYou`, `canBack` (no `platform`); `ElectionView` has `stand`, `candidacy { rule, backers, branchLine }`, `backed`, `seats` (no `declare`, `ballot`, `endorsed`);
  - `PoliticalResult.view` gains `ballot` and `hall` and loses `council`; `knockOns.backers` replaces `endorsements`; `candidacyWithdrawn` goes; `ActionResult.effects.branch: { backers }` replaces `branchEndorsement`; `DeskView.deposits` goes.
- **Headline conditions are not removed yet.** `votedFor`, `nominationsClosed`, `divided`, `movedYesterday` stay as kinds because the old templates in `politicalHeadlines.ts` / `heraldHeadlines.ts` / `localHeadlines.ts` still name them; the server now always gives them null/false, so they never fire. Phase 5 retires them with the templates and fills `rule` (`ruleDecided`, `votedRule`, `ruleOnBallot`, `voteOpen`). `ordinanceFromToday` keeps firing on a count morning (a rule now starts at the count).
- The testing fixtures (`src/testing/*.ts`) are rewritten to the v2 shapes; `councilViewFixture` and `capitalCouncilFixture` go; `ruleBallotFixture` and `ruleCardsFixture` are new.

**DB (`packages/db`)**

- **`RuleBallot`** is the model of `ordinances` (`OrderPaper` is removed). The schema has only the ballot's fields; an old paper's `items`, `votes` and `division` live under `legacy` (types `LegacyPaperItem`, `CouncilVote`, `Division`). Migrations 004–006 read and write old papers through `RuleBallot.collection` (the driver), so they still find nothing to do on a converted database. The `{ cityId, divideDay }` index goes (`syncIndexes`).
- `votes.candidateKey` is optional, with a `pre('validate')` hook: exactly one of `candidateKey` and `ordinanceId`.
- `candidacies`: `platformId` is removed from the schema and the type (old rows keep it in the database, unread); `effective` and `smallBranch` are optional and never written; the partial index `{ characterId, deposit }` is dropped. `elections.smallBranch` is optional and never written; `BallotLine.platform` is optional (old lists only).
- `requestLogs`: the kinds `council.withdraw`, `council.propose`, `council.councilVote` are removed.
- **Migration 009 is wired** into `ensureIndexes` after 008; the start-up log prints *Migration 009: refunds m matched / n modified*. **A bug found by the conversion check:** Mongoose 9 refuses an update pipeline without `updatePipeline: true`, so the credit would have thrown on the first due deposit; fixed.
- `scripts/playtestReport.ts` reads `RuleBallot` (the old papers' fields from `legacy`, a ballot's winner from `result`) so it still runs; the council section v2 is phase 6's (T15).

**Content (`packages/content`)**

- `politics.resultsV2` is merged into `results` (the vote, the stand and the backing now speak of the rule); `withdraw`, `propose` and `councilVote` are removed from the schema and the data.
- `Faction.platforms`, the `Platform` schema, `content.platform()` and the loader's platform check are removed. (`cities/irongate.ts` and `missions/irongate.ts` say *platforms* of the tram, not the council's: untouched.)
- **`copy.ts` is untouched** in this phase (the removals of design §5.3 are phase 5's T13). The client uses the designer's settled strings of 7376f5a (`copy.errors.ruleWindowClosed`, `copy.errors.notOnBallot`); `election.v2.partyCardSet` and `hall.partyCardSet` wait for phase 4.

**Server (`apps/server`)**

- **`services/ruleBallot.ts`** (§7.1) as planned, plus `secretaryCard`, `termRule` (a term's rule, with the fallbacks of §5.1), `homeCards` / `capitalCards`, `capitalCardOrder`, `cardsFor`, `openBallotDoc` and `ballotCards` (the view's provisional or set cards). `tally` is gone from `cityDayCore` (`tallyRules` replaces it); `countLines` reads backers from the candidacy at the count.
- **The capital's card order uses a replayable draw**, `drawOrderOf(createRng("{cityId}:{k}:order"))`: the old code seeded it with `newSeed`, which is random outside tests, so the set and the views could disagree on ties.
- **Bootstraps:** card 1 (home) or the largest bloc's card (capital) is in force for `[start, start + 5)` with `paperId: null` (no ballot decided it). Before the first count the Election card's `result` is synthesised as `how: 'carried'` from the rule in force (design §8.2's switch-cycle line), so a fresh city's card has a result line on days 0–1.
- **A count with ballot k − 1 missing or still `open`** (data loss, or a set that never ran) computes the cards at the count and writes the ballot `counted`, as the old code did for a missing paper.
- **`votingConversion.ts`** as §6.1; old papers are moved under `legacy` by an update pipeline on the driver (upserting the ballot in its target state). With `cityDayHooks.noBranchMotion` a city with no rule stays without one.
- **The acts** as §8.1. `council.vote` takes the cards from the city's ballot (the capital's for a district's vote); `ALREADY_VOTED` carries `{ ordinanceId, name }` (an old person ballot carries its candidate key as `ordinanceId`). `council.setRule`'s modal fills `{line}` from the rule's plain line (capitalised, the full stop dropped), `{pollsWeekday}` the vote's first day and `{weekday}` its last; its view is the hall built **in the act's transaction** (`townHallView(…, { session, city })`), so it shows the new rule.
- **`council.ballot`** refuses the vote with `NOT_RESIDENT` for a city that is not the caller's residence and `WRONG_FACTION` for a member of another party living in a home city (they could not vote before either: the summary is null for them).
- **The dev panel (T7, §12):** the phases `result-day` | `standing` | `vote`, their labels and lines; `home.ballot { status, cards }` and `ordinance.how` in the status. The *Seat me* and *Votes for card 2 × 3* buttons are phase 5's.
- **Test hooks:** `POST /api/test/rule-votes` and `POST /api/test/seat` (`apps/server/src/dev/voting.ts`).
- **`apps/server/scripts/checkVotingConversion.ts`** and `pnpm --filter @irongate/server check:voting-conversion`: home cities and the capital at cycle days 0–4 (Duskwall and the capital with no rule on S), plus Coalport day 2 with no rule; the conversion twice and a direct call refused; §6.3's table, every settled day's rule unchanged, the councillor's proposal as their rule and a card, the next count (`fallback` at home, the largest bloc in the capital), ballot k + 1 open; migration 009 twice over two due deposits.

**Client (`apps/client`, `packages/ui`) — the minimum to compile**

Plain stand-ins over the v2 views, each marked `TODO(phase 3)` or `TODO(phase 4)`:

- `Politics.tsx`: `electionLines` covers the eight states with `copy.election.v2.*`; the slate reads `rule`, `backers`, `canBack`; `CountTable`, `SeatGrid` / `SeatList`, `OrderPaper` and `OrdinanceMenu` are removed; `RuleResultList`, `CouncilRowList` and `whoseLine` stand in for `RuleCards` result mode and `CouncilRows`.
- `TownHall.tsx`: the rule in force with its *how it won* line, next week's rule as radio rows (or the provisional cards), the councillor's rule with a picker sheet, seats with rules; `YourDesk`, `deskNextLine` and `UpForAVoteReadOnly` removed.
- `Capital.tsx`: the district result as party rows and council rows.
- `council.tsx`: the stand flow (`declare` with the default rule), the ballot page on `council.ballot`, the count on `RuleResultList` / `CouncilRowList`.
- `usePoliticalAct` handles the `ballot` and `hall` views; `errors.ts` drops the removed reasons and words `NOT_ON_BALLOT` and `RULE_WINDOW_CLOSED`; the dev panel reads the new phase names.

**The old Vitest files (§15.3; the user's decision of 12 Oct: delete and trim, write none; not run)**

- **Deleted (6):**
  - `packages/rules/test/council.test.ts`;
  - `packages/rules/test/review4.hall.test.ts`;
  - `apps/server/test/council.test.ts`;
  - `apps/server/test/cycle.test.ts`;
  - `packages/ui/test/politics.test.tsx`;
  - `packages/ui/test/review4.fixround.test.tsx` (not in §15.3's list: both cases test *Passed by four of seven / six of ten*).
- **Trimmed (the removed model's cases deleted; the rest made to compile against the new signatures, no new assertion):**
  - `packages/rules/test/calendar.test.ts`: the *close/divide once per cycle* case; the `council.voting`, `divideDay` and `ordinanceWindow` assertions in two cases.
  - `packages/rules/test/qa.slice3.rules.test.ts`: the GDD-numbers case (old §15.3 wording: passes, proposals, the small branch); the describes *the count as a property* (countElection, closeNominations, the small branch) and *the division as a property*; the calendar case's voting / ordinance-window / close-divide lines.
  - `packages/rules/test/qa.slice4.rules.test.ts`: *six of ten pass*, *2,000 random district ballots* (votes for names), the describe *the capital division*.
  - `packages/rules/test/slice4.capital.test.ts`: *NPC fill … the slice-3 order* (a member's vote in the total) and the four division cases; `endorsements` → `backers` and `votes` → `ballotsByFaction` in three count cases.
  - `packages/db/test/{qa.slice4.db,review1.db,review2.db,slice4.db}.test.ts`: `OrderPaper.collection` → `RuleBallot.collection` (the raw old papers of migrations 004–006).
  - `packages/db/test/slice3.db.test.ts`: the same, a `RuleBallot` in the transaction case, `platformId` → `rule`.
  - `packages/content/test/slice3.content.test.ts`: *the platforms and the branch motions*; the `ordinanceWindow` assertion; the duplicate-platform `fails` line.
  - `packages/content/test/qa.slice3.test.ts`: the vocabulary scan reads `branchMotion`, not `platforms`.
  - `apps/server/test/helpers.ts`: `RuleBallot.deleteMany` in `resetCity`.
  - `apps/server/test/{chapter2,qa.slice3.worker}.test.ts` and `cityDay.test.ts`'s turnout case: the vote is for a rule (`ordinanceId`); `cityDay.test.ts`'s bootstrap case loses the order-paper and old-window assertions, and its snapshot reads `RuleBallot`.
  - `apps/server/test/devClock.test.ts`: the next phase is `vote` (was `polls`).
  - `apps/server/test/qa.review4.server.test.ts`: `desk` → `councillor`.
  - `apps/server/test/qa.slice3.server.test.ts`: 15 cases (the lazy catch-up's close and division; the two small-branch cases; the tie-break with votes; withdraw; the struck refund; propose ×2; declare vs the close; endorse vs the close; the council vote vs the division; the secret person ballot; the bootstrap's division; Unrest at the division; *on the ballot / comes off*; BUG m2's motion) and the two describes they emptied; declares name a rule.
  - `apps/server/test/qa.slice4.capital.test.ts`: *who votes where* (names on a district's list); declares name the branch's rule; the turnout cases vote for the Alliance's card.
  - `apps/server/test/{qa.slice4.residence,slice4.register}.test.ts`: declares name the branch's rule.
  - `apps/server/test/qa.slice4.travel.test.ts`: the vote on the train reads `council.ballot` and votes for its first card.
  - `apps/server/test/review4.hall.test.ts`: the visitor's paper, the councillor's desk, *six votes pass*, the front page's council vote.
  - `apps/server/test/slice4.capital.test.ts`: the two district counts with person ballots, the capital council 7–3, the secrecy case (all replaced by `voting.spec.ts`); the windows case reads `council.ballot` and `knockOns.backers`.
  - `apps/server/test/slice4.cityDay.test.ts`: the bootstrap's order paper and *no ordinance* assertions.
  - `apps/server/test/slice4.integration.test.ts`: the capital week and the vote-at-the-boundary race.
  - `packages/ui/test/review4.maps.test.tsx`: the describe *the Town Hall* (the paper, `noRule`, the desk, the Next line) and two *What now* cases (the old lines, six of ten).
  - `packages/ui/test/slice4.test.tsx`: the parties' table, the ten-seat grid, the order paper.
  - `packages/ui/test/vocabulary.test.tsx`: the `CountTable`, `SeatGrid`, `OrderPaper` and council-view entries; the election-states loop keeps `belowRank`, `standing`, `voted`, `result` on v2 fields; `endorsements` → `backers`.
- **Compile but would fail if run** (old wording, not trimmed because their subject is not the removed model): `packages/ui/test/slice4.test.tsx` (*a move … a candidacy withdrawn*, the two capital Election-card cases), `vocabulary.test.tsx` (*Slate, the vote*), `apps/server/test/devClock.test.ts` (its `phaseLabel` case asserts the old labels).

**Checks**

- `pnpm art:check && pnpm turbo run lint typecheck build` (cached): green, 14 of 14 tasks.
- `pnpm --filter @irongate/server check:voting-conversion`: **601 of 601** checks passed (after the migration 009 fix).
- `voting.spec.ts` (new project `voting`, after `qa-review5`, desktop, serial), **the API block: 8 of 8 passed** with `--no-deps` (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`): stand without backers (and `UNKNOWN_ORDINANCE`, `ALREADY_FILED`); the councillor's rule (`NOT_COUNCILLOR`, the key replayed byte for byte, `myRule.onBallot`); the set and the vote (`RULE_WINDOW_CLOSED`, three distinct cards, `NOT_ON_BALLOT`, one key twice, `ALREADY_VOTED { ordinanceId }`, Rank 1 `RANK_TOO_LOW`); secrecy on the wire (`council.ballot`, `council.hall`, `paper.today`, `city.get` carry no `tallies` and no `ballots` during the vote, and nobody else's choice); backing on day 3 counted +3 with a 2–2 tie to card 2; no votes → card 1 (`fallback`, five days); 3–1 for card 3 (`votes`); Unrest → no party card at the set.
- `rival` and `qa-review4` (all 30, #11 *the halls as a visitor* included): green. A first run found a client crash on a fresh city's card (`result` null on days 0–1, before any count); fixed by the *carried over* result above and a guard in `electionLines`.
- **Expected red until their phase rewrites them (§15.2), recorded:** `council` (the stand card's old lines), `qa-council` (the person ballot's rows; three serial cases not run), `capital` (*Which rule for Irongate next week?* where the old line was), `qa-capital` ×2 (the capital ballot's name rows), `dev-panel` (the phase label is now *The vote (day 1 of 3)*), `review3`'s *the election screens* (`how-decided` now reads *Seats go to the seven best known in Coalport…*). The rest of those projects passed.
- The full e2e is phase 6's.

**Questions for the designer (none blocking)**

1. Strings the stand-ins print that copy does not hold yet: *{name} · {n} backers* (the backing modal's knock-on), *the branch backs you · {n} backers* (the action modal's effect), *votes {n}* (a district's party row) and the dev panel's *The vote opens*. Phase 3–5 want copy keys for them.
2. The capital's `councillor` card state cannot print `election.v2.partyCardSet(name, rule)`: the card carries the councillor's own rule, not the name of whoever set the party's card. Phase 4 can add it to `ElectionCardView.councillor` (the server has it: `WhatNowView.capital.by`).


### Phase 3 — The home screens (12 Oct 2026)

The home cities' screens are built on the v2 views: the Election card, the ballot, the result, who's standing with the stand card, the Town Hall's five blocks and the rule picker. Every `TODO(phase 3)` is gone; the capital's `TODO(phase 4)` stand-ins stay. No server or view change in this phase.

**Components (`packages/ui`)**

- **`RuleCard.tsx`** (new) holds `RuleCard` / `RuleCards` (modes `vote`, `show` and `result`), `OrdinanceRow` (moved from `Politics.tsx`), `RulePicker`, `CouncilRows`, `StandCard`, `HowTheVoteWorks` and the helpers `whoseLine`, `howWords` (design §8.2's *how it won*, shared by the hall and the result) and `ruleWinnerLines` (the winner card's lines under *PASSED*). `PersonMark` moved to its own module so `Politics`, `RuleCard`, `TownHall` and `Capital` share it without an import cycle.
- **Removed:** `HowElectionsWork`, `RuleResultList`, `CouncilRowList`, and `Slate` / `CandidateRow`'s ballot mode. `DistrictResultTable` stays for phase 4 (it now uses `CouncilRows` and `copy.capitalElection.partyVotes`).
- **`RuleCards`' layout** is `stack` or `auto` (`auto` adds one row of three from 960 px, each card at least 160 px tall), not the plan's `stack` | `row` prop: the ballot passes `auto`, everything else stacks.
- **`RuleCard`'s spacing** is tighter than §9.1 implies (`py-1.5`, 1 px between lines, leading-tight on the plain and whose lines; still at least 88 px tall). With the design's padding the third card at 390 × 844 ended 15 px under the sticky bar, because the plate title wraps to two lines and the sticky bar is 80 px (the design counted 80 and 64).
- **The council row's popover** is a small boxed note opened under the row (`role="note"`, `aria-expanded` on the row), not a floating popover: no new dependency, and nothing is covered on a 360 px phone.
- **The stand card's cross line** when the player is not yet Known: `copy.stand.needsKnown` (*Needs to be Known in Coalport · 12 of 30 wins*), new; design §4.5 words the rank's cross only. **For the designer to confirm.**
- **The rule picker** dims a row on the ballot unless it is the picker owner's own rule (the councillor's own card is on the ballot too; it should not read *yours would be skipped*).
- **The Town Hall:** block 2's *Change ›* sits on the councillor's card when their rule is on the ballot, under the *next in line* line otherwise. Block 3 adds *· rule: …* to player rows only (design §4.4); locals' rules are on the cards and on the result's rows. Block 4 shows the stand card only when both requirements are met (design §4.4: *Rank 3 and Known*); who's standing shows it with the cross for the rest. The *Council rule* note on block 1's kicker and the card's kicker is `help.ruleV2` (three lines); `help.rule` / `help.election` are retired from these screens (their keys go with phase 5's T13).

**Routes (`apps/client`)**

- **`useRuleVote(act)`** takes the page's political act (one modal per page) instead of creating its own: the city screen already has one act for the residence card and the trains.
- **`/council/ballot`:** the plate, the three cards (`auto` layout in a 720 px sheet from 960 px), *Who's standing ›*, *How the vote works*, *Last result · {weekday}*, and the sticky *Vote for …* / *Choose a rule* with the caption. **Under 700 px tall the plate's Courier line folds away** (as the header does): at 375 × 667 the third card's top edge was 7 px under the sticky bar with it; the sticky caption keeps *secret and final* and the result's time. A reader who cannot vote (below Rank 2) sees the cards read-only and no bar. Closed (days 0–1): the provisional cards, *the ballot is set at …*, *See the result*, *See who's standing*.
- **`/council/count`:** the cards in result mode (count, share bar, *PASSED*, *how it won*, *runs until …*, *your vote*), `CouncilRows` with *the line*, the sentence, *How the vote works* and the hall's name as the link to `/council`. The capital's count uses the same cards over its own tables (phase 4 replaces those).
- **`/council/slate`:** the stand card (ticks or the cross, *Your rule* with *Change ›*, *Stand · 10 Political Capital*, the price line; after standing *You're standing · your rule: … · n backers* and the branch's line), the seats sentence, the players then the locals with their rules. On days 2–4 the plate line is the old `tooLateToStand` and a *Vote now* link follows the list (the design gives the list's days 2–4 no line of its own).
- **The Election card:** the seven states of design §4.1 (outline buttons where the design's are in italics: *See the ballot*, *See who's standing*, *To your desk* when next in line), the Unrest fallback line (`resultFallbackUnrest`, by the card's `by`), line 3 on the paper's row too, and `ballotInline` on every `card` layout of the city screen (the side column and the plate's card from 640 px). The HQ sheet and the paper's row keep the link.
- **The front page:** the photograph, ELECTED, the headline and the deck, then the three result cards (no council rows); the paper renders *What now* and *To your desk at the Town Hall* after it, as before.
- **Strings bound** (design §8.7): `copy.stand.backersKnock` and `copy.branchBacksYou` in `ResultModal`, `copy.capitalElection.partyVotes(votes, shared)` in `Capital`, `copy.dev.phase` / `copy.dev.next` in `DevPanel`, and `clock.ts`'s `phaseLabel` now returns `copy.dev.phase` (the server's line and the panel's row are one string).

**E2E (rewritten, not weakened)**

- `council.spec.ts`: stand with a rule (two ticks, *Change ›* to Reading Room Grant, no backer line) → the third order's modal *The branch backs you · 1 backer* → the vote at 390 × 844 (the three Appendix A cards and the CTA above the fold, one tap) → the count, lazily → ELECTED, three result cards with PASSED and *your vote*, *What now* with two lines → the desk: her rule on the ballot, *Change ›* (the branch's card dimmed with its note) → Street Fund (*Changed*) → the next vote in the hall's block → the plate line, the ticket tag *Street Fund · +25 % Iron* and the result modal's tag. **Not asserted:** the headline *Street Fund Wins the Vote in Coalport* (`hl.rule-won` fires once phase 5 fills the rule facts).
- `qa.slice3.spec.ts`: the double tap on a card and on the CTA (one call, one modal, no side scroll at 360); the keyboard (Tab into the cards, ArrowDown, Space, Tab, Enter); the 375 × 667 header band and third card; the result at 360 (cards, seven seated rows, the row's two numbers). The old `test.fail` m4 case (five name rows above the CTA) is replaced by the 375 × 667 case.
- `review3.spec.ts`'s *the election screens*: the hall header, the seats sentence, the lists with rules, *How the vote works* with three lines.
- `devpanel.spec.ts`: the new phase labels and lines; the paper row's `data-state` `result` / `vote`.
- `voting.spec.ts` gains the screens of §19's phase 3: **the desktop card is the ballot** (1440 × 900, a card and *Vote for …*, one modal) and **next in line** (three councillors at the three top local seats, the third's card and hall read *next in line*; the first's picker dims the two other cards' rules, keeps them enabled, and leaves its own undimmed). The serial run wears Coalport's morale into Unrest by then (counts with no voters), so the case lifts it first with a rival's `/api/test/unrest` (`share: 80`, nothing pushed) and asserts card 1 is the party's.

**The old Vitest files** (not run; trimmed to compile): `packages/ui/test/review3.test.tsx` loses *How elections work: one link, five short lines* (the component is removed); `packages/ui/test/vocabulary.test.tsx` loses *Slate, the vote* (the ballot mode is removed).

**Checks**

- `pnpm art:check && pnpm turbo run lint typecheck build` (cached): green, 14 of 14 tasks.
- E2E with `--no-deps` (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`): `council` 1/1, `qa-council` 4/4, `dev-panel` 2/2, `rival` 1/1, `voting` 10/10, `review3`'s *the election screens* (project `phone`) 1/1, and `qa-review4` #11 *the halls as a visitor* 1/1.
- Still expected red until phase 4: `capital` and `qa-capital` (the capital's screens).

**Questions for the designer (none blocking)**

1. `copy.stand.needsKnown` (*Needs to be Known in Coalport · 12 of 30 wins*): new words for the stand card's second cross.
2. The ballot's plate line folds away under 700 px tall to keep the third card above the CTA; the caption still says *Secret and final. The result is at …*. Confirm, or name the line to shorten instead.
3. Who's standing on days 2–4 still reads the old `tooLateToStand` (*Voting is open; it's too late to stand this time.*); the design gives that state no plate line.
4. The party card shows the secretary's full name (*the branch's rule · Petra Holm*), as the view carries it; design §4.2's example is *Secretary Holm* (`addressedAs`). A server/view choice for phase 5 if the designer prefers the title.

### Phase 4 — The capital's screens (12 Oct 2026)

The capital's screens are built on the v2 views: the Election card's capital lines, the ballot (a card per party, shared cards, the district's order), the count (the rule and its seats, the cards with seat bars, three party rows per district with their candidates), the hall's and *What now*'s party-card line, and the help's *More* line. Every `TODO(phase 4)` is gone. The paper, the headlines, the help notes' rewording and the party card's `addressedAs` stay for phase 5.

**Views and server (the one view change of the phase)**

- **`CapitalPartyCardView`** (new, `packages/rules` `types.ts`): `{ factionId, rule, by, leadsBloc }`, a capital councillor's party card: its rule's name, the councillor who set it (the bloc's top seat, `partyCardOf`) and whether that is the reader. It is an optional field on `RuleBallotView.myRule.capital`, `ElectionCardView.councillor.capital` and `TownHallView.councillor.capital`. It is optional so the old fixtures and Vitest files compile unchanged. `WhatNowView.capital` gains an optional `rule` (the party card's rule; *What now* printed the councillor's own rule before).
- **`capitalPartyCard`** (`politicsService.ts`) computes it from the ballot's raw cards. It is null when the party's card is the secretary's, so a secretary is never printed as *Councillor …*.
- **In the capital, `myRule.onBallot` means *leads the bloc*.** Before, it meant the councillor's rule was any card, so a councillor whose rule happened to match another party's card read *your rule is on the ballot*. The Election card's state follows: `councillor` when leading, `nextInLine` otherwise. The client words the capital's `nextInLine` as `election.v2.partyCardSet(name, rule)`, with *To your desk* as the outline button. The hall's block 2 prints `hall.partyCardSet(name, party, rule)` where the home cities print *next in line*. `council.whatNow.rule.capitalChosen` takes the party card's rule.

**Components (`packages/ui`)**

- **`whoseLine(card, names, capital)`:** in the capital a one-party card reads `rule.whose.party` (*the Vanguard's rule · …*), and a shared card reads *the Collective's and the Alliance's rule* with two crests, as at home. `RuleCard` and `RuleCards` take a `capital` prop.
- **The result with seats:** a card with `seats` shows ten seat cells, filled to its seats, in place of the share bar (`rule-card-seats`), with the seat count at the right. The winner's lines are `rule.how.seats` / `sharedSeats` / `draw` (phase 3's `howWords`).
- **`PartyRow`** (new, exported): crest · the party · `capitalElection.partyVotes(n, shared)` · its two seat cells.
- **`DistrictResultTable`** is rebuilt as three `PartyRow`s, most seats first. Each row has that party's candidates under it as `CouncilRows` (no kicker), then *Votes and opinion together · final*. The scoreboard stays. **An unseated capital row carries no *n short*:** seats go across the parties by D'Hondt on the scores, so a row's own margin to the last seat would mislead.
- **`HelpButton` gains `more`:** a *More* button (`copy.help.more`, new: *More*) under the first note, which opens one line. It is used for `help.ruleMore` wherever the capital's *Council rule* note opens: the card's kicker, the hall's block 1 and *How the vote works*.

**Routes (`apps/client`)**

- **The Election card:** *Which rule for Irongate next week?* (`capitalElection.question`) in the capital's `vote` state; the `seats` result lines were already bound (design §8.2). The desktop ballot inline passes `capital`.
- **The ballot:**
  - in the capital the plate's Courier line is `capitalElection.ballotLineV2(district)` in place of `ballot.line`. Read as design §4.2's *line under the title*; it folds under 700 px as the home line does, and the sticky caption keeps the time;
  - the closed state prints the same line under the plate;
  - the cards' order is the server's, by the district's shares.
  - **The hall header gives up 15 px on the capital's ballot:** `h-[120px]` on a phone between 701 and 900 px tall. The capital's line wraps to four Courier lines at 390 px, where the home line wraps to two, and the third card ended 6.5 px under the sticky bar at 390 × 844. A smaller font was tried first and did not save a line.
- **The count:**
  - the plate line `capitalElection.resultLineV2(rule, seats, npcSeats)`. An old count with no rule ballot keeps `resultLine` (the seats by party);
  - then the cards with seats (`capital`), the `DistrictSwitcher`, and the district's `DistrictResultTable`.
  - The order is §9.8's: the cards come before the switcher.
- **Who's standing:**
  - days 2–4 read `stand.plateLineVoting(seats, countWeekday)` (design §8.8 Q3; `tooLateToStand` is unused, and its key goes in phase 5);
  - in the capital the sentence under the plate is `capitalElection.ballotLineV2(district)`, in place of the old `howSeatsAreWon` (the score formula). **For the designer:** see question 1.
- `copy.stand.needsKnown` (*· 18 wins to go*): no e2e asserted the old *12 of 30 wins*, so nothing changed.

**E2E (rewritten, not weakened)**

- **`capital.spec.ts`:**
  - register in Eastside;
  - the card asks *Which rule for Irongate next week?*;
  - the ballot's line in full; two or three cards with exactly three crests across them (one per party) and *the X's rule · …* / *the X's and the Y's rule* whose lines;
  - the UI order equals `council.ballot`'s, and the API order is non-increasing in Eastside's best share (from `city.get`);
  - *Vote for {card 1}* → *Vote cast* with **no** `political-morale` line;
  - the count at 360 × 740: the plate line; one winner with *Passed*, *seats of 10* and filled seat cells; five chips with Eastside first; three party rows with *votes n*; at least six council rows; *Votes and opinion together · final*; no `votes-cast` and no *of the score*; *How the vote works* → *More* → *Until ten people have voted…*; the switcher keeps `?d=`; no side scroll; Monday's Issues.
  - **New:** *the capital's councillors*. Two players take two local seats of one party (`/api/test/seat`, chosen from `council.hall`). Exactly one leads the bloc. The other's `myRule.capital` names the leader, and that player's *What now*, hall block 2 and Election card read *Your party's card is set* with *Councillor {leader} chose …*.
- **`qa.slice4.spec.ts`, *the capital ballot on a short phone*:** one case replaces the old two (the first name above the CTA, and the expected-fail *five names at 375 × 667*). It checks every card and the CTA above the fold at 390 × 844, the last card's top edge above the CTA at 375 × 667 and 360 × 640, and one row at 1440 × 900.
- `voting.spec.ts` has no capital-only cases; it ran green unchanged (10/10).

**Checks**

- `pnpm art:check && pnpm turbo run lint typecheck build` (cached): green, 14 of 14 tasks.
- E2E with `--no-deps` (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`): `council`, `qa-council`, `capital`, `qa-capital`, `rival` and `voting` in one run passed **31 of 31**. `qa-review4`'s #11 *the halls as a visitor* (the capital's hall reads the party whose lines now) passed 1 of 1.
- The full e2e is phase 6's.

**Questions for the designer (none blocking)**

1. **Who's standing in the capital** has no sentence of its own in design §4.5. The page prints the ballot's line (*Each party puts up a rule. Votes and opinion in Eastside together decide: …*). The old one printed the score formula. A capital form of `seats.sentence` (within each party by reputation and backers, across parties by votes and opinion) may read better.
2. **A capital card set by a councillor** reads *the Collective's rule · Jana Varga* (`rule.whose.party` with the councillor's name). Design §4.2 gives only the secretary's form (*· Organiser Stahl*). Should it be *· Councillor Varga*? This fits with phase 5's `addressedAs` change to `whose.by`.
3. **The capital ballot's header** is 15 px shorter on phones 701–900 px tall (above), to keep three cards and the CTA in view under a four-line plate line. Alternatively, a shorter capital line would keep the header whole.
4. **`copy.help.more`** (*More*) is a new key with the obvious word; please confirm.

### Phase 5 — The paper, the chip, the help notes, the dev panel (12 Oct 2026)

T11–T14 and the carry-overs of phases 3–4 (design §8.9.2). The old model's last words are gone from `copy.ts`, the headline sets and the paper's facts.

**Server and views**

- **`RuleCardView.whose` (party form) gains `via: 'secretary' | 'councillor'`** (design §8.9 Q2). `by` is `faction.secretary.addressedAs` for a secretary (*Secretary Holm*, *Organiser Stahl*, *Mr Grey*; §8.8 Q4) and the stored name for a councillor. `secretaryCard` now stores `addressedAs`. A new **`cardByName(content, by)`** (`services/ruleBallot.ts`) prints a secretary from content, so a ballot set before this phase (its `by.name` the full name) reads the title too; it also feeds `ElectionCardView.result.by` and `TownHallView.inForce.by`. On a shared card `via` is the first party's (the line names no one there). The fixtures follow (*Secretary Holm*; the slice-4 capital fixture's Vanguard card is a councillor's).
- **The rule headlines fire.** `ruleHeadlineFacts(content, cityId, today, me)` (`politicsService.ts`) fills `PoliticalFacts.rule` and the templates' values (§10, design §8.4):
  - `ruleDecided`: ballot k − 1 counted today (`fallback`, `drawn`);
  - `votedRule`: the caller's own vote on it;
  - `ruleOnBallot`: the set morning; at home the caller's councillor card, in the capital the card whose first `by` is the caller leading the bloc (so a shared card's headline goes to its first party, design §8.4);
  - `voteOpen`: day 2.
  - `{until}` is the rule's end (`until.ruleEnds`) or the vote's close.
- The capital's visitor line (`localEdition.capitalLine`) gets the city facts too (no personal ones), so a visitor reads `hl.ig.rule-won` / `hl.ig.vote-open` where the old `hl.ig.ordinance-city` / `polls-open` printed.
- `filedYesterday` gives `{rule}` (the candidacy's) and `{weekday}` (the count morning's) by kind; the global `{weekday}` is untouched.
- `ordinanceFromToday` → **`ruleFromToday`** (the condition kind, `PoliticalFacts`, `LocalFacts`, `LOCAL_CONDITION_KINDS`, the schema). **Retired:** the condition kinds `votedFor`, `nominationsClosed`, `divided`, `movedYesterday`; the facts `voted`, `nominationsClosed`, `divided`, `movedYesterday` and `until.divide`; the placeholders `voted`, `ordinanceLine`, `endorsements`.
- **New view fields** (not named by the plan, needed by T12 and T13):
  - `CharacterView.cityRule { cityName, name, daysLeft }`, the Me line. It is set where the view is built with the residence city's document, and null when no rule is in force.
  - `CityView.ordinance.pollsOpenAt` / `countAt`. The plate's *Council rule* note needs the city's voting days for any reader, a visitor included, whose `election` is null.

**Content**

- **Headlines** (design §8.4, §8.9.2):
  - the person ballot's and the division's templates are removed in all four voices (`on-ballot`, `struck`, `voted-*`, `moved`, `council-*`, `ordinance-city`, `polls-open`);
  - `filed` and `nominations` are reworded in four voices, and `hl.seat-lost-tie`'s deck is reworded;
  - `hl.count`, `hl.v.count`, `hl.a.count` and `hl.ig.count` move to priority 1;
  - the `hl.local.*` lines are reworded, and `hl.local.rule` reads `ruleFromToday`;
  - the loader's required names (`POLITICAL_HEADLINE_NAMES`, `HERALD_HEADLINE_NAMES`) list the rule set instead.
- **`ruleHeadlines` now loads before the other political sets.** A priority tie keeps file order, and `hl.stands-firm` (city 0) would otherwise lead the count morning's city slot over `hl.rule-won` (§8.9.2 #1: *the rule's headline leads*).
- **`copy.ts`:**
  - the renames: `election.v2.*` → `election.*`, `help.ruleV2` → `help.rule`, `paper.localElectionV2` → `paper.localElection`;
  - §5.3's list and §8.9.2 #14's dead keys are removed;
  - **also removed, unreferenced after the swap** (#14: *the grep is the arbiter*): the top-level `ward`, `wardCandidates`, `theLine`, `electedMark`, `yourVote`, `passed`, `playersStanding` and `ballotSecretNote`, and `election.days`, `election.ruleLine` and `election.seeTheCandidates`. Design §5.3 said to keep `election.days`, but nothing reads it;
  - `localCandidatesLine` was still bound in the hall's seat block. It is rebound to `stand.localsLine` (*… so there is always a council*) and removed;
  - `youEndorsed` and `backedBy` stay: they are bound, and still true of backing.

**Client**

- `whoseLine` prints `rule.whose.partyCouncillor` when `via === 'councillor'`.
- Who's standing (capital) and the capital count (under the district's rows, `capital-seats-sentence`) print `seats.capitalSentence(district)`.
- **The capital ballot:**
  - the plate line is `capitalElection.voteLine(district, until)`;
  - the closed state prints `ballot.votesFrom` only (the extra capital line is gone);
  - `Page`'s `capital` prop and the `h-[120px]` branch are removed, so the header is 150 px everywhere.
- The city plate's rule note (`plateNotes`) is `help.rule` via `councilRuleNote`. A district and the capital's overview get the capital's second line. The plate's note has no *More*.
- The rival edition's line prints the weekday on days 0–1 (`formatWeekday`, design §8.3) and the vote's close on days 2–4.
- **`RuleChip`** (`packages/ui`, in `RuleCard.tsx`) is a 44 px button with the paper-2 pill inside. Negative margins keep the plate's height; a smaller box failed review 4's target audit.
  - It sits right of the home plate's *Home city · …* row (its kicker line) and of the district plate's kicker, and shows only on an upright phone under 700 px tall.
  - It also sits in the place sheet's header (`LocationSheet.kickerAside`, new) on the phone's `sheet` layout.
  - A tap opens the Town Hall.
- **The Me tab:** `me.rule` under the party card, a link to `/council`.
- **The dev panel (T14):**
  - **Seat me** (`seat`, the server's `seatMe`) refuses with *Already on the council here* when the player is already seated;
  - **Votes for card 2 × 3** (`townVotes`, `addRuleVotes` for the set ballot's stored card 2) refuses with *Only while the vote is on (days 2–4)* outside the vote;
  - the README has the two buttons and the route list, and its walk-through and Town Hall steps are rewritten to the rule vote.

**E2E (rewritten, not weakened)**

- `council.spec.ts`: the set morning prints *Councillor Mara Lenk Puts Street Fund to the Town* and *Coalport Votes on Its Rule*. The count morning prints *Street Fund Wins the Vote in Coalport* (deck *1 of 1 votes. In force until …*) and *Your Vote Counted: Street Fund Wins*, ahead of *Coalport Result* when both print.
- `capital.spec.ts`:
  - the ballot's `voteLine`;
  - the whose lines by title (*Organiser Stahl*, *Secretary Holm*, *Mr Grey*, or *Councillor …*);
  - `capital-seats-sentence` at the count;
  - the councillors' case checks `whose { via: 'councillor', by: leader }` and *the {party}'s rule · Councillor {leader}* on the ballot.
- `qa.slice4.spec.ts`: the line and the header's 150 px at 390 × 844 (the third card is below).
- `devpanel.spec.ts`: Seat me and its refusal. Votes for card 2 × 3 is refused on day 0; on day 2 it adds three votes for card 2, which wins the count.
- `voting.spec.ts`: a new case, *the rule always visible*:
  - the Gazette's rule headline and the personal one;
  - the folded plate's chip at 375 × 667 (the rule line hidden; a tap opens the hall);
  - the sheet's chip;
  - no chip at 412 × 915;
  - the Me line.
- `rival.spec.ts`, `qa.review4.spec.ts`: the rival edition's new line.

**The capital ballot at 390 × 844 (reported, not cut):** `voteLine` takes **four** Courier lines at 390 px, not three as design §8.9 Q3 counted. The deadline prints in the player's clock (*until Tuesday 02:00*). With the header back at 150 px the third card ends about 21 px under the sticky bar; its top edge is above it. As §8.9 Q3 says, the header was not cut again. Until this is settled, `qa.slice4`'s 390 × 844 check is the last card's top edge; the old *every card above* holds at 1440 × 900. See designer question 1.

**The old Vitest files** (not run; trimmed to compile):

- `packages/rules/test/political-headlines.test.ts`: the removed templates and facts;
- `review4.editions.test.ts`, `slice4.paper.test.ts`, `slice5.travel.test.ts`: the facts' fields;
- `packages/content/test/slice4.headlines.test.ts`: the removed `capitalElection` keys and the `polls-open` and `ordinance-city` rows;
- `apps/server/test/cityDay.test.ts`: `copy.turnout`.

**Grep**

- The plan's grep, `divide\(|divideCapital|closeNominations|OrderPaper|AGAINST_ALL|councilVote|platformId`, finds nothing in `packages/rules/src`, `apps/server/src`, `packages/db/src/models`, `apps/client/src`, `packages/ui/src` or `packages/content/src`.
- Nothing finds `votedFor'`, `nominationsClosed`, `movedYesterday`, `ordinanceFromToday`, `ballotLineV2`, `pcV2`, `localElectionV2`, `ruleV2` or `election.v2` either. `tooLateToStand` appears once, in a comment that names it as replaced.
- `'divided'` remains only as an old order paper's stored status (`elections.ts`, the playtest report, the conversion check), which the legacy data still carries.

**Checks**

- `pnpm art:check && pnpm turbo run lint typecheck build` (cached): green, 14 of 14 tasks.
- E2E with `--no-deps` (`E2E_WEB_PORT=4273 E2E_API_PORT=3301`):
  - `council`, `qa-council`, `dev-panel`, `capital`, `qa-capital` and `rival`: 23 of 23;
  - `voting` and `review4`: 12 of 12;
  - `qa-review4`: 30 of 30. Four failed on the first chip (a 14 px box) and passed after the 44 px fix;
  - `phone`'s `day.spec.ts` and `review3.spec.ts`: 8 of 8.
- The full e2e is phase 6's.

**Questions for the designer (none blocking)**

1. **The capital ballot's line at 390 × 844** is four Courier lines (above), so the third card ends about 21 px under the sticky bar with the 150 px header. Options:
   - a shorter line (for example without *city-wide*);
   - accepting that only the third card's top edge shows;
   - the 700 px fold rule extended to the capital's line under 900 px tall.
2. **`election.days` and the other dead keys** listed above were removed, although §5.3 kept `days`. Please confirm.
3. **The rule chip's place on the home plate** is the *Home city · {party} {share} %* row, the plate's only kicker-like line: the home plate has no kicker above the name. On rival ground that row's text folds under 700 px and the chip stays. Confirm, or name another row.
4. **The capital visitor's paper** now prints the capital's rule headlines (`hl.ig.rule-won`, `hl.ig.vote-open`) as its local line, where it printed `hl.ig.ordinance-city` and `hl.ig.polls-open` before. Please confirm.
