---
type: question
title: Open Questions
aliases: [Open questions, Leftovers]
tags: [questions]
updated: 2026-10-15
---

# Open Questions

What is still undecided or unfinished, as of 14 Oct 2026. Three parts: **A** the GDD's own open questions ([[GDD#Appendix C — Open questions|GDD Appendix C]]), **B** defaults built but waiting for a playtest, **C** leftovers from QA reports and build rounds. Inconsistencies between documents go to [[Drift Report]].

## A. Questions that need a decision

| # | Question / drift | Sources | Status |
|---|---|---|---|
| C#10 | **Faction naming**: plain names (Fascists, Communists, Democrats), plain names first with party names as flavour, or keep the party names with the ideology stated | Appendix C #10; project `CLAUDE.md` rule 5 | **Parked** by the user |
| C#4 | **Counter-demonstrations**: the first faction-vs-faction contest. MVP or v1.1? | Appendix C #4; the plan lists them after the MVP | Open |
| C#5 | **Season length**: 12 weeks, or 8? (Slice 8's design uses 84 days, three terms) | Appendix C #5; [[Slice 8 A Life in the City]] | Open |
| C#11 | **Who starts where at low population**: start new players in a battleground so they meet rivals sooner? | Appendix C #11 | Open |
| C#17 | The **14-day back-pay cap** is a judgement; revisit with a Welcome Back package | Appendix C #17 | Open |
| C#39 | Under the stitched maps: first-view letterboxing on wide screens (Duskwall's Goods Yard), and whether a later quarter's frame is its own box | Appendix C #39 | Open |
| C#41 | A district beyond six places becomes a split of a district, never new land | Appendix C #41 | Decide when a district fills |
| C#63 | Whether a recognised visitor shows in rival presence counts, and whether office-holders are named | Appendix C #63 | Decide with slice 8's recognition |
| C#88 | The closed beta's gate (D7 ≥ 30) or §27's 38 for both | Appendix C #88; [[Slice 9 Launch Readiness]] | The user may choose |
| C#108 | **Personal vote appeal as one term**: §8.2 (+1 % per 10 worn Charisma), §11.3 (*Notorious* −5 %) and §17.3 (*A name they know*) become one `appeal` term added in slice 8. How the percentages become points on a home total, a battleground total and a party's national score | Appendix C #108 (was W-9); [[National Elections]], [[Legacy]] | Pin with slice 8; until then nothing reads an appeal |
| C#109 | **Control-gated access has no slice** (§14.3): whether control gates the faction-only places or only discounts them, and which slice carries the +25 % Heat for rivals and the hospital's and back room's price shifts | Appendix C #109 (was W-5); [[Influence and Opinion]] | Decide when the faction-only places are scheduled |
| C#110 | **Bodyguards in slice 8**: the prices (hire 500 / 2,000 / 8,000) checked against ~1,000 Iron a day; where the contract card lives (default: the back room; the Black Market's +25 % dropped) | Appendix C #110 (was W-12); [[Bodyguards]] | Open for slice 8 |
| C#111 | **Well-Fed and the bar services in slice 8**: may Well-Fed take Health above max (default: up to max only); the meal prices and the Stimulant's overdose (default: cut the overdose, keep three a day) | Appendix C #111 (was W-6); [[Buffs]], [[Bars]] | Open for slice 8 |
| S6–S9 | **Points for the user** in the slice 6–9 designs (7 + 7 + 8 + 12 defaults), listed in the review-4 guide §7 "to check". No answer recorded | [[design/slice-6-together\|slice 6 §19]], [[design/slice-7-nation\|slice 7 §21]], [[design/slice-8-life\|slice 8 §20]], [[design/slice-9-launch\|slice 9 §16]] | Waiting for the user |
| S6–S9 | **When to build slice 6**: slices 6–9 are designed only and wait on the user's go | session notes; [[Slice 6 Together]] | Waiting for the user |
| R4 | The ten **defaults in the review-4 guide** (§5): no move while on a ballot; a room renewal adds seven nights; rival ground at Level 10; ×1 there; a police loss is the cells; *On file*; the home overview (since reversed); caught only on Partial/Failure; *the duty officer*; five minutes for a run-in. Never explicitly confirmed | [[review/review-4-guide\|review-4 guide]] §5 | Assumed accepted |
| R3 | **The receipt's thin bars** on XP and Party XP lines, and ***Once* / *×3*** on the ticket (fallback *1×* / *3×*) | [[design/review-3-answers\|review-3 answers]] §9 | No recorded answer |
| R5-1 | **Stahl's two names** (*Viktor Stahl* / *Organiser Stahl*) and ***Papers in order*** beside a missing-stamp story (QA suggests *Papers received*) | [[qa/review-5-report\|review-5 QA]] n4; `packages/content/src/data/headlines.ts` l. 620 | **Unresolved**; content unchanged |
| R5-2 | Does ***camp*** need a word (*Books, from the camp library*)? | [[qa/review-5-report\|review-5 QA]] n6 | **Unresolved** |
| R5-3 | **The level-up cards' square corners**: house style, or softer? | [[qa/review-5-report\|review-5 QA]], note #3 | **Unresolved** |
| VR-m8 | **Times east of UTC read oddly** (*Vote until Wednesday 03:00*; "Sunday to Wednesday" reads like four days). Stands by the review-4 clock decision; revisit only if the user asks | [[qa/voting-rework-report\|voting QA]] m8; [[design/voting-simplified\|§8.12]] | Decided to stand; open for the user |
| R2 | Project `CLAUDE.md` design rule 2 named *canvass, rally…* as the vocabulary; review 2 proposed an edit "the user decides on" | [[design/review-2-answers\|review-2 answers]] §1.3 | **Resolved 14 Oct 2026**: rule 2 now says players read plain words (GDD §1.5) |

## B. Defaults built (or designed) and waiting for a playtest

Each of these is a chosen number or rule with a named lever if the playtest disagrees. They are open only in that sense. Full text in [[GDD#Appendix C — Open questions|Appendix C]].

| # | Question / drift | Sources | Status |
|---|---|---|---|
| C#2 | Election weighting: the ballot half reaches full weight at 10 ballots (30 nationally) | Appendix C #2 | Revisit from count tables |
| C#14, #23 | Heavy players level ~35 % faster; *Fired up* is the normal state (+10 % Party XP) | Appendix C #14, #23 | Watch rank pacing |
| C#19, #20, #21 | The face has no effect; chapter-1 Failure on day 1; the first ballot lands on day 2–4 | Appendix C #19–#21 | Watch |
| C#22, #25 | Ward-vote weights (revised for voting simplified); no running totals while voting (the first lever if turnout is low) | Appendix C #22, #25 | Watch |
| C#27–#29 | Rank 2 to move; no early Issue resolution; Groundswell at low population | Appendix C #27–#29 | Watch |
| C#31–#38 | Seniority counts absent days; best-stat council sessions; *First day* +10 %; AGI points; no percentage anywhere; plain over period; *Campaigner*; quarter gates at Level 6 / 10 | Appendix C #31–#38 | Watch |
| C#45, #46 | Free-zoom limits; the parcel pays 100 Iron | Appendix C #45, #46 | Watch |
| C#47–#56 | Risk: the run-in between deed and result; ×1 on rival ground; record Iron on missions only; bail; deportation; the rival cap of 2 points a day; +50 % Party XP there; the police pool; *On file*; caught only on Partial/Failure | Appendix C #47–#56; [[Slice 5 Risk]] | Built; watch |
| C#57–#63, #89 | Slice 6: hands at Rank 1; three starts a day; Political Capital halving; the fixture at the day's turn; volunteers at half strength; presence hidden on rival ground; visits from anywhere | Appendix C #57–#63, #89 | Designed only |
| C#61 | A candidate on a ballot cannot move (still holds after the voting rework) | Appendix C #61 | Built; watch |
| C#64–#73 | Slice 7: the President only; several offices; secretaries table bills; removal at 25 %; petitions dissolve; standing orders repeat; Clearwater evened; the list ordered by backers; the push below Level 10 | Appendix C #64–#73 | Designed only |
| C#74–#81 | Slice 8: no weapons; recognition sizes; exposé swing; Favour's pace; Blackmail/Denounce deferred; the flat waits; no season track; election bonus 100 | Appendix C #74–#81 | Designed only |
| C#82–#87 | Slice 9: linked ballots silent; the audit self-confirms; sign-up caps; renames every 30 days; the moderation ladder; classic retention | Appendix C #82–#87 | Designed only |
| C#90–#99 | Review 4–5: the opening's three people are the secretaries; one stat choice +6 / +1; the card at 0.20–0.80; the Town Hall from Level 1; orders off in the cells; a home city is one map; the job ladder; treatment 1 Iron a point; the journey card can't be put aside silently; three clouds and two wisps | Appendix C #90–#99 | Built; watch |
| C#100–#107 | The six-hour day; night patrols; the Unrest prize; result-modal folds; members' votes out of seats; no backers to stand; the largest bloc's rule | Appendix C #100–#107 | Built; user-approved; watch |

**Closed in Appendix C** (for reference): #1, #3, #6, #7, #8, #9, #12, #13, #15, #16, #18, #24 (superseded by #106, marked 14 Oct 2026), #26 (superseded by the voting rework), #30, #39 (main question), #40, #42, #43, #44, #71, #103.


## C. Leftovers from QA and build rounds

| # | Question / drift | Sources | Status |
|---|---|---|---|
| VR-1 | ***Councillor … Steps Down*** headline (a term ending without re-standing) is untested | [[qa/voting-rework-report\|voting QA]] m4 | Open |
| VR-2 | GDD §14.11's residence paragraph said "two endorsements", "nominations", "polls open" and "the deposit stays with the branch" | GDD §14.11; session notes | **Fixed 14 Oct 2026** (drift cleanup) |
| VR-3 | `packages/db/test/elections.test.ts` still expects the removed report columns (`filed`, `withdrawn`, `struck`, `smallBranchDoubles`, `councilVoteRate`) | [[tech/voting-rework\|tech/voting-rework]], fix round m9 | Open; not run (no-Vitest rule) |
| VR-4 | No test drives a **capital ballot with a wrapped Street Fund line** (the M2 fix leaves ~18 px for one wrapped line) | [[tech/voting-rework\|tech/voting-rework]] fix round | Open |
| VR-5 | **The full e2e has not been re-run** since the voting fix round (last: 276 passed, before it) | [[qa/voting-rework-report\|voting QA]]; session notes | Open |
| VR-6 | Not covered by voting QA: the vote against the count at the boundary; the branch's +3 backing in play; the *carried over* card state; keyboard on the new screens; contrast on painted backdrops; a real phone clock | [[qa/voting-rework-report\|voting QA]], "Not covered" | Open |
| S3-m1 | On a crowded **count morning the Unrest announcement drops out of the paper** | [[qa/slice-3\|slice-3 QA]] m1; `it.fails` in `apps/server/test/qa.slice3.server.test.ts` | Known bug, open |
| S3-m6 | `admin:boost` marks a natural tester as boosted when it only tops up Political Capital (skews the playtest report) | [[qa/slice-3\|slice-3 QA]] m6; `it.fails` in `packages/db/test/qa.slice3.db.test.ts` | Known bug, open |
| S3-m5 | The Me tab's office line was an 18 px tap target | [[qa/slice-3\|slice-3 QA]] m5 | No fix recorded |
| S3/S4 | Old e2e `test.fail` markers (slice-3 m4, slice-4 "five names above the CTA") predate the three-card ballot | [[qa/review-5-report\|review-5 QA]] §6 | Likely moot; clean up |
| S4-n3 | Influence-ledger rows for losses | [[qa/slice-4-report\|slice-4 QA]] n3 (for the architect, ADR 0028) | Limit recorded in ADR 0028 (14 Oct 2026); decided in slice 6 |
| S4-n6–n8 | Playtest and designer questions from the battleground | [[qa/slice-4-report\|slice-4 QA]] | Open |
| S4-tab | On a tablet, Old Town's name sat under the corner plate; the nation map at 812 × 375 with the paper unread was not touched | [[qa/slice-4-report\|slice-4 QA]] §8 | Not re-checked since review 4's new outlines |
| S5-risk | The risk line wraps at a dot on 360 px phones; screens §10 says it "never wraps" (the designer's to reword) | [[qa/slice-5-report\|slice-5 QA]] §9 | Open |
| S5-n5 | Map pins can sit under open overlays | [[qa/slice-5-report\|slice-5 QA]] n5 | Accepted (review 3 allows it) |
| S1-n10 | Caps labels at 8–10 px: a readability watch item | [[qa/slices-0-1\|slices 0–1 QA]] n10 | Won't fix now; watch |
| R4-plate | The journey plate read *arrives now · 19:16* after arrival; a wording (*arrived 19:16*?) was asked of the designer | [[qa/review-4-report\|review-4 QA]] §9.3 | No fix recorded |
| R5-L | The Unrest prize's **Legacy +2** waits for slice 8 | [[review/review-5-build-notes\|review-5 build notes]] | Waits on slice 8; now a row in GDD §17.3 (14 Oct 2026) |
| KO | **Knock-ons** for the slice 6–9 tech docs recorded in later rounds | [[tech/review-4\|tech/review-4]] §20, [[tech/review-5\|tech/review-5]] §18, [[tech/voting-rework\|tech/voting-rework]] §17 | **Applied 14 Oct 2026** to [[tech/slice-6\|slice-6]]–[[tech/slice-9\|slice-9]] (migrations renumbered 010–013) |
| T-1 | The older **Vitest suites are stale** since the 8 Oct no-unit-test rule; planned tooling (`pnpm check`, an `e2e:only` helper, parallel Playwright) is not built | [[qa/review-5-report\|review-5 QA]] "Rules of the round"; session notes | Open |
| R6-1 | **The journey screen held sideways** keeps a 420 px floor, so its map runs below a short phone's screen (as the nation map's did). Dropping it left the map too short under the plate for the route and the pin (a review-4 QA check failed); it needs the plate beside the map | [[review/review-6-build-notes\|review-6 build notes]] | Open |
| R6-2 | From 640 to about 700 px wide the city's 420 px corner card and the two map buttons are close at the top of the map; not measured | [[review/review-6-build-notes\|review-6 build notes]] | Open; check |
| H-1 | **Hosting is deferred** to the end: map tiles on a CDN (R2), the art size cap, first-view data on phones | [[review/review-4-guide\|review-4 guide]] §6; [[adr/0072-production-topology-for-the-hosting-step\|ADR 0072]] | Deferred by the user |

## D. Raised while building the wiki (14 Oct 2026)

Questions the first wiki build found that aren't in GDD Appendix C. Drift between sources is in
the [[Drift Report]].

| # | Question | Pages | Status |
|---|---|---|---|
| W-1 | What rule runs in a city between the **season rollover** and its next count, now that a city always has a rule? | [[Political Seasons]], [[City Council and the Rule Vote]] | Open |
| W-2 | Does a closed or retired account's council candidacy stay on the list until the count, now that withdrawal doesn't exist? | [[Moderation and Fair Play]] | Partly settled 14 Oct 2026: it **stays on the list** (GDD §16.2, ADR 0067). Open: GDD says a seat it wins is vacated at once, ADR 0067 says the count skips it |
| W-3 | If dissolving a council no longer strikes its rule, is a petition still worth 10 Political Capital a signature? | [[Recall and Removal]] | Open |
| W-4 | Is **weather** in the MVP? No slice schedules it; GDD Appendix B still names a `weatherRotate` worker (against the lazy-timer rule); Weatherproof has no slice-8 item | [[Weather]], [[Buffs]] | Open (GDD §6.7: Weatherproof waits for weather; *Lodged* / *Weatherproof* in or out is a pending question to the user) |
| W-5 | When does **control-gated access** (faction buildings, prices, dominance missions, GDD §14.3) arrive? No slice owns it | [[Influence and Opinion]] | Now **Appendix C #109** (section A) |
| W-6 | Which slice owns the **Well-Fed** and **In Good Spirits** buffs, and does Well-Fed's Health go above max? | [[Buffs]], [[Bars]] | Slice 8 (the user, 14 Oct 2026); the rest is now **Appendix C #111** |
| W-7 | Most **bar services** (a round, the barman's report, meals, stimulants, recruitment) have no slice | [[Bars]] | **Slice 8** (the user, 14 Oct 2026); still to be designed |
| W-8 | **Agility milestones** (§8.3) and the AGI list in §8.1 have no owning slice (App C #34 only says to retune) | [[Stats and Checks]] | Open |
| W-9 | Which slice wires **personal vote appeal**, and does it enter the national score? | [[National Elections]] | Now **Appendix C #108** (slice 8) |
| W-10 | **Ministers**: how chosen, term, pay, and how a minister's setting combines with a law ("a sixth source" — the first five aren't listed) | [[Ministers]] | Parked with the system |
| W-11 | **Monetisation**: how the Faction Reset token works in play; Premium's replacement perk; how the 120-a-day bought Energy cap meets Rested and overflow | [[Monetisation]] | Open |
| W-12 | **Bodyguard prices** (500–8,000 Iron) were written for the v3.0 economy; never checked against ~1,000 Iron a day | [[Bodyguards]] | Now **Appendix C #110** (bodyguards are slice 8, the user, 14 Oct 2026) |
| W-13 | The perk *A fifth more from the party* gives +5 % Party XP, but "a fifth" reads as +20 % | [[Legacy]] | Naming slip? |
| W-14 | ADR 0054: should an exposé's burn be shared across players (a scoop)? | [[The Dossier]] | Open |
| W-15 | ADR 0075's card-timing leak (the network response shows when a journey card will fire) is "listed as a question" but isn't in Appendix C | [[Travel and Journeys]] | Open |
| W-16 | Ledger rows for losses (QA slice-4 n3): record rival legs in persuasion, or note the limit in ADR 0028? | [[Influence Ledger and City Hero]] | ADR 0028 amended 14 Oct 2026; the choice is a **slice-6 decision** (default: write the losers' rows if the screens show losses) |
| W-17 | The slice-1 *While You Were Away* headline (`hl.away`) prints "Rested is full" without computing it; when is it retired for ADR 0071's row? | [[Session Loop]] | Open |
| W-18 | Is Ernst Kessler (a Duskwall candidate) the same man as Inspector Kessler (the police face)? The name check doesn't cover opponents | [[People of Irongate]] | Open |
| W-19 | Who is `mvp/portraits/barman.png` for? No design doc mentions it | [[People of Irongate]] | Open |
| W-20 | `requestLogs` expire after 7 days, but the slice-4 playtest report reads moves and rooms from them — record those in domain collections? | [[Database and Models]] | Open |
| W-21 | There's no rate limit on game actions until slice 9 (ADR 0069); only Better Auth limits sign-in and sign-up | [[Moderation and Fair Play]], [[Auth and Accounts]] | Accepted until slice 9? |
| W-22 | Should CI stop running the frozen Vitest suites, and should `pnpm check` / `pnpm e2e:only` be built now? | [[Checks and Testing]] | Open (Drift F1, F3) |

## Related

- [[Drift Report]] · [[Decision Log]]
- [[Voting Rework]] · [[Review 5]] · [[Review 4]]
