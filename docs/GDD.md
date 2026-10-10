# Irongate City — Game Design Document v3.1

*A political, text-driven browser RPG*

| | |
|---|---|
| **Version** | 3.1 (draft) |
| **Supersedes** | v3.0 (`Irongate_City_GDD_v3.docx`, 13 Mar 2026) |
| **Last updated** | 4 Oct 2026 |
| **Status** | For internal development use |

---

## 0. What changed in 3.1

v3.0 described many systems but never the experience of playing them. v3.1 designs the session and the reasons to return, fixes the parts of the rules that punished players, and opens politics to every player instead of one per month.

| Problem in v3.0 | Change in 3.1 | Section |
|---|---|---|
| No session design: nothing said what a player does on login | Session Loop, the **Morning Paper**, and agendas | §3 |
| Most return hooks were punishments (hunger, fatigue, losing your job after 6 h away, bodyguards dismissed at midnight) | Rule: **absence costs opportunity, never assets.** Hunger and fatigue removed; replaced by **Well-Fed** and **Rested** bonuses. Jobs pay a salary; bodyguards are prepaid contracts | §4, §6, §9, §12 |
| Politics reached one player per month; nothing happened if no faction hit 55 % | A **political calendar**: city councils every 5 days, a Legislature that always sits, a Chancellor when there's no majority, and ministers. About 110 offices | §15 |
| A player's contribution was invisible | **Influence Ledger**, **City Hero** titles by level bracket, and your name in the Morning Paper | §14.5 |
| Dominant factions could steamroll | Controlling a city grants *access*, never reward multipliers. **Battleground** and **Groundswell** bonuses go to contested cities and to the side that just lost | §14.4 |
| FXP lagged far behind XP, and the pacing was never written down | FXP rates set per tier and explicit pacing targets. (A first draft moved candidacy to Rank 5 in week 4; the office ladder below replaces that.) | §5 |
| Missions paid less Iron than upkeep cost | No mandatory upkeep. Iron sinks are optional acceleration. Iron rates set per tier | §18 |
| Time units didn't add up (a 2-hour "in-game day"; four one-month seasons making a "3-month year") | **One City Day = one real day.** A 12-week **Political Season** is one in-game year, made of four 3-week weather seasons | §2 |
| The faction's +10 starting bonus made the origin story's +3 choices meaningless | Faction starting bonus cut to **+3** | §7 |
| No social layer until v1.1; Torn's experience says solo players quit | Faction chat, location presence, **Campaign Events** with roles, and **Party Directives** move into MVP | §16 |
| War vocabulary ("fronts", "uprisings") crept into the design | This is a political contest. The core verbs are campaign verbs: canvass, rally, speak, endorse, expose, strike, march | throughout |

**Added 28 Sep 2026:**

| Problem | Change | Section |
|---|---|---|
| The capital, worth 30 % of the nation, was a single opinion meter | Irongate is split into **five districts**, each with its own opinion, control and council seats | §14.9 |
| Travel was instant and cost Energy, so distance meant nothing | Cities are farther apart. **Travel takes real time** by train or car, costs a ticket instead of Energy, and has **journey events** along the way | §14.10 |
| Every mission risked becoming a multi-step scene, and needed art | **Three tiers**: one-tap actions (~80 %), one-choice missions (~15 %), multi-step stories (~5 %). **Local Standing** rewards repetition. Art comes from a reusable fallback ladder, never per mission | §13 |
| Every kind of play was unlocked by day 3, so the game felt finished in a week | Unlocks and power are spread over months: an **office ladder** where you must serve in the rung below before standing for the next; slower pacing; long collections (standing in 5 cities, patrons, homes) | §3.6, §5, §15.1, §17.4 |
| The odds shown on buttons had no defined maths, and combat had no numbers | **One check formula** for everything (50 % + 4 % × (stat − difficulty) + bonuses), stat growth targets, and combat as one choice with power, AGI, Wits and bribe values per opponent | §8.4, §8.5, §20 |
| All five cities were fought over in the same way, so the conflict was spread thin | **Home cities and battlegrounds**: each faction starts in, and permanently holds, its home city. Irongate and Clearwater are where power is won (70 % of the national weight). Rival home cities are dangerous ground for spies | §7.4, §14.1, §14.8, §14.11, §14.12 |

**Added 29 Sep 2026 (slice-0 answers):**

| Problem | Change | Section |
|---|---|---|
| Level brackets existed but no per-level thresholds, so level-ups couldn't be built | A **per-level XP table** (levels 1–51, then a formula) inside the existing brackets | §5.3 |
| Half rewards, roll boundaries and part-Rested actions were left to interpretation | **Rounding** (nearest whole, halves up, per line) · a roll **at or below** the shown chance succeeds · Rested applies **per Energy point**, so a 3-Rested, 10-Energy action gets +15 % | §5.5, §6.3, §8.4 |
| Political actions "moved opinion" with no number and no source | **Opinion swing** per tier (tier 1: 0.005 points per Energy, so a 10-Energy canvass is +0.05), drawn from the Neutral pool first; floors and precision; city **baselines** | §14.2, §14.11 |
| No canonical new character for tuning | The **reference recruit** (Collective, STR 10 / INT 12 / AGI 5 / CHA 2) and a 10-Energy canvass as the reference action | §8.5, §13.3 |
| The art fallback ladder had no fixed list of place kinds | **Location kinds** (a closed list) as the art key | §13.5 |

**Added 29 Sep 2026 (slice-1 design):**

| Problem | Change | Section |
|---|---|---|
| The day boundary, the "Today" tally and day/night were undefined | **00:00 UTC** is the City Day for the MVP; a **Today tally** resets there; the map's night art shows 20:00–06:00 UTC and is cosmetic | §2, §2.2, §3.7 |
| Rank 2 (500 FXP) could not be reached by day 2 at the §5.5 rates | **Rank 2 lowered to 400 FXP** | §5.4 |
| Training, job shifts, ×3, Standing thresholds and Directive rewards had no exact rules | Training always succeeds and pays half-rate XP · shifts are not checks · streak and sick-day formulas · three jobs' pay pinned · ×3 rules · Standing at 10/30/70/150 · Directives +25 % FXP, +20 FXP per order, +5 PC for all three, refreshed at 00:00 UTC | §8.5, §9, §13.1, §13.3, §13.4, §13.7, §15.4 |
| No NPC party secretary or Morning Paper v1 spec | **Petra Holm** sets the Collective's Directives until a Chair exists; per-city mastheads (*The Coalport Clarion*) | §13.7, §3.3 |
| The economy was never written down | `docs/economy.md`, checked against §5.2 | §5.2 |

**Added 29 Sep 2026 (answers to the slice-1 tech design, `docs/design/slice-1-content.md` §12):**

| Problem | Change | Section |
|---|---|---|
| Half pay accrued without limit, so a season away paid a jackpot | A return credits **at most 14 half-pays**; the job is kept and pay resumes at the next boundary | §4.2, §9.1 |
| The Collective's Rank 5 title was "Vanguard", the rival faction's name | Rank 5 Collective title is **Delegate** (no faction renamed) | §5.4 |
| Batch text, sick days at streak 0, Rested on shifts, the +25 % after completion and the dateline were unspecified | Batch narrative by **majority**; sick days spent only while a streak runs; Rested untouched by shifts and switches; the +25 % only on open orders; *Take a job* completes on taking; dateline `{Weekday} · {D Month} · {City}`, no year | §3.3, §6.3, §9.1, §13.1, §13.7, §15.4 |

**Added 29 Sep 2026 (QA fix round 1, `docs/design/slice-1-content.md` §13):**

| Problem | Change | Section |
|---|---|---|
| ×3 training cost 126–138 Energy for the reference recruit, more than the bar ever holds, so the button could never be pressed | **Training has no batch**: ×1 only. Job shifts likewise. The cost per point is unchanged | §8.5, §13.1 |
| §4.3 rule 2 ("one missed day can never break a streak") contradicted §9.1 (the third miss in a week ends it) | §4.3 rule 2 reworded to match §9.1: a single miss never breaks it, sick days cover two, the third ends it | §4.3 |
| "2–3 lines" of narrative had no measure, and phones wrap the texts to 4–6 lines | Pinned: an outcome text is **at most 240 characters and four sentences** (about 45 words) | §1.2 |

**Added 29 Sep 2026 (slice-2 design, `docs/design/slice-2-onboarding.md` and `slice-2-cities.md`):**

| Problem | Change | Section |
|---|---|---|
| The origin answers could stack to +8 on a stat while §8.5 said "up to +5" (Appendix C #12) | **Stacking accepted and stated**: 8–9 points counting CHA base, at most +8 to one stat, CHA base up to +4; the reference recruit unchanged and fully specified; the dialogue laid out as a three-step story | §7.2, §8.5 |
| The coat's three effects, the faction screen and the first ten minutes were unspecified | Coat: CHA 5 · +150 Iron · keepsake with +1 CHA base. The faction cards and the wish tag. **§7.5 The first ten minutes**: the welcome edition, the first landing with the first pin's sheet open, a fixed **welcome set** of Party orders on the first City Day | §7.2, §7.3, §7.5, §13.7, §3.3 |
| Ambitions had no chapter rules | A chapter is a **three-step story that never fails**; chapter 1 at difficulty 8 for 10 Energy, delivered as a Letter on day 1; seven days between chapters; *Finish His Work* built first (Appendix C #6) | §17.1 |
| No item catalogue, so "Charisma is worn" had nothing to wear | **§21.4**: Tier I outfits per faction at CHA 2, the father's coat at 5, party card, keepsakes; CHA base 0–4 | §8.2, §21.2, §21.4 |
| Duskwall and Ashford had no content, secretary or paper | Six locations each against the kinds; **Viktor Stahl** and **Thomas Grey**; *The Duskwall Sentinel* and *The Ashford Gazette*; baselines pinned; Stores hand and Copy clerk jobs | §3.3, §9.2, §13.5, §13.7, §14.11 |
| The Alliance's Rank 3 title was *Councillor*, the office the rank lets you stand for | Rank 3 Alliance title is **Agent** | §5.4 |
| §16.1 described the Vanguard with a phrase that could leak into copy | "national purity" → "the nation above all" (itself replaced by "a strong hand at the top" in the content-policy review below); the Vanguard review checklist lives in the onboarding doc §5.3 | §16.1 |

**Added 29 Sep 2026 (answers to the slice-2 tech design, `docs/design/slice-2-onboarding.md` §13):**

| Problem | Change | Section |
|---|---|---|
| §7.2 and §8.5 said the origin gives "8–9 points across STR, INT and AGI" and a best stat of "10–16", but two answers pay CHA base instead, so the build (which follows the answer table) gives **6–9** trained points and a best stat as low as **8** | **The table stands; the sentences are corrected**: 6–9 points across STR/INT/AGI (8–9 counting CHA base), at most +8 to one stat, CHA base 0–4; best stat **8–16, typically 11–14**; the flattest build named and accepted | §7.2, §8.5, Appendix C #12 |
| The chapter hook, the Today tally and origin taps were left to the build | The next-chapter hook names a **date** (seven City Days on) · a chapter counts its Energy, XP, FXP and Iron in *Today* but no attempt or win · an origin answer is **final once tapped** · the chapter's third stamp reads *Failure* and nothing else says "failed" | §7.2, §17.1 |

**Added 29 Sep 2026 (content-policy review, `docs/design/content-policy-review.md`):**

| Problem | Change | Section |
|---|---|---|
| Vanguard content carried military and real-world echoes (military rank titles, the *Torchlight March*, "a paramilitary movement", a garrison as the home pin, a chalked symbol with a slogan, "the nation above all"), and the Collective's *Commissar*, *Comrade-General*, *Red Guard* and *People's Commissar* were real-world names; "enemy", "uprising", "conscription", "martial law", "purge" and "raid squad" were war framing | The Vanguard is **an authoritarian nationalist party, not a militia**: ranks **Initiate / Steward / Bailiff / Prefect / Intendant / Guardian / Keeper of the Gate**; its event is the **Grand Rally** (Speaker, Stand-builder, 2 Stewards, Lookout; mechanics unchanged); its exclusive location is **Vanguard House** (kind `gym`); Duskwall is a **frontier customs town** (Fortress Gate `ministry`, the Customs Market) and its patron is **Commissioner** Reinholt; the wish is *Order. Somebody has to keep the streets quiet.*; chalking is words (*ORDER AND BREAD*), never a mark. Collective ranks **Convenor** and **Tribune**; opponents *Vanguard Doorman*, *Strike Picket*, *Branch Inspector*; *Emergency Permits Act*; *Clear out the rot*; Season Twists *Direct Rule in Duskwall* and *The Upset*; "rival" for "enemy" everywhere, "opponent" in combat. Faction names and the ideology labels untouched (naming stays parked) | §5.4, §7.2, §8.2, §8.4, §9.2, §12.1, §13.5, §14, §15.8, §16.1, §16.3, §17.2, §20.2, §21.2, §22.3, §26, Appendix C #7 |

**Added 29 Sep 2026 (slice-3 design, `docs/design/slice-3-politics.md` and `slice-3-screens.md`):**

| Problem | Change | Section |
|---|---|---|
| The council calendar had a clock time ("nominations close at 12:00") and a one-day poll, and "the first vote on day 2" could not be kept by any staggered calendar | A **five-day cycle per city from the day key** (offsets Irongate 0 · Ashford 1 · Coalport 2 · Duskwall 3 · Clearwater 4): **two days of nominations, three days with the polls open, the count at the boundary**; no clock times. Rank 2 on day 2 is the right to vote; **the first ballot lands by day 4** | §2, §3.6, §5.2, §15.3 |
| The home-city race had no count rule, and "endorsed by 2 faction members" was impossible for a branch of one | **Total = ward vote (Standing Successes ÷ 5) + 3 × endorsements + members' votes**; seven seats; ties by votes, endorsements, standing, filing. Endorsements cost 10 PC, one per member per cycle; **the branch endorses a filed candidate who does the day's orders**; in a branch with fewer than three other endorsers the branch's endorsement counts double | §15.3, §15.10, §6.5 |
| "Voters need 7 days in their faction" contradicted the day-2 vote | Tenure applies **after a faction switch** (7 days to vote, 14 to stand); a new member votes at Rank 2. Council results are final at the count in the MVP | §15.2 |
| NPC fill had no slate, no marking and no rule for a council of one party | **Nine NPC candidates per faction** (named, in the faction's voice) fill the slate to nine names; NPCs are **marked** (*ward*); NPC councillors vote with the player majority, else the branch's motion; they abstain during Unrest | §15.10, Appendix C #3 |
| Councillors had nothing to do in slice 3, and the ordinance list touched systems that don't exist yet | **The order paper**: the branch's motion plus up to three proposals (20 PC each); one-tap vote on the first two days of the term; passes with four of seven; **in force for five days, one per city**. A **menu of ten home-city ordinances** with bounded effects on jobs, Energy costs, swing, training, Rested, Standing, Iron and FXP. Stipend **10 PC and 20 FXP** a day | §15.1, §15.3, §6.5 |
| Morale states had no inputs and *Fired up*'s +5 % rounded to nothing at tier 1 | Inputs: the drift toward 70 (2 % of the distance a day, built now), +0.5 per ballot, +2 per player seat, −3 per election nobody voted in. ***Fired up* is +10 % Faction XP at home**; *Unrest* swaps two Party orders for *Restore the base* at +40 FXP and makes NPC councillors abstain | §14.2, §14.11, Appendix C #16 |

**Added 29 Sep 2026 (QA slice 2, `docs/design/slice-2-onboarding.md` §14):**

| Problem | Change | Section |
|---|---|---|
| §7.5 said PC "appears in the HUD" but the build hid it on phones, where slice 3 makes it the price of every political button | **The HUD shows PC on every screen size once it is above 0**; never a zero; the Me tab carries the full name and, from slice 3, the sinks. Not on the city plate | §6.5, §7.5 |
| A name of spaces passed sign-up and became a hard-coded *Comrade* in every faction's paper | **The name is 2–40 characters after trimming**, refused otherwise at sign-up; the only fallback (accounts made before the rule) is the neutral *A Newcomer*, from content | §7.3 |
| The Paper tab's dot for a ready Letter was specified as "not yet opened" and built as "while ready" | **While ready** is the rule: the dot stays until the chapter is played | §17.1 |

**Added 29 Sep 2026 (answers to the slice-3 tech design, `docs/design/slice-3-politics.md` §17):**

| Problem | Change | Section |
|---|---|---|
| The count's edge cases were left to the build: when the ward vote is read, who counts as *eligible* for turnout, what a tie-break loss says, how NPCs are labelled and tie, whether *Against all* can block | The ward vote is read **at the count**; turnout's *eligible* is **resident Rank 2+ members active in the last seven days** (the same roll as the small-branch rule); a loss on a tie-break gets its own headline; an NPC's standing is `profile × 5` for the label and the tie; ***Against all* is a recorded vote, never a preference NPCs follow**, so the branch's motion passes when every player councillor votes against; the branch's endorsement lands on any nominations day on which the candidacy is filed and the orders are done, whichever came first | §15.3, §15.10, Appendix C #26 |
| The seat's front page showed only on the count morning, so a winner who opened the game a day later never saw it | The front page shows on **the first edition the winner opens during the term** | §3.3 |
| Pay bonuses and streak milestones under ordinances were ambiguous | The streak bonus and an ordinance's pay line are **each a percentage of the unmodified daily pay**; the salary at a boundary uses the ordinance in force on the day that ended; **streak headlines fire on crossing** (first at or past 5 / 10); a cost ordinance changes the cost only | §9.1, §15.3 |
| Chapter 2 of *Finish His Work* had a teaser and no script | ***Stand where he stood*** is written (`slice-3-politics.md` §17.7): unlocks **after the first ballot**, difficulty 14, 15 Energy, Success 300 XP / 80 FXP / 150 Iron, keepsake *His election bill*; chapter 3 is *The deposit* at Rank 3; the other two Ambitions' chapter 2 arrive with slices 5 and 8 | §17.1, §21.4 |

**Added 29 Sep 2026 (slice-4 design, `docs/design/slice-4-battleground.md` and `slice-4-screens.md`):**

| Problem | Change | Section |
|---|---|---|
| Travel had four classes, cancellation, presence and events that used Heat and the Dossier, none of which exist in slice 4 | **Slice-4 travel:** third class only (20 Iron; never below 5 under the Tram Subsidy or the Tram Fare Hike), from Level 10, to Irongate and your own home city (rival homes and Clearwater locked on the map); the train **leaves at the tap** and arrival is settled lazily; political acts of your residence work from anywhere, Energy actions only where you are; the **first journey always carries a card**, then one in three; **seven journey cards** that use only slice-4 systems | §14.10 |
| The capital's districts had no pins, and the Government Quarter and Garrison Hill listed an opera in the wrong district, an old barracks and a parade ground | **Five districts pinned** on one image (`irongate-districts.png`) with five crops: 29 locations, 62 tier-1 actions at difficulty 10, three jobs (Porter 180, no faction fifth); the opera in the Government Quarter; **police headquarters (the old citadel), the Esplanade and the villas** on Garrison Hill; a `theatre` kind; HQ actions members only | §14.9, §13.5 |
| Battleground, Groundswell and the battleground drift had words but no evaluation rule | **At the boundary:** a district is a battleground when its top two shares are within 10; political actions there get +25 % swing, +25 % FXP, +5 % chance. **Groundswell** when control (above 50) is lost between boundaries: +5 % a day to +30 %, 14 days. **Drift 1 % of the distance to the baseline** a day, with Neutral as the counterparty | §14.2, §14.4 |
| Moving to a battleground had a price and no rule | **Residence:** Rank 2, standing in the district, **500 Iron both ways, seven days between moves**; the vote from the first poll that opens after registering; a home candidacy withdrawn and a home seat vacated at the move; job, Standing, Iron, rank untouched; **no rent**; an optional **room** (100 Iron, 7 days, Rested cap +50) | §14.11, §18.3 |
| "50 % votes + 50 % influence" gave two ballots both seats of a district at low population | **The turnout weight:** the ballot half is worth its full 50 % from ten ballots, five points per ballot below; D'Hondt for two seats; ties by ballots, opinion, a seeded draw; **any resident may vote for any name** on the district ballot; residency at polls-open. **Ten NPC candidates per faction, two per district** (profiles 28 and 20). **Three branch motions, six of ten to pass**, NPC councillors follow their own faction's player councillors | §15.3, §15.10, Appendix C #2 |
| Issues had no draw, tags, momentum unit, resolution moment or slice-4 effects | **Slice-4 Issues:** the Monday draw (two per city, never last week's, different districts in the capital); `feeds` matches; **momentum = the action's Energy, half on Partial**, public; **Sunday resolution only**; +3 to the district, a headline, **4 PC each** to the top five; one bounded effect per Issue on an existing number, the stance as flavour; a deck of nineteen | §14.6 |
| The ledger and City Hero had no rows, no minimum and no reward shape | **Ledger rows** for every swing; the plate line; **District Hero** per district and level bracket at the count, at **+0.5 or more**: the title for a cycle, 25 PC, In Print | §14.5 |
| Party orders for a capital resident matched home locations | A **capital rotation** per faction; `cityId: 'home'` resolves to the residence; the Unrest crisis pair only for home residents | §13.7 |

**Added 30 Sep 2026 (review 1, the user's first play-through; `docs/review/2026-09-30-review-1.md`, answers in `docs/design/review-1-answers.md`):**

| Problem | Change | Section |
|---|---|---|
| A job shift cost Energy and paid no XP, so there was no reason to work it (user decision) | **A job is a wage:** full daily pay at every boundary, automatically; no shift, no Energy, no ticket. The streak and sick days go; **seniority** (+2 % a day held, to +20 % after ten days; reset only by switching) replaces them. Switching is free. The 14-day cap on return stays. *Shift Hours Order* becomes the **Long Service Order** (seniority ×2) | §9, §4.2, §4.3, §3.7, §15.3 |
| A Vanguard recruit with INT 5 met the welcome set's INT committee, an INT chapter and nine INT checks of fifteen at 38 %, against the 60–85 % band | **The first day is played on your best stat:** the welcome set's slot A is chosen by the player's best trained stat (per city, per stat); **council sessions and a third chapter-1 approach, *Legwork*, check the best trained stat**; a ***First day* +10 %** bonus on home checks during the welcome day (the creation day, and the next when created after 22:00 UTC, which closes Appendix C #18); **every ticket names its stat** before the tap | §7.5, §8.4, §13.3, §13.7, §17.1 |
| Order titles (*Be at the gate*) did not say what to do or where | Every order title is **what to do and where** (*Canvass the customs shift at the Fortress Gate*); the line keeps the secretary's voice; tapping an order opens its pin with the ticket highlighted. All templates rewritten | §13.7 |
| The check breakdown was unreadable | **One plain sentence by default** (*Your INT 5 is 3 below the 8 this needs: 38 %*) and a one-line roll; the ledger behind a tap, reworded, with a fixed footnote | §8.4 |
| Standing, the share bar, the HUD and the Today tally were unexplained | **Tap the label**: dotted-underlined labels open a two-line note in the paper's voice; no icons; one first-time hint on the plate on the welcome day | §3.7, §7.5 |
| Completing the three orders was a line | **A modal in the secretary's voice** after the completing result is closed (+5 PC and the day's order FXP); a single order is a signed line in the result modal | §13.7, §15.4 |
| The level-up offered STR or INT with no explanation | **STR, INT or AGI**; the choice screen says what each stat does in the residence city, computed from its actions | §5.3, §8.5 |
| Faction XP was only on the profile | A **Faction XP bar to the next Rank in the HUD**, under the XP bar, labelled with the rank title | §5.4, §7.5 |
| A Standing level-up said nothing | A **Standing card** in the result modal: the new title, the bonus now, the next level. ***One of Us* pays 1 PC a day** (pinned) | §13.4, §6.5 |

**Added 30 Sep 2026 (review 2, the user's second play-through; `docs/review/2026-09-30-review-2.md`, answers in `docs/design/review-2-answers.md`):**

| Problem | Change | Section |
|---|---|---|
| Campaign jargon (canvass, flyers, ordinance, endorse, slate, the count, FXP, PC) read as complicated | **Plain words**: a player-facing vocabulary (§1.5); every title, order, headline, label, help note and result rewritten in everyday words (*Talk to the workers coming off shift*, *Knock on doors*, *Put up posters*, *Party XP*, *Reputation*, *a council rule*, *back a candidate*). System terms stay in the GDD and the code and never reach a screen. The Alliance's Rank 2 title *Canvasser* → **Campaigner**; *Ward Register* / *Ward Fund* → **Street Register** / **Street Fund** | §1.5, §5.4, §13.3, §13.4, §13.7, §14.4, §15.3, Appendix A |
| The roll, the chance maths and the bonus rows in every result were noise nobody wanted | **The rolls are hidden.** A ticket shows the odds as a word and the stat (*Good odds · Intelligence*); a result row shows *Success* or *Partial* and its rewards, and when it isn't a Success, **one plain reason** computed from the check (*Your Intelligence is low for this. Train it at the Union Hall.*). No percentage, roll, difficulty or bonus row anywhere a player reads; the server still returns the breakdown for the dev panel and QA | §1.2, §7.5, §8.4, §13.1a |
| "PC" meant nothing | **Political Capital**, in full, everywhere, with a help note | §6.5, §7.5 |
| After a vote or a candidacy nothing on any screen said what had happened or what came next; the candidates and the result were hard to find | An **Election card** on the city screen and the same row in the paper: the phase in plain words, what you can do now, a countdown, one button; every political act ends in a result **and a next step**; the candidates and the last result are reachable every day of the cycle | §3.3, §15.3 |

**Added 1 Oct 2026 (city quarters, `docs/design/city-quarters.md`; art brief `docs/art/map-brief.md` revised):**

| Problem | Change | Section |
|---|---|---|
| The user wants more city to play in: cities that grow with places for later levels, and a greater sense of distance between them. One image per city cannot hold it at a readable zoom with generated art | **Quarters.** Every city is an **overview map** (quarter plates, no place pins) plus **quarter maps** of four to six places each; the chain is **nation → city → quarter → place**, the model Irongate's districts already use, and the capital's districts *are* its quarters. A city opens into the quarter you are in, so day 1 is unchanged. **Quarters open by Level, per character: 1 / 6 / 10** (the station's quarter at 10, with the train), never by the clock, and never close again; locked quarters are drawn in full as teasers (*Opens at Level 6*). Quarters are map units, never political units. **Coalport is the test**: The Mill (today's six places) · The Harbour (five, Level 6, slice 5) · The Sidings (four, Level 10, slice 4). The nation map gains distance (smaller cities, halts along the lines); travel times unchanged | §14.13, §14.9, §13.5, Appendix C #38–41 |

**Added 2 Oct 2026 (maps v3, the stitched model; `docs/design/maps-v3-integration.md`):**

| Problem | Change | Section |
|---|---|---|
| Separate quarter images need seams to agree and a cross-fade between pictures; the user chose instead to paint each city whole and zoom | **One painted picture per city**, day and night, zoomable; a quarter (and a capital district) is a **frame** on it, the overview is the picture zoomed out, and pins are fractions of the city picture from the survey in `mapPins.ts`. The Level gates, the teaser, the landing and "quarters are not political units" are unchanged. The seam experiment is closed; the pen-and-ink brief is retired | §14.13, §14.9, Appendix C #39 |

**Added 2 Oct 2026 (slice 4 brought up to date for maps v3, the wage and plain words; `docs/design/slice-4-battleground.md` and `slice-4-screens.md` revised):**

| Problem | Change | Section |
|---|---|---|
| The slice-4 design placed the capital's pins and district crops on the retired pen-and-ink image and the cities on the retired nation map | **Five district frames** on the capital's one picture, each its survey pins' box grown by 0.06 (Government Quarter 0.40, 0.18, 0.72, 0.43 · Old Town 0.06, 0.07, 0.43, 0.38 · Station & Market 0.29, 0.49, 0.62, 0.74 · Eastside 0.50, 0.44, 0.98, 0.78 · Garrison Hill 0.72, 0.01, 0.97, 0.33); every pin from `mapPins.irongate`; a district view draws only its own pins; the overview is the picture zoomed out with five district pins and a Districts list. **The nation map** is the painted 9,216 px picture with the cities at `mapPins.nation`, filling the screen, dragable, no free zoom (superseded 3 Oct 2026: free zoom, as every map), the player's city and the capital always in view at rest, a Cities list, a tap zooming onto a town and opening its card; no rail overlay | §14.9, §14.10 |
| Slice 4 still had three shift actions, streaks and half pay, which review 1 removed | **59 tier-1 actions** in the capital (no `job` actions); the three Irongate jobs are Jobs-card wages; living in the capital has no running cost | §14.9, §14.11, §9 |
| Slice-4 strings predated the plain-words rule | Every player-facing slice-4 string in §1.5's words: *close race*, *comeback*, *contested*, *rival ground*, *the scoreboard*, *points*, *the result*, *candidates*, *backers*, *council rule*; journey card rows show an odds word and the stat, never a check or a percentage | §1.5, §14.10 |
| The painted nation draws Ashford farthest from the capital and Clearwater no farther than Duskwall, against the 12 / 12 / 15 / 25 table | **Times kept** (dwell is measured first, and equal home-city times are fairer to the three factions); the art-following alternative is recorded for the record | Appendix C #8 |
| Three slice-4 questions were open for the user | **Decided 2 Oct 2026 (the user decided):** (1) journey times stay **12 / 12 / 15 / 25**, not the painted distances (#8 closed); (2) the nation map **fills the screen** on a phone like the city maps, your city and the capital in view, the others a drag or a Cities-list tap away (#42 closed); (3) **home-city station quarters are later, not slice 4**: slice 4 boards from the nation map and Irongate's Central Station only, and the station quarters (Coalport's Sidings first) are a later content addendum. Supersedes the Quarters row above where it says "The Sidings … slice 4" | §14.10, §14.13, Appendix C #8, #42 |

**Added 2 Oct 2026 (review 3, the user's third play-through; `docs/review/2026-10-02-review-3.md`, answers in `docs/design/review-3-answers.md`):**

| Problem | Change | Section |
|---|---|---|
| The city map could not be zoomed by the player, and a place's sheet popped open | **Free zoom** between two limits a player can see the reason for: no further in than the painting's finest detail (never blurry), no further out than the scale that still fills the screen (never a dark band). **Opening a place is one movement**: the zoom, the dim and the sheet ease in together (250–350 ms) and out in reverse; a quick fade under reduced motion | §14.13 |
| The result's four reward tiles were bulky boxes, half empty on most results | **A receipt**: one line per reward with its value, a note (the base and the bonus; the distance to the next Level or Rank) and a thin bar on the XP and Party XP lines; **a zero line is not printed**; the XP, Party XP, Iron and opinion before → after lines leave the knock-on block | §13.1a |
| *Again ×3 24*: a bare number for the cost | **Every button that spends Energy says what it does and what it costs**, never a bare number: *Once more · 10 Energy*, *Three more · 30 Energy*, *Study again · 46 Energy*; the ticket's buttons *Once* and *×3* with *30 Energy* under it | §13.1, §8.5 |
| *TRAIN* at a reading room | **The training button is the title's verb** (*Study*, *Lift*, *Run*, *Unload*), a content field on every training action; the reason line says *Raise it at the Union Hall*; the training order names the verbs (*Study, lift or run once in Coalport*) | §8.4, §8.5, §13.7 |
| The election screens sat on a beige page, and nothing said who the candidates were or how seats were decided | **The council's hall** is a point on each city's picture (content: Coalport's domed Town Hall on the river, Duskwall's tower hall on the Customs Market, Ashford's clock-tower hall by the bridge) and a map crop of it, day or night, heads every election screen. **Local candidates are townspeople run by the game**, said so on every list under their own rule, marked *Local candidate*; players are listed under *Players standing*. **Seats are explained in words** (the town's own vote, plus backers, plus votes), never as a formula; a five-line *How elections work* note is one tap from the card and every election screen | §15.3, §15.10, Appendix C #44 |

**Added 3 Oct 2026 (slice 4 settled with the architect; `docs/tech/slice-4.md` §22–§23, answers in `docs/design/slice-4-battleground.md` §19):**

| Problem | Change | Section |
|---|---|---|
| The slice-4 design and §14.10 still said "no free zoom" on the nation map and the capital's views after review 3 gave the city maps free zoom | **Free zoom everywhere**: the nation map, the Irongate overview and the district views zoom between the same two limits as the city maps | §14.10, §14.13 |
| The journey cards' "at most 40 Iron" was a slip (a 10-Energy action pays 20) and the parcel pays 100 | **A card pays at most a 10-Energy action's XP, Party XP, opinion and points, 10 Rested, and at most 100 Iron**; only the parcel pays 100 (50 + 50), because it is the card that will carry Heat | §14.10, Appendix C #46 |
| Nothing said whose council rule or Issue effect sets the Rested cap once a player can be in one city, live in another and work in a third | **One rule for where an effect applies:** actions where you act, the wage where the job is, the Rested cap where you live. The cap is 200 + the residence city's rules and Issue effects + 50 for a room, wherever the player is | §6.3, §14.11 |
| Two sources of one effect kind (a rule and an Issue, or two Issues) had no combination rule | Deltas add; pay, Iron and Party XP shares are each a line on the base; opinion, ticket and room percentages multiply (tickets never below 5 Iron); *every win counts twice* and seniority ×2 take the larger. A second new effect kind, **rooms −50 %** | §14.6 |
| Small rules unpinned: points on a Partial of odd Energy, which Energy counts, whether a card's numbers take the capital's factors, the hero's bracket, a visiting hero, the ballot as a contribution, a move between two districts, Groundswell at home | Points use the content Energy and round half up on a Partial (3 → 2); a card's opinion and points are fixed; the bracket is the Level at the last contribution; any contributor can be the hero; the ballot's +0.5 is not a contribution; moving between districts is a move like any other; Groundswell is districts-only in slice 4 | §14.4, §14.5, §14.6, §14.11 |
| The capital had no council hall for the review-3 election header | **The City Hall** (0.57, 0.345 on the capital's picture): the clock-tower hall between Parliament and the Opera; Parliament is the republic's | §14.9 |
| The slice-4 design's action table had 62 rows under a count line that said 59, and listed the three HQ committee sessions as INT checks | **62 tier-1 actions** in the capital (canvass 21, speech 10, propaganda 12, intelligence 11, council 3, training 5), the three extra rows kept; the committee sessions are **best-stat** checks as everywhere (§8.4, §13.3) | §14.9 |
| Phase A of slice 4 built with stand-in texts and allowances pending the designer | The Herald's slice-1 and slice-3 texts and the three home papers' ten additions each are written in their own voices (`slice-4-battleground.md` §12, §12.1); the Tram Subsidy names no city (*trains from this city at half price*); Parliament's *division*, the committees' *motion*, the Hill's electoral *ward*, the Opera's *by ballot* and the police *desk sergeant* are reworded in plain words; *Garrison Hill*, *the war* (historical), *the front room* and *close race* stay | §1.5, §14.9, §15.3 |
| Three statements of the design were not what is built | In transit is the city you left plus the journey's status, never a null city; arrival is lazy and a tidy job runs as well; which district you stand in is client memory | §14.10, §14.13 |
| The user, building the capital's map (3 Oct 2026): districts should feel like places you are in, and the overview should not be a field of pins | **The district lock.** The Irongate overview shows only the five districts, as **outlines with their names** (no place pins); tapping one zooms smoothly into it, and inside a district the player is **held to it**: its edge is drawn, the picture outside is dimmed, only its pins show, the view zooms no further out than the district's own and drags only to its frame plus 10 %. Another district is reached through the overview or the tram bar (the same zoom). Each district's shape is content (`outline`, `cities/irongate.ts`); `docs/design/slice-4-screens.md`, *Added 3 Oct 2026 — the user's district lock* | §14.9, §14.13 |

**Added 3 Oct 2026 (slice-5 design, `docs/design/slice-5-risk.md` and `slice-5-screens.md`):**

| Problem | Change | Section |
|---|---|---|
| Tier 2 had reward rates but no difficulty per Level, no Energy by type, no rule for the remembered approach and no order between the check, the encounter and the result | **The difficulty ladder:** 14 / 16 / 18 / 20 for missions at Level 6 / 8 / 10 / 12, +2 in the capital, +4 on rival ground; Energy by type (speech 15, surveillance 12, vandalism 10, disruption 15, sabotage 20, theft 15); Failure pays **XP ÷ 5**; **the way is remembered** (one tap the second time); no ×3 on a mission; **check → run-in → caught check → result**, the result held and decided by the run-in; an unanswered run-in is **auto-resolved on the next read** (the first after five minutes, settled below) | §8.4, §13.1, §13.3 |
| Appendix C #15: the +1 stat point per level met the §8.5 targets without training, and tier-2 difficulties had to be set against it | **Closed:** the rule stays; the best-stat targets are raised to what it produces (day 1 ~12, week 1 ~28, month 1 ~50, month 3 ~85); difficulties are set against the modelled stat so new content sits inside 60–85 % | §8.5, Appendix C #15 |
| Heat had states with effects but no evaluation moment, cooling implementation or display rule | **Pinned:** sources by type (theft +10 added), ×2 on rival ground, the parcel's +10 and a failed bribe's +10; cooling **5 an hour, lazily**; the state is read **after the mission's own gain**; *Noticed* +5 % on run-ins and the caught check and the police join the pool; *Hot* +15 % and a caught check means **the cells**; *Wanted* and a Failure is the cells without a roll; shown on the HUD **only above 0** | §6.4 |
| The caught check had "AGI modifiers" and no outcome by state; vandalism and theft had no rows | **Caught = base + Heat ÷ 2 + the state's bonus − Agility ÷ 2**, 2–95 %, rolled **on a Partial or a Failure only** (a clean job leaves no name; was "every illegal action", which made a daily illegal player Notorious in four days); *Cool* or *Noticed*: **your name is taken** (the marks); *Hot* or *Wanted*: **the cells**; a second arrest in seven days is three marks; **surveillance has no caught check**; vandalism (run-in 15 %) and theft (Heat +10, run-in 25 %, Iron ×2, no opinion) rows | §11.2, §13.3 |
| The record's *Known* was the Reputation ladder's third rung; its effects were unscoped | ***Known* → *On file***; the Iron penalty is on **missions** (tier 2 and up); *Repeat offender* +5 % on run-ins and the caught check; *Notorious* bars courts, universities and the Alliance's HQs and doubles bail; **minor marks fade 14 days after the last offence; 30 PC strikes any mark**; bribes with the Black Market (slice 8) | §11.3, §11.4 |
| Jail and hospital had numbers but no bail formula, no rule for a loss to the police, no release on rival ground, and Health had no display rule | **Bail = 100 + 50 a mark**, ×2 Notorious, ×2 rival ground, ×½ for Alliance members; the sentence ×1.5 on rival ground (max 60); **a loss to the police is the cells**, not the infirmary; release on rival ground is **deportation** (the train home, barred 24 h); one intelligence tap in the cell and on the ward; the infirmary's two ways out pinned; **Health on the HUD only below full** | §6.1, §19.1, §19.2 |
| Combat had the four formulas but no plain words, no XP and no order with the mission's result | ***Fight · Run · Talk your way out · Pay them off*** and ***Leave it to luck***; the held result is paid on a win, a Talk or a Pay, drops to Failure's XP on a Run, and a loss is the infirmary (the cells against the police); +20 XP for a win, +10 for getting away, **+10 % on the mission's XP and Party XP for a win at full Health**; Tier I clothing is armour 4; the mission's pool, own-faction opponents dropped, **the police half the pool from *Noticed***; power ×1.1 at tier 2, +4 on rival ground | §20, §1.5 |
| Hostile ground had a table of promises and no slice form | **Rival ground, slice 5:** open at **Level 10** with the train; +4 difficulty, **×1 only**, 15 % run-ins on tier-1 taps, ×2 Heat and mission run-ins, **+50 % Faction XP** (+75 % in Unrest), opinion **against the home faction** and **capped at 2 points a day per city**; no residence, standing or orders; **the home paper** with a desk line; **always a hostile card on the way in** (the checkpoint, the informer, the list at Heat 50+, the conductor; *Watched* and *Warned* day flags); the cells there end in deportation | §14.11, §14.12 |
| The second quarters had names and no frames, places or actions; a home city with two quarters had no overview | **Coalport's Harbour, Duskwall's Pass, Ashford's Wharf** at Level 6: three frames from the survey pins (+0.06), **fifteen places** (the infirmaries and the cells among them) with **35 tier-1 actions**; **the home-city overview with outlines and a quarter bar**, the capital's pattern; the third quarters as teasers | §14.13 |
| Five Issues, a Party order, an Ambition chapter and a keepsake | `issue.customs-strike` (Heat cools +50 %), `issue.ferry-fares`, `issue.timber-rates`, `issue.market-tolls`, `issue.cells-full` (bail −50 %); DSL kinds **`heatCoolPct`** and **`bailPct`**; the slot-B order *Take on a mission anywhere in {city}* from Level 6; ***The riverside house*** (Settle His Debts chapter 2: Level 6, difficulty 14, 15 Energy, +6 Heat on the quiet way); `keep.ledger-page` | §14.6, §13.7, §17.1, §21.4 |
| Settled with the architect (3 Oct 2026, `docs/tech/slice-5.md` §22.1; answers in `slice-5-risk.md` §23): the run-in's "next read", a police loss on legal work, Health after a loss, the civic police's word | **A run-in left unanswered is taken by luck on the first read after five minutes, or at the day's end** (ADR 0032); **a loss to the police is the cells on any mission** (a watch's pool is the police), with no marks for legal work and no escalation from a markless arrest; **Health is 30 after a police loss and never below 1 after a win**; **Heat cools at the residence city's rate**; deportation's train goes to the residence city; the Irongate missions are difficulty 20 (the ladder +2); **no rank for the civic police: *the duty officer*** (`portrait.duty-officer`), slice 4's word kept; orders are faction-wide among members who can do them | §13.1, §20, §19.2, §6.4, §14.12, §8.4, §13.7 |
| QA slice 5 (5 Oct 2026, `docs/qa/slice-5-report.md`; answers in `docs/design/slice-5-fixes.md`): Health's max read three ways; *Won at full strength* had no moment; the failed pay-off's Heat and a named target on rival ground were unsaid; the release said *down to 25* from 0 | Health is **100 + 5 × (Level − 1)**; full strength is judged **as the run-in begins**; a failed *Pay them off*'s +10 counts in the caught check; **a mission keeps its named target on rival ground**, capped only against the home party; the release's line is *Heat is 25* (the rule unchanged). Player text: *Infirmary* and *Police* kickers, briefings ≤ 300, the record tag by level, first-time record cards per level, the run-in's *did* lines with the opponent's pronoun from content | §6.1, §20, §11.2, §14.12, §19.2 |

**Added 3 Oct 2026 (slice-6 design, `docs/design/slice-6-together.md` and `slice-6-screens.md`):**

| Problem | Change | Section |
|---|---|---|
| Campaign Events had roles, a start time and four outcomes but no caller before the Chair, no venue, no resolution maths, no rule for a member who is away, jailed or travelling at the start, and no limits | **Pinned:** Rank 3+ members call an event at a fixed **venue** per event per city (per district in the capital), 1–12 h ahead, taking the first role; **the secretary calls a daily fixture** in each home city and in the capital, resolved **at the City Day boundary** with the orders; **sign-up spends the role's Energy at the tap and needs nothing after** (where the member is at the start changes nothing); withdrawal until the hour before; empty roles to **the branch's volunteers at half strength (three quarters at home while *Fired up*)**; **one §8.4 roll per role**, the mean score banded **Triumph ≥ 0.875 · Success ≥ 0.625 · Mixed ≥ 0.375 · Fiasco**; swing = base by event (0.8–2.0) × outcome × the members' share of the roles' Energy; XP at the tier-2 rate by the own roll, Party XP 0.8/E × the outcome, **Political Capital 3 / 6 / 10 / 15, full for the first event of the day and half after**, no Iron; **three starts a city a day, three open sign-ups a member**; no events on rival ground | §16.3, §14.2, §6.5, §14.11 |
| "First Campaign Event on day 1" (§5.2) while roles needed Rank 2 (day 2) | **Hands:** up to four places on every event for any Rank, 5 Energy, no roll, paid like everyone; Rank 2 for named roles, Rank 3 to call | §5.2, §5.4, §16.3 |
| The six events were a table; the General Strike suspended jobs that no longer have shifts; the Headline Story needed a Case File (slice 8); the Town Hall added Recall signatures (slice 7) | **Poster Night** (three roles, Agility's first) joins Rally and Canvass Drive as the common events; the General Strike's effect is **double Issue momentum**; the Headline Story runs **without a Case File** in slice 6 (+50 % with one from slice 8) and draws from the leading rival; the Town Hall waits for slice 7 | §16.3, §25 |
| Chat, presence and favours were one paragraph | **Chat:** *Party* and *{City} branch* channels from Rank 1, 280 characters, 200 messages or 7 days, one every 3 s and 30 in ten minutes, system lines with buttons, mute and report now, the moderation policy and tools in slice 9. **Presence:** seen within ten minutes; own faction by name, other parties as a count; **invisible on rival ground**. **Favours:** a mate posts the prisoner's own bail from anywhere (+10 Party XP); a visit is 3 Energy from anywhere but rival ground, +10 Health and five minutes off, once per visitor per stay, three count; a one-tap nudge into an open role | §16.2, §19.1, §19.2 |
| The faction's contribution ledger had no period, and council cycles differ by city | **The faction scoreboard: this week and all time** (this season from slice 8), by bracket, *Moved* and *Events* | §14.5 |
| The paper had no event rows | An **Events** section under Party orders; *In Print* gains event results, bail posted and visits; the event order *Take part in the branch's event today* (slot B) | §3.3, §13.7 |
| Settled with the architect (3 Oct 2026, `docs/tech/slice-6.md` §22.1; answers in `slice-6-together.md` §20) | Rolls **seeded per event by a secret seed**, not the public id; the Grand Rally's two *Steward* roles are **Ushers** (the Vanguard's Rank 2 title is *Steward*); **three chat channels per faction** (Party, the home branch, the Irongate branch); the capital's district stays client memory and the call names it; the Headline Story's target fixed at the call; a withdrawal above a full bar banks the excess as Rested and a completed event order stays done; a visit draws no Rested and is once per stay; the scoreboard shows ten a bracket; the nudge is any signed-up member's | §16.2, §16.3, §14.5, §19.1 |

**Added 3 Oct 2026 (slice-4 QA fixes, `docs/qa/slice-4-report.md`; the decisions and every string in `docs/design/slice-4-fixes.md`):**

| Problem | Change | Section |
|---|---|---|
| A member whose name was already on a ballot could move residence and win a seat in a city they had left (QA M2) | **A candidate on a ballot stays put:** a move is refused while the member's name is on a ballot where they live, and the card names the day (*you can move from Sunday*); a candidacy still *filed* is withdrawn as before | §14.11, §15.3, Appendix C #61 |
| Renewing the room on the day it was taken cost 100 Iron for no extra night (QA m5) | **A renewal adds seven nights to the end of the room**, offered while seven or fewer nights remain; at most fourteen nights are ever paid for | §14.11 |
| Slot-C orders named the home city for a capital resident, and the Issue order had no pin (QA m1, m2) | `{city}` and `{verbs}` in the shared slot-C templates, resolved at read to the residence city; an Issue-tagged order points at the first place tagged by the city's first Issue | §13.7 |
| Player text said a close race was "three parties within ten points", the first-arrival line fixed the count at two, and the Herald printed "a Eastside" (QA m3, m4) | *The two parties in front…*; a live count on the first-arrival line; *Takes a Seat in {district}*; the rule itself is unchanged | §14.4 |
| Two stale player strings in §14.5 and §14.6 (QA n4) | *This election you've moved…* and *Issue: … · opinion +50 %*, as built | §14.5, §14.6 |

**Added 3 Oct 2026 (slice-7 design, `docs/design/slice-7-nation.md` and `slice-7-screens.md`):**

| Problem | Change | Section |
|---|---|---|
| The national calendar had clock-less days but no term structure a job could compute; the Chair had no election window; "takes office 24 h after polls close" and the primaries had no boundaries | **A term is 28 City Days from a fixed epoch** (`termDay`, like `cycleDay`): the Chair's names in on days 9–10, voting 11–13, the result into 14; **names in for President and the party's list 19–20, the party's pick 21–22, the republic votes 23–26, the count into 27 (*to be confirmed tomorrow*), office from day 0**; every window at least two full City Days; the seed installs a government for term 0 | §2, §15.4, §15.5 |
| The office ladder's upper rungs had powers in words and no numbers, no pay, no rule for an absent holder, and a Chancellor whose coalition rule could not work at low population | **Pinned:** the **Governor** (the largest bloc's top player councillor with a completed term, else a local; the Governor's rule as item 1; the Address +50; 20 PC and 30 FXP), the **Chair** (the faction's ballot with **the secretary always on it**; standing orders that repeat; one push to a battleground with a party-wide target; the party line in Parliament and the party's rule per council; events anywhere; the Officers channel; 20 PC and 40 FXP; a vote on the Chair), the **deputy** (60 seats by D'Hondt on the national scores; the list ordered by backers; 5 PC and 30 FXP; one bill a term) and **one office at the top, the President** (no Chancellor: a law a week in its own slot, one veto, one Address, 50 PC and 60 FXP, two terms in a row at most); **several offices at once allowed**; an absent holder's duties fall to defaults, never a block | §15.1, §15.4, §15.5, §6.5, Appendix C #64, #65 |
| The Legislature had a 24-hour vote, co-sponsors and nothing to do until Rank 5 players existed | **Parliament:** three bills on the paper plus the President's; three-day votes; **31 of 60 passes, 36 for a factional law**; local deputies vote by the chain (player majority → the Chair's line → **the secretary's line**); **the secretaries table one bill a week** for a party with no player Chair or deputy, so the book has laws from the first week; a signature day for the veto, 40 to vote it through anyway; striking out; a failed bill waits seven days; the old term's bills lapse; local deputies abstain while their home city is in Unrest | §15.6, §15.10, §14.11, Appendix C #66 |
| The law table was v3.0's with systems that don't exist, and no rule said how a law combines with a council rule or an Issue | **A catalogue of thirteen** with bounds, durations (7–28 days), `appliesTo` and the secretaries' lines; seven new DSL kinds; a law is a third source combined by the slice-4 rules; **laws never touch Party XP or the odds**; at most five in force, replacing by name at the cap; all expire at the Season | §15.8, §14.6 |
| National Control was a sentence; "70 % of power in the battlegrounds" was unbacked by a formula | **Pinned:** `0.40 × Irongate + 0.30 × Clearwater + 0.10 × each home` (Unrest counts half); half of every party's score with the turnout weight at thirty ballots nationally; *leads the republic*; control grants access only (the +25 % Heat for rivals of the controlling party is built for districts and Clearwater); **Clearwater's baseline evened to 22 / 22 / 22 / 34** so no party starts ahead (23.5 each) | §14.8, §14.9, §14.11, §15.5, Appendix C #2, #70 |
| Clearwater existed as a card | **Clearwater built as a single-meter battleground** with a district's rules: three quarters (The Front a teaser until the Wardrobe), **nine places, 24 tier-1 actions at difficulty 10, three jobs, four missions**, a seven-seat three-way council by D'Hondt (four of seven; the hall is **the Casino**), a slate of nine, six Issues (the deck is 30), residence and a room, *The Clearwater Courier*; 25 minutes from the capital; **no direct coast line** (scenery) | §14.1, §14.6, §14.10, §14.11, §15.3, §15.10, §3.3, Appendix C #8, #40, #71 |
| Recall meant a snap election that the pure calendar cannot hold; no-confidence had a 35 % trigger that three parties would trip daily | **A petition to dissolve the council** (a quarter of eligible residents, min three, on cycle days 0–2, closing at the second boundary; the rule struck, the Governor's chair to a local, terms uncompleted; the ordinary election follows); **a vote to remove the President** (a deputy's or a Chair's 50 PC, or automatic under 25 %; 40 of 60; the runner-up serves out); the **Town Hall** event adds signatures (3 / 2 / 1) | §15.9, §16.3, Appendix C #67, #68 |
| The Chair's whip and Appendix C #26 | **Closed:** local councillors follow the faction's player councillors, else the Governor's rule, else the Chair's rule, else the secretary's; **four or more player councillors voting *None of these* make the locals abstain** | §15.3, §15.10, Appendix C #26 |
| Chapter 3 of *Finish His Work* was due since slice 3 | ***The deposit*** (Rank 3, difficulty 16, 15 Energy, 350 / 90 / 200, keepsake *His deposit receipt*) | §17.1, §21.4 |
| Settled with the architect (4 Oct 2026, `docs/tech/slice-7.md` §22.1; answers in `slice-7-nation.md` §23): the automatic removal "below 25 % of National Control" would fire every term (every party starts at 23.5); Unrest's "lost half goes to nobody" could not sum to 100; the Governor's rule "in place of" the party's item would erase cast votes; the pick's ties by backers before backing opens | **25 % of the control share**; **Unrest halves the city's weight for every party and Neutral** (the shares sum to 95); the Governor's rule **added as item 1 ahead of** the party's item; the Chair's rule from the next order paper; an unset line falls to the secretary's and *Free vote* abstains; a tie among player deputies is no majority; divisions at tabling day + 4, tabling closed after day 23, one bill per member per term; the pick's ties by completed terms then filing; councillors cannot sign the petition on their own council; order **families** for the Chair's menu, push and Clearwater templates, twenty-four local deputies, the Town Hall's venues (kinds gain `library`, `faction-hq`; no signature event in Clearwater), five modals and the alt texts written | §13.7, §14.8, §15.3–§15.6, §15.8–§15.10, §16.2, §16.3 |

**Added 4 Oct 2026 (slice-8 design, `docs/design/slice-8-life.md`, `slice-8-screens.md` and `inventory-research.md`):**

| Problem | Change | Section |
|---|---|---|
| Equipment had five slots including a weapon, tiers as Roman numerals, no prices, no shop and no way to dress for a situation; "plain clothes" and "fame is dangerous" were sentences | **The Wardrobe:** four slots in plain words (**Coat · On you · Papers · Tools**; **no weapon slot**: a run-in is Strength and a coat with some weight to it); **two outfits, *Town* and *Plain clothes*** (a flat adds *Evening*), one tap to change, saved explicitly; **shops are cards on places** (the clothes stall, the party store, the tailor, the press, the back room); a catalogue of eighteen priced items (150–20,000 Iron) with three bounded effect kinds; **recognition** on rival ground pinned (Charisma 20+ +5, 30+ +10, doubled at night; the highest office +5/+10/+15; +1 per 10 Legacy; plain clothes under Charisma 10 remove the first and halve the second); forged papers and the press pass read at checkpoints | §8.2, §8.4, §14.12, §16.2, §20.3, §21, §18.3, §11.3, §11.4, §19.3, Appendix C #74, #75 |
| The Dossier had capacities and a use table and nothing a build could roll | **Pinned:** names (every NPC with a party and a town), entries by category from a line pool, a **10 % entry on an intelligence Success** plus the worn items' chance, a surveillance Success one entry, the cells and the ward one in four; fresh seven days then half; **Case Files at Level 16**; three uses (**the exposé**: three steps at a newspaper, difficulty by the file's weight, −1.0 / −0.5 against the name's party in their town, the front page with your name, Legacy +2, a Failure keeps the file; **sell** at a station, 200 / 50 / 25; **an informant** with a patron's help); Blackmail and Denounce deferred | §10, §13.1, §17.3, Appendix C #76, #78 |
| Patrons were five with perks in words | **Two in the MVP, Edith Crane and Julius Marr**, both neutral, in the capital and Clearwater; Favour from Requests (+6, one every two days, two held, four days to expire), gifts (200 Iron, +2, daily), society calls (+2) and chapters (+5); the four tiers' perks pinned (gossip, an introduction and informants, a weekly favour for Political Capital, an endorsement and a wearable piece) | §17.2, §3.3, Appendix C #77 |
| Social missions used v3.0's reward figures and had no door rule | **Society calls** at the tier-2 rate: difficulty = the Charisma requirement, barred ten under it; six calls at the Opera, the Grand Hotel and Clearwater's Front, which opens (Appendix C #71 closed); +2 Favour with the town's patron | §13.3, §13.6, §14.1 |
| Homes were a table with no rules for lapse or moving | **The flat:** 2,500 Iron and 150 a week prepaid; +25 Rested a night, Rested cap +50 (the larger of a room and a flat), a third outfit, +2 Charisma in its town; **the rent that runs out makes the flat wait, never taken**; the rented room +10 a night; one flat in the MVP; townhouse and villa after | §17.4, §6.3, §6.7, Appendix C #79 |
| Legacy had a table and no rows for the slice-7 offices, no perk prices | New rows (Governor 5, deputy 5, an exposé 2, Protégé 5, an award 5); perks priced 5–15 from a spend balance beside the permanent total | §17.3 |
| *Finish His Work* stopped at chapter 3; the two other Ambitions' due chapters were unwritten | **Chapters 4–12** (requirements up the ladder to a seat in Parliament; difficulty 18–26; Legacy 30 and *His rosette* at the end); *The night foreman* and *The collector* | §17.1, §21.4 |
| The Season had a score with an election bonus too small to matter, awards in words, and a track and twists nobody could build in the MVP | **Three terms from the term epoch; the Season Election is the third term's count; the score is the daily control share summed +100 per election won**; the Champion and four awards (Legacy +5 and titles); the Hall of Fame; the rollover table pinned (opinion halfway back, laws and rules end, Heat 0, the deck reshuffled; everything owned stays); **no track and no twist in season 1** | §22, Appendix C #80, #81 |
| Settled with the architect (4 Oct 2026, `docs/tech/slice-8.md` §22.1; answers in `slice-8-life.md` §21): the Clarion and the Sentinel are mastheads, not places; the press pass was behind the train for two factions; the venue rules of §6.4 and §11.3 were unpinned; two rooms shared a word | **Exposés and the press shop at Herald House and Gazette House; Dossier sales at Central Station, the Goods Yard and Clearwater Station; the party store also sells the press pass and the camera; the clothes stall buys anything at a tenth of the catalogue price; society calls at Level 10, no Party XP, barred while *Wanted*, the *On file* +5 dropped; forged papers make *Show your papers* a Charisma check at 14 with +10; the night doubles the Charisma and office parts; rent at most eight weeks ahead; the burn per player; an informant reports a name of its town, seven times; the exposé refused against one's own party or a name with no party; two Issues feed exposés; the slice-4 paid room reads *Lodgings in {city}*; every keepsake has a *Read* text; the badge redrawn neutral | §6.4, §10.4, §11.3, §13.6, §14.12, §17.4, §18.3, §21.1 |

**Added 4 Oct 2026 (slice-9 design, `docs/design/slice-9-launch.md` and `slice-9-screens.md`):**

| Problem | Change | Section |
|---|---|---|
| §27 had targets and no way to measure them the same way locally and in a beta | **Telemetry** as a first-party event stream in our own database (no third party in the betas): a player-day, a session (a 30-minute gap), **classic** Day-N retention with the rolling figure beside it, testers and boosted accounts left out; the `report:metrics` dashboards mapped to every §27 row; **beta gates** (closed → open: D1 ≥ 40, D7 ≥ 30, D30 ≥ 15; open → launch: D7 ≥ 35, D30 ≥ 20) | §27 |
| §15.2's "accounts on the same network can't vote in the same election" had no rule, and the 24-hour audit no procedure | **Linked accounts** (the same device; the same network on three days with interleaving sessions and no overlap; a household that overlaps is two people): a linked set's **ballots, backings, signatures and hands count once**, set aside at the count, never refused at the tap, never a message; the only public sign is a count's aggregate line. **The audit** runs itself at the national count, a moderator may confirm, set aside, unlink or recount a council within 24 hours, and **the count confirms itself at day 0** if nobody acts. Sign-up caps (two accounts a device, three a network a day); bail Party XP at most three a day and none between linked accounts | §15.2, §16.2, §26, Appendix C #82–#84 |
| The chat-moderation policy (Appendix C #7) was open | **Closed:** a four-reason report, a word filter that refuses or flags (its lists outside content), the ladder (a note from the editor · muted 24 h / 7 d · suspended 3 / 14 d · closed), names checked at sign-up and rename, **Change your name once every 30 days**, a forced rename with *A Newcomer* until done, closing one's own account with erasure after 30 days, the moderators' console; nothing owned is touched by any rung, and a suspended holder's duties fall to the §15.1 defaults | §7.3, §16.2, §26, Appendix C #7, #85, #86 |
| Appendix C #13: the §14.2 swings suit a few dozen players a city and nobody had pinned the damping | **Closed:** the swing is multiplied by `clamp(20 ÷ active, 0.25, 1)`, *active* the seven-day mean of distinct daily contributors there; the identity below twenty, so nothing built changes until a city fills | §14.2, Appendix C #13 |
| *While You Were Away* was deferred since slice 3 and the Welcome Back package had no slice | ***While you were away*** after two days (one row, four lines, the digest behind it); **Rested filled to the cap after 30 days**; the returning chapter stays post-MVP | §3.3, §4.2 |
| Nothing said what a screen was for until the player had used it, and some lists could be blank | A **purpose line** on every screen until the first act there; an **empty state** on every list; a help note on every dotted label, audited; a Settings sheet of five lines (Motion, Text size, Map at night, Clouds, Chat); WCAG 2.2 AA targets and performance budgets recorded with the slice | §3.7, §7.5 (unchanged rules; the audit in `slice-9-launch.md` §6–§8) |
| Settled with the architect (4 Oct 2026, `docs/tech/slice-9.md` §22.1 and §23; answers in `slice-9-launch.md` §17): the ballot's choice in telemetry, closure's higher offices, printed names, the fifth reason, the invitation and reset strings, the recount window, shared networks | **No number moves.** `vote.cast` carries nothing of the choice (ADR 0019); closure vacates every office by kind (the Chair as a change of Chair, a deputy's seat down the list, the President to the runner-up); **a forced rename and an erasure scrub printed editions** (one's own change keeps them); a fifth suspension reason (*spam or selling*); a council recount is for a count made at that day's boundary; a network with over fifty accounts in a day links nobody; unlinking is sticky; the away row's priority per scope; bail's cap said on its sheet; the terms line, the invitation code, the password-reset and not-found strings written; **Appendix C's second #61 renumbered #89** | §7.3, §14.2, §15.2, §16.2, Appendix C #89 |

**Added 6 Oct 2026 (review 4, the user's fourth play-through after slice 5; `docs/review/2026-10-06-review-4.md`, answers in `docs/design/review-4-answers.md`):**

| Problem | Change | Section |
|---|---|---|
| The deathbed quiz was a test with a corpse, and the street's three posters had nothing to do with the game that follows | ***The Last Train In***: three beats of one choice each (the platform: whom you help is your party; the suitcase: your stats; the lining: your Ambition and his coat); the favour you did is **your first action**, slot B of the welcome set at the HQ; **eight taps** from sign-up to the first result; the reference recruit is **STR 8 / INT 12 / AGI 5 / CHA 5**; the face is one of eighteen | §7, §7.5, §8.5, §13.7, §17.1, Appendix C #12, #19 |
| Nothing said what time it was, and countdowns were written four ways | **A clock in the top bar** in the player's own time, with a note; **one countdown style** (*in 24 min* · *at 14:40* · *tomorrow 01:00* · *Thursday*) | §2.2 |
| Travel was a progress bar on a paper page | **The journey runs on the nation map**: the train moves along the traced painted line at the clock's position; **the card fires at a point drawn at boarding** (`cardAt`, 0.20–0.80 of the way), lazily, shown on return or in the arrival modal if unanswered | §14.10 |
| Parts of the capital belonged to no district | **The five districts tile the whole picture**, river included, split along the river's middle; new outlines; inside a district the drag limit is the outline | §14.9, Appendix C #41 |
| *Register* and *Take a room* on one card, in system words | **One button, *Live here · 500 Iron***, with the plain why (you vote and stand here, and your orders come from here); **lodgings leave the residence card** and become a *Lodgings* card at a place (Tram Junction; the Rows in Clearwater), said as *a bed · Rested banks to 250* | §14.11, §1.5 |
| A councillor had nowhere to go and the rule in force was invisible in the city | **The Town Hall is a place on every city map** (kind `town-hall`, open from Level 1, one *Watch and listen* ticket): the council with *Player* / *Local candidate* marked, **the rule in force in plain words with its effect**, the order paper and the next vote, the week's Issues, the Election card, and **a councillor's desk**; **the city plate's rule line says the effect**; a ***What now*** card on winning a seat | §15.3, §13.5, §14.9, §14.13 |
| Heat was small, unexplained, and its note opened from the wrong label | A body line of its own under Energy; **a note by state that says the effect and how to cool**; the label bug fixed; **Health always on the HUD** | §6.4, §6.1 |
| Help was missing on the Issue tag, Legal Aid, Reputation's size and the ranks | The Issue chip names the Issue and opens a note; *Legal Aid · the Alliance pays half your bail*; Reputation's size said once (*three in a hundred more per step*) and a ticket tag *Known here · better odds*; **the rank ladder** (seven titles, Party XP, what each opens) one tap from the Party XP label | §14.6, §19.2, §13.4, §5.4 |
| The cells cost an hour and some Iron and nothing else | **Three costs, no asset taken:** the sentence is **20 + Heat ÷ 2 minutes** (max 60); **the day's Party orders are off** from the arrest to the day's turn; **an arrest is always at least one mark** (the type's, or one minor mark on legal work); an ***In the cells now*** list on every police station's sheet | §19.2, §11.2, §13.7, §4.2, Appendix C #50 |
| Home cities had quarter outlines like districts | **Reversed: a home city is one map** with every surveyed place a pin, locked ones greyed with a lock and *Opens at Level 6*; no outlines, bar, overview or teaser sheet; the Places list is grouped by quarter with its lock line; **only Irongate has districts** | §14.13 |
| An order could name missions the member could not take | **An order is offered only when at least one matching ticket passes the member's gates today**; otherwise the slot's next template | §13.7 |
| One paper per party, or per city? | **Your paper, in a local edition for the city you are in** (*The Coalport Clarion · Duskwall edition*): the dateline, the ambient headlines, one local line and the Issues are the city's; personal lines, orders, Letters and the desk follow you; the Herald is the capital resident's paper and is no longer forced on visitors | §3.3 |
| *see the note*, *You can close the game*, home orders tappable while away, the paper on a wide monitor | The third order's line says what follows; the invitation to close is gone (*Energy keeps refilling* stays); home orders away are one collapsed line; **the paper is a 720 px sheet on a desk** from 960 px | §13.7, §14.10, §19.2 |

**Added 8 Oct 2026 (review 5, the user's fifth play-through after the review-4 fixes; `docs/review/2026-10-08-review-5.md`, answers in `docs/design/review-5-answers.md`):**

| Problem | Change | Section |
|---|---|---|
| The opening said neither who the player is nor why three officials want two minutes of a stranger | Round 1 (three premises on the father) not taken: **the user asked for one unrelated to the father.** Round 2: **three premises with no father** (*The warrant*: demobbed with a railway warrant; ***After the count***: a ballot-box clerk who counted for every party and none, **recommended**; *The frontier train*: papers that don't quite work), the mechanics unchanged; **each re-anchors the three Ambitions** (the ladder's twelve chapters survive as the player's own climb; ids unchanged); **the user picks.** Round 2 rejected too (three party people waiting at a station). **Round 3, *Coming home*, confirmed by the user on 8 Oct 2026**: the demobilisation office's counter, three pieces of bad news, the problem you chase is your party | §7.1, §17.1, Appendix C #103 |
| The three Ambitions, the five built chapters, the coat and every keepsake still spoke of the father | ***The Names on the Stone*** (`finish-his-work`), ***Who Sold the Homes*** (`clear-his-name`), ***The Ration Ledger*** (`settle-his-debts`); the five built chapters re-strung (`review-5-answers.md` §19.10); the coat is **the demob suit**; keepsakes renamed (*The unit's list*, *The requisition order*, *The ration page*, *Your election bill*, *A page of the ring's ledger*, *Your deposit receipt*, … *The memorial ribbon*); **no id, number, requirement or reward moved**; the reference recruit is still STR 8 / INT 12 / AGI 5 / CHA 5. Earlier rows in this table that name *Finish His Work*, *His ward book*, *His rosette* or the father's coat are the record and are superseded | §1.1, §7.1, §8.2, §8.5, §17.1, §21.4 |
| A job that asked Level 3 and Agility 10 (the Driver) paid 200 against a member's 216 at Level 1 | **A job that asks more pays more:** each rung at least a tenth over the best pay of the rung below, the member's fifth counted; **the Driver and the Tram conductor pay 240**; the catalogue's ranges pinned to one figure a rung (240 · 320 · 500 · 900 · 1,500) | §9.2, Appendix C #96 |
| Health sat under Party XP; the user reads Energy and Health as the pair | **The HUD's order is Energy · Health · Heat · XP · Party XP** at every width | §6.1, §6.4 |
| A journey card could be lost by a tap elsewhere | **The card stays until a row is tapped**: no scrim-dismiss; an explicit *Sleep through it* (ordinary deck) or *Let it pass* (hostile, with its consequence) row; the arrival modal's *Continue* only after a row | §14.10, Appendix C #98 |
| Health could be bought back only from inside the ward | **A *Treatment* card on every infirmary:** *Get patched up · n Iron*, **one Iron a point of Health missing** (at least 10), no Energy, any city; a choice, never a must | §19.1, §18.3, Appendix C #97 |
| In a strange city the Issues, the missions and the orders had to be hunted pin by pin | **The Places list is *What's here***: the city's two Issues, the missions the player can start today (and how many more wait on which gate), the orders here, then the places | §14.13 |
| The level-up picker was three black blocks; a scroll bar showed on long results | **Three paper cards** in the ticket's style; in a result modal the picker is a line and *Place it* opening a sheet; one thin ink scroll bar everywhere | §5.3 |
| The clouds were small | Fewer and larger (a config change; no art) | — |
| Rival ground said *1.3 of 2.0 points left* and nothing else | **Decided (user, 8 Oct 2026):** a header of three lines (the push bar against the cap, the danger in words, **the goal: Unrest** with the points to go) and a **prize** (+50 Party XP, a headline, Legacy +2 from slice 8) for the party that pushes a town into Unrest | §14.12, §14.11, Appendix C #102 |
| Night came once a real day at an hour set by UTC, odd in every zone | **Decided (user, 8 Oct 2026): a six-hour game day** (dusk at 04 / 10 / 16 / 22 UTC, the last two hours night, the same for everyone); **every daily rule stays on the real City Day** | §2.2, Appendix C #100 |
| Nothing was different at night; rival ground was the same at midnight as at noon | **Decided (user, 8 Oct 2026):** night-only ways and four night missions (+25 % Iron, never Party XP); on rival ground at night a tier-1 run-in base of 25 and +10 on missions while acting, and **a random *Patrol* stop on a city read** (12 % per ten-minute bucket, +5 / +10 by Heat state, +10 *Watched*, −10 *Warned*, 5–40; at most two a night per city; never on an act, a timer or with the app closed) | §13.1, §14.12, §20, Appendix C #101 |
| The result modal overflowed a 740 px phone and a 900 px desktop | **A compact result:** the picture 112 / 136 / 150 px by height; *How it went* only when it says something the stamp does not; bonus tags one line; the receipt's notes behind *Details*; three knock-on lines and *n more*; a ×3 or a reason line may scroll at most 100 px on a 740 px phone | §13.1a |

**New in 3.1:** Issues of the Week, Heat, Political Capital, Patronage, Legacy, Ambitions, Political Seasons, Jail, Home City, NPC fill, Capital Districts, Journeys, Mission tiers, Local Standing, the Office Ladder, Home cities and battlegrounds, Hostile ground, Homes, Quarters.

---

## 1. Vision

### 1.1 Pitch

Irongate City is a persistent browser RPG about **winning power, not fights**. Three political movements compete for five cities through canvassing, rallies, propaganda, espionage and elections. Players who win office pass laws that **change the rules of the game for everyone**. Each player also has a personal story running through the public one. It begins at the demobilisation office's counter and ends, if they're good enough, in the Legislative Chamber.

### 1.2 Design pillars

1. **Power, not strength.** Progress means being known, trusted, feared and elected. Stats matter, but reputation, office and influence are the real ladder.
2. **Politics changes the rules.** Ordinances and laws change real numbers, always within bounds set by the designers.
3. **The city has a mood.** Issues, weather, laws and headlines make every day play differently.
4. **Every player matters.** There are many offices, contribution is visible, and recognition is split by level bracket.
5. **Come back *for* something, never *because of* something.** Being away costs opportunity, never assets.
6. **A personal story inside a public one:** Origin, then Ambition, then Legacy.
7. **Built for short sessions.** This is a browser game played for a few minutes, several times a day. Every system follows these rules:
   - **One tap or one choice** by default. Flows with several steps are rare, at most 3 steps, and can be resumed after closing the tab.
   - **Never require being online at a set time.** Anything scheduled (Campaign Events, elections, journeys) resolves without the player, and the result waits in the Morning Paper.
   - **Short text.** Narrative is 2–3 lines of copy: an outcome text is **at most 240 characters and four sentences** (about 45 words), which wraps to five or six lines on a phone. Reward numbers are always visible; the odds behind a check are words, never percentages or rolls (§8.4).
   - **One result, one modal.** No long screens to scroll through.

### 1.3 What makes Irongate different

We share genre conventions with other persistent browser RPGs: an energy bar, jobs, a hospital, factions. Wherever a mechanic resembles another game's signature system, **we express it through politics rather than copy it.**

| Genre convention | Irongate's version |
|---|---|
| Get stronger, fight more | Get *known*: influence, office and legacy are the ladder |
| A second regenerating bar for crime | **Heat**, which works the other way: it rises with illegal actions and cools over time |
| NPC mission-givers | **Party Directives** set by your *elected* Faction Chair |
| Group crimes | **Campaign Events**: rallies, strikes and marches with roles |
| Achievements and merits | **Legacy**: your public political record |
| Long courses on real-time timers | **Patronage**: relationships with powerful NPCs that grow over real days |
| Territory wars | **Issues of the Week** and elections, fought for public opinion |

### 1.4 Fact sheet

| | |
|---|---|
| **Genre** | Text-based political browser RPG |
| **Platform** | Web browser, mobile-first responsive |
| **Audience** | 18–40; fans of incremental RPGs, political strategy, noir and crime drama, social simulation |
| **MVP scope** | 3 factions, 1 region (5 cities: 3 home cities and 2 battlegrounds), full political calendar, NPC-only combat, no PvP |
| **Session shape** | 3–5 sessions a day of 5–10 minutes each, plus optional longer evening sessions |
| **Monetisation** | Free-to-play; capped Energy Packs; Premium subscription ($9.99/mo); cosmetic season track |
| **Multiplayer** | Shared world from launch (elections, influence, co-op Campaign Events); PvP in v1.5 or later |

### 1.5 Plain words (review 2)

**A player reads everyday words; the design keeps its terms.** This document, the schemas, the ids and the rules say *canvass*, *propaganda*, *ordinance*, *endorsement*, *Local Standing*, *FXP*, *battleground*: those are the names of systems and they are stable. A screen never shows them. What a player reads is the plain word for what they are doing, the verb first, concrete before abstract, with the 1946 flavour in the nouns and the places rather than the verbs. The mapping lives in `copy.ts`; a screen that prints a system term is a bug the content tests catch (`docs/design/review-2-answers.md` §1.13).

| System term | The player reads |
|---|---|
| Canvassing · Propaganda · Intelligence · Council (the action types) | **Talk to voters** · **Spread the word** · **Watch and listen** · **Party meeting** (Speech and Training keep their names) |
| Flyers, bills, the bulletin · paste · hoardings · the mimeograph (in a title) | **flyers**, **posters**, **the party paper** · **put up** · **fences** · **Print five hundred flyers** |
| Ward (in prose) · the NPC marker *ward* · the ward vote · NPC candidates | **street(s)** · **Local candidate** (review 3; review 2's *local* alone could read as *from here*) · **local support** · **local candidates: townspeople run by the game** |
| Local Standing · Successes (as a count) | **Reputation** (the ladder's words stay) · **wins** |
| FXP / Faction XP · PC | **Party XP** · **Political Capital** (never abbreviated) |
| Ordinance · order paper · motion · to move · the division · *Against all* · rose without a motion | **council rule** · **up for a vote** · **proposal** · **put forward** · **the council's vote** · **None of these** · **the council couldn't agree** |
| Nominations · polls open · the count · the ballot · on the ballot · struck · the slate | **candidates** (*putting their names in*) · **voting** · **the result** · **vote** · **a candidate** · **your name comes off** · **who's standing** |
| To declare · endorse · an endorsement · the deposit · the stipend · the chamber | **to stand** · **back** · **a backer** · *costs 10 Political Capital, returned only if you don't find two backers* · **pay** · **the council** |
| Polling Day (the paper's row) | **Election** (the same card on the city screen, §15.3) |
| Battleground (the state) · battleground city · Groundswell · the ledger · momentum · swing · hostile ground | **close race** · **contested city** · **comeback** · **the scoreboard** · **points** · **opinion** · **rival ground** |
| Restore the base (the crisis orders) | **Win back {city}** |
| Journey event · residence · this cycle (the ledger's period) · the count page · a bloc · D'Hondt and the score formula (slice 4) | **on the way** · **where you live** / **you live in {district}** (review 4; was *registered in*; the button is *Live here*) · **this election** · **the result** · **a party** · never shown: one fixed sentence (*the top score takes the first seat; a party takes both only with more than twice the next*) |
| Encounter · Fight / Flee / Bluff / Bribe · auto-resolve · approach · Criminal Record (Clean / Known / Repeat Offender / Notorious) · caught · jail · hospital · extended surveillance · disruption / sabotage / vandalism / theft (the type labels) · hostile deck (slice 5) | **a run-in** · **Fight · Run · Talk your way out · Pay them off** · **Leave it to luck** · **a way** (*Choose a way*, *Last time*) · **your record** (*Clean · On file · Repeat offender · Notorious*) · **your name taken** · **the cells** · **the infirmary** · *Mission · Watch and listen* · *Mission · Against the {faction}* · *on the way* (the same cards) |
| Campaign Event (co-op, scheduling, resolution) · roles and NPC volunteers · Triumph / Success / Mixed / Fiasco · presence · the contribution ledger (faction) · chat channels · favours (slice 6) | **a campaign event** (*call an event*, *join*, *settles at {time}*) · **a role**, **a hand**, **the branch's volunteers: townspeople run by the game** · **Triumph · Success · Mixed · Fiasco** (the stamps) · **Here now** · **the scoreboard** · **Party** and **{City} branch** · **Post bail**, **Visit**, **Ask to join** |

| The Legislature · a deputy · a bill · to table · the division · repeal · the whip · the branch's motion (the Chair's) · NPC deputies · Directives (the Chair's) · the push order · the group target · National Control · the national score · head of state · the primary · the stand-in · the list · recall petition · no-confidence · the Chair's confidence vote · veto · override · provisional (slice 7) | **Parliament** · **deputy** · **a law up for a vote** · **put {law} to Parliament** · **Parliament votes** · **strike out** · **the party line** · **the party's rule** · **local deputies: townspeople run by the game** · **Party orders · set by the Chair, {name}** · **the Chair's push** · **the party's target today** · **who holds the republic** · **the party's score** · **the President** · **the party's pick** (*the Acclamation* / *the Congress* / *the Convention*) · **the party's own candidate · run by the game** · **the party's list** · **a petition to dissolve the council** · **a vote to remove the President** · **a vote on the Chair** · **veto** (kept) · **vote it through anyway** · **to be confirmed tomorrow** |

| Equipment · inventory · a slot · tier I–V · armour · utility · accessory · document · outfit / loadout · equip · CHA · high-society venue · social mission · the Black Market · Dossier entry · subject · stale · Case File · exposé · informant · patron tier · Legacy points · perk · Season Score · rollover (slice 8) | **the Wardrobe** · **everything you own** · **Coat / On you / Papers / Tools** · **work clothes / a good coat / a tailor's suit / a society wardrobe** · **holds up in a run-in** · **tools** · **on you** · **papers** · **outfit** (*Town*, *Plain clothes*, *Evening*) · **wear** · **Charisma** · **the money side of town** · **a society call** · **the back room** · **an entry** · **a name** · **stale** · **a Case File** (kept) · **an exposé** (kept; *Take it to the paper*) · **an informant** · **Acquaintance / Associate / Confidant / Protégé** · **Legacy** · **a lasting perk** · **the season's score** · **the new season** |

| Moderation · a moderator · report · flag · word filter · rate limit · timeout · suspension · ban · warning · appeal · multi-account · linked · set aside · the 24-hour audit · rename · telemetry · accessibility · maintenance (slice 9) | **the moderators** (a note is signed **the editor**) · **Report this** with four reasons · never shown · ***That can't be said here.*** · ***Slow down a moment.*** · **muted until {date}** · **suspended until {date}** · **closed** · **a note from the editor** · **Reply to the moderators** · never shown; a count's one line ***{n} votes set aside after the audit*** · **the audit** (kept) · **Change your name** · never shown · **Settings** (Motion, Text size, Map at night, Clouds, Chat) · ***The presses are stopped. Back at {time}.*** |

**Kept, with a help note on the label** (§3.7): Energy, Rested, XP, Party XP, Political Capital, Reputation, Morale (Fired up / Steady / Unrest), Seniority, Party orders, Election, Council rule, Backers, Local support, Issue; from slice 7 Parliament, President, Chair, Governor, deputy, term, veto, the party line, the law book, who holds the republic; from slice 8 Charisma, the Wardrobe, the Dossier, a Case File, Favour, Legacy, the season, where you sleep; from slice 9 the audit and Settings' five labels. Stats are written in full in sentences and on tickets (*Intelligence*, *your best, Strength*); the three-letter codes stay only on the Me tab's stat table and the level-up buttons. The full old → new tables, by content file: `docs/design/review-2-answers.md` §1.

---

## 2. Time model

Every system uses the same clock.

| Unit | Length | What happens |
|---|---|---|
| **Tick** | 10 min | Energy regen, HP regen, Heat cooling |
| **City Day** | 1 real day, 00:00–24:00 server time (UTC) | Daily resets: weather, salary and seniority, Directives, bar limits. **Polls are open somewhere every day**, and every day some city counts, seats a council or divides on an ordinance. |
| **Week** | 7 City Days, from Monday 00:00 | Issues of the Week rotate; patron Requests refresh |
| **Council Cycle** | 5 City Days | Every city elects its council once per cycle, staggered by one day (offsets Irongate 0 · Ashford 1 · Coalport 2 · Duskwall 3 · Clearwater 4). Cycle days **0–1 nominations, 2–4 polls open**, the **count** at the boundary into day 0; the new council **divides on its ordinance** on days 0–1 and the ordinance is in force from day 2 for five days (§15.3). No phase has a clock time |
| **Term** | 28 City Days, from a fixed epoch (`termDay = (dayKey − TERM_EPOCH) mod 28`, term day 0 a Monday; slice 7) | The President and Parliament sit from term day 0. **The Chair:** names in days 9–10, voting 11–13, the result into day 14. **The republic:** names in days 19–20, the party's pick 21–22, voting 23–26, the count into day 27 (*to be confirmed tomorrow*), office from the next day 0 (§15.4, §15.5). No phase has a clock time |
| **Political Season** | 84 City Days (12 weeks) = **one in-game year** | 3 national elections; the third is the **Season Election** |
| **Weather season** | 21 City Days | Spring (weeks 1–3), Summer (4–6), Autumn (7–9), Winter (10–12) |

### 2.1 A season at a glance

| Week | Weather | Politics |
|---|---|---|
| 1–3 | Spring | Term 1. The new government from last season's Season Election governs. |
| 4 | Summer | **National election, day 28** |
| 5–8 | Summer / Autumn | Term 2. **National election, day 56** |
| 9–11 | Autumn / Winter | Term 3, a campaign run under winter conditions |
| 12 | Winter | **Season Election, day 84**, then season awards and rollover (§22) |

Council elections, Issues, Directives and Campaign Events run continuously underneath.

### 2.2 Day and night (new)

- **The City Day boundary is 00:00 UTC for the MVP** (Appendix C #1, closed). Every daily rule (salary and seniority, Directives, the Today tally, the Morning Paper's "new day") is stated per boundary crossed, so it can be settled lazily on the next read; only true events need a scheduled job.
- ~~**Night is 20:00–06:00 UTC**, the same for everyone.~~ **Superseded 8 Oct 2026 (review 5): night is the last two hours of every six-hour game day, the bullet after next.** City maps show their night art at night. In slice 1 it was **purely cosmetic**: no odds, costs, rewards or availability changed. Every rule that mentions night (the Curfew Order, recognition on rival ground, night windows on missions, patrols) reads the one window of §2.2, so the map always agrees with the rules.
- **The clock (review 4).** The top bar shows **the time in the player's own clock** (*14:22*, Courier), ticking from the server's clock (the dev panel's test clock included), with a help note (reworded in review 5 for the six-hour day): *The game runs on real time, shown in your own clock. The day turns at {dayTurn}. The town's own day is six hours long: dusk comes round four times a day, and the map and the streets are dark for two hours each time. Every time you read in the game is in this clock.* **Every countdown is written one way**, by how far off it is: **in {n} min** under an hour · **at {hh:mm}** later today · **tomorrow {hh:mm}** · **{Weekday}** from two days. A length that is not a moment is a count (*38 minutes*, *3 days left*). *By* is not used. **A boundary always prints its time** (*until tomorrow 01:00*, *until Saturday 01:00*); a day-granular line prints the weekday alone (*from Thursday*, *move again from Monday*). Strings: `docs/design/review-4-answers.md` §4.
- **The town's day is six hours long (review 5, decided by the user 8 Oct 2026; `docs/design/review-5-answers.md` §11).** The City Day and every rule with a day in it stay on the real day above; only **night** moves: **the last two hours of every six from 00:00 UTC** (dusk at 04, 10, 16 and 22 UTC; dawn at 00, 06, 12 and 18), the same for everyone, so every real day has eight hours of dark in four windows and no time zone is the night zone. This **replaces the 20:00–06:00 UTC window above** everywhere it is read: the map's night art, the clouds, the Curfew Order (§15.8), recognition at night (§14.12) and the night rules of §13.1 and §14.12; the plate prints *Dusk in 40 min* / *Night · dawn at 18:00*; the HUD keeps the player's own clock, and its note says the town's day is six hours. `packages/rules`: `GAME_DAY_HOURS = 6`, `NIGHT_HOURS = 2`, `isNight`, `nextDusk`, `nextDawn`. Option A (real days, a shorter visual cycle only) and option C (everything on a six-hour day) were laid out and not taken: A contradicts the clock and the rules, C breaks the daily rhythm short sessions depend on (Appendix C #100).

---

## 3. The Session Loop

### 3.1 The core loop

```
 READ THE CITY ──► CHOOSE AN AGENDA ──► SPEND ENERGY ──► SEE YOUR IMPACT ──► LEAVE SOMETHING PENDING
  (Morning Paper)   (Directive, Issue,    (missions, events,   (ledger, headlines,   (event sign-up, vote,
                     Ambition, job, patron) canvassing, intel)   PC, FXP, favour)      patron request, course)
        ▲                                                                                   │
        └──────────────────── Energy refills (3h20) · the city changes ◄────────────────────┘
```

Over the long run, sessions add up to **influence**, which shifts **cities**. Cities swing **elections**, and elections put players in **office**. Office lets them write the **laws** that change what every session looks like.

### 3.2 A typical session (5–10 minutes)

1. **Open the Morning Paper** (about 30 s). See what changed since last time, today's Issues, which city votes today, and your desk: salary, Rested, Heat, letters.
2. **Take care of the quick things** (about 30 s). Collect anything waiting, vote if your city votes today, read a patron's letter. **None of this is mandatory upkeep.**
3. **Pick an agenda** (about 10 s). The paper suggests three: *"Party Directive: canvass Clearwater (0/3)"*, *"Issue: the bread lines in Coalport"*, *"Ambition: Chapter 4 is ready"*.
4. **Spend Energy** (1–5 min). Mostly one-tap actions at a location, repeated ×3 or ×5, with results inline. Maybe one tier-2 mission with a real choice. Sign up for an event role.
5. **See the result** (about 15 s). The ledger shows *"You moved Clearwater +0.8 % for the Red Collective today."* You earned FXP and Political Capital, and your Directive progress went up.
6. **Leave something pending.** A rally you signed up for starts at 19:00. The Ashford council vote closes tonight. A patron will reply tomorrow. Chapter 5 unlocks in 3 days.

### 3.3 The Morning Paper

The first screen after the City Day changes, and after any absence of 3 hours or more. It can be dismissed with one tap and reopened any time.

| Section | Contents |
|---|---|
| **Headline** | The biggest political event since your last visit: a law passed, a city changing hands, a scandal |
| **The Issues** | Each city's two Issues of the Week and which faction is leading on each |
| **Election** (*Polling Day* until review 2) | The home city's election in plain words: the phase, what you can do now, a countdown, one tap |
| **Your Desk** | Salary paid and seniority, Rested banked, Heat level, Dossier entries going stale |
| **Party Orders** | Today's Directives from your Faction Chair |
| **Letters** | Patron replies and Requests, Ambition chapters ready |
| **In Print** | **Your name in the paper** when you top a ledger, become City Hero, win a seat or get caught |
| **Weather** | Today's weather in each city and its effect on missions |
| **While You Were Away** | Shown after 2+ days away: a digest of elections, laws and city changes |

**Mastheads.** Each home city has its own paper: *The Coalport Clarion* ("The voice of the mill and the quays", 5 marks), *The Duskwall Sentinel* ("For the city and the frontier", 5 marks) and *The Ashford Gazette* ("Fair report, free comment", 6 marks). Capital residents read the national ***Irongate Herald*** ("All the republic, every morning", 6 marks; slice 4); Clearwater residents the *Clearwater Courier* (slice 7). The masthead is content; the app-shell banner reads *The {short name} is in*.

**Your paper, in a local edition (review 4, 6 Oct 2026; `docs/design/review-4-answers.md` §23).** A player has **one paper, the paper of where they live**, and it is **printed in a local edition for the city they are in**: the masthead carries *· {City} edition* under the name, the dateline names the city, and the paper's **local** parts are that city's while its **own** parts follow the player. **Local:** the ambient headlines, one city line when the city has one that day (the Herald's own lines in the Irongate edition; **six neutral `{city}` templates** for every other city, `hl.local.*`: the count, voting open, candidates wanted, the rule in force, callers from other parties, the home party's share, `docs/design/review-4-answers.md` §29.1; the home voice stays at home), the Issues (the city's two first, the residence's second), a Courier note of the city's election phase (not actionable). **Own:** the personal headlines (*In Print*), the Election row (the residence's, actionable), Party orders, Letters, the desk (with *Where you are* when away), Events, *From the capital*, *While you were away*. On a train the edition is the destination's; at home there is no edition line. **Rival ground reads the same way** (*The Coalport Clarion · Duskwall edition*), and **the Herald is no longer forced on a visitor to the capital** (a Coalport resident there reads *The Coalport Clarion · Irongate edition*; the slice-4 and slice-5 sentences below that say otherwise are superseded). The local parts are live at read; the own parts are stored at settlement, so an edition can be reopened.

**Dateline:** `{Weekday} · {D Month} · {City}` from the real UTC date, British form: *Tuesday · 29 September · Coalport*. **No year is printed anywhere in the paper.** The game is 1946 but the calendar is real (§2: one City Day = one real day, and the weekday drives the Monday sick-day refill), so the weekday must be the true one and a year would either break the fiction or contradict the weekday.

**Slice 1 (v1) scope:** headlines (2–3, at most two personal), **Party orders**, and **Your desk** with salary and seniority (*Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)*), Rested banked, Energy and when it is full, Level and XP to next, Local Standing, and *Yesterday* (the Today tally of the previous City Day, §3.7). Headline templates, their conditions and priorities are in `docs/design/slice-1-content.md` §7.

**Slice 2 (v2): the welcome edition and Letters.** The first edition a character sees is the **welcome edition**: three headlines (*Welcome to {city}* with the secretary's name and where to spend the first Energy; the city's arrival notice with the player's name, first edition only; the morale line), the **welcome set** of Party orders (§13.7), a **Letters** row (*From the office's post: Chapter 1 is ready · 10 Energy*, §17.1; review 5: was *From your father's things*) and the desk with a *Wearing* row (§8.2). It is the whole tutorial without being one (§7.5). Letters carries Ambition chapters from slice 2 and patron letters from slice 8. Per-city welcome texts are in `docs/design/slice-2-onboarding.md` §7.

**Slice 3 (v3): the Election row and In Print.** An **Election** row (*Polling Day* until review 2) every morning states the home city's phase in plain words and carries the one tap that matters (*Vote now*, *Stand for the council · 10 Political Capital*, *Vote on the rule*), or *Coalport votes from Thursday* when nothing is open; it is live at read, never baked into an edition, and it is the same card the city screen shows under its plate (§15.3). **In Print** begins with the seat: on **the first edition the winner opens during the term** (the count morning for most; later for a player who was away, since being away costs the chamber vote, never the moment), the front page carries the player's avatar as a printed photograph with the stamp **ELECTED**, the headline with their name, the deck and the count table, and one CTA, *To the council*; the seat headline is left out of the block beneath it, and after the term the seat lives in the count view and the Me tab only. Losing (by a margin or on the tie-break), the count, a candidacy struck or confirmed on the morning the polls open, and the fate of the player's own vote are ordinary headlines. Every boundary named in a headline or a result is rendered in the player's clock (*Tuesday midnight*, or *Wednesday 01:00* at UTC+1); a headline on the count morning says *today*, since nominations are open that morning. Templates per paper: `docs/design/slice-3-politics.md` §8; the screen: `docs/design/slice-3-screens.md` §2.

**Slice 4 (v4): the Issues and the capital.** **The Issues** section is live at read, between the headlines and the Election row: the residence city's two Issues first, then the capital's two, then the other cities folded; each row shows the Issue, every faction's momentum and who leads (Issues are public arguments; nothing about them is secret). *In Print* gains the **District Hero** and **City Hero** lines at each count and the reporter's quote from the journey card. The Herald gains the arrival, residence, battleground, groundswell and count-by-district headlines (`docs/design/slice-4-battleground.md` §12); every home paper gains *The Train Is Open* at Level 10 and its Issue lines.

**Slice 5 (v5): Heat, the record and the harder work.** The desk gains a **Heat** row when Heat is above 0 (*Noticed (32), cooling · Cool by 20:40*) and a **Your record** row above *Clean*; in the cells or the infirmary the desk's first row is the held line; on rival ground a *Where you are* row. *In Print* gains the cells, the infirmary and *{name} Seen Where They Shouldn't Be* (while *Hot*). Every paper gains ten templates (the quarter opening, the first mission, the name taken, the record's level, rival-ground trips, deportation, rival callers on the home streets); `docs/design/slice-5-risk.md` §14. **A visitor on rival ground reads their own home paper** (a rival's paper would print its personal headlines in the wrong voice).

**Slice 6 (v6): Events and the branch.** An **Events** section under Party orders, live at read: one row per open Campaign Event of the member's faction in the residence city (*Today: the branch's canvass drive on Foundry Row · settles at midnight · 2 of 4 roles · you're the Coordinator* / *Join*), a tap opening the event; the welcome edition's row points a new member at the branch's fixture (*join as a hand · 5 Energy*, §16.3). *In Print* gains the event results (*{name} and the Branch Carry {venue}* on a Triumph, with the rosette; the Success, Mixed and Fiasco lines), *{payer} Posts Bail for {name}* and *Visitors for {name} on the Ward*; the desk a *Signed up* row. Every paper gains ten templates (`docs/design/slice-6-together.md` §10).

**Slice 7 (v7): the republic.** A section ***From the capital*** (the Herald: *The republic*) under the headlines, live at read: at most two national lines a day in one set of words printed in every paper (the President's oath, a law in force, a veto, who leads the republic, a council dissolved, a Chair elected…), and a Courier line with the one tap when a window is open (*The republic votes until {until} · Vote now*). The **Election** row carries up to two rows when the council's and a national window are open. **The front page** (the photograph, the stamp **ELECTED**) also serves a Governor, a Chair, a deputy and the President, the caption naming the office. **Your desk** gains a line per office held and *Law: {name} {effect}* lines beside the council rule's; **Party orders** reads *Set by the Chair, {name}* with the push's target bar. ***The Clearwater Courier*** ("Lake, town and harbour, every morning", 6 marks) is confirmed: residents read it, visitors while in the city. Templates: `docs/design/slice-7-nation.md` §11.

**Slice 8 (v8): a life in the city.** **Letters** carries, after the chapters, **patron Requests** (*From Edith Crane: two entries for my files from Garrison Hill · by Thursday · Favour +6*), an **informant's** report every second morning, and a patron's Monday **gossip** (a free Dossier entry). **Your desk** gains **Dossier** (*{n} entries · {m} go stale tomorrow*), **Patrons** (*Crane: Associate 41 · Marr: Acquaintance 12*), **Where you sleep** (*A flat in Coalport · paid until Thursday*) and **Ahead**: up to three clocks (*Chapter 5 from Tuesday · Crane: Confidant at 60 · the Season Election in 12 days*), which is how the paper answers "what am I working toward this month". ***In Print*** gains **the exposé's front page** (the player's name under the headline, the name exposed, the swing), the page-three line and the spiked note, *A New Coat on {name}*, the flat, every Legacy entry and *{name} Recognised in {city}*. ***From the capital*** carries *A Week to the Season Election* on season day 77 and the countdown in the last week; the **season front page** on the new season's day 0 names the Champion, the awards and the player's own Legacy line. Templates: `docs/design/slice-8-life.md` §10.

**Slice 9 (v9): away, and the editor.** ***While you were away*** opens the paper after **two or more City Days** away: one row of at most four lines from the existing templates (the days; the republic's line; the city's; the branch's; what was banked: the wage, Rested, letters waiting), with the missed editions folded by day behind a tap. After **30 days** the row reads *Welcome back* and Rested is filled to the cap at the first read (§4.2). **Letters** gains *From the editor* rows: a note about the room (§16.2), *A line you reported was dealt with*, the moderators' answer to a reply, and the weekly *How's it going?* that opens the feedback form. **The Courier's day-0 line** after the national count reads *The count is confirmed* or *The count is confirmed; {n} votes were set aside after the audit* (§15.2). Rows and strings: `docs/design/slice-9-screens.md` §7, §8, §10, §11.3.

### 3.4 Agendas: what to spend Energy on

| Agenda | Source | Why it matters |
|---|---|---|
| **Party Directive** | Your elected Faction Chair (§15.4) | +25 % FXP on matching actions and a daily completion bonus |
| **Issue** | Issues of the Week (§14.6) | +50 % influence in that city; resolving the Issue gives your faction credit |
| **Ambition** | Your personal storyline (§17.1) | Unique rewards, patron introductions, Legacy |
| **Patron Request** | Your patrons (§17.2) | Favour, which unlocks perks and endorsements |
| **Campaign Event** | Scheduled by faction members (§16.3) | Co-op influence swing, PC, a headline |
| **Election** | The calendar (§15) | Vote, campaign, stand for office |

### 3.5 Session archetypes

| Archetype | Length | Typical content |
|---|---|---|
| **Quick check** | 1–2 min | Paper, vote, collect, sign up for an evening event |
| **Regular** | 5–10 min, 3–4 a day | Spend a full Energy bar on an agenda |
| **Chained** (optional) | Several regular sessions back to back | A player who wants to play longer simply keeps going: Dossier work, an Ambition chapter, campaigning. Nothing requires it |
| **Polling day** | Varies | Candidates and faction mates push for votes in the city that's voting |

### 3.6 The first week, month and season (new)

The first days give a **taste** of everything: one-tap play, a vote, a group event, your name in the paper. **Power comes later**: it is climbed rung by rung (§15.1), contested, and never permanent. Each stage opens a new *kind* of play, not just bigger numbers.

| When | Where the player lives | What opens up |
|---|---|---|
| **Days 1–3: home** | Your faction's **home city** (a Collective recruit starts in Coalport, §14.11). Safe ground: no encounters, the police are on your side | The origin story and Ambition chapter 1 · the welcome edition of the Morning Paper and first Party Orders · one-tap actions, the first job and outfit · the first tier-2 mission · the first Campaign Event with faction mates · **the first vote** in the home council race (the right at Rank 2 on day 2; the ballot by day 4, since the home city's polls are open three days in five) · your name in the paper |
| **Days 4–14: the district** | Home, with first trips out | **Level 10 opens the train** (about day 5) · the first visit to a battleground and the first journey event · **Rank 3** (about day 10): stand for your home council if you're *Known* locally and 2 faction members endorse you · illegal missions and Heat · safehouses |
| **Weeks 3–4: the move** | The big decision: **move to a battleground** (an Irongate district or Clearwater) to vote and stand where power is decided, or stay home and rise in the party | The first patron at Associate · the first Case File · a first council seat for the committed |
| **Months 2–3: the city** | Home or a battleground | **Governor or Mayor** after a council term · **Faction Chair** at Rank 4 · spy trips into rival home cities (§14.12) · exposés · running your own events · a better home (§17.4) |
| **End of season 1: the nation** | | **Rank 5**: Legislature deputy (after being Governor or serving 3 council terms) and ministries · the Season Election, where only the most dedicated stand for head of government |
| **Season 2 and after: the republic** | | **President** (slice 7: one office at the top) · Speaker · Legacy perks · Tier V regalia · Protégé patrons · the second Ambition · the Hall of Fame · and every office has to be won again each term |

### 3.7 The "Today" tally (new)

A one-line running total of the current City Day (from 00:00 UTC, §2.2), on the city screen and as *Yesterday* in the Morning Paper: **Energy spent · attempts · Successes · XP · FXP · Iron earned by actions · opinion moved · Directives done (n / 3) · stat points trained.** It resets at the boundary; nothing is lost, it becomes yesterday. The wage is not in the tally: it lands at the boundary and shows on the desk (§9). It exists so that a five-minute session ends with a visible sum, not a scroll through a log.

**Every item has a note (review 1).** The tally's label and each of its items, like every other label that carries a rule (Reputation, the share bar, the morale word, the council-rule line, the Election card, Energy, Rested, XP, Party XP, Political Capital, Seniority, Party orders), is set with a **dotted underline** and opens a **two-line note in the paper's voice** on a tap: *ATTEMPTS · Actions taken today, a ×3 counting three.* No "i" icons anywhere; the paper has none. The one first-time hint is on the city plate on the welcome day: *Anything underlined can be tapped for what it means.* The notes: `docs/design/review-1-answers.md` §5.

---

## 4. Retention: why players come back

### 4.1 Hooks by timescale

All of these are **positive**: something to look forward to.

| Timescale | Hook |
|---|---|
| **Minutes** | Energy refills (100 in 3h20); a Campaign Event you joined is about to start |
| **Daily** | The Morning Paper; a council election somewhere; new Party Directives; a day's pay on the desk; bar and social opportunities; new weather |
| **Every 5 days** | Your Home City's council election; councillor terms; the Influence Ledger and City Hero titles |
| **Weekly** | Issues of the Week resolve and new ones arrive; patron Requests; weekly social events (opera, lectures) |
| **Every 28 days** | National election; a new government and new laws; new Ambition chapters (live content) |
| **Every 12 weeks** | Season Election, season awards, a Season Twist that changes the rules, a new season track |
| **Long term** | Rank 7, Legacy perks, Tier V regalia, Protégé status with a patron, Hall of Fame |

### 4.2 What being away costs

| Away for | What happens |
|---|---|
| **3 hours** | Nothing is lost. Energy is full and overflow banks as **Rested** (§6.3). |
| **1 day** | Your job pays its full day's wage automatically, and seniority goes on counting. Rested keeps banking up to its cap. Today's Directives are missed: a missed opportunity, nothing taken away. |
| **1 week** | Dossier entries are flagged stale. A bodyguard contract may run out. A council term you held has ended normally. The job and its seniority are untouched. |
| **2 weeks or more** | Pay stops accruing after **14 boundaries** (§9.1): you keep the job and pay resumes at the next boundary. Unearned pay is opportunity, not an asset. |
| **1 month or more** | **Welcome Back package**: Rested full, a "While You Were Away" digest, and a returning-operative Ambition chapter. **Slice 9:** the digest is the paper's *While you were away* row from **two days** away (§3.3); after **30 days** Rested is filled to the cap at the first read and the row says *Welcome back*; the returning chapter is post-MVP. |
| **The cells or the infirmary** (not absence, but the same rule; review 4) | Time in which Energy actions are closed, **the day's Party orders are off** (opportunity), and **a mark on the record** (a rate, §11.3). Energy, Rested, the wage, Heat's cooling and every political act of the residence carry on. Nothing owned is touched (§19.2). |

### 4.3 Rules we don't break

1. **Being away never destroys what a player owns.** It costs opportunity only.
2. **Absence never lowers a rate.** Seniority (§9.1) counts every day the job is held, present or not; only the player's own switch resets it, and the job is never lost.
3. **Losses belong to competition.** Losing an election, an Issue or city control is fine: players had agency and it's part of the story.
4. **Collective decay is acceptable.** City influence drifting back toward equilibrium is a problem for the faction, and it gives newcomers something to do.
5. **Every timer is either a reward arriving or a choice to make.** None is a threat.

---

## 5. Progression

### 5.1 Progression tracks

| Track | Earned by | Unlocks | Survives a season? |
|---|---|---|---|
| **Level** (XP) | All missions | Content tiers, cities, equipment tiers | Yes |
| **Faction Rank** (FXP) | Faction missions, Directives, events, offices | Political rights: voting, standing, leading, legislating | Yes |
| **Stats** (STR, INT, AGI) | Level-ups, training, stealth missions | Mission success, jobs, milestones | Yes |
| **Wardrobe** (CHA) | Buying and earning clothing | Social access, high-society missions | Yes |
| **Political Capital** (PC) | Offices, events, Issues, Directives, City Hero | Political actions (§6.5) | Yes, capped at 1,000 |
| **Office** | Winning elections, appointment | Temporary power: ordinances, laws, ministries | No: offices have terms |
| **Patronage** (Favour) | Patron Requests, gifts, social missions | Introductions, favours, endorsements, unique items | Yes |
| **Legacy** | A permanent public record of achievements | Small permanent perks | Yes |
| **Ambition** | Chapter requirements | Story, unique items, Legacy | Yes |
| **Season Standing** | Seasonal activity | Season track rewards | No: resets each season |

### 5.2 Pacing targets

**Reference player:** 3 sessions a day about six hours apart, so **300 Energy a day, nearly all of it carrying the Rested bonus** (about 400–450 Energy-equivalents of XP and Iron), with about 60 % of Energy spent on actions that earn FXP (more in week 1, when there is little else to spend on). Reward rates (§5.5) are tuned to hit these targets and are checked against telemetry after launch. The working is in **`docs/economy.md`**, which also models a casual (2 sessions), a regular (4) and a heavy (6) player; the heavy player runs about 35 % ahead of the reference, by design.

| Milestone | Target | Why it matters |
|---|---|---|
| First job, first outfit, first Campaign Event (**as a hand at the branch's daily fixture**, any Rank; §16.3) | Day 1 | Every core system touched in the first sessions |
| Rank 2: **vote** | Day 2 (the right); **the first ballot by day 4** | A taste of politics from day 2. The home city's polls are open three days in five (§15.3), so 60 % of new players vote the day they make Rank 2 and the rest within two days; the paper says when |
| Level 10: **train travel** | ~Day 5 | The map opens once the home city is familiar |
| Rank 3: **stand for council**, lead events, illegal missions | ~Day 10 | The first real political step, in week 2 |
| Level 16: full map, Case Files | ~Week 2 | Slice 8: the first Case File about day 13; the first exposé the same week. **Patrons and the flat open at Level 10** with the train (both patrons live in battlegrounds): the first Request about day 7, Associate about day 12–20 |
| Moving to a battleground | Weeks 3–4 (allowed from Rank 2 and Level 10, about day 5; slice 4 measures when it happens) | A player's own choice, not a gate |
| Rank 4: Faction Chair candidacy | ~Week 4 | |
| Level 31 | ~Week 6 | |
| **Rank 5: Legislature and ministries** | **~Week 8** | National politics for committed players in season 1 |
| Rank 6: **head-of-government candidacy** (also needs a term as deputy or minister) | ~Week 12 | The top prize is for the end of season 1 at the earliest |
| Level 51 | ~Week 20 | |
| Rank 7 | ~Week 24 | The top rank in season 2 |

### 5.3 Levels

Each level-up gives +5 max HP and +1 stat point to **STR, INT or AGI** (review 1: AGI was training-and-stealth only, which left an AGI origin build with nothing but 30-Energy training until stealth missions arrive in slice 5). CHA comes from clothing. **The choice screen explains the choice:** a lead line computed from the residence city's checked actions (*Most of the work in Duskwall uses INT: 9 of 15 actions. Your best is STR 13.*; a single-stat action counts for its stat, a two-stat action for both, a best-stat action for none) and one line per stat saying which actions here use it and what it opens later; the point still waits on the character screen and nothing is lost by choosing late. **The picker is three paper cards in the ticket's style (review 5, 8 Oct 2026)**, one per stat, the whole card the tap (*Strength* · its line · *8 → 9*; tags *Most used here* and *Your best*; the placed card reads *Strength 9 · +1*), the heading *Level 4 · one point to place*; **in a result modal it is one line and a *Place it* button that opens the cards as a sheet**, so a result never scrolls for it; on the Me tab the cards are inline (`docs/design/review-5-answers.md` §3–§4)r. Strings: `docs/design/review-1-answers.md` §7.

| Levels | Cumulative XP | Unlocks |
|---|---|---|
| 1–5 | 0 – 2,499 | Home city missions, Tier I equipment, faction HQ, Jobs board, first surveillance |
| 6–15 | 2,500 – 19,999 | Bar services and social missions (with CHA) at Level 6; **train travel at Level 10**; Tier II equipment |
| 16–30 | 20,000 – 99,999 | Full 5-city map, Tier III equipment, expanded Dossier, Case Files |
| 31–50 | 100,000 – 399,999 | Cross-city operations, Tier IV equipment, senior job postings |
| 51+ | 400,000+ | Elite missions, Tier V Legendary quest chains, Hall of Fame |

**Per-level thresholds** (cumulative XP at which the level is reached; the XP needed for the next level never shrinks). Tuned so the reference player (§5.2) reaches Level 6 on day 2, Level 10 about day 5, Level 16 about day 13 and Level 31 about week 6–7.

| Level | XP | Level | XP | Level | XP | Level | XP | Level | XP |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 9,000 | 21 | 37,000 | 31 | 100,000 | 41 | 220,000 |
| 2 | 150 | 12 | 10,800 | 22 | 41,400 | 32 | 109,300 | 42 | 235,300 |
| 3 | 450 | 13 | 12,800 | 23 | 46,200 | 33 | 119,200 | 43 | 251,200 |
| 4 | 900 | 14 | 15,000 | 24 | 51,400 | 34 | 129,700 | 44 | 267,700 |
| 5 | 1,600 | 15 | 17,400 | 25 | 57,000 | 35 | 140,800 | 45 | 284,800 |
| 6 | 2,500 | 16 | 20,000 | 26 | 63,000 | 36 | 152,500 | 46 | 302,500 |
| 7 | 3,500 | 17 | 22,800 | 27 | 69,400 | 37 | 164,800 | 47 | 320,800 |
| 8 | 4,650 | 18 | 25,900 | 28 | 76,300 | 38 | 177,700 | 48 | 339,700 |
| 9 | 5,950 | 19 | 29,300 | 29 | 83,700 | 39 | 191,200 | 49 | 359,200 |
| 10 | 7,400 | 20 | 33,000 | 30 | 91,600 | 40 | 205,300 | 50 | 379,300 |

Level 51 is reached at **400,000**. From Level 31 the XP for the next level is 9,300 and grows by **600 per level** (Level 50 → 51 costs 20,700); above 51 the same +600 step continues, so Level 51 → 52 costs 21,300, and so on. There is no level cap.

- A player's level is the highest threshold their cumulative XP has reached. One action can cross several thresholds; each one grants its +5 max HP and +1 stat point.
- The stat point **waits** on the character screen until it is placed. It never expires, and nothing is lost by choosing later.

### 5.4 Faction Rank

Rank gives the **right** to stand. Each office also needs the rung below it on the **office ladder** (§15.1). The Rank 6 and 7 thresholds are retuned from v3.0 to fit the new pacing.

| Rank | FXP | Title (Vanguard / Collective / Alliance) | Unlocks |
|---|---|---|---|
| 1 | 0 | Initiate / Recruit / Volunteer | Faction HQ, faction chat, Tier I faction missions, **a hand's place at a Campaign Event** (slice 6, §16.3) |
| 2 | **400** | Steward / Activist / Campaigner | **Vote in all elections**, **named Campaign Event roles**, Dossier missions, sign Recall Petitions |
| 3 | 2,000 | Bailiff / Organiser / Agent | **Stand for City Council** (with the ladder conditions), **schedule Campaign Events**, illegal missions, safehouses, faction equipment, Jobs board Tier II |
| 4 | 6,000 | Prefect / Convenor / Senator | **Stand for Faction Chair** (after a council term), Political Protection perk (§11.4) |
| 5 | 15,000 | Intendant / Delegate / Representative | **Stand for the Legislature** and **be appointed Minister** (after a term as Governor or 3 council terms), Operation missions |
| 6 | 25,000 | Guardian / Tribune / Speaker | **Stand for President** (after a completed term as deputy; slice 7), eligible for Speaker, Tier V quest chains |
| 7 | 60,000 | Keeper of the Gate / Chairman / Prime Minister | Honorific title, Legacy unlocks, faction Hall of Fame |

**The ladder is one tap away (review 4).** The Party XP label (HUD and Me tab) opens the ladder: the faction's seven titles, the Party XP for each, and what each opens **in plain words** (1: the party's hall and its chat, a pair of hands at any campaign event · 2: the vote in every election, a named role, backing a candidate · 3: standing for the council, calling events, the harder missions · 4: standing for Chair after a council term, a mark struck off monthly · 5: the party's list for Parliament after a Governor's term or three on a council · 6: standing for President after a term in Parliament · 7: the title for life); the player's row is marked *you*, the next *next · {n} more*. The Me tab's party card prints *Activist · 1,212 / 2,000 to Organiser*. Strings: `docs/design/review-4-answers.md` §25.

Rank 2 was 500 in the first 3.1 draft; at the §5.5 rates the reference player reached it on day 3, not day 2, so it is now 400 (`docs/economy.md` §7).

The Collective's Rank 5 title was *Vanguard* in the first 3.1 draft, which read as the rival faction's name. It is now **Delegate**: what a workers' party sends to its Congress (§15.5) and to the Legislature, which is exactly what Rank 5 unlocks. The Alliance's Rank 3 title was *Councillor*, the office that rank lets you stand for; it is now **Agent** (a constituency agent runs campaigns, which is what Rank 3 unlocks). The Alliance's Rank 2 title was *Canvasser*; it is now **Campaigner** (review 2: the one rank title that was campaign jargon, §1.5). No faction is renamed (Appendix C #10 stays parked).

**The Vanguard ladder is a party's, not an army's** (content-policy review, 29 Sep 2026; `docs/design/content-policy-review.md`). *Footsoldier, Sergeant, Lieutenant, Captain, Commander, Marshal* were military and are gone. The titles now climb through the offices of an authoritarian party that runs its wards like a prefecture: a **Steward** keeps order at meetings (Rank 2 unlocks event roles), a **Bailiff** runs a ward (Rank 3, council), a **Prefect** a district (Rank 4, Chair), an **Intendant** sits above the prefects (Rank 5, the Legislature), a **Guardian** is the movement's elder (Rank 6) and the **Keeper of the Gate** is its honorific, from the crest. The Collective's *Commissar* and *Comrade-General* were real-world titles; they are now **Convenor** (the convenor of shop stewards, Rank 4) and **Tribune** (Rank 6). The Sentinel's rank headlines read *Made {rank} by the Vanguard*, as the Gazette's read *by the Alliance*.

### 5.5 Reward rates per mission tier (starting values)

| Tier | Level | Energy per mission | XP per Energy | FXP per Energy (faction missions) | Iron per Energy |
|---|---|---|---|---|---|
| T1 | 1–5 | 5–15 | 4.5 | 0.6 | 2 |
| T2 | 6–15 | 10–20 | 5 | 0.8 | 4 |
| T3 | 16–30 | 15–25 | 7 | 1.0 | 7 |
| T4 | 31–50 | 20–30 | 7.5 | 1.2 | 12 |
| T5 | 51+ | 25–30 | 8 | 1.4 | 20 |

About 25 % of a player's FXP should come from outside missions: Directive bonuses, Campaign Events, Issue resolution and office stipends. These rates are lower than the first 3.1 draft, to fit the slower pacing in §5.2. The current seed data (about 6 XP and 1.2 FXP per Energy) is too generous and needs to come down.

**Reference action:** a 10-Energy tier-1 canvass pays **45 XP / 6 FXP / 20 Iron** on Success and **23 / 3 / 10** on Partial. Opinion swing is set separately, per tier, in §14.2.

**Rounding.** Every reward line (XP, FXP, Iron, opinion) is worked out in full precision and then **rounded to the nearest whole number, halves up** (22.5 → 23). Base and bonus are rounded separately, so the tiles on the result modal always add up. A line that pays on Success never pays less than 1 on Partial. Opinion is the exception: it keeps three decimals (§14.2).

---

## 6. Resources

### 6.1 Health

| | |
|---|---|
| **Max** | 100 at Level 1, +5 for every level gained: 100 + 5 × (Level − 1), so 125 at Level 6 and 145 at 10 (QA slice 5, n10) |
| **Regen** | 10 HP per 10 min (passive) |
| **Lost through** | Combat encounters, and only combat. Neglect no longer drains health (the v3.0 system is removed). |
| **At 0** | Hospitalised (§19.1) |

**Slice 5 (pinned).** Health is a lazy timer like Energy (the value and a timestamp; +10 every ten minutes on read). It is lost only by **winning a fight** (§20.1: their power × 0.8 ± 20 %, less your armour) and set to 0 by losing one. **It shows on the HUD always, directly under Energy** (review 4, 6 Oct 2026: always, *Health · 125 / 125*; it was "only below full", which read as a fault when it appeared; **review 5, 8 Oct 2026: the order is Energy · Health · Heat · XP · Party XP** at every width, Energy over Health in the first column on wide screens, since the user reads Energy and Health as the pair they are), on the Me tab and in the encounter modal; a help note on the label. Max at Level 6 is 125, at Level 10 145.

### 6.2 Energy

| | |
|---|---|
| **Max** | 100 (Premium: 120) |
| **Regen** | **5 per 10 min**, server-side. Full from empty in 3h20. |
| **Spent on** | Missions (5–30), surveillance (3–5), training (§8.5), Campaign Event roles (5 for a hand, 10–15 for a named role; §16.3), social missions (5–12), bar activities (2–6). Never on a job (§9) |

Travel between cities costs time and a ticket, not Energy (§14.10). The slower regen (v3.0 was 5 per 5 min) fits 3–4 sessions a day without asking players to log in every 100 minutes. Rested absorbs the regen that would otherwise be wasted.

### 6.3 Rested (new)

While Energy is full, regen overflows into a **Rested** pool.

| | |
|---|---|
| **Cap** | 200 |
| **Effect** | Each Energy point spent **on an action Rested can boost** (checked actions and training) while Rested > 0 uses 1 Rested and gives **+50 % XP and +50 % Iron** on that action. FXP and influence get no bonus, so absence can't be converted into political power. |
| **Other sources** | Lodging and hotels (§6.7), Welcome Back package |

**Whose cap (slice 4, 3 Oct 2026).** The cap is **200 + the residence city's council rule and Issue effects of the day + 50 for a room in Irongate while it runs** (§14.11), wherever the player stands or rides; cap deltas add (a room under *Fever at St Agnes*: 300). One rule says where any council rule or Issue effect applies: **actions where you act, the wage where the job is, the Rested cap where you live.** Registering a residence or taking a room re-bases Energy at the tap; the pool keeps its value when a cap lapses.

A player who logs in once a day spends 100 Energy with a +50 % bonus on all of it. A player who logs in three times spends about 400. Neither gets punished; the frequent player simply does more.

**Where you sleep (slice 8, §17.4).** At every boundary the home adds to the pool: **+10 for the rented room, +25 for a paid flat**, banked up to the cap. A paid flat also lifts the cap by **+50** in its city; a room and a flat never stack (the larger applies).

**Rested is spent per Energy point, not per action.** If an action costs more Energy than the Rested left, only the covered points get the bonus: 3 Rested on a 10-Energy action uses all 3 and gives **+15 %** XP and Iron (50 % × 3⁄10). The result modal's Rested tag shows it as *"Rested: 3 of 10 Energy, +15 % XP and Iron"*. Nothing is held back or wasted, so a player never needs to plan around the last few points.

### 6.4 Heat (new)

Heat measures how much attention the authorities are paying you right now. It's the short-term counterpart to the long-term Criminal Record (§11).

| | |
|---|---|
| **Range** | 0–100 |
| **Rises with** | Illegal actions: Disruption +8, Sabotage +12, extended surveillance +5, vandalism +6, blackmail +10, Operations +15. **Doubled in a rival home city** (§14.12) |
| **Cools** | 5 per hour (from 100 to 0 in about 20 h); faster in Safehouses |

| Heat | Status | Effect |
|---|---|---|
| 0–24 | **Cool** | No effect |
| 25–49 | **Noticed** | Police encounter chance +5 %; caught checks +5 % |
| 50–74 | **Hot** | Police encounter chance +15 %; caught checks +15 %; the press may name you in the Morning Paper |
| 75–100 | **Wanted** | Any failed illegal action means arrest (§19.2); barred from high-society venues (slice 8: **every society call is barred while *Wanted***, §13.6) |

**Slice 5 (pinned; `docs/design/slice-5-risk.md` §6).** Heat is a whole number 0–100, **cooling 5 an hour continuously and lazily** (the value and a timestamp). It rises by the mission's type on **every outcome** (surveillance +5, vandalism +6, disruption +8, theft +10, sabotage +12; **×2 on rival ground**), by the parcel card's Partial (+10), a failed *Pay them off* (+10) and a checkpoint that writes your name down (+10). **The state is read after the mission's own gain** (a Cool player at 20 who takes +8 is *Noticed* for that mission's caught check). The states' slice-5 effects: *Noticed*: run-ins and the caught check +5 %, and **the city police join the opponent pool** (§20.2); *Hot*: +15 % each, and **a caught check that lands means the cells** (§19.2); *Wanted*: as Hot, and **a Failure on an illegal mission is the cells without a roll**; the press names a *Hot* player (*In Print*). High-society venues arrive with the Wardrobe. Heat never changes the odds of a check and never costs anything a player owns. **The HUD shows it only above 0**, as **a body line of its own under Health** (*Heat 60 · Hot*, the state word in the failure colour from *Hot*; review 4: it was a small Courier line nobody saw, and sat under Energy; review 5 put Health there and Heat under it, §6.1), with **a help note by state** that names the state's effect and how to cool (*Noticed (25 and over): run-ins are likelier and the police join them; a mission that goes wrong is likelier to cost a mark. It cools five an hour on its own… Nothing you own is at risk from Heat.*; `docs/design/review-4-answers.md` §12); the desk, the result modal's knock-on line (with a one-line card the first time a state is reached) and the Me tab show it too. Safehouses (faster cooling) and the *Customs Strike* Issue (+50 % cooling, `heatCoolPct`) are the only things that change the rate; the rate is the **residence city's** wherever the player stands (the Rested cap's rule; settled 3 Oct 2026).

### 6.5 Political Capital (new)

Political Capital (PC) is *earned* through political activity. It does not regenerate on a timer.

| Earned from | Amount |
|---|---|
| Completing today's Party Directives | 5 per day |
| Campaign Event participation | **Fiasco 3 · Mixed 6 · Success 10 · Triumph 15**, in full for the member's first event resolved that City Day and **half (2 / 3 / 5 / 8) for the rest** (slice 6; three full-rate events a day would pay 30–45 against the orders' 5, `docs/economy.md` §20.4) |
| Resolving an Issue (the owning faction's top five contributors by momentum) | **4 each** ("20 split"; fewer than five: 4 each, the rest not redistributed; slice 4) |
| City Hero or District Hero (§14.5) | 25 (slice 4) |
| *One of Us* in a city (§13.4) | **1 per day** per such city, at the boundary |
| Office stipends (paid at every boundary held, present or not; the FXP is the office share of §5.5) | Councillor **10 and 20 FXP** · **Governor or Mayor 20 and 30 FXP** on top of the seat's · **Chair 20 and 40 FXP** · **Deputy 5 and 30 FXP** · **President 50 and 60 FXP** (slice 7; a local holder draws nothing); Minister 25 (post-MVP) |
| Patron favours, Ambition chapters | Varies |

| Spent on | Cost |
|---|---|
| File candidacy: Council / the party's list (Parliament) / Chair / President | 10 / 25 / 25 / 100. The council's and the Chair's are **deposits**: kept if the candidate withdraws or stands, returned if the candidacy is struck for want of backers (§15.3, §15.4); the President's is returned only on a withdrawal before the party's pick opens (§15.5) |
| Endorse (back) a candidate (+3 to a council or Chair total, §15.3, §15.4; +1 to the party's national score, at most +5, or a place up the party's list, §15.5) | 10; Rank 2+, **one per member per cycle in each city**, one per Chair election, **one per term nationally**, public, irrevocable |
| Sign a petition to dissolve a council, or to open a vote on the Chair (slice 7) | 10 (the opener's 10 is the first signature) |
| Propose an ordinance (councillor) or put a law to Parliament (a deputy or a Chair, once a term; the President's weekly bill is free) | 20 / 50. A councillor may move one item per term; the order paper holds the Governor's rule, the parties' rules and three proposals (§15.3); Parliament's holds three bills plus the President's (§15.6) |
| Table a vote to remove the President (a deputy or a Chair) | 50 |
| Call in a patron favour | 15–40 |
| Clear 1 Criminal Record point through connections | 30 |

PC is capped at **1,000** and never decays. It can't be bought, traded or transferred. It is **stored and shown from slice 1** (the Directive completion bonus pays it): **in the HUD on every screen size once it is above 0** (never as a zero), **always as *Political Capital* in full, never *PC*** (review 2; on the narrowest phones the label wraps rather than shortens), with its sources and sinks on the Me tab and the price on every political button (*Stand for the council · 10 Political Capital*); the help note on the label: *Your pull in the party. You earn it by doing all three Party orders (+5 a day) and by holding a council seat. You spend it to stand for the council (10), to back a candidate (10) or to put a rule to the council (20).*; **the first sinks arrive in slice 3**: the council deposit, endorsements and ordinance proposals. A daily player has about 45 PC by day 10, enough to file, endorse a colleague and, once seated, move an ordinance (`docs/economy.md` §14.2).

### 6.6 Iron Marks (IM)

The currency. It's earned from missions (§5.5), jobs, Dossier sales, events and Ambitions, and spent on optional acceleration (§18). **No mandatory daily upkeep exists.**

### 6.7 Buffs (replaces "Physical Neglect")

v3.0's hunger, fatigue and exposure mechanics are **removed**. Food, lodging and outerwear now give bonuses instead of preventing penalties.

| Buff | Source | Effect | Duration |
|---|---|---|---|
| **Well-Fed (Street)** | Street food, 50 IM | +5 % XP, +5 HP | 3 h |
| **Well-Fed (Bar)** | Bar meal, 100–150 IM | +10 % XP, +15 HP | 4 h |
| **Well-Fed (Fine)** | Restaurant, 300–600 IM, CHA 10+ | +10 % XP, +10 % Iron, +25 HP, intel chance | 6 h |
| **Well-Fed (Society)** | High-society dinner, 1,500 IM, CHA 25+ (Capital) | +15 % XP, +30 HP, one exclusive political mission | 8 h |
| **Lodged** | Basic lodging 100 IM / Hotel 500 IM / Safehouse free at Rank 3+ | +25 / +75 / +40 Rested; hotel also restores full HP; Safehouse adds a faction intel briefing and Heat −20 | Instant |
| **In Good Spirits** | Bar: Buy a Round | +10 % XP on the next 3 missions | 3 missions |
| **Weatherproof** | Seasonal outerwear | Ignore weather penalties on outdoor missions | While equipped |

Only one Well-Fed buff is active at a time; the strongest applies.

**Slice 8:** *Lodged* and *Weatherproof* are not built; the home (§17.4) is the lodging and the Rested comes from it at the boundary (§6.3). The Well-Fed buffs and *In Good Spirits* wait for a later slice.

---

## 7. Character creation — the Origin Story

### 7.1 *Coming home* (review 5, 8 Oct 2026; replaces *The Last Train In*)

Spring 1946. The player is demobbed after four years away, the war and then a camp. The demob trains end at **Irongate Central**, and nobody goes home without a stamp from the **demobilisation office**: a hall with queues, clerks and rubber stamps, open nine to four. On the second morning home the player reaches the counter with a kitbag and their papers, and the clerk gives them three pieces of news without looking up: **the mill they left has been sold and the job with it; the discharge papers are missing a stamp, which means six weeks with no pay; the family flat was requisitioned and given to someone else.** Three people work that hall every day because that hall is where those three problems arrive: a union organiser signing up men off the trains (**Petra Holm**, the Collective), the League's welfare desk (**Viktor Stahl**, the Vanguard), a legal-aid lawyer taking housing cases (**Thomas Grey**, the Alliance). The player can chase **one** problem today. **That problem is your party and your town**: you take the six o'clock to their city, and **the favour that fixes it is your first action** there. Three beats, one choice each, 2–3 lines, no number anywhere; saved as tapped, so a closed tab resumes at the next beat. Full script, rows, effects and art: `docs/design/review-5-answers.md` §19.

| Beat | Where | The choice | Sets |
|---|---|---|---|
| 1 *The counter* | Irongate · the demobilisation office · the second morning home (`scene.demob-office`) | Holm's rehiring sheet (the mill's sold; Coalport rehires Monday, union men first) · Stahl's list (no stamp, no pay; the League gets the stamp by Thursday) · Grey's appeal (the flat; Ashford's court hears housing cases this week); a row selects, the button commits (*Go for the work · the six o'clock to Coalport*) | **The party**, so the home city (§7.4); the favour as slot B of the welcome set (§13.7) |
| 2 *The kitbag* | The six o'clock to {city} · the compartment (`scene.train-compartment`) | *Tools. I kept the workshop's kit when the workshop went.* (+6 STR, +1 INT) · *Books, from the camp library. They let us keep those.* (+6 INT, +1 STR) · *The boots I walked out in. Two hundred miles, and they still fit.* (+6 AGI, +1 STR) | **The stats** |
| 3 *The post* | The same compartment · the office's post, held in your name since the autumn | *The unit's list* · *The requisition order* · *The ration page* | **The Ambition** (§17.1); **the demob suit**, worn from here on (Tier I, CHA 5) |

**Record (review 5).** Round 1 (three premises on the father, `docs/design/review-5-answers.md` §1) and round 2 (three with no father: *The warrant*, *After the count*, *The frontier train*; §16.2–16.6 there) were not taken; the user rejected the device of three party people waiting at a station for a stranger. Round 3, *Coming home* (§19 there), was **confirmed by the user on 8 Oct 2026** and is the build. The mechanics did not move between versions: the party, the stat, the long story, a Tier I coat at CHA 5, eight taps, the favour as slot B; `origin.step-platform`, `origin.step-suitcase`, `origin.step-lining`, the three Ambitions, every `keep.*` and `outfit.fathers-coat` keep their ids under their new names.

Then the welcome edition (§3.3) and the first landing on **the HQ's pin with the favour's ticket highlighted** (§7.5). There is no street scene, no faction cards and no wish: the party is chosen at the counter and the favour pays its own Party XP. The three people are the three party secretaries whose signed lines the player reads the next morning (§13.7). The Vanguard row is **the League's welfare desk**: stamps, pensions, a hostel bed, a clerk, a letter and a day book, nothing else; no uniform, rank, march, symbol or slogan (`docs/design/content-policy-review.md` §7). The war is the past, named once as *four years* and *the camp*; nothing in play is a fight.

### 7.2 The old dialogue (superseded 6 Oct 2026; kept for the record)

Until review 4 the origin was a **tier-3 story of three steps** (§13.1), two questions to a step, every answer saved as it is tapped so a closed tab resumes at the next question. **An answer is final once tapped**: there is no going back, and a second tap on the same question changes nothing. After the first question of a step the answer just given is echoed as one line above the next question (*You went fishing with him.*), which is how a player sees what they tapped. No number is shown on any origin screen; the coat and the promise carry a hint in words. Full script, echo lines, art and copy: `docs/design/slice-2-onboarding.md` §2.

| Step | Father's question | A | B | C | Effect |
|---|---|---|---|---|---|
| 1 *The room* | "Do you remember the summer you were ten? What did you do every day?" | Fished the river with you | Worked the factory floor after school | Sat in the library till they threw me out | A +3 AGI · B +3 STR · C +3 INT |
| 1 | "And when the street kids got into trouble. What did you do?" | Led them in. Someone had to. | Talked them out of it | Watched from the corner, and learned | A +2 STR · B +2 CHA (permanent base) · C +2 INT |
| 2 *The talent* | "You always had a talent. What was it?" | I could outrun anyone on the block | I could fix anything with my hands | I could read people like a book | A +3 AGI · B +3 STR +1 INT · C +1 CHA (base) +3 INT |
| 2 | "Take my coat. It's all I have left." | Take it, and say nothing | No. I'll earn my own | Take it, and promise to bring it back | A *Your father's coat* (clothing, Tier I, **CHA 5**, worn from the start) · B **+150 IM** · C the same coat as a **keepsake** (unique, never sold or crafted) and **+1 CHA base**; the promise returns in a later chapter |
| 3 *The promise* | "Promise me one thing…" | "…I'll clear your name." | "…I'll settle what you owed." | "…I'll finish what you started." | Chooses the player's **Ambition** (§17.1) |
| 3 | "And you. What do you want, when all this is over?" | Order. Somebody has to keep the streets quiet. | Justice. The workers deserve better. | Truth. Let the people decide. | +50 FXP seed toward Vanguard / Collective / Alliance, paid if you join that faction; the matching card on the faction screen shows *His wish · +50 Faction XP* |

**The answers stack as written** (Appendix C #12, closed): the three memory answers add **8 or 9 points counting CHA base**, of which **6–9 go to STR, INT and AGI** (the summer +3; the trouble +2 STR, +2 INT or +2 CHA base; the talent +3, or +4 with *fix anything* or *read people*), at most **+8 to one stat**, and up to **+4 CHA base** (talked them out +2, read people +1, the promised coat +1). A cap would silently waste the answers of a player who answered consistently, since no number is ever shown. See §8.5 for what that makes a new character.

### 7.3 After the prologue

**Review 4:** the party is chosen at the demob office's counter (§7.1; review 5, was the platform); the choice is free and **permanent** (changing needs a paid Faction Reset token, §23; the line under the rows says so), and the next screen after beat 3 is the home city's welcome edition (§3.3, §7.5). The faction cards' three lines (who they are, what they want, their city) and the stat bonus live on the platform rows; the crests (the Vanguard's an iron gate beneath a lantern in a square frame; the plain square, circle and triangle are only the small marks) stay on the party card and the Me tab. *(Until review 4: the father died before the first tram, a newsboy shouted the Herald, and three faction cards followed; `docs/design/slice-2-onboarding.md` §5.)*

**Faction starting bonuses are cut to +3** (Vanguard +3 STR; Collective +2 STR +1 INT; Alliance +3 INT) so the origin choices keep their weight. Joining also gives the faction's **Tier I outfit** and **party card** (§21.4).

**The face.** Eighteen portraits (men and women, twenties to fifties; review 4 replaced five that looked alike) are offered on the sign-up form, before the origin; the choice is required, changeable on the Me tab at any time, and has no effect on anything (Appendix C #19).

**The name.** Chosen on the sign-up form: **2–40 characters after trimming**, inner runs of spaces collapsed to one, no character class restricted. Sign-up refuses a blank, shorter or longer name with a line under the field (*Your name can't be blank* · *Your name needs at least 2 characters* · *Your name can have at most 40 characters*). It is printed in the arrival headline on day 1 and in the HUD, which is why forty. The only fallback, for accounts made before this rule, is the neutral *A Newcomer* from content; no faction's vocabulary ever stands in for a name.

**Slice 9 (pinned; `docs/design/slice-9-launch.md` §5.4).** At sign-up and on every change the name is checked, after folding (lower case, diacritics and leet folded, repeats collapsed), against the moderation lists (real-world hate and extremist terms, the content policy's slogans) and an **impersonation list** (every NPC name in content, *moderator*, *admin*, *editor*, the mastheads); refused with *That name can't be used. Try another.* A player may **change their name once every 30 days**, free, from Settings; lists, the HUD, the count and the ledger show the new name at once and **editions already printed keep the old one**. A moderator may require a change: the next sign-in shows the rename sheet first, with the reason in plain words, and the name reads *A Newcomer* until it is done, **in printed editions too** (a forced rename and an account's erasure scrub print; one's own change does not; settled 4 Oct 2026). The sign-up form carries the terms line *By signing up you accept the rules and say you're 16 or older.* (no checkbox; the version accepted is stored) and, while the game is by invitation, an *Invitation code* field.

### 7.4 Home City (new)

**Your faction decides where you start.** Every new player begins in their faction's **home city** (§14.11): the Vanguard in Duskwall, the Collective in Coalport, the Alliance in Ashford. That is your Home City, where you vote and stand for council.

From **Rank 3** you can **move** your residence to a **battleground city** (Clearwater, or a district of Irongate, §14.9) to vote and stand where national power is decided. Moving is a career choice, not a tutorial step: at home you rise inside your party, and in a battleground you fight the other two.

- You can move once every 7 City Days, for 500 IM. Moving resets your council eligibility for one cycle.
- You can always move back home.
- You can't live in a rival home city. You can visit, at your own risk (§14.12).

### 7.5 The first ten minutes (new)

There is no tutorial screen. From sign-up to the first result modal is **eight taps and under three minutes** (review 4; was eleven): the face and name, the counter (a row and the confirm), the kitbag, the post, the welcome edition, the favour. After that every new thing is introduced by the thing before it, never by a screen that only explains.

- **The welcome edition** (§3.3): three headlines that say where you are and where to spend the first Energy (the first names the favour and the HQ), the **welcome set** of three Party orders (§13.7: two attempts at a political action **chosen by the player's best stat**, **the favour from the counter at the HQ**, *Take a job at {place}*), the Letter that opens Ambition chapter 1, and the desk.
- **The first landing:** the home-city map with **the HQ's sheet already open and the favour's ticket highlighted** (review 4; was slot A's pin). The first screen of play is a ticket with its odds as a word and its stat (*Good odds · your best, Intelligence*), the tag *Party order 0 / 1 · +25 % Party XP* and the tag *First day in Duskwall · better odds* (§8.4). The orders list on the city plate links each order to its pin, and every order title says what to do and where (§13.7).
- **The order of introduction** (about a minute each): the first action and the result modal, which says *Success* or *Partial* and, when it isn't a Success, why (§8.4) · *Again ×3* and the second attempt, which completes an order (+20 Party XP as a signed line from the secretary) · Level 2 and the one-tap stat point, with its explanation (§5.3) · *Take the job* from the Jobs card (*paid at midnight*; no shift, §9) · the party meeting, a best-stat check, which completes the set: the **orders-complete modal** in the secretary's voice (+5 Political Capital, which appears in the HUD, in full, for the first time, on phones as on desktop; §6.5) · the Ambition chapter from the Letters row · free play until the Out of Energy card, which says when the bar is full and that Rested banks after that.
- **What is left for the game to explain itself:** Rested (its desk row, once it has a value), Local Standing (the plate counts *0 / 10*; the Standing card names it at 10, §13.4), the day boundary (the Jobs card's *paid at hh:mm*), the other cities (the train, slice 4). Everything else with a rule behind it answers a tap on its label (§3.7).
- **The HUD** carries Energy (the word, never *EN*), the XP bar with *{n} to Level {next}*, **the Party XP bar to the next Rank** (the faction's colour, under the XP bar, labelled with the rank title, or *Rank n* on narrow phones), Iron, and Political Capital once earned (always the full name, §6.5).

Full script and timeline: `docs/design/slice-2-onboarding.md` §8.

---

## 8. Stats

### 8.1 Attributes

| Stat | Governs | Grows through |
|---|---|---|
| **STR** | Melee damage; physical mission success (marches, strikes, security roles); less damage taken | Level-ups, training, missions |
| **INT** | Political and espionage success; propaganda quality; Dossier capacity; high-paying jobs; Speaker and Organiser roles | Level-ups, training, missions |
| **AGI** | Stealth success; caught chance; Energy discounts at milestones; flee chance | Level-ups, training, stealth missions |
| **CHA** | Social missions, high-society access, speeches, candidacy appeal | **Worn**: the sum of equipped items' CHA plus a small origin base |

### 8.2 Charisma is worn

Your CHA is the total of your equipped coat and what is on you, plus the origin's **CHA base** (0–4, §7.2), plus **+2 while in the city of a paid flat** (§17.4, slice 8), so players keep different outfits for different jobs. The player reads it as **Charisma**, always in full. Slice 8's catalogue (§21.4; the full table with prices, effects and shops in `docs/design/slice-8-life.md` §3.9):

| Item | Tier · said as | CHA | Notes |
|---|---|---|---|
| Work jacket and cap / Mill work coat / Worn wool overcoat | I · work clothes | 2 | The starting outfit of the Vanguard / Collective / Alliance (§21.4); the *plain clothes* of §14.12 |
| The demob suit · A standard coat | I · work clothes | 5 | The origin's coat (§7.1; `outfit.fathers-coat`, *Your father's coat* until review 5); the standard coat is the clothes stall's, 200 Iron |
| Steward's jacket / Convenor's coat / Campaign suit | II · a good coat | 12 | The party store's, 800 Iron, Level 6, members; **+5 % Party XP** |
| Dress greatcoat · Evening dress | III · a tailor's suit | 22 · 24 | The tailor's (a `hotel` place), 4,500 / 5,000 Iron, Level 16; the opera and the Casino |
| Correspondent's suit | III (Alliance) | 25 | Gazette House, 5,500 Iron, Level 16; better odds watching and listening |
| Tailored three-piece suit | IV · a society wardrobe | 38 | The Grand Hotel's tailor, 20,000 Iron, Level 31 |
| Party badge · A good hat · Gold wristwatch | on you | 2 · 6 · 10 | The badge +5 % Party XP (150); the hat 400 (Level 6); the watch 2,500 (Level 16) |
| A patron's piece (Crane's pen, Marr's case) · The memorial ribbon | on you, keepsake | 8 · 5 | Protégé (§17.2); *The Names on the Stone* chapter 12 (§17.1; `acc.his-rosette`, *His rosette* until review 5) |
| Regalia (T V) | — | 42–50 | Post-MVP |

**CHA cuts both ways.** High Charisma opens the money side of town (**society calls**, §13.6: the door is ten under the requirement) and helps in elections (every 10 CHA gives +1 % to your personal vote appeal; slice 7's national score reads it from slice 9's audit work). It also draws attention: on rival ground every run-in roll adds **recognition** (§14.12: Charisma 20–29 +5, 30 and over +10, **doubled at night**; the highest office held +5 / +10 / +15; +1 per 10 Legacy, at most +5). **Plain clothes are worn Charisma under 10:** they remove the Charisma part and halve the office part. A sharp suit makes you memorable; a work coat does not.

### 8.3 Agility milestones

| AGI | Bonus |
|---|---|
| 30 | +2 s safe surveillance window; stealth missions −1 Energy |
| 50 | Run 2 missions from the same location at once |
| 75 | Stealth missions −20 % Energy |
| 100 | 3 at once; caught chance −15 % |
| 150+ | Elite operative missions |

### 8.4 Checks: from stats to odds (new)

Almost every tap in the game is a **check**: a stat against a difficulty. The formula is simple enough to show the odds on every button.

> **Chance = 50 % + 4 % × (your stat − difficulty) + bonuses**, kept between **5 %** and **95 %**.

- **Two-stat checks** (for example a Rally Speaker, CHA + INT) use the average of the two stats.
- **Best-stat checks** (review 1) use the **highest of STR, INT and AGI**: a committee session (§13.3), and the *Legwork* approach of every Ambition chapter 1 (§17.1). The committee gives you the work you are fit for. The ticket names which stat it took.
- **Charisma checks** use your *worn* CHA (§8.2).
- **The odds are a word, never a number** (review 2; this replaces review 1's sentence-and-ledger). Every ticket shows a **band** of the chance and the stat it uses: **Good odds** (70 % and above), **Fair odds** (50–69), **Long shot** (under 50); *Good odds · Intelligence*, *Fair odds · Charisma and Intelligence*, *Good odds · your best, Strength*; training reads *Intelligence 12 → 13 · always works*. Tapping the band opens a two-line note (*GOOD ODDS · About three tries in four come off here. It uses your Intelligence.*). Bonus and penalty tags name their source and say *better odds* or *worse odds* (*First day in Duskwall · better odds*, *Open Doors · better odds*), never a percentage. **No percentage, roll, difficulty, stat arithmetic or bonus row is shown anywhere a player reads**, on the ticket, in the result or behind a tap. Reward percentages (*+25 % Party XP*, *Rested +50 % XP and Iron*) stay: they are rewards, not odds.
- **A result says what happened and, if it didn't come off, why** (review 2). Each attempt row reads *Success* or *Partial* (tier 2–3: *Failure*) with its XP. Under a row that isn't a Success, **one plain reason** computed from the check, chosen by the largest thing that went against the player: the stat (*Your Intelligence is low for this. Raise it at the Union Hall.* / *This needs Charisma and Intelligence, and your Charisma is the low one. It comes from what you wear.* / *Even your best, Strength, is low for this. Raising any of them would help.*; review 3: *raise*, never *train*, so the line fits a reading room as well as a quay), a penalty (*The rain was against you.* / *This is rival ground; everything is harder here.*), or luck (*Bad luck. The odds were good; it just didn't come off. Try again.* / *The odds were only fair. Every win here builds your reputation, and reputation lifts the odds.*). A ×3 with several rows sharing a cause prints the reason once (*2 of 3 didn't come off. …*). The selection rule and the strings: `docs/design/review-2-answers.md` §2.4–§2.5. **The server still returns the full breakdown** (roll, chance, terms, bonuses) for the dev panel and QA; the client never renders it.

**Difficulty:**

| Kind of check | Difficulty |
|---|---|
| Tier-1 action in your home city | 8 |
| Tier-1 action in a battleground | 10 |
| Tier-2 mission | 14–20, set per mission |
| Tier-3 story, Operation | 22–30 |
| Social mission | Its CHA requirement |
| **In a rival home city** | **+4** on top |

**The tier-2 ladder (slice 5; Appendix C #15 closed).** A mission's difficulty is set by its Level against the modelled best stat of a player who gets there on time (`docs/economy.md` §19.2): **14 at Level 6, 16 at Level 8, 18 at Level 10, 20 at Level 12**; in the capital the ladder is **+2** (as tier 1's 10 against 8); on rival ground **+4** on top of either. The reference player sees 70–82 % on new content at its Level and the clamp a few days later. A **Failure** pays **XP ÷ 5** and nothing else; the encounter is not a consequence of the roll but a separate **run-in** rolled on every outcome (§13.1, §20). A new reason line for a fight lost, `power`: *You were outmatched. Strength is what counts in a fight; a coat with some weight to it helps.*

Missions unlock by Level, so the odds on a player's own tier sit mostly between **60 % and 85 %**. Old content drifts up to 95 %; new content starts lower. **The first session is inside the band for every build** (review 1): the welcome set routes to the best stat (§13.7), the committee and the chapter's *Legwork* check the best stat, and the *First day* bonus below lifts the flattest build (8 / 8 / 8) to 60 %, the reference recruit to 76 % and a STR 13 Vanguard to 80 %; by the end of day 1 the level points and *Familiar* carry the same odds without the bonus (`docs/design/review-1-answers.md` §2).

**Bonuses:**

| Source | Effect |
|---|---|
| Local Standing (§13.4) | +3 % per level, up to +12 % |
| **First day** (review 1) | **+10 %** on every checked action in the home city during the **welcome day**: the City Day of creation, and the next one too when the character was created after 22:00 UTC (Appendix C #18, closed). A ticket tag, *First day in Duskwall · better odds*. It ends at the boundary, by which time the day's level points and *Familiar* have replaced it, so no build's odds are lower on day 2 than on day 1 |
| The right item (§21) | +5 % to +10 % (slice 8, pinned: paste and brush on posters +10; the press pass watching and listening +10; the camera on a watch +5 and at the paper +10; wire cutters on sabotage and vandalism +10; forged papers at a checkpoint and talking your way out of the police +10; the correspondent's suit watching and listening +5; Marr's case talking your way out +10). An item's `chancePct` is bounded 5–10 and names one kind of work; a ticket tag reads *{Item} · better odds* |
| Weather (§14.7) | −10 % to +10 % on outdoor checks |
| Battleground bonus (§14.4) | +5 % on political checks in a battleground city or district |
| The Branch Inspector or similar opponent effects | −10 % |

Heat, Party Directives and Rested don't change the odds. Heat changes the separate **caught check** (§11.2); Directives and Rested change the rewards.

**Outcomes from one roll (a whole number from 1 to 100, each equally likely):**

| Roll | Tier 1 | Tier 2 and 3 |
|---|---|---|
| **At or below** the chance | **Success** | **Success** |
| Up to 20 points above | **Partial** (half rewards) | **Partial** (half rewards) |
| More than 20 points above | **Partial** (a tier-1 action never fails) | **Failure** (small XP only: **XP ÷ 5** from slice 5, nothing else), and possibly an encounter (slice 5: the run-in is rolled apart from the check, on every outcome, §13.1) |

A shown 72 % succeeds on rolls 1–72: exactly 72 times in 100. The clamp means a 95 % button still gives Partial on 96–100, and a 5 % button still succeeds on a 1–5. The chance is a whole number; bonuses are added before the clamp.

**Examples:**

| Check | Maths | Chance |
|---|---|---|
| Canvass in Coalport (home), INT 12, no Standing yet (the reference recruit, §8.5) | 50 + 4 × (12 − 8) | **66 %** |
| Canvass in Coalport (home), INT 12 | 50 + 4 × (12 − 8) + 6 (Standing *Known*) | **72 %** |
| Speech to the picket, INT 18, difficulty 12 | 50 + 4 × (18 − 12) | **74 %** |
| Sabotage in Duskwall (rival home), AGI 17, difficulty 16 + 4 | 50 + 4 × (17 − 20) + 10 (forged papers) | **48 %** |

### 8.5 Stat growth (new)

| Stat | Grows through |
|---|---|
| **STR, INT, AGI** | +1 point of your choice per level-up (§5.3), and training |
| **AGI** also | Every successful stealth action (a quarter of a training point; slice 5: **a Success on an Agility way of a mission**, shown as *Agility +¼ · 3 more for a point*, §13.1) |
| **CHA** | Never trained: it is the sum of what you wear, plus up to +4 CHA base from the origin story |

**Starting stats (review 4, 6 Oct 2026):** 5 in each trained stat, plus **the kitbag** (§7.1 beat 2; the suitcase until review 5: **+6 to one stat and +1 to a second**) and the faction bonus (+3). A new player's best stat is **11–14** (the all-in build, *tools* in the Vanguard, STR 14: a 74 % home check; the flattest, *light* in any party, AGI 11 with the second stat 6–9: 54 %, 64 % with the *First day* bonus). There is no CHA base any more: Charisma is worn only, and every new character wears **the demob suit** (CHA 5) from beat 3. Every build reaches the 95 % clamp on its best stat from level-up points and Standing (`docs/economy.md` §2, §24.1): the reference recruit by day 3–4, the flattest build by about day 5. *(Until review 4 the origin's six answers gave 6–9 points and a CHA base of 0–4; §7.2.)*

**The reference recruit.** All tuning, examples and tests use one canonical new character: a Collective recruit who **went for the work** with Holm at the counter, carries **books** from the camp library and opened **the unit's list** from the office's post (§7.1), in the demob suit (the answers `holm · books · ward-book`, unchanged from review 4).

| STR | INT | AGI | CHA (worn) | Where it comes from |
|---|---|---|---|---|
| 8 | 12 | 5 | 5 | 5 base each · the kitbag +6 INT, +1 STR · Collective +2 STR +1 INT · the demob suit CHA 5 · Ambition *The Names on the Stone* · the Collective's work coat in the wardrobe, unworn |

The reference recruit's home canvass is still a **66 %** check (§8.4; INT is unchanged, so every Intelligence figure in `docs/economy.md` stands; STR fell two, so the second stat's odds and the Fight power (15, was 17) move, §24.1 there). The same answers in the other factions give the tuning characters for Duskwall and Ashford: **Vanguard STR 14 / INT 6 / AGI 5 / CHA 5** (*tools*) and **Alliance STR 6 / INT 14 / AGI 5 / CHA 5** (*books*). *(Until review 4: 10 / 12 / 5 / 2, 11 / 11 / 5 / 2 and 8 / 14 / 5 / 2, with 150 Iron for the refused coat and a +50 FXP seed.)*

**Training** is a tier-1 action (the gym, the library, the running track). The Energy needed for the next point rises slowly, so stats never run away:

> **Energy for the next point = 20 + 2 × current stat.** Point 15 costs 50 Energy, point 30 costs 80, point 60 costs 140.

**Training rules.** Training is **not a check**: it always succeeds, one tap gives +1 to the stat at once, and the modal shows one row ("no roll") and the stamp *Trained*. It pays **XP at half the tier rate** (2.25 per Energy at tier 1, so the reference recruit's first INT point is 44 Energy for 99 XP) and **no Iron, FXP or opinion**: the stat point is the reward. Rested applies to the XP. **Training has no batch: ×1 only**, one point per tap (three points would cost 126–138 Energy for the reference recruit, more than the 100-Energy bar ever holds, and three points a session would overshoot the targets below). The training ticket's stub shows the live cost and its one button is **the title's verb** (*Study*, *Lift*, *Run*, *Unload*: a content field, `verb`, on every training action; review 3), never *Train*, which at a reading room read as *train your Intelligence*; the *Trained* modal offers *{Verb} again · {cost} Energy · Continue*. The type label *Training* stays on the tags line: it is the category, like *Speech*, and what the orders and the Today tally call the activity. Training does not count toward Local Standing.

**Targets for a regular player's best stat** (training about 15 % of their Energy, plus level-ups):

| When | Best stat |
|---|---|
| Day 1 | ~12 |
| Week 1 | ~28 |
| Month 1 | ~50 |
| Month 3 | ~85 |
| Season 2 | 100 and up (the check clamps at 95 %; the stat does not) |

**Raised 3 Oct 2026 (slice 5; Appendix C #15 closed).** The first table (15 / 30 / 60 / 80–100) was written before the +1 point per level; with it, the reference player's best stat is about 19 at Level 6 (day 2), 25 at Level 10 (day 5), 28–30 at the end of week 1 and 50 at a month. The rule is kept (a level-up is a moment because of it) and the targets now say what it produces; tier-2 difficulties are set against them (§8.4), so odds on new content sit where §8.4 wants them whatever the stat's absolute size.

---

## 9. Jobs

**A job is a wage** (review 1, 30 Sep 2026, a user decision). It gives a steady income that costs no Energy and doesn't depend on faction activity, so the whole bar goes on politics. There is no shift: the first 3.1 draft had a daily shift for Energy that paid no XP, and the first play-through asked, rightly, why anyone would work it. What is left to decide is *which* job, and that is enough: the faction's own job pays members a fifth more, the Driver is the first thing training unlocks, later jobs pay in other coin, and the labour ordinances fight over the wage.

### 9.1 Rules (reworked)

- A player holds **one job**. Taking a job is free and one tap on the *Jobs* card at the job's location (the card lists what is offered there, with pay and requirements; requirements are checked on taking, never again). **Switching** is one tap, free, takes effect at once and **resets seniority to 0**. Nothing about a job costs Energy or touches Rested.
- **Daily wage:** at every 00:00 UTC boundary (§2.2) the job held at that moment pays its **full daily pay** automatically, present or not. The member's fifth (the faction's own job) is a line of its own on the base pay. The desk row reads *Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)*; the Jobs card reads *216 a day, paid at midnight* (the boundary in the player's clock).
- **Seniority:** **+2 % of daily pay for every City Day the job has been held** (boundaries paid), **to +20 % after ten days**. Paid as its own line at the boundary (*Seniority 4 days: +17*). It never falls except by switching, and it goes on counting while the player is away (§4.3, rule 2). The *Five Days In* and *Ten Days In, Full Rate* headlines fire the morning after seniority **first reaches or passes** 5 or 10 (the Long Service Order, §15.3, can step over the number).
- **Cap on return:** however long the absence, a return credits **at most 14 days' pay** (a fortnight's back pay); the job is kept and pay resumes at the next boundary. This never touches a player seen at least once a fortnight (§4.2; Appendix C #17).
- **Pay under an ordinance (§15.3):** the seniority line and an ordinance's pay line (*Public Works Order +22*, *Street Fund −54*) are **each a percentage of the unmodified daily pay**, shown as separate lines that add up; the wage at a boundary uses the ordinance in force on the day that ended.
- **You are never fired for being away.**
- **Gone with the shift:** the work streak, sick days, the shift ticket, the `job` action type and its outcome texts, the *Shift worked* stamp, the Today tally's *shift worked*, and Premium *Remote Work* (nothing is left to work remotely). The three *Work your shift* orders leave the rotation; *Take a job* is a welcome-day order only (§13.7).

### 9.2 Job catalogue

**The rule (review 5, 8 Oct 2026): a job that asks more pays more.** In any city, each rung of the ladder pays **at least a tenth more than the best pay of the rung below it, the member's fifth counted**; rungs are set by the requirement, never by the city. The user found the Driver (Level 3, Agility 10) at 200 against a member's day-1 job at 216; the ranges below are now one pinned figure a rung (`docs/design/review-5-answers.md` §5, the audit of every job in every city).

| Rung | Job | Unlock | Daily pay | Requirements | Notes |
|---|---|---|---|---|---|
| The fallback | Street vendor | Level 1 | **100** | — | Any outdoor location; every city |
| The day-1 job | Factory worker | Level 1 | **180 (216 for members)** | STR 5 | Coalport; Collective +20 % |
| | Stores hand | Level 1 | **180 (216)** | STR 5 | Duskwall (the customs stores); Vanguard +20 % |
| | Copy clerk | Level 1 | **180 (216)** | INT 5 | Ashford (the *Gazette*); Alliance +20 % |
| | Porter · Cannery hand | Level 1 | **180** | STR 5 | Irongate · Clearwater; no party's fifth in a battleground |
| The first step | Driver · Tram conductor | Level 3 | **240** (was 200) | AGI 10 | Four Drivers (one per built city); the conductor in Clearwater |
| | Market trader | Level 3 | **240** | INT 10 (was 8) | The Intelligence build's step; buy-low/sell-high mini-game, deferred |
| Level 6 | Security guard | Level 6 | **320** | STR 12, CHA 10 | Opera, university, warehouses |
| | Newspaper reporter | Level 6 | **320** | INT 15 | 10 % chance of a free Dossier entry per day (the extra is the entry, not pay) |
| Level 10 | Factory foreman | Level 10 | **500** | STR 15 | Collective: Rank 3 instead of Level 10 |
| | Lawyer's clerk | Level 10 | **500** | INT 20 | Ashford; Alliance: Rank 2 |
| Level 16 | Professor | Level 16 | **900** | INT 30 | Ashford University; small INT gain per day |
| Rank 4 | Political aide | Level 20 | **1,500** | Rank 4 | Also gives FXP and 2 PC per day |

Check: 216 × 1.1 = 238 → 240; 264 → 320; 352 → 500; 550 → 900; 990 → 1,500. The Driver is a real step: +24 a day over a member's day-1 job, a switch overtaking the old job's seniority after four days; an Agility build (*light*, AGI 11 from the platform) can take it on day 1 at Level 3.

**Pinned for the home cities (slices 1 and 2):** each home city places three jobs. **Street vendor 100** (Market Row / the Customs Market / Bridge Street), the faction's day-1 job at **180, 216 for members** (Factory worker at the Mill Gate / Stores hand at the Fortress Gate / Copy clerk at Gazette House) and **Driver 240** (Harbour Quays / Goods Yard / Bridge Street; 200 until review 5). A job belongs to one location, so "Driver" is three jobs with three ids. Every built job stands in a Level-1 quarter, so its card's requirement is the real one. The other jobs keep their pinned figures until they are placed. The Market trader's mini-game is deferred with the job. The capital's Porter (180, slice 4) is for a player with no job: a home job pays in full from anywhere.

---

## 10. The Dossier

The Dossier is the player's private intelligence journal. In MVP it covers NPCs only; in v1.5 it extends to players. **Slice 8 builds it** (`docs/design/slice-8-life.md` §4): the **Dossier tab**, entries on **names** (every NPC with a party and a town: the slates, the local deputies, the parties' figures, the secretaries, the Ambitions' named figures), the sources and chances below, Case Files at Level 16, and three uses (the exposé, the sale, the informant).

### 10.1 Capacity

| INT | Slots |
|---|---|
| 1–10 | 10 |
| 11–20 | 15 |
| 21–35 | 25 |
| 36–50 | 40 |
| 51+ | 60 |

Plus **+1 per Legacy perk** *A bigger Dossier* (twice, §17.3). Entries and Case Files each take a slot. A full Dossier **refuses** a new entry (*Dossier full · an entry went begging*): opportunity, never loss.

### 10.2 Gathering intelligence

| Method | Energy | Risk | Yields |
|---|---|---|---|
| Safe surveillance (within your AGI window) | 3 | None | Recent NPC actions; save 1–2 |
| Extended surveillance | 3 | +5 Heat; caught chance grows with overtime | More detail: affiliations, items |
| Overheard conversation | 0 | None | Random during visits; 1 free entry |
| Journalist contact (Alliance) | 4 | None | Verified entry on a named NPC |
| Underground network (Collective) | 4 | 5 % counter-surveillance | Union and factory intel |
| Secret police file (Vanguard) | 5 | None in Vanguard-held cities | Official records, the most detailed |
| Hospital or jail conversations | 0 | None | Storylet entries (§19) |

**Slice 8 (pinned).** An entry is `{ name, category, line, day, source }`; its line is drawn seeded from the category's pool of twenty (`docs/design/slice-8-life.md` §16.4). Where entries come from, and the chance:

| Source | Chance | Category | Whose name |
|---|---|---|---|
| A tier-1 **intelligence** Success | **10 %** + the worn items' `dossierChance` (the press pass 10, the camera 15, Crane's pen 10) | by the place's kind (press, HQ, Parliament, ministry → political · jail, court → criminal · station, bar, street, docks → pattern · hotel, market, theatre → asset · else neutral) | a random name of the city, a rival party's two times in three |
| A **surveillance** mission | Success: one; Partial: one time in two | the mission's, default pattern | the mission's named figure, or a random name of the target party |
| A **theft** mission | Success: one | political | a random name of the target party |
| *The informer* journey card: *feed him false information* | on its Success | political | a name of the rival home city |
| *Listen to the cells* · *Talk to the ward* (§19) | 25 % on a Success | criminal · neutral | a name of the city |
| A **society call** (§13.6) | 25 % on a Success | asset | a named figure of the place's city |
| A patron's **gossip** (Acquaintance, §17.2) | every Monday's paper | political (Crane) · asset (Marr) | a name of the patron's city |
| An **informant** (§10.4) | one entry every second day for 14 days | pattern and political, alternating | the informant's name |

The journalist contact, the underground network and the secret police file of the table above are expressed through the press pass, the surveillance missions and the theft missions; they are not separate actions. The reporter job's daily entry waits for the job to be placed.

### 10.3 Categories

Political affiliation, criminal activity, location pattern, asset/wealth, and neutral, as in v3.0. The player reads them as **political · criminal · pattern · asset · the small stuff**.

### 10.4 Case Files (new)

Collect **3 or more fresh entries on the same NPC** and they combine into a **Case File**. Case Files are keys that open storylets:

| Case File use | Needs | Outcome |
|---|---|---|
| **Exposé** | Criminal or political entries | Publish through the press: influence swing against the NPC's faction in that city, and a headline with your name |
| **Blackmail** | A criminal entry | Iron or a favour; +10 Heat |
| **Denounce** | Political entry; your faction controls the city | FXP; the NPC is removed from the city for a week |
| **Recruit Informant** | Location pattern + 30 Favour with a patron | A passive entry every 2 days |
| **Sell** | Any entry | 50–200 IM at tram stations |

**Slice 8 (pinned; from Level 16).** **Three entries' worth on one name** (fresh 1, stale ½) bind into a Case File with one tap (binding takes every held entry on the name); the entries are consumed, the file keeps their lines and kinds and **never goes stale**; one file per name at a time. The MVP's uses: **the exposé** (below; at **Herald House or Gazette House**, the republic's two newspaper offices on the map; refused against the player's own party or a name with no party), **sell** at a `station` place (Central Station, the Goods Yard, Clearwater Station) (*the man by the left-luggage*: **a file 200 Iron, a fresh entry 50, a stale one 25**; one tap and a confirm; the paper prints nothing) and **an informant** (a file with a pattern line, in a town whose patron the player is **Associate** with or better: the file is spent and for **14 City Days** the paper's Letters carry an entry every second morning on a name of that town; **two informants at most**). **Blackmail and Denounce are deferred** (Appendix C #78); Recruit Informant is the informant above.

**The exposé** (three steps at a `press` place; one a day; 20 Energy; resumable). **Step 1:** the file and the angle, *The facts, plainly* (the swing goes wholly to Neutral) or *The story, with a headline* (half to your party, half to Neutral, §14.2's rule for an action against a rival; a point harder). **Step 2:** the check, **difficulty 18 with three lines' worth, 16 with four, 14 with five or more** (+1 for the headline; +2 in the capital's or Clearwater's paper; the camera's +10), three ways (Intelligence · Charisma and Intelligence · *Legwork*, best), no run-in, no Heat. **Step 3:** Success: **opinion −1.0 against the name's party in the name's town** (its district in the capital), XP 150, Party XP 40, Iron 100, **+5 Political Capital**, **Legacy +2**, the file spent, **the front page with your name** next morning, the name burned for 14 days; Partial: **−0.5**, 75 / 20 / 50, the file spent, page three; **Failure: nothing moves, XP 30, the file is kept** (spiked). Rested applies; an Issue tag applies to the swing (`feeds` may name `expose`); the *Free Press Spring* twist's +50 % is a multiplier when it exists. On rival ground the swing draws from morale under §14.11's daily cap.

### 10.5 Freshness

Entries older than 7 days are flagged **stale**. Stale entries still count toward Case Files at half weight, and they sell for half price. Being away makes intel less valuable; it never deletes it. **Slice 8:** the desk's row *{n} entries go stale tomorrow* and the entry's own line (*goes stale on Thursday* → *stale*); a Case File is exempt.

---

## 11. Heat & Criminal Record

### 11.1 Two layers

- **Heat** (§6.4): short-term attention, cools within a day.
- **Criminal Record:** long-term reputation that shows on your profile.

### 11.2 Getting caught

Every illegal action rolls a **caught check**: base chance by action type, **plus half your Heat**, minus AGI modifiers.

| Illegal action | Base caught chance | Record points if caught |
|---|---|---|
| Disrupting a public meeting | 10 % | 1 (minor) |
| Vandalism, tearing down posters | 8 % | 1 (minor) |
| Assault in an illegal context | Encounter loss | 2 (moderate) |
| Robbery or theft | 15 % | 2 (moderate) |
| Arson or sabotage | 20 % | 3 (serious) |
| Arrested twice within 7 days | — | Escalates to serious |

Being caught while **Hot or Wanted** means **arrest and jail** (§19.2).

**Slice 5 (pinned; `docs/design/slice-5-risk.md` §7).** The check is **base by type + Heat ÷ 2 + the state's bonus (Noticed +5, Hot +15, Wanted +15) + 5 for a Repeat offender or worse − Agility ÷ 2**, whole numbers, kept between 2 % and 95 %, with Heat as it stands after the mission's own gain (and after a failed *Pay them off*'s +10, which came first), the base doubled with the Heat on rival ground. It is rolled **once per illegal mission that did not come off clean: on a Partial or a Failure, never on a Success** (a clean job leaves no name; the first draft's "every illegal action" made a daily illegal player Notorious inside four days with no way back, `docs/economy.md` §19.4), after the run-in and not after a run-in lost. **Caught while Cool or Noticed: your name is taken** (the type's marks go on the record; the mission's result stands). **Caught while Hot or Wanted: the cells** (§19.2), the marks go on, the result stands. **Wanted and a Failure: the cells without a roll.** A run-in with the police lost is the cells with the mission's marks and no roll. **An arrest is always at least one mark (review 4, 6 Oct 2026):** the type's marks, or **one minor mark** when the work carried none (legal work; a run-in with the police lost on a speech or a watch): *taken in* is itself on file, and the seven-day escalation applies to every arrest (the slice-5 sentence "an arrest with no marks never escalates" is superseded). **Extended surveillance has no caught check and no mark**: its cost is Heat and the chance of being noticed. The player sees none of this as a number: the ticket's risk line says *if caught, a mark on your record* and the result says *The police took your name* or nothing.

### 11.3 Record levels

| Level | Points | Effect |
|---|---|---|
| Clean | 0 | None |
| **On file** (was *Known*; renamed 3 Oct 2026, slice 5: *Known* is the Reputation ladder's third rung and the two share the Me tab) | 1–2 | −10 % Iron from missions (the "+5 CHA at some venues" of v3.0 is dropped, 4 Oct 2026: the shop surcharge below is the record's tax on the Wardrobe) |
| Repeat Offender | 3–5 | −20 % Iron; **shops +15 %** (slice 8: every shop's prices, a line on the card); police encounters +5 % |
| Notorious | 6+ | −30 % Iron; **shops +30 %** (slice 8); barred from courts, universities and Alliance civic buildings; bail doubled; **−5 % personal vote appeal** |

**Slice 5 (pinned).** The player reads it as **your record**, counted in **marks**. "Iron from missions" is **tier 2 and up**: tier-1 actions are untouched, so a record is a tax on the road that earned it. *Repeat offender*'s "police encounters +5 %" applies to the run-in chance and the caught check both. *Notorious* bars every ticket at a `court` or `university` place and at the Alliance's HQs (*Not with your record*). The CHA venues, the clothing surcharge and the vote appeal wait for the Wardrobe (slice 8) and the national vote (slice 7). The record is private in the MVP: the Me tab, the desk and the mission ticket's Iron tag show it, nothing else.

### 11.4 Clearing a record

- **Time:** minor points expire after 14 days with no new offences.
- **Bribes:** 500 IM per point at Known, up to 2,000 IM per point at Notorious. Depends on who controls the city.
- **Connections:** 30 PC per point.
- **Political Protection (Rank 4+):** once a month, your faction expunges one moderate point.
- **Laws:** the Rehabilitation Act lowers every record by one level while it's in force.

**Slice 5 builds** the fading of minor marks (one-point marks, from vandalism and disruption, expire **14 City Days after the last offence**; moderate and serious marks, from theft and sabotage, wait for the bribe) and the connections route (**30 Political Capital strikes any mark**, the oldest first, one tap on the Me tab's record row, stamp *Struck off*). Political Protection is Rank 4's; the Act is slice 7's. **Slice 8 builds the bribe** as a row in **the back room** of a bar (§19.3; from Rank 3): *Have a mark struck off · {price} Iron*, **500 a mark at *On file*, 1,000 at *Repeat offender*, 2,000 at *Notorious*** (the level at the tap), the oldest mark first, one a day, the stamp *Struck off*; Julius Marr's Confidant favour halves it for a week (§17.2). "Depends on who controls the city" is not built.

---

## 12. Bodyguards

In MVP, bodyguards only protect. Eliminate mode is a v1.5 PvP feature.

### 12.1 Contracts (reworked)

Bodyguards are hired on **prepaid 7-day contracts** that you renew by hand or set to auto-renew. When a contract ends, the bodyguard leaves; nothing is taken from you. Being unable to pay at midnight no longer dismisses them.

| Tier | Hire fee | 7-day contract | Protection | Max active |
|---|---|---|---|---|
| Street thug | 500 | 350 | −10 % encounter damage; +5 % flee | 2 |
| Trained enforcer | 2,000 | 1,400 | −20 % damage; +10 % flee; 15 % chance to avoid hospital | 2 |
| Elite operative | 8,000 | 5,600 | −30 % damage; +15 % flee; 25 % hospital prevention; intercepts 1 ambush a day | 1 |

Hired at Vanguard House, Safehouses, or the Black Market (any faction, +25 % cost).

---

## 13. Missions

### 13.1 Three tiers of play (new)

Most of the time, spending Energy should be **fast**. A full bar of 100 Energy should be spendable in two or three minutes if the player wants. Depth is saved for the moments that deserve it.

| Tier | Share of content | How it plays | Examples |
|---|---|---|---|
| **1. Actions** | ~80 % | **One tap.** Resolves straight into a result modal (§13.1a). Repeatable ×1 / ×3 / ×5 (checked actions only: training is ×1, §8.5). **Never triggers an encounter**, except in a rival home city (§14.12); a failure just pays less. | Canvass, paste posters, a street speech, train, safe surveillance, buy a round |
| **2. Missions** | ~15 % | **One choice.** A short briefing with 2–3 approaches, each showing its stat check and success chance, then the result. The game **remembers your approach**, so after the first time a Repeat button makes it one tap. | Anything illegal (disruption, sabotage, extended surveillance), exposés, social events, bigger faction missions |
| **3. Stories** | ~5 % | **2–3 short steps at most**: choices, an encounter, named NPCs, illustration. Always **resumable**: close the tab mid-story and it waits where you left it. | Ambition chapters, patron Requests, the origin story, encounters from tier 2 |

**Rules that keep tier 1 fast:**
- One tap resolves at once. **×3 and ×5** spend Energy in one go and show all the attempts in a single result. A batch rolls each attempt from one seed, shows one row per attempt and a "2 of 3" stamp, counts each row separately for Standing and Directives, and is **disabled when Energy is short** (no partial batch). ×3 ships in slice 1; ×5 later. **Batch text:** the stamp always reads *n of 3* (*3 of 3* and *0 of 3* included); the narrative is the action's **success text when more than half the rows succeeded** (×3: 2 or 3; ×5: 3 or more), otherwise its partial text. There is no third text: the rows carry the numbers. **Training has no batch** (§8.5): its ticket shows one button.
- The result modal's repeat buttons let the player chain actions without going back to the location card. **Every button that spends Energy says what it does and what it costs, never a bare number** (review 3): *Once more · 10 Energy* · *Three more · 30 Energy* · *Continue* (after a *Trained* result: *Study again · 46 Energy · Continue*, the verb from the action and the live cost of the next point); on a phone the two repeat buttons sit side by side with the cost on a second line and *Continue* under them. The ticket's own buttons read *Once* and *×3*, the latter with *30 Energy* under it; the stub is the price of one. Words and layout: `docs/design/review-3-answers.md` §4.
- Rested, Issue, weather and Directive bonuses are applied automatically and shown as small tags on the card.

**Rules that give tier 2 weight:**
- Every tier-2 mission shows its **odds and its risks before you commit**: Heat, encounter chance, record points if caught.
- Encounters (§20) only come from tier 2 and 3, and from tier 1 in rival home cities (§14.12).

**Tier 2 as built (slice 5; `docs/design/slice-5-risk.md` §4).** A mission is a ticket under a *Missions* kicker on a place's sheet; its briefing is one short text and **two or three ways to do it** (the player's word for approaches), each a stat and an odds word, and tapping a way is the choice. **The way is remembered**: from the second time the ticket reads *Again, {way} · 15 Energy* with *Choose another way* beneath. **No ×3 on a mission.** The ticket shows **the risk in words before the tap**: *Heat +8 · Risky · if caught, a mark on your record*, the risk word being the band of the run-in chance for this player here today (*Safe*, *A little risk* to 10 %, *Risky* to 24 %, *Dangerous* from 25 %). **The order of play:** the check decides the outcome and the rewards, which are **held**; the **run-in** is rolled (§20) and, if it fires, decides whether the held result is paid (a win, a Talk or a Pay pays it; a Run keeps only Failure's XP; a loss is the infirmary, or the cells against the police); the **caught check** follows on a Partial or a Failure of an illegal mission (§11.2); then one result modal. **A run-in left unanswered is auto-resolved by luck on the first read after five minutes, or at the day's end if sooner** (settled 3 Oct 2026, ADR 0032; the player's own choice wins while it is pending), with the best free odds, and the modal waits. Gates: Level by the ladder (§8.4), **Rank 3 for every illegal mission**, *Known* for some home-city missions; an illegal mission names a **target** faction and is for everyone but that faction (an HQ's members-only tickets are its tier-1 ones; its missions against the HQ's faction are for visitors). A Success on an Agility way adds a quarter point of Agility (§8.5).

**Night as a window on content (review 5, decided by the user 8 Oct 2026; `docs/design/review-5-answers.md` §12).** A mission, or one way of a mission, may carry `window: 'night'` (§2.2's window): by day it is shown but not tappable, with the line *Opens at nightfall · dusk at 16:00*; at night it plays as any other. Night content is **extra**: every Level's ladder stays complete by day, so nothing a player needs waits for the dark. The Agility way of every poster, duplicator, roll and *after dark* watch mission becomes night-only (the other ways stay); four new night missions, one per city, pay **+25 % Iron** (*the night rate*: the tag *Night rate · +25 % Iron* on the ticket and the result's tags line, its part in the receipt's *Details*; the bonus is never Party XP, so the dark cannot be turned into political power; the mission's other rewards are its type's as anywhere). The four are a surveillance (Coalport, 12), a theft (Duskwall, 15), a vandalism (Ashford, 10) and a speech (the capital's last tram, 15; `docs/design/review-5-answers.md` §18.2a).

#### 13.1a The result modal

Every action and mission ends in a **result modal that covers the map**. It never appears as a line in a log. Top to bottom:

1. **Art and a stamp**: art from the fallback ladder (§13.5) with a large stamp (Success, Partial, "2 of 3", Encounter, Arrested), plus the place, the action and the in-game time.
2. **What happened**: a headline and a short narrative paragraph. Every action has its own success and partial text.
3. **How it went**: one row per attempt: *Success* or *Partial* (tier 2–3: *Failure*) and its XP; under a row that isn't a Success, one plain reason (§8.4). No bar, no roll, no chance (review 2: the maths belongs to the server and the dev panel, never to the player).
4. **Rewards**: **a receipt** (review 3; the four tiles were bulky boxes, half empty on most results): one line per reward in a fixed order (XP, Party XP, Iron, opinion, an item or Dossier entry) with its value set large at the right, a note under the label (the base and the bonus such as Rested or a party order; for XP the distance to the next Level, for Party XP to the next Rank, for opinion the town's meter before and after) and a thin bar on the XP and Party XP lines, the HUD's bars in miniature. **A zero line is not printed**: a training result is one line. Layout: `docs/design/review-3-answers.md` §3.
5. **Knock-on effects**: Energy and Rested before and after, Local Standing progress, the orders' progress, Rank, a trained stat, Political Capital, Issue momentum, ledger rank, Heat, press coverage. (The XP, Party XP, Iron and opinion before → after lines are on the receipt.)
6. **Buttons**: *Once more · n Energy* · *Three more · n Energy* · *Continue* (§13.1; every Energy-spending button names what it does and what it costs). When an encounter follows, a single button leads into it.

**The modal fits (review 5, 8 Oct 2026; `docs/design/review-5-answers.md` §17).** A ×1 Success and a mission result with a level-up **never scroll** at 390 × 740 or on any desktop: the picture is **112 / 136 / 150 px** by viewport height; *How it went* prints **only what the stamp does not say** (nothing for a ×1 Success; one reason line for a Partial or Failure; one Courier line of rows for a ×3); the bonus tags are **one line** ending *· +n more*; the receipt is **four lines at most** with a note and a bar under XP and Party XP only, everything else behind a ***Details*** row; the knock-on block shows **three lines** in a fixed priority (a point to place, a rank or Reputation card, Heat, the order, Issue momentum, the election line, the chapter hook, Energy and Rested, the first-mission line) and ***n more***; a level-up is a line and a *Place it* button that opens the picker as a sheet (§5.3). A ×3, a reason line or a run-in may scroll the middle **at most about 100 px on a 740 px phone**, never on taller phones or a desktop; the picture and the buttons never scroll.

### 13.2 Mission anatomy

| | |
|---|---|
| **Energy** | 5–30 by tier and type |
| **Resolution** | Instant, ending in the result modal (§13.1a). Tier 1 in one tap; tier 2 after one choice; tier 3 over several steps |
| **Rewards** | XP and Iron always. FXP on faction missions. **Influence** on political missions. Sometimes items, Dossier entries or PC. |
| **Tags** | City, location, Issue (§14.6), legality (Heat), weather sensitivity, tier |
| **Outcomes** | Success, Partial Success, Failure; tier 2–3 can also produce an Encounter |
| **Gates** | Level, Rank, CHA (social), AGI or STR (stealth or physical), Dossier (intel), Case Files (exposés), Local Standing (§13.4) |

### 13.3 Mission types

| Type | Tier | Legal? | FXP | Influence | Encounter | Example |
|---|---|---|---|---|---|---|
| **Training** | 1 | Yes | No | No | — | Hit the gym, study at the library |
| **Canvassing** | 1 | Yes | Yes | Yes | — | Go door to door in the tram district |
| **Speech** | 1 (street) / 2 (big crowd) | Yes | Yes | Yes | — / 5 % | Speak at the market. A big crowd is a tier-2 mission with approaches |
| **Propaganda** | 1 | Yes | Yes | Yes | — | Paste posters at the docks |
| **Intelligence** | 1 (safe) / 2 (extended) | Mostly | No | No | — / 10 % | Safe surveillance is one tap; extended surveillance is a mission |
| **Social** (slice 8: *Mission · Society*, a **society call**) | 2 | Yes | No | Small (0.01 a point per Energy, from Neutral) | 0 % | The Opera's boxes, the Grand Hotel's dance, the Front's promenade, hotel, lido and casino; difficulty = the Charisma requirement, the door ten under it; +2 Favour with the town's patron; a Dossier entry one time in four (§13.6) |
| **Disruption** | 2 | **No** | Yes | Yes (against rivals) | 30 % | Break up a rival meeting |
| **Sabotage** | 2 | **No** | Yes | Yes | 25 % | Wreck a rival printing press |
| **Vandalism** (slice 5) | 2 | **No** | Yes | Yes | 15 % | Tear down a rival's posters |
| **Theft** (slice 5) | 2 | **No** | Yes | No (Iron ×2) | 25 % | Lift a rival branch's membership roll |
| **Operation** | 3 | Varies | Yes | Large | 40 % | Rank 5+; high risk, high reward |
| **Council** | 1 | Yes | Yes | No | — | Faction strategy session; a **best-stat** check (§8.4) |

Illegal missions pay better influence per Energy, at the cost of Heat and record risk. **You can play entirely legally.**

**Tier-2 types pinned for slice 5** (`docs/design/slice-5-risk.md` §4.2): Energy **speech 15 · extended surveillance 12 · vandalism 10 · disruption 15 · sabotage 20 · theft 15**; Heat as §6.4; run-in chance as the table (speech 5 %, surveillance 10 %); caught base **vandalism 8 · disruption 10 · theft 15 · sabotage 20 %** with marks **1 · 1 · 2 · 3**; surveillance has **no caught check and no mark**; theft pays **no opinion and double Iron**; opinion on a political mission is **0.01 a point per Energy, ×2 for the illegal types** and drawn **from the target faction** (§14.2). The player reads the types as *Mission · Speech*, *Mission · Watch and listen* and *Mission · Against the {faction}* (§1.5). The capital's missions may target `leader`: the faction leading the district, or the runner-up when that is the player's own.

**Player-facing labels** (review 2, §1.5): Canvassing is *Talk to voters*, Propaganda *Spread the word*, Intelligence *Watch and listen*, Council *Party meeting*; Speech and Training keep their names. Action titles are plain and concrete, the verb first: *Talk to the workers coming off shift*, *Knock on doors*, *Put up posters on the wagons*, *Print five hundred flyers*, *Go to the branch meeting*, *Look through the records*.

**Tier-1 Energy by type** (inside the 5–15 band of §5.5): **Canvassing 10** (the reference action), Propaganda 8, street Speech 12, safe Intelligence 3–5, Council session 10, Training as set in §8.5. Ten taps, or two ×5 runs, empty a bar; that keeps a full bar spendable in two or three minutes (§13.1).

**Type rules pinned for slice 1:**
- **Council** sessions pay **FXP at 1.5× the tier rate** (0.9 per Energy at tier 1: 45 XP / 9 FXP / 20 Iron for 10 Energy) and no opinion. They are party work, the pure-FXP choice against canvassing's opinion. **A session checks the player's best trained stat** (review 1; §8.4): the committee gives you the work you are fit for, so every build has one good check at the HQ. There is no once-a-day rule: a session repeats like any tier-1 action while Energy lasts.
- **Safe Intelligence** pays XP and Iron only; its Dossier entry arrives with the Dossier (slice 8).
- **Any tier-1 action may check two stats** (the average, §8.4). A street speech is CHA+INT; door-knocking is CHA+INT; dock work is STR. Content mixes the stats so that INT is the most common check, not the only useful one (`docs/design/slice-1-content.md` §2).

### 13.4 Local Standing (new)

Repetition should feel like progress. Each player has a **Local Standing** in every city: how well the people there know your face.

| Standing | Earned by | Effect |
|---|---|---|
| **Stranger → Familiar → Known → Trusted → One of Us** (0–4) | Successful tier-1 and tier-2 actions in that city: **10, 30, 70 and 150 Successes** | +3 % success per level on actions there; at *Known*, some tier-2 missions in that city unlock; at *One of Us*, **1 PC a day** (§6.5) |

**What counts:** one Success on any **checked** action in the city is one point; Partial and training do not count; each row of a ×3 counts on its own.

**The player reads it as *Reputation*** (review 2, §1.5): *Reputation in Coalport · Known · 34 / 70*. The level names stay, the count is *wins*, and the thresholds (10, 30, 70, 150 wins) are given as goals. **The size is said once, in words (review 4):** the help note and the Standing card read *each step makes everything you try here come off **three times in a hundred** more; you are {n} steps up*, and every checked ticket in a city where the player is Familiar or better carries the tag ***Known here · better odds*** (the Reputation word), beside *Open Doors · better odds*. Odds stay words on tickets (Appendix C #35); the figure is the rule's size, not a chance.

**The crossing is a moment** (review 1). Each new level shows as a **Standing card** inside the result modal, in the block the level-up uses: kicker *REPUTATION*, the new title (*Familiar in Duskwall*), one line on what changed (*Faces nod. Everything you do in Duskwall goes a little better now.*) and one on what the next level brings (*Known at 30 wins: better again, and your name will do to stand for the council once you are a Bailiff.*); the plate line updates behind it. No percentage (review 2). No second modal: it is a knock-on effect of the action. The plate's *Standing* label opens the whole ladder on a tap (§3.7). Texts: `docs/design/review-2-answers.md` §1.9 (the review-1 texts with percentages are superseded). The reference player is *Known* about day 3 and *One of Us* about day 8 at home (`docs/economy.md` §9). Standing never decays. It gives grinding the Mill Gate a point: the tenth canvass in Coalport goes better than the first, and it ties players to their Home City.

### 13.5 Art for missions: the fallback ladder (new)

Missions **never get unique art**. The panel shows the most specific art that exists:

1. **Story art**: only key moments (origin story, Ambition climaxes, season finales). About 15–20 over the game's life.
2. **Location-type scenes**: one per kind of place (bar, hospital, jail, factory gate, docks, market, station, parliament, each faction HQ, street at night). About 25, reused in every city.
3. **Map crop**: a zoomed-in crop of the detailed city map around the location, day or night. Free, and available for every location.
4. **Mission-type cards**: one per type (speech, canvass, propaganda, sabotage, surveillance, social, intelligence, job). About 10.
5. **Portraits**: whenever a named NPC is involved.

Tier 1 needs no art at all. With a finite set of about 60 images, a new mission costs only writing: a setup, the approaches and the outcomes, tagged with a location and a type.

**Location kinds.** Every location has exactly one *kind*, from a closed list. The kind is the key for rung 2 of the ladder (one scene per kind), for the map-crop fallback and for presence text. The list is closed so that art stays finite; a new kind is a design change, not a content change.

| Kind | Where it appears | Kind | Where it appears |
|---|---|---|---|
| `factory-gate` | Mill Gate, pit-heads, the power plant | `hospital` | St. Agnes, city infirmaries |
| `docks` | Dockyard, riverside quays | `jail` | Police cells, the county jail |
| `market` | Market Row, Market Square, the Customs Market | `court` | Courts district, the Supreme Court |
| `station` | Rail stations, the tram junction | `university` | Ashford University, lecture halls |
| `street` | Tenement streets, canvass wards, the street at night | `library` | Reading rooms, the state archives |
| `square` | Rally grounds, forecourts, the town square | `gym` | Boxing clubs, the running track, Vanguard House |
| `bar` | The Anchor, workers' bars, society clubs | `barracks` | The old barracks on Garrison Hill (a landmark; no faction building uses this kind) |
| `hotel` | Lodging houses, the Grand Hotel | `parliament` | Parliament, the Legislative Chamber |
| `press` | Underground Press, the *Herald*, the Press Club | `ministry` | Ministries, police HQ, offices of state |
| `faction-hq` | Each faction's HQ and union hall; the scene is picked by the faction | `town-hall` | **The council's hall in every city** (review 4: the Town Halls of Coalport, Duskwall and Ashford, Irongate's City Hall; Clearwater's Casino keeps `bar`): one scene, a council chamber; the map crop stands in until it is drawn |

Twenty kinds (nineteen until review 4), which fits the "about 25" scenes budgeted above (`faction-hq` needs one per faction). **Final** as of the slice-1 Coalport list, which uses six of them: Mill Gate `factory-gate`, Market Row `market`, Union Hall `faction-hq`, Foundry Row `street`, Harbour Quays `docks`, The Anchor `bar`. Kinds can be added, never removed.

**Duskwall** (slice 2, `docs/design/slice-2-cities.md` §1): Fortress Gate `ministry`, Customs Market `market`, Beacon House `faction-hq`, State Archives `library`, Goods Yard `station`, Rampart Row `street`. **Ashford** (§2 there): Gazette House `press`, Assembly Rooms `faction-hq`, University Quad `university`, The Courts `court`, Bridge Street `market`, Weavers' Row `street`. Scenes exist for the Vanguard HQ and the press; the other kinds use the map crop until a scene is drawn.

**Coalport's long-run list** (quarters, `docs/design/city-quarters.md` §3; fifteen places in three quarters) uses existing kinds only: The Shipyard `docks`, Customs House `ministry`, The Infirmary `hospital`, Harbour Police `jail`, The Far Bank `market`, Coalport Station, Coal Yards and Tram Depot `station`, St Barbara's `square`. The map crop of rung 3 is a crop of the **city picture** at the place's pin (maps v3: one picture per city, §14.13).

### 13.6 Social missions

**Slice 8 (pinned; `docs/design/slice-8-life.md` §3.7).** A social mission is a **society call**: a tier-2 mission of type `social`, legal, **15 Energy**, **difficulty = its Charisma requirement**, three ways (Charisma · Charisma and Intelligence · *Legwork* on the best stat: the tradesmen's entrance), no run-in, no Heat; it pays the tier-2 rate (**XP 75 / 38 / 15, Iron 60 / 30 / 0, opinion 0.15 / 0.075 from Neutral**), **a Dossier entry on a Success one time in four** and **+2 Favour** (+1 on a Partial) with the patron of the town; once a day per place. **The door:** a call is barred below the requirement minus 10 (*Not dressed for it · needs Charisma 10 at the door*); a long shot from there. The v3.0 table (the opera at +200 XP, a senator's dinner at +400) was written against v3.0's rates and is replaced.

| Place | Call | Needs Charisma |
|---|---|---|
| The Opera (Irongate) | *The interval in the boxes* | 15 |
| The Grand Hotel (Irongate) | *The Thursday dance* | 20 |
| The Promenade (Clearwater, The Front) | *The four o'clock promenade* | 10 |
| The Pier Hotel (Clearwater) | *Tea on the terrace* | 15 |
| The Lido (Clearwater) | *The lido's Sunday* | 12 |
| The Casino (Clearwater) | *The tables after midnight* | 20 |

The black-tie fundraiser (CHA 30, a unique item) and the diplomatic reception (CHA 35, cross-faction intel) wait for Tier IV content after the MVP. There is no separate dress check: the worn Charisma is the dress.

### 13.7 Party Directives (new)

See §15.4. Directives are the faction's *agenda for the day*, set by the elected Faction Chair. They tell a new player what to do and tie each person's session to the faction's collective plan.

**Directives v1 (slice 1, until a Chair exists).** The NPC party secretary sets them. For the Collective that is **Petra Holm**, Coalport branch secretary (portrait `holm`): brisk and warm, wastes no words, talks in shifts, wards and door counts, never in slogans; signs "— P.H." For the Vanguard, **Viktor Stahl**, district organiser in Duskwall (portrait `stahl`): clipped and formal, talks in wards, lists and times, treats every order as already agreed; signs "— V.S." For the Alliance, **Thomas Grey**, constituency agent in Ashford (portrait `grey`): dry and quick, a former *Gazette* sub-editor who counts words; signs "— T.G." Their templates: `docs/design/slice-2-cities.md` §1.5 and §2.5.

- **Titles say what and where, in plain words** (reviews 1 and 2). Every order title is `{Do} at/on/in {Place}`: *Talk to the customs men at the Fortress Gate*, *Knock on doors in Foundry Row*, *Go to the district meeting at Beacon House*, *Spread the word anywhere in Duskwall* (city-wide orders name the places in the secretary's line). The UI adds the count. The secretary's line keeps the voice. **Tapping an order opens its pin with the matching ticket highlighted**; a city-wide order opens the first pin in pin order with a matching ticket, and every matching ticket wears the *Party order n / m* tag. All templates as rewritten: `docs/design/review-2-answers.md` §1.7 (the review-1 tables in `review-1-answers.md` §3 are superseded for wording).

- **The welcome set.** On a character's **welcome day** (the City Day of creation, and the next one too when created after 22:00 UTC; §8.4, Appendix C #18) the three orders are fixed instead of rotated: **slot A, two attempts at a political action chosen by the player's best trained stat** (the highest of STR, INT and AGI; ties to the faction's bonus stat, then INT, then STR), one per city and stat, so a STR Vanguard talks to the customs men at the Fortress Gate, an INT one to the ration queue at the Customs Market, an AGI one hands out flyers there; **slot B, the favour from the platform, at the HQ** (review 4, §7.1: *Deliver Holm's parcel at the Union Hall* · *Hand out Stahl's bundle at Beacon House* · *Witness the signature at the Assembly Rooms*; a one-off `council`-type best-stat action of 10 Energy with the committee session's rewards and its own texts, `use: 'welcome'`; `docs/design/review-4-answers.md` §2.6; was a committee session); **slot C, *Take a job at {place}***. The first landing opens the HQ's pin with the favour highlighted (review 4; was slot A's pin). They fit in 30 Energy and complete in ten minutes, which pays the first +5 PC. From the next day the rotation applies. The table per city and stat: `docs/design/review-1-answers.md` §2; welcome-only templates carry `use: 'welcome'`.

- **Orders off in the cells (review 4).** From an arrest to the day's turn the member's Party orders are **closed**: done orders stay done and paid, open ones cannot be completed today, the +5 Political Capital is unreachable unless already paid; the panel reads *Orders off today · the branch heard about the cells*. Tomorrow's orders arrive as always (§19.2).
- **An order can be carried out (review 4).** A template is offered to a member only when **at least one ticket that matches it passes the member's gates today**, Energy aside (the place in the residence city and open to them; the ticket's Level, Rank, Reputation, record and members-only gates); otherwise the rotation takes **the slot's next template** for that member. The welcome set and the crisis pair are exempt. (The case: *Take on a mission anywhere in Ashford* offered at Level 6 where every Wharf mission needed Rank 3 or a Known reputation.)
- Directives are **faction-wide** among members who can do them (the mission order enters a member's rotation at Level 6, slice 5, and only once a mission is open to them): every member gets the same three on the same City Day, chosen deterministically from the day number (slot A: a canvass order; slot B: party work such as propaganda, a speech, a committee session or intelligence; slot C: a habit: *Train once*, *Six wins* or *Five attempts*), never the same set two days running. No scheduled job is needed.
- The three personal targets together fit in about **60 Energy**, so one session clears them (*Five attempts* with a canvass order and a speech is about 90; accepted, it is the volume day).
- **Progress** counts attempts (Success or Partial) for count-type orders, Successes for the "full day" order, and each row of a ×3.
- ***Take a job*** **completes the moment a job is taken** (+20 FXP then, shown as one line on the Jobs card; taking a job is not an action and opens no modal). A later switch never undoes it. It is only ever a welcome-day order (§9).
- **Completion has a voice** (review 1). A single order done is a **signed line** in the result modal's knock-on block (*Order carried out · +20 Party XP. Two remain. — V.S.*), never a modal. **All three done is a modal**, shown once the completing result is closed: the secretary's portrait, a headline and three lines in their voice, two tiles (*+5 Political Capital* · *+60 Party XP from orders today*), *Tomorrow's orders are in the morning paper*, one button, *Carry on*. It waits if the tab closes first. Texts per faction: `docs/design/review-1-answers.md` §6.
- The v1 templates are in `docs/design/slice-1-content.md` §6, superseded by the review-1 rewrite. When Issues (slice 4) and Campaign Events (slice 6) arrive, the secretary's menu grows to the full §15.4 list.
- **The capital rotation (slice 4).** A member's rotation is chosen by **residence** (§14.11): the home sets for home residents; for a capital resident, four templates per faction (slot A: *Canvass the capital*, any canvass in Irongate ×3; *Knock your own district* ×2; slot B: *Speak to the Issue*, any Issue-tagged action in Irongate ×2; *Report to {HQ}*, the capital committee ×1) with slot C shared, since `cityId: 'home'` in a match resolves to the **residence city** from slice 4. Two new match fields: `districtId: 'home'` and `issueTagged: true`. The Unrest crisis pair (§14.11) replaces slots A and B **only for members resident in the home city**. Texts: `docs/design/slice-4-battleground.md` §10. **Slot C's shared templates (3 Oct 2026, QA m1):** their titles and lines carry **`{city}`**, resolved at read to the residence city's name, and the training order **`{verbs}`**, resolved to the residence city's training verbs the member may take (distinct, in the order Study · Lift · Unload · Carry · Run, at most three), so a capital resident reads *Five attempts anywhere in Irongate* and *Study, carry or run once in Irongate*. **An Issue-tagged order's pin (QA m2)** is the first place in the residence city's pin order with an action tagged by the city's first Issue that the member may take (`docs/design/slice-4-fixes.md` §2–§3).
- **The event order (slice 6).** One template per faction joins slot B's rotation from a character's second City Day: ***Take part in the branch's event today*** (`dir.event`, `dir.v.event`, `dir.a.event`; `residence: 'any'`, match `cityId: 'home', kinds: ['event']`, target 1), **completed at the sign-up** (any Campaign Event of the faction in the residence city, the fixture or a member's) as *Take a job* is, +20 FXP; the +25 % match applies to the role's Party XP at resolution when the order was open at sign-up. Tapping it opens the fixture's page. The secretary's **daily fixture** is §15.4's. Texts: `docs/design/slice-6-together.md` §5.
- **The Chair's standing orders (slice 7; `docs/design/slice-7-nation.md` §4.2).** An elected Chair sets **three picks from the faction's rotation pool** (one per slot: each rotation template carries a **family**, the Chair picks a family, and a member reads their residence's template of that family, else their residence's rotation for the slot; the secretary's templates and voice; `slice-7-nation.md` §23.2) that apply from the next boundary and **repeat every day until changed**; the Orders panel reads *Set by the Chair, {name}*. **One pick may be pushed** to a battleground (a capital district or Clearwater): members at **Level 10 or above** read it there, members below read it in their own town, so two of the three are always doable at home. The push carries **the party's target** (25 / 50 / 100 matching attempts faction-wide by the boundary): reached, **every member who did at least one gets +10 FXP** in the morning and a headline; missed, nothing. The welcome set, the crisis pair, the event order, the match bonus, the completion bonuses and the refresh are unchanged. With no Chair, or before a Chair first sets any, the secretary's rotation applies; a Chair's term ending returns it. Nothing is scheduled: the standing orders are read where the rotation's day key is.

---

## 14. The City: map, influence and Issues

### 14.1 The five cities

| City | Role | Character | Train from the capital | Key locations |
|---|---|---|---|---|
| **Irongate** (capital) | **Battleground** · 5 districts (§14.9) | The political heart; every faction's HQ is here | — | Parliament, faction HQs, the *Irongate Herald* |
| **Clearwater** | **Battleground** · the swing city (built in slice 7, `docs/design/slice-7-nation.md` §9) | A lake resort with a working town behind it: the casino and the promenade on the Front, the tram sheds, the Rows and St Martin's in the Depot, the cannery and the fish quay at the Harbour | 25 min | The Casino (the council's hall), the Tram Depot, Back Lane Market, the Rows, St Martin's, the Sanatorium, the Harbour, the Cannery, Clearwater Station, Harbour Police; the Front (the Promenade, the Casino, the Lido, the Pier Hotel) opens with slice 8 |
| **Ashford** | **Home city** of the Alliance | University town: media, courts, debate | 12 min | University, courts district, Press Club |
| **Coalport** | **Home city** of the Collective | Industrial heartland: factories, docks, workers' councils | 12 min | Steel Mill, dockyard, underground press |
| **Duskwall** | **Home city** of the Vanguard | Frontier town in the mountains: the old fortress, customs and checkpoints | 15 min | Vanguard House, state archives, the Customs Market |

The cities sit well apart, joined by rail lines through the capital, and the map shows the distance. See §14.10 for travel, §14.11 for home cities and battlegrounds, and §14.12 for visiting a rival home city.

### 14.2 Influence

Each city has an **influence meter**: three faction shares plus a **Neutral** pool, totalling 100 %. Political missions, events, exposés and resolved Issues move it. In a battleground (a city, or an Irongate district) each faction's share drifts **1 % of its distance to the baseline per day** toward it, at the boundary, with Neutral as the counterparty (slice 4; the home cities' 2 % of the distance to 70 is the same shape), so no battleground is locked forever without work.

**Home cities are the exception.** The home faction's share can never fall below 50 %, so it always controls its home. There the meter is shown as the faction's **morale** (§14.11).

**How opinion moves.** Every political action has a **swing**: how many points of the city's meter it moves toward the actor's faction. The swing is set per Energy, like the other rewards (§5.5), and halved on Partial.

| Source | Swing | Example |
|---|---|---|
| Tier-1 political action (canvass, propaganda, street speech) | **0.005 points per Energy** | A 10-Energy canvass: **+0.05** on Success, **+0.025** on Partial |
| Tier-2 mission | 0.01 points per Energy; illegal missions ×2 | A 15-Energy exposé: +0.15; a 15-Energy Disruption: +0.3 |
| Tier-3 story, Operation | Set per story, 0.5–2 | |
| Campaign Event (slice 6) | **base by event (Poster Night 0.8 · Canvass Drive 1.0 · Rally 1.5 · the signature events 2.0) × the outcome (Triumph 1.5 · Success 1 · Mixed 0.5 · Fiasco 0) × the members' share of the roles' Energy (hands count; at most ×1.25)**, then the §14.4 lines; about 1–5 for a filled event; attributed equally to the member participants (§16.3) | A full Rally on Success: +1.5; a lone member on the branch's 40-Energy canvass drive: +0.25 |
| Resolving an Issue | +3 (§14.6) | |

Multipliers on the swing: Issue tag +50 % (§14.6), Battleground +25 % (§14.4), Groundswell up to +30 %, ordinances and laws (§15). Rested and Directives never touch opinion. Tier-2 and tier-3 figures are provisional until slice 4.

**Where the share comes from.**
- **Persuasion** (canvass, speech, propaganda, events, Issues) draws from the **Neutral pool first**. Once Neutral is at its floor, the rest comes from the rival factions **in proportion to their shares**.
- **Actions against a rival** (Disruption, Sabotage, exposés) take the swing from the **target faction**; half goes to the actor's faction and half to Neutral. Voters who leave a party don't all join yours.
- **Floors:** Neutral never falls below **5 %** (there are always undecided voters); a home faction never falls below **50 %** in its home city (§14.11). If nothing can be drawn, the swing shrinks to what can. Shares always sum to 100.
- **Precision:** shares are kept to **three decimals** (0.001 of a point) so that a Partial canvass counts; meters and the ledger show one decimal.
- Every swing is attributed to the player who caused it (the ledger, §14.5).

This puts the reference player (§5.2) at about **+0.8 to +1.2 points a day** from tier-1 play at home (the higher figure in week 1, when almost every tap is political), which is what the ledger line in §3.2 promises. The 1 % daily drift (2 % at home) balances a handful of active players per city; see Appendix C for what happens at scale.

**Damping at scale (slice 9; Appendix C #13 closed).** Every swing from an action or an event in a city or district is multiplied by **`clamp(20 ÷ active, 0.25, 1)`**, where **active** is the seven-day mean of distinct characters with a ledger row there per City Day (a solo, mission or event row; drift and system rows have no character), written by the day job. The factor is never named to a player: the modal shows the applied swing as it does today. Below twenty contributors the factor is 1 and nothing changes; a city of a hundred moves at a quarter of the raw rate, and no city moves faster than one of about eighty. The ledger records the swing as applied. Not damped: the drifts, an Issue's +3, the ballot and seat inputs to morale, and the exposé's swing (already capped).

**Build order:** the swing is **written to the city meter from slice 1** (the modal shows the delta to three decimals, trimmed, and the city's new share to one decimal); the **home-city drift is built in slice 3** with the council calendar (2 % of the distance to 70 a day, at the boundary, moving between the home faction and Neutral; Appendix C #16, closed), along with the ballot and seat inputs of §14.11; the **battleground drift, the district meters, the Battleground and Groundswell multipliers, the Issue multiplier and the ledger are built in slice 4**. From slice 4 every swing is also a **ledger row** (§14.5); whether the meter is written in the action's transaction or folded from the ledger is the architect's call (ADR 0010, 0022). Ballots and seats never move a battleground's opinion: those are home-city morale inputs.

### 14.3 Control grants access, not multipliers

| State | Condition | Effect |
|---|---|---|
| **Contested** | No faction above 50 % | Standard prices; all missions open; **Battleground bonus** can apply |
| **Control** | Above 50 % | The faction's buildings open (Vanguard House, Safehouse, Press Club), service prices shift (§19), it holds the council majority most of the time |
| **Dominance** | Above 70 % | Exclusive high-tier missions and cosmetic city dressing (posters, banners, bunting in text) |

**No reward multiplier ever scales with control.** A faction that holds more cities gets more *places to go*, not more XP or FXP per action. EVE Online's faction warfare showed that multipliers tied to control make winners snowball.

### 14.4 Battleground and Groundswell

- **Battleground:** a city or district where, **at the City Day boundary**, the top two faction shares are within **10 points** (Neutral is not a faction). For that day every **political action** there (canvass, speech, propaganda, council) gets **+25 % opinion swing, +25 % Faction XP** (a bonus line on base FXP, rounded per line) and **+5 % chance** (§8.4), for every faction; intelligence and training get nothing. Evaluated once a day so tickets don't change under a player and the paper can mark the day's battlegrounds. At the baselines the Government Quarter and Station & Market are battlegrounds and the three leaning districts are not: the bonus follows the fight. Ticket tag *Close race · +25 % Party XP · better odds* (slice 4; the player reads a battleground as a *close race* and a battleground city as *contested*, §1.5).
- **Groundswell:** when a faction **loses control** of a city or district (its share above 50 at one boundary, 50 or below at the next), it gets **+5 % opinion swing per day there, stacking to +30 %** (day 6 onward), on its own political actions, until it retakes control at a boundary or **14 boundaries** pass. Only the faction that lost. Multiplies with the Battleground and Issue lines, each shown as its own line. In the fiction, public sympathy turns toward whoever was just pushed out; the player reads it as a *comeback* (§1.5). Built in slice 4 **for districts only**: a home faction never falls below its floor (§14.11) and the morale states cover neglect at home, so there is nothing for it to fire on there; **slice 7 adds Clearwater** (a single meter with a district's rules) and confirms that it never fires in a home city: a home cannot be lost (§14.11), so there is nothing for it to fire on. It cannot fire until someone has first crossed 50 (Appendix C #29).
- **Multipliers on one line:** `swing = base × (1 + battleground) × (1 + issue) × (1 + groundswell) × (1 + ordinance)`, in full precision, rounded once to three decimals; the FXP line takes Battleground, *Fired up* (home only) and ordinances only.

### 14.5 The Influence Ledger and City Hero

- **Ledger (slice 4):** every opinion change is a **ledger row** (city, district, faction, the character or the system source, day, council cycle, the swing as applied after floors, the kind and a reference). Actions, journey cards and Issue resolutions are attributed to the character who caused them; drift and Issue awards to the system. Each player sees a line, live at read, on every city or district plate they have moved this cycle: *"This election you've moved Eastside +1.3 for the Collective (2nd of 7)"*, the rank among **all** contributors there this cycle, any faction; the cycle is the council cycle, count to count.
- **City Hero and District Hero (slice 4):** at each count, per city (per district in the capital) and per **level bracket** (1–15, 16–30, 31+), the character with the largest positive sum this cycle, **provided it is at least +0.5 points** (a single canvass does not make a hero); ties to the earlier to reach the total. The bracket is the character's Level at their **last contribution** of the cycle; **any contributor** can be the hero, resident or visitor (the title is for the work, not the address); the home ballot's +0.5 (§14.11) is a ledger row but not a contribution, so a ballot never makes a hero. Up to fifteen heroes a cycle in the capital and three in each home city. Rewards: the **title for the next cycle** (*District Hero, Eastside* on the Me tab and on political lists until the next count), **25 PC**, a line **In Print** in the paper (*{name} Named District Hero of {district}*), and from slice 8 a Legacy entry and the profile medal. Given at the count, present or not.
- **The ledger table:** the top three of each bracket per city or district are printed on the count page; the faction screen's ranking is slice 6. Contribution is visible without third-party tools.
- **The faction scoreboard (slice 6).** The Faction tab folds the ledger by member for **this week** (Monday to Monday, the Issues' week; council cycles differ by city, so a faction-wide ranking by cycle would be five rankings) and **all time** (*this season* from slice 8, when seasons roll it over): per Level bracket, **Moved** (the member's positive swings summed across every city, one decimal) and **Events** joined; ten rows a bracket, the top three marked, your own row below when outside them; a city filter. Members only; nothing in it is secret.

### 14.6 Issues of the Week (new)

This is Irongate's signature mechanic. **Every city has two live public concerns each week.** They give each day a different shape and turn influence into an argument about something.

**How they work (pinned in slice 4):**
1. **The draw.** At the **Monday 00:00 UTC boundary** every open city draws **two Issues** from the deck, seeded from the week key, from the Issues eligible for that city, never last week's two, and in Irongate **from two different districts** (the capital's Issues are tied to districts). Weights are all 1 in the MVP; "the city's character" is which Issues list the city. Laws and weather weight the draw when they exist. A city that has never been settled draws at bootstrap, so no city is ever without Issues. The first drawn is *the city's first Issue*.
2. Each faction has a **stance** on each Issue (≤ 90 characters): flavour, printed as the winner's deck. **The effect is the same whichever faction owns the Issue.**
3. **Tags.** An Issue has a `feeds` match (action types, locations, location kinds, the district): a matching action is **tagged** while the Issue is live (*Issue: Tram Fare Hike · opinion +50 %* on the ticket; on a place and the Places list the chip reads *Issue · Tram Fare Hike* and opens a help note, review 4: *Two things the town is arguing about this week, drawn Monday. Work tagged with one moves opinion half again and counts for your party on it; on Sunday night the party with the most work owns the Issue, gains three points here, and its effect runs for a week.*). A tagged action gets **+50 % opinion swing** and adds **momentum** to the actor's faction on that Issue: **its Energy on Success, half on Partial**, each row of a ×3 on its own; journey cards add what they say. The Energy is the action's **content** Energy, not a reduced cost (a 10-Energy speech under Rally Permits still adds 12, the rewards rule); a Partial on an odd Energy rounds **half up** (3 → 2); a card's points and opinion are fixed amounts, untouched by the *close race*, Issue or *comeback* factors. **Momentum is public**: the paper's Issues section shows every faction's total and who leads. **Slice 6:** a Campaign Event whose venue and type match the feeds (as an action of that type at that place would) adds **each member participant's committed Energy** (full on Triumph and Success, half on Mixed, none on Fiasco); the General Strike adds double (§16.3).
4. **Resolution** at the **Monday boundary, before the new draw** (Sunday night; no early resolution in the MVP, Appendix C #28, so nothing depends on a threshold or a clock time). The faction with the most momentum **owns the Issue** (ties: the higher share in the city or district; then nobody); with no momentum at all it **lapses**. The owner gains **+3 opinion** in the city (in Irongate, in the Issue's **district**), drawn Neutral-first and attributed to the Issue in the ledger; a headline in every paper; its **top five contributors by momentum get 4 PC each**; and the Issue's **effect** applies to the whole city for **7 City Days** as a bounded modifier line like an ordinance's, stacking with the ordinance in force as a separate line. **Two sources of one kind** (a rule and an Issue, or two Issues; 3 Oct 2026): Energy, chance and Rested cap deltas **add**; pay, Iron and FXP percentages are **each their own line on the base**; opinion, ticket and room percentages **multiply** (a ticket never below 5 Iron); *every win counts twice* and seniority ×2 take **the larger**, never ×4. The effect DSL gains two kinds for the deck, **tickets −50 %** and **rooms −50 %**, both bounded. **Slice 5** adds two more, **`heatCoolPct`** (0…+100: Heat cools faster by that share) and **`bailPct`** (−50…0), and five Issues for the new places (*Customs Strike*, *Ferry Fares*, *Timber Rates*, *Market Tolls*, *The Cells Are Full*; `docs/design/slice-5-risk.md` §12.1), so the deck is 24; a mission is tagged by the same feeds as an action of its type. **Slice 7** adds six for Clearwater (*The Cannery Wage* pay +10 %, *Rents in the Rows* rooms −50 %, *The Casino's Licence* Iron +15 %, *The Harbour Dues* intelligence −1 Energy, *Beds at the Sanatorium* Rested cap +50, *The Lido Season* speech −2 Energy) and `issue.tram-fares` gains Clearwater: **the deck is 30** (`docs/design/slice-7-nation.md` §9.6). **A law** (§15.8) is a third source of the same effect kinds, combined by the rules above.

**The slice-4 deck** is nineteen Issues, every effect a bounded modifier on a number that exists (tickets −50 %, propaganda swing +15 %, rooms −50 %, job pay +10 %, speech −2 Energy, Iron +15 %, FXP +25 %, canvass +4 %, Rested cap +50, Standing ×2, seniority ×2 (was *shifts −1 Energy*, retired with the shift, §9), training −20 %, intelligence −1 Energy), with texts, feeds and stances in `docs/design/slice-4-battleground.md` §9.5. The table below is the roadmap deck whose effects wait for their systems (Heat, hospital costs, bribes, exposés, encounters); the rows already built appear in the slice-4 deck under their slice-4 names.

| Issue | Typical trigger | Vanguard stance | Collective stance | Alliance stance | Effect if resolved |
|---|---|---|---|---|---|
| Bread Prices | Winter, poor harvest | Arrest the speculators | Price controls, bread lines | Subsidy bill | Street food −25 % |
| Strike at the Mill | Coalport, labour laws | Break the strike | Support the strikers | Mediate | Factory job pay ±15 % |
| Crime Wave | High average Heat | Curfews and patrols | Jobs, not jails | Police reform | Police encounters ±10 % |
| Flu Outbreak | Autumn, winter | Quarantine the docks | Free clinics | Public health board | Hospital costs ±25 % |
| Housing Shortage | Clearwater, Coalport | Clear the slums | Rent strikes | Building programme | Lodging cost ±50 % |
| Press Censorship | Dress Code or Propaganda laws | Suppress "subversive" papers | Underground press | Free press campaign | Exposé strength ±25 % |
| Border Incident | Duskwall, random | Mobilise | Peace rallies | Diplomacy | Journeys to Duskwall ±25 % time |
| Tram Fare Hike | Clearwater, Irongate | Make the trams run on time | Fare boycott | Consumer inquiry | Tickets from the city ±50 % |
| Corruption Scandal | After a Blackmail or Exposé | Clear out the rot | Expose the elite | Independent inquiry | Bribe costs ±25 % |
| Unemployment | After a factory closure | Public works under discipline | Workers' co-ops | Retraining scheme | Job pay +10 % |
| University Protests | Ashford, spring | Close the campus | Join the students | Open debate | Lecture rewards +25 % |
| Heatwave Riots | Summer heatwave | Restore order | Water for the districts | Emergency relief | Encounter aggression ±10 % |

The deck grows with live content. Each Political Season adds new Issues (§22).

### 14.7 Weather

Weather is rolled **per city, per City Day**, using seasonal probabilities. It changes mission odds and flavour and never blocks an action.

| Season | Weather | Effects |
|---|---|---|
| Spring | Rain 40 %, clear 60 % | Rain: −10 % success outdoors without outerwear. Clear: +5 % propaganda success |
| Summer | Clear 80 %, heatwave 20 % | Heatwave: +10 % encounter aggression; outdoor rallies +15 % influence |
| Autumn | Rain 50 %, fog 30 %, clear 20 % | Fog: +10 % stealth success; Disruption harder to trace (−5 caught) |
| Winter | Snow 50 %, frost 30 %, clear 20 % | Snow: journeys +25 % time. Frost: −10 % success outdoors without a winter coat |

Weather has no HP penalties; the right outerwear gives **Weatherproof**, which removes the penalties.

### 14.8 National Control

| City | Weight | How it's decided |
|---|---|---|
| Irongate | **40 %** | Three-way battle, the average of its five districts |
| Clearwater | **30 %** | Three-way battle |
| Ashford | 10 % | The Alliance's home: its share is its morale (never below 50 %) |
| Coalport | 10 % | The Collective's home: its share is its morale (never below 50 %) |
| Duskwall | 10 % | The Vanguard's home: its share is its morale (never below 50 %) |

**National Control** is each faction's weighted average influence across the five cities. It feeds national elections (§15.5) and the size of each faction's bloc in the Legislature.

**About 70 % of national power is won in the two battlegrounds.** The equal 10 % home weights give each faction the same baseline, 5–10 % depending on morale, so no faction starts ahead.

**Slice 7 (pinned; `docs/design/slice-7-nation.md` §8; the player reads it as *who holds the republic*).** For each party, `NC = 0.40 × Irongate (the equal average of the five districts) + 0.30 × Clearwater + 0.10 × Coalport + 0.10 × Duskwall + 0.10 × Ashford`, each its share of that meter; **a home city in Unrest counts half for every party and Neutral** (its weight 0.05; the shares then sum to 95 and the bar shows them as they are; settled 4 Oct 2026). Computed at the boundary with the day's battleground flags, shown to one decimal. **At the baselines every party holds 23.5** (Clearwater evened to 22 / 22 / 22 / 34, §14.11). It is **half of every party's national score** (`controlShare` = its NC ÷ the three parties' NC, §15.5), the Season Score's input (§22.1), and the nation map's bar; **it gives no multiplier** (§14.3). The party with the highest NC at a boundary ***leads the republic*** for the day: a line in every paper and a headline when it changes, nothing more. **Control of Clearwater** (above 50; dominance above 70) is a district's: access, never multipliers.

### 14.9 Capital districts (new)

Irongate is the only city split into districts. It's worth 40 % of the nation and every faction's HQ is here, so it deserves more than one meter. Districts give the capital several battlegrounds at once, and give each faction home ground inside it.

| District | Character | Key locations | Leans |
|---|---|---|---|
| **Government Quarter** | Stone ministries, the forecourt, lawyers and lobbyists, the opera | Parliament, the Forecourt, the Ministries, the Supreme Court, the Opera, Chancery Row | Neutral; the hardest to hold |
| **Old Town** | Cobbles, cafés, the press and the basilica | Herald House, the Press Club, Concord House (Alliance HQ), Basilica Square, St Agnes Hospital, Lantern Lane | Alliance |
| **Station & Market** | Crowds, trams, traders and hotels | Central Station, Market Square, the tram junction, the Grand Hotel | Swing |
| **Eastside** | Tenements, workshops, the riverside warehouses | Collective HQ, workers' bars, the riverside quays | Collective |
| **Garrison Hill** | The old citadel, now police headquarters; the esplanade below it; officials' villas behind their walls | Vanguard House, Police Headquarters, the Esplanade, the Villas, the Gate Tavern | Vanguard |

The other two: **Station & Market** (Market Square, Tram Junction, Central Station, the Grand Hotel, the Bombed Blocks, the Station Buffet) and **Eastside** (Union House, Riverside Quays, the Ironworks Gate, the Red Lantern, Foundry Row, the Iron Bridge). Twenty-nine locations, **62 tier-1 actions** at difficulty 10 (the first draft's three shift actions became Jobs-card wages, §9; the count read 59 until 3 Oct 2026, a slip; the three HQ committee sessions check the best stat, §8.4), three jobs on Jobs cards (Porter 180, Street vendor 100, Driver 200; no faction pays a fifth more in the capital, and a home job pays in full from anywhere, so the capital has no running cost), with pins and texts in `docs/design/slice-4-battleground.md` §4. HQ actions are **members only**. No location is a barracks and no action is set in one (`docs/design/content-policy-review.md` §7).

**How districts work:**
- **Opinion:** each district has its own opinion meter. Irongate's city opinion is the **equal average of the five** and feeds National Control as before.
- **Control:** the same thresholds as cities (§14.3): above 50 % controls, above 70 % dominates. Control gives access, never multipliers: the faction's safehouse and prices in that district, its posters on the walls, and **police who answer to it**. Rivals of the controlling faction gain Heat 25 % faster there (**built in slice 7**, for the districts and Clearwater: `heatGainPct` +25 for rivals of the controlling party, a city factor).
- **Battleground and Groundswell** apply per district.
- **Issues:** each of the capital's two weekly Issues is tied to a district, e.g. *Eviction Notices in Eastside* or *Press Raids in Old Town*.
- **Recognition:** the capital awards **District Hero** per district instead of one City Hero.
- **Council:** the Irongate council has **10 seats, 2 per district**, elected by that district's residents with the battleground count (§15.3: the turnout-weighted score, D'Hondt for two seats), every district counting on the same night (cycle offset 0). **The order paper carries each seated bloc's branch motion** (Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*, in order of seats) plus up to three proposals from the Irongate menu (the ten plus *Tram Subsidy*); NPC councillors vote with **their own faction's player councillors** (else their branch's motion); an item **passes with six of ten**; the ordinance applies to every district. Ten NPCs at 4 / 3 / 3 pass nothing, and one player councillor who crosses the floor carries their NPC colleagues and passes it: the capital's ordinance is a coalition or nothing. The largest bloc's top player councillor with a completed council term is **Mayor of Irongate** (the capital's Governor; pinned in slice 7, §15.1: else the bloc's top local holds the chair and sets nothing). **The council's hall** (review 3, §15.3; chosen 3 Oct 2026) is **the City Hall**, the baroque hall with the clock tower and the copper-domed turret between Parliament and the Opera, facing the formal gardens above the river: `council.hall` at **0.57, 0.345** on the capital's picture, caps line *IRONGATE COUNCIL · THE CITY HALL*. Not Parliament, which is the republic's. **From review 4 it is also a location**: `irongate.city-hall`, kind `town-hall`, the Government Quarter's seventh place (the capital has **thirty** places), with *Sit in the public gallery* and the council's sheet (§15.3).
- **Moving around:** trams between districts are instant and free (a tram bar on every district view). Only journeys between cities take time.
- **On the map (revised 2 Oct 2026, §14.13):** the capital is **one painted picture** (11,520 px, day and night) and each of the five districts is a **frame** on it, holding its 5–6 places; the **city overview** is the same picture zoomed out, carrying five district pins (and a Districts list) and no place pins, and a district pin zooms into its district's frame. Every `irongate.*` pin is a fraction of **the capital's picture**, from the survey in `packages/content/src/data/mapPins.ts` (29 pins, each marked with its district). The districts are the capital's quarters. **The five frames** (pinned 2 Oct 2026: each district's pins' box grown by 0.06 and clamped, checked against the painting; `slice-4-battleground.md` §4.2):

  | District | Frame x0, y0, x1, y1 |
  |---|---|
  | Government Quarter | 0.40, 0.18, 0.72, 0.43 |
  | Old Town | 0.06, 0.07, 0.43, 0.38 |
  | Station & Market | 0.29, 0.49, 0.62, 0.74 |
  | Eastside | 0.50, 0.44, 0.98, 0.78 |
  | Garrison Hill | 0.72, 0.01, 0.97, 0.33 |

  A district view draws **only its own district's pins** (two pins of different districts, Union House and the Bombed Blocks, are 0.04 of the picture apart across the district line); the overview draws no place pins, only the five districts as outlines with their names (the user's district lock, 3 Oct 2026) and a Districts list; inside a district the rest of the picture is dimmed and the view is held to the district. Pins are at least 44 px apart at rest in every district on a 360 px phone (the closest, Market Square and the Grand Hotel, 51 px at the floor). **The five districts tile the whole picture (review 4, 6 Oct 2026):** every point of the capital, the river included, belongs to exactly one district. The split runs along **the river's middle** (0, 0.37 · 0.20, 0.40 · 0.43, 0.43 · 0.50, 0.45 · 0.60, 0.47 · 0.62, 0.47 · 0.75, 0.49 · 1, 0.54), two lines from the river to the top edge between Old Town, the Quarter and the Hill (x ≈ 0.42 and x ≈ 0.70), and the Station & Market–Eastside line carried to the river and to the bottom edge (through 0.52, 0.85 · 0.53, 1). The outlines (`quarters[].outline`): **Old Town** [0,0]·[0.43,0]·[0.42,0.16]·[0.41,0.28]·[0.42,0.355]·[0.43,0.43]·[0.20,0.40]·[0,0.37] · **Government Quarter** [0.43,0]·[0.70,0]·[0.69,0.14]·[0.71,0.22]·[0.73,0.30]·[0.74,0.37]·[0.75,0.49]·[0.62,0.47]·[0.60,0.47]·[0.50,0.45]·[0.43,0.43]·[0.42,0.355]·[0.41,0.28]·[0.42,0.16] · **Garrison Hill** [0.70,0]·[1,0]·[1,0.54]·[0.75,0.49]·[0.74,0.37]·[0.73,0.30]·[0.71,0.22]·[0.69,0.14] · **Station & Market** [0,0.37]·[0.20,0.40]·[0.43,0.43]·[0.50,0.45]·[0.60,0.47]·[0.605,0.53]·[0.60,0.58]·[0.585,0.62]·[0.575,0.64]·[0.53,0.64]·[0.52,0.70]·[0.50,0.745]·[0.52,0.85]·[0.53,1]·[0,1] · **Eastside** [0.60,0.47]·[0.62,0.47]·[0.75,0.49]·[1,0.54]·[1,1]·[0.53,1]·[0.52,0.85]·[0.50,0.745]·[0.52,0.70]·[0.53,0.64]·[0.575,0.64]·[0.585,0.62]·[0.60,0.58]·[0.605,0.53]. Shared edges are the same points in both polygons, so the loader's check (no gap, no overlap, every pin inside its own) is exact; the frames stay the zoom targets at rest; **inside a district the drag limit is the outline's bounding box**, not the frame plus 10 %, so the whole district is reachable. A sixth district would be a split of one of these, never new land (Appendix C #41). District borders and states are drawn as an interface overlay on neutral art, so the map never needs repainting; the plate words are *Close race*, *Leans {faction}*, *Held by the {faction}*, *Comeback*. The pen-and-ink `irongate-districts.png` and `irongate-closeup.png` are retired.

Other cities stay single-meter in MVP: their quarters (§14.13) are map units, not districts. Two or three districts for Coalport or Clearwater could come later if the capital works.

### 14.10 Travel and journeys (new)

The cities are far apart. **Travelling between them takes real time**, so where you are matters: your Home City, where the Campaign Event is tonight, which patron you're courting.

**Journey times (from Irongate):**

| To | Third-class train | Car |
|---|---|---|
| Ashford | 12 min | 7 min |
| Coalport | 12 min | 7 min |
| Duskwall | 15 min | 9 min |
| Clearwater | 25 min | 15 min |

Journeys between two outer cities run through the capital: the two legs added together.

**Ways to travel:**

| Mode | Cost | Notes |
|---|---|---|
| **Third class** | 20 IM | The standard. Uses the ordinary journey events |
| **First class** | 80 IM, CHA 15 dress check | Same time; the society event deck (patrons, officials); +20 Rested on arrival |
| **Car** | Hire 150 IM, or own one (5,000 IM, Level 16) | About 40 % faster; road events (checkpoints, breakdowns); slowed by snow |
| **Night train** | 60 IM; departs 22:00–01:00 | Arrives at 06:00 with +50 Rested. Made for players who log in once a day |

**Rules:**
- **Travel costs a ticket and time, never Energy.** Energy keeps refilling on the way.
- **The journey runs in the background.** It arrives with the app closed (the screen says *You'll arrive either way, and Energy keeps refilling on the way*; review 4 removed *You can close the game* from every screen: the game never invites a player to leave). On the way you can read the Paper, sort the Dossier, chat and vote, but not run missions or take part in events.
- You can cancel before departure, not once the train has left.
- Scheduled Campaign Events show a **"leave by"** time for players in other cities.
- Modifiers: snow +25 % time; the Open Borders law −25 %; the Tram Subsidy ordinance halves ticket prices from that city. Entering a Vanguard-controlled city adds a **checkpoint** on about half of journeys.
- **A journey into a rival home city always triggers an event**, from the hostile-ground deck (§14.12).
- **No journey takes more than 30 minutes**, except the night train. The NPC default Directives favour the player's current city and the capital, so the daily loop never forces a trip.

**Slice 4 (pinned; `docs/design/slice-4-battleground.md` §2–3).** The nation map opens at **Level 10**. **Third class only** (20 Iron; the Tram Subsidy ordinance and the Tram Fare Hike Issue each halve fares *from* their city, never below 5). Destinations: **Irongate and your own home city**; rival home cities (*Rival ground · from a later edition*, slice 5; §1.5) and Clearwater (*No service yet*, slice 7) are on the map, locked. **The train leaves at the tap**: no departure time and nothing to cancel. **In transit** is the city you left plus the journey's status, never a null city (ADR 0025); arrival is settled **lazily** by any read at or after `arrivesAt`, and a tidy job settles it at the same time for players who are away, best effort, so correctness never depends on the worker. In transit: no Energy actions or training; the paper, the Me tab and the nation map, and every **political act of your residence** (ballot, endorse, declare, withdraw, propose, the council vote) work from anywhere, in transit included. Energy actions happen only in the city you are in; the job's wage arrives wherever you are (§9). Arrival is one modal (stamp *Arrived*) into Station & Market (Irongate) or the city map. Boarding is from the nation map and, in Irongate, from Central Station's pin; the home cities' station quarters are a later content addendum, not slice 4 (the user decided, 2 Oct 2026; §14.13). **The first journey a character makes always carries a card; afterwards one in three**, drawn at boarding, seeded, without replacement until all seven have been seen; a card can be answered during the journey and on the arrival modal, and after that it was slept through. The seven cards (a talkative passenger, flyers on the seats, the parcel, the card school, the reporter, the signal stop, the boy without a ticket) use the §8.4 check at difficulty 10, never fail, cost no Energy, and never take Iron a player did not stake; a card pays **at most a 10-Energy action's XP, Party XP, opinion and points (45 / 6 / 0.05 / 10), 10 Rested, and at most 100 Iron**, which only the parcel pays (50 + 50: the card that will carry Heat in slice 5; every other card at most 40, Appendix C #46); opinion from a card goes to the destination (Station & Market for the capital). **The paper on the way:** the player's own paper in the destination's edition (§3.3, review 4; until then the Herald on a train to the capital). A card's row shows an odds word and the stat (*Good odds · Agility · opinion +0.05 in Coalport · +5 Party XP*), never a check or a percentage (§8.4). Presence and carriage chat are slice 6.

**The nation map (slice 4, maps v3; `docs/design/slice-4-battleground.md` §2.1).** The painted republic (9,216 px, day and night) with the five cities at their survey positions (`mapPins.nation`: Irongate 0.52, 0.53 · Ashford 0.12, 0.17 · Duskwall 0.88, 0.25 · Coalport 0.18, 0.80 · Clearwater 0.88, 0.85); the railways are painted, with halts and villages between the towns, so no line is drawn over them. It obeys the city maps' rules (§14.13; the user decided this for the phone on 2 Oct 2026, Appendix C #42 closed): it **fills the screen**, the player **drags** within the picture and **zooms it freely** between the two review-3 limits (3 Oct 2026; the earlier "cannot zoom freely" predated review 3), **at rest the player's city and the capital are both in view** and the other cities are a drag away or one tap in a **Cities** list, and a tap on a city **zooms onto the town** and opens its card (the name, its line, who holds it, its two Issues, the Election line, and *Board · 20 Iron · 12 min*, or the lock word *rival ground* / *no service yet*).

**The journey on the nation map (review 4, 6 Oct 2026; `docs/design/review-4-answers.md` §7).** A journey is **drawn on the nation map**: the map opens with both cities in view, the route between them **traced** along the painted roads or rails (a 2 px ink line with a paper halo), and **the player's pin** (a plain moving pin, not a train; user, 7 Oct 2026; its label under it: *To Coalport · in 12 min*) at the point the clock says, `progress = (now − boardedAt) ÷ (arrivesAt − boardedAt)` mapped onto the route's polyline by length, ticking on the client; the server stays the authority and arrival is settled lazily as before. **Routes are content** (`nation.routes[]`: one polyline per leg, Irongate to each city, traced along the painted rails; a journey between outer cities is two legs). **The card fires on the way:** where it fires is **drawn at boarding** with the card, `cardAt` uniform in **0.20–0.80** of the journey, stored as a timestamp; the card is shown from `cardAt` (a sheet over the map), answerable until arrival or on the arrival modal; the server refuses an answer before `cardAt`; nothing is scheduled. **The card stays until a row is tapped (review 5, 8 Oct 2026):** the sheet has no scrim-dismiss, close or swipe; the Paper, Me and Council tabs still work and the Map tab returns to the card; the only ways out are the card's choices or an explicit put-aside row, ***Sleep through it*** on the ordinary deck (the card's `ignore` text, nothing happens) and ***Let it pass*** on the hostile deck (its detail line says the consequence: *your name gets written down · Heat +10 · Watched today*); **the arrival modal shows *Continue* only after a row is tapped**. A closed app changes nothing: the card is there on return, or inside the arrival modal, so being away never loses it (`docs/design/review-5-answers.md` §7). **Leaving and coming back:** the pin is wherever the clock puts it; a fired, unanswered card's sheet is open on return; a passed arrival is settled on the first read with the card in the modal if still unanswered. The plate carries the class, the train's name, *arrives in 7 min · 14:22*, a track, and the sentence above; a *Follow your pin* chip returns the view after a drag. The deck, the draw rule and the rewards are unchanged.

**Journey events (the roadmap).** On about one trip in three, a card appears during the journey. It's always optional; ignore it and you "slept through it", with a neutral outcome. The table lists the full deck; the rows that need Heat, the Dossier, first class or the car arrive with those systems.

| Event | Needs | Choice and outcome |
|---|---|---|
| **Papers, please** | Checkpoint | Show papers (Heat and Criminal Record checked), bluff (CHA), or use forged papers (utility item) |
| **A talkative passenger** | — | Listen: a free Dossier entry, sometimes on a named NPC |
| **The parcel** | Third class, car | Carry a stranger's parcel: Iron, at the cost of +10 Heat if it's searched |
| **First-class company** | First class | A patron or official in your compartment: Favour, or a legislation rumour |
| **Flyers on the seats** | — | Swap them for your own: a small opinion gain in the destination city |
| **Breakdown** | Car, snow | Wait (+5 min), fix it (STR or INT), or hitch a ride (a new Dossier contact) |
| **The night train** | Night train | Sleeper-car storylets for your Ambition |

**Fellow travellers:** the journey screen lists other players on the same train ("On the 14:10 to Coalport: 2 Collective, 1 Vanguard") and opens a carriage chat for the trip.

**Slice 7.** **Clearwater's service opens**: 25 minutes third class from the capital, 20 Iron, the slice-4 card deck (no hostile card: it is nobody's home), arrival at Clearwater Station in The Harbour; from an outer city through the capital (Coalport and Ashford 37 minutes, Duskwall 40). **The painted coast line between Coalport and Clearwater carries no service** (scenery; Appendix C #8 closed): every line runs through Irongate, which keeps the three home cities' roads to the second battleground within three minutes of each other. The **Open Borders Act** (§15.8) is the only thing that shortens a journey (−25 %).

### 14.11 Home cities and battlegrounds (new)

Each faction has a **home city** it can never lose. Power is won or lost in the two **battlegrounds**.

| | Home city | Battleground |
|---|---|---|
| **Which** | Duskwall (Vanguard), Coalport (Collective), Ashford (Alliance) | Irongate (5 districts), Clearwater |
| **Control** | Always the home faction's (never below 50 %) | Three-way contest (§14.3–14.4) |
| **Who lives there** | New players of that faction, and anyone who chooses to stay | Players of any faction who have registered there (**Rank 2+**, 500 Iron, seven days between moves; below) |
| **Council elections** | **Within the faction**: its own candidates and party wings compete for the seats | Three-way, the usual formula (§15.3) |
| **Safety** | Safe for its own faction; hostile ground for rivals (§14.12) | Normal: encounters from tier 2 and 3 only |
| **National weight** | 10 % each | Irongate 40 %, Clearwater 30 % |

**Why it works:**
- **A clear first week.** New players start among their own people, in their faction's own atmosphere, with the police on their side. Each faction's first week has its own tone.
- **Concentrated conflict.** Every rally, exposé and vote in the battlegrounds matters, and the three factions actually meet there.
- **A natural ladder:** home city, then a battleground, then the nation.
- **No faction can be wiped out.** Losing the capital hurts, but there is always a home to rebuild from.

**Home cities stay alive through two things:**
- **Morale.** The home faction's share in its home city is its **morale**. Rival spy actions (§14.12), unresolved Issues and neglect lower it. **Keeping your base fired up is a job.** Morale never falls below 50 %, so a faction never loses its home, but low morale has real consequences (see *Morale states* below).
- **Politics within the party.** Home council seats are contested between members of the same faction: rival candidates, party wings, endorsements. The primary is where a new player first competes.

**Why a home city is never lost.** New players start there, so a rival-held home would make a terrible first day. Losing a home would also snowball (fewer new players, a weaker faction, more losses) and invite coordinated griefing. So the floor stays, and neglect is punished through morale states instead.

**What moves morale (slice 3).** Political actions at home (the §14.2 swing) · the daily **drift of 2 % of the distance to 70** at the boundary (95 → 94.5; 60 → 60.2; the points move between the home faction and Neutral), so a lone reference recruit at +1.15 a day takes a city from 70 to *Fired up* in about nine days and five of them do it in two · **+0.5 per ballot cast** by a resident member · **+2 when a player takes a council seat** · **−3 at any count in which no player voted** (the branch stayed home; the only negative input until rival action arrives in slice 5) · ordinances that raise the swing (§15.3). One active member keeps a city *Fired up*; neglect, not absence, is what the state measures, and the cost is the faction's, never a player's asset (§4.3 rule 4).

**Morale states:**

| Morale | State | Effects |
|---|---|---|
| **80–100 %** | **Fired up** | **+10 % Faction XP on actions at home** (a bonus line on base FXP, rounded per line, so a 6-FXP canvass shows *Fired up: +1*) · **the branch's volunteers at Campaign Events score three quarters instead of half** (slice 6, §16.3) · the full 10 % national weight |
| **60–79 %** | **Steady** | Normal |
| **50–59 %** | **Unrest** | A **crisis** (below) |

*Fired up* was +5 % in the first 3.1 draft; per-line rounding made that invisible at tier 1, against the rule that every result shows its numbers. At 10 % every line shows. Because an active branch keeps its city *Fired up* almost always, this is a small permanent acceleration (about +6 % Faction XP a day) rather than a bonus; accepted (Appendix C #23).

**A crisis is an event, not a loss:**
- **Announced** in every Morning Paper: *"Unrest in Coalport: dockers question the party."*
- **The Chair's Directives switch** to *Restore the base*: in slice 3, the day's slot A and B orders are replaced by a fixed pair (*Restore the base: the doors*, any canvass in the city, 3 attempts; *Restore the base: say it*, any speech, 1 attempt; the secretary's lines per faction are in `docs/design/slice-3-politics.md` §17.4), each completion paying **+40 FXP** instead of +20; players who help earn Legacy from slice 8. Orders are set once a day: if the city leaves Unrest during the day, the crisis pair stays until the next City Day.
- **Consequences while it lasts:**
  - **NPC councillors abstain** on ordinances, so a motion needs four player votes (slice 3)
  - the home city counts for only 5 % of the faction's national weight (slice 7, built: §14.8)
  - rival spy missions there pay more: **+75 % Faction XP instead of rival ground's +50 %** (slice 5, §14.12)
  - the faction's **local deputies abstain on every bill** in Parliament while it lasts (slice 7, §15.6: the bloc goes quiet until the branch wins the town back)
  - a player Chair faces **an automatic vote on the Chair** (slice 7, §15.4; once per Chair per term)
- **The way out:** get morale back to 60 % or above. A *"Coalport Stands Firm"* headline (every paper, that morning) and, from slice 8, a Legacy entry go to everyone who helped. The plate shows the state word after the share (*Collective 84.0 % · Fired up*; *Unrest* in the failure colour).

**Guardrails:**
- **Rival pressure is capped per day.** A rival crew can cause a crisis but can't keep one going forever. **Pinned (slice 5): the home faction's share can lose at most 2 points a City Day to rival actions in the city, across both rivals**; past the cap, rival actions there still pay XP, Party XP and Iron and move nothing (the ticket says so).
- **A prize for pushing a town into Unrest (review 5, decided by the user 8 Oct 2026; `docs/design/review-5-answers.md` §10.3).** When a rival home city enters Unrest, every member of a pushing party who moved **at least 0.5 points there in the last seven days** gets **+50 Party XP**, a headline in their paper naming the top three (*{Party} Callers Push Duskwall into Unrest*) and, from slice 8, **Legacy +2**; paid **once per entry per city, at most once in seven days per city** (the cap is per city, not per member: both rival towns in Unrest in one week pays 100; settled with the architect, `docs/design/review-5-answers.md` §18). From *Fired up* at 70 with both rivals at the cap a town reaches 60 in five days; the home branch wins it back by work (three canvassing members take it from 58 to 60 in a day).
- **Home morale recovers faster** than battleground opinion: it drifts toward 70 % at **2 % of the distance a day**, against 1 % elsewhere. Recovery from Unrest is therefore mostly work, not waiting: from 55 the drift alone gives +0.3 a day; a canvassing member gives four times that.

**Baselines.** Each meter starts a season at its baseline and drifts back toward it (§14.2, §22.2). Home cities start at the 70 % drift target, with the rest split so that the undecided outnumber either rival. The three home cities are pinned (slices 0 and 2), the five Irongate districts are pinned (slice 4), and Clearwater is pinned in slice 7 at **22 / 22 / 22 / 34**, evened from the provisional 20 / 24 / 24 / 32 so that no party starts ahead on National Control (Appendix C #70; its character lives in its places and Issues).

| City or district | Vanguard | Collective | Alliance | Neutral |
|---|---|---|---|---|
| **Coalport** (Collective home) | 9 | **70** | 6 | 15 |
| **Duskwall** (Vanguard home) | **70** | 6 | 9 | 15 |
| **Ashford** (Alliance home) | 6 | 9 | **70** | 15 |
| **Clearwater** (pinned in slice 7; was 20 / 24 / 24 / 32) | 22 | 22 | 22 | 34 |
| Irongate: Government Quarter | 20 | 20 | 20 | 40 |
| Irongate: Old Town | 15 | 15 | 35 | 35 |
| Irongate: Station & Market | 20 | 20 | 20 | 40 |
| Irongate: Eastside | 15 | 35 | 15 | 35 |
| Irongate: Garrison Hill | 35 | 15 | 15 | 35 |

In Coalport the Vanguard sits above the Alliance because the Vanguard recruits in industrial towns (§16.1); Ashford is the mirror. The Alliance's home has the Collective as the stronger rival for the same reason.

**Residence (slice 4).** `residence { cityId, districtId?, since }` is where you vote and stand, whose paper you read first, which Party orders you get and whose Issues lead your paper; it starts as the home city, and `homeCityId` keeps meaning the faction's home (the Ambition, *Fired up*). **Moving:** Rank 2 or above, standing in the district (or at home, for the way back), one tap (**the button reads *Live here · 500 Iron***, the sheet *Live in Eastside · 500 Iron*, the stamp *Moved in*; review 4: *Register* was a rules word, and the card's why is now said in words: *vote and stand here, and your orders come from here*) and a sheet that lists the consequences, **500 Iron both ways, seven days between moves** (a residence lasts at least one full council cycle). **What changes:** you vote in the district from the first election whose polls open after you registered; you may stand there from the next nominations (Rank 3, *Known* in Irongate, two endorsements from Irongate members of your faction); a candidacy **filed** at home (nominations still open) is withdrawn at the move (the deposit stays with the branch), **a member whose name is already on a ballot cannot move until the result** (below), and a home council seat is **vacated** at the move and filled by the branch's next NPC (the term is not completed); Party orders come from the capital rotation from the next City Day; the Herald is your paper. **What stays:** the job with its rules (full pay from anywhere; a capital job is a switch, and rarely worth one), Local Standing in every city, Iron, XP, Level, FXP, Rank, PC, items, the Ambition, endorsements given. **Residence has no rent** (§18.1). **Lodgings in Irongate** (review 4: a ***Lodgings*** card at **Tram Junction**, no longer a row of the residence card, said as *A bed on the tram line · 7 nights · 100 Iron · Rested banks higher while you have it: up to 250 instead of 200*, button *Take a bed*; `docs/design/review-4-answers.md` §9.3) are optional for anyone in the city: 100 Iron for 7 City Days, Rested cap +50 while it runs (the pool keeps its value after), one at a time, **renewable: a renewal adds seven nights to the end of the room** (never a restart; 3 Oct 2026, QA m5), offered while seven or fewer nights remain, so at most fourteen are ever paid for; prepaid like a bodyguard contract; half price under the Evictions Issue. **Moving between two districts** is a move like any other (500 Iron, seven days; a candidacy filed in the old district is withdrawn and a seat held there is vacated, as at home; the ballot rule below applies). **The Rested cap follows the residence** (§6.3): 200 + the residence city's rule and Issue effects + the room, wherever the player is. **A candidate on a ballot stays put (3 Oct 2026, QA M2).** While the member's name is on a ballot (polls open) where they live, home or district, a move is **refused** (`ON_BALLOT`) and the residence card says so and names the day: *You're a candidate in Coalport until the result · you can move from Sunday* (the count day). Nothing is struck, no vote is lost, and no paper prints a seat won by someone who has left. Chosen over striking the name (votes cast for it would be lost) and over letting it stand with any seat passing to the branch (Appendix C #61). **Slice 7:** Clearwater is a residence like a district (Rank 2, 500 Iron, seven days between moves, the ballot rule; the vote from the first election that opens after registering; a Clearwater rotation of Party orders) with **lodgings on the capital's terms** (a *Lodgings* card at **the Rows**; 100 Iron, seven nights, +50 Rested cap, renewable; half price under *Rents in the Rows*); `{hq}` reads *the lake branch*; Clearwater is **one map** like a home city (§14.13, review 4).

**The one exception:** a rare **Season Twist**, *The Upset* (§22.3), where for one season a home city really can be contested. It is announced a week ahead and applies equally to everyone.

### 14.12 Hostile ground: rival home cities (new)

A player can travel to a rival faction's home city and act there. It is the most dangerous place in the game and pays the best.

**Danger by city:**

| Where | Journey | Tier-1 actions | Tier-2 missions | Heat gain |
|---|---|---|---|---|
| Your home city | Safe | No encounters | Normal | Normal |
| A battleground | Occasional event | No encounters | Normal encounter chance | Normal |
| **A rival home city** | **Always an event** | **10–20 % encounter** | **Encounter chance ×2** | **×2** |

**Journey events on the way in** (the hostile-ground deck):

| Event | Choices |
|---|---|
| **Checkpoint** | Show papers (Heat and record checked) · bluff (CHA) · forged papers · pay |
| **Informer in the carriage** | Lose him (AGI) · feed him false information (INT, and you gain a Dossier entry) · ignore him and arrive *Watched* (+10 % encounters for the day) |
| **Your name is on a list** (high Heat only) | Get off a stop early and walk in · risk the station |
| **A friendly conductor** | He warns you which platform is watched, or passes you a local contact |

**Encounters in the city** interrupt a result as a popup. Most are not fights:

| Encounter | Choices |
|---|---|
| **Police stop** | Papers · bribe · bluff (CHA) · run (AGI) |
| **You've been recognised** | Walk away calmly · talk your way out · lose them in the crowd |
| **Local toughs** | Fight (STR) · flee (AGI) · pay them off |
| **A disillusioned local** (opportunity) | Recruit them for your faction (FXP) · turn them into an informant (a Dossier source) |
| **A leaked document** (opportunity) | Take it (+Heat, rare intel) · leave it |

**Fame is dangerous.** The chance of being *recognised* grows with your Legacy and any office you hold. A new player walks through Duskwall unnoticed; a sitting councillor is spotted at the station. That makes going undercover a late-game skill:
- **Plain clothes.** Low CHA is good here: swap the suit for work clothes and you blend in.
- **Forged papers** (a utility item).
- **Safehouses.** Your faction's underground cell in each rival home city (Rank 3+): Heat cools there and your odds improve.
- **Bodyguards and night travel**: fewer checkpoints, but the risk of curfew.

**Rewards behind the lines:**
- **+50 % Faction XP** on all actions there.
- **Morale damage**: actions there lower the rival faction's home morale, and so its national score.
- **Missions you can only do there**, such as stealing a rival party's membership rolls, or photographing a minister meeting the wrong people. These feed exposés (§10.4).
- **Rare Dossier entries** on rival officials.

**If it goes wrong:**
- **Arrested**: jail in *their* city, with longer sentences and double bail.
- **Deported**: put on the next train home, with no travel to that city for 24 h.
- **Hospital** if you lose a fight, as anywhere.

You can't live or stand for office in a rival home city.

**Slice 5 (the player reads it as *rival ground*; `docs/design/slice-5-risk.md` §11).** Rival home cities are **open from Level 10** with the train, with no further gate; the nation card says *Rival ground* and what it means, and the plate's kicker says it again. What differs there, every item a ticket tag before the tap: **+4 difficulty** on every check; **×1 only** (no ×3: every tap is its own risk); **a 15 % run-in on every tier-1 tap** (a Run or a loss drops the row to Partial); mission run-ins **×2**; Heat **×2**; the caught base **×2**; **Faction XP +50 %** on every action and mission (**+75 % while the city is in Unrest**), a line of its own; opinion drawn **from the home faction** (§14.2's rule for actions against a rival) and **capped at 2 points a day per city** (§14.11), a mission keeping its named target (capped only when that target is the home faction; `slice-5-fixes.md` §10); no residence, no standing, no backing; **the orders cannot be done there**; **the home paper** is delivered, with a desk line; jobs are there and pointless. **The journey in always carries a card from the hostile deck**: *Papers, please* (a character's first time, always; *Show your papers* passes a Cool player with a clean record and writes down everyone else), *The informer*, *Your name is on a list* (whenever Heat is 50 or more at boarding) and *A friendly conductor*, at difficulty 14, never failing, with four new effects (Heat ±, the day flags **Watched** +10 % and **Warned** −10 % on run-ins in that city until the boundary, Party XP, XP); the way out is an ordinary journey. **The cells there**: the sentence ×1.5, bail ×2, and release is **deportation**: put on the train to the residence city (no fare, no card; Irongate for a capital resident) and **barred from that city for 24 hours**. The infirmary is as anywhere. **Not in slice 5:** plain clothes, forged papers, safehouses, bodyguards, night travel, recognition by fame and office, the Secret Police, and the opportunity encounters (the disillusioned local, the leaked document), which arrive with the Wardrobe, the Dossier and later slices.

**Slice 8 (pinned; `docs/design/slice-8-life.md` §3.6).** **Recognition** is added to every run-in roll on rival ground: worn **Charisma 20–29 +5, 30 and over +10, doubled at night** (§2.2's night: the last two hours of every six since review 5; it was 20:00–06:00 UTC); **the highest office held: councillor +5, Governor or Chair +10, deputy or President +15**; **+1 per 10 Legacy** (at most +5). **Plain clothes (worn Charisma under 10) remove the Charisma part and halve the office part**; nothing removes the Legacy part. The plate's kicker reads *Recognised here* and every ticket carries the tag; the journey screen to rival ground offers *Change into plain clothes*, one tap, in force at the station. **Papers:** *Show your papers* at a checkpoint and *Talk your way out* against the city police read the Papers slot: the party card as slice 5; **forged papers** turn *Show your papers* into a Charisma check at the card's difficulty 14 with +10 in place of the Cool-and-Clean gate, and give +10 % to *Talk your way through* and to *Talk your way out* against the police; the card's Partial with them in hand is the party card's (the name written down, +10 Heat, *Watched*; nothing is confiscated); **a press pass** passes a checkpoint as the party card does. A **recognised** visitor (recognition above 0) is counted for the home faction as *1 from another party*, never named (§16.2; Appendix C #63). Safehouses, bodyguards, night travel, the Secret Police and the opportunity encounters stay later.

**Review 5 (decided by the user 8 Oct 2026; `docs/design/review-5-answers.md` §10, §12 and §16.1).** **The header.** The plate on rival ground replaces its one pressure line with three: **the push bar** (*Pushed today · 0.7 of 2 points · the Collective 0.5 · the Alliance 0.2*, two colours against the cap; full: *The town has had enough today · more from tomorrow 01:00*), **the danger line** in the player's own risk word (*Risk here: Risky · every tap can bring a run-in · Heat counts double · the cells put you on the train home*; the band of their tier-1 run-in chance here today) and **the goal line** (*The goal: Unrest. Under 60 % the Vanguard's branch drops everything to win the town back, its deputies go quiet, and your work here pays three quarters more. 11.4 points to go · your party has pushed 4.2 this week.*; in Unrest: *hold it*). A home city's lead never flips (the 50 floor), so the stake is the state, never the lead. **Night patrols**, only on rival ground and only at night (§2.2's window), never touching an absent player: **while acting**, the tier-1 run-in base is **25** (not 15) and a mission's run-in gains **+10** after its ×2 (the 90 cap holds; the Curfew Order doubles on top), the ticket tagged *Night · patrols out*, the city police half of every patrol pool; **while present, a random *Patrol* stop** (the user asked for a chance, not a certainty): on a **read of the city view** at night on rival ground (not held, not in transit, not within ten minutes of arriving by train), **one roll per ten-minute bucket per city** (`floor(now ÷ 10 min)`, keyed with the character and the city, so a refresh never rolls twice) at **12 %, +5 at *Noticed*, +10 at *Hot* or *Wanted*, +10 *Watched*, −10 *Warned*, ×2 under the Curfew Order, kept 5–40**; **at most two stops a night per city** and **never within fifteen minutes of the last stop or of a run-in**; an act never rolls the patrol (an act rolls its run-in only). Expected: about 1.4 stops for a player reading through a whole night, one 12 % roll for a five-minute look-in. The card is the hostile deck's shape, difficulty 14, never failing, no Energy (*Show your papers* passes a Cool player with a clean record, else the name written down, Heat +10, *Watched*; *Talk your way past* on Charisma; *Slip down a side street* on Agility; *Let it pass*). It is a card, not a fight, and never sends anyone to the cells by itself; its Heat and *Watched* raise the next act's run-in, which is the chain. No patrol fires on a timer or with the app closed (§4.3 rules 1 and 5); none at home or in the battlegrounds. The help note `help.patrols`: *After dark on rival ground the streets are watched: every tap is likelier to bring a run-in, and now and then a patrol stops you just for being out. A stop is papers, a word or a side street, never a fight; your name taken means more Heat. Nothing you own is at risk, and nothing happens while you are away.*

### 14.13 Quarters: how a city is laid out on the map (new, 1 Oct 2026)

A city has to grow with the player and feel bigger than six pins. **The stitched model (the user's choice, 1 Oct 2026):** every city is **one big painted bird's-eye picture** (8,640 px; the capital 11,520; the nation 9,216), day and night, served as zoomable tiles, and a quarter is a **frame** on that picture (a rectangle in fractions of it), not an image of its own. Design: `docs/design/city-quarters.md` (the rule) and `docs/design/maps-v3-integration.md` (the pictures, the frames, the pins); the art brief `docs/art/map-brief.md` is the retired pen-and-ink plan.

**Review 4 (6 Oct 2026; the user reversed slice 5's home-city overview): a home city is one map, and only Irongate has districts.** Coalport, Duskwall, Ashford and (slice 7) Clearwater show **the whole picture with every surveyed place as a pin**: open places as today; **locked places as greyed pins with a lock mark**, and on the Places list and the pin's own short sheet one note, *Opens at Level 6* / *Opens with a later edition* (the quarter's name, its blurb, *Level 6 opens it; you are Level {n}*). **No quarter outlines, no quarter bar, no overview, no quarter names on the picture, no teaser sheet** in a home city. A quarter remains **the Level gate of a group of places** in content (`quarters[].level`, `name`, `blurb`; frames and outlines are dropped for home cities): **The Places list is *What's here* (review 5, 8 Oct 2026; `docs/design/review-5-answers.md` §9):** the plate's button reads *What's here* and its sheet carries, above the places, **the city's two Issues** (who leads; tap → the first tagged place with its ticket highlighted), **the missions the player can start today** (every gate but Energy; the odds and risk words; a line for the rest, *2 more from Level 8 · 3 from Rank 3*) and **the orders here** (or the collapsed line away), in every city alike; then the places, which in a home city are the Places list **grouped by quarter** with the group's lock line (*THE HARBOUR · opens at Level 6*), which is the one place the name is read. The map opens on the last pin viewed in the city, on **the Town Hall's pin on arrival by train**, and on the HQ's pin with the favour's sheet open for a new character (§7.5); at rest it is zoomed to the covering scale around that pin, with free zoom and drag as always. The Level gates (1 / 6 / 10), "a quarter never closes", and the opening of the place the game sends you to are unchanged. **In the bullets below, everything about frames, outlines, overviews, plates, the quarter bar and the teaser in a home city is superseded; the capital's districts keep all of it (§14.9).** Strings: `docs/design/review-4-answers.md` §21.

- **The chain is nation → city → quarter → place.** A quarter is a frame on the city's picture holding **four to six places**; the **overview** is the same picture zoomed out to the whole town, carrying the **quarter plates** (name, one line, the lock if any), and tapping a plate zooms into that quarter's frame. Outside a frame is the rest of the town, drawn in full, never a blank: the neighbouring quarters are simply there. In the capital the five districts **are** the quarters (§14.9), each a frame on the capital's picture: the political unit and the map unit coincide there, and only there. Everywhere else a quarter is a map unit and never a political one: a home city keeps one opinion meter, one council, one set of Party orders and Issues however many quarters it has.
- **Pins are fractions of the city picture**, the same for every quarter, and every place's pin is its surveyed pin in `packages/content/src/data/mapPins.ts` (the transcription of the approved survey of the painted art, with the quarter or district each place is painted in; a content test holds the two in step). A place becomes playable by copying its survey pin into a location, never by moving art.
- **A city opens into the quarter you are in:** the last quarter viewed in that city; the station's quarter, with the station pin selected, on arrival by train; the first quarter, with the first pin's sheet open (§7.5), for a new character. A session starts on pins, never on an overview. The map header reads *Coalport · The Mill*; tapping the city's name opens the overview; a quarter bar (the tram bar of §14.9) hops between quarters in one tap. Moving between quarters is instant, free and has no rule effect: Energy actions need only the city you are in, and which quarter you are in is not a server fact (the capital's districts included: a capital action or a registration names its district in the request, and the client remembers the open district for the session, the station district on arrival).
- **Quarters open by Level, per character:** the first at Level 1, the second at **Level 6**, the third at **Level 10**, the train's level, so that a city's station quarter, once built, opens with the train and a journey can start at a pin. **The home cities' station quarters are not in slice 4** (the user decided, 2 Oct 2026): slice 4 boards from the nation map and, in Irongate, from Central Station; the station quarters (Coalport's Sidings first) are a later content addendum. Any later quarter's level is set when it is designed, and the gate is always a Level: not Rank (a visitor of another faction must see the same city), not a story (Ambitions are per faction), never the clock (pillar 7). Rank and story gate tickets inside a quarter, as today. A quarter also opens the moment the game sends you to a place in it (admitted to the infirmary, held in the cells, §19), whatever your Level. Anyone who can take the train is Level 10, so a visitor sees every quarter of every city; hostile-ground rules (§14.12) apply to actions, not maps.
- **A locked quarter is a teaser.** It is drawn in full on the picture like every other part of the town (the art is neutral; the lock is an interface overlay on its frame), its plate is tappable and shows the quarter's name, one line and *Opens at Level 6*; there is no Enter button and nothing inside it is reachable. Until the slice that builds a quarter has shipped, the line reads *Opens with a later edition* whatever the player's Level. Opening a quarter pays nothing and costs nothing: it is a reveal, not a reward. **A quarter never closes again** and Level never falls, so absence costs nothing here (§4.3).
- **Growth.** The painted pictures already hold every long-run place (the survey has 89 pins over the five cities; the content has 18 playable), so a place is added by content alone, never by repainting. Past six places a quarter splits in two frames. A home city's long run is 12–15 places in three quarters; the capital's 29 are all painted, and a district that outgrows six places gets a second frame under one district meter (Appendix C #41). **Coalport (the test):** The Mill (Level 1: Mill Gate, Market Row, Union Hall, Foundry Row, Harbour Quays, The Anchor) · The Harbour (Level 6, slice 5: The Shipyard, Customs House, The Infirmary, Harbour Police, The Far Bank) · The Sidings (Level 10, a later content addendum after slice 4: Coalport Station, Coal Yards, Tram Depot, St Barbara's).
- **The second quarters (slice 5; `docs/design/slice-5-risk.md` §2).** **Coalport's Harbour** (frame 0.11, 0.40, 0.99, 0.89: the Shipyard, Customs House, the Infirmary, Harbour Police, the Far Bank), **Duskwall's Pass** (0.70, 0.00, 0.94, 0.74: Frontier Checkpoint, Mountain Inn, Sawmill, Lock-up, Infirmary) and **Ashford's Wharf** (0.14, 0.41, 0.98, 0.88: the Wharf, Brewery, Cattle Market, County Infirmary, Police Station), each the survey pins' box grown by 0.06, open at **Level 6**; fifteen places with 35 tier-1 actions; the infirmaries and the police stations are ordinary places with ordinary tickets until the game sends a player to them (§19). ~~**A home city with two or more quarters gets the capital's overview**: the picture zoomed out with its quarters as **outlines and names** (the district lock's pattern), a tap zooming in and holding the player there, a **quarter bar** (*The Mill · The Harbour · The Sidings*) and a *Quarters* list; a locked quarter's outline is drawn in full with its lock line and opens a teaser sheet. The third quarters are teasers (*Opens with a later edition*) with outlines of their own.~~ **Withdrawn by review 4 (6 Oct 2026):** a home city is one map with locked places as greyed pins (the paragraph at the head of this section); the fifteen places and 35 actions stand.
- **The map fills the screen, and the player may zoom it.** At rest a city's map is zoomed in far enough that the art covers the whole screen (never dark bands past its edge). The player may drag it to look around and (review 3, 2 Oct 2026) **zoom it freely**: pinch and double-tap on a phone, the wheel, a trackpad or + / − buttons on a desktop, between two limits a player can see the reason for: **no further in than the painting's finest detail** (the top tile level at its real size, so the art is never blurry) and **no further out than the scale that still fills the screen** (never a dark band). Zooming has no rule effect and is remembered for the session; the same limits and gestures apply to **the nation map, the capital's district overview and every district view** (3 Oct 2026), except that a district view zooms no further out than the district's own view and drags only to its frame plus 10 % (the user's district lock, 3 Oct 2026); a tap on a pin still zooms into that place; a **Places** list names every place on the map in pin order (the user asked for this on 2 Oct 2026, replacing review 2's fully fixed map). **Opening a place is one movement:** the zoom to the pin, the dim over the map and the place sheet ease in together (250–350 ms, one curve) and out in reverse when it closes; under *reduce motion* the sheet and the dim fade in about 120 ms with no movement. Limits and motion: `docs/design/review-3-answers.md` §1–§2; Appendix C #45.
- **Distance.** The nation map draws the cities small and the lines long, with halts, villages and stations between them as scenery. Journey times are unchanged (§14.10; Appendix C #8, closed: the user kept 12 / 12 / 15 / 25 on 2 Oct 2026).

---

## 15. The Political Engine

This is what the game is about. The rule of v3.1: **politics runs on a calendar, there's always a government, and every rank above 1 has something political to do.**

### 15.1 Offices

| Office | Seats | Term | Elected by | Who can stand (the ladder) | Powers |
|---|---|---|---|---|---|
| **City Councillor** | 7 per city, 10 in Irongate (2 per district), 7 in Clearwater (slice 7): 45 | 5 days, from one count to the next | Residents of that city or district (Rank 2+) | Rank 3 · resident · *Known* Local Standing there (§13.4) · endorsed by 2 faction members (the branch's endorsement counts, §15.3) · not a sitting councillor of that city | **Move** one ordinance a term (20 PC) and **vote** on the order paper (§15.3). Stipend 10 PC and 20 FXP a day. A term counts as completed if held to the count |
| **Governor** (Mayor, in Irongate) | 1 per city (5) | 5 days, with the council | **At the count** (slice 7): the player councillor with the highest total who has **completed a council term** anywhere; in the capital and Clearwater, among the **largest bloc's** councillors; none qualifying → the bloc's top **local** councillor holds the chair, marked *Local*, draws nothing and sets nothing | A completed council term; nothing to file | **The Governor's rule**: item 1 of the order paper from the menu, at no cost; local councillors with no player lead vote for it (§15.3) · **the Address** once a term: +50 momentum for the party on one of the city's Issues, attributed to the Governor · the name on the plate and the paper. **Pay 20 PC and 30 FXP a day** on top of the seat's. Away: the rule defaults to the Chair's; the Address is lost |
| **Faction Chair** | 1 per faction (3) | 28 days (term day 14 → 14) | The faction's ballot, Rank 2+ members, **the secretary always on it** (§15.4) | Rank 4 · a completed council term · 14 days in faction since a switch · 25 PC deposit · two backers | **Sets the Party orders** (standing orders, one push with the party's target; §13.7) · **the party line** on every bill and **the party's rule** in every council · **calls events anywhere** and sets the fixtures · the Officers channel. **Pay 20 PC and 40 FXP a day.** Away: the standing orders repeat, the line is a free vote, the fixtures rotate, the secretary signs |
| **Deputy** (Parliament) | 60 | 28 days (term day 0 → 0) | The national count: the party's seats by D'Hondt on the national scores go down its list (§15.5) | Rank 5 · **a completed term as Governor or Mayor, or three completed council terms** · 14 days · 25 PC to go on the list | **Vote on every bill** (one tap, For or Against) · **put one law to Parliament a term** (50 PC) · table a vote to remove the President (50 PC). **Pay 5 PC and 30 FXP a day.** Away: the local deputies follow the chain (§15.6); the bill's slot is lost |
| **President** | 1 | 28 days; **at most two in a row** | The national count: the highest party score (§15.5) | Rank 6 · **a completed term as deputy** · 14 days · won the party's pick · 100 PC | **Put a law to Parliament every week**, free, in a slot of its own · **the veto**, once a term (40 of 60 vote it through anyway) · **the Address**, once a term (+100 momentum on one Issue in one city) · the front page, the title, Legacy 40. **Pay 50 PC and 60 FXP a day.** Away: the week's slot is empty; the veto and the Address are lost |
| *Minister*, *Speaker* | — | — | — | — | **Post-MVP** (§15.7, §25) |

That's **about 108 offices every term**. With council terms of 5 days, **45 council seats turn over 5–6 times per term.** **Slice 7 pins one office at the top, the President** (the first draft's Chancellor, with its 55 % line and coalition rule, is removed: Parliament's majority rule is the coalition rule, §15.6; Appendix C #64). **Several offices at once are allowed** in the MVP (a Chair may sit on a council; a deputy may hold a home seat; the President holds no seat in Parliament); the stipends add and the 1,000 cap is the only limit (Appendix C #65). A term is **completed** when held to its count; a seat vacated by a move, a dissolved council (§15.9) or a removal is not. Nothing an absent holder must do blocks anyone else: every duty has a default.

**The ladder of office.** Like the Roman *cursus honorum*, **you can't skip a rung**: each office needs a completed term in the office below it. Rank gives the right to stand; the ladder gives the experience. The result:
- a player's **first seat comes in week 2 at the earliest**, and at scale it's a contest, not a certainty (a faction may have 20 players wanting 2 seats in a district);
- **Governor or Mayor** comes in month 2, **Parliament** at the end of season 1, and the **Presidency** from season 2 for most players;
- **every rung is a new kind of play**: voting on ordinances, then choosing them, then writing national law, then running the country;
- **power is never permanent**: terms end and seats must be won again, so the political game never "finishes".

### 15.2 Integrity rules

- One account per person. **Linked accounts** (one person's accounts, found by the device or by the network's pattern; never two people who are online together on one connection) **count once** in every election and every backing. **Slice 9 (pinned; `docs/design/slice-9-launch.md` §4, settled §17):** one character per account; the email normalised at sign-up; **at most two accounts from one device, three from one network a day**, the only refusals a player ever sees. Two accounts are **linked** when they share a device, or share a network on three days in fourteen with **interleaving** sessions and **no overlap** (two accounts that are online together on one network are a household, not a link; a network with more than fifty accounts in a day is a shared one and links nobody). A moderator's unlinking is sticky for the evidence unlinked; only a new kind re-links. A linked set's **ballots, backings, petition signatures and hands count once** (the earliest stands; the rest are set aside at the count), **never refused at the tap and never with a message**; posting bail for a linked account pays no Party XP (and bail pays Party XP at most three times a day for anyone); a linked visit heals nothing. Nothing else is touched: Energy, Iron, XP, orders, missions, Favour and the Dossier are per account and cannot be transferred (no Iron moves between accounts anywhere in the MVP).
- National results stay **provisional for 24 h** while the audit runs (slice 7 prints the count on term day 27 *to be confirmed tomorrow* and seats the government at day 0). **Slice 9 (pinned):** at the count the audit **runs itself** (links recomputed, linked sets' ballots set aside, bursts and backing rings noted) and the provisional result already carries the automatic set-asides; during the day a moderator may **confirm, set aside a noted set, unlink, or order a recount** of any council, district or Clearwater count made at that day's boundary (settled: the calendar's reading of "the last 24 hours"); **at day 0 the count confirms itself** if nobody acted. **Council results are final at the count**; a recount within 24 hours applies the set-asides, and a seat that changes hands passes at once (*after a recount* in the count view; the loser's term is not completed; the rule in force stands). The only public sign of any of this is one aggregate line: *{n} votes set aside after the audit.*
- **Tenure applies after a faction switch** (§23.4): a member who switched needs **7 days** in the new faction to vote or endorse and **14 days** to stand. A new member votes the day they make Rank 2 (§5.2). National candidates need 14 days in their faction in every case.
- Switching faction (paid token) vacates all offices, resets tenure, and halves your PC.
- Nothing political is for sale: no votes, PC, influence, offices or endorsements for money.

### 15.3 City Councils

- **Calendar (pinned, slice 3):** each city runs a **five-day cycle from the day key**, `cycleDay = (dayKey − offset) mod 5`, with offsets **Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4**. Cycle days **0–1: nominations** (declare, withdraw, endorse); **2–4: polls open**; **the count at the boundary** into the next day 0, when the new council is seated. No phase closes at a clock time; every window is at least one full City Day; polls are open somewhere every day. The count and the division are the only scheduled world events. The phase is a pure function of the day key, so nothing waits on a job.
- **Nominations:** a candidacy (Rank 3, resident, *Known*, not a sitting councillor there) costs a **10 PC deposit**, spent when the name is printed, returned if the candidacy is **struck** at the close of nominations for want of **two endorsements**. Endorsements: Rank 2+ residents, 10 PC, one per member per cycle in each city, public, irrevocable (spent even if the candidate withdraws); **the branch's endorsement** goes to any filed candidate on any day of the window on which the candidacy is filed and all three Party orders are done, whichever came first (once per candidacy); where fewer than three other eligible endorsers (resident Rank 2+ members active in the last seven days) live in the city, the branch's endorsement counts as two. A candidate may **withdraw** before polls open (the deposit stays with the branch); after that the name is on the ballot and the candidate cannot move residence until the result (§14.11, `ON_BALLOT`). On the morning the polls open every candidate's paper says whether the name is on the ballot or was struck. Candidates pick one of three platform lines the faction offers (content, no effect).
- **The ballot:** single choice, one tap, **secret** (no running totals during polling; every total printed after the count) and **final**. A candidate may vote for themselves; a member may vote for an NPC candidate.
- **The count in home cities** (§14.11): all 7 seats belong to the home faction. Each candidate's **total = ward vote + 3 × endorsements + members' votes**, where the **ward vote** is the NPC electorate: a player's Local Standing Successes in the city ÷ 5 (rounded down), **read at the count**, so work during the polls counts; an NPC candidate's fixed profile with a seeded jitter of ±2 per cycle, drawn when nominations open; at most five endorsements count; members' votes are one each. Seats go to the seven highest totals; **ties** by members' votes, then endorsements (all of them), then Standing Successes (an NPC's is `profile × 5`, without the jitter), then earlier filing (NPCs after every player, in profile order). A seat lost on the tie-break is printed as such, not as "by 0". **Turnout** is *voters of eligible*, where eligible is every resident Rank 2+ member active in the last seven days at the count (the same roll as the small-branch rule). Rivals can't live or stand there. The result is printed in the city's paper (§3.3) and is final.
- **Seat allocation in battlegrounds (pinned, slice 4).** In Irongate the count runs separately in each district for its **two seats**, every district on the same night. **Who votes:** Rank 2+ residents of the district (resident when its polls opened), **any faction, for any name on the district's ballot**. **Who stands:** Rank 3, resident of the district, *Known* in Irongate, two endorsements from Rank 2+ Irongate residents of the same faction (any district; one per member per cycle in the city), the slice-3 deposit and striking rules. For each faction: `ballotShare` = its candidates' ballots ÷ all ballots (0 if none); `opinionShare` = its district share ÷ the three faction shares; the **turnout weight** `w = 50 × min(1, ballots ÷ 10)` (the ballot half is worth its full 50 % from ten ballots, five points per ballot below, the rest of the weight staying with opinion); **score = w × ballotShare + (100 − w) × opinionShare**. **Two seats by D'Hondt**: the first to the highest score, the second to the highest of score ÷ (seats + 1), so the leader takes both only with more than twice the runner-up. **Ties between factions:** more ballots, then higher opinion share, then a seeded draw for the cycle (*on the returning officer's draw*). **Within a faction** seats go to its candidates by the home-city total (ward vote + 3 × endorsements + members' votes, same ties); NPC candidates fill each faction's list to two names (§15.10); a faction with no candidate forfeits to the next by D'Hondt. Ballots and seats do not move a battleground's opinion. Worked examples: `docs/design/slice-4-battleground.md` §8.2.
- **The Irongate order paper:** each faction with at least one seat puts its branch's motion on the paper at no cost, in order of seats; then up to three proposals (20 PC) from the Irongate menu (the ten below plus **Tram Subsidy**: tickets from Irongate −50 %, floor 5). NPC councillors vote for the item with most votes from **player councillors of their own faction** (ties to their branch's motion, then the earliest moved; none: their branch's motion); **passes with six or more of ten**; otherwise the council rises without a motion. The ordinance applies to every district.
- **The order paper and the division:** the new council sits from the count. On cycle days 0–1 the order paper holds **the branch's motion** (the party secretary's, at no cost: Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*) plus up to **three proposals** by councillors (**20 PC**, one per councillor per term, first come; an item already on the paper cannot be moved again, the ordinance in force can be renewed). Each councillor casts **one vote** for one item or *Against all*, public in the chamber, final. At the boundary into day 2 the council **divides**: NPC councillors vote for the item with most player-councillor votes (ties to the branch's motion, then the earliest moved; the branch's motion if no player voted for an item, *Against all* being a recorded vote and not a preference they follow, so a lone councillor cannot leave the city without an ordinance; they abstain during Unrest, §14.11); the item with most votes **passes with four or more of seven**, otherwise the council rises without a motion. A passed ordinance is **in force from that boundary for five City Days** and replaces the one before: **one ordinance per city at a time**, expiring by the calendar. Ordinances apply to **every** player in the city, regardless of faction. **The chain for a local councillor (slice 7, pinned):** the item with most votes from the faction's player councillors on that council → **the Governor's rule** (added as item 1 ahead of the party's item, which stays, so no cast vote is lost; when the Governor is of their faction) → **the Chair's rule** for the city (set by a player Chair, §15.4) → the secretary's (the branch's motion); **four or more player councillors of a home council voting *None of these* make the locals abstain**, so the council rises without a rule (Appendix C #26, closed); below four the party's rule passes as before. **Clearwater (slice 7):** seven seats, three-way, offset 4; the count is the district count with **seven seats by D'Hondt** on the three scores (`w` at ten ballots), each party's seats to its candidates by the home total, local candidates filling each party's list to **three names**; the order paper is the capital's (the Governor's rule, then each seated bloc's party rule in seat order, then three proposals); **passes with four of seven**; the hall is **the Casino** (`council.hall` 0.33, 0.62: *CLEARWATER COUNCIL · THE CASINO*).

**What the player sees (review 2).** An **Election card** on the city screen, under the plate (folding with it on phones), and the same row in the paper (§3.3), is where the election lives: the kicker *ELECTION · {CITY} COUNCIL*, **the phase in plain words, what the player can do right now, a countdown, and one button** (*See who's standing* · *Stand for the council · 10 Political Capital* · *Vote now* · *See the result* · *Vote on the rule*). The words are §1.5's: *candidates are putting their names in* (nominations), *voting is open* (polls open), *the result* (the count), *backers* (endorsements), *you're standing* (a candidacy), *local* (an NPC), *local support* (the ward vote), *a council rule* (an ordinance), *up for a vote* (the order paper). **Every political act ends in a modal that says what happened and what comes next** (*Next: the result, Sunday morning.*), and the card changes the moment the modal closes. The candidates are reachable every day of the cycle and the last result all cycle. On the morning a player makes Rank 2 the card carries a one-line note, once: *Coalport elects its council every five days. You can vote now; Organisers who are Known here can stand.* States and strings: `docs/design/review-2-answers.md` §4; screens: `docs/design/slice-3-screens.md`.

**The election screens stand on the council's hall (review 3).** Each home city names the building its council sits in (`council.hall`, a point on the city picture in fractions like a pin: Coalport's domed Town Hall on the river between the Union Hall and the Mill Gate at 0.525, 0.19; Duskwall's tower hall on the Customs Market below the fortress at 0.555, 0.55; Ashford's clock-tower hall by the river bridge at 0.805, 0.275; each called *the Town Hall*). Who's standing, the vote, the result and the council open on a crop of the painted map at that point, by day or night, built as a result modal's map crop is, with *{City} Council · the Town Hall* over it. It is a backdrop and a name, not a location. **Who the candidates are is said on every list:** players first under *Players standing* (or *No player has put their name in yet. The local candidates below fill the list.*), then *Local candidates* with one line that never leaves: *Townspeople run by the game. They fill the list so there is always an election; you can vote for them, and a player with enough support beats them.*, and *The last seat is usually close: a few votes decide it.* **How seats are decided is said in words, never as a formula:** *Seven seats. The seven with the most support take them. Support is the town's own vote for a candidate (their reputation here), plus their backers, plus members' votes.*; the result's table keeps its columns (an election is a count) and the same sentence under it with the tie order; the stand card says what a seat gives (*five days on the council: a vote on the town's rule, and 10 Political Capital and 20 Party XP a day*). A five-line ***How elections work*** note (the cycle, who the candidates are, who votes and who stands, how seats are decided, what a seat gives) is one tap from the card's kicker and from a link on every election screen. Texts: `docs/design/review-3-answers.md` §6.

**The Town Hall is a place (review 4, 6 Oct 2026; `docs/design/review-4-answers.md` §10–§11).** The council's hall is **a location on every city map**, kind `town-hall` (§13.5), **open from Level 1** whatever quarter it stands in: `coalport.town-hall` (0.525, 0.19), `duskwall.town-hall` (0.555, 0.55), `ashford.town-hall` (0.805, 0.275; the survey's teaser pin, now open), `irongate.city-hall` (0.57, 0.345; §14.9), and in Clearwater the Casino's own sheet; `council.hall` is read from the location's pin; **each hall is appended last in its city's list** (no pin renumbers) and listed at the end of the first, open group of the Places list whatever quarter it is painted in. Each has **one tier-1 ticket**, *Sit in the public gallery* (*Watch and listen*, Intelligence, 6 Energy, the city's tier-1 difficulty: 8 at home, 10 in Irongate, §8.4), and **a sheet that is the public face of the council**, in this order: the ticket · ***Your desk*** for a sitting councillor (the order paper with the vote, *Put forward a rule · 20 Political Capital*, and a *Next* line by cycle day: *the council votes tomorrow 01:00* / *{rule} runs until Sunday; candidates put their names in from Thursday*) · ***The rule in force*** (its name, **its effect in plain words**, the days left: *Reading Room Grant · studying costs a fifth less Energy everywhere in Coalport · 3 days left*) · ***The council*** as rows with *Player · Organiser* or *Local candidate · townspeople run by the game* under each name · ***Up for a vote*** read-only for everyone else, with the next vote's moment · ***This week's Issues*** · the Election card. `/council` opens the same blocks. **The rule is always visible in the city:** the plate's line reads the effect, not only the name (*Council rule: Reading Room Grant · studying costs a fifth less · 3 days left*; every ordinance carries **`plainLine`** ≤ 60 (settled with the architect, 6 Oct 2026: `effectLine` is the existing caps line with numbers and stays; the plate and the hall both print `plainLine`): *jobs pay a tenth more* · *every day at the job counts double* · *posters move opinion more* · *speeches cost 2 Energy less* · *studying costs a fifth less* · *Rested banks to 250* · *talking to voters comes off more often* · *every win counts twice for your reputation* · *actions pay a quarter more Iron, jobs a quarter less* · *party work pays a quarter more Party XP* · *trains from here at half price*), and a tap on it opens the hall. **Winning a seat shows a *What now* card** once per term, on the front page and the first hall visit: *1. Put a rule forward (today or tomorrow, 20 Political Capital), or back one on the paper. 2. Vote on the rule before the council votes at {tomorrow 01:00}; four of seven passes it for five days. 3. Draw your pay: 10 Political Capital and 20 Party XP every morning you hold the seat, present or not.* Button *To your desk at the Town Hall*.

**The home-city menu (MVP, slice 3).** Ten ordinances with bounded effects on systems that exist; the bound is the value, since the menu is closed. Bonus lines appear in the result modal named after the ordinance; cost changes show on the ticket. **A cost ordinance changes the cost only**: rewards stay on the content Energy (Reading Room training at INT 12 costs 35 and still pays 99 XP).

| Ordinance | Effect in the city (for 5 days) |
|---|---|
| Public Works Order | Job pay +10 % (a line of its own on the unmodified pay, beside seniority's, §9.1) |
| **Long Service Order** (was *Shift Hours Order*; review 1) | **Seniority builds two days a day** (the +20 % cap is unchanged): a new job reaches the full rate in five days. Line: *The council backs long service: every day at the job counts double towards the rate.* |
| Street Permits | Propaganda opinion swing +15 % |
| Rally Permits | Speech actions −2 Energy (rewards unchanged) |
| Reading Room Grant | Training Energy −20 % (rounded, halves up) |
| Rest Day Order | Rested cap +50 (the pool keeps its value when the order expires) |
| Open Doors | Canvass actions +4 % success chance (a ticket tag, *Open Doors · better odds*; the 95 % clamp applies) |
| **Street Register** (was *Ward Register*; review 2) | Local Standing: every Success counts two |
| **Street Fund** (was *Ward Fund*; review 2) | Iron from checked actions +25 %; job pay −25 % |
| Public Meetings Order | Faction XP +25 % on actions in the city (a separate line on base FXP; stacks with a Directive's +25 % as two lines) |

The earlier list (Police Patrols, Rent Control, Market Tax, Clinic Funding, Tram Subsidy, Press Freedom / Licensing, Festival Permit, Curfew) returns, with the same bounds, in the slices that build the systems they touch: Heat and encounters (5), lodging and prices (8), tickets (4), exposés (8), social missions (5).

### 15.4 Faction Chair and Party Directives

- The **Faction Chair** is elected every 28 days by the faction's Rank 2+ members.
- Every City Day, the Chair sets up to **3 Party Directives** from a menu: canvass [city], address [Issue] in [city], gather intel in [city], support [event], turn out the vote in [city], disrupt [rival] in [city]. Each has a group target and a personal target.
- Members get **+25 % FXP on matching actions while the order is open** (on the action's base FXP, rounded per line, Partial included; never XP, Iron or opinion), **+20 FXP** the moment a personal target is reached, and **+5 PC** when all three are complete. The completing row gets the +25 %; nothing after it does, including later rows of the same ×3. The ticket tag reads *Party order 2 / 3 · +25 % Party XP* while open and *Order done* after. A completed order is a signed line in the result modal; the third completion opens the **orders-complete modal** in the secretary's voice (§13.7). This keeps Directives at about 30 % of daily FXP (`docs/economy.md` §10) whatever the player's volume.
- Directives **refresh at the 00:00 UTC boundary** (§2.2). Unfinished orders are gone; nothing is taken away and there is no catch-up.
- If the faction has no Chair, or the Chair sets nothing by 06:00, an **NPC party secretary** (§13.7) issues sensible defaults based on battlegrounds and Issues.
- **The secretary's daily fixture (slice 6, until a Chair exists and alongside members' own events).** At every City Day boundary the secretary calls **one Campaign Event per faction in its home city and one in Irongate** (the capital branch, signed by the same secretary): by the day key over *Canvass Drive · Rally · Poster Night* (`(dayKey + factionIndex) mod 3`), the capital's district `dayKey mod 5` (the three factions share the day's district), at the event's venue there; **open all day and resolved at the next boundary** by the city-day job, so no clock time is involved and the result is in the morning paper with the orders; withdrawal until 23:00 UTC. It is one of the city's three starts a day (§16.3). A Chair's faction-wide events replace nothing: the fixture stays as the floor.
- Directives do the tutorial's job: a new player always knows the most useful thing to do today.

**Slice 7 (pinned; `docs/design/slice-7-nation.md` §4).** **The election:** names in on term days 9–10 (Rank 4, a completed council term, 14 days in the faction since a switch, a **25 PC deposit** returned if struck; **two backers** by the close, Rank 2+ members, 10 PC, one per member per Chair election, public; the secretary backs a filed candidate who does the day's orders, counting double where fewer than three other eligible backers exist faction-wide); voting on days 11–13 (every Rank 2+ member, from anywhere, one tap, secret, final); the count at the boundary into day 14: **total = members' votes + 3 × backers** (at most five backers; ties by votes, backers, completed terms with a Governor term counting two, filing). **The secretary is always on the ballot** (*keep the orders as they are*, marked *run by the game*, votes only): a player must beat the branch's own administrator; with no player candidate there is no vote. The term runs to the next term's day 14; **pay 20 PC and 40 FXP** a day. **Powers:** the standing orders and the push (§13.7); **the party line** on every bill (For / Against / Free vote; the faction's local deputies follow the player deputies' majority, else the line, else the secretary's line, §15.6) and **the party's rule** per city (home, the capital, Clearwater; the locals' default, §15.3); **calling events in any open city from anywhere** (the §16.3 limits per city; no role taken) and **tomorrow's fixture** per branch (the type, and the district in the capital; default the rotation; it still resolves at the boundary); the **Officers** channel (Rank 4+). Away: the standing orders repeat, an unset line falls to the secretary's, the fixtures rotate; a change of Chair clears the standing orders, the rules and the fixtures. **A vote on the Chair:** automatic when the home city enters Unrest while a player Chair holds office (once per Chair per term), or by petition (Rank 3+, 10 PC, the greater of three and a quarter of active Rank 3+ members within two City Days; not in the Chair's first five or last three days; one per Chair per term); two full days, every Rank 2+ member, *Confidence* / *No confidence*; **removed when No confidence has two thirds of the votes cast and at least three *No confidence* votes**; the secretary acts until the next election; the term is not completed. Platform lines: design §4.6.

### 15.5 National elections

Pinned in slice 7 (`docs/design/slice-7-nation.md` §6); the first 3.1 draft's days 25–28, its 55 % line and its Chancellor are superseded.

- **Calendar (term days, §2):** **names in 19–20** · **the party's pick 21–22** · **voting and backing 23–26** · **the count at the boundary into 27**, printed *to be confirmed tomorrow* (§15.2) · **office from the next term's day 0**. The third term's count of a season is the **Season Election** (§22).
- **Names in.** For **President**: Rank 6 · a completed term as deputy · 14 days in the faction since a switch · not a sitting President in a second consecutive term · **100 PC** (returned only on a withdrawal before the party's pick opens) · **two pledges** from the law catalogue (printed on every ballot; a pledge is kept when that law passes during the term: a headline, and Legacy 10 each from slice 8) · a platform line. For **the party's list** (Parliament): Rank 5 · a completed term as Governor or Mayor, or three completed council terms · 14 days · **25 PC**. No backers are needed for either; nothing is required of a candidate afterwards.
- **The party's pick** (*the Acclamation* / *the Congress* / *the Convention*): each faction's Rank 2+ members choose its candidate for President, one tap, secret, final, from the faction's declared candidates **and the party's own figure** (§15.10), who is always on the ballot (*run by the game*); most votes wins (ties by completed terms, a Governor term counting two, then filing; backing opens after the pick); with no declared candidate the party's own figure stands without a vote.
- **The ballot:** every Rank 2+ player, from anywhere, **one of the three candidates for President**, any party, secret, final. **Backing:** Rank 2+ members, 10 PC, **one per member per term**, public, irrevocable, for their own party's candidate for President (**+1 to the party's score, at most +5**) or for one name on their party's list (it orders the list). The candidate's CHA and Legacy appeal (up to +5) arrives with the Wardrobe and Legacy (slice 8).
- **The party's score** (the 50 / 50 link that lets everyday work win elections): `score_f = w × ballotShare_f + (100 − w) × controlShare_f + min(5, backers_f)`, where `ballotShare_f` is the ballots for the party's candidate ÷ all ballots, `controlShare_f` its National Control ÷ the three parties' (§14.8; Neutral excluded), and the **turnout weight** `w = 50 × min(1, ballots ÷ 30)` (the ballot half is worth its full 50 from **thirty ballots** across the republic, 5⁄3 of a point per ballot below: the capital's rule at three times the scale; Appendix C #2). The player reads it as *the party's score mixes its share of the votes with its share of who holds the republic, plus its backers*.
- **The President** is the candidate with the highest score (ties: more ballots, the higher control share, the term's seeded draw). **Parliament's sixty seats** go by **D'Hondt** on the three scores; each party's seats go down its **list**: its candidate for President first (if not elected), then its list candidates **by backers** (ties by completed terms, a Governor term counting two; then total Reputation wins; then filing), then its local deputies. At the baselines three scores of 33.3 split 20 / 20 / 20 and the draw names the President; ten Vanguard ballots and five Collective give 41.7 / 33.3 / 25.0 and **25 / 20 / 15**.
- **At most two consecutive terms** as President. **The President's powers** (§15.1): a law a week in its own slot (§15.6), the veto once a term, the Address once a term, **50 PC and 60 FXP** a day, Legacy 40. A party's own figure holding the office tables its party's preferred laws by the secretary's rule and uses no veto and no Address.
- **Bootstrap:** the seed installs the party's own figure of the faction that wins the seeded draw as President for term 0, sixty local deputies at 20 / 20 / 20, the secretaries as acting Chairs and a local Governor in every city, so there is a government on day one.

### 15.6 The Legislature

Pinned in slice 7 (`docs/design/slice-7-nation.md` §5; the player reads it as **Parliament**, sitting in the painted chamber).

- **Always sitting.** Sixty seats refreshed at every national count (§15.5), split by D'Hondt on the national scores; a party's seats go down its list and the rest are **local deputies** (eight named per party, then counted; §15.10). The ratio is shown openly.
- **The order paper holds at most three bills, plus the President's.** A bill is one law from the catalogue (§15.8), a bill **to strike out** a law in force, or **a vote to remove the President** (§15.9); it names its law, its duration, whether it needs 36 and, when five laws are in force, **the law it replaces**.
- **Who tables:** the **President**, once a week (Monday to Sunday), free, in **a slot of its own**; a **deputy**, once a term, **50 PC**; a **Chair**, once a term, 50 PC; **the secretary** of a party with **no player Chair and no player deputy**, at a Monday boundary when the paper holds fewer than two bills, the largest such bloc first, at most one secretary's bill a week, from the party's preferred laws in order (§15.8). So the book has laws from the first week (Appendix C #66).
- **The vote:** open from the tabling to the boundary into **tabling day + 4** (three full City Days and the rest of the tabling day; tabling closes after term day 23, so nothing divides on day 27; an override that cannot divide by day 27 is not tabled and the veto is final; settled 4 Oct 2026); every deputy one tap, **For** or **Against**, public in the chamber, final; not voting is abstaining; **one bill per member per term**, whichever office tables it. **Local deputies** vote by the chain: the majority of their party's player deputies who voted (a tie is no majority) → **the Chair's line** (an unset line falls through; an explicit *Free vote* abstains) → **the secretary's line** on that law (a *free* line abstains); **a party whose home city is in Unrest has its local deputies abstain** (§14.11). **Parliament votes at the boundary after the third day: 31 or more For passes; a factional law needs 36.** Abstentions count for nothing.
- **In force** from the boundary into the day after the division (one day **awaiting the President's signature**, the veto's day), for the law's duration, everywhere. A failed bill cannot return for **seven days**; the old term's open bills **lapse** at term day 0.
- **The veto:** once a term, on the signature day, one tap; the bill does not come into force. Parliament may **vote it through anyway**: the bill returns in its own slot for a second three-day vote and passes with **40 of 60**, in force from the boundary after, with no second veto. A removal cannot be vetoed.
- **Striking out:** a bill *to strike out {law}* passes with 31; the law ends at the boundary after the division, no signature day. **The cap:** at most **five laws in force**, **one of each**; a bill tabled at the cap names the law it replaces, which ends when the new one starts (if it has expired by then, the law ending soonest, ties to the oldest, ends instead; the paper says which).
- **Stipend:** a deputy 5 PC and 30 FXP a day. **Appendix C #26** (the whip) is closed in §15.3.

### 15.7 Ministers

**Post-MVP** (§25: launch + 60 days; confirmed in slice 7, with the Speaker). The settings below stay as the plan; a minister's weekly setting will be a sixth source of the §15.8 effect kinds, bounded as the laws are.

| Ministry | Setting (adjusted once per week, within bounds) |
|---|---|
| **Interior** | Police encounter chance ±10 %; Heat cooling rate ±20 % |
| **Labour** | Job pay ±10 %; seniority cap ±5 % |
| **Health** | Hospital costs ±25 %; HP regen ±20 % |
| **Culture & Press** | Social mission CHA thresholds ±3; propaganda influence ±10 % |
| *Treasury* (v1.2) | *Faction treasury and public spending* |

### 15.8 Laws

**Every law has fixed bounds.** Laws adjust settings; they can never break the game. **The slice-7 catalogue** (`docs/design/slice-7-nation.md` §7; the lines, effect lines and the secretaries' lines are there) replaces the v3.0 table: thirteen laws, each a **bounded modifier** on a number that exists, lasting its duration from the day it comes into force (expiry by the calendar; all laws expire at the Season rollover, §22.2), **at most five in force, one of each**; a **factional** law (its effect names a party's members, `appliesTo: members`, or everyone else, `others`) needs **36 of 60**, the rest 31. A law is a third source of the §14.6 effect kinds and combines by the slice-4 rules; it applies everywhere by the "where an effect applies" rule. **Laws never touch Party XP or the odds of a §8.4 check** (the Special Powers Act's `caughtDelta` moves the caught check, which is a risk roll, §11.2, not a check). The player reads a law's line as a council rule's with the kicker *LAW*, and the **law book** lists the five with their days left and who put them to Parliament.

| Id | Law (party) | Effect (the bound is the value) | Days | Needs | Secretaries' lines V · C · A |
|---|---|---|---|---|---|
| `law.peoples-education` | People's Education Act (Collective) | XP from missions +15 % (`xpPct`, scope missions; bound +20) | 14 | 31 | A · F · F |
| `law.eight-hour-day` | Eight-Hour Day Act (Collective) | Job pay +10 % · seniority ×2 | 14 | 31 | A · F · — |
| `law.universal-care` | Universal Care Act (Collective) | The infirmary's *Walk out well* −50 % (`infirmaryCostPct`) | 21 | 31 | A · F · F |
| `law.workers-charter` | Workers' Charter (Collective, factional) | Job pay +15 % for Collective members | 14 | 36 | A · F · A |
| `law.free-market` | Free Market Charter (Alliance) | Iron from actions and missions +10 % (bound +15) | 28 | 31 | — · A · F |
| `law.open-borders` | Open Borders Act (Alliance) | Journeys −25 % time (`journeyTimePct`) | 14 | 31 | A · — · F |
| `law.press-licensing` | Press Licensing Act (Alliance) | Propaganda opinion −25 % | 7 | 31 | — · A · F |
| `law.rehabilitation` | Rehabilitation Act (Alliance) | Minor marks fade after 7 days (`markFadeDays`) · bail −25 % | 21 | 31 | A · F · F |
| `law.civic-education` | Civic Education Act (Alliance, factional) | Training Energy −20 % for Alliance members | 14 | 36 | A · A · F |
| `law.emergency-permits` | Emergency Permits Act (Vanguard, factional) | Missions +2 Energy for everyone not of the Vanguard (`missionEnergyDelta`; rewards on the content Energy) | 14 | 36 | F · A · A |
| `law.curfew` | Curfew Order (Vanguard) | Run-ins ×2 at night, for everyone (`runInPct` +100, the §2.2 window) | 7 | 31 | F · A · A |
| `law.special-powers` | Special Powers Act (Vanguard, factional) | Heat cools +50 % for Vanguard members · the caught check +10 on missions against the Vanguard (`caughtDelta`) | 7 | 36 | F · A · A |
| `law.public-assembly` | Public Assembly Act (Vanguard) | Speech actions and missions −2 Energy | 14 | 31 | F · F · — |

**New DSL kinds** (bounds in `packages/rules`, enforced by the loader): `xpPct { scope }` −20…+20 · `missionEnergyDelta` −2…+2 · `journeyTimePct` −25…+25 · `runInPct { window?: 'night' }` −50…+100 · `infirmaryCostPct` −50…+25 · `markFadeDays` 7…14 · `caughtDelta { scope: 'againstFaction' }` 0…+10; every law effect may carry `appliesTo`. With sixty local deputies and no player, the secretaries' lines pass the laws two parties agree on (People's Education, Universal Care, Rehabilitation, Public Assembly) and fail the rest; a player Chair's line changes any of them. The v3.0 rows that need the Wardrobe or social missions (Dress Code, Cultural Enrichment) wait for their systems.

### 15.9 Recall, no-confidence and impeachment

Pinned in slice 7 (`docs/design/slice-7-nation.md` §10); the first draft's snap election and 35 % trigger are superseded.

- **A petition to dissolve the council** (the recall): opened by a Rank 3+ resident (resident since before the current polls opened; **10 PC**, the first signature) on **cycle days 0–2**; residents of any party, Rank 2+, sign (10 PC, public, final; sitting councillors of that council cannot); it **closes at the second boundary after opening** (always before the next count) and succeeds with signatures of **the greater of three and a quarter of the city's eligible residents** (the turnout roll). **One per city every seven days.** On success the council is **dissolved**: the rule in force (or just passed) is **struck**, the Governor's chair passes to the bloc's top local, every councillor's term ends **not completed**, and local candidates sit until the next scheduled result (**no snap election**: the calendar is pure and an election is never more than five days away; Appendix C #68). The political way to push back against a majority's rule in a battleground.
- **The Town Hall** (§16.3) adds townspeople's signatures to an open petition in its city: Triumph 3 · Success 2 · Mixed 1.
- **A vote to remove the President** (no confidence): tabled by a deputy or a Chair of any party (**50 PC**; a slot on the order paper), or **automatically** at a boundary when the President's party's **control share** (its National Control ÷ the three parties'; 33.3 at the baselines) is **below 25 %** (once a term, in the clerk's name, in a slot of its own; settled 4 Oct 2026: raw National Control is 23.5 for everyone at the baselines); not on term days 0–4 or 24–27; seven days between motions. Three days' vote, every deputy; **passes with 40 of 60**; the secretaries' line is *Against* for the President's party and free for the others. On passing the President is removed at the division and **the runner-up of the election** serves the rest of the term; the removed President keeps nothing of the office and loses nothing else. Survived: a headline (Legacy 10, slice 8). Cannot be vetoed.
- **A vote on the Chair:** §15.4.
- Impeachment of a Governor is the petition; nothing else removes an office-holder before their term ends.

### 15.10 NPC fill: politics at any population

Politics has to work with 1 player or 50,000:
- **NPC candidates fill the slate to nine names** in every council election: if *p* player candidates are on the ballot, `max(0, 9 − p)` NPCs stand, from the top of the faction's slate in profile order; with nine or more players, none. Nine names for seven seats means at least two lose every cycle, and the bottom of the slate (profiles 19, 17, 15, with a ±2 seeded jitter) is close enough that a handful of members' votes decides the last seat even when no player stands. Each faction has a slate of **nine named NPC candidates** in its own voice, with a platform line each (`docs/design/slice-3-politics.md` §5.2); some of them are Dossier targets and patrons' allies later. **In Irongate** (slice 4) each faction has a separate slate of **ten, two per district** (profiles 28 and 20, the same ±2 jitter), filling each faction's list in a district to two names, so every district ballot has at least six names across three factions; the profiles are set so that about five days' work in the capital beats the district's top NPC and *Known* alone does not (`docs/design/slice-4-battleground.md` §8.3).
- **NPC candidates and office-holders** fill any seat no player wins. **They are marked, and the marking is explained**: the small faction mark in place of a face and the words *Local candidate* in place of a rank title (review 2 said *local*; review 3 lengthened it so it cannot read as *from here*), on every slate, ballot, count and council screen (Appendix C #3, closed), and every list groups them under *Local candidates* with one line saying they are townspeople run by the game who fill the list so there is always an election (§15.3, review 3). Their standing label is derived, `profile × 5` through the §13.4 thresholds (the top three of a slate read *One of Us*, the rest *Trusted*), so it agrees with their ward vote. No NPC is ever presented as a player.
- **NPC councillors** vote for the item with the most votes from player councillors of that council (ties to the branch's motion, then the earliest moved); if no player councillor voted, for the branch's motion, which stands in for the Faction Chair's whip until a Chair exists; **during Unrest they abstain** (§14.11). NPC councillors never move a motion and draw no stipend. **Local deputies** (slice 7) vote with the majority of their party's player deputies who voted, else the Chair's line, else **the secretary's line** on that law (content, §15.8; a *free* line abstains); they abstain while the party's home city is in Unrest (§14.11). **Local councillors' chain** (slice 7): the player councillors' leading item → the Governor's rule → the Chair's rule → the secretary's; four player *None of these* at home make them abstain (§15.3).
- **The ward vote is the NPC electorate**: in a home city a candidate's Local Standing (§15.3), in a battleground the influence half of every score, so mission work counts even when few players vote.
- The ratio of NPCs to players is shown openly (*NPC seats: 6 / 7*, *NPC seats: 38 / 60*), so a growing player base can see itself taking over.
- **NPC fill at the top (slice 7; `docs/design/slice-7-nation.md` §6.5, §9.5).** **The party's own figures**, one per party with a portrait and a line (*Dr Konrad Albrecht*, chairman of the Vanguard's national committee, a retired appeal-court judge; *Hanna Brod*, general secretary of the Collective, a tram conductors' union secretary; *Professor Emil Faber*, chairman of the Alliance, a constitutional lawyer), stand for President when no player carries the party's pick and hold the office when nobody wins it, marked *run by the game*; they never back, pledge, veto or draw pay. **The secretary is always on the Chair's ballot** (§15.4). **Local deputies**: eight named per party (clerks, inspectors, a timekeeper, a union steward, a nurse, a compositor, a barrister, a bookseller…) and the rest counted (*and n more {faction} deputies*). **Clearwater's slate** is three per party (profiles 28 / 22 / 16, the ±2 jitter), filling each party's list to three names. **The secretaries table bills** for a party with no player Chair or deputy (§15.6). A local Governor sets nothing and draws nothing. No figure run by the game is ever presented as a player.

---

## 16. Factions and co-op

### 16.1 The three factions

**The Iron Vanguard (Fascists).** An authoritarian nationalist party that believes strength, order and a strong hand at the top are the only way forward. Its strongholds are the frontier and industrial outer cities, held through discipline and hierarchy. It is a party, not a militia: it has a committee, an organiser, volunteers and stewards, and it courts the police and the customs rather than being them.
- Starting bonus: +3 STR
- Legislation style: order, curfews, costs for the opposition
- Signature event: **Grand Rally**
- Exclusive location: **Vanguard House** (the movement's gymnasium and club, kind `gym`: faster STR/AGI training, cheaper bodyguards, a surplus market)

**The Red Collective (Communists).** A grassroots movement that wants the working class to take Irongate's industries from a corrupt elite. It works through solidarity, underground networks and collective action.
- Starting bonus: +2 STR +1 INT
- Legislation style: cheaper Energy and more XP for everyone, labour protections, taxes on the rich
- Signature event: **General Strike**
- Exclusive location: **Underground Press** (propaganda at double speed, the union intelligence network)

**The Civic Alliance (Democrats).** A centrist coalition that believes lasting change comes through elections, institutions and public opinion. It works in the open, through the press, diplomacy and the courts.
- Starting bonus: +3 INT
- Legislation style: voting rights, cheaper healthcare, curbs on propaganda
- Signature event: **Headline Story** (needs a Case File)
- Exclusive location: **Press Club** (unlisted jobs, journalist intel)

The factions are fictional and stylised. They're game constructs, not endorsements (see §26).

### 16.2 Faction chat and presence (moved into MVP)

- **Faction chat** with channels: general, per city, and officers (Rank 4+).
- **Presence:** every location shows who's there, e.g. *"In the Anchor Bar: 3 Collective, 1 Alliance, 2 strangers."* Clicking a name opens their public profile.
- **Favours between players:** bail out a faction mate from jail, visit them in hospital, or give them a spot in your Campaign Event.

**Slice 6 (pinned; `docs/design/slice-6-together.md` §6–§9; the screens in `slice-6-screens.md`).** The **Faction tab** is the HQ: Orders (today's three and the fixture), Events (the board), Members, Scoreboard (§14.5) and Chat.

- **Chat:** two channels in the MVP, ***Party*** (faction-wide) and ***{City} branch***, one for the faction's home city and one for the capital (three channels per faction; the member reads the branch of the city they stand in, or their residence city's on rival ground, and may switch; settled 3 Oct 2026); the officers' channel arrives with the Chair (**slice 7: *Officers***, a chip for Rank 4 and above, the Chair's room, the same rules; and a ***Clearwater branch*** chip, since Clearwater is a branch for every faction with a daily fixture: five chips at most). Every member from **Rank 1**. A message is plain text of **at most 280 characters**, no links rendered, no images; **the last 200 messages or 7 days** per channel are kept, fifty loaded at a time; **one message every 3 seconds, thirty in ten minutes**, an identical repeat within a minute refused. **System lines** in the city channel carry the branch's news with a button where one applies: an event called, its result, a mate taken in (*Post bail*), admitted (*Visit*), a seat won, a hero named, a nudge. Over WebSockets while the tab is open; nothing in the game depends on being connected. **Moderation in slice 6:** mute a member (from their profile; hides their lines for you), report a line (a record with twenty lines of context; nothing automatic), the sign-up name rule, the limits above; chat can be hidden from the Me tab. **Slice 9 (pinned; `docs/design/slice-9-launch.md` §5; Appendix C #7 closed):** **the policy** (no harassment, no real-world hate, no real-world political slogans, symbols, parties or leaders as identity, no doxxing, no spam or selling, nothing offered for a vote, a backing or a signature, no impersonation, no evading a mute); **reports** from a line or a profile with four reasons (*Abuse or harassment · Real-world politics or hate · Spam or selling · Something else*), ten a day, the reporter told *Thanks. Someone will read it.* and, when it led to an action, *A line you reported was dealt with*; **a word filter** that **refuses** (*That can't be said here.*, no echo) or **flags** to the queue, its lists kept outside content; **the ladder**: a note from the editor (a Letters row) · **muted** 24 hours, then 7 days (reading and everything political untouched) · **suspended** 3 days, then 14 (cannot sign in; nothing owned is touched; timers run, the wage lands, a name on a ballot stays, an office's duties fall to the §15.1 defaults) · **closed** (the character retired: a council seat as by a move, the Governor to the bloc's top local, the Chair as a change of Chair, a deputy's seat to the next name on the party's list, the President to the runner-up as a removal; candidacies and open sign-ups withdrawn; personal data erased after 30 days, printed editions included); real-world hate goes straight to 14 days and a second time to closure. The five suspension reasons a player can read: real-world politics, going after another player, something offered for a vote, another account used to get round a mute, spam or selling. One reply of 500 characters per decision, answered within a week. **The console** (`/mod`: Queue, Audit, Accounts, Log; admins see Metrics) for users with the moderator or admin role; moderators may play, their characters are left out of every figure, and a report about a moderator's own faction's member needs a second moderator. The gate through the betas: **the queue's median time to first action under 24 hours**.
- **Presence:** `presence { locationId, seenAt }` (the character's `cityId` is the city); *here now* is **seen within ten minutes**. A place's sheet reads *Here now: you, {two names} and n more · k from other parties*: **your own faction by name** (tap for the public profile: name, faction and rank, Level, residence, member since, heroes, Reputation where you both stand; never the record, Heat, Health, Iron or stats), **the other two factions as one count** (the GDD's *strangers*: there are no neutral players). **On rival ground a visitor is invisible to everyone but their own faction** (§14.12: a new player walks through Duskwall unnoticed); **from slice 8 a recognised visitor** (recognition above 0, §14.12: a good coat, an office or a Legacy) **is counted as *1 from another party*, never named**. The Members list shows faction mates' city and state (*in the cells at Harbour Police · 24 min*, *in the infirmary*, *on the train to Irongate*, *in Duskwall · rival ground*). A journey shows *You and n others on this train* when the count is cheap.
- **Favours:** **posting bail** (§19.2): any member of the prisoner's faction, from anywhere, pays **the prisoner's own bail figure**; release at once; the payer +10 FXP and a line in the paper; once per sentence; nothing transfers between accounts. **A visit** (§19.1): **3 Energy** from anywhere but rival ground (not held, not in transit), **+10 Health and five minutes off** for the patient, **once per visitor per stay, three count**; the visitor +10 FXP. **The nudge:** one tap, by any member signed up to an open event with a free place, asks a mate not on it to take its first open role they may hold, or a pair of hands (a system line addressed to them; once per pair per event); no reservation.

### 16.3 Campaign Events (new)

This is co-op politics: short, scheduled events that faction members fill together.

- **Scheduling:** Rank 3+ members schedule an event in a city, **1 to 12 hours ahead**. The Faction Chair can schedule them faction-wide. Limit: one per faction per city every 4 hours (slice 6 re-expresses this as three starts a city a day, below).
- **Roles:** 3–5 slots. Signing up commits the role's Energy (10–20). Each role rolls its own stat check, and **every role matters**.
- **Resolution:** at the start time the event resolves automatically. **Nobody needs to be online**: signing up is the commitment. Empty roles go to **NPC volunteers at half strength**, and the result waits for every participant as a result modal and in the next Morning Paper.
- **Outcomes:** Triumph, Success, Mixed or Fiasco. They decide the influence swing (scaled by event size and Issue match), FXP, PC (3–15), Issue momentum, and a headline.

| Event | Roles (stat · Energy) | Base swing | Difficulty (home · capital) | Matches as | Notes |
|---|---|---|---|---|---|
| **Rally** | Speaker CHA+INT 15 · Organiser INT 10 · Security STR 10 · Press INT 10 | 1.5 | 12 · 14 | speech | All factions; strong on Issues |
| **Canvass Drive** | Coordinator INT 10 · 3 Canvassers **best** 10 | 1.0 | 10 · 12 | canvass | Low risk, every build has good odds; the newcomer's event and the commonest fixture |
| **Poster Night** (slice 6) | Printer INT 10 · Paster AGI 10 · Paster STR 10 | 0.8 | 10 · 12 | propaganda | Three roles; the event for a branch of three, and Agility's first |
| **Grand Rally** (Vanguard) | Speaker CHA+INT 15 · Stand-builder STR 10 · 2 Ushers STR 10 (*Stewards* until 3 Oct 2026: the role clashed with the Vanguard's Rank 2 title) · Lookout AGI 10 | 2.0 | 14 · 16 | speech | The movement fills the main square by the thousand: a show of numbers and discipline. **+5 Heat** for every member participant when the district is held by a rival |
| **General Strike** (Collective) | Shop Steward CHA+INT 15 · Picket Captain STR 15 · Printer INT 10 · Runner AGI 10 | 2.0 | 14 · 16 | speech | **Double Issue momentum** (the "suspends factory jobs" of the first draft went with the shift, §9) |
| **Headline Story** (Alliance) | Reporter INT 15 · Editor INT 10 · Source-handler AGI 10 · Lawyer INT 10 | 2.0, **against the leading rival, fixed at the call** (drawn from it, half to the Alliance and half to Neutral) | 14 · 16 | propaganda | **No Case File in slice 6**; from slice 8 the caller may **attach a Case File** on a name of the target party (spent at the call; the name burned for 14 days as an exposé's would be): **+50 % on the swing** and the name in the result's headline (`docs/design/slice-8-life.md` §4.3) |
| **Town Hall** (slice 7, pinned; `docs/design/slice-7-nation.md` §10.4) | Moderator INT 10 · 2 Speakers CHA+INT 15 · Press INT 10 | 1.2 | 12 · 14 | speech | Venue kinds `square`, `university`, `court`, `theatre`, `hotel`, `library`, `faction-hq` (the venues per place: `slice-7-nation.md` §23.6; no signature event in Clearwater in slice 7). When a petition to dissolve the council is open in the city at the start it adds townspeople's **signatures: Triumph 3 · Success 2 · Mixed 1**; otherwise an ordinary event |

- Each player can sign up for **3 events per City Day**.
- *v1.1:* **Counter-Demonstrations**, where a rival faction schedules into the same window to cut the swing.

**Slice 6 (pinned; `docs/design/slice-6-together.md` §2–§4; the player reads it as *a campaign event*).**

- **Callers:** Rank 3+ (*Organisers and above*), standing in an open city, not held, not in transit; **never on rival ground** (no events there in the MVP). Calling costs nothing beyond taking the first role. **The secretary's daily fixture** (§15.4) in each home city and the capital. A Chair's faction-wide events: slice 7.
- **Venue:** fixed per event per city in content (per district in the capital; the signature events each in one district), always an existing location in a first quarter or a district (`slice-6-together.md` §3.7). The caller chooses the event, not the place. The venue's sheet carries the event as a ticket while it is open.
- **When:** four chips, **in 1 · 3 · 6 · 12 hours**, printed in the local clock; a start past the boundary belongs to the next City Day. The fixture resolves at the boundary.
- **Limits:** per faction per city (per district in the capital) **one upcoming member-called event at a time, two member-called starts a City Day, three starts with the fixture** (the scale lever, Appendix C #58); per member **three open sign-ups** at once (the "3 a day", needing no day counter).
- **Roles and hands:** named roles need **Rank 2**; every event has up to **four hands** for **any Rank** (5 Energy, no roll; a hand's Energy counts in the members' share and a hand is paid like everyone else). One role per member per event.
- **Sign-up is the commitment:** gated on being in the event's city at the tap (the capital: anywhere in it), not held or in transit, the Energy; **the role's Energy is spent at the tap**, Rested drawn per point and its bonus kept for the role's XP; **nothing afterwards is required**: where the member is at the start (the cells, the ward, a train, another city, rival ground, offline) changes nothing; the role resolves on their stats as they stand at the start and pays them. **Withdraw** until an hour before the start, the Energy and Rested returned in full (above a full bar the regen's overflow rule: the excess banks as Rested); an event order the sign-up completed stays carried out; in the last hour the roster is committed. An event with no member on it at the start is **called off** (nothing happened, nothing spent). A sign-up in the residence city completes the event order (§13.7).
- **Volunteers:** every empty named role at the start is filled by *the branch's volunteers: townspeople run by the game* (the §15.10 rule), scoring **0.5**, or **0.75** when the city is the faction's home and *Fired up* (§14.11). They take no reward.
- **Resolution** (`packages/rules`, seeded per event by a secret seed stored on it with a named stream per role, since the id is public; a scheduled job at the start, lazily on any later read, and by the city's boundary before the drift and the count): **one §8.4 roll per member-held role** (`50 + 4 × (stat − difficulty) + 3 × Standing level + 5 in a close race`, 5–95; difficulty by the event, +2 in the capital; *best* takes the highest of STR, INT and AGI; CHA worn): **Success 1 · Partial 0.5 · Failure 0** (the tier-2 bands). **Score = the mean of the named roles' scores**; **Triumph ≥ 0.875 · Success ≥ 0.625 · Mixed ≥ 0.375 · Fiasco below**. A lone member succeeding on a four-role fixture is a Success ((1 + 3 × 0.5) ÷ 4); a Triumph needs a roster.
- **The swing** (§14.2): base × outcome (1.5 / 1 / 0.5 / 0) × **the members' share** `min(1.25, members' role Energy + hands' Energy ÷ the roles' Energy)` × the §14.4 lines (Issue +50 %, close race +25 %, comeback, the council rule for the event's type), Neutral-first (the Headline Story from its target), attributed **equally to the member participants** as ledger rows (contributions; a rally can make a hero). **Momentum** as §14.6.
- **Rewards per participant:** **XP at the tier-2 rate (5 per Energy) by the holder's own roll** (full / half / a fifth; a hand by the outcome), Rested on top; **Party XP 0.8 per Energy × the outcome** (×1.5 / ×1 / ×0.5 / ×0.25), then the order's +25 %, *close race* +25 % and *Fired up* +10 % as lines; **Political Capital 15 / 10 / 6 / 3**, full for the first event of the day and half after (§6.5); **no Iron**; a named role's Success is **a win** for Reputation; the Grand Rally's Heat.
- **The result:** one modal per participant on their next read (the roles with who held them and how each went, the receipt, the knock-ons), a line *In Print*, a city line for the branch, the board's last ten, a system line in chat. Texts for every event and outcome: `slice-6-together.md` §3.

---

## 17. The personal story: Ambitions, Patronage, Legacy

### 17.1 Ambitions (new)

The envelope the player opens on the train in (§7.1 beat 3: the demobilisation office held post in their name since the autumn, and the three things in it are the three chapter-1 keepsakes) sets a **personal storyline that runs for months**, separate from the faction. It gives the player a reason to care about the city that isn't just numbers. The chapter-1 opener reads that envelope properly at the HQ; it never re-discovers what beat 3 found. **Review 5 (8 Oct 2026, confirmed by the user): the father is gone from the opening** (§7.1) and the three Ambitions are re-anchored to *Coming home* (`docs/design/review-5-answers.md` §19.6; the built scripts' strings §19.10 there). **The ladder of twelve chapters, its requirements, difficulties, rewards and keepsake slots did not move**: the keepsakes are electoral documents and the chapters are rungs, so only the titles, the names and the strings changed; `finish-his-work`, `clear-his-name`, `settle-his-debts`, every `keep.*`, `acc.his-rosette` and `outfit.fathers-coat` keep their ids under their new names. *(Until review 5: Finish His Work, Clear His Name, Settle His Debts, on the father who died in the capital; `docs/design/review-4-answers.md` §2.8.)*

| Ambition (id) | Premise | Main systems | Ending |
|---|---|---|---|
| **The Names on the Stone** (`finish-his-work`) | Forty of your unit didn't come home, and the town is cutting its memorial without them: the council says they weren't the town's own. Get the names on the stone, and that takes a seat. | Campaigning, offices, speeches | A law for the republic's memorials, and the names read out in Parliament |
| **Who Sold the Homes** (`clear-his-name`) | Requisitioned flats were given away while their people were away, and somebody was paid for each one. The signature on your order belongs to a man who is rising. | Dossier, Case Files, exposés | Expose him, now a senator |
| **The Ration Ledger** (`settle-his-debts`) | A year of rations drawn in your family's name after they were gone, by a ring that ran the ration books from Clearwater. They want the page back, and they have a price for your silence. | Iron, Heat, the Black Market, patrons | Pay, betray or take over the ring |

- **12 chapters** per Ambition. A chapter unlocks when its requirements are met (a level, an office, a Case File), **at most one every 7 days**.
- **Live content:** new chapters and side stories every term (28 days).
- Rewards: unique items and outfits, patron introductions, Legacy, and one-off influence events.
- Ambitions work for any faction; the storylines play out differently depending on which one you joined.

**Chapter rules (slice 2).** A chapter is a **tier-3 story of at most three steps** (§13.1): a choice with no roll, remembered as a flag for later chapters; one check with **three approaches** (two written for the story's stats and, from review 1, ***Legwork***, a best-stat check, §8.4, so that every build has an approach at its best stat), each showing its stat and chance, paid in Energy on commit; the result modal, which carries the next chapter's hook as a knock-on line. **A chapter never fails:** the check decides the text and rewards (Success / Partial / Failure, §8.4), and the chapter completes on any outcome. Chapters set in the home city trigger no encounter. Each chapter sets its own difficulty and Energy (the §8.4 tier-3 band is for later chapters and Operations). **Chapter 1** unlocks on arrival with no requirement, is delivered as a **Letter** in the welcome edition (§3.3), costs **10 Energy** at **difficulty 8**, and pays Success **150 XP / 40 FXP / 100 Iron**, Partial **75 / 20 / 50**, Failure **25 / 0 / 0**, with a keepsake (§21.4) on every outcome; no opinion; Rested applies; chapter checks count for neither Standing nor Party orders. Later chapters need their requirement and **seven City Days** since the previous one; the result modal's hook names the date, computed from the day the chapter was played, and the requirement as *at Rank n*, *at Level n* or *after your first ballot* (*Chapter 2, "Stand for the stone": from Tuesday 6 October, after your first ballot*). A chapter's Energy, XP, FXP and Iron count in the **Today tally** (§3.7); it adds no attempt or win, since it is not a tier-1 row. The third outcome's stamp reads **Failure**, as §8.4; no text in the chapter says "failed", because the texts are setbacks and the chapter completes. The kicker's *Chapter n of 12* uses the Ambition's declared length, not the number of chapters written; when the next chapter is not yet written the Letters row is simply absent. **The Paper tab's dot** shows while a chapter is ready, whether or not its Letter has been opened, and goes off once the chapter is played or mid-way (a Letter is a call to action; "opened and forgotten" is the case the dot is for). After a chapter, its screen shows only the next chapter's hook (*From Tuesday 6 October, at Rank 2*) and *Back to the paper*. Everything is resumable (`ambition { id, chapter, step, flags }`).

**Chapter 1 titles:** *The unit's list* (The Names on the Stone: three families to knock on; chapter 2 after the first ballot) · *The requisition order* (Who Sold the Homes: the housing office's register; chapter 2 at Level 6) · *The ration page* (The Ration Ledger: the man in the good coat holds a copy of the page; chapter 2 at Level 6). Every chapter 1's Letters row reads *From the office's post*. Scripts: `docs/design/review-5-answers.md` §19.10 (the review-4 scripts in `docs/design/slice-2-onboarding.md` §3 are superseded).

**Chapter 2 of *The Names on the Stone* (slice 3): *Stand for the stone*.** Requirement: **the player's first ballot cast** (which implies Rank 2), plus the seven days; about day 8 for the reference recruit, between the first vote and the first candidacy. **Difficulty 14, 15 Energy**; Success **300 XP / 80 FXP / 150 Iron**, Partial **150 / 40 / 75**, Failure **50 / 0 / 0**; keepsake *Your election bill* (`keep.election-bill`: the player's own bill, the forty names under theirs) on every outcome; the Letters row reads *From the branch's press*. Script: `docs/design/review-5-answers.md` §19.10.2 (was *Stand where he stood*, `slice-3-politics.md` §17.7). Chapter 3, *The deposit*, requires Rank 3. Chapter 2 of *The Ration Ledger* (*The riverside house*) arrives with Heat (slice 5, below); *Who Sold the Homes*' (*The night caretaker*) with the Dossier (slice 8); until then a player of that Ambition sees no Letters row after chapter 1, which is the rule above. **All three Ambitions are choosable in the MVP; *The Names on the Stone* is built to twelve chapters first** (Appendix C #6, closed), the other two to four chapters by launch (§25).

**Chapter 2 of *The Ration Ledger* (slice 5): *The riverside house*.** Requirement: **Level 6**, plus the seven days (about day 8 for the reference recruit). **Difficulty 14, 15 Energy**; Success **300 XP / 80 FXP / 150 Iron**, Partial **150 / 40 / 75**, Failure **50 / 0 / 0**; keepsake *A page of the ring's ledger* (`keep.ledger-page`) on every outcome; the Letters row reads *From the page's other side*. The choice (promise him Friday, or shut the door) is a flag; the check has three ways, and **the quiet way (Agility) adds +6 Heat on any outcome**, so a chapter's `approaches[]` may carry `heat`: for most players the first Heat they ever see, in a story that says what it is. No encounter (the chapter is at home). Script: `docs/design/review-5-answers.md` §19.10.5 (was `slice-5-risk.md` §13). Chapter 3, *The collector*, requires Rank 3.

**Chapters 4–12 of *The Names on the Stone* (slice 8; the Ambition is complete).** Each needs its rung of the ladder plus the seven days; difficulties climb the tier-3 band; every chapter's third outcome is a setback and the chapter completes; chapters set in the capital carry no run-in either. The spine is the council's memorial rule (*not the town's own*) and the forty names, up to a memorials law for the republic. Scripts: `docs/design/slice-8-life.md` §16.1 (re-strung 8 Oct 2026).

| Ch | Title | Requirement | Difficulty · Energy | Success / Partial / Failure (XP / FXP / Iron) | Keepsake |
|---|---|---|---|---|---|
| 4 | *The count* | a completed council term | 18 · 20 | 400 / 100 / 250 · 200 / 50 / 125 · 60 / 0 / 0 | *The count sheet* |
| 5 | *Your seat* | Rank 4 | 18 · 20 | 400 / 100 / 250 · half · 60 / 0 / 0 | *The minute book* |
| 6 | *The hall* | voted in a Chair election | 20 · 20 | 450 / 120 / 300 · half · 70 / 0 / 0 | *Your ballot stub* |
| 7 | *The cutting* | a Case File made | 20 · 20 | 450 / 120 / 300 · half · 70 / 0 / 0; Favour +5 with Crane | *The cutting* |
| 8 | *The stone's rule* | a Governor's term, or three council terms | 22 · 25 | 500 / 140 / 350 · half · 80 / 0 / 0 | *The rule, in draft* |
| 9 | *The list* | Rank 5 | 22 · 25 | 500 / 140 / 350 · half · 80 / 0 / 0 | *The letter from the list* |
| 10 | *The republic votes* | voted in a national election | 24 · 25 | 600 / 160 / 400 · half · 90 / 0 / 0 | *Your polling card* |
| 11 | *Twenty-five marks* | on the party's list for Parliament | 24 · 25 | 600 / 160 / 400 · half · 90 / 0 / 0 | *The list's receipt* |
| 12 | *The names read out* | a term as a deputy begun | 26 · 30 | 1,000 / 300 / 1,000 · 500 / 150 / 500 · 150 / 0 / 0 | ***The memorial ribbon*** (`acc.his-rosette`; wearable, CHA 5; a plain black ribbon, no device); **the Ambition completed: Legacy 30** |

**Chapter 2 of *Who Sold the Homes* (slice 8): *The night caretaker*** (Level 6; difficulty 14, 15 Energy; 300 / 80 / 150; keepsake *The caretaker's name* (`keep.foremans-name`); the Agility way carries Heat +6; it hands the player a Dossier entry on Konrad Brandauer, the block's night caretaker, a name with no party in Coalport; chapter 3, *The archive*, needs a Case File). **Chapter 3 of *The Ration Ledger* (slice 8): *The collector*** (Rank 3; difficulty 16, 15 Energy; 350 / 90 / 200; keepsake *The collector's card*; one choice costs 100 Iron; chapter 4, *The parcel*, needs Level 16). Scripts: `docs/design/slice-8-life.md` §16.2.

**Chapter 3 of *The Names on the Stone* (slice 7): *The deposit*.** Requirement: **Rank 3**, plus the seven days (about day 15 for the reference recruit, around the first candidacy). **Difficulty 16, 15 Energy**; Success **350 XP / 90 FXP / 200 Iron**, Partial **175 / 45 / 100**, Failure **60 / 0 / 0**; keepsake *Your deposit receipt* (`keep.deposit-receipt`) on every outcome; the Letters row reads *From the families' tin*. The choice (the families' ten marks or your own) is a flag; three ways (CHA+INT, INT, best); no encounter. Script: `docs/design/slice-7-nation.md` §13. Chapter 4, *The count*, requires a completed council term and is written with slice 8.

### 17.2 Patronage (new)

Each city has a powerful NPC patron who can be cultivated **over real days**. This is Irongate's slow timer: a relationship to tend rather than a course to wait out.

| Patron | City | Leans | Nature |
|---|---|---|---|
| **Edith Crane**, owner of the *Irongate Herald* | Irongate | Neutral | Media and headlines |
| **Senator Aurelia Voss** | Ashford | Alliance | Law, courts, respectability |
| **Mikhail "Misha" Draganov**, dockworkers' union boss | Coalport | Collective | Labour and crowds |
| **Commissioner Anton Reinholt**, frontier commissioner (customs and checkpoints) | Duskwall | Vanguard | Order, the police, the archives |
| **Julius Marr**, banker | Clearwater | Neutral | Money, the underworld, society |

**Favour (0–100)** grows through patron **Requests** (1 every 2 days, hold up to 2), gifts (1 a day), social missions and Ambition chapters. **Favour never decays**; unanswered Requests simply expire. You can cultivate **2 active patrons** at a time and change them weekly.

| Tier | Favour | Perks |
|---|---|---|
| Acquaintance | 10 | Letters and gossip: Dossier hints in the Morning Paper |
| Associate | 30 | **Introductions**: unique mission chains; Recruit Informant |
| Confidant | 60 | **A favour once a week** (15–40 PC): Crane plants a headline; Voss expunges a record point; Draganov fills 2 event roles at full strength; Reinholt cuts your Heat by 30; Marr grants a loan or Black Market access |
| Protégé | 90 | **Endorsement**: +2 % to your council score or +1 % national; a unique outfit piece |

You can court a patron who leans toward a rival faction. It's slower (Favour gains halved), but it opens cross-faction intel and missions.

**Slice 8 (pinned; `docs/design/slice-8-life.md` §5). Two patrons in the MVP: Edith Crane** (Herald House, Irongate) **and Julius Marr** (the Pier Hotel, Clearwater), both neutral and both in a battleground, so every faction courts them on the same terms (the halved gains are not exercised; Voss, Draganov and Reinholt follow after the MVP, §25). **Favour:** a **Request done +6** (a letter in the paper's Letters row, an order-shaped matcher; one arrives every second boundary after the first visit, two may be held, each expires at its fourth boundary; six per patron in rotation), **a gift +2** (200 Iron at the patron's place, one a day), **a society call in the patron's town +2** (+1 on a Partial), **a chapter that names the patron +5**; a Legacy perk makes every gain ×1.1. A devoted player gains 5–7 a day: Acquaintance in two or three days of attention, Associate in about a week, Confidant in two, Protégé in three. **The perks, pinned:** Acquaintance: **gossip**, a free Dossier entry in every Monday's paper; Associate: **an introduction** (Crane: the mission *The morgue file* at Herald House; Marr: the call *The late table* at the Casino) and **informants** in the patron's town (§10.4); Confidant: **a favour once a week** (Crane, 25 PC: *a headline planted*, +50 momentum for your party on one Issue of one city; Marr, 20 PC: *the bank's discretion*, Heat to 0 now and the back room's bribe at half price for 7 days); Protégé: **an endorsement** (+2 to your total in every home-council count and +1 point of score in a battleground count while Protégé; the "+1 % national" waits) and **the patron's piece** (Crane's pen: CHA 8, a Dossier entry now and then; Marr's cigarette case: CHA 8, better odds talking your way out), Legacy +5. Away: Favour stands, Requests expire, informants keep reporting.

### 17.3 Legacy (new)

**Legacy** is your permanent public political record, shown on your profile. It replaces a generic achievement system.

| Entry | Legacy points |
|---|---|
| City Hero | 2 |
| Council term served | 3 |
| Issue resolved (top 5) | 2 |
| Pledged law passed (§15.5) | 10 |
| Term as Minister / Speaker / Chair | 10 |
| Term as President (slice 7: one office at the top; the Chancellor row is gone) | 40 |
| Term as Governor or Mayor (slice 8) | 5 |
| Term as a deputy (slice 8) | 5 |
| Ambition completed | 30 |
| Survived a no-confidence vote | 10 |
| An exposé printed (slice 8) | 2 |
| Protégé of a patron (slice 8) | 5 |
| Season Champion faction (member) | 5 |
| A season award (slice 8) | 5 |

**Legacy perks** are bought with Legacy points. They're permanent and deliberately small. **Slice 8 (pinned):** the record's total is permanent and public (the profile's *Legacy 23*); perks spend a **balance kept beside it** (*23 · 8 to spend*), one tap each on the Me tab. The player reads them as *lasting perks*:

| Perk | Cost | Effect |
|---|---|---|
| A fifth more from the party | 15 | +5 % FXP on every action and mission |
| A bigger Dossier (twice) | 5 each | +1 Dossier slot |
| A better night's sleep | 10 | Rested cap +50 |
| A shorter walk | 15 | −1 Energy on canvassing |
| A name they know (three times) | 10 each | +1 % personal vote appeal (pinned as +1 to the ward vote per level in a home count) |
| A bonus at the end of the week | 10 | an extra day's pay at the Monday boundary |
| A friend of friends | 10 | Favour gains ×1.1 |
| A quiet word at the station | 10 | Heat cools +10 % |

The reference player has about 15 Legacy by day 30: one perk, chosen. Legacy is never spent on anything else and cannot be bought.

### 17.4 A home of your own (new)

Where you sleep is a long-term goal, a status symbol and an Iron sink. It gives no combat power.

| Home | Cost | Where | Gives |
|---|---|---|---|
| **A rented room** | Free (the starting home) | Any city you live in | Somewhere to sleep; +10 Rested a night |
| **A flat** | 2,500 IM + 150 IM a week (at most eight weeks ahead) | The residence city | +25 Rested a night; Rested cap +50; a third outfit, *Evening*; +2 Charisma in its city |
| **A townhouse** | 25,000 IM + 800 IM a week | Home or battleground city | +50 Rested; host small events (a Campaign Event venue); a patron can visit you (Favour +10 %) |
| **A villa** (Clearwater or Garrison Hill) | 150,000 IM + 3,000 IM a week | Clearwater, or Irongate's Garrison Hill | +75 Rested; host society dinners (social missions at home); shown on your public profile; Legacy |

- The weekly cost is prepaid, like bodyguard contracts (§12.1). If it runs out you drop back to a rented room; **nothing is taken away**, and your home waits for you to pay again.
- A home belongs to one city. Moving city means renting again, so moving is a real decision.
- The map shows your home as a small marker, so you can see where your faction mates live.

**Slice 8 (pinned; `docs/design/slice-8-life.md` §6).** **The rented room** gives **+10 Rested at every boundary** (banked up to the cap). **The flat:** bought from the residence card in the residence city from **Level 10**, **2,500 Iron** with the first week paid, then **150 a week prepaid** (*Pay a week · 150* / *Pay four weeks · 600*); it gives **+25 Rested at every boundary**, **Rested cap +50** while paid (the larger of a flat and a room, never both), **a third outfit, *Evening*** (§21.1), and **+2 worn Charisma while in its city**. **When the rent runs out the flat waits:** the bonuses stop, the room's +10 resumes, the *Evening* set is remembered (its items still wearable one by one), and a week's rent restores everything; no arrears are ever owed, however long the absence. **Moving residence leaves the flat where it is**, waiting (*the Rested cap where you live*). **One flat per player in the MVP**; the townhouse, the villa, a second flat and the map marker follow after the MVP (§25).

---

## 18. Economy

### 18.1 Principle

**Baseline income is higher than baseline cost.** A player who never spends anything still progresses. Iron sinks are **optional acceleration**, and the choice of how to spend Iron is part of the game.

### 18.2 Income (reference player, per City Day)

| Stage | Missions | Job | Other | Total |
|---|---|---|---|---|
| Week 1 (T1–T2) | ~800–1,600 | 80–300 | Dossier sales, events | **~1,000–2,000** |
| Month 1 (T3) | ~2,800 | 350–800 | | **~3,500** |
| Month 3 (T4) | ~4,800 | 900–2,500 | | **~6,000–7,500** |

**Campaign Events pay no Iron in the MVP** (slice 6, §16.3): a rally pays no wages and the branch covers the paste; opinion, Party XP and Political Capital are the co-op prize, and Iron already runs ahead of its sinks (`docs/economy.md` §19.11). *Other* income is Dossier sales (slice 8).

### 18.3 Sinks

| Sink | Cost | Kind |
|---|---|---|
| Meals and lodging (buffs) | 50–1,500 | Acceleration |
| Clothing and wardrobe (CHA) | 200–50,000 (slice 8, pinned: the standard coat 200, a good coat 800, a tailor's suit 4,500–5,500, the three-piece suit 20,000; a hat 400, the badge 150, the watch 2,500; **shops buy back at a tenth**; +15 % / +30 % for a *Repeat offender* / *Notorious* record) | Access and status |
| Equipment and crafting | Varies by tier (slice 8: paste and brush 300, the press pass 500, the camera 1,200, wire cutters 400, forged papers 600; **crafting is post-MVP**) | Power |
| Bodyguard contracts | 350–5,600 per week | Safety |
| Bail (slice 5: **100 IM + 50 a mark**, ×2 Notorious, ×2 on rival ground, ×½ for Alliance members) and the infirmary's *walk out well* (**100 IM**) | 100–1,600 | Recovery |
| *Get patched up* at any infirmary (review 5: **1 IM per point of Health missing**, at least 10; no Energy; any city) | 10–150 | Recovery, optional |
| Bail posted for a faction mate (slice 6: the prisoner's own figure, paid by the payer from anywhere; +10 FXP; nothing transfers) | 100–1,600 | A favour |
| Paying off a run-in (slice 5: 50–300 IM by opponent, §20.2) | 50–300 | Recovery |
| Bribes to clear a record (slice 8, **the back room** of a bar, from Rank 3) | **500 / 1,000 / 2,000 a mark** by the record's level; half price for a week on Marr's favour | Recovery |
| Train and car tickets, a car of your own | 20–150 IM per journey (third class **20**, slice 4; never below 5 under the Tram Subsidy or the Tram Fare Hike); 5,000 IM for a car | Mobility |
| Moving residence (to a battleground district, or home again) | **500 IM**, seven days between moves; residence itself has no rent | Mobility |
| A room in Irongate (slice 4) or in Clearwater (slice 7); **the player reads *Lodgings in {city}* from slice 8**, so that it never shares a word with the free *rented room* of §17.4 | **100 IM for 7 days**, Rested cap +50; half price under the Evictions Issue or *Rents in the Rows*; never stacked with a paid flat's +50 (the larger applies) | Acceleration |
| A home (§17.4): flat, townhouse, villa | 2,500–150,000 IM, plus a weekly cost (slice 8: **the flat, 2,500 + 150 a week**; the rest post-MVP) | Status and comfort |
| Patron gifts | 100–5,000 (slice 8: **200 Iron, +2 Favour, one a day per patron**) | Relationship |
| Dossier sales (income, not a sink; §18.2's *Other*) | a file 200, a fresh entry 50, a stale one 25 | — |
| Faction store and Black Market | Varies | Power and access |

### 18.4 Later (v1.2)

Player-to-player trading, a **faction treasury** with spending caps and a public audit log (to prevent the treasury-looting seen in eRepublik), and market taxes.

---

## 19. City services

### 19.1 Hospital

You're admitted automatically at 0 HP: emergency treatment restores 30 HP, and the stay lasts **20 minutes** (shorter under Clinic Funding or Universal Care).

| Service | Energy | Iron | Effect |
|---|---|---|---|
| Full Recovery | 5 | 100 | Full HP; leave immediately |
| Early Discharge | 5 | 0 | Leave at 50 % HP |
| Antidote | 8 | 200 | Removes Poisoned |
| Recovery Boost | 10 | 0 | +5 STR or INT for 1 h; once per stay |
| **Get patched up** (review 5, 8 Oct 2026: a walk-in, not a stay) | 0 | **1 per point of Health missing, at least 10** | Full Health, now; a *Treatment* card on every infirmary's sheet, any city, whenever Health is below full and the player is not held or in transit. A choice, never a must: Health comes back free at ten every ten minutes (`docs/design/review-5-answers.md` §8) |

**The hospital is a place to play, not a waiting room.** While admitted you can talk to other patients (Dossier entries), read the paper, write to your patrons, and play a hospital storylet. **Faction mates can visit** you: +10 HP and 5 minutes off the stay, once per visitor per stay (three count; slice 6, below).

Who controls the city changes the hospital: Vanguard +25 % cost but stronger boosts; Collective −50 % cost, no boosts; Alliance standard cost, antidote always in stock.

**Slice 5 (the player reads it as *the infirmary*; `docs/design/slice-5-risk.md` §9).** A run-in lost (to anyone but the police, §20) sets Health to 0 and admits the player to **the infirmary of the city they are in** (Coalport's Infirmary, Duskwall's Infirmary, Ashford's County Infirmary, St Agnes), opening its quarter if it was locked. **Admission: Health to 30 at once; the stay 20 minutes**, lazy (any read at or after the end discharges at whatever the regen has reached). Two ways out: ***Walk out well · 5 Energy · 100 Iron*** (full Health, now) and ***Discharge yourself · 5 Energy*** (now, at half of max Health or the current value if higher). Inside: no Energy actions, training or travel; the paper and every political act of the residence work; Energy, Rested, the wage and Heat's cooling run; one tier-1 intelligence tap on the ward (*Talk to the ward*, 3 Energy). The matron (`portrait.matron`) is the screen's voice. **Visits (slice 6, pinned):** a member of the patient's faction, from anywhere but rival ground, not held and not in transit, taps *Visit · 3 Energy* on the Members list, the chat's line or the profile: the patient **+10 Health and five minutes off the stay** (lazily: `until` moves), **once per visitor per stay, at most three visits count** (a stay never falls below five minutes; later visits are grapes only), the visitor **+10 FXP** and a modal; the patient sees the visitors on the ward screen and in the morning's paper. The Antidote and the Recovery Boost are buffs (slice 8); control's price changes are slice 7's. Nothing a player owns is touched.

### 19.2 Jail (new)

You're arrested when caught while Hot or Wanted, or on an escalated record.

| | |
|---|---|
| **Sentence** | **20 min + Heat ÷ 2 min (maximum 60)** (review 4; was 10 +) |
| **Leaving early** | Pay bail (scales with record), or **a faction mate posts bail** for you. Alliance members get Legal Aid: bail at half price |
| **Inside** | Jail storylets: cellmates' intel (Dossier), a Heat reset, and recruiting prisoners for Collective and Vanguard missions |
| **Afterwards** | Heat reset to 25 |

**Slice 5 (the player reads it as *the cells*; `docs/design/slice-5-risk.md` §8).** **When:** a caught check that lands while *Hot* or *Wanted*; a Failure on an illegal mission while *Wanted*; a run-in with the police lost (§20). Never a tier-1 action at home; never a legal mission unless a run-in with the police is lost (a watch's pool is the police; such an arrest carries the type's marks, **or one minor mark when the work carried none**: review 4, §11.2; the slice-5 "none for a speech or a watch" is superseded). **Where:** the police station of the city the player is in (Harbour Police, the Lock-up, Ashford's Police Station, Police Headquarters in the capital), its quarter opened if locked. **The sentence:** **20 minutes** (review 4; was 10) + Heat ÷ 2 minutes as it stands at the arrest, at most 60; **×1.5 on rival ground**, still at most 60; lazy (any read at or after the end releases). **The day's Party orders are off** from the arrest to the day's turn (§13.7; the panel reads *Orders off today · the branch heard about the cells*). **Every police station's sheet carries *In the cells now***: the players held there, any party, name and *out in n min* (being held is printed in the paper, so the list leaks nothing; the record, Heat and bail are not shown); slice 6 adds *Post bail* on a faction mate's row. The screen's sentence reads *The door opens at {time} either way, and Energy keeps refilling in here.* (review 4 removed *You can close the game*); the Alliance line reads *Legal Aid · the Alliance pays half your bail* with a note. **Bail = 100 Iron + 50 per mark on the record** (after the arrest's marks), **×2 for a Notorious record, ×2 on rival ground, ×½ for Alliance members anywhere** (Legal Aid), to the nearest 10; the *Cells Are Full* Issue halves it in the capital (`bailPct`). **Afterwards Heat is 25** whatever it was; at home the player stands at the police station's pin; **on rival ground release is deportation** (§14.12: the train home, barred 24 h). **Inside:** no Energy actions, training or travel; the paper and every political act of the residence work; Energy, Rested, the wage and Heat's cooling run; one tier-1 intelligence tap in the cell (*Listen to the cells*, 3 Energy). **A faction mate posting bail (slice 6, pinned):** any member of the prisoner's faction, **from anywhere** (in transit, held or on rival ground included: it is Iron, not Energy), taps *Post bail · {n} Iron* on the Members list, the chat's system line or the profile and pays **the prisoner's own figure** as the cells compute it; the prisoner is **released at once** (Heat 25; deportation on rival ground as §14.12) with *bail posted by {name}* on their release modal; the payer **+10 FXP**, a modal and a line in the paper; once per sentence; nothing moves between accounts, so there is nothing to farm. Cellmates' Dossier entries and recruiting prisoners are slice 8 and later. The duty officer (`portrait.duty-officer`; no rank, slice 4's word for the desk at Police Headquarters, settled 3 Oct 2026) is the screen's voice: a civic policeman of the republic, never a party's. The cells never take anything a player owns.

### 19.3 Bars

| Activity | Energy | Effect | Limit |
|---|---|---|---|
| Buy a Round | 2 | In Good Spirits: +10 % XP on the next 3 missions | 3 a day |
| Bribe the Barman | 4 | City report: influence, battlegrounds, rival events scheduled | 1 a day |
| Black Market Contact (slice 8: **the back room**, a shop card on bars that have one, from Rank 3: forged papers, wire cutters, the bribe that clears a mark, §11.4; no random item) | — | — | — |
| Faction Recruitment | 5 | Recruit an NPC to your faction (FXP, a tiny influence gain) | Rank 2+ |
| Overhear Conversation | 3 | Hints on the week's Issues; 10 % chance of a free Dossier entry | 1 a day |
| Stimulant | 0 | +10 HP. Taking 4+ in 24 h is an overdose: −20 % XP for 2 h. 6+ puts you in hospital | 3 safe a day |
| Bar meal | 2 | Well-Fed (Bar) | — |

---

## 20. Combat (NPC-only in MVP)

Combat is a **hazard**, not the core of the game. It triggers from encounters and is resolved in **one choice**, not round by round.

| | |
|---|---|
| **Flow** | The encounter appears with the opponent's portrait and your odds for each option. You pick **one**: **Fight** (STR), **Flee** (AGI), **Bluff** (CHA) or **Bribe** (Iron). The server simulates the whole fight at once and shows a single result modal, with the damage taken and the outcome. |
| **Auto-resolve** | One button picks the **free** option with the best odds (Fight, Flee or Bluff; it never spends Iron). Players who ignore the popup get auto-resolve when they next open the game |
| **Win** | The mission continues; bonus XP/FXP if you're at full HP |
| **Loss** | Hospital; the mission fails; no FXP; a small XP consolation |

### 20.1 The four options

| Option | Odds | If it works | If it fails |
|---|---|---|---|
| **Fight** | **50 % + 3 % × (your power − their power)**, 5–95 % | You win; you lose some Health (below) | Hospital |
| **Flee** | **(your AGI ÷ their AGI) × 60 %**, +5 % per bodyguard tier, up to 95 % | You escape; the mission fails; Heat as normal | Extra damage, then the fight goes ahead at −10 % |
| **Bluff** | The check formula (§8.4): **CHA against their Wits** | They let you go; the mission continues | They get angrier: the fight goes ahead at −10 % |
| **Bribe** | **90 %** if they can be bribed | They look away; Heat stays; sometimes a Dossier entry | Iron lost; +10 Heat; the fight goes ahead |

**Combat power = STR × 1.5 + weapon + armour ÷ 2 + 5 per bodyguard tier.**

**Health lost when you win a fight:** their power × 0.8 (±20 %), less your armour value. **Losing** always means the hospital (§19.1).

### 20.2 Opponents

| Opponent | Side | Power | AGI | Wits | Bribe | Where |
|---|---|---|---|---|---|---|
| Street Enforcer | Vanguard | 22 | 10 | 10 | 60 Iron | Common in Vanguard-held areas |
| Vanguard Doorman | Vanguard | 35 | 9 | 12 | 150 Iron | Duskwall, Operations |
| Strike Picket | Collective | 25 | 12 | 11 | 80 Iron | Sabotage missions, Coalport |
| Branch Inspector | Collective | 17 | 11 | 16 | Not bribable | Lowers your Fight odds by 10 % |
| Party Thug | Alliance | 19 | 10 | 10 | 50 Iron | Rare |
| City Police | Neutral | 30 | 12 | 14 | 300 Iron | Illegal missions; more common with Heat |
| Secret Police | State (Vanguard-held cities) | 43 | 14 | 20 | Not bribable | Operations in Vanguard-held cities, Level 20+ |

**Scaling:** opponent power rises **+10 % per mission tier above tier 1**, and **+4 in a rival home city**. Named NPCs (for example Inspector Kessler) have their own values.

### 20.3 Weapons and armour

| Tier | Weapon (power) | Armour (power ÷ 2, and damage reduction) | Example weapon |
|---|---|---|---|
| I | +4 | 4 | Truncheon |
| II | +8 | 8 | Revolver |
| III | +12 | 12 | Service pistol |
| IV | +16 | 16 | Rifle (hidden) |
| V | +20 | 20 | Legendary named weapon |

Armour is also clothing, so its CHA (§8.2) counts too. The best armour for a fight is rarely the best outfit for a dinner.

**Slice 8 (pinned): no weapons as items.** This is a political contest: **there is no weapon slot and no weapon in the catalogue** (Appendix C #74); the weapon column above is not built, and the two weapon pictures in the art folder are not catalogued. Power is **STR × 1.5 + the worn coat's armour ÷ 2** (Tier I 4 · II 8 · III 12 · IV 16 · V 20: +2 / +4 / +6 / +8 / +10), and Health lost on a win is reduced by the coat's armour value. A Tier II coat lifts the reference recruit's Fight against an enforcer from 29 % to 41 %: a coat with some weight to it, as the §8.4 reason line says.

**Example:** a player with STR 14, a truncheon (+4) and a Tier I coat (armour 4) has power 21 + 4 + 2 = **27**. Against City Police (30) that's 50 − 9 = **41 %** to fight, or with AGI 17 against 12, **85 %** to flee. Auto-resolve would pick Flee.

**Slice 5 (pinned; the player reads an encounter as *a run-in*; `docs/design/slice-5-risk.md` §10).** **When:** rolled once after a mission's check and once per tier-1 tap on rival ground: *run-in % = the type's base × 2 on rival ground + the Heat state's bonus (Noticed +5, Hot +15, Wanted +15) + 5 for a Repeat offender + 10 if Watched today − 10 if Warned*, 0–90. **Who:** from the mission's pool, own-faction opponents dropped, **the city police added from *Noticed* and picked half the time**; power **×1.1 on a tier-2 mission, +4 on rival ground**. **The order:** the check's result is **held**; the run-in decides whether it is paid: **Fight won, Talk your way out or Pay them off pay it as rolled; Run keeps only Failure's XP** (you got away; you dropped it); **a loss is the infirmary** (§19.1) with Failure's XP, **or the cells against the police** (§19.2). On rival ground's tier-1 taps a Run or a loss drops the row to Partial. **The rows in plain words:** *Fight · {odds word} · Strength* · *Run · Agility* · *Talk your way out · Charisma* · *Pay them off · 60 Iron · nearly always works* (*Won't be bought*, disabled, for the branch inspector), and a text row ***Leave it to luck*** that takes the best free odds; **a run-in left unanswered (the tab closed) is resolved by luck on the first read after five minutes, or at the day's end if sooner, as of that time** (the player's own choice wins while it is pending; ADR 0032) and the result modal waits. A failed Run (extra damage, half a win's), Talk or Pay (Iron gone, +10 Heat) rolls the fight at once in the same transaction. **XP:** +20 for a win, +10 for getting away, 0 for paying; **a win adds +10 % to the mission's XP and Party XP when Health was full as the run-in began** (*Won at full strength*; a failed Run's damage does not lose it, QA slice 5 n6). **Power** in slice 5 is STR × 1.5 + armour ÷ 2, every clothing item's armour being its tier's value (**Tier I = 4**, so +2); weapons, utility items and bodyguards are later. Health lost on a win is their power × 0.8 (±20 %) − 4, at least 0, and never takes Health below 1 (a win never admits you); a loss to the police sets Health to 30, as an admission does, so nobody sits in a cell at 0 (settled 3 Oct 2026, `slice-5-risk.md` §23). Each opponent has six content lines (appears, won, lost, ran, talked, paid); the Secret Police and named inspectors are later. The reason line for a fight lost is §8.4's `power` line.

---

## 21. Equipment

### 21.1 Slots

**Four slots from slice 8** (`docs/design/slice-8-life.md` §3; the research behind the screen in `docs/design/inventory-research.md`). **No weapon slot** (§20.3; Appendix C #74). The player reads the Wardrobe's words.

| Slot | The player reads | Mechanical bonus | CHA |
|---|---|---|---|
| Clothing | **Coat** | armour by tier (§20.3); a party coat +5 % FXP | 2–50 (the main CHA source) |
| Accessory | **On you** | FXP (the badge); a patron's piece's effect | 2–10 |
| Document | **Papers** | what *Show your papers* shows; +10 % at a checkpoint (forged) or watching and listening (the press pass) | 0 |
| Utility | **Tools** | +5 to +10 % on one kind of work (§8.4) | 0 |

**Effects** are a closed list of three bounded kinds (`chancePct` 5–10 on one action or mission type, a checkpoint, a bluff or the exposé; `fxpPct` 5; `dossierChance` 5–15); no item touches Energy, Iron, Rested or opinion. **Outfits:** two named sets from the start, ***Town*** and ***Plain clothes***, and ***Evening*** with a paid flat (§17.4); **one tap changes the whole set**; saving is explicit (*Keep this as Town*); never locked except in the cells, the infirmary and on a train (the journey to rival ground offers *Change into plain clothes*, in force at the station). **Shops are cards on places** (the clothes stall at a `market`, the party store at an HQ (the party's coat, the badge, paste and brush, **and the press pass and the camera**, so no Level-6 item waits for the Level-10 train), the tailor at a `hotel` or the Mountain Inn, the press at Herald House and Gazette House, the back room of a `bar` from Rank 3), one tap to buy (a confirm over 1,000 Iron); **the clothes stall buys anything sellable at a tenth of its catalogue price, every other shop only what it sells**, after a confirm; **keepsakes, the kit and a worn item are never sold**; an item saved in an outfit may be sold and leaves it. Worn CHA includes the paid flat's +2 in its city (§8.2). Dressing shows no modal: the card reads *Wearing* and the Charisma figure changes.

### 21.2 Tiers

The tier is said as what it is (**work clothes · a good coat · a tailor's suit · a society wardrobe**); the Roman numeral is the design's.

| Tier | Said as | Unlock | Coat's CHA | Armour | Slice-8 examples (Vanguard / Collective / Alliance / neutral) |
|---|---|---|---|---|---|
| I | work clothes | Level 1 | 2–5 | 4 | Work jacket / mill coat / worn overcoat (§21.4); the standard coat |
| II | a good coat | Level 6 | 10–15 | 8 | Steward's jacket / convenor's coat / campaign suit |
| III | a tailor's suit | Level 16 | 20–28 | 12 | — / — / correspondent's suit / the dress greatcoat, evening dress |
| IV | a society wardrobe | Level 31 | 30–40 | 16 | the tailored three-piece suit |
| V | — | Level 51, Rank 6 | 42–50 | 20 | post-MVP: Keeper's regalia / Chairman's regalia / the frock coat |

### 21.3 Where equipment comes from

Faction stores, clothing shops, the press, the back room (the record raises its prices, §11.3), Ambition and patron rewards (keepsakes, some wearable). **Post-MVP:** mission drops, crafting (combine two items of the same type for a 40 % chance of the next tier), the Tier V quest chains, player trading (§18.4).

### 21.4 The starting catalogue (slice 2)

Slice 2 uses two slots, **clothing** and **document**; the others open with the Wardrobe (slice 8). A character starts with **0 Iron**, the faction's outfit worn, the party card, and the origin coat if it was taken (worn in place of the outfit, which stays in the wardrobe as plain clothes). **Keepsakes** are unique: never sold, crafted, given or lost, marked as such in the wardrobe; some have no slot at all and simply exist in the inventory for later chapters to read.

| Id | Item | Slot | Tier | CHA | Notes |
|---|---|---|---|---|---|
| `outfit.work-jacket` | Work jacket and cap | clothing | I | 2 | Vanguard starting outfit |
| `outfit.mill-coat` | Mill work coat | clothing | I | 2 | Collective starting outfit |
| `outfit.worn-overcoat` | Worn wool overcoat | clothing | I | 2 | Alliance starting outfit |
| `outfit.fathers-coat` | The demob suit | clothing | I | 5 | Origin (§7.1 beat 3), worn from the start; art `item.winter-coat`. *Your father's coat* until review 5; the id stays |
| `outfit.fathers-coat-promised` | The demob suit | clothing | I | 5 | Legacy keepsake copy from the old slice-2 promise (no longer granted, review 4); the holder also has +1 CHA base |
| `doc.party-card` | Party card | document | I | 0 | Keepsake; *Show papers* at checkpoints from slice 5 |
| `keep.ward-book` · `keep.prison-letter` · `keep.marker` | The unit's list · The requisition order · The ration page | none | — | — | Chapter 1 keepsakes, read by later chapters (*His ward book · The prison letter · The marker* until review 5) |
| `keep.election-bill` | Your election bill | none | — | — | *The Names on the Stone* chapter 2 keepsake (slice 3); art `item.document-folder` |
| `keep.ledger-page` | A page of the ring's ledger | none | — | — | *The Ration Ledger* chapter 2 keepsake (slice 5); art `item.document-folder` |
| `keep.deposit-receipt` | Your deposit receipt | none | — | — | *The Names on the Stone* chapter 3 keepsake (slice 7); art `item.document-folder` |

Art and per-faction kit: `docs/design/slice-2-onboarding.md` §4.

**Slice 8 adds eighteen items** (the full table with prices, effects, shops and art: `docs/design/slice-8-life.md` §3.9): the standard coat (I, 5); the three party coats (II, 12, +5 % FXP); the dress greatcoat (III, 22), evening dress (III, 24) and the correspondent's suit (III, 25, Alliance); the three-piece suit (IV, 38); the party badge (2, +5 % FXP), a good hat (6), the gold wristwatch (10); Edith Crane's pen and Julius Marr's cigarette case (8 each, Protégé keepsakes, wearable); *The memorial ribbon* (`acc.his-rosette`, 5, chapter 12; a plain black ribbon, no device); forged papers and the press pass (Papers); paste and brush, the press camera and wire cutters (Tools). **And eleven keepsakes** (no slot, `item.document-folder`): *The count sheet*, *The minute book*, *Your ballot stub*, *The cutting*, *The rule, in draft*, *The letter from the list*, *Your polling card*, *The list's receipt* (chapters 4–11), *The caretaker's name* (`keep.foremans-name`, *Who Sold the Homes* 2), *The collector's card* (*The Ration Ledger* 3). Names re-strung for review 5 (8 Oct 2026); ids unchanged. **Not catalogued:** the revolver and the truncheon (§20.3).

---

## 22. Political Seasons (new)

A **Political Season** is one in-game year: 12 weeks, ending in the Season Election. Seasons give the game structure, let newcomers compete on fair terms, and set the pace for live content.

### 22.1 Season end

- **Season Champion:** the faction with the highest **Season Score** (daily National Control summed over the season, plus 10 per national election won). Members get a season cosmetic and Legacy.
- **Awards:** top ledger contributors per bracket, most City Hero titles, the best orator (event outcomes), the spymaster (Case Files used).
- **The Hall of Fame** records every President, Champion faction and major award.

**Slice 8 (pinned; `docs/design/slice-8-life.md` §9).** **A season is three terms** from the term epoch (`seasonDay = (dayKey − TERM_EPOCH) mod 84`); **the Season Election is the third term's national election** (the count into season day 83, confirmed into the new season's day 0); no new phase, no clock time. **The season's score** per faction = the sum over the season's boundaries of **the party's control share** (its National Control ÷ the three parties', §14.8) **+ 100 per national election won** (the 10 above is raised: at 10 an election was a third of one day's lead; at 100 a win is worth about a month of a four-point lead; Appendix C #81). **The Champion** is the top score at the confirmation; every member in the faction for 14 days gets **Legacy +5** and the title *Champion of Season n* (the cosmetic). **Four awards**, Legacy +5 and a title each: *Top of the ledger* (the most opinion moved, one per Level bracket), *Most titles* (Hero titles), *Best orator* (Triumphs as a Speaker or Organiser), *The spymaster* (Case Files used); ties to the earlier. **The Hall of Fame** is a `seasons` document per season (the Champion, the scores, the three Presidents, the four award holders) with a page off Parliament and the republic sheet. The republic sheet carries a season card (the day of 84, the scores, the election's date); the paper gives a week's notice and a front page on day 0.

### 22.2 Rollover (the first day of the new season)

| Resets | Stays |
|---|---|
| City influence moves **50 % of the way back to each city's starting baseline** | Level, Rank, stats, items, Iron |
| All laws and ordinances expire | PC, Favour, Legacy, Dossier |
| Heat drops to 0 | Criminal Record (minor points keep expiring on their own) |
| Season Standing and the season track | Ambition progress |
| The Issue deck is refreshed | Offices won at the Season Election (they take office normally) |

**Slice 8 (pinned):** the rollover is the new season's day-0 boundary job after the national seating: every city's and district's opinion moves 50 % of the way to its baseline with Neutral the counterparty (a home city never below 50); **every law and council rule in force ends** (the councils' next order papers start the rules again); Heat to 0; the deck reshuffled for the Monday's draw; the season's counters cleared. **Stays, in full:** Level, Rank, stats, items, Iron, the home and its rent, Political Capital, Favour, Legacy, the Dossier, the record, Ambition progress, seniority, residence, offices won. The player reads *the map settled halfway; your coat, your flat and your Dossier are where you left them*.

### 22.3 Season Twists

Each season adds **one rule change** to the setting, announced a week in advance:
- *The Long Winter*: winter lasts 6 weeks; Bread Prices and Flu come up more often.
- *Foreign Loan Crisis*: economic Issues dominate; Iron is scarcer.
- *Direct Rule in Duskwall*: Duskwall's council is suspended and its Governor is appointed by the head of government.
- *Free Press Spring*: exposés +50 %; propaganda −25 %.
- *The Great Exhibition*: social missions and CHA matter twice as much; a new patron arrives.
- *The Upset*: for this season only, one home city loses its 50 % floor and can genuinely be contested (§14.11). Rare, and never the same city twice in a row.

**Slice 8: no twist in season 1** (the paper says *No twist this season* once; Appendix C #80). The *Free Press Spring* multiplier on exposés is wired as the swing's multiplier so that the twist is content when it comes.

### 22.4 Season track

**Season Standing** points come from Directives, events, votes cast, Issues and offices held.
- **Free track** (30 tiers): Iron, outfits, patron introductions, Rested refills, a season title.
- **Premium track:** **cosmetic only** (outfit styles, profile frames, headline typefaces).

**Slice 8: the track is not built** (Appendix C #80); season 1 has the election, the Champion, the awards and the rollover.

---

## 23. Monetisation

### 23.1 Energy Packs

| Pack | Energy | Price |
|---|---|---|
| Small | 25 | $0.99 |
| Medium | 60 | $1.99 |
| Large | 120 | $3.49 |

**New:** you can receive at most **120 purchased Energy per City Day**, and the Premium daily pack counts toward that cap. The v3.0 Weekly Bundle (300 Energy) is removed because it gets around the daily cap.

### 23.2 Premium ($9.99/month)

- Energy cap 120
- One free Large Pack per day (within the daily cap)
- ~~Remote Work for Tier I–II jobs~~ (retired with the shift, §9; a replacement perk is open)
- The season premium track (cosmetic)
- Profile cosmetics: badge frame, title suffix, colour theme
- Priority support and beta access

**Removed from v3.0:** the "Premium Mission" (+50 % XP, no Energy cost), which let players buy progress.

### 23.3 Never for sale

Votes, PC, influence, offices, endorsements, Favour, Legacy, stats, XP, FXP, Heat reduction, record clearance. eRepublik is widely said to have declined because money could buy power, and we won't repeat that.

### 23.4 Faction Reset token

Paid. Switching faction vacates your offices, resets your tenure, and halves your PC (§15.2).

---

## 24. The player's journey

See §3.6 for the timeline. In more detail:

**Phase 1 — The Recruit** (week 1; home city; Level 1–10; Rank 1–2)
- The origin story; an Ambition chosen; a faction, and so a home city.
- The Morning Paper's welcome edition and the Party Directives explain everything.
- First job, first outfit, first surveillance, first tier-2 mission.
- **Day 2: first vote**, in the home council race. First Campaign Event (a Canvass Drive).
- Name in print for the first time as City Hero (bracket 1–15).

**Phase 2 — The Organiser** (weeks 2–4; home city, first trips out; Level 10–20; Rank 3)
- Level 10 opens the train: the first trip to a battleground, the first journey event.
- Rank 3: stands for the home council (if *Known* locally and endorsed); schedules own Campaign Events.
- First illegal mission, first Heat, maybe a first night in jail and a faction mate posting bail.
- First Case File; Associate with a patron.
- **The move:** chooses whether to move to a battleground or stay home and rise in the party.

**Phase 3 — The Councillor** (months 2–3; home or a battleground; Level 20–40; Rank 3–5)
- Council terms won and lost; **Governor or Mayor** after a term; Faction Chair at Rank 4.
- Spy trips into rival home cities; the first exposé that brings down an NPC official.
- A flat, then a townhouse; Confidant of a patron; the Ambition's middle chapters.
- The first Season Election as a campaigner.

**Phase 4 — The Deputy** (end of season 1 and season 2; Level 40–55; Rank 5–6)
- **Legislature deputy**, first law proposed; appointed Minister.
- Stands in the faction primary for head of government.
- The Ambition's climax; Protégé of a patron.

**Phase 5 — The Power Broker** (season 2 onward; Level 55+; Rank 6–7)
- President, Speaker, or kingmaker.
- Tier V regalia, a villa, Legacy perks, the Hall of Fame.
- Mentors the next generation through Directives and events, and has to win power again every term.

---

## 25. Scope and roadmap

| Feature | Launch (MVP) | Launch + 60 days | Later |
|---|---|---|---|
| Origin Story + Ambition choice | ✔ (1 Ambition fully built, 2 with 4 chapters) | All 3 complete | New Ambitions |
| Morning Paper, Directives, Issues | ✔ | | |
| Energy, Rested, Heat, PC, Well-Fed buffs | ✔ | | |
| Jobs (wage + seniority) | ✔ | | |
| Dossier + Case Files | ✔ | | Player Dossiers (v1.5) |
| City Councils, Governors, ordinances | ✔ | | |
| Capital districts (5) | ✔ | | Districts in other cities |
| Home cities, battlegrounds, morale | ✔ | | |
| Hostile ground (rival home cities) | ✔ (4 journey events, 3 encounters) | Full decks, missions only possible there | |
| The office ladder | ✔ | | |
| Mission tiers, Local Standing, result modal | ✔ | | |
| Homes | Rented room and flat (slice 8; the rent that waits) | Townhouse, villa, a second flat, the map marker | |
| The Wardrobe (slice 8) | ✔ (four slots, no weapon; two outfits and *Evening*; eighteen items, Tiers I–IV; five shop kinds) | Tier V, crafting | Player trading (v1.2) |
| Timed travel + journey events | ✔ (train, night train; 5 events) | Car, first class, full event deck | |
| National elections, Parliament, the President (slice 7) | ✔ | | |
| Ministers | | ✔ | Treasury (v1.2) |
| NPC fill | ✔ | | |
| Faction chat and presence | ✔ | | Forums (v1.1) |
| Campaign Events | ✔ (Rally, Canvass Drive, Poster Night, the three signature events, the secretary's daily fixture; **the Town Hall and the Chair's events, slice 7**) | | Counter-Demonstrations (v1.1) |
| Patronage | ✔ (2 patrons: Crane and Marr; Requests, gifts, the four tiers' perks) | All 5 | New patrons each season |
| Legacy | ✔ (the record **and the eight perks**, slice 8) | | |
| Dossier uses | ✔ (the exposé, the sale, the informant) | Blackmail, Denounce | |
| Hospital and jail storylets | ✔ | | |
| Political Seasons | Season 1: the Season Election, the Champion, four awards, the Hall of Fame, the rollover (slice 8; **no track, no twist**) | The free track; the premium cosmetic track | Twists each season |
| Bodyguards (Protect) | ✔ | | Eliminate (v1.5) |
| Moderation, anti-abuse, telemetry, Settings, *While you were away* (slice 9) | ✔ (the report and the ladder, the console, linked accounts and the audit, first-party metrics, the five-line Settings, the away row) | PostHog or another analytics tool if the report is not enough; a high-contrast theme if the contrast pass asks for it | The returning-operative chapter |
| Player trading, faction treasury | | | v1.2 |
| Second region | | | v1.3 |
| PvP (duels, player intel, bodyguard Eliminate) | | | v1.5 |

---

## 26. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Players bring real-world political hostility** | High | Fictional, stylised factions; strict terms of service; chat moderation (slice 9: the four-reason report, the filter, the ladder from a note to closure with real-world hate straight to 14 days, the console; §16.2); no real-world symbols; no player-written public articles before moderation tooling exists |
| **Presenting a fascist faction** | High | The Vanguard is written as a period antagonist faction, not an aspiration. Named-symbol blacklist; review of all Vanguard content |
| Elections with few players feel empty | High | NPC fill; the influence half of every score; NPC-to-player ratio shown openly |
| A dominant faction steamrolls | High | No control multipliers; Battleground and Groundswell; petitions to dissolve a council; Parliament's majority rule (31 of 60, the local deputies following their Chairs, so a President without 31 seats needs a rival bloc); season rollover |
| Multi-accounting and vote-stacking | High | One account per person; network checks; 24 h audit; tenure requirements; nothing transferable for anyone (slice 9: linked accounts' ballots count once, the audit that confirms itself, sign-up caps per device and network; §15.2) |
| Politics overwhelms new players | Medium | Directives as the tutorial; the Morning Paper; Canvass Drives; council candidacy guided in Phase 1 |
| Too many currencies and meters (Energy, Rested, Heat, PC, IM, Favour, Legacy, Season) | Medium | The Morning Paper "desk" shows them together; PC and Favour appear only after first use; Legacy lives on the profile |
| Directives from a bad Chair | Medium | Players can ignore Directives; the Chair picks from the secretary's own templates and writes no free text; the secretary is always on the Chair's ballot; a vote on the Chair (two thirds of members voting) by petition, and automatically on Unrest (§15.4) |
| Laws that break the game | Medium | Fixed bounds; a 5-law cap; limits on factional laws; 60 % rule |
| Toxic Chairs or officials | Medium | Recall, no-confidence, term limits, moderation |
| Stale Issues | Low | The deck grows every season; Twists; Issues triggered by events |

---

## 27. Key metrics

| Metric | Target |
|---|---|
| Day-1 / Day-7 / Day-30 retention | 45 % / 38 % / 22 % |
| Sessions per day (active players) | 3–5 |
| Share of DAU who voted in the last 5 days | ≥ 50 % |
| Share of D7 players who've joined a Campaign Event | ≥ 40 % |
| Share of players reaching Rank 5 within 30 days | ≥ 30 % |
| Offices held by players (vs NPC) | Rising every term |
| Share of D30 players who've held any office | ≥ 25 % |
| Paying players, monthly | 8–12 % of MAU |
| Faction balance | No faction above 45 % of active players |
| Share of D30 players living in a battleground | 30–50 % (too low means the battlegrounds are empty; too high means home cities are dead) |
| Median day of a player's first council seat (at scale) | Day 14–30 |
| Share of players holding any office at a given time | 5–15 % |
| Notorious within 60 days | < 15 % of players |

**How they are measured (slice 9; `docs/design/slice-9-launch.md` §2).** Telemetry is first-party, in our own database, with no chat text, name, email, address or ballot choice in it. **A player-day** is a City Day (UTC) with at least one authenticated request. **A session** is a run of requests with no gap of 30 minutes or more. **Day-N retention** is **classic**: of the accounts created on City Day *d*, the share with a player-day on *d + N*; the **rolling** figure (any player-day on or after *d + N*) is printed beside it with the cohort's size and its confidence band, because small cohorts make classic noisy. Testers flagged by the dev panel, boosted accounts and moderators' characters are left out of every figure. The `report:metrics` dashboards map one to one to the rows above.

**The gates (slice 9, §9.4 of the design).** Closed beta → open beta: D1 ≥ 40 %, **D7 ≥ 30 %**, D30 ≥ 15 % (the first two waves), sessions per player-day ≥ 2.5, voted in the last 5 days ≥ 50 %, the first modal ≥ 85 % under 5 minutes, crash-free sessions ≥ 99 %, no P1 open for seven days, the audit run on one national count, the moderation queue under 24 hours, every performance *must* met. Open beta → launch: **D7 ≥ 35 %, D30 ≥ 20 %**, no faction over 45 %, one Season Election and rollover run, the queue under 24 hours through the season. *Within reach* (the slice-9 question) means D7 at or above 30 in the closed beta and rising wave on wave with D1 at 40 or more; under 25 on the last wave the answer is no and the levers run again before the open beta.

---

## Appendix A — Glossary

These are the design's names. What a player reads for each is in §1.5 (*Reputation* for Local Standing, *Party XP* for FXP, *a council rule* for an ordinance, *a close race* for a battleground, *a comeback* for a Groundswell, *a backer* for an endorsement).

| Term | Meaning |
|---|---|
| **City Day** | One real day (00:00–24:00 UTC) |
| **Council Cycle** | 5 City Days; every city votes once |
| **Term** | 28 City Days; the national election cycle |
| **Political Season** | 84 City Days; one in-game year |
| **XP / FXP** | Experience (drives Level) / Faction experience (drives Rank) |
| **IM** | Iron Marks, the currency |
| **PC** | Political Capital, earned through politics and spent on political actions |
| **Rested** | Banked overflow Energy that gives +50 % XP and Iron |
| **Heat** | Short-term police and press attention from illegal actions |
| **Criminal Record** | Long-term reputation for offences |
| **Influence** | A faction's share of a city's opinion |
| **National Control** | Weighted influence across all five cities |
| **District** | One of Irongate's five parts, each with its own opinion, control and 2 council seats |
| **Journey** | A timed trip between cities by train or car, with an optional event on the way |
| **Home city** | A faction's permanent base: Duskwall, Coalport or Ashford. New players start there |
| **Battleground** (city) | Irongate or Clearwater, where the three factions fight for control; 70 % of national weight |
| **Morale** | A faction's share of opinion in its own home city; never below 50 % |
| **Hostile ground** | A rival faction's home city: dangerous, double Heat, the best rewards |
| **Office ladder** | The rule that each office needs a completed term in the office below it |
| **Local Standing** | How well a city knows your face, from Stranger to One of Us |
| **Battleground** | A city or capital district with the top two factions within 10 points; +25 % influence and FXP |
| **Groundswell** | A growing influence bonus for a faction that just lost a city |
| **Issue** | A city's public concern of the week |
| **Directive** | The day's agenda set by the Faction Chair |
| **Campaign Event** | A scheduled co-op political action with roles |
| **Case File** | 3+ Dossier entries on one NPC; unlocks exposés and more |
| **Favour** | Your relationship level with a patron |
| **Legacy** | Your permanent public political record |
| **Ambition** | Your personal storyline, chosen from the office's post on the train in (§7.1) |
| **NPC fill** | NPC candidates and office-holders who fill seats no player wins |
| **Term** (national) | 28 City Days from the term epoch; the Chair in its middle, the republic's vote at its end (§2) |
| **Parliament** | The sixty-seat Legislature, split by the national scores; the player's word for it |
| **Deputy** | A seat in Parliament for a term |
| **President** | The one office at the top (slice 7); a law a week, one veto, one Address |
| **Chair** | The faction's elected head; the Party orders, the party line, the fixtures |
| **Governor / Mayor** | The top player councillor with a completed term; the Governor's rule and the Address |
| **Bill** | A law up for a vote in Parliament; three days; 31 of 60 (36 factional) |
| **The party line** | How a party's local deputies vote: the player deputies' majority, else the Chair's, else the secretary's |
| **The party's own figure** | The NPC who carries a party for President when no player does, and holds the office when nobody wins it |
| **The law book** | The laws in force, at most five, with their days left |
| **The Wardrobe** | The four slots (Coat, On you, Papers, Tools), the outfits and everything owned (slice 8) |
| **Outfit** | A named set of the four slots: *Town*, *Plain clothes*, *Evening* (with a flat) |
| **Recognition** | What a good coat, an office or a Legacy add to a run-in on rival ground; plain clothes reduce it |
| **Exposé** | A Case File taken to a newspaper: three steps, a swing against the name's party, the front page |
| **Request** | A patron's letter in the paper: an order-shaped task worth +6 Favour |
| **Informant** | A Case File turned with a patron's help: an entry every second morning for fourteen days |
| **The back room** | A bar's shop from Rank 3: forged papers, wire cutters, the bribe that clears a mark |
| **The season's score** | The daily control share summed over the season, +100 per national election won |
| **Champion** | The faction with the top season's score at the Season Election |

---

## Appendix B — Impact on the current codebase

The API (`apps/api`) was built against v3.0. Main changes:

| Area | Current | Change for 3.1 |
|---|---|---|
| `jobs/workers/energyTick.ts` | 5 Energy per 5 min | 5 per 10 min; overflow into Rested |
| `jobs/workers/healthNeglect.ts` | Hunger/fatigue HP drain | **Remove.** Buffs are timestamps on the character; no worker needed |
| `jobs/workers/jobAbsence.ts` | Fires after missed shifts | **Replace** with a daily payroll at the boundary (full wage, seniority), settled lazily |
| `jobs/workers/bodyguardUpkeep.ts` | Daily fee; dismiss if unpaid | **Replace** with contract expiry |
| `jobs/workers/electionCheck.ts`, `electionConclude.ts`, `presidentTerm.ts` | Election triggered at 55 % | **Replace** with a calendar scheduler: a daily council election, a national election every 28 days, season rollover |
| `jobs/workers/lawExpire.ts` | Law expiry | Keep; add ordinance expiry. Bounds checked in `services/ruleEngine.ts` |
| `jobs/workers/influenceDecay.ts` | 1 %/day decay | Keep; add Battleground and Groundswell calculation |
| `jobs/workers/criminalDecay.ts` | Minor-point expiry | Keep; Heat cooling can be calculated when read |
| `jobs/workers/weatherRotate.ts` | Weather rotation | Per city, per City Day; 21-day weather seasons |
| Mission checks (`services/missionService.ts`) | Success chance = a base value plus small STR, INT, CHA and equipment bonuses, capped at 95 %; outcome bands at 65 % and 30 % of that chance | Replace with the §8.4 formula (50 % + 4 % × (stat − difficulty) + bonuses, 5–95 %) and the Success / Partial / Failure bands; return the breakdown so the result modal can show it |
| Combat (`services/combatService.ts`) | Up to 10 rounds simulated, armour and bodyguard reduction | Keep the simulation on the server, but expose it as one choice: return the odds for Fight, Flee, Bluff and Bribe (§20.1) before the player picks, and one result after. Add opponent AGI, Wits and bribe values (§20.2) |
| Travel (`services/characterService.ts`, `routes/character.ts`) | Instant move, Energy cost | Timed journeys: a Journey record with departure, arrival, mode and event; arrival resolved by a `journeyArrive` job; no Energy cost |
| New workers | — | `journeyArrive`, `issueRotate` (weekly), `directiveReset` (daily), `campaignEventResolve`, `patronRequests`, `seasonRollover`, `morningPaper` digest |
| Schema (new) | — | District, DistrictInfluence, Journey, Office, OfficeTerm (for the ladder), CouncilSeat, Ordinance, Issue, IssueMomentum, InfluenceLedger, LocalStanding, CampaignEvent, EventRole, Directive, Patron, PatronFavour, LegacyEntry, AmbitionProgress, Home, Season; City gets `role` (home or battleground) and `homeFactionId`; new Character fields: `heat`, `politicalCapital`, `rested`, `homeCityId`, `homeDistrictId`, `workStreak`, `sickDaysLeft`, buff timestamps |
| Starting city (`services/authService.ts`) | Every new character starts in Irongate | Start in the faction's home city (§7.4); the seed data needs `role` and `homeFactionId` per city, and the national weights 40/30/10/10/10 |

---

## Appendix C — Open questions

1. **Day boundary:** ~~UTC midnight, or the main audience's region?~~ **Closed for the MVP (29 Sep 2026): 00:00 UTC** (§2.2). Every daily rule is written per boundary crossed, so moving it later is a constant, not a redesign. Revisit with telemetry if the audience clusters far from UTC; ~~the night window (20:00–06:00) moves with it~~ (since review 5 the night is the last two hours of every six-hour game day counted from the boundary, §2.2, so the four dawns move with it).
2. **Election weighting:** is 50 % popular vote / 50 % influence right? Low-population servers might need more weight on influence at first. **Answered for the MVP's councils (29 Sep 2026, slice 4):** the ballot half is worth its full 50 % from ten ballots in the district and five points per ballot below (§15.3), so one ballot in a tied district decides a seat without wiping out the meter. Revisit the constant (ten) from the slice-4 count tables. **Answered nationally (3 Oct 2026, slice 7):** the same shape with the weight at **thirty ballots** across the republic (§15.5), so a handful of ballots tilts a level republic without wiping out the five cities' work; the constant is the lever, and the capital's ten and the nation's thirty should be retuned together from the first national count.
3. **NPC visibility:** ~~should NPC office-holders be clearly marked, or blend in with players?~~ **Closed (29 Sep 2026): marked.** The faction's small mark in place of a face and *ward* in place of a rank title, on every political list (§15.10). Blending in would make "a growing player base can see itself taking over" impossible to see.
4. **Counter-Demonstrations:** they'd give the game its first faction-vs-faction contest. MVP or v1.1?
5. **Season length:** 12 weeks, or 8 to keep it punchier?
6. **Ambition at launch:** ~~which of the three gets fully built first? "Finish His Work" teaches politics best.~~ **Closed (29 Sep 2026): *Finish His Work* first**, to twelve chapters; the other two get chapter 1 in slice 2 and four chapters by launch (§17.1). *(Review 5, 8 Oct 2026: the Ambition is now *The Names on the Stone*, same id `finish-his-work`; the decision stands.)*
7. **Vanguard presentation:** ~~it needs a content and moderation policy before public testing.~~ **Content policy closed (29 Sep 2026):** the vocabulary rules and the review of every Vanguard string are in `docs/design/content-policy-review.md` (ranks, the Grand Rally, Duskwall as a customs town, chalking as words). ~~**Still open:** the chat moderation policy before public testing.~~ **Chat moderation policy closed (4 Oct 2026, slice 9):** the policy, the four-reason report, the filter (refuse or flag; lists outside content), the ladder, names and renames, and the console are in §16.2 and `docs/design/slice-9-launch.md` §5. The lists themselves are reviewed by the user before the closed beta.
8. **Journey times: closed (2 Oct 2026, the user decided).** Keep the planned **12 / 12 / 15 / 25**, not the painted distances. The playtest report still measures journey-screen dwell (do players wait, or close and come back?) as a measurement; reopen only if that number says the near legs are a wall. The original question: are 12–25 minutes right, or should the nearer cities be shorter (5–8 min) so a trip fits inside one session? **Checked against the painted nation (2 Oct 2026):** straight-line distances from the capital are Ashford 0.54 of the picture, Clearwater 0.48, Duskwall 0.46, Coalport 0.43, and the painted lines read *Ashford ≥ Clearwater ≈ Duskwall > Coalport*; so the table over-lengthens Clearwater and under-lengthens Ashford. Kept anyway, because equal times for the three home cities are fairer to the three factions (a member's round trip home is the train's main use) and Clearwater is not in play. The alternatives put to the user (equalise the three home cities at 12 or 15; follow the art, Coalport 12 · Ashford 15 · Duskwall 15 · Clearwater 20) were not taken. The art also paints a southern line between Coalport and Clearwater that misses the capital: scenery in slice 4; **slice 7 decided: no direct service** (§14.10), so the three home cities' roads to Clearwater stay within three minutes of each other (37 / 37 / 40); a direct Coalport line would give one party a fifteen-minute edge to 30 % of the republic. Reopen only with a timetable that gives each home city a direct line to one battleground.
9. **District weights:** ~~should the Government Quarter count for more than the other four districts in Irongate's average?~~ **Closed (29 Sep 2026): equal weights for the MVP** (§14.9). A weighted average would make the Quarter the only district worth fighting in; the Battleground bonus already follows the fight wherever it is.
10. **Faction naming** (parked): plain names (Fascists, Communists, Democrats) everywhere, plain names first with party names as flavour, or keep the party names (Iron Vanguard, Red Collective, Civic Alliance) with the ideology stated.
11. **Who starts where at low population:** with few players, should new players start in a battleground instead so they meet rivals sooner?
12. **Origin story stacking:** ~~§8.5 says the origin gives "up to +5", but the §7.2 answers can stack to +8 INT (library, watched, read people) or +8 STR. Either cap the stack at +5 or accept +8 and say so.~~ **Closed (29 Sep 2026): the answers stack as written** (8–9 points counting CHA base, of which 6–9 across STR/INT/AGI; at most +8 to one stat; CHA base up to +4; best stat 8–16; §7.2, §8.5). **Moot since review 4 (6 Oct 2026):** the prologue has one stat choice (+6 and +1), no CHA base, and every build starts in the coat (§7.1, §8.5).
13. **Opinion swing at scale: closed (4 Oct 2026, slice 9).** ~~The §14.2 swing rates suit a few dozen active players per city. With hundreds, the meters would move tens of points a day against a 1 % drift. Options: a per-city damping factor (swing × 20 ⁄ active players there, floor ×0.25), a faster drift, or a per-faction daily cap per city. Decide once slice 4 has telemetry.~~ **The damping factor is built** (§14.2: `clamp(20 ÷ active, 0.25, 1)`, *active* the seven-day mean of distinct daily contributors), the identity below twenty so nothing built so far changes. Chosen over a faster drift (which punishes small branches) and a per-faction cap (which makes the third tap of a big branch worthless). The 20 and the 0.25 are checked by the scale simulation before the open beta (`slice-9-launch.md` §3.1); if a city of a hundred still moves more than ten points a day, lower the floor to 0.15 before touching the 20.
14. **Rested and heavy players:** a six-session player earns little Rested and still levels about 35 % faster than the reference player (`docs/economy.md` §6): Level 10 on day 3 and Level 16 on day 8. Intended, but if telemetry shows most players are heavy the level table will read fast. The lever is the §5.3 table, not the Rested bonus (§6.3 is a pillar).
15. **Level-up points vs the training targets: closed (3 Oct 2026, slice 5).** ~~+1 stat point per level alone gives the reference player +9 by day 5 and +19 by day 20, which meets the §8.5 "best stat" targets (week 1 ~15, month 1 ~30) without any training; training on top overshoots (INT ~30 by day 7). Reconcile before tier-2 difficulties (14–20) are set in slice 5.~~ **The rule stays and the targets were raised** to what it produces (§8.5: day 1 ~12, week 1 ~28, month 1 ~50, month 3 ~85); tier-2 difficulties are a ladder set against the modelled stat (§8.4: 14 / 16 / 18 / 20 at Level 6 / 8 / 10 / 12), so new content sits in the 60–85 % band whatever the stat's absolute size. The alternative (a point every other level) would have slowed the stat and left the targets, and was not taken: the level-up's choice screen is the rule's reason. Revisit only if telemetry shows the stat outrunning the ladder (odds on fresh content above 85 % at its Level for most builds).
16. **Opinion drift before slice 4:** ~~slice 1 writes the swing but not the 2 %-a-day home drift, so a long playtest with a few testers pins Coalport near the 95 % cap. Acceptable for the slice-1 question; apply the drift lazily at the day boundary if it is cheap.~~ **Closed (29 Sep 2026): the home-city drift (2 % of the distance to 70 a day) is built in slice 3** with the council calendar's world job (§14.2, §14.11). Coalport still pins at the 95 cap with a few active testers (+5.75 a day against −0.5 at the cap), which is *Fired up* working as designed; the scale problem is #13.
17. **Salary cap on return (14 days' pay, §9.1; was 14 half-pays before the job became a wage):** "a fortnight's back pay" is a judgement, not a measured number. Revisit when the Welcome Back package (§4.2, 1 month+) is designed; it may replace the cap with a deliberate returning bonus (Rested full, a fixed Iron sum) rather than an accidental one.
18. **The welcome set is per character** (§13.7) while every other day's orders are faction-wide. ~~A character created at 23:50 UTC gets a ten-minute first City Day and the rotation the next morning. If the slice-2 playtest shows late-evening sign-ups losing the welcome set before they finish it, extend it to the second City Day when the first was shorter than two hours.~~ **Closed (30 Sep 2026, review 1): the welcome day is the City Day of creation plus the next one when created after 22:00 UTC** (§8.4, §13.7). The *First day* bonus made the short-day case sharper, so it is pinned rather than waited for.
19. **The face has no effect** (§7.3): eighteen portraits (six until slice 4; five redrawn in review 4), cosmetic only. Keep it that way; the moment appearance carries a bonus, the choice stops being about the player and starts being about the number.
20. **Ambition failure texts on day 1:** chapter 1 can end in *Failure* (25 XP, the keepsake, no Iron) on a player's first hour. It is written as a setback, not a loss, and the chapter still completes. If the playtest shows new players reading it as "I failed the tutorial", raise chapter 1's difficulty floor to Partial (no Failure band) rather than lowering the difficulty.
21. **The first ballot lands on day 2–4, not day 2** (§5.2, §15.3): polls are open three days in five, so 40 % of new players wait a day or two after Rank 2, told by the paper. If the slice-3 playtest shows the wait killing the moment, the lever is a four-day poll with a one-day nominations window (harder on casual candidates), not polls that never close.
22. **The ward-vote weights** (§15.3): Standing Successes ÷ 5 for players and the 44…15 NPC profiles were set so that a day-10 reference recruit alone in a city tops the poll by a hair and a day-14 casual takes the second seat. Retune from the slice-3 count tables if lone players never top, or always do by twenty.
23. ***Fired up* is the normal state** of any city with an active branch (§14.11), so its +10 % Faction XP is a permanent acceleration for active factions rather than a reward for turning the city round. Accepted for the MVP because the states need visible numbers; if rank pacing runs fast, lower the bonus before touching the thresholds.
24. **The small-branch endorsement rule** (§15.3: the branch's endorsement counts double when fewer than three other endorsers live in the city) exists so that one player can stand. At scale it never fires. If players find the branch's endorsement (do the day's orders) too easy a route, require it on both days of the window rather than one.
25. **No running totals during polling** (§15.3) keeps the ballot secret and vote-stacking invisible until the count, at the cost of the "it's close, turn out" hook. Revisit with turnout numbers after slice 3; a turnout count without candidate totals is the middle ground.
26. ***Against all* cannot block: closed (3 Oct 2026, slice 7).** ~~NPC councillors vote for the leading player choice or the branch's motion, never against, so a council of players who all vote *Against all* still passes the branch's motion. Chosen so that one seat can't leave a city without an ordinance out of spite. When a Faction Chair's whip exists (slice 7), decide whether a unanimous *Against all* by player councillors should make the NPCs abstain.~~ **Decided:** the locals abstain when **four or more player councillors** of a home council vote *None of these* (a real majority of seven); below four the party's rule passes as before (§15.3). In the capital and Clearwater the bloc rule already lets players block. The chain for a local is the player councillors' leading item → the Governor's rule → the Chair's rule → the secretary's.
27. **Rank 2 to move** (§14.11): the GDD's first draft said Rank 3. Lowered because the ballot is the first thing a resident does and Level 10 (the train, day 5) already gates the move; Rank 3 stays for standing. If the slice-4 playtest shows Rank 2 players moving before they understand their home branch, the lever is a day count since creation, not the rank.
28. **No early Issue resolution** (§14.6): the GDD's "or early if one faction reaches the momentum threshold" is deferred. Sunday-only keeps every week's fight alive to the end and needs no threshold. If telemetry shows lopsided weeks (one faction with ten times the momentum by Wednesday), add a **decided** state that ends the +50 % and the momentum race early while the effect still starts on Monday.
29. **Groundswell at low population** (§14.4): it fires only after a faction has crossed 50 in a district and then fallen back, which a handful of testers may never do. Built anyway (it is small and it is the anti-snowball rule); if it never fires in the playtest, seed one district above 50 for a week to see it once.
30. **Cross-faction ballots** (§15.3): any resident may vote for any name on the district ballot, so a member can vote a rival's candidate in. Chosen because a citizen votes for a person and because it is the only way a three-way count has tactics at low population. If it produces griefing (members voting the weakest rival in to split a bloc), restrict the ballot to the member's own faction plus NPCs.
31. **Seniority counts absent days** (§9.1): a player who takes a job and leaves for ten days returns at the full +20 % rate. Chosen so that absence never lowers a rate (§4.3), and because the 14-day cap bounds the sum (at most 14 × 1.2 × 216 for the Stores hand). If it reads as a reward for leaving, count only boundaries on which the player was seen in the previous seven days, never resetting.
32. **Best-stat council sessions** (§13.3): the committee is now the best-odds action in every home city and already the best FXP per Energy, so a rank-chaser can live at the HQ. Accepted: it pays no opinion, and slot B names it one day in four. If the Standing and morale ledgers show HQ-only players, lower the council FXP multiple from 1.5× to 1.25× before touching the check.
33. **The *First day* bonus is +10 % for one day** (§8.4): sized so the flattest build sits at 60 % and the day-2 odds are never lower. If the playtest shows day-2 odds reading as a drop anyway (the bonus row disappearing is visible in the ledger), the lever is a taper (+10 / +5 over two days), not a larger number.
34. **AGI level points** (§5.3): the §8.3 milestones (AGI 30 at −1 Energy on stealth) were set for a stat that grew only by training and stealth; an AGI-first player with a point a level reaches 30 about week 4. Harmless until stealth missions exist (slice 5); retune the milestones with them. **Noted 3 Oct 2026 (slice 5):** the milestones stay later (AGI 30 is about day 24 for an AGI-first build); slice 5's Agility effects are the caught check's −1 % per two points (§11.2, which reaches −15 at AGI 30, the milestone's figure by another road) and the quarter point per Agility Success (§8.5). Retune §8.3 when a build reaches 30 in play.
35. **No percentage anywhere** (§8.4, review 2): the odds are three words (*Good odds* from 70 %, *Fair odds* from 50 %, *Long shot* below) and a result gives a reason, never a number. Chosen because the user said the outcome is what matters and a first-time player reads a word faster than a figure. If the playtest shows players asking "how good?", the fallback is a bare percentage on the ticket only (no ledger, no roll), which is one line of `copy.ts`; the reason lines stay either way.
36. **Plain over period** (§1.5): *flyers* over *handbills* or *flyers*, *put up* over *paste*, *fences* over *hoardings*. Where the plainest word and the 1946 word differ, the plain word wins in titles and labels, and the period lives in the body texts' nouns (the duplicator, the ration, the tram). If the playtest shows the voice thinning, the lever is the body texts, never the titles.
37. **The Alliance's Rank 2 title** is *Campaigner* (was *Canvasser*, §5.4). The other twenty titles were checked against §1.5 and stand; *Agent* and *Steward* are plain, *Bailiff*, *Prefect* and *Intendant* are period titles a player learns from the rank ladder's help note. Revisit only if testers stumble on them.
38. **Quarter gates at Level 6 and 10** (§14.13): set so the second quarter opens with tier-2 play (the reference player's day 2) and the third with the train (day 5). If the playtest shows the second quarter opening before players have used the first (Standing in Coalport still *Stranger*, under ten wins, when the Harbour opens), raise to Level 8 / 12; the lever is the Level, never a day count, a Rank or the clock.
39. **The seamless giant map: closed (1 Oct 2026).** The user chose the stitched model outright: one painted picture per city, quarters and districts as frames on it, the overview the whole picture zoomed out (§14.13, §14.9; `docs/design/maps-v3-integration.md`). The Mill–Harbour seam experiment of `city-quarters.md` §6 was never needed and is dropped. Still open under this model: the first-view letterboxing on wide screens where a quarter's pins span most of the picture's height (Duskwall's Goods Yard), and whether a later quarter's frame is its own box or "all open places" (`maps-v3-integration.md` §8 Q3 and Q5); both are frame tuning in the dev viewer, not rules.
40. **Clearwater's six places: closed (3 Oct 2026, slice 7).** ~~Provisional, chosen so the art set is consistent; slice 7 confirms or renames them before any data is written.~~ Confirmed as surveyed (the tin chapel is *St Martin's*); nine of the thirteen surveyed places are playable in slice 7 (the Depot and the Harbour) and the Front's four open with the Wardrobe (§14.1, `docs/design/slice-7-nation.md` §9.2).
41. **A district beyond six places** (§14.13): the capital's districts are its quarters, and a district that needs a seventh place gets a second frame on the capital's picture under the same district meter, council seats and Issues (the Government Quarter has its seventh, the City Hall, inside its one frame; review 4). **Since review 4 the five districts tile the whole picture** (§14.9), so a sixth district is a split of one of them (the southern town out of Station & Market and Eastside is the obvious one), never new land. Decide only when a district's reserved spots are used up.
42. **The nation map on a phone: closed (2 Oct 2026, the user decided).** It **fills the screen** like the city maps (§14.10): an upright phone sees about three-quarters of the republic's width, the at-rest view is centred on the player's city and the capital, and the rest is a drag or a Cities-list tap away. Chosen for consistency with the city maps and because the distance is the point. The alternative (the nation map alone fitting whole, with paper bands above and below) was not taken.
43. **The Bombed Blocks: closed (2 Oct 2026).** The capital's painting does show a gutted block behind Market Square (about x 0.53–0.59, y 0.59–0.66); the survey pin sat at its lower edge and was moved onto it (0.56, 0.645 → **0.555, 0.62**, in `mapPins.ts` and `pins.json`). The name stays; the blurb names the roofless shells; the Station & Market frame is unchanged.
44. **Nine names in a branch of one** (§15.10; review 3): with no player standing, the vote can only decide the last seat between the bottom locals (profiles 19, 17, 15), which is by design but was never said, so the vote felt like nothing. The list now says it (*The last seat is usually close: a few votes decide it.*). **If the playtest still finds voting pointless, the lever is the fill, not the seats:** eight names when fewer than two players stand, so there is one visible loser and the votes choose who. A §15.10 number; needs the user's decision and stays nine until then.
45. **Free zoom limits** (§14.13; review 3): "the painting's finest detail" is the top tile level at 1:1 (8,640 px cities, 11,520 the capital), which on a phone is a single building filling the screen. If players lose themselves in it, cap the zoom one level below (half) before adding a reset button; the Places list and a tap on a pin are the way back either way. The out limit (the covering scale) is not negotiable: no dark bands.
46. **The parcel pays 100 Iron** (§14.10; 3 Oct 2026), five canvasses' worth, against every other card's 40 at most. Kept because the fiction needs the money to be tempting and slice 5 makes it the card that carries Heat; not farmable, since the seven cards are drawn without replacement at one journey in three (the parcel about once in twenty-one journeys after the first) and a ticket is 20. If the playtest shows players riding for parcels, the lever is the second fifty (make the barrier half a stake, not a gift), never the deck's draw rate.
47. **The run-in comes between the deed and the result** (§13.1, §20; slice 5): the check's result is held and the encounter decides whether it is paid, so a Run forfeits the mission and a loss forfeits it and more. Chosen so that §20's table (*win: the mission continues; flee: the mission fails; loss: hospital, the mission fails*) is true of a one-choice mission. If the playtest reads a Run as a trap (a free row that costs the mission), the lever is to let a Run keep Partial's rewards, not to move the roll after the result.
48. **×1 only on rival ground** (§14.12; slice 5): every tap is its own risk. Chosen over one run-in roll per batch, which favours the batch. If testers find ten taps a bar tedious there, the lever is a ×3 whose run-in is rolled per row and stops the batch at the first, refunding the rest.
49. **The record's Iron penalty is on missions only** (§11.3; slice 5): tier-1 Iron is untouched, so a record taxes the road that earned it. If a record reads as weightless to a player who lives on tier 1, the lever is to extend it to tier-1 Iron at half the rate, not to raise the mission rate.
50. **Bail is 100 + 50 a mark** (§19.2; slice 5), doubled for *Notorious* and on rival ground, halved for the Alliance. Set so that bail is two to six times the value of the time it buys, so most players wait and the few who pay are paying for the hour. **Review 4 (6 Oct 2026) made the cells cost more without an asset:** the sentence's base is **20 minutes** (was 10), the day's orders are off, and every arrest is at least one mark. If nobody ever pays bail now, lower the base back to 10 before touching the orders; if the orders being off reads as a loss rather than a missed day, the lever is to close only the open orders' bonus (+5) and let the orders themselves complete, never to pay anything back.
51. **Deportation is release** (§14.12; slice 5): the cells on rival ground end on the train home with the city barred for a day, not with a longer sentence. Chosen so a visitor's worst day ends at home. If the bar reads as punishment for turning up, shorten it to the journey time; never remove it, or the cells there mean nothing.
52. **Rival pressure's cap is 2 points a day per home city** (§14.11; slice 5), across both rivals. One determined visitor reaches it in a day; two share it. If home morale never moves at scale, raise it to 5; if a branch of one cannot keep *Fired up* against two visitors, lower it to 1 or make it per rival.
53. **Rival ground's +50 % Faction XP** (§14.12; slice 5) makes a day there about 20–45 % richer in Party XP than a home day for the specialist (`docs/economy.md` §19.6), inside the heavy player's +35 % envelope, for real risk. If telemetry shows whole branches living in rival towns, the lever is the run-in base (15 % on tier 1), not the bonus.
54. **The police are half the pool from *Noticed*** (§20.2; slice 5): at Heat 25 a run-in is a constable one time in two, who costs 300 to pay off and cannot be fought by a new player. Chosen so Heat's first state is felt in the kind of trouble, not only its chance. If *Noticed* reads as a wall, make the police a third of the pool from *Noticed* and half from *Hot*.
55. ***Known* → *On file*** (§11.3; slice 5): the record's second level is renamed so it cannot be read as the Reputation ladder's *Known* on the same Me tab. Words only; the thresholds and effects are unchanged.
56. **The caught check fires only on a Partial or a Failure** (§11.2; slice 5), never on a Success: a clean job leaves no name. Chosen because with a roll on every outcome the modelled daily illegal player was *Notorious* in four days and, since minor marks fade only after fourteen quiet days, could never come back; with this rule the same player is *On file* in two or three days, a *Repeat offender* in a week, and a week of flyers clears the minor marks. If marks are too rare in the playtest (fewer than one a week for a daily illegal player), the lever is the base rates (8–20 %), not the Success exemption.
57. **Hands at Rank 1** (§16.3; slice 6): any member may take one of four 5-Energy places on an event with no roll, so the first Campaign Event is day 1 (§5.2) and a full roster gets ×1.25. Chosen over Rank 2 for everything, which would put the first event on day 2 and leave a Recruit watching. If hands read as a loophole (four Rank 1 alts on every event), the lever is to count hands at half their Energy in the members' share, never to remove them.
58. **Three starts a city a day** (§16.3; slice 6) is the scale lever for events: a faction's event swing in one city is bounded (about 5 points a day at the very best) whatever its membership, which is what Appendix C #13's damping does for solo play. If a large branch finds the board always full, raise it to five; if events dominate opinion at low population, lower the base swings before the count.
59. **Political Capital from events halves after the first of the day** (§6.5; slice 6): 15 / 10 / 6 / 3 in full once, then 8 / 5 / 3 / 2. Chosen so a three-event day pays about 20 rather than 30–45 against the orders' 5 and the seat's 10. If events still flood the cap, the lever is two events a day, not a lower first rate.
60. **The fixture resolves at the City Day boundary** (§15.4; slice 6), not at an evening clock time, so that no member reads a time and one paper carries the orders and the event. A member who joins at 23:30 UTC gets a result half an hour later, which is fine; one who joins at 00:30 waits a day, which is the orders' rule too. If the playtest shows members wanting an evening event, the lever is a second fixture at the Chair's chosen hour (slice 7), never a clock on the first.
61. **A candidate on a ballot cannot move** (§14.11; slice-4 QA M2, 3 Oct 2026): chosen over striking the name (votes already cast would be lost) and over letting it stand with any seat it wins passing to the branch (a paper saying a member took a seat they cannot sit in). The wait is at most three days and the card names the day. If the playtest shows players stuck at home with a ticket in hand, the lever is the second option (the name stands, the seat goes to the branch's next local, the sheet says so); never the first.
62. **Volunteers at half strength make a lone member's fixture a Success** (§16.3; slice 6): (1 + 3 × 0.5) ÷ 4 = 0.625 is the band's floor by design, so a branch of one gets *Success* and never *Triumph*. If testers in a branch of one read a daily Success as a participation prize, lower volunteers to 0.4 (a Mixed for a Partial) before touching the bands.
63. **Presence is invisible on rival ground** (§16.2; slice 6): a visitor is neither counted nor named for the home faction. Chosen for §14.12's "a new player walks through Duskwall unnoticed". When recognition by fame and office arrives (the Wardrobe, slice 8), a recognised visitor should show as *someone from another party* in the count; decide then whether office-holders are named.
64. **One office at the top, the President; no Chancellor** (§15.1, §15.5; slice 7). The first draft's 55 % line made the winner a President or a Chancellor with a coalition rule that cannot work at low population and reads as two games. Chosen: one plain, faction-neutral title, with Parliament's majority rule (31 of 60, the local deputies following their Chairs) as the coalition rule. If a President with a tiny score reads as too strong, the lever is the veto (make it need a party of 20 seats or more), never a second title.
65. **Several offices at once** (§15.1; slice 7): a Chair may sit on a council, a deputy may hold a home seat, a Governor is a councillor. Chosen because one office per player would strip councils of their most active members at low population. If one player holds four offices at scale, the lever is forfeiting the lower seat on taking a higher one, starting with the council seat on taking Parliament.
66. **The secretaries table bills** (§15.6; slice 7) for a party with no player Chair and no player deputy, one a week at most, so the book has laws from the first week and the first national act of a player is to change which. If the book reads as the game's and not the players', the lever is to stop the secretaries' bills once any player sits in Parliament, never to leave the paper empty.
67. **The automatic removal at 25 %** (§15.9; slice 7; the first draft said 35 %, which three level parties would trip daily). At 25 % a President's party has lost about a quarter of the republic from level; with no player in the chamber the motion fails (the secretaries do not remove), so it is a stage for players, not a trapdoor. If it never fires, lower it to 20 before touching the forty.
68. **A petition dissolves the council; no snap election** (§15.9; slice 7). With five-day terms a snap election would land on the ordinary one and break the pure calendar; the things worth taking from a council are its rule, its Governor and its rung. The quarter-of-residents threshold (min three) means a lone player never dissolves a battleground council alone. If petitions never succeed, the lever is a fifth; if they are a weekly weapon, two days' notice.
69. **The Chair's standing orders repeat until changed** (§13.7; slice 7), so a Chair who opens the game weekly still sets every morning. The risk is a stale push to a district the fight has left; the paper's push line names the place, and the Chair's desk shows the target bar. If a stale push reads as neglect, the lever is to drop the push (not the orders) after seven days unchanged.
70. **Clearwater's baseline evened to 22 / 22 / 22 / 34** (§14.11; slice 7; the provisional 20 / 24 / 24 / 32 put the Vanguard 1.2 behind on National Control). Chosen so that §14.8's "no faction starts ahead" is true to the decimal. If the lake wants a lean for its character, give it in the Issues' effects, never the meter.
71. **The Front is a teaser in slice 7: closed (4 Oct 2026, slice 8).** ~~The promenade, the casino and the lido open with the Wardrobe and the villa (slice 8). Chosen because its places are society places with nothing social to do yet.~~ **Opened in slice 8** with the Wardrobe: four places, eight tier-1 actions, four society calls, the tailor at the Pier Hotel, the back room at the Casino, Marr's card (§13.6, §14.1). The council's hall is a crop of the Casino regardless.
72. **The party's list is ordered by backers** (§15.5; slice 7), re-expressing the GDD's "preference votes" through the backing every member already knows, so the list needs no ballot of its own. If backers cluster on one name and the rest of the list is the filing order, the lever is a second backing per member for the list only.
73. **The push resolves to the residence below Level 10** (§13.7; slice 7), so a Chair's order never names a city a recruit cannot reach. If Level 10+ members read the push as a forced trip, the lever is to pay the push's Party XP at home as well at half, never to drop the push.
74. **No weapon slot and no weapons as items** (§20.3, §21.1; slice 8): a run-in is Strength and a coat with some weight to it. Chosen because a political game that sells pistols looks armed, and §20.3's weapon tiers added nothing a coat's armour does not. If the playtest shows Fight unreachable for every build but Strength's (the reference recruit is at 41 % with a good coat), the lever is the armour values, never a weapon.
75. **Recognition's sizes** (§14.12; slice 8): +5 / +10 for Charisma, doubled at night, +5 / +10 / +15 for the office, +1 per 10 Legacy. Set so that a new player adds 0, a councillor in a good coat +10 by day, and a Governor in a greatcoat at night +30, which turns a 15 % tier-1 run-in into 45 %: a real reason to change into plain clothes. If office-holders stop visiting rival ground at all, halve the office part; if nobody changes clothes, raise the Charisma part before the office's.
76. **The exposé's swing is −1.0 / −0.5** (§10.4; slice 8), the §14.2 tier-3 band's floor, against a file that took a week of entries, with a Failure that keeps the file. Chosen so that an exposé is worth about a day of tier-1 work against a rival in that town and cannot be farmed (one a day, the name burned for 14 days, the file spent). If exposés dominate a town's meter at scale, the lever is the burn (28 days) or the daily cap per town, never the swing; if nobody writes them, lower the file's weight to two.
77. **Favour's pace** (§17.2; slice 8): +6 a Request every second day, +2 a gift, +2 a call, so a devoted player reaches Associate in about a week of attention and Protégé in three. Chosen so that the first patron perk lands in week 2–3 (§3.6) and the piece at the end of month 1. If Protégé arrives in a fortnight for most, halve the gift; if Acquaintance takes a week, double it.
78. **Blackmail and Denounce are deferred** (§10.4; slice 8): the Dossier's uses are the exposé, the sale and the informant. Chosen because Blackmail's "a favour" has no favour economy without players as names (v1.5) and Denounce removes a name from a city, which needs the control rules to read as fair. Build them with player Dossiers.
79. **The flat waits** (§17.4; slice 8): rent that runs out stops the bonuses and owes nothing; a week's rent restores everything. Chosen for §4.3 (nothing owned is destroyed by absence). If the flat reads as free (players pay a week a month and lose nothing), the lever is a re-entry fee after a month unpaid (a week's rent), never repossession.
80. **No season track and no twist in season 1** (§22.3, §22.4; slice 8). Chosen because the slice's question is whether players have month-long goals, and the Dossier, the patrons, the flat and the Ambition are those goals; a track would answer it with a progress bar. Build the free track when telemetry shows the clocks are not enough.
81. **The season score's election bonus is 100, not 10** (§22.1; slice 8): at 10 an election was worth a third of one day's four-point lead, so the Champion was the daily sum alone. Chosen so that a national election is worth about a month of a four-point lead. If the Champion is always the party with the most Presidents, lower it to 50; if elections never move it, raise it to 200.
82. **Linked accounts' ballots count once, silently** (§15.2; slice 9): the earliest ballot stands, the rest are set aside at the count, nothing is refused at the tap and no account is told. Chosen over refusing the second ballot, which would tell a household it is suspected and a ring exactly where the line is. If the audit sets aside more than 5 % of ballots in any count, the link rule is too eager before it is a ring: raise L2's interleaving count from three to five before touching the device rule.
83. **The audit confirms itself at day 0** (§15.2; slice 9) with the automatic set-asides when no moderator acted, so the republic always has a confirmed government on day 0 (§15.1's rule that nothing an absent person must do blocks anyone). If a disputed count ever confirms itself, the lever is a second moderator on term day 27, never a held result.
84. **Two accounts a device, three a network a day** (§15.2; slice 9) are the only refusals a player sees. Sized for a household's phones and a flat's shared connection; a school or an office on one address hits the three in an afternoon of word of mouth. If the sign-up dashboard shows the network cap refusing more than 2 % of attempts, raise it to five; never remove the device cap.
85. **A name may be changed once every 30 days** (§7.3; slice 9), and printed editions keep the old one. Chosen so a name is a name and a newspaper is a record. If renames are used to dodge a reputation (a Notorious player renamed before a rival-ground trip), the lever is to print *formerly {name}* on the profile for 30 days, not to lengthen the wait.
86. **The ladder's rungs** (§16.2; slice 9): a note · muted 24 h / 7 d · suspended 3 / 14 d · closed. The suspension touches nothing owned; the wage still lands, which may read as too soft for a player suspended for vote-buying. Accepted: §4.3 holds for everyone, and the suspended player's cost is the opportunity (the orders, the events, the ballots they cannot cast). If evasion with a second account is common, the lever is closure on the first evasion, never a rule that takes assets.
87. **Telemetry is first-party and the retention figure is classic** (§27; slice 9). Classic Day-N is the stricter reading and the one the targets were written against; rolling is printed beside it because a cohort of forty makes classic swing ±15 points. If the betas run under 150 sign-ups a wave, read rolling for the trend and classic for the gate, and say which in the report.
88. **The closed beta's gate is D7 ≥ 30, under §27's 38** (slice 9): an invited, unpolished beta of a few hundred reads a little under a launch. Chosen so that the gate can be met by a game that is on the way rather than finished; the launch gate (35) is the one that matters. If the user prefers the line at 38 for both, nothing else changes.
89. **Visits from anywhere but rival ground** (§19.1; slice 6; *renumbered 4 Oct 2026 from a duplicate #61*): the fiction is a parcel by the branch's runner. Chosen because a same-city rule would mean no visit ever happens at low population. If it reads as nothing (a tap from across the republic), the lever is +5 Party XP for a visit from another city and +10 from the same one.
90. **The prologue's three people are the secretaries** (§7.1; review 4): Holm, Stahl and Grey in the demob office's hall (review 5; the platform until then), so their signed line the next morning lands. The alternative (three new faces handing you on to the secretary) is recorded in `docs/design/review-4-answers.md` Appendix A. If testers find it odd that a branch secretary carries her own parcels at midnight, the lever is the new faces, not the beats.
91. **One stat choice of +6 / +1** (§7.1, §8.5; review 4) replaces three answers of 6–9 points. The reference recruit keeps INT 12 and loses STR 10 → 8; the economy sheet runs on INT and does not move (`docs/economy.md` §24.1). If the second stat's 42 % on day 1 reads as a wall for two-stat actions, the lever is +6 / +2, never a second question.
92. **The card fires at 0.20–0.80 of the journey** (§14.10; review 4), so no card fires in the first or last fifth and the player sees the train move before anything happens. If dwell shows players leaving before the card, the lever is 0.10–0.60 (earlier, never later).
93. **The Town Hall is open from Level 1 whatever its quarter** (§15.3, §14.13; review 4), so Ashford's hall (a Level-10 quarter's place in the survey) is a day-1 pin. Chosen so the council has a place from the first vote. If the hall's gallery ticket makes the first day's intelligence work too easy a habit, the lever is its Energy (6 → 8), never a gate.
94. **Orders off in the cells cost opportunity, not Party XP** (§13.7, §19.2; review 4): done orders stay paid. Chosen over a Party XP penalty (an asset, §4.3) and a Reputation drop (Reputation never decays, §13.4). If the cells still read as weightless, the lever is the sentence's base (20 → 30), never a figure taken from the character.
95. **A home city is one map** (§14.13; review 4, reversing slice 5's overview for home cities): locked places are greyed pins with a note. If fifteen pins crowd a phone at the covering scale (the closest home pair is the Pass's Checkpoint and Lock-up at 0.05, about 75 px), the lever is the Places list's grouping and the pin zoom, never outlines; if a later city needs political quarters, it becomes districts like the capital's, with the lock.
96. **A job that asks more pays more** (§9.2; review 5): each rung at least a tenth over the best pay of the rung below, the member's fifth counted, so the Driver is 240 against a member's 216. If Agility builds take the Driver on day 1 and never look back (the Level-6 jobs are not placed yet), the lever is placing the Level-6 rung (320) with the Wardrobe, never lowering the Driver; if nobody switches, raise the Driver to 250 before touching the day-1 job.
97. **Treatment is one Iron a point** (§19.1; review 5), at least 10, so a 60-point top-up costs what an enforcer's pay-off does. Set so that it is bought by the impatient and ignored by everyone else (Health comes back free). If it is bought after every run-in, raise it to 2 a point; if it is never bought, the lever is the *Won at full strength* bonus (+10 → +15 %), never a cheaper price.
98. **The journey card cannot be put aside silently** (§14.10; review 5): the only ways out are a choice or the explicit *Sleep through it* / *Let it pass* row, and the arrival modal's *Continue* waits for one. One tap either way. If the row reads as a nag on the ordinary deck, the lever is to hide it on cards that pay nothing for ignoring (all but the hostile ones), never the scrim.
99. **Three clouds and two wisps by day** (review 5), none narrower than 0.36 of the picture, from the five existing day sprites; ten images by day, eight by night. If the sky reads as empty on a wide monitor, add two big day clouds to the pool before adding a slot; never bring the puffs back.
100. **The six-hour game day (§2.2; review 5; decided by the user 8 Oct 2026).** Night is the last two hours of every six from 00:00 UTC, the same for everyone; every daily rule stays on the real day. The lever if four nights a day reads as too busy is **eight hours with a three-hour night** (three a day), never a per-player night (a shared town has one sky) and never a shorter City Day (option C: four sets of orders a day breaks the rhythm short sessions depend on).
101. **Night patrols on rival ground (§14.12; review 5; decided by the user 8 Oct 2026, with the stop made random).** A higher run-in base while acting (25 on tier 1, +10 on missions) and a *Patrol* card at 12 % per ten-minute bucket on a city read (by Heat and the flags, 5–40; at most two a night per city; fifteen quiet minutes after any stop or run-in); never on an act, a timer, or with the app closed; never at home or in a battleground. If the stops read as a toll, lower the 12 to 8 before touching the cap; if nobody meets one, raise the cap to three before the 12; if the night is not noticed at all, raise the tier-1 base to 30 before touching missions.
102. **The Unrest prize (§14.11; review 5; decided by the user 8 Oct 2026):** +50 Party XP, a headline and Legacy +2 to members with ≥ 0.5 points moved in the town in seven days, once per entry per city and at most once in seven days per city (per city, so at most 100 a week across both rival towns). Bounded to a quarter of a day's Party XP a week per city. If one party farms a wobbling town, lengthen the seven days to fourteen; if the prize never pays, lower the 0.5 to 0.25 before raising the 50.
103. **Closed (8 Oct 2026): the user confirmed round 3, *Coming home* (§7.1; `docs/design/review-5-answers.md` §19).** The lever if the premise still reads as thin is the beat-1 narrative, never a fourth beat. *The record:* **The opening's premise (§7.1, §17.1; review 5; the user picks).** A first round on the father (`docs/design/review-5-answers.md` §1) was not taken; the second (§16.2–16.6 there) has no father: *The warrant*, *After the count* (recommended: a ballot-box clerk who counted for every party and none quits neutral on the night of a count; the long story ends with their own name read out in Parliament) and *The frontier train*. Whichever is picked, the mechanics, the eight taps and the Ambition ladder's numbers and ids stand; if the chosen premise still reads as thin in the next review, the lever is the beat-1 narrative, never a fourth beat.
104. **The result modal's folds (§13.1a; review 5):** the receipt's notes behind *Details*, three knock-on lines and *n more*, a short scroll (≤ 100 px) accepted on a 740 px phone for a ×3, a reason line or a run-in. If testers open *Details* on most results, the first thing to come back out is the opinion's meter line (*Collective 70.1 → 70.3 %*), never the breakdown; if the knock-on's *n more* hides the order's signed line too often, the priority moves the order above Heat.

