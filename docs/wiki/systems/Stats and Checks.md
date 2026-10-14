---
type: system
title: Stats and Checks
aliases: [Stats, Attributes, Strength, Intelligence, Agility, Charisma, STR, INT, AGI, CHA, Checks, Odds, Training, Odds band]
tags: [progression, core, rules]
status: partly built
slice: "1 (checks, training); review 1 (best-stat checks, First day); review 2 (odds as words); review 4 (starting stats); slice 5 (tier-2 ladder, Agility quarters)"
gdd: ["§8", "§8.1", "§8.2", "§8.3", "§8.4", "§8.5"]
adrs: []
updated: 2026-10-14
---

# Stats and Checks

## In one paragraph

Almost every tap is a **check**: one of the player's stats against a difficulty. Three stats are
trained (Strength, Intelligence, Agility); the fourth, Charisma, is **worn**: it comes from what the
player has on. The formula is simple, but the player never sees it: every ticket shows the odds as
a word (*Good odds · Intelligence*) and every result that didn't come off says, in one plain line,
why. The server keeps the full maths for the dev panel and QA.

## How it works

- **Attributes** ([[GDD#8.1 Attributes|GDD §8.1]]): STR (physical work, fights), INT (political and
  intelligence work, jobs), AGI (stealth, the caught check, running), CHA (social work, elections;
  worn). Always written in full on screen.
- **Charisma is worn** ([[GDD#8.2 Charisma is worn|GDD §8.2]]): the sum of equipped items' CHA.
  Every new character wears the demob suit (CHA 5). Slice 8 adds the Wardrobe; high Charisma also
  makes you recognisable on rival ground ([[Equipment and Wardrobe]], [[Hostile Ground]]).
- **The check** ([[GDD#8.4 Checks: from stats to odds (new)|GDD §8.4]]):
  **chance = 50 % + 4 % × (stat − difficulty) + bonuses**, kept 5–95 %. Two-stat checks average the
  stats; **best-stat** checks (a committee session, chapter 1's *Legwork*) take the highest of STR,
  INT and AGI.
- **Difficulty:** tier-1 action 8 at home, 10 in a battleground; tier-2 missions by Level (14 at
  Level 6 up to 20 at Level 12, +2 in the capital); stories 22–30; **+4 on rival ground**.
- **Bonuses:** [[Local Standing]] +3 % a level (to +12 %) · **First day** +10 % in the home city on
  the welcome day · the right item +5 to +10 % (slice 8) · weather ±10 % · battleground +5 % on
  political checks · some opponents −10 %. **Heat, orders and Rested never change the odds.**
- **One roll, 1–100:** at or below the chance = Success; up to 20 above = Partial (half rewards);
  more than 20 above = Partial for tier 1 (a tier-1 action never fails), **Failure** for tiers 2–3
  (XP ÷ 5 only).
- **Odds as a word** (review 2): **Good odds** 70 %+, **Fair odds** 50–69, **Long shot** under 50.
  No percentage, roll, difficulty or bonus row anywhere a player reads. Reward percentages
  (*+25 % Party XP*) stay: they are rewards, not odds.
- **One reason line** under a result that isn't a Success: the stat (*Your Intelligence is low for
  this. Raise it at the Union Hall.*), a penalty (rain, rival ground) or luck.
- **Starting stats** ([[GDD#8.5 Stat growth (new)|GDD §8.5]]): 5 each, + the kitbag (+6 / +1) +
  the faction (+3). Best stat 11–14. The **reference recruit** (Collective, *books*): STR 8 · INT
  12 · AGI 5 · CHA 5; home canvass 66 %.
- **Growth:** +1 point a level ([[Levels and Faction Rank]]) and training; **AGI** also +¼ point for
  each Success on an Agility way of a mission.
- **Training:** not a check, always works. **Energy for the next point = 20 + 2 × current stat**;
  XP at half the tier rate; no Iron, Party XP or opinion; ×1 only. Its button is the action's verb
  (*Study*, *Lift*, *Run*, *Unload*), never *Train*.
- **Agility milestones** ([[GDD#8.3 Agility milestones|GDD §8.3]]): AGI 30 / 50 / 75 / 100 / 150
  for Energy discounts and running missions in parallel. **Not built.**

## Where it lives

**Rules:** [[GDD#8. Stats|GDD §8]] · [[design/review-1-answers|review 1 answers §2]] (first
session in band) · [[design/review-2-answers|review 2 answers §2.4–§2.5]] (reason lines) ·
[[design/review-3-answers|review 3 answers §5]] (the verb) · [[design/slice-5-risk|slice-5 risk §4.3]] (tier-2 ladder) · [[economy|economy sheet §2, §19.2, §24.1]]

**Code:**
- Rules: `packages/rules/src/check.ts` (`computeCheck`, `bestTrainedStat`, `tier1Difficulty`,
  `outcomeForRoll`) · `packages/rules/src/training.ts` (`trainingCost`, `resolveTraining`) ·
  `packages/rules/src/welcome.ts` (`isWelcomeDay`, `firstDayBonus`) · `packages/rules/src/items.ts`
  (`wornCha`) · `packages/rules/src/missions.ts` (Agility quarters) · `CHECK`, `TIER1_DIFFICULTY`,
  `MISSION_LADDER`, `FIRST_DAY`, `TRAINING`, `STARTING` in `packages/rules/src/constants.ts`
- Server: `apps/server/src/services/actionService.ts` (checks and training) · `missionService.ts`
- Data: `characters.stats { str, int, agi, chaBase, agiQuarters }`
  (`packages/db/src/models/character.ts`); training actions with `verb` in
  `packages/content/src/data/cities/*.ts`
- Client: `packages/ui/src/odds.ts` (`ticketOdds`, `bandNote`, `reasonFor`) ·
  `packages/ui/src/components/Ticket.tsx` · `ResultModal.tsx` · dev panel
  `apps/client/src/features/dev/DevPanel.tsx` (the raw breakdown)

## Status

Built: the check and outcomes (slice 1), best-stat checks and *First day* (review 1), odds as words
and reason lines (review 2), the training verb (review 3), the kitbag start (review 4), the tier-2
ladder and Agility quarters (slice 5). Not built: Agility milestones, items' `chancePct` (slice 8),
Charisma from a wardrobe beyond the starting coats (slice 8), Charisma's vote appeal (slice 7).

## Decisions

- [[Review 1]]: the first session is inside the 60–85 % band for every build.
- [[Review 2]]: no percentage anywhere (Appendix C #35).
- [[Review 4]]: one stat choice of +6 / +1 replaces six answers (Appendix C #91); no CHA base.
- 3 Oct 2026 (slice 5): stat targets raised; the tier-2 ladder set against them (Appendix C #15).

## Open questions / drift

> [!warning] Drift
> **GDD §8.2 vs §8.5.** §8.2 says Charisma is worn items *plus the origin's CHA base (0–4)*. §8.5
> (review 4) says *there is no CHA base any more*. The code still stores `stats.chaBase` (history
> for old characters, per ADR 0073) and `wornCha(chaBase, equipped)` still adds it.

> [!warning] Drift
> **GDD §8.1 vs build.** AGI's *Energy discounts at milestones* and *flee chance* are listed as what
> it governs; milestones are not built and are expected to be retuned (Appendix C #34).

- Appendix C #91 (the second stat's 42 % on day 1) is open.

## Related

[[Levels and Faction Rank]] · [[Local Standing]] · [[Equipment and Wardrobe]] · [[Street Actions]] ·
[[Missions]] · [[The Result Modal]] · [[Coming Home]] · [[Heat and Record]] · [[Weather]]
