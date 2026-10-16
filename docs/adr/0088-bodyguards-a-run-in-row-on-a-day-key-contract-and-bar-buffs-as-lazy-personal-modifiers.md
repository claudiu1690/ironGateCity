# ADR 0088 — Bodyguards: a run-in row on a prepaid day-key contract; the bar's buffs: lazy state read as personal modifiers

**Status:** proposed (slice 8; applies ADR 0032, 0052, 0056) · **Date:** 2026-10-16

## Context

The user moved bodyguards and the bar's services into slice 8 (14 Oct 2026). The designer's design is `docs/design/slice-8-life.md` §24, with GDD §6.7, §12.1, §19.3, §20.1 and economy §22.11:

- **A bodyguard** is a named man on a prepaid seven-day contract, one at a time, hired at the party store (400 / 1,200 / 3,000 a week). He is never auto-renewed. When the week ends he goes and nothing else changes.
- In a run-in he is **a visible row**, at the Fight formula with his power in place of yours. If he succeeds, the run-in ends as a successful Talk does (+10 XP). If he fails, the fight goes ahead at your Fight odds −10. He never steps in against the police.
- **The bar** sells a round (*in good spirits*: +10 % XP on the next three missions, nine at most, three rounds a day) and a plate (*well fed*: +10 % XP for four hours, Health +15). **A hotel** sells dinner (*well fed, properly*: +10 % XP and Iron for six hours, Health +25, worn Charisma 10). One meal counts at a time, the better one, and Health never goes above max.

The constraints that apply:

- Being away costs opportunity, never assets.
- Timers are lazy; jobs are only for real events (ADR 0005, 0030).
- A run-in is one choice whose rolls are replayed from the encounter's seed (ADR 0032).
- Item and perk effects are personal modifiers: named rows and parts beside the place's (ADR 0052).
- The flat's rent is a day key, so a lapse needs no write (ADR 0056).

## Decision

1. **The contract is embedded and keyed by the day**: `characters.bodyguard { tier, name, paidThroughDay } | null`.
   - He walks with you while `paidThroughDay ≥ today` (`contractCounts`).
   - A lapse writes nothing. The record stays on the character, so re-hiring the same tier keeps his name, and the paper's lines are conditions on the day (the last paid day, the day after).
   - Hiring and renewing are one version-guarded character update each, with a request key.
   - The name is drawn at hire from the tier's three, from the request's seed (ADR 0087).
   - Renewing adds whole weeks from `max(paidThroughDay, today − 1)`, at most four weeks beyond the running one.
   - No job, no auto-renew.
2. **He is a fifth run-in row, frozen on the encounter.**
   - `RunInChoice` gains `minder`, and `RunInOutcomeKind` gains `minded`.
   - When a run-in fires, the server stores `encounter.minder { tier, name, power, blocked: 'police' | null }` and `chances.minder` (his Fight-formula chance against the scaled opponent, with the opponent's own Fight modifier, e.g. the inspector's −10; `null` against the police).
   - The sheet, *Leave it to luck* and the resolution all read the encounter, so a contract that lapses while a run-in waits does not change it.
   - `resolveRunIn`: a success is `minded` (the act paid as rolled, no Health lost, `RUN_IN.xp.away`, the caught check as normal). A failure is Talk's failure (the fight at the follow-up −10).
   - `luckChoice` takes the row when its odds are the best free odds; on a tie he steps in first.
   - No other run-in number moves: the v3.0 power, Run, damage and hospital modifiers are not built.
3. **The buffs are lazy state on the character**: `buffs { wellFed: { tier: 'plate' | 'dinner', until } | null, spirits: { left } }` and `today.rounds`.
   - A meal is an end time. It is never written again when it runs out; it simply stops counting.
   - A round is a count, used up one per resolved mission in that mission's own transaction.
   - Buying is one version-guarded character update with a request key (Iron, Energy, Health by `healHealth`, so never above max), refused by pure gates (one meal at a time, the better one; three rounds a day; nine at most).
4. **A buff enters the rewards as personal modifiers** (ADR 0052): `PersonalModifiers` gains `buffs`.
   - `buffShares(p, kind, at)` returns named `xpShares` and `ironShares` (`buff:wellFed`, `buff:spirits`). The callers that already pass the coat's and the perk's parts add them, so each buff is a line of its own on the receipt.
   - They apply on tier-1 actions and missions (in good spirits: missions only), never training, chapters, event roles or the exposé.
   - A meal counts at the act's own time (a mission whose run-in waits uses the time it started).
5. **Prices and sizes are rules constants** (`BODYGUARD`, `BAR`). Names, lines and portraits are content (`bodyguards.ts`). Where the services are sold is content on the place: `Shop.hire` on every party store, `Location.bar` on every bar and `Location.dining` on the three dining rooms, checked by the loader.

## Consequences

- No job and no bulk write. An absent player loses only the hours of a meal (a timer that was a choice) and his paid days, which run out on their own; nothing owned is touched, and nothing spends Iron without a tap.
- The encounter document grows by one small field and one nullable chance, and old encounters read it as absent (`null`). The run-in sheet, the dev panel and the report see his row and odds as data.
- The sheet shows one more visible number; no hidden die is added. The levers if rival ground becomes a walk (Appendix C #113) are his power or the police's share of the pool, both constants or content.
- A buff's percentage is a separate, rounded line beside Rested and the coat's, so the result modal's breakdown needs no new shape.
- Later sources slot in without a migration: the gym's discount on the hire card, street food, the society dinner, *Lodged*.
