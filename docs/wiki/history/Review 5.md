---
type: history
title: Review 5
aliases: [Review 5, Design Review 2]
tags: [review, built]
status: built
dates: 2026-10-08 to 2026-10-10
commits: [21faafe, c68f7a7, 6142de8, cba1833, 927a7cd, 352823a, b9df2c9, 5569de6, bd5d63c, 7895672, f4ac723, 74e833a, 42ec520, 671a264, 0242423, 666af10, beb2051, 3aa7996, 98f87cb, f087f46]
gdd: ["§2.2", "§5.3", "§6.1", "§7.1", "§9.2", "§13.1", "§13.1a", "§14.10", "§14.11", "§14.12", "§14.13", "§17.1", "§19.1"]
adrs: ["0079", "0080", "0081", "0082"]
updated: 2026-10-14
---

# Review 5

The user's notes after the [[Review 4]] fixes, 8 Oct 2026, on the build at `f9096bd`. **In the user's Notion this is "Design Review 2"**; the repo calls it review 5 ([[review/2026-10-08-review-5|the notes]], line 3).

## What the user asked

Twelve notes. In short:

1. **The opening is weak**: who am I, why am I at the station, what do the three people want?
2. The small clouds look odd: **bigger clouds**.
3. The level-up stat boxes are big black sharp-cornered boxes.
4. An unstyled scroll bar on some results.
5. **A job needing more paid less** than the factory (Driver 200 vs 216): check all jobs.
6. **Health under Energy.**
7. **I could skip the train encounter** by clicking elsewhere.
8. **Heal at any infirmary for money.**
9. **A list of a city's Issues and missions**, so I don't search every place.
10. **Make rival ground's danger and point visible**: a bar, a goal.
11. Should time be real time? **More day and night**: investigate.
12. **Night missions, and patrols on rival ground at night**: what do you think?

## What was decided

From [[design/review-5-answers|the design answers]] (GDD §0, *Added 8 Oct 2026 (review 5)*). **The user decided four open notes the same day:**

- **The opening (#1):** round 1 (three premises on the father) was not taken: *the user asked for one unrelated to the father*. Round 2 (*The warrant*, *After the count*, *The frontier train*) was **rejected** too. **Round 3, *Coming home*, was confirmed by the user on 8 Oct**: a demobbed soldier at the demobilisation office counter, three pieces of bad news, three people offering a way out; whom you go with is your party. The Ambitions were re-strung away from the father (*The Names on the Stone*, *Who Sold the Homes*, *The Ration Ledger*); no number moved. See [[Coming Home]], [[Ambitions]].
- **Rival ground (#10), approved as proposed:** a three-line header (pushed today, the risk in words, **the goal: Unrest**) and **the Unrest prize** (+50 Party XP, a headline, Legacy +2 from slice 8). See [[Hostile Ground]].
- **Day and night (#11), option B approved: a six-hour game day.** Dusk at 04 / 10 / 16 / 22 UTC, the last two hours night, the same for everyone; every daily rule stays on the real City Day. See [[Time and the Game Day]], [[Night and Patrols]].
- **Night (#12), approved with the stop made random:** night-only ways and four night missions (+25 % Iron); on rival ground at night a higher run-in chance and a random **patrol stop** (12 % per ten minutes, at most two a night). See [[Night and Patrols]].
- The designer's answers to the rest: three paper level-up cards; one thin ink scroll bar; **a job that asks more pays more** (the Driver 240, a loader check on the ladder); the HUD order Energy · Health · Heat · XP · Party XP; **the journey card stays until a row is tapped**; ***Get patched up*** at every infirmary, one Iron a point; ***What's here*** replaces the Places list; three big clouds and two wisps; **a compact result modal**. See [[Jobs]], [[Hospital and Treatment]], [[The Result Modal]].
- **Process (user, 8 Oct): no Vitest for now.** Cached checks plus targeted Playwright per phase, the full e2e once per round ([[tech/review-5|tech/review-5]]). See [[Checks and Testing]].

## What was built

Technical plan [[tech/review-5|tech/review-5]] with [[adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views|ADR 0079]] to [[adr/0082-the-push-ring-on-the-city-and-the-unrest-prize-as-an-award|ADR 0082]]. No new collection and no migration. The user paused the round on 8 Oct and resumed it on 9 Oct (session notes).

| Phase | What | Commit |
|---|---|---|
| quick fixes | Health under Energy, styled scroll bars, the journey card can't be skipped | `6142de8` |
| 1 | the six-hour game day, one night seam, the night run-in | `bd5d63c` |
| 10 | the opening, *Coming home* (with its art, `5569de6`, `f4ac723`) | `7895672` |
| 2 | the compact result modal | `74e833a` |
| 3 | the level-up cards, the clouds, small fixes | `42ec520` |
| 4 | the job ladder and getting patched up | `671a264` |
| 5 | night windows and night missions | `0242423` |
| 6 | random night patrols on rival ground | `666af10` |
| 7 | *What's here* in the Places list | `beb2051` |
| 8 | the rival header and the Unrest prize | `3aa7996` |
| 9 | integration, full e2e, build notes | `98f87cb` |

The user's build notes: [[review/review-5-build-notes|review-5-build-notes]].

## QA result

- [[qa/review-5-report|QA report]] (10 Oct): **Pass with issues**, blocker 0, major 0, minor 5, nit 7. Verified with Playwright only, by the user's rule. Patrols wrote once per ten-minute bucket under load; treatment and the Unrest prize could not be farmed in the cases tried.
- Fix round `f087f46` (10 Oct): the dusk line on short phones, results fit small phones, *Agility* spelled out, the prize deck's grammar, a resolved run-in no longer blocks the next. Full e2e: 265 passed.

## Leftovers

Three points left **for the user** ("for Design Review 3"); none has a recorded answer, and the content is unchanged as of 14 Oct 2026:

1. **Stahl's two names** (*Viktor Stahl* at the counter, *Organiser Stahl* in the decks) and the Vanguard's first headline ***Papers in order, says the station office***, beside a story about a missing stamp (`packages/content/src/data/headlines.ts` l. 620; QA suggests *Papers received*).
2. Whether ***camp*** needs a word (*Books, from the camp library*).
3. **The level-up cards' square corners**: paper cards in the house style, or softer.

Also: the Unrest prize's Legacy +2 waits for [[Slice 8 A Life in the City]]; knock-ons for slices 6–9 are in [[tech/review-5|tech/review-5]] §18. See [[Open Questions]].

## Related

- Previous: [[Review 4]] · Next: [[Voting Rework]] (from the user's next note)
- [[Decision Log]]
