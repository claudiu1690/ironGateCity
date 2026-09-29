# Slice 0 — answers to the architect's questions (`docs/tech/slice-0.md` §17)

Game designer, 29 Sep 2026. Each answer gives the number, the rule and the GDD section that now pins it. The developer replaces the `PLACEHOLDER` constants and the `TODO(game-designer)` text with what is below; the GDD edits are listed at the end.

## Summary

| # | Question | Answer | GDD |
|---|---|---|---|
| 1 | Starting stats before the origin story | The **reference recruit**: Collective, **STR 10 / INT 12 / AGI 5 / CHA 2** (worn). Home canvass = **66 %** | §8.5, §8.4 |
| 2 | Canvass Energy | **10** → 45 XP / 6 FXP / 20 Iron on Success | §13.3, §5.5 |
| 3 | Partial rounding | **Nearest whole, halves up**, per line, base and bonus rounded separately; a paying line never drops below 1 on Partial | §5.5 |
| 4 | Opinion per tier-1 action and its source | **0.005 points per Energy** → +0.05 Success / +0.025 Partial on the canvass. Persuasion draws from **Neutral first**, then rivals proportionally; Neutral floor 5 %, home floor 50 %; three decimals stored | §14.2 |
| 5 | Roll ≤ chance | **Confirmed.** Roll 1–100; Success on roll ≤ chance; Partial on roll ≤ chance + 20 | §8.4 |
| 6 | Rested proration | **Proportional.** 3 Rested on a 10-Energy action = +15 % XP and Iron | §6.3 |
| 7 | Per-level XP table | Levels 1–51 pinned (L2 150 · L6 2,500 · L10 7,400 · L16 20,000 · L31 100,000 · L51 400,000); +600 per level after 31 | §5.3 |
| 8 | Mill Gate canvass text | Below | (content) |
| 9 | Coalport baseline | **Vanguard 9 / Collective 70 / Alliance 6 / Neutral 15** | §14.11 |
| 10 | Location kinds | 19 kinds, closed list, provisional until the slice-1 Coalport list | §13.5 |

## The answers

### 1. Starting stats before the origin story

Create every new character as the **reference recruit** (new in §8.5): a Collective recruit who answered the origin story with *the library* (+3 INT), *watched from the corner* (+2 INT) and *fix anything* (+3 STR, +1 INT), in basic work clothes.

| STR | INT | AGI | CHA (worn) |
|---|---|---|---|
| 10 | 12 | 5 | 2 |

= 5 base each + origin (+3 STR, +6 INT) + Collective (+2 STR, +1 INT) + work clothes (CHA 2). Store `chaBase: 2` in slice 0, since there is no equipment yet; in slice 2 it becomes `chaBase: 0` plus a worn item of 2.

Why this and not "+5 INT": it is a real set of origin answers, so slice 2 replaces a stand-in with the dialogue rather than deleting a magic number, and INT 12 is the figure the GDD's own canvass example uses (§8.4). Home canvass preview = 50 + 4 × (12 − 8) = **66 %** (the design's tests say 62 %; update them). With *Known* Standing in slice 1 it becomes the GDD's 72 %.

Flagged as Appendix C #12: the §7.2 answers can stack past the "+5" that §8.5 states. The recruit assumes the answers as written.

### 2. Energy cost of Canvass

**10 Energy.** Canvassing is the reference action: 10 taps or two ×5 runs empty a bar, which keeps a full bar spendable in 2–3 minutes (§13.1). Rewards at §5.5 rates: **45 XP / 6 FXP / 20 Iron** on Success, **23 / 3 / 10** on Partial. §13.3 now lists the tier-1 Energy by type (Propaganda 8, street Speech 12, safe Intelligence 3–5, Council 10) so slice 1's twenty actions have a guide.

### 3. Rounding on Partial

**Round to the nearest whole number, halves up**, applied per reward line after all multipliers. Round `base` and `bonus` separately, then `total = base + bonus`, so the tiles add up on screen. A line that pays on Success pays at least 1 on Partial. So: 22.5 XP → 23, 3 FXP, 10 Iron, and a 3-of-10 Rested bonus on 45 XP (6.75) → 7. Opinion is not rounded (three decimals, see 4). Floor was rejected because Partial already halves; shaving another point on top reads as mean.

### 4. Opinion per tier-1 political action, and where it comes from

Swing is set **per Energy**, like every other reward: tier 1 = **0.005 points per Energy**, halved on Partial. The Mill Gate canvass moves Coalport **+0.05** (Success) or **+0.025** (Partial) toward the actor's faction. Modifiers (Issue +50 %, Battleground +25 %, Groundswell up to +30 %, ordinances) multiply the swing; Rested and Directives never touch it (§6.3).

Source rules (§14.2):
- **Persuasion** (canvass, speech, propaganda, events, Issues): from the **Neutral pool first**; when Neutral is at its floor, from the rivals **in proportion to their shares**.
- **Against a rival** (Disruption, Sabotage, exposés): from the target faction; half to the actor's faction, half to Neutral.
- **Floors:** Neutral ≥ 5 %, home faction ≥ 50 % in its home city. If nothing can be drawn, the swing shrinks to what can. Shares always sum to 100. So the effective cap on a faction is 95 %.
- **Precision:** three decimals stored; one decimal shown.

In Coalport the Collective share is its morale (§14.11), so a canvass there is base maintenance: Neutral 15 → 14.95, Collective 70 → 70.05. For slice 0 keep `applied: false` and report `{ cityId: 'coalport', factionId: 'collective', delta: 0.05 }`; slice 1 or 4 writes it.

Pacing check: the reference player spends about 200 Energy a day on political tier-1 actions at ~70 % Success, which is 20 canvasses × (0.7 × 0.05 + 0.3 × 0.025) ≈ **+0.85 points a day**, matching the "+0.8 %" ledger line in §3.2. What happens with hundreds of players per city is Appendix C #13.

### 5. "Below the chance" → at or below

**Confirmed: `roll <= chance` is Success**, `roll <= chance + 20` is Partial, otherwise Partial (tier 1) or Failure (tiers 2–3). Roll is a whole number 1–100, uniform. A shown 72 % succeeds on 1–72, exactly 72 in 100. §8.4 now says "at or below" and notes the clamp corners (a 95 % button still gives Partial on 96–100).

### 6. Rested with fewer points than the Energy spent

**Proportional**, which is what "each Energy point spent while Rested > 0 uses 1 Rested" already says. `restedUsed = min(rested, cost)`; XP and Iron bonus = base × 0.5 × restedUsed ⁄ cost. 3 Rested on a 10-Energy action → +15 %. Modal tag: *"Rested: 3 of 10 Energy, +15 % XP and Iron"*. All-or-nothing was rejected because it makes the player count points before tapping, which is the kind of planning §1.2 pillar 7 forbids. Added to §6.3.

### 7. Per-level XP table

Pinned in §5.3 (full table there). The anchors:

| L2 | L3 | L4 | L5 | L6 | L10 | L16 | L20 | L31 | L40 | L51 |
|---|---|---|---|---|---|---|---|---|---|---|
| 150 | 450 | 900 | 1,600 | 2,500 | 7,400 | 20,000 | 33,000 | 100,000 | 205,300 | 400,000 |

The XP to the next level is strictly increasing across brackets (900 → 1,000 at L5→L6→L7, 2,600 → 2,800 at L15→L16→L17, 8,400 → 9,300 at L30→L31→L32). From Level 31 the increment is 9,300 + 600 per level, and continues past 51 with no cap. Bracket boundaries in §5.3 were tidied to `0–2,499`, `2,500–19,999`, etc., so "reach 2,500 XP → Level 6" is exact.

Rules: level = highest threshold reached; one action can cross several; each grants +5 max HP and +1 stat point that waits on the character screen and never expires.

Pacing check against §5.2 with the reference player (400 Energy/day, ~85 % of it on XP-paying actions, 0.875 expected outcome factor, ~10 % from Rested): ≈ 1,500 XP/day at tier 1, ≈ 1,700 at tier 2, ≈ 2,300 at tier 3, ≈ 2,450 at tier 4. That gives Level 6 on day 2, **Level 10 on day 5** (target ~day 5), **Level 16 on day 12–13** (target ~week 2), **Level 31 around day 45** (target ~week 6), Level 51 around week 24 (target ~week 20; slightly slow, acceptable, revisit in the economy sheet for slice 1).

### 8. Mill Gate canvass text

Location **Mill Gate** (`coalport.mill-gate`, kind `factory-gate`), blurb, one line:

> The gates of the Coalport Steel Mill. Three shifts a day, and every one of them walks past here.

Action **Canvass the shift change** (`coalport.mill-gate.canvass`, tier 1, canvass, INT, 10 Energy, FXP yes, opinion yes). Faction-neutral, so the same text serves a visiting rival in later slices.

**Success** — headline: **The whistle goes, and they stop**

> You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches. But the leaflets go hand to hand, and a foreman says come back Thursday. That's how a ward is won.

**Partial** — headline: **Most of them walk past**

> The shift comes off in a hurry and most of it heads straight for the tram. You press leaflets on the ones who slow down. Two stop to argue; one gives you his street. A start, not a win.

### 9. Coalport baseline opinion

**Vanguard 9 / Collective 70 / Alliance 6 / Neutral 15.** Collective at the 70 % drift target (§14.11); Neutral bigger than either rival so that home canvassing has undecided voters to win; the Vanguard above the Alliance because it recruits in industrial towns (§16.1). §14.11 now has a baseline table for all five cities and the capital's districts, marked provisional except Coalport.

### 10. Location kinds

Closed list of 19, in §13.5, as the art key for the fallback ladder:

`factory-gate` · `docks` · `market` · `station` · `street` · `square` · `bar` · `hotel` · `press` · `faction-hq` · `hospital` · `jail` · `court` · `university` · `library` · `gym` · `barracks` · `parliament` · `ministry`

`faction-hq` picks its scene by faction (three scenes), which keeps the total inside the ~25 scenes budgeted in §13.5. Existing art already covers `bar` (Anchor), `hospital`, `jail`, `press` (newsroom), `parliament` and two of the three HQs. The likely slice-1 Coalport list uses `factory-gate`, `docks`, `bar`, `faction-hq`, `press`, `market`, `station` and `street`. Provisional until that list is final; kinds may be added before slice 1, never removed after.

## GDD edits made in this change

| Section | Edit |
|---|---|
| Header, §0 | "Last updated" 29 Sep 2026; an "Added 29 Sep 2026" change table |
| §5.3 | Bracket boundaries made exact; per-level XP thresholds 1–51 and the +600 formula; multi-level and pending-point rules |
| §5.5 | Reference action (10-Energy canvass); rounding rule |
| §6.3 | Rested is spent per Energy point (proportional bonus) and its modal tag |
| §8.4 | "At or below the chance"; roll and clamp notes; the 66 % reference-recruit example |
| §8.5 | The reference recruit (STR 10 / INT 12 / AGI 5 / CHA 2) |
| §13.3 | Tier-1 Energy by type; Canvass 10 |
| §13.5 | Location kinds, closed list of 19 |
| §14.2 | How opinion moves: swing per tier, multipliers, source rules, floors, precision |
| §14.11 | Baseline opinion table (Coalport pinned; others provisional) |
| Appendix C | #12 origin stacking vs "up to +5"; #13 opinion swing at scale |

Not touched: code, `packages/`, faction names, `CLAUDE.md`.
