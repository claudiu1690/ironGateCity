# Irongate City — Game Design Document v3.1

*A political, text-driven browser RPG*

| | |
|---|---|
| **Version** | 3.1 (draft) |
| **Supersedes** | v3.0 (`Irongate_City_GDD_v3.docx`, 13 Mar 2026) |
| **Last updated** | 29 Sep 2026 |
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

**New in 3.1:** Issues of the Week, Heat, Political Capital, Patronage, Legacy, Ambitions, Political Seasons, Jail, Home City, NPC fill, Capital Districts, Journeys, Mission tiers, Local Standing, the Office Ladder, Home cities and battlegrounds, Hostile ground, Homes.

---

## 1. Vision

### 1.1 Pitch

Irongate City is a persistent browser RPG about **winning power, not fights**. Three political movements compete for five cities through canvassing, rallies, propaganda, espionage and elections. Players who win office pass laws that **change the rules of the game for everyone**. Each player also has a personal story running through the public one. It begins at their father's deathbed and ends, if they're good enough, in the Legislative Chamber.

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
   - **Short text.** Narrative is 2–3 lines of copy: an outcome text is **at most 240 characters and four sentences** (about 45 words), which wraps to five or six lines on a phone. Numbers are always visible.
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

---

## 2. Time model

Every system uses the same clock.

| Unit | Length | What happens |
|---|---|---|
| **Tick** | 10 min | Energy regen, HP regen, Heat cooling |
| **City Day** | 1 real day, 00:00–24:00 server time (UTC) | Daily resets: weather, salary and seniority, Directives, bar limits. **Polls are open somewhere every day**, and every day some city counts, seats a council or divides on an ordinance. |
| **Week** | 7 City Days, from Monday 00:00 | Issues of the Week rotate; patron Requests refresh |
| **Council Cycle** | 5 City Days | Every city elects its council once per cycle, staggered by one day (offsets Irongate 0 · Ashford 1 · Coalport 2 · Duskwall 3 · Clearwater 4). Cycle days **0–1 nominations, 2–4 polls open**, the **count** at the boundary into day 0; the new council **divides on its ordinance** on days 0–1 and the ordinance is in force from day 2 for five days (§15.3). No phase has a clock time |
| **Term** | 28 City Days | National election, head of government, Legislature |
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
- **Night is 20:00–06:00 UTC**, the same for everyone. City maps show their night art then. In slice 1 it is **purely cosmetic**: no odds, costs, rewards or availability change. Later rules that mention night (the Curfew ordinance, the night train, CHA 30+ at night in rival cities) use this window, so the map always agrees with the rules.

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
| **Polling Day** | Which city votes today, and your ballot if it's your Home City |
| **Your Desk** | Salary paid and seniority, Rested banked, Heat level, Dossier entries going stale |
| **Party Orders** | Today's Directives from your Faction Chair |
| **Letters** | Patron replies and Requests, Ambition chapters ready |
| **In Print** | **Your name in the paper** when you top a ledger, become City Hero, win a seat or get caught |
| **Weather** | Today's weather in each city and its effect on missions |
| **While You Were Away** | Shown after 2+ days away: a digest of elections, laws and city changes |

**Mastheads.** Each home city has its own paper: *The Coalport Clarion* ("The voice of the mill and the quays", 5 marks), *The Duskwall Sentinel* ("For the city and the frontier", 5 marks) and *The Ashford Gazette* ("Fair report, free comment", 6 marks). Battleground residents, and visitors while in the city, read the national ***Irongate Herald*** ("All the republic, every morning", 6 marks; slice 4); Clearwater: the *Clearwater Courier*, provisional. The masthead is content; the app-shell banner reads *The {short name} is in*.

**Dateline:** `{Weekday} · {D Month} · {City}` from the real UTC date, British form: *Tuesday · 29 September · Coalport*. **No year is printed anywhere in the paper.** The game is 1946 but the calendar is real (§2: one City Day = one real day, and the weekday drives the Monday sick-day refill), so the weekday must be the true one and a year would either break the fiction or contradict the weekday.

**Slice 1 (v1) scope:** headlines (2–3, at most two personal), **Party orders**, and **Your desk** with salary and seniority (*Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)*), Rested banked, Energy and when it is full, Level and XP to next, Local Standing, and *Yesterday* (the Today tally of the previous City Day, §3.7). Headline templates, their conditions and priorities are in `docs/design/slice-1-content.md` §7.

**Slice 2 (v2): the welcome edition and Letters.** The first edition a character sees is the **welcome edition**: three headlines (*Welcome to {city}* with the secretary's name and where to spend the first Energy; the city's arrival notice with the player's name, first edition only; the morale line), the **welcome set** of Party orders (§13.7), a **Letters** row (*From your father's things: Chapter 1 is ready · 10 Energy*, §17.1) and the desk with a *Wearing* row (§8.2). It is the whole tutorial without being one (§7.5). Letters carries Ambition chapters from slice 2 and patron letters from slice 8. Per-city welcome texts are in `docs/design/slice-2-onboarding.md` §7.

**Slice 3 (v3): Polling Day and In Print.** A **Polling Day** row every morning states the home city's phase and carries the one tap that matters (*Cast your ballot*, *Stand for the council · 10 PC*, *The council sits*), or *Coalport votes from Thursday* when nothing is open; it is live at read, never baked into an edition. **In Print** begins with the seat: on **the first edition the winner opens during the term** (the count morning for most; later for a player who was away, since being away costs the chamber vote, never the moment), the front page carries the player's avatar as a printed photograph with the stamp **ELECTED**, the headline with their name, the deck and the count table, and one CTA, *To the council*; the seat headline is left out of the block beneath it, and after the term the seat lives in the count view and the Me tab only. Losing (by a margin or on the tie-break), the count, a candidacy struck or confirmed on the morning the polls open, and the fate of the player's own vote are ordinary headlines. Every boundary named in a headline or a result is rendered in the player's clock (*Tuesday midnight*, or *Wednesday 01:00* at UTC+1); a headline on the count morning says *today*, since nominations are open that morning. Templates per paper: `docs/design/slice-3-politics.md` §8; the screen: `docs/design/slice-3-screens.md` §2.

**Slice 4 (v4): the Issues and the capital.** **The Issues** section is live at read, between the headlines and Polling Day: the residence city's two Issues first, then the capital's two, then the other cities folded; each row shows the Issue, every faction's momentum and who leads (Issues are public arguments; nothing about them is secret). *In Print* gains the **District Hero** and **City Hero** lines at each count and the reporter's quote from the journey card. The Herald gains the arrival, residence, battleground, groundswell and count-by-district headlines (`docs/design/slice-4-battleground.md` §12); every home paper gains *The Train Is Open* at Level 10 and its Issue lines.

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
| **Season 2 and after: the republic** | | **President or Chancellor** · Speaker · Legacy perks · Tier V regalia · Protégé patrons · the second Ambition · the Hall of Fame · and every office has to be won again each term |

### 3.7 The "Today" tally (new)

A one-line running total of the current City Day (from 00:00 UTC, §2.2), on the city screen and as *Yesterday* in the Morning Paper: **Energy spent · attempts · Successes · XP · FXP · Iron earned by actions · opinion moved · Directives done (n / 3) · stat points trained.** It resets at the boundary; nothing is lost, it becomes yesterday. The wage is not in the tally: it lands at the boundary and shows on the desk (§9). It exists so that a five-minute session ends with a visible sum, not a scroll through a log.

**Every item has a note (review 1).** The tally's label and each of its items, like every other label that carries a rule (Standing, the share bar, the morale word, the ordinance line, Energy, Rested, XP, Faction XP, PC), is set with a **dotted underline** and opens a **two-line note in the paper's voice** on a tap: *ATTEMPTS · Actions taken today, a ×3 counting three.* No "i" icons anywhere; the paper has none. The one first-time hint is on the city plate on the welcome day: *Anything underlined can be tapped for what it means.* The notes: `docs/design/review-1-answers.md` §5.

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
| **1 month or more** | **Welcome Back package**: Rested full, a "While You Were Away" digest, and a returning-operative Ambition chapter. |

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
| First job, first outfit, first Campaign Event | Day 1 | Every core system touched in the first sessions |
| Rank 2: **vote** | Day 2 (the right); **the first ballot by day 4** | A taste of politics from day 2. The home city's polls are open three days in five (§15.3), so 60 % of new players vote the day they make Rank 2 and the rest within two days; the paper says when |
| Level 10: **train travel** | ~Day 5 | The map opens once the home city is familiar |
| Rank 3: **stand for council**, lead events, illegal missions | ~Day 10 | The first real political step, in week 2 |
| Level 16: full map, Case Files | ~Week 2 | |
| Moving to a battleground | Weeks 3–4 (allowed from Rank 2 and Level 10, about day 5; slice 4 measures when it happens) | A player's own choice, not a gate |
| Rank 4: Faction Chair candidacy | ~Week 4 | |
| Level 31 | ~Week 6 | |
| **Rank 5: Legislature and ministries** | **~Week 8** | National politics for committed players in season 1 |
| Rank 6: **head-of-government candidacy** (also needs a term as deputy or minister) | ~Week 12 | The top prize is for the end of season 1 at the earliest |
| Level 51 | ~Week 20 | |
| Rank 7 | ~Week 24 | The top rank in season 2 |

### 5.3 Levels

Each level-up gives +5 max HP and +1 stat point to **STR, INT or AGI** (review 1: AGI was training-and-stealth only, which left an AGI origin build with nothing but 30-Energy training until stealth missions arrive in slice 5). CHA comes from clothing. **The choice screen explains the choice:** a lead line computed from the residence city's checked actions (*Most of the work in Duskwall uses INT: 9 of 15 actions. Your best is STR 13.*; a single-stat action counts for its stat, a two-stat action for both, a best-stat action for none) and one line per stat saying which actions here use it and what it opens later; the point still waits on the character screen and nothing is lost by choosing later. Strings: `docs/design/review-1-answers.md` §7.

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
| 1 | 0 | Initiate / Recruit / Volunteer | Faction HQ, faction chat, Tier I faction missions |
| 2 | **400** | Steward / Activist / Canvasser | **Vote in all elections**, Campaign Event roles, Dossier missions, sign Recall Petitions |
| 3 | 2,000 | Bailiff / Organiser / Agent | **Stand for City Council** (with the ladder conditions), **schedule Campaign Events**, illegal missions, safehouses, faction equipment, Jobs board Tier II |
| 4 | 6,000 | Prefect / Convenor / Senator | **Stand for Faction Chair** (after a council term), Political Protection perk (§11.4) |
| 5 | 15,000 | Intendant / Delegate / Representative | **Stand for the Legislature** and **be appointed Minister** (after a term as Governor or 3 council terms), Operation missions |
| 6 | 25,000 | Guardian / Tribune / Speaker | **Stand for President or Chancellor** (after a term as deputy or minister), eligible for Speaker, Tier V quest chains |
| 7 | 60,000 | Keeper of the Gate / Chairman / Prime Minister | Honorific title, Legacy unlocks, faction Hall of Fame |

Rank 2 was 500 in the first 3.1 draft; at the §5.5 rates the reference player reached it on day 3, not day 2, so it is now 400 (`docs/economy.md` §7).

The Collective's Rank 5 title was *Vanguard* in the first 3.1 draft, which read as the rival faction's name. It is now **Delegate**: what a workers' party sends to its Congress (§15.5) and to the Legislature, which is exactly what Rank 5 unlocks. The Alliance's Rank 3 title was *Councillor*, the office that rank lets you stand for; it is now **Agent** (a constituency agent runs campaigns, which is what Rank 3 unlocks). No faction is renamed (Appendix C #10 stays parked).

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
| **Max** | 100, +5 per level |
| **Regen** | 10 HP per 10 min (passive) |
| **Lost through** | Combat encounters, and only combat. Neglect no longer drains health (the v3.0 system is removed). |
| **At 0** | Hospitalised (§19.1) |

### 6.2 Energy

| | |
|---|---|
| **Max** | 100 (Premium: 120) |
| **Regen** | **5 per 10 min**, server-side. Full from empty in 3h20. |
| **Spent on** | Missions (5–30), surveillance (3–5), training (§8.5), Campaign Event roles (10–20), social missions (5–12), bar activities (2–6). Never on a job (§9) |

Travel between cities costs time and a ticket, not Energy (§14.10). The slower regen (v3.0 was 5 per 5 min) fits 3–4 sessions a day without asking players to log in every 100 minutes. Rested absorbs the regen that would otherwise be wasted.

### 6.3 Rested (new)

While Energy is full, regen overflows into a **Rested** pool.

| | |
|---|---|
| **Cap** | 200 |
| **Effect** | Each Energy point spent **on an action Rested can boost** (checked actions and training) while Rested > 0 uses 1 Rested and gives **+50 % XP and +50 % Iron** on that action. FXP and influence get no bonus, so absence can't be converted into political power. |
| **Other sources** | Lodging and hotels (§6.7), Welcome Back package |

A player who logs in once a day spends 100 Energy with a +50 % bonus on all of it. A player who logs in three times spends about 400. Neither gets punished; the frequent player simply does more.

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
| 75–100 | **Wanted** | Any failed illegal action means arrest (§19.2); barred from high-society venues |

### 6.5 Political Capital (new)

Political Capital (PC) is *earned* through political activity. It does not regenerate on a timer.

| Earned from | Amount |
|---|---|
| Completing today's Party Directives | 5 per day |
| Campaign Event participation | 3–15 by outcome |
| Resolving an Issue (the owning faction's top five contributors by momentum) | **4 each** ("20 split"; fewer than five: 4 each, the rest not redistributed; slice 4) |
| City Hero or District Hero (§14.5) | 25 (slice 4) |
| *One of Us* in a city (§13.4) | **1 per day** per such city, at the boundary |
| Office stipends | Councillor **10/day and 20 FXP/day** (paid at every boundary held, present or not; the FXP is the office share of §5.5), Governor 20/day, Deputy 5/day, Minister 25/day, Head of Government 50/day |
| Patron favours, Ambition chapters | Varies |

| Spent on | Cost |
|---|---|
| File candidacy: Council / Legislature / Chair / Head of Government | 10 / 25 / 25 / 100. The council's 10 is a **deposit**: kept if the candidate withdraws or stands, returned if the candidacy is struck for want of endorsements (§15.3) |
| Endorse a candidate (+3 to a council total, §15.3; +1 % nationally, §15.5) | 10; Rank 2+, resident, **one per member per cycle in each city**, public, irrevocable |
| Sign a Recall Petition | 10 |
| Propose an ordinance (councillor) or law (deputy) | 20 / 50. A councillor may move one item per term; the order paper holds the branch's motion plus three (§15.3) |
| Call in a patron favour | 15–40 |
| Clear 1 Criminal Record point through connections | 30 |

PC is capped at **1,000** and never decays. It can't be bought, traded or transferred. It is **stored and shown from slice 1** (the Directive completion bonus pays it): **in the HUD on every screen size once it is above 0** (never as a zero), with the full name and its sinks on the Me tab, and the price on every political button; **the first sinks arrive in slice 3**: the council deposit, endorsements and ordinance proposals. A daily player has about 45 PC by day 10, enough to file, endorse a colleague and, once seated, move an ordinance (`docs/economy.md` §14.2).

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

---

## 7. Character creation — the Origin Story

### 7.1 The deathbed scene

Unchanged from v3.0. The player's father lies dying in a small apartment in Irongate City while the city outside is in political turmoil. He asks the player to recall moments from their youth, and each answer quietly sets starting stats. The player never sees a number.

### 7.2 Dialogue

The origin is a **tier-3 story of three steps** (§13.1), two questions to a step, every answer saved as it is tapped so a closed tab resumes at the next question. **An answer is final once tapped**: there is no going back, and a second tap on the same question changes nothing. After the first question of a step the answer just given is echoed as one line above the next question (*You went fishing with him.*), which is how a player sees what they tapped. No number is shown on any origin screen; the coat and the promise carry a hint in words. Full script, echo lines, art and copy: `docs/design/slice-2-onboarding.md` §2.

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

The father dies before the first tram. The player steps into the street with his suitcase, a newsboy shouts that the government has fallen, and **three faction cards** appear on the same screen: crest (the faction's SVG crest; the Vanguard's is an iron gate beneath a lantern in a square frame, and the plain square, circle and triangle are only the small marks), name, three lines (who they are, what they want, which city they hold) and three facts (the stat bonus, *Starts in {city}*, their signature event). The card matching the father's wish carries *His wish · +50 Faction XP*. The choice is free and **permanent** (changing needs a paid Faction Reset token, §23); the confirm button reads *Join the {faction} · take the train to {city}*, and the next screen is the home city's welcome edition (§3.3, §7.5). Card copy and the Vanguard review: `docs/design/slice-2-onboarding.md` §5.

**Faction starting bonuses are cut to +3** (Vanguard +3 STR; Collective +2 STR +1 INT; Alliance +3 INT) so the origin choices keep their weight. Joining also gives the faction's **Tier I outfit** and **party card** (§21.4).

**The face.** Six portraits (three men, three women, in their twenties, thirties and forties) are offered on the sign-up form, before the origin; the choice is required, changeable on the Me tab at any time, and has no effect on anything (Appendix C #19).

**The name.** Chosen on the sign-up form: **2–40 characters after trimming**, inner runs of spaces collapsed to one, no character class restricted. Sign-up refuses a blank, shorter or longer name with a line under the field (*Your name can't be blank* · *Your name needs at least 2 characters* · *Your name can have at most 40 characters*). It is printed in the arrival headline on day 1 and in the HUD, which is why forty. The only fallback, for accounts made before this rule, is the neutral *A Newcomer* from content; no faction's vocabulary ever stands in for a name.

### 7.4 Home City (new)

**Your faction decides where you start.** Every new player begins in their faction's **home city** (§14.11): the Vanguard in Duskwall, the Collective in Coalport, the Alliance in Ashford. That is your Home City, where you vote and stand for council.

From **Rank 3** you can **move** your residence to a **battleground city** (Clearwater, or a district of Irongate, §14.9) to vote and stand where national power is decided. Moving is a career choice, not a tutorial step: at home you rise inside your party, and in a battleground you fight the other two.

- You can move once every 7 City Days, for 500 IM. Moving resets your council eligibility for one cycle.
- You can always move back home.
- You can't live in a rival home city. You can visit, at your own risk (§14.12).

### 7.5 The first ten minutes (new)

There is no tutorial screen. From sign-up to the first result modal is **eleven taps and about three minutes**: the face and name, three origin steps, the faction, the welcome edition, one action. After that every new thing is introduced by the thing before it, never by a screen that only explains.

- **The welcome edition** (§3.3): three headlines that say where you are and where to spend the first Energy, the **welcome set** of three Party orders (§13.7: two attempts at a political action **chosen by the player's best stat**, one committee session at the HQ, *Take a job at {place}*), the Letter that opens Ambition chapter 1, and the desk.
- **The first landing:** the home-city map with **the slot-A action's location sheet already open** (the pin depends on the best stat; the welcome headline names the same place). The first screen of play is a ticket with its odds and its stat (*80 % · STR 13*), the tag *Party order 0 / 2 · +25 % FXP* and the bonus row *First day in Duskwall +10 %* (§8.4). The orders list on the city plate links each order to its pin, and every order title says what to do and where (§13.7).
- **The order of introduction** (about a minute each): the first action and the result modal, whose odds are one plain sentence (§8.4) · *Again ×3* and the second attempt, which completes an order (+20 FXP as a signed line from the secretary) · Level 2 and the one-tap stat point, with its explanation (§5.3) · *Take the job* from the Jobs card (*paid at midnight*; no shift, §9) · the HQ session, a best-stat check, which completes the set: the **orders-complete modal** in the secretary's voice (+5 PC, and PC appears in the HUD for the first time, on phones as on desktop; §6.5) · the Ambition chapter from the Letters row · free play until the Out of Energy card, which says when the bar is full and that Rested banks after that.
- **What is left for the game to explain itself:** Rested (its desk row, once it has a value), Local Standing (the plate counts *0 / 10*; the Standing card names it at 10, §13.4), the day boundary (the Jobs card's *paid at hh:mm*), the other cities (the train, slice 4). Everything else with a rule behind it answers a tap on its label (§3.7).
- **The HUD** carries Energy (the word, never *EN*), the XP bar with *{n} to Level {next}*, **the Faction XP bar to the next Rank** (the faction's colour, under the XP bar, labelled with the rank title, or *Rank n* on narrow phones), Iron, and PC once earned.

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

Unchanged from v3.0. Your CHA is the total of your equipped clothing and accessories plus the origin's **CHA base** (0–4, §7.2), so players keep different outfits for different jobs.

| Item | CHA | Notes |
|---|---|---|
| Work jacket and cap / Mill work coat / Worn wool overcoat (Tier I) | 2 | The starting outfit of the Vanguard / Collective / Alliance (§21.4); the *plain clothes* of §14.12 |
| Your father's coat (Tier I) | 5 | The origin's coat (§7.2); worn from the start if accepted |
| Standard coat (Tier I) | 5 | |
| Party outfit (Tier II) | 12 | FXP bonus on faction missions |
| Officer's suit (Tier III) | 22 | Opera and university events |
| Press correspondent outfit (Alliance T III) | 25 | INT bonus on political missions |
| Vanguard dress suit (T IV) | 35 | Risky in rival-held cities |
| Tailored three-piece suit (T IV, neutral) | 38 | |
| Full regalia (T V Legendary) | 50 | Senior leadership |

**CHA cuts both ways.** High CHA unlocks the opera, lectures, society dinners and diplomatic missions, and it helps in elections: every 10 CHA gives +1 % to your personal vote appeal. It also draws attention. With CHA 30+ in a rival-held city at night, encounter chance rises. Some stealth missions require *low* CHA, because a sharp suit makes you memorable.

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
- **Every button shows the final chance and the stat it checks**: *62 % · STR 11*, *44 % · CHA 2 + INT 11*, *70 % · your best, STR 13*. Tapping the percentage shows the ledger: stat, difficulty, and each bonus.
- **The result reads as a sentence** (review 1). Under each row's bar the default is one plain line, *Your INT 5 is 3 below the 8 this needs: 38 %.* (*…is 4 above…*, *…matches the 8…*, *CHA 2 and INT 11 average 6, 2 below…*, *Your best, STR 13, is 5 above…*; bonuses end it, *…: 66 %, and +6 % for being Known here: 72 %.*), and a roll line, *Rolled 26: Success (38 or under).* / *Rolled 51: Partial (39 to 58).* / *Rolled 77: Partial (a canvass never fails).* The ledger behind the tap reads *Even odds · 50 %* / *INT 5, 3 below the 8 needed, 4 % a point · −12 %* / each bonus / *Chance · 38 %*, with one fixed footnote: *Every check starts at even odds and moves 4 % for each point your stat is above or below what the job needs, plus bonuses; never under 5 % or over 95 %. A roll at or under the chance is a Success.* Full strings: `docs/design/review-1-answers.md` §4.

**Difficulty:**

| Kind of check | Difficulty |
|---|---|
| Tier-1 action in your home city | 8 |
| Tier-1 action in a battleground | 10 |
| Tier-2 mission | 14–20, set per mission |
| Tier-3 story, Operation | 22–30 |
| Social mission | Its CHA requirement |
| **In a rival home city** | **+4** on top |

Missions unlock by Level, so the odds on a player's own tier sit mostly between **60 % and 85 %**. Old content drifts up to 95 %; new content starts lower. **The first session is inside the band for every build** (review 1): the welcome set routes to the best stat (§13.7), the committee and the chapter's *Legwork* check the best stat, and the *First day* bonus below lifts the flattest build (8 / 8 / 8) to 60 %, the reference recruit to 76 % and a STR 13 Vanguard to 80 %; by the end of day 1 the level points and *Familiar* carry the same odds without the bonus (`docs/design/review-1-answers.md` §2).

**Bonuses:**

| Source | Effect |
|---|---|
| Local Standing (§13.4) | +3 % per level, up to +12 % |
| **First day** (review 1) | **+10 %** on every checked action in the home city during the **welcome day**: the City Day of creation, and the next one too when the character was created after 22:00 UTC (Appendix C #18, closed). A named row, *First day in Duskwall +10 %*. It ends at the boundary, by which time the day's level points and *Familiar* have replaced it, so no build's odds are lower on day 2 than on day 1 |
| The right item (§21) | +5 % to +10 % (forged papers on checkpoints, a propaganda kit on posters, a press pass on interviews) |
| Weather (§14.7) | −10 % to +10 % on outdoor checks |
| Battleground bonus (§14.4) | +5 % on political checks in a battleground city or district |
| The Branch Inspector or similar opponent effects | −10 % |

Heat, Party Directives and Rested don't change the odds. Heat changes the separate **caught check** (§11.2); Directives and Rested change the rewards.

**Outcomes from one roll (a whole number from 1 to 100, each equally likely):**

| Roll | Tier 1 | Tier 2 and 3 |
|---|---|---|
| **At or below** the chance | **Success** | **Success** |
| Up to 20 points above | **Partial** (half rewards) | **Partial** (half rewards) |
| More than 20 points above | **Partial** (a tier-1 action never fails) | **Failure** (small XP only), and possibly an encounter |

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
| **AGI** also | Every successful stealth action (a quarter of a training point) |
| **CHA** | Never trained: it is the sum of what you wear, plus up to +4 CHA base from the origin story |

**Starting stats:** 5 in each trained stat, plus the origin story (**6–9 points across STR, INT and AGI, at most +8 to one stat**; the rest of the 8–9 is CHA base, §7.2) and the faction bonus (+3). A new player's best stat is **8–16, typically 11–14**; an all-in build reaches 16 (an 82 % home check) at the price of 5 in the other two (38 %). The flattest build is a Vanguard recruit who fished, talked them out and read people: **STR 8 / INT 8 / AGI 8** with CHA base 3, a 50 % check everywhere on day 1 and the largest permanent CHA base in the game, which every coat they ever wear adds to. That is accepted: it is one corner of the answer space, it is what those answers describe, and the first level-up point lands inside the first bar. Every build reaches the 95 % clamp on its best stat from level-up points and Standing (`docs/economy.md` §2): the reference recruit by day 3–4, the flattest build by about day 5. The spread is flavour with a cost, not a gap.

**The reference recruit.** All tuning, examples and tests use one canonical new character: a Collective recruit who answered the origin story with *the library*, *watched from the corner*, *fix anything*, **refused the coat**, wished for *Justice* and promised to *finish his work* (§7.2), in the mill work coat.

| STR | INT | AGI | CHA (worn) | Where it comes from |
|---|---|---|---|---|
| 10 | 12 | 5 | 2 | 5 base each · origin +3 STR, +6 INT · Collective +2 STR +1 INT · mill work coat CHA 2, CHA base 0 · 150 Iron · +50 FXP seed · Ambition *Finish His Work* |

The reference recruit's home canvass is a **66 %** check (§8.4). The same answers in the other factions give the tuning characters for Duskwall and Ashford: **Vanguard STR 11 / INT 11 / AGI 5 / CHA 2** and **Alliance STR 8 / INT 14 / AGI 5 / CHA 2** (`docs/design/slice-2-onboarding.md` §2.4).

**Training** is a tier-1 action (the gym, the library, the running track). The Energy needed for the next point rises slowly, so stats never run away:

> **Energy for the next point = 20 + 2 × current stat.** Point 15 costs 50 Energy, point 30 costs 80, point 60 costs 140.

**Training rules.** Training is **not a check**: it always succeeds, one tap gives +1 to the stat at once, and the modal shows one row ("no roll") and the stamp *Trained*. It pays **XP at half the tier rate** (2.25 per Energy at tier 1, so the reference recruit's first INT point is 44 Energy for 99 XP) and **no Iron, FXP or opinion**: the stat point is the reward. Rested applies to the XP. **Training has no batch: ×1 only**, one point per tap (three points would cost 126–138 Energy for the reference recruit, more than the 100-Energy bar ever holds, and three points a session would overshoot the targets below). The training ticket shows one button with the live cost, and the *Trained* modal offers *Again ×1 · Continue*. Training does not count toward Local Standing.

**Targets for a regular player's best stat** (training about 15 % of their Energy, plus level-ups):

| When | Best stat |
|---|---|
| Day 1 | ~10–12 |
| Week 1 | ~15 |
| Month 1 | ~30 |
| Month 3 | ~60 |
| Season 2 | 80–100 |

---

## 9. Jobs

**A job is a wage** (review 1, 30 Sep 2026, a user decision). It gives a steady income that costs no Energy and doesn't depend on faction activity, so the whole bar goes on politics. There is no shift: the first 3.1 draft had a daily shift for Energy that paid no XP, and the first play-through asked, rightly, why anyone would work it. What is left to decide is *which* job, and that is enough: the faction's own job pays members a fifth more, the Driver is the first thing training unlocks, later jobs pay in other coin, and the labour ordinances fight over the wage.

### 9.1 Rules (reworked)

- A player holds **one job**. Taking a job is free and one tap on the *Jobs* card at the job's location (the card lists what is offered there, with pay and requirements; requirements are checked on taking, never again). **Switching** is one tap, free, takes effect at once and **resets seniority to 0**. Nothing about a job costs Energy or touches Rested.
- **Daily wage:** at every 00:00 UTC boundary (§2.2) the job held at that moment pays its **full daily pay** automatically, present or not. The member's fifth (the faction's own job) is a line of its own on the base pay. The desk row reads *Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)*; the Jobs card reads *216 a day, paid at midnight* (the boundary in the player's clock).
- **Seniority:** **+2 % of daily pay for every City Day the job has been held** (boundaries paid), **to +20 % after ten days**. Paid as its own line at the boundary (*Seniority 4 days: +17*). It never falls except by switching, and it goes on counting while the player is away (§4.3, rule 2). The *Five Days In* and *Ten Days In, Full Rate* headlines fire the morning after seniority **first reaches or passes** 5 or 10 (the Long Service Order, §15.3, can step over the number).
- **Cap on return:** however long the absence, a return credits **at most 14 days' pay** (a fortnight's back pay); the job is kept and pay resumes at the next boundary. This never touches a player seen at least once a fortnight (§4.2; Appendix C #17).
- **Pay under an ordinance (§15.3):** the seniority line and an ordinance's pay line (*Public Works Order +22*, *Ward Fund −54*) are **each a percentage of the unmodified daily pay**, shown as separate lines that add up; the wage at a boundary uses the ordinance in force on the day that ended.
- **You are never fired for being away.**
- **Gone with the shift:** the work streak, sick days, the shift ticket, the `job` action type and its outcome texts, the *Shift worked* stamp, the Today tally's *shift worked*, and Premium *Remote Work* (nothing is left to work remotely). The three *Work your shift* orders leave the rotation; *Take a job* is a welcome-day order only (§13.7).

### 9.2 Job catalogue

Unchanged from v3.0 apart from the pay rules; "per shift" effects are now per day.

| Job | Unlock | Daily pay | Requirements | Notes |
|---|---|---|---|---|
| Street vendor | Level 1 | 80–120 | — | Any outdoor location |
| Factory worker | Level 1 | 150–200 | STR 5 | Coalport; Collective +20 % |
| Stores hand | Level 1 | 150–200 | STR 5 | Duskwall (the customs stores); Vanguard +20 % |
| Copy clerk | Level 1 | 150–200 | INT 5 | Ashford (the *Gazette*); Alliance +20 % |
| Driver | Level 3 | 180–250 | AGI 10 | |
| Market trader | Level 3 | 200–300 | INT 8 | Buy-low/sell-high mini-game |
| Security guard | Level 6 | 300–400 | STR 12, CHA 10 | Opera, university, warehouses |
| Newspaper reporter | Level 6 | 350–500 | INT 15 | 10 % chance of a free Dossier entry per day |
| Factory foreman | Level 10 | 500–700 | STR 15 | Collective: Rank 3 instead of Level 10 |
| Lawyer's clerk | Level 10 | 600–800 | INT 20 | Ashford; Alliance: Rank 2 |
| Professor | Level 16 | 900–1,200 | INT 30 | Ashford University; small INT gain per day |
| Political aide | Level 20 | 1,500–2,500 | Rank 4 | Also gives FXP and 2 PC per day |

**Pinned for the home cities (slices 1 and 2):** each home city places three jobs. **Street vendor 100** (Market Row / the Customs Market / Bridge Street), the faction's day-1 job at **180, 216 for members** (Factory worker at the Mill Gate / Stores hand at the Fortress Gate / Copy clerk at Gazette House) and **Driver 200** (Harbour Quays / Goods Yard / Bridge Street). A job belongs to one location, so "Driver" is three jobs with three ids. The other jobs keep their ranges until they are placed. The Market trader's mini-game is deferred with the job. The capital's Porter (180, slice 4) is for a player with no job: a home job pays in full from anywhere.

---

## 10. The Dossier

The Dossier is the player's private intelligence journal. In MVP it covers NPCs only; in v1.5 it extends to players.

### 10.1 Capacity

| INT | Slots |
|---|---|
| 1–10 | 10 |
| 11–20 | 15 |
| 21–35 | 25 |
| 36–50 | 40 |
| 51+ | 60 |

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

### 10.3 Categories

Political affiliation, criminal activity, location pattern, asset/wealth, and neutral, as in v3.0.

### 10.4 Case Files (new)

Collect **3 or more fresh entries on the same NPC** and they combine into a **Case File**. Case Files are keys that open storylets:

| Case File use | Needs | Outcome |
|---|---|---|
| **Exposé** | Criminal or political entries | Publish through the press: influence swing against the NPC's faction in that city, and a headline with your name |
| **Blackmail** | A criminal entry | Iron or a favour; +10 Heat |
| **Denounce** | Political entry; your faction controls the city | FXP; the NPC is removed from the city for a week |
| **Recruit Informant** | Location pattern + 30 Favour with a patron | A passive entry every 2 days |
| **Sell** | Any entry | 50–200 IM at tram stations |

### 10.5 Freshness

Entries older than 7 days are flagged **stale**. Stale entries still count toward Case Files at half weight, and they sell for half price. Being away makes intel less valuable; it never deletes it.

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

### 11.3 Record levels

| Level | Points | Effect |
|---|---|---|
| Clean | 0 | None |
| Known | 1–2 | −10 % Iron from missions; some venues need +5 CHA |
| Repeat Offender | 3–5 | −20 % Iron; clothing +15 %; police encounters +5 % |
| Notorious | 6+ | −30 % Iron; barred from courts, universities and Alliance civic buildings; bail doubled; **−5 % personal vote appeal** |

### 11.4 Clearing a record

- **Time:** minor points expire after 14 days with no new offences.
- **Bribes:** 500 IM per point at Known, up to 2,000 IM per point at Notorious. Depends on who controls the city.
- **Connections:** 30 PC per point.
- **Political Protection (Rank 4+):** once a month, your faction expunges one moderate point.
- **Laws:** the Rehabilitation Act lowers every record by one level while it's in force.

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
- The result modal's **Again ×1 / Again ×3** buttons let the player chain actions without going back to the location card (after a *Trained* result: *Again ×1 · Continue*).
- Rested, Issue, weather and Directive bonuses are applied automatically and shown as small tags on the card.

**Rules that give tier 2 weight:**
- Every tier-2 mission shows its **odds and its risks before you commit**: Heat, encounter chance, record points if caught.
- Encounters (§20) only come from tier 2 and 3, and from tier 1 in rival home cities (§14.12).

#### 13.1a The result modal

Every action and mission ends in a **result modal that covers the map**. It never appears as a line in a log. Top to bottom:

1. **Art and a stamp**: art from the fallback ladder (§13.5) with a large stamp (Success, Partial, "2 of 3", Encounter, Arrested), plus the place, the action and the in-game time.
2. **What happened**: a headline and a short narrative paragraph. Every action has its own success and partial text.
3. **How it went**: one row per attempt, with the success chance as a bar and a marker where the roll landed. The maths is never hidden.
4. **Rewards**: four large tiles (Experience, Faction XP, Iron, and opinion or Dossier), with notes on bonuses such as Rested or the Issue.
5. **Knock-on effects**: Local Standing progress, Issue momentum, Energy and Rested before and after, ledger rank, Heat, press coverage.
6. **Buttons**: Again ×1 · Again ×3 · Continue. When an encounter follows, a single button leads into it.

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
| **Social** | 2 | Yes | No | Small | 0 % | Opera, lecture, senator's dinner (CHA-gated) |
| **Disruption** | 2 | **No** | Yes | Yes (against rivals) | 30 % | Break up a rival meeting |
| **Sabotage** | 2 | **No** | Yes | Yes | 25 % | Wreck a rival printing press |
| **Operation** | 3 | Varies | Yes | Large | 40 % | Rank 5+; high risk, high reward |
| **Council** | 1 | Yes | Yes | No | — | Faction strategy session; a **best-stat** check (§8.4) |

Illegal missions pay better influence per Energy, at the cost of Heat and record risk. **You can play entirely legally.**

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

**The crossing is a moment** (review 1). Each new level shows as a **Standing card** inside the result modal, in the block the level-up uses: kicker *LOCAL STANDING*, the new title (*Familiar in Duskwall*), one line on what changed (*Every check in Duskwall is now +3 %.*) and one on what the next level brings (*Known at 30 Successes: +6 %, and your name will do for a council candidacy at Bailiff.*); the plate line updates behind it. No second modal: it is a knock-on effect of the action. The plate's *Standing* label opens the whole ladder on a tap (§3.7). Texts: `docs/design/review-1-answers.md` §9. The reference player is *Known* about day 3 and *One of Us* about day 8 at home (`docs/economy.md` §9). Standing never decays. It gives grinding the Mill Gate a point: the tenth canvass in Coalport goes better than the first, and it ties players to their Home City.

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
| `faction-hq` | Each faction's HQ and union hall; the scene is picked by the faction | | |

Nineteen kinds, which fits the "about 25" scenes budgeted above (`faction-hq` needs one per faction). **Final** as of the slice-1 Coalport list, which uses six of them: Mill Gate `factory-gate`, Market Row `market`, Union Hall `faction-hq`, Foundry Row `street`, Harbour Quays `docks`, The Anchor `bar`. Kinds can be added, never removed.

**Duskwall** (slice 2, `docs/design/slice-2-cities.md` §1): Fortress Gate `ministry`, Customs Market `market`, Beacon House `faction-hq`, State Archives `library`, Goods Yard `station`, Rampart Row `street`. **Ashford** (§2 there): Gazette House `press`, Assembly Rooms `faction-hq`, University Quad `university`, The Courts `court`, Bridge Street `market`, Weavers' Row `street`. Scenes exist for the Vanguard HQ and the press; the other kinds use the map crop until a scene is drawn.

### 13.6 Social missions

| Mission | Requires | Energy | Rewards | Notes |
|---|---|---|---|---|
| Attend the opera | CHA 15 | 6 | +200 XP, INT XP, Dossier entry on a named figure | Weekly |
| University lecture | CHA 12 | 5 | +150 XP, INT XP, unlocks a mission chain | |
| Dinner with a senator | CHA 25, Rank 3 | 8 | +400 XP, +150 FXP, +500 IM, legislation intel, Favour | Weekly per senator |
| Black-tie fundraiser | CHA 30, Rank 4 | 10 | +600 XP, +300 FXP, 10 PC, chance of a unique item | Once per term |
| Diplomatic reception | CHA 35, Rank 5 | 12 | +1,000 XP, +500 FXP, cross-faction intel | Neutral ground |

Contextual dress checks still apply: meeting the threshold with accessories while wearing work clothes fails a formal event.

### 13.7 Party Directives (new)

See §15.4. Directives are the faction's *agenda for the day*, set by the elected Faction Chair. They tell a new player what to do and tie each person's session to the faction's collective plan.

**Directives v1 (slice 1, until a Chair exists).** The NPC party secretary sets them. For the Collective that is **Petra Holm**, Coalport branch secretary (portrait `holm`): brisk and warm, wastes no words, talks in shifts, wards and door counts, never in slogans; signs "— P.H." For the Vanguard, **Viktor Stahl**, district organiser in Duskwall (portrait `stahl`): clipped and formal, talks in wards, lists and times, treats every order as already agreed; signs "— V.S." For the Alliance, **Thomas Grey**, constituency agent in Ashford (portrait `grey`): dry and quick, a former *Gazette* sub-editor who counts words; signs "— T.G." Their templates: `docs/design/slice-2-cities.md` §1.5 and §2.5.

- **Titles say what and where** (review 1). Every order title is `{Do} at/on/in {Place}`, plain: *Canvass the customs shift at the Fortress Gate*, *Sit in on the committee at Beacon House*, *Canvass anywhere in Duskwall* (city-wide orders name the places in the secretary's line). The UI adds the count. The secretary's line keeps the voice. **Tapping an order opens its pin with the matching ticket highlighted**; a city-wide order opens the first pin in pin order with a matching ticket, and every matching ticket wears the *Party order n / m* tag. All templates: `docs/design/review-1-answers.md` §3.

- **The welcome set.** On a character's **welcome day** (the City Day of creation, and the next one too when created after 22:00 UTC; §8.4, Appendix C #18) the three orders are fixed instead of rotated: **slot A, two attempts at a political action chosen by the player's best trained stat** (the highest of STR, INT and AGI; ties to the faction's bonus stat, then INT, then STR), one per city and stat, so a STR Vanguard canvasses the customs shift at the Fortress Gate, an INT one the ration queue at the Customs Market, an AGI one hands out leaflets there; **slot B, one committee session at the HQ** (a best-stat check); **slot C, *Take a job at {place}***. The first landing opens slot A's pin. They fit in 30 Energy and complete in ten minutes, which pays the first +5 PC. From the next day the rotation applies. The table per city and stat: `docs/design/review-1-answers.md` §2; welcome-only templates carry `use: 'welcome'`.

- Directives are **faction-wide**: every member gets the same three on the same City Day, chosen deterministically from the day number (slot A: a canvass order; slot B: party work such as propaganda, a speech, a committee session or intelligence; slot C: a habit: *Train once*, *Six wins* or *Five attempts*), never the same set two days running. No scheduled job is needed.
- The three personal targets together fit in about **60 Energy**, so one session clears them (*Five attempts* with a canvass order and a speech is about 90; accepted, it is the volume day).
- **Progress** counts attempts (Success or Partial) for count-type orders, Successes for the "full day" order, and each row of a ×3.
- ***Take a job*** **completes the moment a job is taken** (+20 FXP then, shown as one line on the Jobs card; taking a job is not an action and opens no modal). A later switch never undoes it. It is only ever a welcome-day order (§9).
- **Completion has a voice** (review 1). A single order done is a **signed line** in the result modal's knock-on block (*Order carried out · +20 FXP. Two remain. — V.S.*), never a modal. **All three done is a modal**, shown once the completing result is closed: the secretary's portrait, a headline and three lines in their voice, two tiles (*+5 Political Capital* · *+60 Faction XP from orders today*), *Tomorrow's orders are in the morning paper*, one button, *Carry on*. It waits if the tab closes first. Texts per faction: `docs/design/review-1-answers.md` §6.
- The v1 templates are in `docs/design/slice-1-content.md` §6, superseded by the review-1 rewrite. When Issues (slice 4) and Campaign Events (slice 6) arrive, the secretary's menu grows to the full §15.4 list.
- **The capital rotation (slice 4).** A member's rotation is chosen by **residence** (§14.11): the home sets for home residents; for a capital resident, four templates per faction (slot A: *Canvass the capital*, any canvass in Irongate ×3; *Knock your own district* ×2; slot B: *Speak to the Issue*, any Issue-tagged action in Irongate ×2; *Report to {HQ}*, the capital committee ×1) with slot C shared, since `cityId: 'home'` in a match resolves to the **residence city** from slice 4. Two new match fields: `districtId: 'home'` and `issueTagged: true`. The Unrest crisis pair (§14.11) replaces slots A and B **only for members resident in the home city**. Texts: `docs/design/slice-4-battleground.md` §10.

---

## 14. The City: map, influence and Issues

### 14.1 The five cities

| City | Role | Character | Train from the capital | Key locations |
|---|---|---|---|---|
| **Irongate** (capital) | **Battleground** · 5 districts (§14.9) | The political heart; every faction's HQ is here | — | Parliament, faction HQs, the *Irongate Herald* |
| **Clearwater** | **Battleground** · the swing city | Wealthy suburbs beside a restless working class | 25 min | Society district, tram hub, black market |
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
| Campaign Event | 1–5 by size and outcome (§16.3) | |
| Resolving an Issue | +3 (§14.6) | |

Multipliers on the swing: Issue tag +50 % (§14.6), Battleground +25 % (§14.4), Groundswell up to +30 %, ordinances and laws (§15). Rested and Directives never touch opinion. Tier-2 and tier-3 figures are provisional until slice 4.

**Where the share comes from.**
- **Persuasion** (canvass, speech, propaganda, events, Issues) draws from the **Neutral pool first**. Once Neutral is at its floor, the rest comes from the rival factions **in proportion to their shares**.
- **Actions against a rival** (Disruption, Sabotage, exposés) take the swing from the **target faction**; half goes to the actor's faction and half to Neutral. Voters who leave a party don't all join yours.
- **Floors:** Neutral never falls below **5 %** (there are always undecided voters); a home faction never falls below **50 %** in its home city (§14.11). If nothing can be drawn, the swing shrinks to what can. Shares always sum to 100.
- **Precision:** shares are kept to **three decimals** (0.001 of a point) so that a Partial canvass counts; meters and the ledger show one decimal.
- Every swing is attributed to the player who caused it (the ledger, §14.5).

This puts the reference player (§5.2) at about **+0.8 to +1.2 points a day** from tier-1 play at home (the higher figure in week 1, when almost every tap is political), which is what the ledger line in §3.2 promises. The 1 % daily drift (2 % at home) balances a handful of active players per city; see Appendix C for what happens at scale.

**Build order:** the swing is **written to the city meter from slice 1** (the modal shows the delta to three decimals, trimmed, and the city's new share to one decimal); the **home-city drift is built in slice 3** with the council calendar (2 % of the distance to 70 a day, at the boundary, moving between the home faction and Neutral; Appendix C #16, closed), along with the ballot and seat inputs of §14.11; the **battleground drift, the district meters, the Battleground and Groundswell multipliers, the Issue multiplier and the ledger are built in slice 4**. From slice 4 every swing is also a **ledger row** (§14.5); whether the meter is written in the action's transaction or folded from the ledger is the architect's call (ADR 0010, 0022). Ballots and seats never move a battleground's opinion: those are home-city morale inputs.

### 14.3 Control grants access, not multipliers

| State | Condition | Effect |
|---|---|---|
| **Contested** | No faction above 50 % | Standard prices; all missions open; **Battleground bonus** can apply |
| **Control** | Above 50 % | The faction's buildings open (Vanguard House, Safehouse, Press Club), service prices shift (§19), it holds the council majority most of the time |
| **Dominance** | Above 70 % | Exclusive high-tier missions and cosmetic city dressing (posters, banners, bunting in text) |

**No reward multiplier ever scales with control.** A faction that holds more cities gets more *places to go*, not more XP or FXP per action. EVE Online's faction warfare showed that multipliers tied to control make winners snowball.

### 14.4 Battleground and Groundswell

- **Battleground:** a city or district where, **at the City Day boundary**, the top two faction shares are within **10 points** (Neutral is not a faction). For that day every **political action** there (canvass, speech, propaganda, council) gets **+25 % opinion swing, +25 % Faction XP** (a bonus line on base FXP, rounded per line) and **+5 % chance** (§8.4), for every faction; intelligence and training get nothing. Evaluated once a day so tickets don't change under a player and the paper can mark the day's battlegrounds. At the baselines the Government Quarter and Station & Market are battlegrounds and the three leaning districts are not: the bonus follows the fight. Ticket tag *Battleground · +25 % FXP · +5 %* (slice 4).
- **Groundswell:** when a faction **loses control** of a city or district (its share above 50 at one boundary, 50 or below at the next), it gets **+5 % opinion swing per day there, stacking to +30 %** (day 6 onward), on its own political actions, until it retakes control at a boundary or **14 boundaries** pass. Only the faction that lost. Multiplies with the Battleground and Issue lines, each shown as its own line. In the fiction, public sympathy turns toward whoever was just pushed out. Built in slice 4; it cannot fire until someone has first crossed 50 (Appendix C #29).
- **Multipliers on one line:** `swing = base × (1 + battleground) × (1 + issue) × (1 + groundswell) × (1 + ordinance)`, in full precision, rounded once to three decimals; the FXP line takes Battleground, *Fired up* (home only) and ordinances only.

### 14.5 The Influence Ledger and City Hero

- **Ledger (slice 4):** every opinion change is a **ledger row** (city, district, faction, the character or the system source, day, council cycle, the swing as applied after floors, the kind and a reference). Actions, journey cards and Issue resolutions are attributed to the character who caused them; drift and Issue awards to the system. Each player sees a line, live at read, on every city or district plate they have moved this cycle: *"This cycle you moved Eastside +1.3 for the Collective (2nd of 7)"*, the rank among **all** contributors there this cycle, any faction; the cycle is the council cycle, count to count.
- **City Hero and District Hero (slice 4):** at each count, per city (per district in the capital) and per **level bracket** (1–15, 16–30, 31+), the character with the largest positive sum this cycle, **provided it is at least +0.5 points** (a single canvass does not make a hero); ties to the earlier to reach the total. Up to fifteen heroes a cycle in the capital and three in each home city. Rewards: the **title for the next cycle** (*District Hero, Eastside* on the Me tab and on political lists until the next count), **25 PC**, a line **In Print** in the paper (*{name} Named District Hero of {district}*), and from slice 8 a Legacy entry and the profile medal. Given at the count, present or not.
- **The ledger table:** the top three of each bracket per city or district are printed on the count page; the faction screen's ranking by cycle and season is slice 6. Contribution is visible without third-party tools.

### 14.6 Issues of the Week (new)

This is Irongate's signature mechanic. **Every city has two live public concerns each week.** They give each day a different shape and turn influence into an argument about something.

**How they work (pinned in slice 4):**
1. **The draw.** At the **Monday 00:00 UTC boundary** every open city draws **two Issues** from the deck, seeded from the week key, from the Issues eligible for that city, never last week's two, and in Irongate **from two different districts** (the capital's Issues are tied to districts). Weights are all 1 in the MVP; "the city's character" is which Issues list the city. Laws and weather weight the draw when they exist. A city that has never been settled draws at bootstrap, so no city is ever without Issues. The first drawn is *the city's first Issue*.
2. Each faction has a **stance** on each Issue (≤ 90 characters): flavour, printed as the winner's deck. **The effect is the same whichever faction owns the Issue.**
3. **Tags.** An Issue has a `feeds` match (action types, locations, location kinds, the district): a matching action is **tagged** while the Issue is live (*Issue: Tram Fare Hike · +50 % swing* on the ticket). A tagged action gets **+50 % opinion swing** and adds **momentum** to the actor's faction on that Issue: **its Energy on Success, half on Partial**, each row of a ×3 on its own; journey cards add what they say. **Momentum is public**: the paper's Issues section shows every faction's total and who leads.
4. **Resolution** at the **Monday boundary, before the new draw** (Sunday night; no early resolution in the MVP, Appendix C #28, so nothing depends on a threshold or a clock time). The faction with the most momentum **owns the Issue** (ties: the higher share in the city or district; then nobody); with no momentum at all it **lapses**. The owner gains **+3 opinion** in the city (in Irongate, in the Issue's **district**), drawn Neutral-first and attributed to the Issue in the ledger; a headline in every paper; its **top five contributors by momentum get 4 PC each**; and the Issue's **effect** applies to the whole city for **7 City Days** as a bounded modifier line like an ordinance's, stacking with the ordinance in force as a separate line.

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

### 14.9 Capital districts (new)

Irongate is the only city split into districts. It's worth 40 % of the nation and every faction's HQ is here, so it deserves more than one meter. Districts give the capital several battlegrounds at once, and give each faction home ground inside it.

| District | Character | Key locations | Leans |
|---|---|---|---|
| **Government Quarter** | Stone ministries, the forecourt, lawyers and lobbyists, the opera | Parliament, the Forecourt, the Ministries, the Supreme Court, the Opera, Chancery Row | Neutral; the hardest to hold |
| **Old Town** | Cobbles, cafés, the press and the basilica | Herald House, the Press Club, Concord House (Alliance HQ), Basilica Square, St Agnes Hospital, Lantern Lane | Alliance |
| **Station & Market** | Crowds, trams, traders and hotels | Central Station, Market Square, the tram junction, the Grand Hotel | Swing |
| **Eastside** | Tenements, workshops, the riverside warehouses | Collective HQ, workers' bars, the riverside quays | Collective |
| **Garrison Hill** | The old citadel, now police headquarters; the esplanade below it; officials' villas behind their walls | Vanguard House, Police Headquarters, the Esplanade, the Villas, the Gate Tavern | Vanguard |

The other two: **Station & Market** (Market Square, Tram Junction, Central Station, the Grand Hotel, the Bombed Blocks, the Station Buffet) and **Eastside** (Union House, Riverside Quays, the Ironworks Gate, the Red Lantern, Foundry Row, the Iron Bridge). Twenty-nine locations, 62 tier-1 actions at difficulty 10, three jobs (Porter 180, Street vendor 100, Driver 200; no faction pays a fifth more in the capital), with pins and texts in `docs/design/slice-4-battleground.md` §4. HQ actions are **members only**. No location is a barracks and no action is set in one (`docs/design/content-policy-review.md` §7).

**How districts work:**
- **Opinion:** each district has its own opinion meter. Irongate's city opinion is the **equal average of the five** and feeds National Control as before.
- **Control:** the same thresholds as cities (§14.3): above 50 % controls, above 70 % dominates. Control gives access, never multipliers: the faction's safehouse and prices in that district, its posters on the walls, and **police who answer to it**. Rivals of the controlling faction gain Heat 25 % faster there.
- **Battleground and Groundswell** apply per district.
- **Issues:** each of the capital's two weekly Issues is tied to a district, e.g. *Eviction Notices in Eastside* or *Press Raids in Old Town*.
- **Recognition:** the capital awards **District Hero** per district instead of one City Hero.
- **Council:** the Irongate council has **10 seats, 2 per district**, elected by that district's residents with the battleground count (§15.3: the turnout-weighted score, D'Hondt for two seats), every district counting on the same night (cycle offset 0). **The order paper carries each seated bloc's branch motion** (Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*, in order of seats) plus up to three proposals from the Irongate menu (the ten plus *Tram Subsidy*); NPC councillors vote with **their own faction's player councillors** (else their branch's motion); an item **passes with six of ten**; the ordinance applies to every district. Ten NPCs at 4 / 3 / 3 pass nothing, and one player councillor who crosses the floor carries their NPC colleagues and passes it: the capital's ordinance is a coalition or nothing. The top-voted councillor of the largest bloc is **Mayor of Irongate** (the capital's Governor, slice 7).
- **Moving around:** trams between districts are instant and free (a tram bar on every district view). Only journeys between cities take time.
- **On the map:** one image (`irongate-districts.png`, 5056 × 3392, day and night) serves both levels: the **district overview** shows it whole with five plates (Old Town 0.13, 0.24 · Government Quarter 0.49, 0.17 · Station & Market 0.46, 0.50 · Eastside 0.86, 0.62 · Garrison Hill 0.15, 0.78) and a **district view** shows the same image through a per-district crop as its initial viewport, so every pin is a fraction of the full image. District borders and states are drawn as an interface overlay on neutral art, so the map never needs repainting. `irongate-closeup.png` is reserved.

Other cities stay single-meter in MVP. Two or three districts for Coalport or Clearwater could come later if the capital works.

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
- **The journey runs in the background.** You can close the game and you arrive anyway. On the way you can read the Paper, sort the Dossier, chat and vote, but not run missions or take part in events.
- You can cancel before departure, not once the train has left.
- Scheduled Campaign Events show a **"leave by"** time for players in other cities.
- Modifiers: snow +25 % time; the Open Borders law −25 %; the Tram Subsidy ordinance halves ticket prices from that city. Entering a Vanguard-controlled city adds a **checkpoint** on about half of journeys.
- **A journey into a rival home city always triggers an event**, from the hostile-ground deck (§14.12).
- **No journey takes more than 30 minutes**, except the night train. The NPC default Directives favour the player's current city and the capital, so the daily loop never forces a trip.

**Slice 4 (pinned; `docs/design/slice-4-battleground.md` §2–3).** The nation map opens at **Level 10**. **Third class only** (20 Iron; the Tram Subsidy ordinance and the Tram Fare Hike Issue each halve fares *from* their city, never below 5). Destinations: **Irongate and your own home city**; rival home cities (*Hostile ground · from a later edition*, slice 5) and Clearwater (*No service yet*, slice 7) are on the map, locked. **The train leaves at the tap**: no departure time and nothing to cancel. Arrival is settled lazily by any read at or after `arrivesAt`. In transit: no Energy actions or training; the paper, the Me tab and the nation map, and every **political act of your residence** (ballot, endorse, declare, withdraw, propose, the council vote) work from anywhere, in transit included. Energy actions happen only in the city you are in; the job's wage arrives wherever you are (§9). Arrival is one modal (stamp *Arrived*) into Station & Market (Irongate) or the city map. **The first journey a character makes always carries a card; afterwards one in three**, drawn at boarding, seeded, without replacement until all seven have been seen; a card can be answered during the journey and on the arrival modal, and after that it was slept through. The seven cards (a talkative passenger, leaflets on the seats, the parcel, the card school, the reporter, the signal stop, the boy without a ticket) use the §8.4 check at difficulty 10, never fail, pay at most a 10-Energy action's worth, cost no Energy, and never take Iron a player did not stake; opinion from a card goes to the destination (Station & Market for the capital). Presence and carriage chat are slice 6.

**Journey events (the roadmap).** On about one trip in three, a card appears during the journey. It's always optional; ignore it and you "slept through it", with a neutral outcome. The table lists the full deck; the rows that need Heat, the Dossier, first class or the car arrive with those systems.

| Event | Needs | Choice and outcome |
|---|---|---|
| **Papers, please** | Checkpoint | Show papers (Heat and Criminal Record checked), bluff (CHA), or use forged papers (utility item) |
| **A talkative passenger** | — | Listen: a free Dossier entry, sometimes on a named NPC |
| **The parcel** | Third class, car | Carry a stranger's parcel: Iron, at the cost of +10 Heat if it's searched |
| **First-class company** | First class | A patron or official in your compartment: Favour, or a legislation rumour |
| **Leaflets on the seats** | — | Swap them for your own: a small opinion gain in the destination city |
| **Breakdown** | Car, snow | Wait (+5 min), fix it (STR or INT), or hitch a ride (a new Dossier contact) |
| **The night train** | Night train | Sleeper-car storylets for your Ambition |

**Fellow travellers:** the journey screen lists other players on the same train ("On the 14:10 to Coalport: 2 Collective, 1 Vanguard") and opens a carriage chat for the trip.

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
| **80–100 %** | **Fired up** | **+10 % Faction XP on actions at home** (a bonus line on base FXP, rounded per line, so a 6-FXP canvass shows *Fired up: +1*) · more NPC volunteers at Campaign Events · the full 10 % national weight |
| **60–79 %** | **Steady** | Normal |
| **50–59 %** | **Unrest** | A **crisis** (below) |

*Fired up* was +5 % in the first 3.1 draft; per-line rounding made that invisible at tier 1, against the rule that every result shows its numbers. At 10 % every line shows. Because an active branch keeps its city *Fired up* almost always, this is a small permanent acceleration (about +6 % Faction XP a day) rather than a bonus; accepted (Appendix C #23).

**A crisis is an event, not a loss:**
- **Announced** in every Morning Paper: *"Unrest in Coalport: dockers question the party."*
- **The Chair's Directives switch** to *Restore the base*: in slice 3, the day's slot A and B orders are replaced by a fixed pair (*Restore the base: the doors*, any canvass in the city, 3 attempts; *Restore the base: say it*, any speech, 1 attempt; the secretary's lines per faction are in `docs/design/slice-3-politics.md` §17.4), each completion paying **+40 FXP** instead of +20; players who help earn Legacy from slice 8. Orders are set once a day: if the city leaves Unrest during the day, the crisis pair stays until the next City Day.
- **Consequences while it lasts:**
  - **NPC councillors abstain** on ordinances, so a motion needs four player votes (slice 3)
  - the home city counts for only 5 % of the faction's national weight (slice 7)
  - rival spy missions there pay more (slice 5)
  - NPC councillors from that city may **defect** in the next Legislature vote (slice 7)
  - the Faction Chair faces an automatic confidence vote among members (slice 7)
- **The way out:** get morale back to 60 % or above. A *"Coalport Stands Firm"* headline (every paper, that morning) and, from slice 8, a Legacy entry go to everyone who helped. The plate shows the state word after the share (*Collective 84.0 % · Fired up*; *Unrest* in the failure colour).

**Guardrails:**
- **Rival pressure is capped per day.** A rival crew can cause a crisis but can't keep one going forever.
- **Home morale recovers faster** than battleground opinion: it drifts toward 70 % at **2 % of the distance a day**, against 1 % elsewhere. Recovery from Unrest is therefore mostly work, not waiting: from 55 the drift alone gives +0.3 a day; a canvassing member gives four times that.

**Baselines.** Each meter starts a season at its baseline and drifts back toward it (§14.2, §22.2). Home cities start at the 70 % drift target, with the rest split so that the undecided outnumber either rival. The three home cities are pinned (slices 0 and 2) and the five Irongate districts are pinned (slice 4); Clearwater stays provisional until slice 7.

| City or district | Vanguard | Collective | Alliance | Neutral |
|---|---|---|---|---|
| **Coalport** (Collective home) | 9 | **70** | 6 | 15 |
| **Duskwall** (Vanguard home) | **70** | 6 | 9 | 15 |
| **Ashford** (Alliance home) | 6 | 9 | **70** | 15 |
| Clearwater | 20 | 24 | 24 | 32 |
| Irongate: Government Quarter | 20 | 20 | 20 | 40 |
| Irongate: Old Town | 15 | 15 | 35 | 35 |
| Irongate: Station & Market | 20 | 20 | 20 | 40 |
| Irongate: Eastside | 15 | 35 | 15 | 35 |
| Irongate: Garrison Hill | 35 | 15 | 15 | 35 |

In Coalport the Vanguard sits above the Alliance because the Vanguard recruits in industrial towns (§16.1); Ashford is the mirror. The Alliance's home has the Collective as the stronger rival for the same reason.

**Residence (slice 4).** `residence { cityId, districtId?, since }` is where you vote and stand, whose paper you read first, which Party orders you get and whose Issues lead your paper; it starts as the home city, and `homeCityId` keeps meaning the faction's home (the Ambition, *Fired up*). **Moving:** Rank 2 or above, standing in the district (or at home, for the way back), one tap and a sheet that lists the consequences, **500 Iron both ways, seven days between moves** (a residence lasts at least one full council cycle). **What changes:** you vote in the district from the first election whose polls open after you registered; you may stand there from the next nominations (Rank 3, *Known* in Irongate, two endorsements from Irongate members of your faction); a candidacy filed at home is withdrawn (the deposit stays with the branch) and a home council seat is **vacated** at the move and filled by the branch's next NPC (the term is not completed); Party orders come from the capital rotation from the next City Day; the Herald is your paper. **What stays:** the job with its rules (full pay from anywhere; a capital job is a switch, and rarely worth one), Local Standing in every city, Iron, XP, Level, FXP, Rank, PC, items, the Ambition, endorsements given. **Residence has no rent** (§18.1). A **room in Irongate** is optional lodging for anyone in the city: 100 Iron for 7 City Days, Rested cap +50 while it runs (the pool keeps its value after), one at a time, renewable; prepaid like a bodyguard contract.

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

---

## 15. The Political Engine

This is what the game is about. The rule of v3.1: **politics runs on a calendar, there's always a government, and every rank above 1 has something political to do.**

### 15.1 Offices

| Office | Seats | Term | Elected by | Who can stand (the ladder) | Powers |
|---|---|---|---|---|---|
| **City Councillor** | 7 per city, 10 in Irongate (2 per district): 38 | 5 days, from one count to the next | Residents of that city or district (Rank 2+) | Rank 3 · resident · *Known* Local Standing there (§13.4) · endorsed by 2 faction members (the branch's endorsement counts, §15.3) · not a sitting councillor of that city | **Move** one ordinance a term (20 PC) and **vote** on the order paper (§15.3). Stipend 10 PC and 20 FXP a day. A term counts as completed if held to the count |
| **Governor** (Mayor, in Irongate) | 1 per city (5) | 5 days | The top-voted councillor of the largest bloc | Must have **completed a council term** before | Chooses which ordinance goes to the vote; once per term, a **Governor's Address** (+Issue momentum) |
| **Faction Chair** | 1 per faction (3) | 28 days | Faction members, Rank 2+ | Rank 4 · a completed council term · 14 days in faction | Sets Party Directives; schedules faction-wide Campaign Events; NPC whip |
| **Deputy** (Legislature) | 60 | 28 days | National ballot (faction list) | Rank 5 · a term as **Governor or Mayor**, or **3 council terms** | Propose and vote on laws; no-confidence motions |
| **Minister** | 3–4 | Serves at the head's pleasure | Appointed | Rank 5 · a term as **deputy or Governor** | Adjusts one bounded setting in their ministry each week |
| **Speaker** | 1 | 28 days | Deputies | Rank 6 · a sitting deputy | Sets the order of votes; breaks ties |
| **President / Chancellor** | 1 | 28 days, max 2 in a row | National ballot | Rank 6 · a **full term as deputy or minister** · won their faction's primary | Laws, appointments, veto (President only) |

That's **about 111 offices every term**. With council terms of 5 days, **38 council seats turn over 5–6 times per term.**

**The ladder of office.** Like the Roman *cursus honorum*, **you can't skip a rung**: each office needs a completed term in the office below it. Rank gives the right to stand; the ladder gives the experience. The result:
- a player's **first seat comes in week 2 at the earliest**, and at scale it's a contest, not a certainty (a faction may have 20 players wanting 2 seats in a district);
- **Governor or Mayor** comes in month 2, the **Legislature** at the end of season 1, and the **head of government** from season 2 for most players;
- **every rung is a new kind of play**: voting on ordinances, then choosing them, then writing national law, then running the country;
- **power is never permanent**: terms end and seats must be won again, so the political game never "finishes".

### 15.2 Integrity rules

- One account per person. Accounts on the same network can't vote in the same election or endorse each other (built with the anti-abuse work in slice 9).
- National results stay **provisional for 24 h** while admins audit for multi-accounting. **Council results are final at the count** in the MVP; when the audit exists (slice 9) it can unseat, as a recount would.
- **Tenure applies after a faction switch** (§23.4): a member who switched needs **7 days** in the new faction to vote or endorse and **14 days** to stand. A new member votes the day they make Rank 2 (§5.2). National candidates need 14 days in their faction in every case.
- Switching faction (paid token) vacates all offices, resets tenure, and halves your PC.
- Nothing political is for sale: no votes, PC, influence, offices or endorsements for money.

### 15.3 City Councils

- **Calendar (pinned, slice 3):** each city runs a **five-day cycle from the day key**, `cycleDay = (dayKey − offset) mod 5`, with offsets **Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4**. Cycle days **0–1: nominations** (declare, withdraw, endorse); **2–4: polls open**; **the count at the boundary** into the next day 0, when the new council is seated. No phase closes at a clock time; every window is at least one full City Day; polls are open somewhere every day. The count and the division are the only scheduled world events. The phase is a pure function of the day key, so nothing waits on a job.
- **Nominations:** a candidacy (Rank 3, resident, *Known*, not a sitting councillor there) costs a **10 PC deposit**, spent when the name is printed, returned if the candidacy is **struck** at the close of nominations for want of **two endorsements**. Endorsements: Rank 2+ residents, 10 PC, one per member per cycle in each city, public, irrevocable (spent even if the candidate withdraws); **the branch's endorsement** goes to any filed candidate on any day of the window on which the candidacy is filed and all three Party orders are done, whichever came first (once per candidacy); where fewer than three other eligible endorsers (resident Rank 2+ members active in the last seven days) live in the city, the branch's endorsement counts as two. A candidate may **withdraw** before polls open (the deposit stays with the branch); after that the name is on the ballot. On the morning the polls open every candidate's paper says whether the name is on the ballot or was struck. Candidates pick one of three platform lines the faction offers (content, no effect).
- **The ballot:** single choice, one tap, **secret** (no running totals during polling; every total printed after the count) and **final**. A candidate may vote for themselves; a member may vote for an NPC candidate.
- **The count in home cities** (§14.11): all 7 seats belong to the home faction. Each candidate's **total = ward vote + 3 × endorsements + members' votes**, where the **ward vote** is the NPC electorate: a player's Local Standing Successes in the city ÷ 5 (rounded down), **read at the count**, so work during the polls counts; an NPC candidate's fixed profile with a seeded jitter of ±2 per cycle, drawn when nominations open; at most five endorsements count; members' votes are one each. Seats go to the seven highest totals; **ties** by members' votes, then endorsements (all of them), then Standing Successes (an NPC's is `profile × 5`, without the jitter), then earlier filing (NPCs after every player, in profile order). A seat lost on the tie-break is printed as such, not as "by 0". **Turnout** is *voters of eligible*, where eligible is every resident Rank 2+ member active in the last seven days at the count (the same roll as the small-branch rule). Rivals can't live or stand there. The result is printed in the city's paper (§3.3) and is final.
- **Seat allocation in battlegrounds (pinned, slice 4).** In Irongate the count runs separately in each district for its **two seats**, every district on the same night. **Who votes:** Rank 2+ residents of the district (resident when its polls opened), **any faction, for any name on the district's ballot**. **Who stands:** Rank 3, resident of the district, *Known* in Irongate, two endorsements from Rank 2+ Irongate residents of the same faction (any district; one per member per cycle in the city), the slice-3 deposit and striking rules. For each faction: `ballotShare` = its candidates' ballots ÷ all ballots (0 if none); `opinionShare` = its district share ÷ the three faction shares; the **turnout weight** `w = 50 × min(1, ballots ÷ 10)` (the ballot half is worth its full 50 % from ten ballots, five points per ballot below, the rest of the weight staying with opinion); **score = w × ballotShare + (100 − w) × opinionShare**. **Two seats by D'Hondt**: the first to the highest score, the second to the highest of score ÷ (seats + 1), so the leader takes both only with more than twice the runner-up. **Ties between factions:** more ballots, then higher opinion share, then a seeded draw for the cycle (*on the returning officer's draw*). **Within a faction** seats go to its candidates by the home-city total (ward vote + 3 × endorsements + members' votes, same ties); NPC candidates fill each faction's list to two names (§15.10); a faction with no candidate forfeits to the next by D'Hondt. Ballots and seats do not move a battleground's opinion. Worked examples: `docs/design/slice-4-battleground.md` §8.2.
- **The Irongate order paper:** each faction with at least one seat puts its branch's motion on the paper at no cost, in order of seats; then up to three proposals (20 PC) from the Irongate menu (the ten below plus **Tram Subsidy**: tickets from Irongate −50 %, floor 5). NPC councillors vote for the item with most votes from **player councillors of their own faction** (ties to their branch's motion, then the earliest moved; none: their branch's motion); **passes with six or more of ten**; otherwise the council rises without a motion. The ordinance applies to every district.
- **The order paper and the division:** the new council sits from the count. On cycle days 0–1 the order paper holds **the branch's motion** (the party secretary's, at no cost: Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*) plus up to **three proposals** by councillors (**20 PC**, one per councillor per term, first come; an item already on the paper cannot be moved again, the ordinance in force can be renewed). Each councillor casts **one vote** for one item or *Against all*, public in the chamber, final. At the boundary into day 2 the council **divides**: NPC councillors vote for the item with most player-councillor votes (ties to the branch's motion, then the earliest moved; the branch's motion if no player voted for an item, *Against all* being a recorded vote and not a preference they follow, so a lone councillor cannot leave the city without an ordinance; they abstain during Unrest, §14.11); the item with most votes **passes with four or more of seven**, otherwise the council rises without a motion. A passed ordinance is **in force from that boundary for five City Days** and replaces the one before: **one ordinance per city at a time**, expiring by the calendar. Ordinances apply to **every** player in the city, regardless of faction. Until a Governor exists (slice 7) the branch's motion is the whip.

**The home-city menu (MVP, slice 3).** Ten ordinances with bounded effects on systems that exist; the bound is the value, since the menu is closed. Bonus lines appear in the result modal named after the ordinance; cost changes show on the ticket. **A cost ordinance changes the cost only**: rewards stay on the content Energy (Reading Room training at INT 12 costs 35 and still pays 99 XP).

| Ordinance | Effect in the city (for 5 days) |
|---|---|
| Public Works Order | Job pay +10 % (a line of its own on the unmodified pay, beside seniority's, §9.1) |
| **Long Service Order** (was *Shift Hours Order*; review 1) | **Seniority builds two days a day** (the +20 % cap is unchanged): a new job reaches the full rate in five days. Line: *The council backs long service: every day at the job counts double towards the rate.* |
| Street Permits | Propaganda opinion swing +15 % |
| Rally Permits | Speech actions −2 Energy (rewards unchanged) |
| Reading Room Grant | Training Energy −20 % (rounded, halves up) |
| Rest Day Order | Rested cap +50 (the pool keeps its value when the order expires) |
| Open Doors | Canvass actions +4 % success chance (a bonus row in the breakdown; the 95 % clamp applies) |
| Ward Register | Local Standing: every Success counts two |
| Ward Fund | Iron from checked actions +25 %; job pay −25 % |
| Public Meetings Order | Faction XP +25 % on actions in the city (a separate line on base FXP; stacks with a Directive's +25 % as two lines) |

The earlier list (Police Patrols, Rent Control, Market Tax, Clinic Funding, Tram Subsidy, Press Freedom / Licensing, Festival Permit, Curfew) returns, with the same bounds, in the slices that build the systems they touch: Heat and encounters (5), lodging and prices (8), tickets (4), exposés (8), social missions (5).

### 15.4 Faction Chair and Party Directives

- The **Faction Chair** is elected every 28 days by the faction's Rank 2+ members.
- Every City Day, the Chair sets up to **3 Party Directives** from a menu: canvass [city], address [Issue] in [city], gather intel in [city], support [event], turn out the vote in [city], disrupt [rival] in [city]. Each has a group target and a personal target.
- Members get **+25 % FXP on matching actions while the order is open** (on the action's base FXP, rounded per line, Partial included; never XP, Iron or opinion), **+20 FXP** the moment a personal target is reached, and **+5 PC** when all three are complete. The completing row gets the +25 %; nothing after it does, including later rows of the same ×3. The ticket tag reads *Party order 2 / 3 · +25 % FXP* while open and *Order done* after. A completed order is a signed line in the result modal; the third completion opens the **orders-complete modal** in the secretary's voice (§13.7). This keeps Directives at about 30 % of daily FXP (`docs/economy.md` §10) whatever the player's volume.
- Directives **refresh at the 00:00 UTC boundary** (§2.2). Unfinished orders are gone; nothing is taken away and there is no catch-up.
- If the faction has no Chair, or the Chair sets nothing by 06:00, an **NPC party secretary** (§13.7) issues sensible defaults based on battlegrounds and Issues.
- Directives do the tutorial's job: a new player always knows the most useful thing to do today.

### 15.5 National elections

- **Calendar:** days 28, 56 and 84 of each season. Day 84 is the **Season Election**.
- **Primaries** (days 25–26): each faction's Rank 2+ members pick **one candidate** from its declared candidates who qualify under the office ladder (§15.1). The Vanguard calls this *the Acclamation*, the Collective *the Congress*, the Alliance *the Convention*.
- **Campaign** (days 26–27): candidates publish a platform by pledging **2 laws** from the law menu. A pledge kept earns Legacy. Candidates, supporters and patrons can **endorse** (10 PC, +1 % score, up to +5 %).
- **Election day** (day 28): all Rank 2+ players vote.
- **Score:** **50 % popular vote share + 50 % National Control share**, plus endorsements and the candidate's CHA and Legacy appeal (up to +5 %). This link is how everyday missions win elections.
- **Outcome:**
  - The winner scores **55 % or more** → **President** (full powers).
  - The winner scores **less than 55 %** → **Chancellor** (limited powers; must form a coalition).
- **Legislature:** the 60 seats are split by the same scores. Each faction's seats go to its ladder-eligible list candidates in order of preference votes. The rest are **NPC deputies**.
- Takes office 24 h after polls close, once the audit is done.

| Power | President | Chancellor |
|---|---|---|
| Propose laws | 1 per week | 1 per 2 weeks |
| Veto | Yes (the Legislature can override with 2/3) | No |
| Ministers | 4, any faction | 3, **at least 1 from another faction** |
| Cultural Decree (a seasonal dress code for one term) | Once per term | No |
| Stipend | 50 PC/day | 40 PC/day |

### 15.6 The Legislature

- **Always sitting.** Seats are refreshed at every national election, whether or not anyone won a majority.
- **Proposals:** the head of government (see above); each Minister 1 per term within their ministry; any deputy 1 per term with 5 co-sponsors.
- **Voting:** a 24 h window. Laws pass by **simple majority**. **Factional laws**, whose effects differ by faction, need **60 %**.
- **Limit:** at most 5 national laws in force at once. A new law can replace an old one by explicit repeal.

### 15.7 Ministers

| Ministry | Setting (adjusted once per week, within bounds) |
|---|---|
| **Interior** | Police encounter chance ±10 %; Heat cooling rate ±20 % |
| **Labour** | Job pay ±10 %; seniority cap ±5 % |
| **Health** | Hospital costs ±25 %; HP regen ±20 % |
| **Culture & Press** | Social mission CHA thresholds ±3; propaganda influence ±10 % |
| *Treasury* (v1.2) | *Faction treasury and public spending* |

### 15.8 Laws

**Every law has fixed bounds.** Laws adjust settings; they can never break the game. Carried over from v3.0 with limits added:

| Category | Example | Effect (bounded) | Duration | Factional? |
|---|---|---|---|---|
| Energy | Emergency Permits Act (Vanguard) | Missions +2 Energy for non-Vanguard players (max +2) | 14 days | Yes, needs 60 % |
| XP | People's Education Decree (Collective) | Mission XP +15 % for all (max +20 %) | 7 days | No |
| Economy | Free Market Charter (Alliance) | Iron earned +10 % for all (max +15 %) | 30 days | No |
| Order | Curfew Order (Vanguard) | Night encounter chance ×2 (max ×2) | 7 days | No |
| Health | Universal Care Act (Collective) | Hospital costs −50 % (max −50 %) | 21 days | No |
| Travel | Open Borders Policy (Alliance) | Journeys between cities −25 % time; no checkpoints (max −25 %) | 14 days | No |
| Influence | Propaganda Ban (Alliance) | Propaganda influence −25 % (max −25 %) | 7 days | No |
| Culture | Cultural Enrichment Act (Alliance) | Social XP +20 %; CHA thresholds −3 | 14 days | No |
| Justice | Rehabilitation Act (Alliance) | All records one level lower | 21 days | No |
| Dress | Dress Code Mandate (Vanguard) | CHA 10 minimum to enter venues in controlled cities | 7 days | Yes, needs 60 % |
| Labour | Eight-Hour Day (Collective) | Salary +10 %; seniority builds ×2 | 14 days | No |
| Order | Special Powers Act (Vanguard) | Heat cools +50 % for Vanguard; Disruption against Vanguard +10 caught | 7 days | Yes, needs 60 % |

### 15.9 Recall, no-confidence and impeachment

- **Recall Petition (city):** if 10 residents (any faction, Rank 2+, 10 PC each) sign within 24 h, the city holds a **snap council election** the next day. One per city every 7 days. This is the political way to push back against a dominant faction.
- **General Strike or Mass Rally:** Campaign Events (§16.3) that can add Recall signatures and Groundswell.
- **No-confidence:** a motion by 20 deputies (50 PC each), or **automatic** if the head's faction falls below **35 % National Control**. It passes with **2/3** of the Legislature. The runner-up of the last election takes office for the rest of the term (Chancellor powers). 7-day cooldown; not allowed in the last 3 days of a term.

### 15.10 NPC fill: politics at any population

Politics has to work with 1 player or 50,000:
- **NPC candidates fill the slate to nine names** in every council election: if *p* player candidates are on the ballot, `max(0, 9 − p)` NPCs stand, from the top of the faction's slate in profile order; with nine or more players, none. Nine names for seven seats means at least two lose every cycle, and the bottom of the slate (profiles 19, 17, 15, with a ±2 seeded jitter) is close enough that a handful of members' votes decides the last seat even when no player stands. Each faction has a slate of **nine named NPC candidates** in its own voice, with a platform line each (`docs/design/slice-3-politics.md` §5.2); some of them are Dossier targets and patrons' allies later. **In Irongate** (slice 4) each faction has a separate slate of **ten, two per district** (profiles 28 and 20, the same ±2 jitter), filling each faction's list in a district to two names, so every district ballot has at least six names across three factions; the profiles are set so that about five days' work in the capital beats the district's top NPC and *Known* alone does not (`docs/design/slice-4-battleground.md` §8.3).
- **NPC candidates and office-holders** fill any seat no player wins. **They are marked**: the small faction mark in place of a face and the word *ward* in place of a rank title, on every slate, ballot, count and council screen (Appendix C #3, closed). Their standing label is derived, `profile × 5` through the §13.4 thresholds (the top three of a slate read *One of Us*, the rest *Trusted*), so it agrees with their ward vote. No NPC is ever presented as a player.
- **NPC councillors** vote for the item with the most votes from player councillors of that council (ties to the branch's motion, then the earliest moved); if no player councillor voted, for the branch's motion, which stands in for the Faction Chair's whip until a Chair exists; **during Unrest they abstain** (§14.11). NPC councillors never move a motion and draw no stipend. **NPC deputies** (slice 7) vote with the majority of their faction's player members, or follow the Chair's whip if their faction has none; with no whip either, they abstain.
- **The ward vote is the NPC electorate**: in a home city a candidate's Local Standing (§15.3), in a battleground the influence half of every score, so mission work counts even when few players vote.
- The ratio of NPCs to players is shown openly (*NPC seats: 6 / 7*, *NPC seats: 38 / 60*), so a growing player base can see itself taking over.

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

### 16.3 Campaign Events (new)

This is co-op politics: short, scheduled events that faction members fill together.

- **Scheduling:** Rank 3+ members schedule an event in a city, **1 to 12 hours ahead**. The Faction Chair can schedule them faction-wide. Limit: one per faction per city every 4 hours.
- **Roles:** 3–5 slots. Signing up commits the role's Energy (10–20). Each role rolls its own stat check, and **every role matters**.
- **Resolution:** at the start time the event resolves automatically. **Nobody needs to be online**: signing up is the commitment. Empty roles go to **NPC volunteers at half strength**, and the result waits for every participant as a result modal and in the next Morning Paper.
- **Outcomes:** Triumph, Success, Mixed or Fiasco. They decide the influence swing (scaled by event size and Issue match), FXP, PC (3–15), Issue momentum, and a headline.

| Event | Roles | Checks | Notes |
|---|---|---|---|
| **Rally** | Speaker, Organiser, Security, Press | CHA+INT, INT, STR, INT | All factions; strong on Issues |
| **Canvass Drive** | 3–5 Canvassers, a Coordinator | CHA, INT | Low risk, steady influence; good for new players |
| **Town Hall** | Moderator, 2 Speakers, Press | INT, CHA, INT | Adds Recall signatures in the city |
| **Grand Rally** (Vanguard) | Speaker, Stand-builder, 2 Stewards, Lookout | CHA, STR, STR, AGI | The movement fills the main square by the thousand: a show of numbers and discipline. Big swing; +Heat for participants in rival-held cities |
| **General Strike** (Collective) | Shop Steward, Picket Captain, Printer, Runner | CHA, STR, INT, AGI | Suspends factory jobs in the city for 1 day; strong Groundswell |
| **Headline Story** (Alliance) | Reporter, Editor, Source-handler, Lawyer | INT, INT, AGI, INT | Needs a Case File; biggest single swing against a rival |

- Each player can sign up for **3 events per City Day**.
- *v1.1:* **Counter-Demonstrations**, where a rival faction schedules into the same window to cut the swing.

---

## 17. The personal story: Ambitions, Patronage, Legacy

### 17.1 Ambitions (new)

The father's last request (§7.2) sets a **personal storyline that runs for months**, separate from the faction. It gives the player a reason to care about the city that isn't just numbers.

| Ambition | Premise | Main systems | Ending |
|---|---|---|---|
| **Clear His Name** | Your father went to prison for the Mill Fire of '19. He didn't set it. | Dossier, Case Files, exposés | Expose the real culprit, now a senator |
| **Settle His Debts** | He owed the Clearwater syndicate, and they've come for you. | Iron, Heat, the Black Market, patrons | Pay, betray or take over the syndicate |
| **Finish His Work** | He was a councillor who lost everything in one election. | Campaigning, offices, speeches | Win a seat in the Legislature under his name |

- **12 chapters** per Ambition. A chapter unlocks when its requirements are met (a level, an office, a Case File), **at most one every 7 days**.
- **Live content:** new chapters and side stories every term (28 days).
- Rewards: unique items and outfits, patron introductions, Legacy, and one-off influence events.
- Ambitions work for any faction; the storylines play out differently depending on which one you joined.

**Chapter rules (slice 2).** A chapter is a **tier-3 story of at most three steps** (§13.1): a choice with no roll, remembered as a flag for later chapters; one check with **three approaches** (two written for the story's stats and, from review 1, ***Legwork***, a best-stat check, §8.4, so that every build has an approach at its best stat), each showing its stat and chance, paid in Energy on commit; the result modal, which carries the next chapter's hook as a knock-on line. **A chapter never fails:** the check decides the text and rewards (Success / Partial / Failure, §8.4), and the chapter completes on any outcome. Chapters set in the home city trigger no encounter. Each chapter sets its own difficulty and Energy (the §8.4 tier-3 band is for later chapters and Operations). **Chapter 1** unlocks on arrival with no requirement, is delivered as a **Letter** in the welcome edition (§3.3), costs **10 Energy** at **difficulty 8**, and pays Success **150 XP / 40 FXP / 100 Iron**, Partial **75 / 20 / 50**, Failure **25 / 0 / 0**, with a keepsake (§21.4) on every outcome; no opinion; Rested applies; chapter checks count for neither Standing nor Party orders. Later chapters need their requirement and **seven City Days** since the previous one; the result modal's hook names the date, computed from the day the chapter was played, and the requirement as *at Rank n*, *at Level n* or *after your first ballot* (*Chapter 2, "Stand where he stood": from Tuesday 6 October, after your first ballot*). A chapter's Energy, XP, FXP and Iron count in the **Today tally** (§3.7); it adds no attempt or win, since it is not a tier-1 row. The third outcome's stamp reads **Failure**, as §8.4; no text in the chapter says "failed", because the texts are setbacks and the chapter completes. The kicker's *Chapter n of 12* uses the Ambition's declared length, not the number of chapters written; when the next chapter is not yet written the Letters row is simply absent. **The Paper tab's dot** shows while a chapter is ready, whether or not its Letter has been opened, and goes off once the chapter is played or mid-way (a Letter is a call to action; "opened and forgotten" is the case the dot is for). After a chapter, its screen shows only the next chapter's hook (*From Tuesday 6 October, at Rank 2*) and *Back to the paper*. Everything is resumable (`ambition { id, chapter, step, flags }`).

**Chapter 1 titles:** *His ward book* (Finish His Work: chapter 2 after the first ballot) · *The prison letter* (Clear His Name: chapter 2 at Level 6) · *The marker* (Settle His Debts: chapter 2 at Level 6). Scripts: `docs/design/slice-2-onboarding.md` §3.

**Chapter 2 of *Finish His Work* (slice 3): *Stand where he stood*.** Requirement: **the player's first ballot cast** (which implies Rank 2), plus the seven days; about day 8 for the reference recruit, between the first vote and the first candidacy. **Difficulty 14, 15 Energy**; Success **300 XP / 80 FXP / 150 Iron**, Partial **150 / 40 / 75**, Failure **50 / 0 / 0**; keepsake *His election bill* on every outcome; the Letters row reads *From the back of the ward book*. Script: `docs/design/slice-3-politics.md` §17.7. Chapter 3, *The deposit*, requires Rank 3 and is written with the slice that follows. Chapter 2 of the other two Ambitions (*The riverside house*, *The night foreman*) arrive with the systems they are about, slice 5 (Heat) and slice 8 (the Dossier); until then a player of those Ambitions sees no Letters row after chapter 1, which is the rule above. **All three Ambitions are choosable in the MVP; *Finish His Work* is built to twelve chapters first** (Appendix C #6, closed), the other two to four chapters by launch (§25).

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

### 17.3 Legacy (new)

**Legacy** is your permanent public political record, shown on your profile. It replaces a generic achievement system.

| Entry | Legacy points |
|---|---|
| City Hero | 2 |
| Council term served | 3 |
| Issue resolved (top 5) | 2 |
| Pledged law passed (§15.5) | 10 |
| Term as Minister / Speaker / Chair | 10 |
| Term as Chancellor / President | 25 / 40 |
| Ambition completed | 30 |
| Survived a no-confidence vote | 10 |
| Season Champion faction (member) | 5 |

**Legacy perks** are bought with Legacy points. They're permanent and deliberately small:
- +5 % FXP
- +1 Dossier slot, twice
- Rested cap +50
- −1 Energy on Canvassing
- +1 % personal vote appeal, up to 3
- An extra day's pay once a week
- Patron Favour +10 %
- Heat cools +10 %

### 17.4 A home of your own (new)

Where you sleep is a long-term goal, a status symbol and an Iron sink. It gives no combat power.

| Home | Cost | Where | Gives |
|---|---|---|---|
| **A rented room** | Free (the starting home) | Any city you live in | Somewhere to sleep; +10 Rested a night |
| **A flat** | 2,500 IM + 150 IM a week | Any city | +25 Rested a night; a wardrobe for 3 outfits; +2 CHA at home events |
| **A townhouse** | 25,000 IM + 800 IM a week | Home or battleground city | +50 Rested; host small events (a Campaign Event venue); a patron can visit you (Favour +10 %) |
| **A villa** (Clearwater or Garrison Hill) | 150,000 IM + 3,000 IM a week | Clearwater, or Irongate's Garrison Hill | +75 Rested; host society dinners (social missions at home); shown on your public profile; Legacy |

- The weekly cost is prepaid, like bodyguard contracts (§12.1). If it runs out you drop back to a rented room; **nothing is taken away**, and your home waits for you to pay again.
- A home belongs to one city. Moving city means renting again, so moving is a real decision.
- The map shows your home as a small marker, so you can see where your faction mates live.

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

### 18.3 Sinks

| Sink | Cost | Kind |
|---|---|---|
| Meals and lodging (buffs) | 50–1,500 | Acceleration |
| Clothing and wardrobe (CHA) | 200–50,000 | Access and status |
| Equipment and crafting | Varies by tier | Power |
| Bodyguard contracts | 350–5,600 per week | Safety |
| Bribes and bail | 500–2,000 per point | Recovery |
| Train and car tickets, a car of your own | 20–150 IM per journey (third class **20**, slice 4; never below 5 under the Tram Subsidy or the Tram Fare Hike); 5,000 IM for a car | Mobility |
| Moving residence (to a battleground district, or home again) | **500 IM**, seven days between moves; residence itself has no rent | Mobility |
| A room in Irongate (slice 4) | **100 IM for 7 days**, Rested cap +50; half price under the Evictions Issue | Acceleration |
| A home (§17.4): flat, townhouse, villa | 2,500–150,000 IM, plus a weekly cost | Status and comfort |
| Patron gifts | 100–5,000 | Relationship |
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

**The hospital is a place to play, not a waiting room.** While admitted you can talk to other patients (Dossier entries), read the paper, write to your patrons, and play a hospital storylet. **Faction mates can visit** you: +10 HP and 5 minutes off the stay, once per visitor per day.

Who controls the city changes the hospital: Vanguard +25 % cost but stronger boosts; Collective −50 % cost, no boosts; Alliance standard cost, antidote always in stock.

### 19.2 Jail (new)

You're arrested when caught while Hot or Wanted, or on an escalated record.

| | |
|---|---|
| **Sentence** | 10 min + Heat ÷ 2 min (maximum 60) |
| **Leaving early** | Pay bail (scales with record), or **a faction mate posts bail** for you. Alliance members get Legal Aid: bail at half price |
| **Inside** | Jail storylets: cellmates' intel (Dossier), a Heat reset, and recruiting prisoners for Collective and Vanguard missions |
| **Afterwards** | Heat reset to 25 |

### 19.3 Bars

| Activity | Energy | Effect | Limit |
|---|---|---|---|
| Buy a Round | 2 | In Good Spirits: +10 % XP on the next 3 missions | 3 a day |
| Bribe the Barman | 4 | City report: influence, battlegrounds, rival events scheduled | 1 a day |
| Black Market Contact | 6 | 1 random Tier II–III item | 1 a day |
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

**Example:** a player with STR 14, a truncheon (+4) and a Tier I coat (armour 4) has power 21 + 4 + 2 = **27**. Against City Police (30) that's 50 − 9 = **41 %** to fight, or with AGI 17 against 12, **85 %** to flee. Auto-resolve would pick Flee.

---

## 21. Equipment

### 21.1 Slots

| Slot | Mechanical bonus | CHA |
|---|---|---|
| Weapon | STR or flat damage | 0–3 (concealed weapons are 0) |
| Armour / clothing | Damage reduction | 5–50 (the main CHA source) |
| Utility | Mission success | 0–8 |
| Accessory | FXP gain or Energy discount | 2–15 |
| Document | INT; special dialogue | 0–5 |

### 21.2 Tiers

| Tier | Name | Unlock | Armour CHA | Examples (Vanguard / Collective / Alliance) |
|---|---|---|---|---|
| I | Improvised | Level 1 | 2–5 | Work jacket / mill coat / worn overcoat (§21.4) |
| II | Standard | Level 6 | 8–15 | Steward's jacket / convenor's coat / campaign suit |
| III | Quality | Level 16 | 18–28 | Prefect's overcoat / delegate's greatcoat / barrister's vest |
| IV | Elite | Level 31 | 30–40 | Intendant's dress suit / Congress regalia / senator's suit |
| V | Legendary | Level 51, Rank 6 | 42–50 | Keeper's regalia / Chairman's regalia / Prime Minister's frock coat |

### 21.3 Where equipment comes from

Mission drops, faction stores, clothing shops, the Black Market (with a record check), crafting (combine two items of the same type for a 40 % chance of the next tier), Ambition and patron rewards, and the Tier V quest chains.

### 21.4 The starting catalogue (slice 2)

Slice 2 uses two slots, **clothing** and **document**; the others open with the Wardrobe (slice 8). A character starts with **0 Iron**, the faction's outfit worn, the party card, and the origin coat if it was taken (worn in place of the outfit, which stays in the wardrobe as plain clothes). **Keepsakes** are unique: never sold, crafted, given or lost, marked as such in the wardrobe; some have no slot at all and simply exist in the inventory for later chapters to read.

| Id | Item | Slot | Tier | CHA | Notes |
|---|---|---|---|---|---|
| `outfit.work-jacket` | Work jacket and cap | clothing | I | 2 | Vanguard starting outfit |
| `outfit.mill-coat` | Mill work coat | clothing | I | 2 | Collective starting outfit |
| `outfit.worn-overcoat` | Worn wool overcoat | clothing | I | 2 | Alliance starting outfit |
| `outfit.fathers-coat` | Your father's coat | clothing | I | 5 | Origin, coat accepted |
| `outfit.fathers-coat-promised` | Your father's coat | clothing | I | 5 | Origin, coat promised: keepsake; the player also has +1 CHA base |
| `doc.party-card` | Party card | document | I | 0 | Keepsake; *Show papers* at checkpoints from slice 5 |
| `keep.ward-book` · `keep.prison-letter` · `keep.marker` | His ward book · The prison letter · The marker | none | — | — | Chapter 1 keepsakes, read by later chapters |
| `keep.election-bill` | His election bill | none | — | — | *Finish His Work* chapter 2 keepsake (slice 3); art `item.document-folder` |

Art and per-faction kit: `docs/design/slice-2-onboarding.md` §4.

---

## 22. Political Seasons (new)

A **Political Season** is one in-game year: 12 weeks, ending in the Season Election. Seasons give the game structure, let newcomers compete on fair terms, and set the pace for live content.

### 22.1 Season end

- **Season Champion:** the faction with the highest **Season Score** (daily National Control summed over the season, plus 10 per national election won). Members get a season cosmetic and Legacy.
- **Awards:** top ledger contributors per bracket, most City Hero titles, the best orator (event outcomes), the spymaster (Case Files used).
- **The Hall of Fame** records every President and Chancellor, Champion faction and major award.

### 22.2 Rollover (the first day of the new season)

| Resets | Stays |
|---|---|
| City influence moves **50 % of the way back to each city's starting baseline** | Level, Rank, stats, items, Iron |
| All laws and ordinances expire | PC, Favour, Legacy, Dossier |
| Heat drops to 0 | Criminal Record (minor points keep expiring on their own) |
| Season Standing and the season track | Ambition progress |
| The Issue deck is refreshed | Offices won at the Season Election (they take office normally) |

### 22.3 Season Twists

Each season adds **one rule change** to the setting, announced a week in advance:
- *The Long Winter*: winter lasts 6 weeks; Bread Prices and Flu come up more often.
- *Foreign Loan Crisis*: economic Issues dominate; Iron is scarcer.
- *Direct Rule in Duskwall*: Duskwall's council is suspended and its Governor is appointed by the head of government.
- *Free Press Spring*: exposés +50 %; propaganda −25 %.
- *The Great Exhibition*: social missions and CHA matter twice as much; a new patron arrives.
- *The Upset*: for this season only, one home city loses its 50 % floor and can genuinely be contested (§14.11). Rare, and never the same city twice in a row.

### 22.4 Season track

**Season Standing** points come from Directives, events, votes cast, Issues and offices held.
- **Free track** (30 tiers): Iron, outfits, patron introductions, Rested refills, a season title.
- **Premium track:** **cosmetic only** (outfit styles, profile frames, headline typefaces).

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
- President, Chancellor, Speaker, or kingmaker.
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
| Homes | Rented room and flat | Townhouse, villa | |
| Timed travel + journey events | ✔ (train, night train; 5 events) | Car, first class, full event deck | |
| National elections, Legislature, Chancellor/President | ✔ | | |
| Ministers | | ✔ | Treasury (v1.2) |
| NPC fill | ✔ | | |
| Faction chat and presence | ✔ | | Forums (v1.1) |
| Campaign Events | ✔ (Rally, Canvass Drive, signature events) | Town Hall | Counter-Demonstrations (v1.1) |
| Patronage | ✔ (2 patrons) | All 5 | New patrons each season |
| Legacy | ✔ (record only) | Perks | |
| Hospital and jail storylets | ✔ | | |
| Political Seasons | Season 1 (free track) | Premium cosmetic track | Twists each season |
| Bodyguards (Protect) | ✔ | | Eliminate (v1.5) |
| Player trading, faction treasury | | | v1.2 |
| Second region | | | v1.3 |
| PvP (duels, player intel, bodyguard Eliminate) | | | v1.5 |

---

## 26. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Players bring real-world political hostility** | High | Fictional, stylised factions; strict terms of service; chat moderation; no real-world symbols; no player-written public articles before moderation tooling exists |
| **Presenting a fascist faction** | High | The Vanguard is written as a period antagonist faction, not an aspiration. Named-symbol blacklist; review of all Vanguard content |
| Elections with few players feel empty | High | NPC fill; the influence half of every score; NPC-to-player ratio shown openly |
| A dominant faction steamrolls | High | No control multipliers; Battleground and Groundswell; Recall Petitions; the Chancellor coalition rule; season rollover |
| Multi-accounting and vote-stacking | High | One account per person; network checks; 24 h audit; tenure requirements; nothing transferable for new accounts |
| Politics overwhelms new players | Medium | Directives as the tutorial; the Morning Paper; Canvass Drives; council candidacy guided in Phase 1 |
| Too many currencies and meters (Energy, Rested, Heat, PC, IM, Favour, Legacy, Season) | Medium | The Morning Paper "desk" shows them together; PC and Favour appear only after first use; Legacy lives on the profile |
| Directives from a bad Chair | Medium | Players can ignore Directives; NPC default at 06:00; a Chair is recallable by a 2/3 vote of Rank 3+ members |
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

---

## Appendix A — Glossary

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
| **Ambition** | Your personal storyline, chosen at the father's deathbed |
| **NPC fill** | NPC candidates and office-holders who fill seats no player wins |

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

1. **Day boundary:** ~~UTC midnight, or the main audience's region?~~ **Closed for the MVP (29 Sep 2026): 00:00 UTC** (§2.2). Every daily rule is written per boundary crossed, so moving it later is a constant, not a redesign. Revisit with telemetry if the audience clusters far from UTC; the night window (20:00–06:00) moves with it.
2. **Election weighting:** is 50 % popular vote / 50 % influence right? Low-population servers might need more weight on influence at first. **Answered for the MVP's councils (29 Sep 2026, slice 4):** the ballot half is worth its full 50 % from ten ballots in the district and five points per ballot below (§15.3), so one ballot in a tied district decides a seat without wiping out the meter. Revisit the constant (ten) from the slice-4 count tables, and the national formula in slice 7.
3. **NPC visibility:** ~~should NPC office-holders be clearly marked, or blend in with players?~~ **Closed (29 Sep 2026): marked.** The faction's small mark in place of a face and *ward* in place of a rank title, on every political list (§15.10). Blending in would make "a growing player base can see itself taking over" impossible to see.
4. **Counter-Demonstrations:** they'd give the game its first faction-vs-faction contest. MVP or v1.1?
5. **Season length:** 12 weeks, or 8 to keep it punchier?
6. **Ambition at launch:** ~~which of the three gets fully built first? "Finish His Work" teaches politics best.~~ **Closed (29 Sep 2026): *Finish His Work* first**, to twelve chapters; the other two get chapter 1 in slice 2 and four chapters by launch (§17.1).
7. **Vanguard presentation:** ~~it needs a content and moderation policy before public testing.~~ **Content policy closed (29 Sep 2026):** the vocabulary rules and the review of every Vanguard string are in `docs/design/content-policy-review.md` (ranks, the Grand Rally, Duskwall as a customs town, chalking as words). **Still open:** the chat moderation policy before public testing.
8. **Journey times:** are 12–25 minutes right, or should the nearer cities be shorter (5–8 min) so a trip fits inside one session? **Kept at 12 / 15 / 25 for slice 4**; the playtest report measures journey-screen dwell (do players wait, or close and come back?), which is the number the answer depends on.
9. **District weights:** ~~should the Government Quarter count for more than the other four districts in Irongate's average?~~ **Closed (29 Sep 2026): equal weights for the MVP** (§14.9). A weighted average would make the Quarter the only district worth fighting in; the Battleground bonus already follows the fight wherever it is.
10. **Faction naming** (parked): plain names (Fascists, Communists, Democrats) everywhere, plain names first with party names as flavour, or keep the party names (Iron Vanguard, Red Collective, Civic Alliance) with the ideology stated.
11. **Who starts where at low population:** with few players, should new players start in a battleground instead so they meet rivals sooner?
12. **Origin story stacking:** ~~§8.5 says the origin gives "up to +5", but the §7.2 answers can stack to +8 INT (library, watched, read people) or +8 STR. Either cap the stack at +5 or accept +8 and say so.~~ **Closed (29 Sep 2026): the answers stack as written** (8–9 points counting CHA base, of which 6–9 across STR/INT/AGI; at most +8 to one stat; CHA base up to +4; best stat 8–16; §7.2, §8.5). The reference recruit is unchanged. Revisit only if telemetry shows all-in builds dominating the day-1 odds in a way the 95 % clamp doesn't wash out by day 4.
13. **Opinion swing at scale:** the §14.2 swing rates suit a few dozen active players per city. With hundreds, the meters would move tens of points a day against a 1 % drift. Options: a per-city damping factor (swing × 20 ⁄ active players there, floor ×0.25), a faster drift, or a per-faction daily cap per city. Decide once slice 4 has telemetry. Slice 4 pins the battleground drift as relative (1 % of the distance), which does not solve this; the damping factor is the lever.
14. **Rested and heavy players:** a six-session player earns little Rested and still levels about 35 % faster than the reference player (`docs/economy.md` §6): Level 10 on day 3 and Level 16 on day 8. Intended, but if telemetry shows most players are heavy the level table will read fast. The lever is the §5.3 table, not the Rested bonus (§6.3 is a pillar).
15. **Level-up points vs the training targets:** +1 stat point per level alone gives the reference player +9 by day 5 and +19 by day 20, which meets the §8.5 "best stat" targets (week 1 ~15, month 1 ~30) without any training; training on top overshoots (INT ~30 by day 7). Harmless while tier-1 odds clamp at 95 %; reconcile before tier-2 difficulties (14–20) are set in slice 5. Options: keep the rule and raise the targets, or give the level point every other level.
16. **Opinion drift before slice 4:** ~~slice 1 writes the swing but not the 2 %-a-day home drift, so a long playtest with a few testers pins Coalport near the 95 % cap. Acceptable for the slice-1 question; apply the drift lazily at the day boundary if it is cheap.~~ **Closed (29 Sep 2026): the home-city drift (2 % of the distance to 70 a day) is built in slice 3** with the council calendar's world job (§14.2, §14.11). Coalport still pins at the 95 cap with a few active testers (+5.75 a day against −0.5 at the cap), which is *Fired up* working as designed; the scale problem is #13.
17. **Salary cap on return (14 days' pay, §9.1; was 14 half-pays before the job became a wage):** "a fortnight's back pay" is a judgement, not a measured number. Revisit when the Welcome Back package (§4.2, 1 month+) is designed; it may replace the cap with a deliberate returning bonus (Rested full, a fixed Iron sum) rather than an accidental one.
18. **The welcome set is per character** (§13.7) while every other day's orders are faction-wide. ~~A character created at 23:50 UTC gets a ten-minute first City Day and the rotation the next morning. If the slice-2 playtest shows late-evening sign-ups losing the welcome set before they finish it, extend it to the second City Day when the first was shorter than two hours.~~ **Closed (30 Sep 2026, review 1): the welcome day is the City Day of creation plus the next one when created after 22:00 UTC** (§8.4, §13.7). The *First day* bonus made the short-day case sharper, so it is pinned rather than waited for.
19. **The face has no effect** (§7.3): six portraits, cosmetic only. Keep it that way; the moment appearance carries a bonus, the choice stops being about the player and starts being about the number.
20. **Ambition failure texts on day 1:** chapter 1 can end in *Failure* (25 XP, the keepsake, no Iron) on a player's first hour. It is written as a setback, not a loss, and the chapter still completes. If the playtest shows new players reading it as "I failed the tutorial", raise chapter 1's difficulty floor to Partial (no Failure band) rather than lowering the difficulty.
21. **The first ballot lands on day 2–4, not day 2** (§5.2, §15.3): polls are open three days in five, so 40 % of new players wait a day or two after Rank 2, told by the paper. If the slice-3 playtest shows the wait killing the moment, the lever is a four-day poll with a one-day nominations window (harder on casual candidates), not polls that never close.
22. **The ward-vote weights** (§15.3): Standing Successes ÷ 5 for players and the 44…15 NPC profiles were set so that a day-10 reference recruit alone in a city tops the poll by a hair and a day-14 casual takes the second seat. Retune from the slice-3 count tables if lone players never top, or always do by twenty.
23. ***Fired up* is the normal state** of any city with an active branch (§14.11), so its +10 % Faction XP is a permanent acceleration for active factions rather than a reward for turning the city round. Accepted for the MVP because the states need visible numbers; if rank pacing runs fast, lower the bonus before touching the thresholds.
24. **The small-branch endorsement rule** (§15.3: the branch's endorsement counts double when fewer than three other endorsers live in the city) exists so that one player can stand. At scale it never fires. If players find the branch's endorsement (do the day's orders) too easy a route, require it on both days of the window rather than one.
25. **No running totals during polling** (§15.3) keeps the ballot secret and vote-stacking invisible until the count, at the cost of the "it's close, turn out" hook. Revisit with turnout numbers after slice 3; a turnout count without candidate totals is the middle ground.
26. ***Against all* cannot block** (§15.3): NPC councillors vote for the leading player choice or the branch's motion, never against, so a council of players who all vote *Against all* still passes the branch's motion. Chosen so that one seat can't leave a city without an ordinance out of spite. When a Faction Chair's whip exists (slice 7), decide whether a unanimous *Against all* by player councillors should make the NPCs abstain, which would let a real majority of players stop a motion. In the capital (slice 4) NPCs follow their own faction's player councillors and nothing passes without six of ten, so a bloc of players can already block by voting their own motion.
27. **Rank 2 to move** (§14.11): the GDD's first draft said Rank 3. Lowered because the ballot is the first thing a resident does and Level 10 (the train, day 5) already gates the move; Rank 3 stays for standing. If the slice-4 playtest shows Rank 2 players moving before they understand their home branch, the lever is a day count since creation, not the rank.
28. **No early Issue resolution** (§14.6): the GDD's "or early if one faction reaches the momentum threshold" is deferred. Sunday-only keeps every week's fight alive to the end and needs no threshold. If telemetry shows lopsided weeks (one faction with ten times the momentum by Wednesday), add a **decided** state that ends the +50 % and the momentum race early while the effect still starts on Monday.
29. **Groundswell at low population** (§14.4): it fires only after a faction has crossed 50 in a district and then fallen back, which a handful of testers may never do. Built anyway (it is small and it is the anti-snowball rule); if it never fires in the playtest, seed one district above 50 for a week to see it once.
30. **Cross-faction ballots** (§15.3): any resident may vote for any name on the district ballot, so a member can vote a rival's candidate in. Chosen because a citizen votes for a person and because it is the only way a three-way count has tactics at low population. If it produces griefing (members voting the weakest rival in to split a bloc), restrict the ballot to the member's own faction plus NPCs.
31. **Seniority counts absent days** (§9.1): a player who takes a job and leaves for ten days returns at the full +20 % rate. Chosen so that absence never lowers a rate (§4.3), and because the 14-day cap bounds the sum (at most 14 × 1.2 × 216 for the Stores hand). If it reads as a reward for leaving, count only boundaries on which the player was seen in the previous seven days, never resetting.
32. **Best-stat council sessions** (§13.3): the committee is now the best-odds action in every home city and already the best FXP per Energy, so a rank-chaser can live at the HQ. Accepted: it pays no opinion, and slot B names it one day in four. If the Standing and morale ledgers show HQ-only players, lower the council FXP multiple from 1.5× to 1.25× before touching the check.
33. **The *First day* bonus is +10 % for one day** (§8.4): sized so the flattest build sits at 60 % and the day-2 odds are never lower. If the playtest shows day-2 odds reading as a drop anyway (the bonus row disappearing is visible in the ledger), the lever is a taper (+10 / +5 over two days), not a larger number.
34. **AGI level points** (§5.3): the §8.3 milestones (AGI 30 at −1 Energy on stealth) were set for a stat that grew only by training and stealth; an AGI-first player with a point a level reaches 30 about week 4. Harmless until stealth missions exist (slice 5); retune the milestones with them.

