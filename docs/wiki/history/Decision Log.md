---
type: history
title: Decision Log
aliases: [Decisions, User decisions]
tags: [decisions]
status: built
dates: 2026-09-29 to 2026-10-15
commits: []
updated: 2026-10-15
---

# Decision Log

The **user's** decisions, oldest first. Designer and architect answers that the user did not make are left out, except where the user's note asked for the change (marked *asked*). For every rule and number, the GDD wins: follow the link.

"Session notes" means the decision is recorded in the assistant's working notes, not in a repo document.

## Before the first slice

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| by 29 Sep | Rebuild from scratch in vertical slices; remove the v3.0 code (kept in git history) | Old code built for the v3.0 design | [[IMPLEMENTATION_PLAN]] §6; commit `e400bc4` | [[Architecture Overview]] |
| by 29 Sep | **Faction names are parked** (Iron Vanguard / Red Collective / Civic Alliance until the user decides) | — | project `CLAUDE.md` rule 5; [[GDD#Appendix C — Open questions\|Appendix C]] #10 | [[Iron Vanguard]], [[Red Collective]], [[Civic Alliance]] |
| 29 Sep | Run whole slices through the agent team, approving the recommended defaults, and commit each step once verified | Steady progress without micromanaging | session notes | [[Run a Slice]] |

## Slices 0–3 (29–30 Sep)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 29 Sep | **Keep the Collective's crest as it is** | — | [[design/content-policy-review\|content-policy review]]; commit `af7d22e` | [[Red Collective]], [[Art and Maps Pipeline]] |
| 29–30 Sep | Ballots secret at the API but **linkable** for the later audit | The slice-9 audit needs it | [[tech/slice-3\|tech/slice-3]], [[adr/0019-secret-ballot-numbered-box\|ADR 0019]]; session notes | [[City Council and the Rule Vote]], [[Moderation and Fair Play]] |
| 29–30 Sep | The slice-3 playtest uses an admin boost script (`pnpm admin:boost`) | Testers can reach Rank 3 to stand | [[tech/slice-3\|tech/slice-3]]; session notes | [[Dev Panel and Local Setup]] |
| 30 Sep | `pnpm dev:mem` starts the worker | Test hooks work by hand | [[tech/slice-3\|tech/slice-3]] Deviations | [[Scheduled Jobs]], [[Dev Panel and Local Setup]] |

## Reviews 1–3 (30 Sep – 2 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 30 Sep | **A job is a wage**: daily pay, no shift, no Energy | "Why would I work shifts? They pay nothing in XP." | [[Review 1]]; GDD §0 (marked *user decision*); [[design/review-1-answers\|answers §1]] | [[Jobs]] |
| 30 Sep | *asked:* an orders-complete moment with rewards; a modal when Reputation levels up; a Faction XP bar in the HUD; XP to the next level shown | Players couldn't see progress | [[Review 1]] notes | [[Party Orders]], [[Local Standing]], [[Levels and Faction Rank]] |
| 30 Sep | *asked:* explain the stats at level-up (STR, INT and AGI offered) | "How do I know what to choose?" | [[Review 1]] | [[Stats and Checks]] |
| 30 Sep | **Plain words** for players instead of campaign jargon | "The words are too complicated" | [[Review 2]]; [[GDD#1.5 Plain words (review 2)\|GDD §1.5]] | all player text; [[Street Actions]] |
| 30 Sep | **Hide the rolls and the odds maths**; say why when it isn't a success | "Nobody cares… we don't need the details" | [[Review 2]]; GDD §8.4, §13.1a | [[Stats and Checks]], [[The Result Modal]] |
| 30 Sep | Say **Political Capital** in full | "PC is confusing" | [[Review 2]] | [[Political Capital]] |
| 30 Sep | On desktop a place opens **centred**; a playable **phone landscape** layout | Side panel is bad once you pick a place | [[Review 2]] | [[Game Client]], [[Quarters and the Map]] |
| 30 Sep | The map pans only when zoomed in; no free zoom; a tap zooms smoothly to the place (**reversed 2 Oct**) | The map was "extremely shifty" | [[Review 2]] | [[Quarters and the Map]] |
| 1 Oct | **More city to play in**: cities that grow with places for later levels, more distance between cities | — | GDD §0 (1 Oct, city quarters); [[design/city-quarters\|city-quarters]] | [[Quarters and the Map]] |
| 2 Oct | **One painted picture per city** (the stitched model); quarters and districts are frames on it | Instead of seams between quarter images | GDD §0 (maps v3); Appendix C #39 | [[Quarters and the Map]], [[Art and Maps Pipeline]] |
| 2 Oct | Journey times stay **12 / 12 / 15 / 25** min, not the painted distances | — | [[design/slice-4-battleground\|slice-4 design]]; Appendix C #8 | [[Travel and Journeys]] |
| 2 Oct | The nation map **fills the screen** on a phone | Consistency with the city maps | Appendix C #42 | [[Travel and Journeys]] |
| 2 Oct | Home-city **station quarters later**, not in slice 4 | — | slice-4 design; [[design/city-quarters\|city-quarters]] §2.3 | [[Quarters and the Map]] |
| 2 Oct | **Clouds and fog** drifting over the city maps, on for the three home cities | "For a nice vibe" | [[design/maps-v3-integration\|maps-v3-integration]] | [[Weather]], [[Art and Maps Pipeline]] |
| 2 Oct | **Free zoom** on the city map is allowed (reverses review 2) | "Let the user zoom in if he wants" | [[Review 3]]; GDD §14.13 | [[Quarters and the Map]] |
| 2 Oct | *asked:* ease-in place sheets; no bulky XP boxes; no bare Energy number on buttons; not *TRAIN*; an election screen on the hall's picture that explains players vs locals | Pop-in, clutter and confusion | [[Review 3]] | [[The Result Modal]], [[City Council and the Rule Vote]], [[NPC Fill]] |

## Slice 4–5 and the review stop (3–5 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 3 Oct | **The district lock**: the Irongate overview shows only district outlines and names; inside a district you are held to it | Districts should feel like places; no field of pins | [[design/slice-4-screens\|slice-4 screens]]; GDD §0 (3 Oct) | [[Capital Districts]], [[Irongate]] |
| 3 Oct | **The ground sash**: a faction-colour band on a place's picture saying **whose ground** it is | — | [[design/slice-4-screens\|slice-4 screens]] | [[Influence and Opinion]] |
| 3 Oct | The team may **decide small points itself** | — | [[design/slice-4-battleground\|slice-4 design]] §19 | process |
| by 5 Oct | Build slices back to back, but **stop after slice 5** for a review | — | [[review/review-4-guide\|review-4 guide]]; session notes | [[Run a Design Review Round]] |
| by 5 Oct | **No hosting until the end** of the project; work and playtest locally | — | [[review/review-4-guide\|review-4 guide]] §6 ("your instruction") | [[Slice 9 Launch Readiness]], [[Art and Maps Pipeline]] |

## Review 4 (6–7 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 6 Oct | **Replace the deathbed intro**: a better opening ending in a party and its orders | "Really bad" | [[Review 4]] note 2 | [[Coming Home]] |
| 6 Oct | *asked:* distinct faces; a **clock** on screen; Health always shown; rank names and unlocks | Time-dependent game with no clock | [[Review 4]] | [[Time and the Game Day]], [[Health]], [[Levels and Faction Rank]] |
| 6 Oct | **Travel happens on the nation map**, a pin moving along the route with encounters on the way | — | [[Review 4]] note 7 | [[Travel and Journeys]] |
| 7 Oct | **The traveller is a plain moving pin, not a train**, along roads or rails | — | commits `d2ceee6`, `a0e2116`; [[design/review-4-answers\|answers §7]] | [[Travel and Journeys]] |
| 6 Oct | **Irongate's districts cover the whole map** | Parts were in no district | [[Review 4]] note 8 | [[Capital Districts]] |
| 6 Oct | **A place on the map for the council**, showing members and the rules in force | Rules were invisible | [[Review 4]] note 11 | [[City Council and the Rule Vote]] |
| 6 Oct | **Home cities have no district-like outlines**; grey out locked places | Only Irongate has districts | [[Review 4]] note 21 | [[Home Cities]], [[Quarters and the Map]] |
| 6 Oct | **Prison must have repercussions** (built as three costs that take nothing owned) | "Only lost Heat and 40 Iron" | [[Review 4]] note 20 | [[Jail and the Cells]], [[Heat and Record]] |
| 6 Oct | *asked:* a list of everyone in prison; keep the duty officer's lines; **never tell the player to close the game** | — | [[Review 4]] notes 15, 16, 19 | [[Jail and the Cells]] |

## Review 5 (8–10 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 8 Oct | Opening round 1 not taken: **a premise unrelated to the father** | — | GDD §0 (review 5); [[design/review-5-answers\|answers §1]] | [[Coming Home]], [[Ambitions]] |
| 8 Oct | Opening round 2 (D, E, G) **rejected** | "None of the stories make any sense" | [[design/review-5-answers\|answers §16.2]] | [[Coming Home]] |
| 8 Oct | **Round 3, *Coming home*, confirmed**: the demobilisation office counter | — | GDD §7.1; Appendix C #103 | [[Coming Home]], [[Ambitions]] |
| 8 Oct | **Rival ground header and the Unrest prize** approved as proposed | Make the danger and the point visible | [[design/review-5-answers\|answers §10]]; Appendix C #102 | [[Hostile Ground]], [[Influence and Opinion]] |
| 8 Oct | **A six-hour game day** (option B): night the last two hours of every six, the same for everyone; daily rules stay on the real day | More day and night | [[design/review-5-answers\|answers §11]]; Appendix C #100 | [[Time and the Game Day]], [[Night and Patrols]] |
| 8 Oct | **Night missions and patrols** on rival ground approved, with the patrol stop **made random** | — | [[design/review-5-answers\|answers §12]]; Appendix C #101 | [[Night and Patrols]], [[Missions]], [[Run-ins and Combat]] |
| 8 Oct | *asked:* bigger clouds; Health under Energy; a journey card you can't skip; heal at any infirmary for money; a "what's here" list; jobs that pay more when they ask more | — | [[Review 5]] notes | [[Weather]], [[Health]], [[Travel and Journeys]], [[Hospital and Treatment]], [[Jobs]] |
| 8 Oct | **No unit tests for now**: cached checks, targeted Playwright per phase, the full e2e once per round | Each fix took too long | [[tech/review-5\|tech/review-5]] (decisions); session notes | [[Checks and Testing]] |

## Voting rework (10–12 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 10 Oct | **Vote on the rule, not on people**: three rule cards, one tap; the winner runs the city five days | "Overwhelming… I want it easier to understand" | [[design/voting-simplified\|voting-simplified]]; GDD §0 (10 Oct) | [[City Council and the Rule Vote]], [[Ordinances]] |
| 10 Oct | Members' votes **out of the seat count**; seats by reputation + backers | A voter can't be given a reason to prefer one name | Appendix C #105 | [[Offices]], [[NPC Fill]] |
| 10 Oct | **No backers needed to stand**: 10 Political Capital, spent | The two-backer gate carried six concepts | Appendix C #106 | [[Political Capital]], [[Offices]] |
| 10 Oct | **The capital's rule is the largest bloc's**; parties sharing a card add up | A rule always runs | Appendix C #107 | [[Capital Districts]], [[Clearwater]] |
| 12 Oct | The QA agent runs on Sonnet 5.5 | — | commit `ddf4f6b` | [[Checks and Testing]] |
| 12 Oct | Delete and trim the old voting Vitest files | — | session notes | [[Checks and Testing]] |
| 12 Oct | No designer wording stop between build phases; brief QA narrowly with a time box | Rounds took too long | session notes | [[Run a Design Review Round]] |

## The wiki and the drift cleanup (14 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 14 Oct | **A project wiki** in `docs/wiki/`, with `docs/` as the Obsidian vault, modelled on zeus-brain; agents read it first and update it after every piece of work | One map of the project instead of re-reading the GDD | [[log]]; project `CLAUDE.md` | all |
| 14 Oct | **Bodyguards, Legacy perks and bar buffs/services are in the MVP**, not built yet (placed in slice 8) | — | [[Drift Report]] B19–B21; GDD §25; plan | [[Bodyguards]], [[Legacy]], [[Buffs]], [[Bars]], [[Slice 8 A Life in the City]] |
| 14 Oct | **Faction-only places** (Vanguard House gym, Underground Press, Alliance-only Press Club) are **built later**, after the MVP | — | [[Drift Report]] C4; GDD §16.1 | [[Iron Vanguard]], [[Red Collective]], [[Civic Alliance]] |
| 14 Oct | **CLAUDE.md slimmed**: what the wiki covers (current state, stack details) became pointers; the rules every session needs stay | "If we don't need it because we have the brain, remove it" | project `CLAUDE.md` | — |

## Review 6 (15 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 15 Oct | **The journey trail is a dotted line with rounded bends**; the pin rides the same path | "Make it dotted, without sharp turns" | [[review/2026-10-15-review-6\|review-6 notes]] #3 | [[Travel and Journeys]] |
| 15 Oct | Fix the nation map held sideways so every city comes fully into view, **keeping the locked map** with zoom-to-place | Only a sliver of Clearwater or Ashford showed on an iPhone SE | [[review/2026-10-15-review-6\|review-6 notes]] #1 | [[Quarters and the Map]], [[Travel and Journeys]] |

## Slice 6 go-ahead (15 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 15 Oct | **The seven slice-6 defaults approved as written**: hands at Rank 1; the fixture resolves at the day's turn; no Iron from events; event Political Capital halves after the first of the day; visits from anywhere but rival ground; the Headline Story without a Case File until slice 8; chat with mute and report only (full moderation in slice 9). No number moves; the build starts | — | [[design/slice-6-together\|slice-6 design]] §19; GDD §0 (15 Oct); Appendix C #57, #59, #60, #89 | [[Campaign Events]], [[Chat and Presence]], [[Patronage and Favours]], [[Political Capital]], [[Slice 6 Together]] |

## Slice 6 wording rulings (15 Oct, the designer; the user's review-2 rule applied)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 15 Oct | **The Doorstep Drive with three Door-knockers** replaces *Canvass Drive* / *Canvasser*; ids unchanged; the e2e sweeps' allowance goes | §1.5 bans *canvass* for players; review 2's *Canvasser* → *Campaigner* is the precedent | [[design/slice-6-together\|slice-6 design]] §22 #9; GDD §0 (15 Oct), §16.3 | [[Campaign Events]], [[Slice 6 Together]] |
| 15 Oct | **A swing prints to two decimals trimmed (+0.83, +0.8, +1); a share to one decimal.** The event result stays; the paper's row trims | A hand's quarter point on a four-way split must still read | [[design/slice-6-together\|slice-6 design]] §22 #10; GDD §14.2 | [[Campaign Events]], [[Influence and Opinion]] |
| 15 Oct | **Phase B's two defaults confirmed:** an event's swing does not write the morale record; *event-city* prints only for a reader on no event yesterday | At most a day's delay on an unprinted record; no two event lines in one paper | [[design/slice-6-together\|slice-6 design]] §22 #11–12 | [[Campaign Events]], [[The Morning Paper]] |

## Slice 7 go-ahead (15 Oct)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 15 Oct | **The seven slice-7 defaults approved as written**: one office at the top, the President; the secretary always on the Chair's ballot and the party's own figure on every pick; a petition dissolves the council, no snap election; the secretaries table bills where no player sits; Clearwater's baseline evened to 22 / 22 / 22 / 34; The Front's four places as later pins until slice 8; several offices at once. No number moves; the build starts | — | [[design/slice-7-nation\|slice-7 design]] §21; GDD §0 (15 Oct), Appendix C #64, #65, #66, #68, #70 | [[Offices]], [[National Elections]], [[The Legislature and Laws]], [[Recall and Removal]], [[Clearwater]], [[NPC Fill]], [[Slice 7 The Nation]] |

## Slice 7 phase A settled (15 Oct, the designer)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 15 Oct | **One Collective ballot at the baselines seats 21 / 20 / 19**, not 20 / 20 / 20: D'Hondt on the exact scores, the last seat on the draw; the build stands, the design example is corrected | the example was arithmetic, not a rule | [[design/slice-7-nation\|slice-7 design]] §6.3 and *Settled 15 Oct 2026 (phase A)* | [[National Elections]] |
| 15 Oct | **A first-term councillor is never Governor**: a bloc with no qualified player and no seated local gives the chair to its top unseated local from the slate, marked *Local*; `governorOf`'s fallback to the top seated player is dropped | a Governor term qualifies for the list; the ladder would skip a rung | [[design/slice-7-nation\|slice-7 design]] §3.1, *Settled 15 Oct 2026 (phase A)* #3 | [[Offices]], [[Capital Districts]], [[Clearwater]] |
| 15 Oct | The three trimmed alt texts (Albrecht, the Town Hall, the study) and the portrait crops (`top: 40`) and full-frame scenes confirmed against the pictures | — | *Settled 15 Oct 2026 (phase A)* #2, #4; `packages/content/src/data/art.ts` | [[Art and Maps Pipeline]] |
| 15 Oct | The *The Front* and *ballot* vocabulary allowances go to the Playwright sweeps in T30; the Vitest guards stay unrun and untouched | the user's no-unit-test rule | *Settled 15 Oct 2026 (phase A)*, vocabulary note | [[Checks and Testing]] |

## Review 7 (15 Oct, Notion Design Review 4)

| Date | Decision | Why (if stated) | Where recorded | Systems |
|---|---|---|---|---|
| 15 Oct | *asked:* **the word filter brought forward** from slice 9: slurs and real-world hate **refused** (*That can't be said here.*), ordinary swearing **masked** as *b—*; names refused on either tier; the lists on the server, never in content | "Chat needs a profanity filter" | [[Review 7]]; [[design/slice-6-together\|slice-6 design]] §23.1; GDD §16.2 | [[Chat and Presence]], [[Moderation and Fair Play]] |
| 15 Oct | *asked:* **the invite names the event** (*Invite to the rally · 19:40*), hidden when there is nothing to ask; the chat line carries the venue | "Ask to join… ask to join what?" | [[Review 7]]; [[design/slice-6-together\|slice-6 design]] §23.2 | [[Chat and Presence]], [[Campaign Events]] |
| 15 Oct | **The Faction tab is direction A, *the Branch Office***, with the designer's defaults: the plate scrolls away and the strip stays sticky; words only; the faction colour an accent only; the rank title kept; the Vanguard plate `scene.vanguard-office`; sideways phones drop the plate | "Black on black, you can't tell the tabs apart" | [[Review 7]]; `design/faction-tab-redesign.md` §5; [[design/slice-6-screens\|screens]] §2 | [[Chat and Presence]], [[Campaign Events]] |
| 15 Oct | **The refuse list: keep *dyke*, unblock *Reich* (whole word and *third reich*), add no communist-era names**; Hitler and the rest stay | — | [[Review 7]]; `apps/server/src/moderation/lists/refuse.ts` | [[Moderation and Fair Play]], [[Chat and Presence]] |

## Related

- [[Open Questions]] · [[Drift Report]]
- Rounds: [[Review 1]] · [[Review 2]] · [[Review 3]] · [[Review 4]] · [[Review 5]] · [[Voting Rework]] · [[Review 6]] · [[Review 7]]
