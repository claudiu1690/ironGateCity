# Slice 7 — "The nation": the ladder above the council, the Chair's orders, Parliament and its laws, the national election, Clearwater, petitions and removals

Game designer, 3 Oct 2026. Companion to `docs/design/slice-7-screens.md` (the screens) and `docs/economy.md` §21. The architect writes the slice-7 tech design from these two documents; every rule and number here is also in the GDD (edits listed in §16). Builds on slice 5 (`slice-5-risk.md`, Heat, missions, rival ground) and slice 6 (`slice-6-together.md`: the Faction tab, events, the secretary's fixture, which this slice hands to an elected Chair).

**Playtest question:** does holding office feel powerful, and does losing it make players want to fight back?

**Rules this design obeys:** every political act is one tap or one choice (pillar 7); every window is at least one full City Day and closes at a boundary, never at a clock time; an absent office-holder's duties fall to a default, never a block; being away costs opportunity, never assets; the check formula is untouched (elections are counts); campaign vocabulary only (a term, a ballot, a bill, the party line; never a front, a war or an enemy); the Vanguard is a party with a committee, written cold; British English, 1946, noir, short. **Player-facing words** follow GDD §1.5; the new ones are in §1.1 below. System terms (Directive, whip, Legislature, National Control, recall) stay in this document and the code and never reach a screen.

---

## 1. The design in one paragraph

Every 28 City Days the republic votes: each party picks its candidate, every member votes for a **President**, and **Parliament**'s sixty seats are split by a national score that is half the ballots and half **who holds the republic** (the five cities' opinion, weighted 40 / 30 / 10 / 10 / 10). Parliament always sits: bills go up for a three-day vote, pass with 31 of 60 (36 for a law that treats the parties differently), and become **laws** that change real numbers for everyone, within fixed bounds, at most five at a time. Below that, each council's top player becomes **Governor** (Mayor in the capital) and chooses the rule put to the vote; each faction elects a **Chair** every 28 days who sets the Party orders every member reads in the morning, the party line on every bill, and the branch's event. **Clearwater** opens as the second battleground, a lake town of trams, a cannery and a casino, worth 30 % of the nation and fought three ways like a capital district. Townspeople run by the game fill every seat a player does not win, including the President's, so the republic has a government on day one and a growing player base can watch itself take it over. Residents can petition to dissolve a council; Parliament can remove a President; a faction can remove its Chair. Every one of these is one tap, settles at a boundary, and waits in the morning paper.

### 1.1 Plain words for slice 7 (GDD §1.5)

| System term | The player reads |
|---|---|
| The Legislature · a deputy · the chamber | **Parliament** · **deputy** (kept; *a seat in Parliament*) · **the chamber** |
| A bill · to table · the division · repeal · the order paper (national) · co-sponsor | **a law up for a vote** / **{Law} is up for a vote** · **put {law} to Parliament** · **Parliament votes** · **strike out** · **up for a vote in Parliament** · (not used) |
| The whip · the branch's motion (set by the Chair) · NPC deputies | **the party line** · **the party's rule** · **local deputies: townspeople run by the game** |
| Directives (set by the Chair) · standing orders · the push order · the group target | **Party orders · set by the Chair, {name}** · **the Chair's orders stay until changed** · **the Chair's push** · **the party's target today** |
| National Control · leads the nation · the national score | **who holds the republic** · **{faction} leads the republic** · **the party's score** |
| Head of state / government · the primary · the stand-in · the list · list order | **the President** · **the party's pick** (the kicker names it: *the Acclamation* / *the Congress* / *the Convention*) · **the party's own candidate · run by the game** · **the party's list** · **first on the list** |
| Recall petition · snap election · no-confidence motion · the Chair's confidence vote | **a petition to dissolve the council** · (none: the council is dissolved and the locals sit until the result) · **a vote to remove the President** · **a vote on the Chair** |
| Veto · override · provisional result · the term | **veto** (kept) · **vote it through anyway** · **the result, to be confirmed tomorrow** · **term** (kept) |
| Governor / Mayor · the Governor's motion · the Address | **Governor of {city}** / **Mayor of Irongate** · **the Governor's rule** · **the Address** |

Kept with a help note on the label: Parliament, President, Chair, Governor, deputy, term, veto, the party line, the law book, who holds the republic.

---

## 2. The calendar: the term

Everything national is computed from the City Day key, as the council cycle is (slice 3 §2.1). **A term is 28 City Days** from a fixed epoch: `termDay = (dayKey − TERM_EPOCH) mod 28`, `TERM_EPOCH` a constant set at deploy to a Monday's day key so that term day 0 is a Monday (the Issues' week and the term then share a boundary four times a term). The Political Season (slice 8) is three terms from the same epoch: its day 84 is the third term's count. No phase has a clock time; the count and the divisions are the only scheduled world events, and the phase is a pure function of the day key.

| Term day | National | The Chair (each faction) |
|---|---|---|
| **0** | **The new government sits**: the President takes office, the new Parliament is seated, the old term's bills lapse | — |
| 0–18 | Parliament sits; bills are tabled and voted (§5) | 0–8: the Chair governs the party |
| **9–10** | | **Names in** for Chair (25 Political Capital; §4.1) |
| **11–13** | | **Voting** for Chair (one tap; the secretary is always on the ballot) |
| **14** | | **The result** at the boundary into day 14; the new Chair serves to the next term's day 14 |
| **19–20** | **Names in**: for President (100 Political Capital, two pledges) and for the party's list (25) | |
| **21–22** | **The party's pick**: each faction's Rank 2+ members choose its candidate for President (one tap; the party's own figure is always on the ballot) | |
| **23–26** | **Voting**: every Rank 2+ player, one tap, any of the three candidates; **backing** (10 Political Capital) open the same days | |
| **27** | **The result** at the boundary into day 27, printed *to be confirmed tomorrow* (the 24-hour audit of §15.2; slice 9 builds the audit itself); no bill is tabled or divided on day 27 | |
| 0 (next term) | The new government takes office | |

The five-city council cycle is unchanged (Irongate 0 · Ashford 1 · Coalport 2 · Duskwall 3 · **Clearwater 4**); the Issues' week is unchanged. **Away for a term:** a player loses the chance to stand, back, vote and whip. A seat held is kept to the end of its term and paid at every boundary; the secretary and the locals do the office's duties by the defaults in §3. Nothing is taken.

**Bootstrap.** At deploy the seed installs a government so the republic is never without one: the **party's own figure** (§6.5) of the faction that wins the seeded draw among the three (the baselines are level, §8) as President for term 0, sixty local deputies at 20 / 20 / 20, the three secretaries as acting Chairs, and a local Governor in every city. The first national election closes the first full term.

---

## 3. The ladder: every office

**The rule of the ladder** (GDD §15.1): each office needs a completed term in the office below. A term is **completed** when held to its count; a seat vacated by a move, a dissolved council (§10.1) or a removal is not completed. **Holding several offices at once is allowed** in the MVP (a Governor is also a councillor by definition; a Chair may sit on a council; a deputy may hold a seat at home); the stipends add and the 1,000 cap is the only limit (Appendix C #65: the lever is forfeiting the lower seat on taking a higher office). The President holds no seat in Parliament: their place on the party's list passes down.

| Office | Seats | Term | How it is won | Who may stand (the ladder) | Pay per boundary held | What it lets you do | When the holder is away |
|---|---|---|---|---|---|---|---|
| **Councillor** (slices 3–4; Clearwater joins) | 7 at home · 10 in the capital · **7 in Clearwater** = 45 | 5 days | the city's count | Rank 3 · resident · *Known* there · two backers | 10 PC · 20 FXP | one proposal (20 PC) and one vote on the rule | the locals vote by the rule (§15.10) |
| **Governor** (**Mayor** in Irongate) | 5 | 5 days, with the council | **at the count:** the player councillor with the highest total who has **completed a council term** anywhere; in the capital and Clearwater, among the councillors of the **largest bloc** (most seats; ties by the count's tie order); none qualifying → the top **local** councillor of that bloc holds it, marked *Local* | a completed council term; nothing to file | 20 PC · 30 FXP, on top of the seat's | **the Governor's rule** (item 1 of the order paper, chosen from the menu at no cost; the locals with no player lead vote for it) · **the Address** once a term (+50 Issue points, §3.1) · the name on the plate and the paper | the rule defaults to the Chair's; the Address is lost; the locals vote as if the Governor had set nothing |
| **Faction Chair** | 3 | 28 days (term day 14 → day 14) | the faction's ballot (§4.1) | Rank 4 · a completed council term · 14 days in the faction since a switch · 25 PC · two backers | 20 PC · 40 FXP | **sets the Party orders** every member reads (§4.2) · **the party line** on every bill and the party's rule in every council (§4.3) · **calls events anywhere** and sets the fixtures (§4.4) · the Officers channel · the whip of the local deputies | the standing orders repeat; the party line is *free vote*; the fixtures run by rotation; the secretary signs |
| **Deputy** (Parliament) | 60 | 28 days (day 0 → day 0) | the national count: the party's seats go down its list (§6.4) | Rank 5 · **a completed term as Governor or Mayor, or three completed council terms** · 25 PC to go on the list | 5 PC · 30 FXP | **vote on every bill** (one tap) · **put one law to Parliament a term** (50 PC) · table a vote to remove the President (50 PC) | the local deputies vote by the rule (§5.3); the bill's slot is lost |
| **President** | 1 | 28 days; **at most two in a row** | the national count (§6.3) | Rank 6 · **a completed term as deputy** · 14 days in the faction · won the party's pick · 100 PC | 50 PC · 60 FXP | **put a law to Parliament every week**, free, in a slot of its own (§5.2) · **the veto**, once a term (§5.5) · **the Address**, once a term (+100 Issue points in one city) · the front page, the title, Legacy 40 (slice 8) | the slot is empty that week; the veto and the Address are lost; nothing else changes |

Not in slice 7: **ministers** and **the Speaker** (GDD §15.7, §25: launch + 60 days). GDD §15.5's **Chancellor** is removed: one office, one title, **the President**, and the Legislature's majority rule is the coalition rule (Appendix C #64; §6.3).

### 3.1 The Governor and the Mayor, pinned

- **Chosen at the count**, in the same transaction, from the seated **player** councillors: at home, the highest total (ward vote + 3 × backers + members' votes) among those with a completed council term anywhere (any city, any faction tenure); in Irongate and Clearwater, first the largest bloc (most seats; ties by total ballots, then opinion share, then the cycle's seeded draw, as §15.3), then the highest total among that bloc's player councillors who qualify. If nobody qualifies the office goes to the bloc's **top local councillor** (at home, the top local), marked *Local* on every list, drawing no pay and setting no rule (the Chair's rule stands). So a first-term councillor is never Governor, and a two-term player in a branch of one is Governor from their second seat on: the ladder as written.
- **The Governor's rule.** During cycle days 0–1 the Governor may choose, once, any rule from the city's menu (the eleven of §15.3); it is **added as item 1** of the order paper at no cost, ahead of the party's rule, which stays (settled 4 Oct 2026: a vote already cast for the party's item is never lost). **Local councillors who have no player lead vote for the Governor's rule** (the chain: the faction's player councillors' leading item → the Governor's rule, if the Governor is of their faction → their Chair's rule for the city, §4.3 → the secretary's). In the capital and Clearwater the Mayor's or Governor's rule is item 1 and the other blocs' rules follow in seat order; the locals of other blocs follow their own chain. A Governor who sets nothing leaves item 1 as the Chair's rule. So a lone Governor with six locals passes any rule on the menu: that is the office. The Governor's own councillor vote is cast as before.
- **The Address.** Once per term, one tap on the office page, no Energy: **+50 points of momentum** for the Governor's faction on one of the city's two Issues, attributed to the Governor as a contribution (it counts toward the top five and the 4 PC). A headline the next morning (§11.2). The player reads it as *the Address*: *The Governor speaks on {Issue}*.
- **Shown:** *Governor of Coalport* on the Me tab, the city plate (*Governor: {name}*), every political list and the profile; the paper's masthead line *Governor {name}*. The office ends with the council; no separate term line.

---

## 4. The Faction Chair

### 4.1 The election

- **Who votes:** every Rank 2+ member of the faction (tenure after a switch: 7 days), from anywhere (a political act of the faction, not of a city: works in transit, in the cells, on rival ground). One tap, secret, final.
- **Who stands:** Rank 4, a completed council term, 14 days in the faction since any switch, not a sitting Chair in the second of two terms (no limit on terms otherwise), **25 Political Capital**, spent when the name is printed, returned if struck. **Two backers** by the close of names (term day 11's boundary): members of the faction, Rank 2+, 10 PC, one backing per member per Chair election, public, irrevocable; **the secretary backs** any filed candidate on any day of the window on which the candidacy is filed and the member's three orders are done (the slice-3 rule); where fewer than three other eligible backers exist faction-wide (Rank 2+ members active in the last seven days), the secretary's backing counts as two. A candidate picks one of three platform lines the faction offers (§4.6; no effect).
- **The ballot always carries the secretary.** The names are the player candidates and **the party secretary** (*Secretary Holm · keep the orders as they are*, marked *run by the game*): a player must beat the branch's own administrator to carry the party. The secretary's line on the ballot: *If the secretary wins, nothing changes: the orders, the party line and the fixture stay the branch's.* With no player candidate there is no vote and the secretary continues (the paper says so on day 14).
- **The count** at the boundary into term day 14: each candidate's **total = members' votes + 3 × backers** (at most five backers count; the secretary has votes only); the highest total is Chair. Ties: more votes, then backers, then completed terms (a Governor term counts two, a council term one), then earlier filing. Turnout *n of m* (eligible: Rank 2+ members active in the last seven days). Final at the count.
- **The term:** term day 14 to the next term's day 14 (28 days). A Chair who is removed (§4.5) or who switches faction is replaced by the secretary until the next election. Stipend **20 PC and 40 FXP** at every boundary held, present or not.
- **What a Chair gets, in words** (the stand card): *Twenty-eight days as Chair: you set the Party orders every member reads in the morning, the party line in Parliament and in every council, and the branch's event; 20 Political Capital and 40 Party XP a day.*

### 4.2 Real Directives: the Chair's orders

Until a Chair exists the secretary's rotation sets the orders (§13.7). A Chair sets them, on the Chair's desk (`slice-7-screens.md` §5), as **standing orders**: three picks that apply from the next boundary and **repeat every day until changed**, so a Chair who opens the game once a week still shapes every member's morning. The secretary writes the lines (the Chair's orders use the secretary's templates and voice; a player writes no free text), and the Orders panel reads *Set by the Chair, {name}* under the kicker.

- **The menu** is the faction's rotation pool: every `use: 'rotation'` template of the faction for the slot (slot A: the canvass orders; slot B: party work: propaganda, a speech, the committee, intelligence, the Issue, the event, the mission; slot C: *Train once*, *Six wins*, *Five attempts*), listed by title. Each pick resolves `{city}` to the member's residence, as the rotation does, so a home resident and a capital resident read the same order in their own town.
- **The push.** One of the three (slot A or B) may be **pushed to a battleground**: a capital district or Clearwater. For members at **Level 10 or above** (the train) the order reads *Talk to voters in Eastside, Irongate · 3*; for members below Level 10 the same order resolves to their residence, so the daily loop never forces a trip a member cannot make (§14.10). At most one push: two of the three orders are always doable at home. The push carries **the party's target**: a faction-wide count of **25 / 50 / 100** matching attempts for the day (the Chair's choice), shown as a bar on the Orders panel (*The party's target today: 31 of 50 doors in Eastside*); when the faction reaches it by the boundary, **every member who did at least one** gets **+10 Party XP** in the morning and the paper prints *The {faction} Takes Eastside's Doors*. A target not reached pays nothing and says nothing.
- **What does not change:** the +25 % on matching actions, +20 Party XP per order, +5 Political Capital for all three, the welcome set on a character's first day, the crisis pair under Unrest (it replaces slots A and B for home residents whatever the Chair set), the event order's rules, orders refreshed at the boundary with no catch-up. **No scheduled job:** the Chair's standing orders are a document read at the boundary like the rotation's day key.
- **Away:** the standing orders repeat. If the Chair has never set any, the rotation applies. When a Chair's term ends and the secretary acts, the rotation returns.

### 4.3 The party line

- **In Parliament:** on every bill the Chair may set the party line, one tap: **For · Against · Free vote**. The faction's **local deputies** vote: (1) with the majority of the faction's **player deputies** who voted (a tie is no majority); (2) else the Chair's line (an **unset** line falls through; an explicit *Free vote* makes the locals abstain); (3) else the **secretary's line** on that law (content, §7.3; a secretary's *free* is an abstention). The desk shows *the secretary's line: For* until the Chair sets one (settled 4 Oct 2026). A player Chair's line therefore carries the whole local bloc when no player deputy votes, which is the Chair's national power at low population; with player deputies, they lead.
- **In the councils:** the Chair sets **the party's rule** per city (home, the capital, Clearwater), one pick each from the menu, default the secretary's (Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*), **applying from the next order paper** (never mid-paper). It is the party's item on every order paper and what the locals vote for when neither a player councillor nor a Governor of their faction leads (§3.1).
- **Appendix C #26, closed:** local councillors **abstain** when **four or more player councillors** of a home council vote *None of these* (a real majority of seven), so the council rises without a rule; below four the party's rule passes as before (one seat cannot leave a city without a rule out of spite). In the capital and Clearwater the bloc rule already lets players block, and nothing changes.
- **Unrest** (GDD §14.11): while the faction's home city is in Unrest, **its local deputies abstain on every bill** (the "defection"): the bloc goes quiet until the branch wins the town back. The Chair's line still binds nothing then; the player deputies vote as they like.

### 4.4 Events and the fixtures

- The Chair may **call an event in any open city from anywhere** (the §16.3 limits apply per city: one upcoming member-called event, two member-called starts a day), taking no role (the Chair need not be there; the call reads *called by the Chair, {name}*).
- The Chair sets **tomorrow's fixture** for each of the faction's branches (home, the capital, Clearwater): the event type (Canvass Drive · Rally · Poster Night · the signature event) and, in the capital, the district; default the slice-6 rotation. The fixture still resolves at the boundary (Appendix C #60's second fixture at the Chair's hour is not built: a Chair who wants an evening event calls one).
- **The Officers channel** (`officers:{faction}`): a fourth chat chip for Rank 4 and above, the Chair's room; the slice-6 rules.

### 4.5 Removing a Chair: the vote on the Chair

- **Automatic:** when the faction's home city **enters Unrest** at a boundary while a player Chair holds office, a vote on the Chair opens that morning (once per Chair per term).
- **By petition:** any Rank 3+ member may open a petition (10 PC, the first signature); it needs **the greater of three and a quarter of the faction's active Rank 3+ members** (active in the last seven days) within **two City Days** (it closes at the second boundary after opening); signatures are 10 PC each, public, final. Guards: not in the Chair's first five days or last three; one petition per Chair per term; a member signs once.
- **The vote:** two full City Days from the boundary after the trigger; every Rank 2+ member, one tap, *Confidence* / *No confidence*, secret, final. The Chair is **removed when *No confidence* has two thirds of the votes cast and at least three votes**. Removed: the secretary acts until the next election; the stipend stops; the term is not completed. Survived: the paper says so (Legacy 10, slice 8). The secretary never faces one.

### 4.6 Platform lines for Chair (content, ≤ 90, no effect)

- **Collective:** *Every branch organised, every battleground worked.* · *The orders written by someone who knocks doors.* · *The party line decided in the hall, not the Herald.*
- **Vanguard:** *Order in the party before order in the republic.* · *Every district reported on, every night.* · *The committee's work done, in order, by the end of the term.*
- **Alliance:** *A party that reads the bill before it votes.* · *The orders argued in the Rooms and printed in the Gazette.* · *Every member's vote, every member's voice.*

---

## 5. Parliament

### 5.1 Composition

**Sixty seats**, refreshed at every national count (§6), split between the three parties by **D'Hondt on the national scores**; each party's seats go to its **list** in order (§6.4), and the rest are **local deputies: townspeople run by the game** (eight named per party, §15.10; beyond eight, *and n more {faction} deputies*, counted). The chamber page shows the ratio openly (*Local deputies: 54 of 60*). Parliament sits in **the chamber** under the dome (`scene.parliament`, the painted chamber: the backdrop of every Parliament screen).

### 5.2 Bills: the order paper

- **The order paper holds at most three bills, plus the President's.** A bill is one law from the catalogue (§7), or **a bill to strike out** a law in force, or **a vote to remove the President** (§10.2). A bill names its law, its duration, whether it treats the parties differently (and so needs 36), and, when five laws are in force, **the law it replaces**.
- **Who tables:** the **President**, once a week (Monday to Sunday), free, in **a slot of its own** (never waits); a **deputy**, once a term, **50 PC**; a **Chair**, once a term, 50 PC (the party's national voice when it has no deputy); **the secretary** of a party that has **no player Chair and no player deputy**, at a Monday boundary when the paper holds fewer than two bills, the largest such bloc first, at most one secretary's bill a week, from its party's preferred laws in order (§7.3). So Parliament has business from day one and a player's bill always has room.
- **The vote:** open from the tabling to **the boundary into tabling day + 4** (three full City Days and the rest of the tabling day; settled 4 Oct 2026); every deputy one tap, **For** or **Against**, public in the chamber, final; not voting is abstaining. **Parliament votes at that boundary.** Tabling closes after term day 23, so nothing divides on day 27; one bill per member per term, whichever office tables it; at the cap with no live named law, the law ending soonest (ties: the oldest) ends when the new one starts. Local deputies vote by §4.3's chain. **Passes with 31 or more For; a factional law with 36 or more.** Abstentions count for nothing.
- **In force** from the boundary into the day after the division (one day *awaiting the President's signature*, the veto's day, §5.5), for the law's duration, in every city, as a bounded line like a council rule's; the player reads *{Law} in force · 12 days left* in the law book and on the affected tickets (*Public Assembly Act: 10 Energy*). A failed bill cannot be tabled again for **seven days**. The old term's open bills **lapse** at term day 0 (the new Parliament starts clean).
- **Striking out:** a bill *to strike out {law}* passes with 31 (the law's own threshold does not apply); the law ends at the boundary after the division, with no signature day. **The cap:** at most **five laws in force**; a bill tabled while five are in force must name the law it replaces, which ends when the new one starts (if the named law has expired by then, nothing is replaced).

### 5.3 The deputy's part

A deputy's whole term is a vote a few times a week and, once, a bill. The Parliament page lists the bills with the deputy's vote open as a radio row and a sticky **Vote For {law}** / **Vote Against**; the result modal (§12) says when Parliament votes. A deputy who never opens the game casts no vote and loses nothing; the bloc's locals follow the chain. **Deputy stipend 5 PC and 30 FXP** at every boundary held.

### 5.4 Where a law applies, and how it combines

A law is a **third source** of the slice-3 effect kinds (a council rule, an Issue, a law), combined by the slice-4 rules (GDD §14.6): Energy, chance and Rested-cap deltas **add**; pay, Iron and Party XP percentages are **each a line on the base**; opinion, ticket and room percentages **multiply**; multipliers take the larger. A law applies **everywhere** (every city, every player; a factional law to its party's members or to everyone else, by its `appliesTo`), and the "where an effect applies" rule holds: actions where you act, the wage where the job is, the Rested cap where you live. **Laws never touch Party XP or the odds of a check** (no `fxpPct`, no `chancePct` in the catalogue): a law changes the republic's prices and pace, never how fast a party ranks up or how a tap rolls.

### 5.5 The veto

Once per term the President may **veto** a bill Parliament has passed, on its signature day (the day between the division and the law coming into force): one tap on the bill's page, *Veto*. The bill does not come into force; the paper prints it. Parliament may **vote it through anyway**: the bill returns to the order paper (its own slot, no cost) for a second three-day vote and passes with **40 of 60**; then it is in force from the boundary after, with no second veto. A vote to remove the President cannot be vetoed.

---

## 6. The national election

### 6.1 Names in (term days 19–20)

- **For President:** Rank 6 · a completed term as deputy · 14 days in the faction since any switch · not a sitting President in a second consecutive term · **100 Political Capital** (spent when the name is printed, returned only if the candidacy is withdrawn before the party's pick opens). The candidate picks **two pledges** from the law catalogue (printed on every ballot and the office page; a pledge is kept when that law passes during the term: a headline, and Legacy 10 each from slice 8) and one of the faction's three platform lines. No backers are needed: the party's pick decides.
- **For the party's list:** Rank 5 · a completed term as Governor or Mayor, or three completed council terms · 14 days · **25 Political Capital**. No backers needed. A presidential candidate is **first on the list automatically** (a losing candidate leads the bloc as a deputy; a winning one's place passes down).
- Nothing else is required of a candidate for the rest of the term: the primary, the campaign and the vote run without them.

### 6.2 The party's pick (days 21–22)

Each faction's Rank 2+ members (tenure 7 days) choose the party's candidate for President: **one tap, secret, final**, from the faction's declared candidates **and the party's own figure** (§6.5), who is always on the ballot (*run by the game*: a player must carry the party to carry its name). Most votes wins; ties by completed terms (a Governor term two), then filing (backing opens after the pick; settled 4 Oct 2026). No declared candidate: the party's own figure stands, with no vote. The kicker names the faction's word: ***the Acclamation*** (Vanguard), ***the Congress*** (Collective), ***the Convention*** (Alliance). The result is printed on the morning of day 23 with the national ballot's opening.

### 6.3 Voting and the count (days 23–26; the count into day 27)

- **The ballot:** every Rank 2+ player, from anywhere, one tap, **one of the three candidates for President** (any party), secret, final. The list carries each candidate's name, party, pledges and platform; a party's own figure is marked *the party's own candidate · run by the game*.
- **Backing:** Rank 2+ members, **10 PC, one per member per term**, public, irrevocable, for **their own party's candidate for President** (+1 to the party's score, at most +5 from backers) **or for one name on their party's list** (it orders the list, §6.4). One backing a term, so a member chooses which.
- **The party's score** (the GDD's 50 / 50): for each party *f*, `ballotShare_f` = ballots for its candidate ÷ all ballots; `controlShare_f` = its National Control ÷ the three parties' National Control (§8; Neutral excluded); the **turnout weight** `w = 50 × min(1, ballots ÷ 30)` (the ballot half is worth its full 50 from thirty ballots across the republic, 5⁄3 of a point per ballot below: the capital's rule at three times the scale); **score_f = w × ballotShare_f + (100 − w) × controlShare_f + min(5, backers_f)**. The player reads it as *the party's score mixes its share of the votes with its share of the republic's opinion, plus its backers*.
- **The President** is the candidate with the highest score; ties: more ballots, then the higher control share, then the term's seeded draw (*on the returning officer's draw*). **Parliament's sixty seats** go by **D'Hondt** on the three scores. Worked at the baselines (level control shares, no ballots): three scores of 33.3, the draw decides the President and the seats split 20 / 20 / 20; one Collective ballot and nobody else's: w = 1.67, Collective 34.4 against 32.8 and 32.8, the Collective's candidate is President and the split is still 20 / 20 / 20; ten Vanguard ballots and five Collective: w = 25, Vanguard 16.7 + 25.0 = 41.7, Collective 8.3 + 25.0 = 33.3, Alliance 25.0, seats **25 / 20 / 15**. Mission work and events win elections through the control half; ballots win them through the other.
- **The count** at the boundary into day 27 prints the result in every paper *to be confirmed tomorrow* (§15.2's provisional day; the audit is slice 9, so in slice 7 nothing changes on day 27 but the paper's wording); **the President and the new Parliament take office at the boundary into day 0**. A sitting President serving a second consecutive term may not stand; the candidate list says so (*{name} has served two terms in a row and stands down*).
- **Legacy:** President 40 (a completed term); the Chancellor row goes (GDD §17.3).

### 6.4 The list and the seats

Each party's seats go down its list: **(1) its candidate for President** (if not elected); **(2) its list candidates by backers received**, ties by completed terms (a Governor term two, a council term one), then total Reputation wins across the five cities, then filing; **(3) its local deputies** in slate order. A member who wants a say in the list backs a name (10 PC); that is the GDD's "preference vote", re-expressed through the backing every member already knows. The list is printed on the party's page from day 21, live, so a candidate sees where they stand all week.

### 6.5 The party's own figures (NPC fill at the top)

Each party has one national figure who stands for President when no player carries the party's pick and who holds the office when nobody wins it, marked *run by the game* wherever a candidate or office-holder is shown, with a portrait (§19) and a line. Written cold.

| Id | Name | Who | Line on the ballot |
|---|---|---|---|
| `npc.v.albrecht` | Dr Konrad Albrecht | Chairman of the Vanguard's national committee; a retired appeal-court judge, Irongate | "A republic in order, from the frontier to the forecourt." |
| `npc.c.brod` | Hanna Brod | General secretary of the Red Collective; a tram conductors' union secretary from Coalport | "The wage, the rent and the tram, settled by the people who pay them." |
| `npc.a.faber` | Professor Emil Faber | Chairman of the Civic Alliance; a constitutional lawyer at Ashford University | "Read the law, keep the courts, count every vote." |

A party's own figure never backs, pledges or vetoes; as President it tables the party's preferred laws by the secretary's rule (§5.2) and uses no veto and no Address. It draws no pay.

---

## 7. Laws

### 7.1 Rules

Every law is a **bounded modifier** on numbers that exist, in `packages/rules` terms, with its bound in the table (the catalogue is closed, so the bound is the value, as the council rules). A law lasts its **duration** (7 / 14 / 21 / 28 days) from the day it comes into force and expires by the calendar, never by a job on the law; **at most five in force**; **one of each law** at a time (a law in force cannot be tabled again; a law can be renewed by tabling it in its last week, which replaces itself); a **factional** law (one whose effect names a party's members or everyone else) needs **36 of 60**. **All laws expire at the Season rollover** (slice 8). The player reads a law's line on the ticket or the desk exactly as a council rule's (*People's Education Act: +15 % XP on missions*), with the kicker *LAW* instead of *COUNCIL RULE*; the **law book** lists every law in force with its days left and who put it to Parliament.

### 7.2 The catalogue (13)

`appliesTo`: *all* unless stated; *members* = the law's party's members, *others* = everyone not of it (factional, 36). The secretary's line (§4.3, §7.3) is each party's default vote: **F** for, **A** against, **—** free (abstain).

| Id | Law (party) | One line (≤ 120) | Effect (the bound is the value) | Days | Needs | V · C · A |
|---|---|---|---|---|---|---|
| `law.peoples-education` | People's Education Act (Collective) | Night schools and reading rooms paid for by the republic: every lesson learned on a mission counts for more. | **XP from missions +15 %** (`xpPct`, scope missions; bound +20) | 14 | 31 | A · F · F |
| `law.eight-hour-day` | Eight-Hour Day Act (Collective) | Eight hours by law, and long service counted double, in every works in the republic. | **Job pay +10 %** · **seniority ×2** (`jobPayPct`, `seniorityDays`) | 14 | 31 | A · F · — |
| `law.universal-care` | Universal Care Act (Collective) | The infirmaries treat first and bill after: walking out well costs half. | **The infirmary's *Walk out well* −50 %** (`infirmaryCostPct`; bound −50) | 21 | 31 | A · F · F |
| `law.workers-charter` | Workers' Charter (Collective, **factional**) | A charter for the organised: Collective members draw more at every wage packet in the republic. | **Job pay +15 % for Collective members** (`jobPayPct`, members; bound +15) | 14 | 36 | A · F · A |
| `law.free-market` | Free Market Charter (Alliance) | Licences by rule and prices by the market: every Iron earned on the street is worth a tenth more. | **Iron from actions and missions +10 %** (`ironPct`, scope checked; bound +15) | 28 | 31 | — · A · F |
| `law.open-borders` | Open Borders Act (Alliance) | The lines run through and the barriers stand up: every journey a quarter shorter. | **Journeys −25 % time** (`journeyTimePct`; bound −25). The rival-ground card is unchanged | 14 | 31 | A · — · F |
| `law.press-licensing` | Press Licensing Act (Alliance) | Posters and flyers need a licence from the courts: unlicensed paper moves opinion a quarter less. | **Propaganda opinion −25 %** (`swingPct`, propaganda; bound −25) | 7 | 31 | — · A · F |
| `law.rehabilitation` | Rehabilitation Act (Alliance) | A record is not a life: minor marks fade in a week, and bail is a quarter less. | **Minor marks fade after 7 days** (`markFadeDays` 7; bound 7…14) · **bail −25 %** (`bailPct`) | 21 | 31 | A · F · F |
| `law.civic-education` | Civic Education Act (Alliance, **factional**) | The Alliance's reading rooms open to its members at the republic's expense: training costs them a fifth less. | **Training Energy −20 % for Alliance members** (`trainingEnergyPct`, members) | 14 | 36 | A · A · F |
| `law.emergency-permits` | Emergency Permits Act (Vanguard, **factional**) | Anyone not of the Vanguard needs a permit for party work: every mission costs them two Energy more. | **Missions +2 Energy for everyone not of the Vanguard** (`missionEnergyDelta`, others; bound +2; rewards on the content Energy) | 14 | 36 | F · A · A |
| `law.curfew` | Curfew Order (Vanguard) | The streets clear at eight: a run-in after dark is twice as likely, for everyone. | **Run-ins ×2 at night** (`runInPct` +100, window 20:00–06:00 UTC; bound +100) | 7 | 31 | F · A · A |
| `law.special-powers` | Special Powers Act (Vanguard, **factional**) | The police look the other way for the Vanguard: its members' Heat cools half again as fast, and anyone caught working against the party is held. | **Heat cools +50 % for Vanguard members** (`heatCoolPct`, members) · **the caught check +10 on missions against the Vanguard** (`caughtDelta`, scope against the party; bound +10) | 7 | 36 | F · A · A |
| `law.public-assembly` | Public Assembly Act (Vanguard) | A permit for every corner, issued to all: speeches cost two Energy less in every city. | **Speech actions and missions −2 Energy** (`energyDelta`, speech) | 14 | 31 | F · F · — |

**New DSL kinds** (bounds in `packages/rules`, enforced by the content loader): `xpPct { scope: 'missions' | 'actions' }` −20…+20 · `missionEnergyDelta` −2…+2 · `journeyTimePct` −25…+25 · `runInPct { window?: 'night' }` −50…+100 · `infirmaryCostPct` −50…+25 · `markFadeDays` 7…14 · `caughtDelta { scope: 'againstFaction' }` 0…+10; every law effect may carry `appliesTo: 'all' | 'members' | 'others'` (default *all*; *members* and *others* make the law factional). **The curfew's "night"** is GDD §2.2's window, the same one the map's night art shows, so the ticket and the picture agree (*Curfew Order · run-ins ×2 until 06:00*).

**What passes by itself.** With sixty local deputies and no player, the secretaries' lines pass the laws two parties agree on (People's Education, Universal Care, Rehabilitation, Public Assembly: 40 For each) and fail the rest; a player Chair who whips one bloc the other way changes any of them (a Vanguard Chair voting For the Eight-Hour Day makes 40). The book fills with two or three consensus laws at a time and no factional law until a party holds 36 seats or wins a rival bloc. That is the design: the republic has laws from the first week, and a player's first national act is to change which.

### 7.3 The secretaries' preferred laws (what they table, in order)

Vanguard: Public Assembly · Curfew · Emergency Permits · Special Powers. Collective: Eight-Hour Day · People's Education · Universal Care · Workers' Charter. Alliance: Free Market · Open Borders · Rehabilitation · Press Licensing · Civic Education. A secretary skips a law in force or failed in the last seven days and starts again at the top when the list is spent.

---

## 8. National Control: who holds the republic

- **The formula** (GDD §14.8, pinned): for each party, `NC = 0.40 × Irongate (the equal average of the five districts) + 0.30 × Clearwater + 0.10 × Coalport + 0.10 × Duskwall + 0.10 × Ashford`, each a share of that city's meter; **a home city in Unrest counts half for every party and Neutral** (its weight 0.05, GDD §14.11; the shares then sum to 95 and the bar shows them as they are; settled 4 Oct 2026). Computed on read at the boundary, stored with the day's battleground flags, shown to one decimal. **Clearwater's baseline is evened to 22 / 22 / 22 / 34** (was 20 / 24 / 24 / 32, provisional): at the baselines every party holds 23.5 and nobody starts ahead, which §14.8 promises; Clearwater's character lives in its places and Issues, not its meter.
- **What it does:** half of every party's national score (§6.3) and so the President and Parliament's sixty seats; the Season Score (slice 8); the nation map's layer and the paper's line. **It gives no multiplier** (GDD §14.3).
- ***Leads the republic.*** The party with the highest National Control at a boundary *leads the republic* for the day: the nation map's bar names it, every paper's national section carries the line, and a change of leader is a headline. Nothing else: it is the scoreboard, not a prize.
- **Control of Clearwater** (above 50 at a boundary; dominance above 70) is a district's (GDD §14.3, §14.9): access, never multipliers. Pinned for slice 7 for Clearwater **and the capital's districts**: the controlling party's posters on the plate (text), its name on the card, and **rivals of the controlling party gain Heat 25 % faster there** (`heatGainPct` +25 for them; the police answer to the council majority). Groundswell applies to Clearwater as to a district (lost control → +5 % a day to +30 %, fourteen boundaries). Home cities cannot be lost (the floor), so Groundswell stays off them (GDD §14.4, confirmed).

---

## 9. Clearwater

### 9.1 The city

| | |
|---|---|
| Role | **Battleground**, single meter, the second of two (30 % of the nation) |
| Baseline | **22 / 22 / 22 / 34** (§8) |
| Rules | A capital district's: drift 1 % of the distance to the baseline a day; a *close race* when the top two are within ten (+25 % opinion, +25 % Party XP, +5 % chance on political actions); *comeback*; control and dominance; difficulty **10** on tier 1, **20** on missions (the ladder's 18 at Level 10, +2 as the capital); residence from Rank 2 (500 Iron, seven days between moves, the ballot rule); a **room** (100 Iron, seven nights, Rested cap +50; half price under *Rents in the Rows*); its own rotation of Party orders (§23.4: slot A *Talk to voters anywhere in Clearwater* ×3; slot B *Speak on this week's Issue* ×2 and *Watch and listen anywhere in Clearwater* ×2, with the shared mission and event orders; no HQ order); a branch for every faction with a daily fixture and a *Clearwater branch* chat chip; two Issues a week from its own deck (§9.6); heroes per bracket |
| Council | **Seven seats, three-way**, cycle offset **4**; the count by the battleground formula with **seven seats by D'Hondt** on the three scores (`w = 50 × min(1, ballots ÷ 10)` as a district), each party's seats to its candidates by the home total, local candidates filling each party's list to **three names** (§9.5); **passes with four of seven**; the order paper as the capital's (the Governor's rule, then each seated bloc's party rule, then three proposals); the Governor as §3.1 (the largest bloc) |
| The hall | **The Casino** (`council.hall`: *the Casino*, 0.33, 0.62 on the city picture): the town council sits in the committee room the casino company lends it; the election screens' crop and the kicker *CLEARWATER COUNCIL · THE CASINO*. A backdrop and a name, not a location |
| Paper | ***The Clearwater Courier*** ("Lake, town and harbour, every morning", 6 marks). Residents read it; a visitor reads it while in the city (the Herald's rule) |
| Travel | **Open from slice 7**: 25 minutes third class from Irongate, 20 Iron (the Tram Subsidy and *Tram Fare Hike* halve fares *from* Clearwater); from an outer city through the capital (Coalport 37, Ashford 37, Duskwall 40). The painted coast line between Coalport and Clearwater **stays scenery** (Appendix C #8, closed): every service runs through the capital, which keeps the three home cities' roads to the second battleground within three minutes of each other. The first journey's card rule and the one-in-three draw are the slice-4 deck's; no hostile card (it is nobody's home). The arrival is **Clearwater Station**, The Harbour |
| Quarters | Three frames on the painted picture, all open to anyone who arrives (nobody reaches Clearwater below Level 10): **The Harbour** (the station's; the landing), **The Depot**, and **The Front** as a teaser (*Opens with a later edition · The promenade, the casino and the lido: the money side of town*): its places are the society side and open with the Wardrobe and the villa (slice 8). The overview with outlines and a quarter bar, the capital's pattern. **Content order follows the survey's quarter numbers** (The Front 1, The Depot 2, The Harbour 3); the landing is the station's quarter by rule (§14.13), whatever its index (§17 Q6) |

**Frames** (the pins' box grown by 0.06, clamped; the developer tunes in the dev viewer and draws the outlines along the lake shore, the tram lines and the drawn blocks):

| Quarter (id) | Pins' box (x, y) | Frame x0, y0, x1, y1 | What it shows |
|---|---|---|---|
| **The Front** (`clearwater.front`), teaser | 0.20–0.56, 0.60–0.88 | 0.14, 0.54, 0.62, 0.94 | The lake's edge: the promenade and its bandstand, the domed casino above the terraces, the lido's pavilion, the pier and its hotel |
| **The Depot** (`clearwater.depot`) | 0.38–0.71, 0.12–0.47 | **0.32, 0.06, 0.77, 0.53** | The working town: the tram sheds' glass roof and fan of track, the arches with the barrows under them, the terraces below, St Martin's green spire, the sanatorium on the slope |
| **The Harbour** (`clearwater.harbour`) | 0.72–0.92, 0.47–0.76 | **0.66, 0.41, 0.98, 0.82** | The harbour mole and its lighthouse, the fish quay, the station's canopy, the cannery's chimney, the harbour police by the ferry stage |

Crowding (44 px on a 360 px phone at the covering scale): the Depot's closest pair is Back Lane Market and the Rows (0.099, about 80 px); the Harbour's is the station and the cannery (0.124, about 140 px). No edge pins.

### 9.2 The nine places

Kinds from the closed §13.5 list; blurbs ≤ 200; the survey pins of `mapPins.clearwater`. Appendix C #40 is closed: the six provisional names are confirmed (the tin chapel is **St Martin's**, as renamed on 2 Oct 2026) and three more are made playable from the survey.

| # | Id | Name · ref | Kind | x, y | Quarter | Blurb |
|---|---|---|---|---|---|---|
| 1 | `clearwater.promenade` | The Promenade · *the Promenade* | `square` | 0.20, 0.69 | The Front (teaser) | — (slice 8) |
| 2 | `clearwater.casino` | The Casino · *the Casino* | `bar` | 0.33, 0.60 | The Front (teaser) | — (slice 8; the council's hall is a crop here, not this location) |
| 3 | `clearwater.lido` | The Lido · *the Lido* | `square` | 0.42, 0.88 | The Front (teaser) | — |
| 4 | `clearwater.pier-hotel` | The Pier Hotel · *the Pier Hotel* | `hotel` | 0.56, 0.82 | The Front (teaser) | — |
| 5 | `clearwater.tram-depot` | Tram Depot · *the Tram Depot* | `station` | 0.38, 0.32 | The Depot | The company's sheds under a glass roof: a fan of track, four trams in for the night, crews at the gate at six. Whoever runs the trams runs the town's mornings. |
| 6 | `clearwater.back-lane-market` | Back Lane Market · *Back Lane Market* | `market` | 0.45, 0.40 | The Depot | Barrows under the railway arches behind the depot: fish, bootlaces, things without a receipt. A café with a hatch, and men who watch who buys what. |
| 7 | `clearwater.rows` | The Rows · *the Rows* | `street` | 0.52, 0.47 | The Depot | Workers' terraces below the depot, back yards and washing, a corner shop on tick. The lake is a mile away and nobody here has seen the casino's inside. |
| 8 | `clearwater.st-martins` | St Martin's · *St Martin's* | `square` | 0.55, 0.22 | The Depot | The working town's church: a stone nave and a green copper spire above the tram sheds. The bell goes at six for the early shift and at noon for the market. |
| 9 | `clearwater.sanatorium` | The Sanatorium · *the Sanatorium* | `hospital` | 0.71, 0.12 | The Depot | The lake-air sanatorium on the slope: long verandahs, iron beds, a reading room with the Courier on a stick. The town's infirmary, whatever the brochure says. |
| 10 | `clearwater.harbour` | The Harbour · *the Harbour* | `docks` | 0.72, 0.62 | The Harbour | A stone mole with a small lighthouse, a fish quay with its crates, yachts on one side and the fishing fleet on the other. The ferry leaves from the stage at the hour. |
| 11 | `clearwater.cannery` | The Cannery · *the Cannery* | `factory-gate` | 0.92, 0.47 | The Harbour | The fish cannery under its one chimney: the working town's biggest wage and its loudest hooter. Two shifts, and the lake wind takes the smell to the Front. |
| 12 | `clearwater.station` | Clearwater Station · *the station* | `station` | 0.80, 0.50 | The Harbour | The end of the lake line: one canopy, a buffet, and twenty-five minutes of capital on the board. Arrivals are met; departures are watched. |
| 13 | `clearwater.harbour-police` | Harbour Police · *the harbour police station* | `jail` | 0.80, 0.76 | The Harbour | The harbour police station by the ferry stage: two cells, a stove, and a duty officer who knows every boat on the lake by its lamp. The town's cells. |

The Sanatorium is Clearwater's infirmary and Harbour Police its cells (slice 5's rules; the quarter opens when the game sends a player there; both have ordinary tickets when a player walks in).

### 9.3 Tier-1 actions (24)

Difficulty **10** (a battleground). Rewards at the tier-1 rates by type and Energy; checked actions count for Reputation in Clearwater (a fresh ladder, as the capital's). Titles in plain words. Training's button is the verb.

| Id | Title | Type | Stat | E |
|---|---|---|---|---|
| **The Harbour** | | | | |
| `clearwater.harbour.fish-quay` | Talk to the fish quay at the morning sale | canvass | INT | 10 |
| `clearwater.harbour.ferry-stage` | Hand out flyers at the ferry stage | propaganda | AGI | 8 |
| `clearwater.harbour.mole` | Speak from the mole steps | speech | CHA+STR | 12 |
| `clearwater.harbour.night-boats` | Note which boats land after dark | intelligence | INT | 4 |
| `clearwater.cannery.shift` | Talk to the cannery workers at the shift change | canvass | CHA+INT | 10 |
| `clearwater.cannery.wall` | Put up posters on the cannery wall | propaganda | STR | 8 |
| `clearwater.cannery.crates` | Stack crates on the loading bank | training (STR) · verb *Stack* | — | 20 + 2×STR |
| `clearwater.station.platform` | Talk to the arrivals on the platform | canvass | INT | 10 |
| `clearwater.station.watch` | Watch who meets the Irongate train | intelligence | INT | 4 |
| `clearwater.harbour-police.notices` | Read the notices at the station door | intelligence | INT | 3 |
| `clearwater.harbour-police.desk` | Talk to people waiting at the desk | canvass | INT | 10 |
| **The Depot** | | | | |
| `clearwater.tram-depot.crews` | Talk to the tram crews at the gate | canvass | STR | 10 |
| `clearwater.tram-depot.platform` | Speak from a tram's platform in the yard | speech | CHA+INT | 12 |
| `clearwater.tram-depot.office` | Watch the shed office | intelligence | INT | 4 |
| `clearwater.back-lane-market.barrows` | Talk to the barrow men | canvass | CHA+INT | 10 |
| `clearwater.back-lane-market.arches` | Hand out flyers under the arches | propaganda | AGI | 8 |
| `clearwater.back-lane-market.hatch` | Listen at the café hatch | intelligence | INT | 3 |
| `clearwater.rows.doors` | Knock on doors in the Rows | canvass | INT | 10 |
| `clearwater.rows.gables` | Put up posters on the gable ends | propaganda | STR | 8 |
| `clearwater.rows.run` | Run messages for the tenants' committee | training (AGI) · verb *Run* | — | 20 + 2×AGI |
| `clearwater.st-martins.door` | Speak at the church door after the service | speech | CHA+INT | 12 |
| `clearwater.st-martins.steps` | Talk to the congregation on the steps | canvass | CHA+INT | 10 |
| `clearwater.sanatorium.visitors` | Talk to people at visiting hour | canvass | CHA+INT | 10 |
| `clearwater.sanatorium.reading-room` | Study in the sanatorium's reading room | training (INT) · verb *Study* | — | 20 + 2×INT |

**Count:** canvass 9 · speech 3 · propaganda 4 · intelligence 5 · training 3 (STR, AGI, INT) = 24. No council action: Clearwater has no party house (a Chair's push gives it the party's attention instead). The training verbs for `{verbs}`: *Study, stack or run*.

#### 9.3.1 Outcome texts (≤ 240, ≤ 4 sentences)

**Talk to the fish quay at the morning sale**
- Success — *Between the lots* — The auctioneer sells by the crate and you sell between crates: rents, the dues, the cannery's wage. Fishwives listen with their arms folded, which on this quay is a yes. Ten flyers go into aprons.
- Partial — *Sold before you finish* — The sale moves faster than your sentences. You get the dues in before a lot of perch goes under the hammer and the crowd goes with it. Two women take a flyer for the wrapping.

**Hand out flyers at the ferry stage**
- Success — *The quarter-past* — The ferry queue is a captive one: forty people, a bell, and nothing to read. Your flyers go hand to hand along the rail before the gangway drops. Half of them cross the lake with the party in their pockets.
- Partial — *The bell beats you* — The ferry bell goes early and the queue surges past you onto the stage. You press flyers on the stragglers and the deckhand, who reads his aloud for the saloon. Not nothing.

**Speak from the mole steps**
- Success — *Over the water* — The mole carries a voice a long way on a still morning. You speak to the quay and the fleet hears you across the basin, and a skipper leans on his wheelhouse to listen. The lighthouse keeper nods once.
- Partial — *The wind off the lake* — Halfway through the dues the wind comes round and takes the rest of it up the slope to the Front. The quay hears you; the boats hear the gulls. You finish for the people who stayed.

**Note which boats land after dark**
- Success — *Three lamps, one dark* — Three boats come in after the light goes: two with lamps and the crates stamped, one dark, met by a van with no name on it. The plate, the time and the quay go in the notebook.
- Partial — *A fog on the water* — The fog comes down at ten and the basin is a sound of oars. One boat lands that you can swear to, with a lamp and nothing to hide. Another night for the dark one.

**Talk to the cannery workers at the shift change**
- Success — *The hooter stops them* — The hooter goes and four hundred come out of the gate smelling of brine and wanting to be talked to by anyone who isn't the foreman. You keep it to the wage and the Rows. Flyers go by the dozen.
- Partial — *Most make for the tram* — The shift comes off at a run for the depot tram and most of it is gone before you've said the party's name. A knot of the older hands stops. One asks what you'd do about the hooter.

**Put up posters on the cannery wall**
- Success — *The long wall* — The cannery wall runs the length of the quay and by the end of the shift it says the party's name forty times, dry and square. The night watchman walks past twice and reads one.
- Partial — *The wet end* — The quay end of the wall is wet from the hoses and the paste won't hold. You get twenty up on the dry half and watch two slide off the rest. The watchman laughs, which is a kind of notice.

**Stack crates on the loading bank** — Trained — *An hour on the bank* — The loading bank takes crates of tins six high and the forewoman doesn't ask your party, only whether you can lift the seventh. By the end you can. Your shoulders will have views tomorrow.

**Talk to the arrivals on the platform**
- Success — *Off the capital train* — The Irongate train brings clerks, a salesman, two families with the sea in mind and a man who asks which party you are before you've said. You tell them all. The salesman takes ten flyers for the hotels.
- Partial — *They have luggage* — People with luggage want a porter, not a party. You get three conversations between the barrier and the cab rank, one of them with the porter. He takes a flyer for the buffet.

**Watch who meets the Irongate train**
- Success — *Met by a car* — The six o'clock brings a man in a good coat who is met by a car from the Front and not by his wife. The plate, the coat, the hotel the car turns into. The buffet girl says he comes on Thursdays.
- Partial — *A crowd on the barrier* — Market day and the barrier is a wall of baskets. You see the good coat and lose the car. Thursday, then, and earlier.

**Read the notices at the station door**
- Success — *The board says* — Lost dogs, a reward for a stolen outboard, two names wanted for questioning and the hours of the harbourmaster's clerk. The two names go in the notebook. One of them drinks at the café hatch.
- Partial — *Half a board* — Half the board is the fishing by-laws and the rest is a page the rain has had. You get one name and the clerk's hours. The duty officer watches you read through the glass.

**Talk to people waiting at the desk**
- Success — *The long bench* — Nobody waits at a police desk because things are going well. You hear about the dues, the landlord's man and the boat that went missing, and you talk back about what a council could do. Three take a flyer, folded small.
- Partial — *The hatch opens* — You've one conversation going on the bench when the hatch opens and the duty officer calls the next name, which is theirs. The man beside you takes a flyer without looking at it.

**Talk to the tram crews at the gate**
- Success — *Six o'clock at the sheds* — The crews come through the gate at six with their tins and the company's timetable in their pockets, and they have opinions about both. You've the shoulders for the yard, so they stop. A driver takes flyers for the depot board.
- Partial — *The bell for the first car* — You get through the fares before the shed bell rings for the first car and the crews go to their trams at a trot. A conductress takes a handful of flyers for the top deck. The rest wait for the next change.

**Speak from a tram's platform in the yard**
- Success — *From the platform of number four* — A tram's rear platform is a pulpit on wheels and the yard knows it. You speak to the fitters and the crews between cars, on the fares and the Rows, and the shed foreman leaves the gate open an extra minute.
- Partial — *The car moves off* — Someone rings the bell and number four moves off with you on the platform, which gets a laugh and loses the speech. You finish it walking back up the track. Half the yard heard the half that mattered.

**Watch the shed office**
- Success — *Who signs the sheets* — The shed office has one window and the duty sheets go through it at nine. You see who signs them, who argues and which inspector takes an envelope from the company's man. The time goes in the book.
- Partial — *The blind comes down* — The office blind comes down at nine and the rest is shapes behind it. One name and one raised voice. The sheets go through tomorrow too.

**Talk to the barrow men**
- Success — *Under the arches* — The barrow men sell what the market inspector doesn't see and vote for whoever leaves them alone, so you talk about the rents and the dues and not the inspector. A fish man takes flyers for the wrapping and the café hatch takes two.
- Partial — *Business first* — A train goes over the arches and the lane is noise and smoke for a minute. You get one barrow's attention between lots. He takes a flyer and asks if the party can do anything about the inspector. You say you'll ask.

**Hand out flyers under the arches**
- Success — *Lane's end to lane's end* — The lane is forty barrows long and you work it from the depot end to the café in ten minutes, a flyer on every barrow and one in every basket that passes. The inspector never sees you.
- Partial — *The inspector sees you* — Half the bag is gone when the market inspector plants himself in the lane and asks for your permit. You haven't one. You give him a flyer and leave by the café. The lane reads the half.

**Listen at the café hatch**
- Success — *Tea and names* — The café hatch serves tea to the lane and to the harbour police, who sit with their backs to the lane and talk. A boat, a landlord's man and a date. The woman at the hatch tops up your cup without being asked.
- Partial — *Too much steam* — The urn hisses over the one conversation worth having. You get a street and a grudge, and the woman at the hatch gives you a look that says come back when it's quieter.

**Knock on doors in the Rows**
- Success — *Every other door* — The Rows open their doors to anyone who isn't the rent man. You get rents, the lake damp, the cannery's wage and three cups of tea, and leave a flyer behind every one. The corner shop puts one in the window.
- Partial — *The rent man's day* — It's the rent man's day and half the Rows is out when you knock, which is to say in and not answering. The other half talks. A woman on the end house takes ten flyers for the back yards.

**Put up posters on the gable ends**
- Success — *Six gables* — The Rows have six gable ends facing the depot road and by the time the trams go by in the morning every one says the party's name. The rent man sees them from his bicycle.
- Partial — *A window goes up* — Three gables done when a window goes up and somebody shouts about their wall. You finish the fourth small and leave by the back entry. It reads, from the tram.

**Run messages for the tenants' committee** — Trained — *Up and down the Rows* — The tenants' committee needs a runner between the end house and the depot gate and doesn't ask your party, only whether you can do it before the tram. You can, twice. Your legs will tell you in the morning.

**Speak at the church door after the service**
- Success — *After the blessing* — The congregation comes out into the noon bell and stops on the steps, because you're on them. Rents, the sanatorium's beds and a council that reads. The priest listens from the door and doesn't move you on.
- Partial — *The bell takes the end* — The noon bell goes over the last of it and the steps empty for the market. A dozen stay to hear you finish, two of them because they took it for a collection. One takes a flyer for the church porch.

**Talk to the congregation on the steps**
- Success — *Sunday best, Monday worries* — Sunday best and Monday worries: the rent, the cannery, the daughter at the sanatorium. You listen more than you talk and the flyers go into prayer books. The verger takes one for the porch.
- Partial — *The priest's hand* — The priest shakes every hand on the steps and the congregation moves on with him. You get the stragglers: two conversations and a flyer in a hymn book.

**Talk to people at visiting hour**
- Success — *Verandah talk* — Visiting hour on the verandahs: families with grapes and the Courier, and time to talk about the fees, the beds and who pays. You keep your voice down and the flyers go under the grapes. The sister pretends not to see.
- Partial — *The matron's round* — You've two families talking when the matron comes along the verandah and visiting hour becomes visiting hour. One flyer stays, under a plate.

**Study in the sanatorium's reading room** — Trained — *An hour by the window* — The reading room looks over the lake and nobody reads in it, so it's yours. The bound Couriers go back to the war and the clerk brings a lamp without asking. An hour, and a stiff neck.

### 9.4 Jobs (3), a room, missions (4)

**Jobs** (the capital's rule: for a player with no job; a home job pays in full from anywhere): `clearwater-street-vendor` **Street vendor · 100** at Back Lane Market (*Bootlaces, fish and yesterday's Courier from a barrow under the arches. Nobody asks for a permit, and nobody gets one.*); `clearwater-cannery-hand` **Cannery hand · 180**, STR 5, at the Cannery (*Eight hours on the loading bank of the fish cannery. No party draws a fifth more here: the company pays everyone the same, which is the trouble.*); `clearwater-tram-conductor` **Tram conductor · 200**, Level 3, AGI 10, at the Tram Depot (*The fares on the lake line, up and down the hill all day. Needs a quick hand on a moving platform.*). **A room** in Clearwater: the capital's room (100 Iron, seven nights, +50 Rested cap, renewable; half price under *Rents in the Rows*), on the residence card.

**Missions** (tier 2; slice 5's rules; difficulty **20**; the pool as slice 5's by type, the city police joining from *Noticed*; Clearwater's `runInPool`: `street-enforcer`, `party-thug`, `strike-picket`):

**Address the harvest supper at St Martin's** (`clearwater.st-martins.supper`) · speech · 15 E · Level 10 · difficulty 20 · everyone · pool `party-thug`, `street-enforcer`
*The parish harvest supper fills the church hall with the Rows, the cannery and half the depot, and the priest lets each party say five minutes after the pudding. The other two parties have sent somebody. The hall has a stage, a kitchen hatch and a long table of people who came for the supper.*

| Way | Stat | Hint |
|---|---|---|
| From the stage, after the pudding | CHA+INT | Five minutes, a hall that has eaten, and two rivals who go after you. |
| Table by table, with the tea | INT | Skip the stage. Sit at every table and talk to the Rows one at a time. |
| The kitchen first, then the hall | best | Help with the hatch and the hall knows you before you open your mouth. |

- Success — *The hall stays for the end* — Five minutes becomes eight and nobody minds, because the hall has eaten and the Rows have never heard the rents said out loud in church. The rival after you gets the tea urn. The priest keeps your flyer.
- Partial — *The pudding wins* — You go on while the pudding is coming round, which is a mistake, and get the wage and the beds in before the custard. Half the hall heard; the other half will hear it from them. Fair.
- Failure — *The hatch slams* — The kitchen hatch goes down halfway through your five minutes with a bang that empties your head. The Vanguard's man goes next, in order, and the Alliance's after him. The hall remembers the supper.

**Watch the night boats on the mole** (`clearwater.harbour.night-watch`) · surveillance · 12 E · Level 10 · difficulty 20 · everyone · pool `city-police`
*Three nights a week a boat lands at the mole after the lighthouse keeper has gone to bed, met by a van with no name. The crates go up the Front, not to the cannery. The mole has a bollard with a view of the stage and a wind that goes through anything.*

| Way | Stat | Hint |
|---|---|---|
| From the bollard, with a flask | INT | Sit still, count the crates, write down the van. |
| Along the lighthouse rail | AGI | Closer, higher, and a long drop to the basin if the rail is wet. |

- Success — *The van from the Front* — The boat lands at one, the van backs down the stage, and the crates go in under a tarpaulin with a hotel's name on it. Plate, name, the hour, and a face you've seen at the station. The notebook is full.
- Partial — *The lamp on the stage* — A lamp comes on at the stage before the boat's in and the rest is silhouettes. One crate counted, the van's shape and the hour. Another night, without the lamp.
- Failure — *A night of weather* — The lake gets up at eleven and nothing lands but spray. A harbour policeman walks the mole at midnight and looks at the bollard, and you, twice. You go home with the flask empty.

**Spoil the tram company's timetable** (`clearwater.tram-depot.timetable`) · disruption · 15 E · Level 10 · difficulty 20 · Rank 3 · target *the leading rival in Clearwater at the last boundary* · pool `street-enforcer`, `party-thug`, `city-police`
*The rival branch has the company's ear and the company has the morning: the duty sheets for the week are chalked on the shed board at nine and the whole town plans its day by them. Rub out one line and the Rows miss their shift; move one and the branch that sits with the company gets the blame.*

| Way | Stat | Hint |
|---|---|---|
| Over the shed wall before dawn | AGI | The board, a rag, a piece of chalk, and out before the first car. |
| Talk your way into the shed office | CHA+INT | A clipboard and a complaint about car four. The clerk leaves you alone with the board. |
| Change the sheets, not the board | INT | The sheets go through a window at nine. Yours go through at five to. |

- Success — *The seven-ten never comes* — The seven-ten up the hill is on the board and not on the track, and the Rows wait twenty minutes in the rain with the rival's posters on the shelter. By noon the depot is explaining itself at the Casino. Nobody saw the chalk.
- Partial — *Half a board* — You get two lines changed before the lamp comes on in the office and you leave by the wall. One car runs late and one runs twice. The town notices the first and argues about who did it.
- Failure — *A clean board* — The shed foreman comes in at five with a bucket and washes the board down before chalking it fresh, as he does every morning, it turns out. Your rag is in your pocket and the first car is on time. The yard dog has your scent.

**Lift the cannery's wage book** (`clearwater.cannery.wage-book`) · theft · 15 E · Level 12 · difficulty 22 · Rank 3 · target *the leading rival* · pool `vanguard-doorman`, `branch-inspector`, `city-police`
*The cannery's wage book sits in the timekeeper's office with the names, the rates and a column headed 'party' that shouldn't exist. The rival branch would pay to keep it where it is. Yours would pay more to read it. The office has a frosted door, a stove and a timekeeper who goes for his tea at ten.*

| Way | Stat | Hint |
|---|---|---|
| Through the yard window at ten | AGI | The window, the book, the window. Ten minutes while the kettle boils. |
| Ask for your own wage line | CHA+INT | A grievance, a cap in your hand and the book open on the desk between you. |

- Success — *The column headed 'party'* — The book is in your coat before the kettle whistles and the column is everything the branch said it was: who draws more, and why. The timekeeper finds a tidy desk and a draught. The branch pays, and reads.
- Partial — *Six pages* — You get the first six pages out before boots on the stair send you back through the window. Six pages is half the loading bank, and a name the branch wanted. The rest can wait for the next tea break.
- Failure — *The kettle's quick* — The timekeeper takes his tea at the desk today. You stand in the yard with a cap in your hand and a story about a wage line that nobody believes, and leave by the gate with the hooter going. The book stays where it is.

### 9.5 The council's slate (nine local candidates, three per party)

Profiles are the ward vote before the ±2 jitter; the list in each party is filled to three names. Set as the capital's: about five days' work in Clearwater (ward vote 25, two backers, a ballot: 32) beats the top local (28), and *Known* alone (6 + 6 + 1) does not.

| Id | Name | Profile | Line on the ballot |
|---|---|---|---|
| **Vanguard** | | | |
| `npc.v.cw.pfister` | Hugo Pfister | 28 | Tram inspector. "Trams to the timetable, and the Rows quiet by ten." |
| `npc.v.cw.brenn` | Agathe Brenn | 22 | Boarding-house keeper, the Front. "Rents on Friday, the promenade swept, no barrows on it." |
| `npc.v.cw.koller` | Franz Koller | 16 | Cannery timekeeper. "The hooter on time and every hand counted." |
| **Collective** | | | |
| `npc.c.cw.zelenka` | Petr Zelenka | 28 | Shop steward, the cannery. "The cannery's wage set by the cannery's hands." |
| `npc.c.cw.maly` | Dana Maly | 22 | Tram conductress. "The fare stays. The company can find its penny at the Casino." |
| `npc.c.cw.urban` | Tomas Urban | 16 | Tenants' committee, the Rows. "A roof that keeps the lake out, this winter." |
| **Alliance** | | | |
| `npc.a.cw.wessel` | Dr Clara Wessel | 28 | Physician, the Sanatorium. "Beds by need, not by the length of the bill." |
| `npc.a.cw.hofer` | Anton Hofer | 22 | Harbourmaster's clerk. "The harbour dues published, and the Casino's licence read aloud." |
| `npc.a.cw.renz` | Lotte Renz | 16 | Schoolmistress, St Martin's. "A school that stays open when the season ends." |

### 9.6 Clearwater's Issues (six new; the deck becomes 30)

`issue.tram-fares` gains a Clearwater entry in `where` (feeds: canvass, speech and propaganda at the Tram Depot and the station; the same effect). The six new Issues, each with one bounded effect that exists:

| Id | Name · short | Blurb (≤ 160) | Feeds (Clearwater) | Effect · line | Stances V · C · A |
|---|---|---|---|---|---|
| `issue.cannery-wage` | The Cannery Wage · *the cannery's wage* | The cannery pays the same to everyone and less than the mill. The loading bank wants a penny an hour and the company wants a quiet season. | canvass, speech at the Cannery and the Harbour | `jobPayPct` +10 · *Job pay +10 %* | Fixed rates, posted at the gate, and the hooter kept. · A penny an hour, or the bank stops at the first hooter. · A wages board for the lake, with the books open. |
| `issue.rows-rents` | Rents in the Rows · *the rents* | The Rows' landlord has sent his man round with a new book. The damp is the same; the rent is not. | canvass, propaganda at the Rows and Back Lane Market | `roomPct` −50 · *A room in Clearwater: half price* | Rents paid on Friday and the stairs swept; the book is the book. · Nobody pays the new book. A rent strike from the end house down. · A rent tribunal for the lake towns, sitting at the Casino. |
| `issue.casino-licence` | The Casino's Licence · *the Casino's licence* | The casino company's licence is up for renewal and the town hall is its tenant. Somebody has to say so before the vote. | speech, canvass at St Martin's and the station; propaganda anywhere in Clearwater | `ironPct` (checked) +15 · *Iron from actions +15 %* | Renew it, on condition the Front keeps its hours and the Rows their quiet. · Renew nothing until the company pays the town what it pays the town hall. · Read the licence aloud in council and renew it in public. |
| `issue.harbour-dues` | The Harbour Dues · *the harbour dues* | The harbour board wants a shilling more on every crate across the quay. The fleet says it will land at night, and some of it already does. | canvass, intelligence at the Harbour and the harbour police station | `energyDelta` intelligence −1 · *Watching and listening: −1 Energy* | The dues collected to the penny, with a lamp on the stage all night. · The dues paid by the Front's yachts, not the fleet. · The board's accounts published before a penny changes. |
| `issue.sanatorium-beds` | Beds at the Sanatorium · *the sanatorium's beds* | The sanatorium has sixty beds and forty of them are paid for by the Front. The cannery's chest cases wait. | canvass at the Sanatorium and St Martin's | `restedCapDelta` +50 · *Rested banks to 250* | Beds by the book, the book kept by the board. · Forty beds for the Rows, and the Front can pay for the rest. · A public ward, funded by the county and inspected. |
| `issue.lido-season` | The Lido Season · *the lido season* | The lido opens Saturday and the company wants the bandstand quiet for it. The parties want the bandstand. | speech anywhere in Clearwater; propaganda at the station | `energyDelta` speech −2 · *Speeches −2 Energy* | A permit for the bandstand, one party a Sunday, in order. · The bandstand is the town's. Every Sunday, every party, no permit. · A rota for the bandstand, drawn up in public. |

The Courier's Issue lines (drawn, leading, resolved) follow the Herald's templates (§11.3).

### 9.7 Who goes to Clearwater, and why

The capital is 40 % and has five districts, three of which lean; Clearwater is 30 % in **one meter** with no lean: the purest three-way race in the game, where one branch's week moves the whole 30 %. A party that holds the capital's two swing districts and Clearwater leads the republic. For a player it is a second ladder (a fresh Reputation, a council of seven with three parties, a Governor who is the Mayor's equal) and the Chair's push target of choice. Journey times are the longest (25 minutes), which the design accepts: a Clearwater resident is choosing the lake.

---

## 10. Petitions and removals

### 10.1 A petition to dissolve the council (the GDD's recall)

- **Who:** any Rank 3+ **resident** of the city (resident since before the current polls opened: no move-and-sign) opens it (**10 PC**, the first signature); residents of any party, Rank 2+, sign (10 PC each, public, final, one each); **sitting councillors of that council cannot sign** (settled 4 Oct 2026).
- **When:** opened on **cycle days 0–2** only; it **closes at the second boundary after opening** (opened day 0 → closes with the division into day 2; day 1 → into day 3; day 2 → into day 4), always before the next count. **One per city every seven days** (from the last close).
- **How many:** at the close, signatures of **the greater of three and a quarter of the city's eligible residents** (Rank 2+ residents active in the last seven days, the turnout roll). A Town Hall event (§10.4) adds townspeople's signatures.
- **What it does:** the council is **dissolved** at the close: the rule in force (or the one just passed) is **struck**, the Governor's office passes to the bloc's top local, every councillor's term ends **not completed** (no ladder rung, no more stipend), and the seats are held by local candidates until the next scheduled result (no snap election: the calendar is pure and an election is never more than five days away). Headlines in the city's paper and the national section. **Losses belong to competition** (GDD §4.3): the councillors had the council; the residents took it back.
- **Why dissolve rather than a snap election:** with five-day terms a snap election would land on the ordinary one; the thing worth taking from a council is its rule, its Governor and its rung. At home it is a party dissolving its own council (rare); in the two battlegrounds it is the losing blocs' residents against the majority's rule, which is what the GDD's "push back against a dominant faction" means.

### 10.2 A vote to remove the President (no confidence)

- **Who tables:** a deputy (**50 PC**) or a Chair (50 PC), of any party; or **automatically** at a boundary when the President's party's **control share** (its National Control ÷ the three parties'; 33.3 at the baselines) is **below 25 %** (once a term; tabled in the clerk's name, in a slot of its own). A player's motion takes a regular slot like a bill. (Settled 4 Oct 2026: raw National Control is 23.5 for everyone at the baselines, so the share is the measure.)
- **Guards:** not on term days 0–4 or 24–27; seven days between motions; a member tables one a term.
- **The vote:** three full City Days, every deputy, For / Against; passes with **40 of 60** (two thirds). Local deputies by §4.3's chain; the secretaries' line on a removal is **Against** for the President's own party and **free** for the others (so a removal needs player votes or player Chairs: the game never removes a President by itself, except that the automatic motion's trigger is the game's).
- **On passing:** the President is removed at the division; **the runner-up of the election** (the candidate with the next score) takes office for the rest of the term, with the President's powers; the removed President keeps nothing of the office and loses nothing else. The paper prints both. **Survived:** a headline (Legacy 10, slice 8). A removal cannot be vetoed.

### 10.3 A vote on the Chair

§4.5.

### 10.4 The Town Hall (Campaign Event, GDD §16.3's seventh)

`event.town-hall` · every faction · venue kinds `square`, `university`, `court`, `theatre`, `hotel`, `library`, `faction-hq` (a hall; the venues per place in §23.6) · roles **Moderator INT 10 · Speaker CHA+INT 15 · Speaker CHA+INT 15 · Press INT 10** (50 Energy) · base swing **1.2** · difficulty **12 · 14** · `speech` · four hands. **Special:** when a petition to dissolve the council is open in the city at the start, the Town Hall adds **signatures** from townspeople: **Triumph 3 · Success 2 · Mixed 1 · Fiasco 0**. Otherwise an ordinary event.

*A hall, a platform with three chairs and a jug of water, and a town with questions. Two speakers, someone to keep order and someone to write it up. The event that turns a grievance into a petition.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Moderator | INT · 10 | The questions in order and the heckler out of it. |
| Speaker | CHA+INT · 15 | The case, in five minutes, to people who came to argue. |
| Speaker | CHA+INT · 15 | The answers, to the questions the first speaker left. |
| Press | INT · 10 | The hall's own words in tomorrow's paper, spelt right. |

- **Triumph** — *The hall signed* — The hall was full before the chairs were out and stayed after the questions ran dry. Both speakers had the numbers and the moderator had the heckler. People queued at the table on the way out to put their names down.
- **Success** — *A fair hearing* — A good hall, hard questions and answers that held. The press got the best line and the moderator got everyone home by ten. Names went down at the table, not many, enough.
- **Mixed** — *Two halls in one* — The front rows came to listen and the back rows came to shout, and the moderator kept the two apart for most of an hour. One speaker was good. The paper printed the shouting.
- **Fiasco** — *The jug went over* — The water jug went over in the first ten minutes and the meeting with it. A man with a grievance about drains held the floor until the caretaker put the lights out. The press left early, which was the kindest thing.

---

## 11. The Morning Paper

### 11.1 The national section: *FROM THE CAPITAL*

Every paper gains a section under its headlines, live at read: at most **two national lines a day** (the two highest in priority), the rest on the Parliament page. Printed in every paper in the same words (the Herald's wire; the home papers and the Courier carry them under *FROM THE CAPITAL*, the Herald under *THE REPUBLIC*). `{leader}` is the party that leads the republic; `{law}`, `{by}` (who put it to Parliament), `{days}`; `{until}` and `{at}` as slice 3 §17.3; `{president}`, `{party}`.

| Id | Priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `nl.took-office` | 0 | term day 0 | {president} Takes Office as President | {party}'s candidate took the oath under the dome this morning. Parliament sits with {seatsV} Vanguard, {seatsC} Collective and {seatsA} Alliance. The old term's bills lapse. |
| `nl.result` | 0 | term day 27 | {president} Elected President, to Be Confirmed Tomorrow | {party} {scoreP} to {second} {scoreS}: the votes and the republic's opinion, counted together. Parliament: {seatsV} · {seatsC} · {seatsA}. The oath is tomorrow. |
| `nl.removed` | 0 | the President was removed last night | Parliament Removes {president} | {forVotes} of sixty. {successor}, the runner-up in {month}'s election, is President for the rest of the term. |
| `nl.survived` | 0 | a removal failed last night | {president} Survives the Vote | {forVotes} of the forty needed. The President stays; the motion cannot return for a week. |
| `nl.law-in-force` | 1 | a law came into force this morning | {law} in Force | {lawLine} In every city for {days} days, by vote of Parliament. Put to the chamber by {by}. |
| `nl.law-vetoed` | 1 | the President vetoed yesterday | {president} Vetoes {law} | Passed by {forVotes}, stopped at the signature. Parliament may vote it through anyway with forty. |
| `nl.law-overridden` | 1 | an override passed | Parliament Votes {law} Through Anyway | {forVotes} of sixty against the veto. In force from tomorrow for {days} days. |
| `nl.law-struck` | 1 | a law was struck out | Parliament Strikes Out {law} | {forVotes} of sixty. The law ends tonight; its line comes off every ticket in the republic. |
| `nl.law-failed` | 2 | a bill failed last night | {law} Falls in Parliament | {forVotes} of the {needed} needed. {by} may not put it back for a week. |
| `nl.law-tabled` | 2 | a bill was tabled yesterday | {law} Put to Parliament by {by} | {lawLine} Deputies vote until {until}; {needed} of sixty carry it. |
| `nl.law-expired` | 2 | a law expired at the boundary | {law} Expires | {days} days, as voted. The line comes off the tickets this morning. |
| `nl.names-in` | 1 | term day 19 | Names In for President and Parliament | Two days for candidates. A President needs a term as deputy; a deputy needs a term as Governor or three on a council. The parties pick on {weekdayPick}. |
| `nl.party-pick` | 1 | term day 21 | The Parties Pick Their Candidates | The Acclamation, the Congress and the Convention sit until {until}. Every member votes; the party's own figure is on each ballot. |
| `nl.voting-open` | 0 | term day 23 | The Republic Votes | Three candidates for President, one vote each, until {until}. Half the result is the votes; half is who holds the five cities. |
| `nl.leader-change` | 1 | the leader changed at the boundary | The {leader} Now Leads the Republic | {leaderShare} to {secondShare}, on the five cities weighted. {cityMoved} did it. |
| `nl.leader-line` | 3 | every day, when no other national line | The {leader} Leads the Republic | {leaderShare} · {second} {secondShare} · {third} {thirdShare}. Laws in force: {lawsCount} of five. |
| `nl.clearwater-control` | 1 | Clearwater's control changed | The {faction} Takes Clearwater | Above fifty on the lake at last night's count of opinion. Thirty per cent of the republic has a majority. |
| `nl.clearwater-lost` | 1 | control of Clearwater was lost | The {faction} Loses Clearwater | Below fifty at the boundary. A comeback begins: its members' work there gains five per cent a day. |
| `nl.council-dissolved` | 1 | a council was dissolved last night | {city} Council Dissolved by Petition | {signatures} residents signed. The rule is struck, the Governor's chair is empty, and local candidates sit until {weekday}'s result. |
| `nl.chair-elected` | 1 | a Chair was elected last night (every member of the faction) | {name} Elected Chair of the {faction} | {votes} votes to the secretary's {secretaryVotes}. The orders, the party line and the fixture are the Chair's from tomorrow. |
| `nl.chair-secretary` | 2 | the secretary won or stood alone | {secretary} Keeps the {faction}'s Orders | {reason}. The next election for Chair is in four weeks. |
| `nl.chair-removed` | 1 | a Chair was removed | {faction} Members Remove {name} as Chair | {noVotes} of {cast} votes: no confidence. {secretary} acts until the next election. |
| `nl.target-met` | 2 | the party's target was reached yesterday (members who contributed) | The {faction} Takes {place}'s Doors | {count} of {target} by midnight. Everyone who knocked gets +10 Party XP this morning. |

`{reason}` for `nl.chair-secretary`: *No member stood* / *{name} fell short by {margin}*.

### 11.2 Personal lines (every paper, in the paper's own voice; the Herald's wording given, the home papers and the Courier transcribe the slice-3 pattern)

| Id | Priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.*.governor` | 0 (the front page) | became Governor at the count | {name} Is Governor of {city} | Top of the poll with a council term behind them. The Governor's rule goes to the vote first; the Address is theirs once this term. |
| `hl.*.governor-local` | 2 | stood, seated, but a local holds the office | A Local Holds the Governor's Chair | No councillor with a completed term, so {local} holds it and sets nothing. Complete this term and the chair is within reach. |
| `hl.*.address` | 2 | the Governor spoke yesterday | Governor {name} Speaks on {issueShort} | Fifty points to the {faction} on {issueShort}, from the steps of {hall}. The Address is spent for the term. |
| `hl.*.chair-filed` | 2 | filed for Chair yesterday | {name} Stands for Chair of the {faction} | Backers {backers} of 2 by {until}. The secretary is on the ballot too; beat the branch's own administrator and the orders are yours. |
| `hl.*.chair-front` | 0 (the front page) | elected Chair | {name} Chairs the {faction} | {votes} votes. Every member's morning orders, the party line in Parliament and the branch's event are yours for twenty-eight days. |
| `hl.*.chair-lost` | 1 | stood for Chair, lost | {name} Falls Short for Chair | {winner} took it with {votes} to your {yourVotes}. Twenty-eight days to the next. |
| `hl.*.chair-vote` | 2 | a vote on the Chair opened for the member's faction | A Vote on the Chair | {reason}. Confidence or no confidence, until {until}; two thirds remove. |
| `hl.*.deputy-front` | 0 (the front page) | took a seat in Parliament at term day 0 | {name} Takes a Seat in Parliament | {ordinal} on the {faction}'s list, sworn under the dome. One law a term is yours to put; every bill is yours to vote on. |
| `hl.*.list-missed` | 1 | on the list, no seat | {name} Misses Parliament by {margin} Places | The {faction} took {seats} seats; you were {ordinal} on the list. Back a bigger party, or be first on the list next term. |
| `hl.*.president-front` | 0 (the front page) | took office as President | President {name} | The republic's, for twenty-eight days. A law a week, the veto once, the Address once, and every paper watching. |
| `hl.*.president-lost` | 1 | stood for President, lost | {name} Short of the Presidency | {winner} scored {score} to your {yourScore}. First on the {faction}'s list: a deputy's seat is yours. |
| `hl.*.pick-won` | 1 | won the party's pick | {name} Is the {faction}'s Candidate | {votes} votes at the {pickName}; the party's own figure stood aside. The republic votes from {weekday}. |
| `hl.*.pick-lost` | 1 | lost the party's pick | The {pickName} Chooses {winner} | {winner} took the party's name with {votes} to your {yourVotes}. Your name goes on the list. |
| `hl.*.bill-tabled` | 2 | put a law to Parliament yesterday | Deputy {name} Puts {law} to Parliament | {lawLine} Deputies vote until {until}; {needed} carry it. |
| `hl.*.bill-passed` | 1 | the member's bill passed | {name}'s {law} Passes | {forVotes} of sixty. In force from tomorrow for {days} days, in every city, with your name in the law book. |
| `hl.*.bill-failed` | 1 | the member's bill failed | {name}'s {law} Falls | {forVotes} of the {needed} needed. A week before it can return. |
| `hl.*.pledge-kept` | 1 | a President's pledge passed | Pledge Kept: {law} | Promised on the ballot, passed by Parliament. The Herald keeps count. |
| `hl.*.petition-opened` | 2 | opened or signed a petition yesterday | A Petition to Dissolve {city} Council | {signatures} of {needed} names by {until}. Residents of any party sign on the Election card. |
| `hl.*.petition-failed` | 2 | a petition the member signed failed | The Petition Falls Short | {signatures} of {needed}. The council sits to {weekday}'s result. No petition for a week. |
| `hl.*.dissolved-councillor` | 0 | the member's council was dissolved | {city} Dissolves Its Council | {signatures} residents signed. Your seat ends today, the term uncompleted. Candidates can put their names in on {weekday}. |
| `hl.*.pushed` | 3 | the Chair's push names a place the member can reach | The Chair Wants {place} | *{orderTitle}*: the party's target is {target} today. Everyone who knocks shares the bonus if it's met. |

Every deck ≤ 200 characters with the longest tokens; *the front page* lines use the slice-3 front page (the photograph, the stamp **ELECTED**, the caption naming the office: *{name}, elected Governor of Coalport* / *Chair of the Red Collective* / *deputy for the Vanguard* / *President of the Republic*), on the first edition the holder opens during the term.

### 11.3 The Clearwater Courier

The Courier carries the Herald's city set with *Clearwater* for the capital and one meter for five: the slice-3 political set as the capital's `hl.ig.*` (seat won *for the {faction}*, seat lost by margin, the bloc line, the tie, filed, on the list, struck, voted-won and -lost, moved, seat ended, the rule passed or failed, the count with the seat split, voting open, candidates wanted, the rule in force), the slice-4 set (the first arrival, residence, the close race three, the comeback, the hero, the quoted line, the Issue lines, the train), the slice-5 set (the cells, the infirmary, the mission, the name taken) and the slice-6 set (the events, bail, visits), each in the Courier's voice: a resort paper, society on page one and the Rows on page four, dry about both. Written word for word in `slice-7-nation.md` §11.3.1 for the political set; the rest transcribed by the designer in the content file in the same change as the Courier (the templates' conditions and priorities are the Herald's).

#### 11.3.1 The Courier's political set (`hl.cw.*`)

| Id | Headline | Deck |
|---|---|---|
| `hl.cw.welcome-resident` | {name} Takes a House in Clearwater | The {faction}'s newest voter on the lake. Clearwater votes from {weekday}; the Courier will say when. Party orders now come from the lake branch. |
| `hl.cw.first-arrival` | {name} Arrives on the Lake Line | Off the {origin} train into the Harbour. Three parties, one town, {closeRace}. The tram up the hill is a penny. |
| `hl.cw.seat-won` | {name} Takes a Clearwater Seat for the {faction} | Elected {ordinal} of seven with {votes} support. The {faction} holds {seatsFaction} of seven. The council sits at the Casino from this morning. |
| `hl.cw.seat-top` | {name} Tops the Poll in Clearwater | First of seven with {votes} support. The {faction} holds {seatsFaction} of seven; the Casino's committee room has a new name at the table. |
| `hl.cw.seat-lost` | {name} Misses a Clearwater Seat by {margin} | {last} took the seventh seat. Candidates can put their names in again today; the 10 Political Capital stays with the branch. |
| `hl.cw.seat-lost-bloc` | No {faction} Seat in Clearwater This Cycle | {name} led the {faction}'s list, but the party's score fell short: {winners} took the seven seats between them. Names in again today. |
| `hl.cw.seat-lost-tie` | {name} Loses the Last Seat on the Tie-Break | Level with {last}. The rules gave them the seat; the Courier has checked them. Names in again today. |
| `hl.cw.filed` | {name} Stands for Clearwater Council | Backers {endorsements} of 2 by {until}, or the name comes off the list. |
| `hl.cw.on-ballot` | {name} Is a Candidate in Clearwater | On the list with {endorsements} backers. Voting is open today until {until}: seven seats, any name on the list. A candidate may vote for themselves. |
| `hl.cw.struck` | {name} Comes Off the Clearwater List | Short of two backers at the close. The 10 Political Capital is returned; names go in again on {weekday}. |
| `hl.cw.voted-won` | Your Vote Counted: {voted} Takes a Seat | {voted} finished {ordinal} of seven. Turnout {turnout}. |
| `hl.cw.voted-lost` | Your Vote Counted: {voted} Falls Short | Short by {margin}. The seventh seat went to {last}. Turnout {turnout}. |
| `hl.cw.voted-lost-tie` | Your Vote Counted: {voted} Falls Short | {voted} finished level with {last} on {votes} and lost the tie-break. Turnout {turnout}. |
| `hl.cw.moved` | Councillor {name} Puts {ordinance} to Clearwater Council | {ordinanceLine} Seven councillors, three parties; four votes carry it. The council votes at {until}. |
| `hl.cw.seat-ended` | Councillor {name} Steps Down | Five days, one rule, three parties. Candidates for the council after next can put their names in today. |
| `hl.cw.council-passed` | Clearwater Council Passes {ordinance} | In force from this morning for five days, from the Front to the Rows. {ordinanceLine} |
| `hl.cw.council-failed` | Clearwater Council Can't Agree on a Rule | No rule reached four votes of seven. Three parties, no deal, and the lake goes without for five days. |
| `hl.cw.count` | Clearwater Result: {seatsV} Vanguard, {seatsC} Collective, {seatsA} Alliance | {winner} topped the poll. Turnout {turnout}; {npcSeats} of seven seats to local candidates. Governor: {governor}. |
| `hl.cw.polls-open` | Voting Open in Clearwater | Seven seats, any name on the list, until {until}. Your vote is secret. |
| `hl.cw.nominations` | Clearwater Council: Candidates Wanted | {rank3}s who are Known on the lake can stand from the Election card until {until}. |
| `hl.cw.ordinance-city` | {ordinance} in Force in Clearwater | {ordinanceLine} Five days, by order of a council that agreed on something. |
| `hl.cw.battleground` | Clearwater Is a Close Race Today | The two leading parties are within ten points of each other. Party work here pays +25 % Party XP and moves opinion +25 %. |
| `hl.cw.battleground-new` | Clearwater Becomes a Close Race | {second} closed to within ten of the {leader}. The bonus follows the fight. |
| `hl.cw.battleground-over` | Clearwater No Longer a Close Race | The {leader} has pulled more than ten clear. The bonus moves on. |
| `hl.cw.groundswell` | Comeback on the Lake | The {faction} lost Clearwater last night and the town has noticed. Its members' work here gains +5 % a day, to +30 %. |
| `hl.cw.city-line` | Clearwater: {leader} {leaderShare} %, {second} {secondShare} %, {third} {thirdShare} % | {state}. You've moved it {yourSwing} this election ({yourRank} of {contributors}). |
| `hl.cw.hero` | {name} Named City Hero of Clearwater | Moved the lake {swing} for the {faction} this election, more than anyone at Level {bracket}. 25 Political Capital. |
| `hl.cw.train-open` | The Train Is Open to {name} | Level 10. The nation map is on the Map tab: the capital in twenty-five minutes, third class, 20 Iron. |
| `hl.cw.ambient-0..9` | The Lido Opens Saturday, Weather Permitting · Casino Season Ball to Be Held in Aid of the Sanatorium · Tram Company and Council to Meet on the Fares · Fish Landings Down a Third, Says the Board · St Martin's Bell to Be Recast by Subscription · Steamer *Ondine* Back on the Noon Run · Cannery Hooter to Be Tested Tuesday at Six · Pier Hotel Reopens Its Winter Garden · Harbour Police Appeal for the Missing Outboard · Band to Play Sunday on the Promenade | — |

---

## 12. The result modals (`politics.results`, each ≤ 240, with a *Next* line)

| Act | Stamp | Headline | Body | Next |
|---|---|---|---|---|
| `chairDeclare` | You're standing | Your name is on the list for Chair | Two backers by {until} and your name is printed beside the secretary's. Do today's orders and the branch backs you. | Next: find backers. Voting opens {pollsWeekday}. |
| `chairVote` | Vote cast | Your vote is in | You voted for {name}. Nobody can see who you chose. The result is on {countDay} morning, in every paper of the {faction}. | Next: the result, {countDay} morning. |
| `chairOrders` | Set | The orders are yours | From tomorrow every member reads these three in the morning, until you change them. The secretary writes the lines; your name is under them. | Next: the party's target shows on the Orders tab tomorrow. |
| `partyLine` | Line set | The party line is {line} | Every {faction} deputy run by the game votes {line} on {law}. Player deputies vote as they please. Parliament votes at {at}. | Next: Parliament's vote, {resultWeekday} morning. |
| `partyRule` | Set | {ordinance} is the party's rule in {city} | The party's item on every {city} order paper, and what local councillors vote for when no player leads them. | Next: the council votes on {weekday}. |
| `governorRule` | Set | {ordinance} goes to the vote first | Item one on the order paper, at no cost. Local councillors with no player lead vote for it. The council votes at {at}. | Next: the council's vote, {resultWeekday} morning. |
| `address` | Spoken | The Address: {issueShort} | Fifty points to the {faction} on {issueShort}, in your name. Once a term; this was it. | Next: the Issue settles on Monday morning. |
| `presidentDeclare` | You're standing | Your name is in for President | 100 Political Capital, two pledges and your party's pick to win. The {pickName} sits on {weekday}; the party's own figure is on its ballot. | Next: the party's pick, {weekday}. |
| `listDeclare` | You're standing | Your name is on the {faction}'s list | The list is ordered by backers. Parliament's seats go down it on {weekday}, as many as the party's score wins. | Next: find backers. The republic votes from {pollsWeekday}. |
| `pickVote` | Vote cast | Your vote is in | You chose {name} to carry the {faction}. Nobody can see who you chose. The party's candidate is named on {weekday} morning. | Next: the party's candidate, {weekday}. |
| `nationalVote` | Vote cast | Your vote is in | You voted for {name} for President. Nobody can see who you chose. The result is on {countDay} morning, to be confirmed the day after. | Next: the result, {countDay} morning. |
| `nationalBack` | Backed | {name} has your backing | Backing is public and final, one a term. {name}'s party scores a point more for it; up to five count. | Next: the result, {countDay} morning. |
| `listBack` | Backed | {name} has your backing | Backing is public and final, one a term. {name} is now {ordinal} on the {faction}'s list. | Next: the seats go down the list on {countDay}. |
| `tableBill` | Put to Parliament | {law} is up for a vote | {lawLine} Deputies vote until {until}; {needed} of sixty carry it. | Next: Parliament's vote, {resultWeekday} morning. |
| `billVote` | Voted | Your vote is recorded | {vote} {law}. The whole chamber can see it, and it's final. Parliament votes at {at}; every paper prints the result. | Next: the result, {resultWeekday} morning. |
| `veto` | Vetoed | {law} stops at your desk | Passed by {forVotes}, and not in force. Parliament may vote it through anyway with forty; the motion is tabled this morning. | Next: Parliament's second vote, {resultWeekday} morning. |
| `petitionOpen` | Opened | A petition to dissolve {city} council | Your name is the first of {needed}. Residents of any party sign until {until}, 10 Political Capital each; the council is dissolved if the names come in. | Next: the count of names, {resultWeekday} morning. |
| `petitionSign` | Signed | Your name is on the petition | {signatures} of {needed} by {until}. Signing is public and final. | Next: the count of names, {resultWeekday} morning. |
| `confidenceVote` | Vote cast | Your vote is in | {vote} in the Chair. Nobody can see who you chose. The result is on {countDay} morning. | Next: the result, {countDay} morning. |
| `tableRemoval` | Put to Parliament | A vote to remove the President | Forty of sixty remove {president}; the runner-up takes the rest of the term. Deputies vote until {until}. | Next: Parliament's vote, {resultWeekday} morning. |

`{line}` is *For* / *Against* / *a free vote*; `{vote}` *For* / *Against* / *Confidence* / *No confidence*; `{pickName}` *the Acclamation* / *the Congress* / *the Convention*. The register and room texts for Clearwater are the capital's (`register`, `room`, `renew`) with `{district}` = *Clearwater* and `{hq}` = *the lake branch*.

---

## 13. Ambition, chapter 3 of *Finish His Work*: *The deposit* (GDD §17.1)

Due since slice 3 ("written with the slice that follows"); the office slice is its home. **Requirement: Rank 3**, plus seven City Days since chapter 2 (about day 15 for the reference recruit, around the first candidacy). Letters row: *From the tin on the shelf* · *His deposit receipt* · *Chapter 3 is ready · 15 Energy*. Three steps, one check, never fails, no encounter (set at home), no opinion, Rested applies. **Difficulty 16, 15 Energy**; Success **350 XP / 90 FXP / 200 Iron**, Partial **175 / 45 / 100**, Failure **60 / 0 / 0**; keepsake `keep.deposit-receipt` (*His deposit receipt*, no slot, no effect) on every outcome.

**Step 1** · kicker *Ambition · Finish His Work · Chapter 3 of 12* · art: `home-hq`
In the tin on the shelf, under the ration book: his receipt for ten marks, the council deposit of '21, stamped RETURNED. He never found his two names. The branch is asking for yours by Tuesday, and the tin has ten marks in it still.

| | Choice | Hint | Flag |
|---|---|---|---|
| A | Pay the deposit from his tin | His ten marks, twenty-five years late. The branch will know whose they are. | `his-marks` |
| B | Leave the tin and pay your own | The name is yours now. The tin stays shut. | `own-marks` |

**Step 2** · *Two names by Tuesday*
Two names. He never got them; the ward book says why, in his hand: *talked to the hall, not to the ward*. You have the book, the branch's meeting at six, and a street that knew him.

| Approach | Check | Chance for the reference recruit (day 15: INT ~34, CHA 5) |
|---|---|---|
| Ask the branch meeting for its names, from the floor | CHA+INT vs 16 | about 62 % |
| Write the platform line he never wrote, and show it round | INT vs 16 | 95 % (the clamp) |
| Walk the ward with his book and ask the doors that knew him | best vs 16 | 95 % |

CTA: **Find the two names · 15 Energy**

**Step 3** · the result
- Success — *Two names, and a third* — Two names by nine and a third by ten, an old docker who signed for him in '21 and says so. The branch secretary stamps the receipt without looking up. Somebody has to say his name was on it too, so you do.
- Partial — *One name, and the branch's* — One name from the street and the branch's own, which the secretary says counts, this once. The receipt is stamped. The ward book gets a new line in your hand: *talked to the ward. Mostly.*
- Failure — *The hall, not the ward* — The meeting argues about the canteen for an hour and nobody signs anything. You walk home with his receipt and your own in the same pocket, both unstamped. Tuesday is still Tuesday. The doors are still there.
- Knock-on lines: *Keepsake: His deposit receipt* · *Chapter 4, "The count": from {date}, after your first council seat*

Every text is under 240 characters and four sentences. Chapter 4 requires a completed council term and is written with slice 8.

---

## 14. What the player sees and does

### 14.1 Week 3: a Governor's week (a second-term councillor)

1. The count morning: the front page, stamp **ELECTED**, caption *elected Governor of Coalport*; the Election card reads *You're Governor · choose the rule that goes to the vote first*.
2. One tap: the rule menu (eleven rows), *Public Works Order* → the modal *{ordinance} goes to the vote first*. The order paper shows it as item 1 with *the Governor's rule*.
3. Any day: *The Address · {Issue}* on the office page, one tap, a modal, and the Issues section shows +50 against the Governor's name.
4. The paper two mornings later: *Council Passes Public Works Order*; the plate reads *Council rule: Public Works Order · the Governor's*.

Three taps in a term; the office is felt on every wage packet in the city.

### 14.2 Month 1: the Chair (Rank 4, about day 25–30)

1. Term day 9: the Faction tab's Election card: *Names in for Chair until {until}* → **Stand for Chair · 25 Political Capital** → the stand card (Rank 4 ✓, a council term ✓, 14 days ✓, the platform line) → the modal.
2. The day's orders done: *the branch backs you · 1 of 2*; a colleague backs: *2 of 2*.
3. Days 11–13: members vote (the candidate and *Secretary Holm · keep the orders as they are*).
4. Day 14: the front page, **ELECTED**, *Chair of the Red Collective*; the Faction tab gains **the Chair's desk**.
5. The desk: three pickers, the push (*Eastside, Irongate · target 50*), **Set the orders**; the party line on the open bill (*For*); the party's rule per city; tomorrow's fixtures. Five taps, and every member's next morning reads *Set by the Chair, {name}*.

### 14.3 Week 8: a deputy's bill (Rank 5, a completed Governor term)

1. Term day 19: *Names in* → **Stand for Parliament · 25 Political Capital** (the list).
2. Day 27: the result; day 0: the front page, *deputy for the Collective*, and the Parliament page.
3. Any day: **Put a law to Parliament · 50 Political Capital** → the catalogue (thirteen rows with their lines and who is for and against by the party lines) → *Eight-Hour Day Act* → the modal.
4. Three days of voting; the Chairs set their lines; the morning paper: *{name}'s Eight-Hour Day Act Passes · 42 of sixty*; the desk shows *Law: Eight-Hour Day Act · +22 Iron* on the next wage.

### 14.4 Season 2: the President (Rank 6, a completed deputy term)

1. Names in (100 PC, two pledges: *Universal Care*, *Rehabilitation*); the Congress; the republic votes; the result *to be confirmed tomorrow*; day 0: the front page, *President of the Republic*.
2. Monday: **Put a law to Parliament** (free, item 1): *Universal Care Act*. Thursday's paper: *Pledge Kept*.
3. A rival deputy's *Curfew Order* passes with 33: on its signature day the bill's page shows **Veto**; one tap; the paper: *President {name} Vetoes Curfew Order*; the Vanguard's Chair whips the override and it falls short of forty.
4. Day 27, the next election: the President stands again (a second consecutive term is the last).

### 14.5 Losing it

- A Governor's party loses the council at the count: the paper prints the new Governor's name under the old one's seat lost by three; the Election card offers *Stand for the council* that morning.
- A Chair's home city tips into Unrest: *A Vote on the Chair* in every member's paper; two days; the Chair canvasses the Rows to say they are still the Chair. Removed: *{secretary} acts until the next election*; the standing orders revert to the rotation the next morning.
- A President loses at 36 of 40: *{president} Survives the Vote*. A President's party falls under 25 % of the republic: the automatic motion; the runner-up takes the rest of the term; the paper prints both names.
- A council is dissolved by petition: every councillor's paper carries *Your seat ends today, the term uncompleted*; the Election card: *Candidates can put their names in on {weekday}*.

Every loss is printed with the next thing to do.

---

## 15. Session shape (pillar 7)

| Act | Taps | When it settles |
|---|---|---|
| Vote (Chair, the party's pick, the republic, a bill, a removal, the Chair's confidence) | 2 (a row, the button) | at a boundary, without the player |
| Stand (Chair, the list, President) | 3 (the card, a line, the button) | the count |
| Back | 1 | the count |
| The Chair's orders | 5 at most (three pickers, the push, Set); repeat forever | the next boundary |
| The party line · the party's rule · the Governor's rule · tomorrow's fixture | 1 each | the division |
| Put a law to Parliament | 2 (a row, the button) | three days later |
| The veto · the Address | 1 | at once / the next boundary |
| Open or sign a petition | 1 | at the second boundary |
| Register in Clearwater · a room | 2 | at once |

Nothing requires a player at a set time; every window is at least two full City Days (the parties' pick) and most are three or four; every result waits in the paper; an absent office-holder's duties fall to the defaults of §3 and no act of any other player is blocked by their absence.

---

## 16. Economy

`docs/economy.md` §21. Slice 7 adds **no tier-1 or tier-2 rate**. It adds Clearwater's actions at the capital's difficulty and the capital's Iron sinks (the move, a room, tickets at 25 minutes), **four office stipends** (Governor 20 PC + 30 FXP, Chair 20 + 40, deputy 5 + 30, President 50 + 60) and **seven Political Capital sinks** (Chair 25, the list 25, President 100, backing 10, a bill 50, a petition 10, a removal 50), and thirteen bounded laws. **Verdict:** no §5.2 milestone moves by more than a day (the Chair's 40 FXP a day is +17 % for a holder, which is a reward for an office won, not a rate); Political Capital is the number that moves (an office-holder banks 25–75 a day against sinks of 25–100 a term, so a Chair reaches the cap in a season and the cap is the limit); the laws' biggest levers are +10 % Iron, +10 % pay and +15 % mission XP for 14–28 days, inside the council rules' envelope, and no law touches Party XP or the odds; the Emergency Permits Act is the one law that costs a player anything (two Energy a mission for non-members, about −10 % mission efficiency for two weeks), which is what a factional law at 36 of 60 is for. Clearwater pays as the capital: a resident's Iron about three per cent under home, Party XP +13 % in a close race, Reputation restarted.

---

## 17. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 3 Oct 2026 (slice-7 design)" change table |
| §1.5 | The slice-7 words (Parliament, the party line, the party's pick, who holds the republic, a petition to dissolve the council, a vote to remove the President) |
| §2 | The Term row: term days, the Chair's and the national windows, the epoch |
| §3.3 | Slice 7: the national section *From the capital*; the Courier's masthead; the front pages |
| §6.5 | Stipends pinned for the Governor, the Chair, a deputy and the President; the seven new sinks |
| §13.7, §15.4 | The Chair's standing orders, the push and the party's target; the fixtures; the secretary's rotation as the default |
| §14.1 | Clearwater's places confirmed; *The Clearwater Courier* |
| §14.4 | Groundswell for Clearwater; never for home cities |
| §14.6 | Clearwater's six Issues; the deck of thirty |
| §14.8 | The formula pinned; Unrest counts half; what control gives; *leads the republic*; the baselines level at 23.5 each |
| §14.9 | Control's Heat rule pinned (+25 % for rivals) for districts and Clearwater; the Mayor as §3.1 |
| §14.10 | Clearwater's service open; no direct coast line |
| §14.11 | Clearwater's baseline 22 / 22 / 22 / 34; residence and a room in Clearwater; the Unrest consequences built (half weight, the deputies abstain, the vote on the Chair) |
| §15.1 | The offices table rewritten for slice 7 (the Governor's selection, the Chair, the deputy, the President; ministers and the Speaker deferred; several offices at once allowed) |
| §15.2 | The provisional day as the paper's wording until the audit |
| §15.3 | Clearwater's council (seven seats by D'Hondt, four of seven); the Governor's rule as item 1; the local councillors' chain; four *None of these* make the locals abstain |
| §15.4 | The Chair pinned: the election (the secretary on the ballot), the term, the pay, the orders, the party line, events, the Officers channel, the vote on the Chair |
| §15.5 | Rewritten: the calendar in term days; the President (no Chancellor); names in, the party's pick, voting, backing, the score with its turnout weight, D'Hondt, the provisional day, two terms in a row; pledges; the party's own figures |
| §15.6 | Rewritten: the order paper (three bills plus the President's), who tables, the secretaries' bills, three-day votes, 31 / 36, the signature day, striking out, the cap, the veto and the override |
| §15.7 | Ministers: post-MVP, unchanged |
| §15.8 | The slice-7 catalogue of thirteen with bounds, durations, `appliesTo`, the secretaries' lines; the new DSL kinds; laws never touch Party XP or odds |
| §15.9 | Rewritten: the petition to dissolve a council; the vote to remove the President (40 of 60; 25 % automatic); the vote on the Chair |
| §15.10 | NPC fill at the top: the party's own figures, the local deputies (eight named each) and their chain; the Clearwater slate; the secretary's bills |
| §16.2 | The Officers channel |
| §16.3 | The Town Hall pinned (roles, 1.2, signatures) |
| §17.1 | Chapter 3 of *Finish His Work*, *The deposit* |
| §17.3 | President 40; the Chancellor row removed |
| §18.3 | A room in Clearwater |
| §21.4 | `keep.deposit-receipt` |
| §25 | Town Hall in slice 7; "President" for "Chancellor/President" |
| §26 | "the Chancellor coalition rule" → Parliament's majority rule |
| Appendix A | President, Chair, deputy, bill, the law book, the party line, the party's own figure |
| Appendix C | #2 answered nationally (the weight at thirty ballots); #8 closed (no direct coast line); #26 closed (four *None of these*); #40 closed (Clearwater confirmed); new #64 (President only, no Chancellor), #65 (several offices at once), #66 (the secretaries' bills), #67 (the automatic removal at 25 %), #68 (dissolve rather than a snap election), #69 (standing orders repeat), #70 (Clearwater's baseline evened), #71 (The Front as a teaser), #72 (the list by backers), #73 (the push at Level 10) |

Companion edit: `docs/economy.md` §21.

---

## 18. Questions for the architect (each with a default)

1. **The term epoch.** Suggested: `TERM_EPOCH` in `packages/rules` (a Monday day key chosen at deploy); `termDay(dayKey)` pure, like `cycleDay`; one `nationalTerm` document per term (`{ termIndex, epoch, status, president, seats[], scores, bills[] }`) created by the day-0 job and read by every national phase; the Season (slice 8) is three terms from the same epoch.
2. **Collections** (plan §5): `laws` (the book: `{ lawId, fromDay, toDay, tabledBy, termIndex }`), `nationalElections` (one per term: candidates, pledges, the pick per faction, ballots in a numbered box as ADR 0019, backers, the result and the list), `recallPetitions` (`{ cityId, openedDay, closesDay, signatures[], needed, result }`), plus `bills` (the order paper, embedded on the term or its own collection with the votes), `chairElections` (per faction per term) and `chairState` per faction (`{ standingOrders, push, target, lines: { billId: line }, rules: { cityId: ordinanceId }, fixtures }`). `officeTerms` gains kinds `governor`, `chair`, `deputy`, `president` with the same `completed` flag; the character's `offices[]` projection gains them for display.
3. **The national count** is one transaction at the boundary into day 27 (the scores from the day's National Control snapshot and the ballot box; D'Hondt; the lists; the provisional result), and **taking office** a second one at day 0 (the President and the deputies' `officeTerms`, the old bills lapsed). Suggested: the national job runs after every city's boundary (it reads their drifted meters), as the Irongate boundary order of slice 4 §6.6 puts the count after the drift.
4. **NPC deputies' votes** are computed at the division from the chain (player majority → the Chair's line → the secretary's line, Unrest → abstain), never stored per deputy; the chamber page shows the bloc's line, not sixty rows of votes.
5. **The law layer in rules** is the ordinance layer with a third source (ADR 0030's named factors): `effectsFor(character, city, action)` gathers the rule in force, the day's Issue effects and the laws in force, filters by `appliesTo`, and combines by the slice-4 rules; the new kinds (`xpPct`, `missionEnergyDelta`, `journeyTimePct`, `runInPct`, `infirmaryCostPct`, `markFadeDays`, `caughtDelta`) each touch one existing function (the mission's rewards and cost, the journey's minutes, the run-in roll, the walk-out price, the fade, the caught check). Bounds in `LAW_BOUNDS`, enforced by the loader like the ordinances'.
6. **Clearwater's quarter order.** The survey numbers The Front 1, The Depot 2, The Harbour 3, and the content test holds a location's `map` to its pin; suggested: keep the survey order in `quarters[]`, allow a teaser as `quarters[0]`, and let the landing be the station's quarter by rule (§14.13), the last-viewed rule afterwards. If the test or the client assumes `quarters[0]` opens first, reorder and renumber the survey in the same change.
7. **Clearwater's city document** is a district's shape at city level (opinion, battleground and groundswell state, control, the Issue tie, seven seats) with the council at the city; the count is the district count with seven seats; `heatGainPct` for rivals of the controlling party is a city factor read by the Heat gain, for the districts too.
8. **The Chair's standing orders** are read where the rotation is read (ADR 0009's computed progress), per faction, with the push's substitution for members below Level 10; the party's target is a per-faction per-day counter on the faction document, `$inc`'d in the action transaction when the row matches the push, and settled at the boundary with the +10 FXP to contributors (a list of character ids on the counter, or a query on the action log).
9. **The whip on councils** replaces `branchMotion` as the default item: `chairState.rules[cityId]` falling back to `faction.branchMotion`. The Governor's rule is `election.governorRule` set during days 0–1.
10. **Petitions** are set-once rows (ADR 0018) with a `needed` computed at the close from the turnout roll, resolved by the city's boundary job before the division (a dissolved council's rule never comes into force).
11. **The Town Hall's signatures** are an event `special` resolved into the open petition at the event's resolution (if the petition is still open; else nothing).
12. **The veto's day** is the day between the division and the law's `fromDay`; the bill's status `awaitingSignature` for that day; the President's veto is a set-once write that sets `vetoed` and tables the override.
13. **Test hooks:** step the term day; force a national count; seat a player as Governor, Chair, deputy or President; force National Control; force a secretary's bill; the e2e: stand → the pick → vote → the count → day 0 → table a bill → the party line → the division → the law on a ticket; a petition that dissolves a council; a removal that passes.
14. **Playtest report:** offices held by players against locals per term; bills tabled by players vs secretaries and their pass rate; laws in force per day; the party lines set; Chair elections' turnout; the push's target hit rate; Clearwater residents and ballots; petitions opened and their outcome; and, for the question, the return rate of a player in the week after losing an office against one who kept it.
15. **The QA vocabulary test:** *Parliament*, *deputy*, *President*, *Chair*, *Governor*, *Mayor*, *law*, *veto*, *petition*, *term* are allowed; *whip*, *Directive*, *recall*, *Legislature*, *National Control*, *no-confidence* and *Chancellor* must not appear in a player string; *the front* in *The Front* (Clearwater's quarter) needs the allowance *the front door* has (a lake front; §19).

---

## 19. Content-policy check

Every string above was read against `content-policy-review.md` §7. The Vanguard's national figure is a retired judge who chairs a committee; its deputies are clerks, inspectors, a timekeeper, a boarding-house keeper and a schoolmistress; its laws are permits, a curfew and police who look the other way, written cold (the Special Powers Act's line says what it does and nothing says it is right); its primary is *the Acclamation*, a vote by shout, which is the Vanguard's manner and still a vote. The Collective's figure is a union secretary and its laws are the eight-hour day, night schools and infirmaries; no Soviet title anywhere (*general secretary* is every union's). The Alliance's is a law professor. The President is a republic's office; Parliament sits under a dome with no flag drawn. No *front* (the quarter **The Front** is a lake front, as *the front door* is a door; QA needs the allowance), no *war*, *enemy*, *troops*, *militia*, *uprising*; rivals are rivals; a petition dissolves a council and a vote removes a President, which is what petitions and votes do. *Clearwater Station*'s "departures are watched" is a resort town's police, not a party's.

---

## 20. Art needed (noir lithograph, `mvp/` style; checked against the folder first)

**Already there and used by this slice:** `parliament.png` (the painted chamber: deputies with their hands up under the clock; the backdrop of every Parliament screen and the bill vote), `ministry.png` (the President's and the Governor's office pages' header until a study exists), `court.png`, `square.png`, `hotel.png` and `theatre.png` (the Town Hall's venues), the three HQ scenes (the Chair's desk and the Chair election's backdrop), `station.png`, `docks.png`, `factory-gate.png`, `market.png`, `street.png`, `hospital.png`, `jail-cell.png` (Clearwater's nine places by kind), `holm.png`, `stahl.png`, `grey.png` (the secretary on the Chair's ballot), the city pictures (the Casino crop for the council). Missing:

| # | Asset id | What it is | Format |
|---|---|---|---|
| 1 | `portrait.albrecht` | Dr Konrad Albrecht, the Vanguard's national chairman: a lean man past sixty, a judge's severity, a dark overcoat with a velvet collar, a wing collar, gloves; the Ministries' steps behind. No badge, no armband, no symbol | portrait 880 × 1168 |
| 2 | `portrait.brod` | Hanna Brod, the Collective's general secretary: a woman of fifty, grey hair cut short, a tram conductor's old cap in her hand, a plain coat, a scarf; the Union House doorway behind. No hammer, no star | portrait |
| 3 | `portrait.faber` | Professor Emil Faber, the Alliance's chairman: a round-faced man of sixty with spectacles pushed up, a bow tie, a gown over one arm, papers under the other; the college quad behind | portrait |
| 4 | `scene.election-night` | The republic's result: Market Square at night under the Herald's windows, a results board being chalked by a man on a ladder, a crowd in hats looking up, a tram stopped, a newsboy; no flag, no symbol on the board (figures only) | scene 2688 × 1520 |
| 5 | `scene.event-town-hall` | A packed hall: a platform with three chairs and a jug of water, a man in the audience on his feet with a question, a woman on the platform answering, a reporter at a side table, a caretaker by the lights; plain drapes, nothing on them | scene |
| 6 | `scene.presidents-study` | The President's study in the Ministries: a tall window over the Forecourt at dusk, a desk with the day's bills and a signature pen, a wall map of the five cities, a clerk at the door; no flag, no portrait on the wall | scene |

**Done 4 Oct 2026:** all six generated in the noir style and saved as `mvp/portraits/{albrecht,brod,faber}.png` (880 × 1168) and `mvp/scenes/{election-night,event-town-hall,presidents-study}.png` (2688 × 1520). Checked: no badge, armband, flag or symbol; the results board shows figures only; the study's wall map shows plain dots.

Six pieces. The three national figures are the only new faces; the twenty-four local deputies and the nine Clearwater candidates use the crest mark like every local candidate. The crest rule holds: no symbol on any coat, cap or wall.

---

## 21. Points for the user (each with the default this document takes)

1. **One office at the top, called the President; no Chancellor** (§3, §6.3). The GDD had a 55 % line that made the winner a President or a Chancellor with a coalition rule. Default: **the President**, because it is one plain word, faction-neutral, and the coalition rule already exists in Parliament (31 of 60 with the local deputies following their Chairs). The alternative keeps the two titles and the 55 % line.
2. **The secretary is always on the Chair's ballot, and the party's own figure on the party's pick** (§4.1, §6.2). Default: **yes**: a player must beat the game's own figure to carry the party, which protects a branch from a lone Rank 4 and makes the first Chair a real win. The alternative seats any lone candidate unopposed.
3. **Petitions dissolve the council rather than calling a snap election** (§10.1). Default: **dissolve** (the rule struck, the Governor's chair to a local, the terms uncompleted; the ordinary election is never more than five days away). The alternative is the GDD's snap election, which breaks the pure calendar for a vote that would land on the ordinary one.
4. **The secretaries table bills for parties with no player Chair or deputy** (§5.2). Default: **yes**, one a week at most, so the republic has laws from the first week and a player's first national act is to change which. The alternative leaves Parliament empty until Rank 5 players exist (week 8).
5. **Clearwater's baseline is evened to 22 / 22 / 22 / 34** (§8). Default: **even**, so no party starts ahead on National Control (the provisional 20 / 24 / 24 put the Vanguard 1.2 behind). The alternative keeps the lean as Clearwater's character.
6. **The Front is a teaser in slice 7** (§9.1): the promenade, the casino and the lido open with the Wardrobe and the villa (slice 8). Default: **teaser**, nine places and twenty-four actions on the working side. The alternative builds all thirteen now, with society places that have nothing social to do yet.
7. **Several offices at once are allowed** (§3). Default: **allowed** (a Chair may be a councillor; a deputy may hold a home seat), with the 1,000 cap as the only limit; the lever is forfeiting the lower seat on taking a higher office. The alternative, one office per player, would empty councils of the most active players at low population.

---

## 22. Content list

| Kind | Count | Where |
|---|---|---|
| Clearwater: the city, three quarters (one a teaser), nine places, 24 tier-1 actions with 45 outcome texts, 3 jobs, 4 missions (11 ways, 12 outcomes), the council (offset 4, seven seats, the Casino), the Courier | 1 city | §9 |
| Clearwater's Issues (6 new; `tram-fares` gains Clearwater) | 6 | §9.6 |
| The Clearwater slate | 9 | §9.5 |
| The party's own figures (3, with portraits) and the local deputies (8 per party) | 27 | §6.5, GDD §15.10 |
| The law catalogue, with lines, effect lines, bounds, durations, `appliesTo`, the secretaries' lines and preferred orders | 13 | §7 |
| The Chair's platform lines | 9 | §4.6 |
| The Town Hall event (roles, blurb, four outcomes) | 1 | §10.4 |
| National lines (every paper), personal lines (per paper, three voices plus the Courier), the Courier's political and ambient sets | 24 + 22 + 38 | §11 |
| Result modals | 20 | §12 |
| Ambition chapter 3, *The deposit*, and `keep.deposit-receipt` | 1 | §13 |
| Help notes (Parliament, President, Chair, Governor, deputy, term, veto, the party line, the law book, who holds the republic, a petition, the party's pick, the party's own candidate) | 13 | screens §12 |
| Copy strings | ~180 | screens §11 |

---

## 23. Settled for the build (4 Oct 2026; answers to `docs/tech/slice-7.md` §22.1 and §23)

The architect's defaults are accepted except Q5 (venue kinds widened; no signature events in Clearwater) and Q23's tie order, which gains the secretary's rule; every missing text is written below. **Numbers that moved:** the automatic removal's trigger is **25 % of the control share** (the party's National Control ÷ the three parties'), not of raw National Control; **Unrest halves a home city's weight for every party and Neutral** (the shares then sum to 95). Both are in the GDD (§14.8, §15.9) and `docs/economy.md` §21. The sections above that said otherwise were corrected in the same change (§3.1, §4.3, §5.2, §6.2, §8, §10.1, §10.2, §10.4).

### 23.1 The thirty questions

| # | Decision | Where it now lives |
|---|---|---|
| 1 | **Families.** Every rotation template carries a `family`; the Chair picks a family per slot and a member reads **their residence's template of that family, else their residence's rotation for the slot**. The families and their twins: §23.2 | §4.2, §23.2; GDD §13.7 |
| 2 | **Two push templates per faction** (`use: 'push'`, slots A and B), written in §23.3. **What counts:** every matching attempt (a ×3 counts three) **at the pushed place by any member**, whether or not their own order is still open; a member who reads the order at home (below Level 10) counts only if they are at the place | §4.2, §23.3 |
| 3 | **Clearwater's rotation:** per faction slot A one and slot B two, written in §23.4 | §9.1, §23.4 |
| 4 | **The twenty-four local deputies:** §23.5 | §5.1, §23.5; GDD §15.10 |
| 5 | **Venues.** The Town Hall's venue kinds gain **`library` and `faction-hq`** (a hall is a hall; the home cities' first quarters have no square, court, theatre or hotel); the venues are set per place in §23.6, not by content order. Clearwater's common events: the Rally at **the Cannery**, the Canvass Drive at **the Rows**, Poster Night at **the Tram Depot** (Back Lane Market is a `market`, not in Poster Night's kinds). **No signature event in Clearwater in slice 7**: the Headline Story needs a press and the lake has none, and the three parties should meet there on the same terms | §10.4, §23.6; GDD §16.3 |
| 6 | **Clearwater is a branch for all three factions**, like the capital: a daily fixture each (the secretary's, or the Chair's pick) and a ***Clearwater branch*** chat chip; five chips at most (Party, the home branch, the Irongate branch, the Clearwater branch, Officers) | §4.4; GDD §15.4, §16.2; screens §5.3 |
| 7 | **The Governor's rule is added as item 1, ahead of the party's item, which stays**; locals with no player lead vote for the Governor's rule, so no cast vote disappears | §3.1; GDD §15.3 |
| 8 | **The Chair's rule for a city applies from the next order paper**, never mid-paper; the modal says *from {weekday}'s council* | §4.3, §12; GDD §15.4 |
| 9 | **An unset line falls to the secretary's line; an explicit *Free vote* makes the locals abstain.** The desk shows *the secretary's line: For* until the Chair sets one | §4.3; GDD §15.6; screens §5.2 |
| 10 | **A tie among a bloc's player deputies is no majority**: the chain falls to the Chair's line, then the secretary's | §4.3; GDD §15.6 |
| 11 | **The automatic removal fires below 25 % of the control share** (33.3 at the baselines), once a term | §10.2; GDD §15.9; economy §21.7 |
| 12 | **Unrest halves the city's weight for every party and Neutral**; the shares sum to 95 and the bar shows them as they are | §8; GDD §14.8 |
| 13 | **The runner-up taking office:** their deputy seat passes to the next unseated name on the list (else a local) and the deputy term is vacated; the presidency counts for *two in a row* when held to the term's end; a second removal seats the next-highest score that has not held the office this term | §10.2 |
| 14 | **Timing:** votes open at the tabling; the division is at the boundary into **tabling day + 4**; **tabling closes after term day 23**, so nothing divides on day 27; an override that cannot divide by day 27 is not tabled and the veto is final (the modal says so) | §5.2; GDD §15.6 |
| 15 | **At the cap with no live named law**, the law in force that ends soonest (ties: the oldest) ends when the new one starts; the paper says which | §5.2; GDD §15.6 |
| 16 | **One bill per member per term**, whichever office tables it | §5.2; GDD §15.6 |
| 17 | **The clerk's motion takes a slot of its own**, like the override; a player's removal motion needs a regular slot | §10.2; GDD §15.9 |
| 18 | **Bootstrap mid-term:** every window that opens on or after the bootstrap day runs; windows already open are skipped and the acting holders continue | §2 |
| 19 | **The five missing modal texts:** §23.7 | §12, §23.7 |
| 20 | **The Governor's Address is once per Governor's term** (the five-day council term); the President's once per national term | §3.1 |
| 21 | **The Curfew doubles the final run-in chance before the 90 cap**, for missions and the rival-ground tier-1 tap alike, while it is night at the act | §7.2 |
| 22 | **A change of Chair clears the standing orders, the party's rules and the fixtures**; a new Chair starts from the secretary's | §4.2; GDD §15.4 |
| 23 | **The party's pick's ties go to completed terms (a Governor term two), then filing**; backing opens after the pick, so "backers so far" is struck. The Chair's ballot keeps votes, backers, terms, filing | §6.2; GDD §15.5 |
| 24 | **The Chair's route is `/faction?tab=chair`**; `/office/chair` redirects to it | screens §5, §16 |
| 25 | **Sitting councillors of that council cannot sign the petition** to dissolve it (the screens' rule); every other resident of Rank 2+ can | §10.1; GDD §15.9; screens §9.1 |
| 26 | **A Governor who moves residence mid-term** passes the office to the bloc's top local; the Governor's term is vacated | §3.1 |
| 27 | **A member may back the party's candidate whoever it is**, the party's own figure included (+1 to the score) | §6.3 |
| 28 | **A figure that loses the presidency takes no seat**; the party's list starts with its players | §6.4 |
| 29 | **At least three *No confidence* votes**, as well as two thirds of the votes cast | §4.5; GDD §15.4 |
| 30 | **Smaller points, all accepted:** a quarter rounds up, `max(3, ceil(n ÷ 4))`; a list candidacy cannot be withdrawn and its 25 PC stays; pledges are any two distinct laws; tenure counts from joining; the plate word is one rule (above 50 *held by*, the top two within ten *close race*, else *contested*; the capital on its averaged shares) | §6.1, §10.1; screens §2 |

### 23.2 Q1: the families

A family is a menu entry on the Chair's desk; its label is the home template's title with *{city}* for the home city's name. A member reads their residence's twin; a residence with no twin for the family reads its own rotation for that slot (the Chair's pick is then the rotation's day key for that member).

| Slot | Family · label | Coalport · Duskwall · Ashford (home) | Capital twin | Clearwater twin (§23.4) |
|---|---|---|---|---|
| A | `canvass-anywhere` · *Talk to voters anywhere in {city}* | `dir.canvass-coalport` · `dir.v.canvass-duskwall` · `dir.a.canvass-ashford` | `dir.c.capital-canvass` · `dir.v.capital-canvass` · `dir.a.capital-canvass` | `dir.c.lake-canvass` · `dir.v.lake-canvass` · `dir.a.lake-canvass` |
| A | `canvass-doors` · *Knock on doors in {street}* | `dir.foundry-row` · `dir.v.rampart-row` · `dir.a.weavers-row` | `dir.c.capital-district` · `dir.v.capital-district` · `dir.a.capital-district` | — (the rotation) |
| A | `canvass-shift` · *Talk to the {shift} at {gate}* | `dir.shift-change` · `dir.v.guard-change` · `dir.a.print-room` | — | — |
| A | `canvass-crowd` · *Talk to the {crowd} at {place}* | `dir.noon-break` · `dir.v.loaders` · `dir.a.students` | — | — |
| A | `canvass-regulars` · *Win over the {regulars} at {place}* | `dir.anchor` · `dir.v.clerks` · `dir.a.court-queue` | — | — |
| B | `propaganda-anywhere` · *Spread the word anywhere in {city}* | `dir.paper-the-town` · `dir.v.paper-the-town` · `dir.a.paper-the-town` | — | — |
| B | `speech-anywhere` · *Make a speech anywhere in {city}* | `dir.say-it` · `dir.v.say-it` · `dir.a.say-it` | — | — |
| B | `committee` · *Go to the meeting at {HQ}* | `dir.report` · `dir.v.report` · `dir.a.report` | `dir.c.capital-report` · `dir.v.capital-report` · `dir.a.capital-report` | — |
| B | `intelligence-anywhere` · *Watch and listen anywhere in {city}* | `dir.ears-open` · `dir.v.eyes-open` · `dir.a.ears-open` | — | `dir.c.lake-ears` · `dir.v.lake-eyes` · `dir.a.lake-ears` |
| B | `issue` · *Speak on this week's Issue* | — | `dir.c.capital-issue` · `dir.v.capital-issue` · `dir.a.capital-issue` | `dir.c.lake-issue` · `dir.v.lake-issue` · `dir.a.lake-issue` |
| B | `mission` · *Take on a mission anywhere in {city}* | `dir.mission` · `dir.v.mission` · `dir.a.mission` (`residence: 'any'`) | the same | the same |
| B | `event` · *Take part in the branch's event today* | `dir.event` · `dir.v.event` · `dir.a.event` (`residence: 'any'`) | the same | the same |
| C | `train` · `six-wins` · `five-attempts` | `dir.sharpen-up` · `dir.full-day` · `dir.five-in-the-book` and the `v.` / `a.` twins (`residence: 'any'`) | the same | the same |

The welcome, crisis and push templates carry no family. The menu lists a slot's families in this order; the desk marks a family with no twin in a residence with *{residence}: the rotation* under its row.

### 23.3 Q2: the push templates (`use: 'push'`; `match.cityId: 'push'`, `districtId: 'push'` where the push is a district; `{place}` is the district's name or *Clearwater*)

| Id | Slot | Title | Line |
|---|---|---|---|
| `dir.push-canvass` | A | Talk to voters in {place} · 3 | The Chair wants {place} and so does the branch. Three conversations there today; the tram is free and the train is cheap. |
| `dir.push-posters` | B | Spread the word in {place} · 3 | Three lots of paper up in {place} before the lamps come on. The Chair has counted the fences. |
| `dir.v.push-canvass` | A | Talk to voters in {place} · 3 | The Chair has named {place}. Three reports from there on my desk by tonight, whatever the fare. |
| `dir.v.push-posters` | B | Spread the word in {place} · 3 | {place}, three runs of paper, straight and high. The Chair will walk it in the morning. |
| `dir.a.push-canvass` | A | Talk to voters in {place} · 3 | The Chair has chosen {place} this week, so {place} it is. Three conversations there, and be polite; they vote. |
| `dir.a.push-posters` | B | Spread the word in {place} · 3 | {place}, three rounds of posters, and spell the party's name right. The Chair reads the fences. |

Match `{ actionTypes: ['canvass'], cityId: 'push', districtId: 'push' }` and `{ actionTypes: ['propaganda'], cityId: 'push', districtId: 'push' }`, `counts: 'attempts'`, `target: 3`; the panel renders the secretary's signature as on every order.

### 23.4 Q3: the Clearwater rotation (`residence: 'clearwater'`)

| Id | Slot | Title | Line |
|---|---|---|---|
| `dir.c.lake-canvass` | A | Talk to voters anywhere in Clearwater | The Rows, the quay, the cannery gate: three conversations on the lake before the last tram. |
| `dir.c.lake-issue` | B | Speak on this week's Issue | The Courier says the lake is arguing about {issue}. Argue back, twice, from the Rows up. |
| `dir.c.lake-ears` | B | Watch and listen anywhere in Clearwater | The shed office, the café hatch under the arches, the mole after dark. Sit, watch, write it down. |
| `dir.v.lake-canvass` | A | Talk to voters anywhere in Clearwater | Three streets of the working town. Three reports on my desk by tonight, lake or no lake. |
| `dir.v.lake-issue` | B | Speak on this week's Issue | The lake is arguing about {issue}. The committee has a position. State it, twice, in order. |
| `dir.v.lake-eyes` | B | Watch and listen anywhere in Clearwater | The shed office's sheets, the night boats, the station barrier. Watch, note, report. Names and times. |
| `dir.a.lake-canvass` | A | Talk to voters anywhere in Clearwater | Three conversations on the lake, and listen more than you talk; the Rows have heard promises before. |
| `dir.a.lake-issue` | B | Speak on this week's Issue | The Courier's leader is about {issue}. We have a better one. Twice, please, and mind the sisters. |
| `dir.a.lake-ears` | B | Watch and listen anywhere in Clearwater | The station barrier, the café hatch, the shed office. Write it down and spell the names right. |

Matches: canvass `{ actionTypes: ['canvass'], cityId: 'clearwater' }` target 3; the Issue `{ issueTagged: true, cityId: 'clearwater' }` target 2; intelligence `{ actionTypes: ['intelligence'], cityId: 'clearwater' }` target 2. Slot C is the shared `{city}` set; slot B rotates over these two and the shared `mission` and `event` templates (`B[day mod 4]`), as the capital's does.

### 23.5 Q4: the twenty-four local deputies (`factions[].localDeputies`, `who` ≤ 60; the crest mark, no portraits)

**Vanguard** (`npc.v.dep.*`): Dr Ulrich Hennig, *retired schools inspector, Duskwall* · Margit Zoller, *director of the ration office, Irongate* · Theodor Brauer, *customs comptroller, retired, Duskwall* · Ernst Pfeiffer, *director of the tram company, Clearwater* · Luise Kaltenbach, *secretary of the landlords' association, Garrison Hill* · Walter Kranich, *stationmaster, retired, Central Station* · Dorothea Mühl, *archivist, the State Archives* · Heinrich Vollmer, *permits commissioner, retired, Duskwall*.

**Collective** (`npc.c.dep.*`): Stefan Dvorak, *crane driver, Harbour Quays* · Marie Tichy, *nurse, the Infirmary, Coalport* · Jakub Sedlak, *compositor, the Clarion* · Eva Prochazka, *shop steward, the cannery, Clearwater* · Milan Kratochvil, *docker, Coalport* · Irena Horak, *seamstress, Foundry Row, Coalport* · Bohumil Vlk, *tram driver, the Hill line, Irongate* · Zuzana Rybar, *tenants' committee, Eastside*.

**Alliance** (`npc.a.dep.*`): Dr Ingrid Sauer, *barrister, Chancery Row* · Benedikt Lorenz, *bookseller, Bridge Street, Ashford* · Dr Hedda Winter, *lecturer in history, Ashford* · Oskar Brandl, *magistrate's clerk, the Courts* · Therese Amann, *café owner, Old Town* · Konstantin Reiss, *solicitor, tenants' cases, Ashford* · Johanna Steindl, *leader-writer, the Gazette* · Paul Wendt, *schoolmaster, St Martin's, Clearwater*.

Ids `npc.v.dep.hennig`, `npc.c.dep.dvorak`, `npc.a.dep.sauer` … by surname, in list order; the chamber shows *Local deputy · {who}*. Checked against the slates of slices 3, 4 and 7 (no duplicate surnames) and against real party and state figures of the period; the Vanguard's eight are retired officials, clerks and a company director, written cold.

### 23.6 Q5: event venues

| Place | Town Hall (kinds `square`, `university`, `court`, `theatre`, `hotel`, `library`, `faction-hq`) | Rally | Canvass Drive | Poster Night | Signature |
|---|---|---|---|---|---|
| Coalport | `coalport.union-hall` (the hall upstairs) | slice 6 | slice 6 | slice 6 | slice 6 |
| Duskwall | `duskwall.archives` (the Archives' lecture room) | slice 6 | slice 6 | slice 6 | slice 6 |
| Ashford | `ashford.university` (the Quad's lecture hall) | slice 6 | slice 6 | slice 6 | slice 6 |
| Irongate · Government Quarter | `irongate.opera` (the foyer) | slice 6 | slice 6 | slice 6 | — |
| Irongate · Old Town | `irongate.basilica-square` (the parish hall) | slice 6 | slice 6 | slice 6 | slice 6 |
| Irongate · Station & Market | `irongate.grand-hotel` (the ballroom) | slice 6 | slice 6 | slice 6 | — |
| Irongate · Eastside | `irongate.iron-bridge` (the bridge hall) | slice 6 | slice 6 | slice 6 | slice 6 |
| Irongate · Garrison Hill | `irongate.esplanade` (the bandstand pavilion) | slice 6 | slice 6 | slice 6 | slice 6 |
| **Clearwater** | `clearwater.st-martins` (the church hall) | `clearwater.cannery` | `clearwater.rows` | `clearwater.tram-depot` | none in slice 7 |

The Town Hall's art is `scene.event-town-hall`; its row in the call sheet reads *at {venue}'s hall*.

### 23.7 Q19: the five missing modal texts (`politics.results`)

| Act | Stamp | Headline | Body | Next |
|---|---|---|---|---|
| `chairBack` | Backed | {name} has your backing | Backing is public and final, one a Chair election. {name} has {n} now; two by {until} keep the name on the ballot beside the secretary's, and up to five count. | Next: voting for Chair opens {pollsWeekday}. |
| `fixture` | Set | Tomorrow's event in {city} | The branch's event tomorrow is {event} at {venue}: posted at midnight, settled at the next. Members join it from the Faction tab; roles still empty at the start go to volunteers. | Next: it's on the board from midnight. |
| `presidentWithdraw` | Withdrawn | Your name is off the list for President | The 100 Political Capital is back in your pocket, and your place at the top of the party's list goes with the candidacy. The party picks on {weekday} without you. | Next: nothing until the next term's names in. |
| `chairPetitionOpen` | Opened | A vote on the Chair | Your name is the first of {needed}. Members of Rank 3 and above sign until {until}, 10 Political Capital each; if the names come in, every member votes for two days. | Next: the count of names, {resultWeekday} morning. |
| `chairPetitionSign` | Signed | Your name is on the petition | {signatures} of {needed} by {until}. Signing is public and final, and the Chair can see who signed. | Next: the count of names, {resultWeekday} morning. |

The `partyRule` modal (§12) gains the day: body *The party's item on every {city} order paper from {weekday}'s council, and what local councillors vote for when no player leads them.* The `veto` modal's *Next* reads *Next: the veto is final; Parliament cannot vote it through before the term ends.* when the override cannot divide by day 27 (Q14).

### 23.8 Alt texts (≤ 160), checked against the pictures

| Asset id | Alt text |
|---|---|
| `portrait.albrecht` | Dr Konrad Albrecht: a lean grey-haired man past sixty with a judge's severity, a dark overcoat with a velvet collar, a dark red tie, gloves in his hand; columns behind. |
| `portrait.brod` | Hanna Brod: a woman of fifty with short grey hair, a red scarf over a dark coat, a tram conductor's cap held in both hands; a doorway behind her. |
| `portrait.faber` | Professor Emil Faber: a round-faced man of sixty with spectacles pushed up, a red bow tie, a tweed waistcoat, a gown on his shoulders and papers under his arm. |
| `scene.election-night` | Market Square at night: a crowd in hats under a newspaper's lit windows, a man on a ladder chalking figures on a results board, a tram, a newsboy with papers. |
| `scene.event-town-hall` | A packed hall: a woman on her feet answering at a long table on a platform, two men seated, a jug and glasses, a man in a cap standing to ask, a reporter writing. |
| `scene.presidents-study` | A study at sunset: a tall window over the city's domes, a desk with stacks of papers and a pen under a green lamp, a wall map with five cities, a clerk at the door. |
| `scene.parliament` | The chamber under the dome: deputies on curved benches with their hands raised, galleries above, the chair and two clerks' desks below a clock. |

The architect's drafts were right in substance; four details are corrected from the pictures (Albrecht holds his gloves and wears a dark red tie, no wing collar; Faber's bow tie is red and the gown is on his shoulders; the results board shows figures only; the study's lamp is green and the window shows sunset). Content policy: nothing on any coat, cap, wall, board or drape.

### 23.9 §23 #18: the personal lines in the other four voices

Every §11.2 headline is shared by the five papers. **The factual lines print the Herald's deck in every paper** (`governor-local`, `address`, `chair-filed`, `list-missed`, `pick-won`, `pick-lost`, `bill-tabled`, `bill-passed`, `bill-failed`, `pledge-kept`, `petition-opened`, `petition-failed`, `pushed`): they are counts and dates and the voice adds nothing. **Eight carry a voice**; their decks per paper:

| Id | Clarion | Sentinel | Gazette | Courier |
|---|---|---|---|---|
| `governor` | Top of the poll with a council term behind them. Secretary Holm: "The rule's yours. Pick one the quays can feel." The Address is yours once this term. | Top of the poll, a term served, the committee's confidence recorded. The Governor's rule goes to the vote first; the Address once this term. | Top of the poll with a council term behind them, which the Gazette has checked. The Governor's rule goes first; the Address is yours once. | Top of the poll on the lake, a term behind them. The Governor's rule goes to the vote first at the Casino; the Address once this term. |
| `chair-front` | {votes} votes, and the secretary's own. Every member's morning orders, the party line in Parliament and the branch's event are yours for twenty-eight days. Holm: "Don't waste them." | {votes} votes. The orders, the party line and the fixture are the Chair's for twenty-eight days; the committee expects them set by tomorrow. | {votes} votes, counted twice. The orders, the party line and the Rooms' event are yours for twenty-eight days. Mr Grey has left you the pencil. | {votes} votes, lake and capital counted together. The orders, the party line and every branch's event are yours for twenty-eight days. |
| `chair-lost` | {winner} took it with {votes} to your {yourVotes}. Holm: "The orders still want doing." Twenty-eight days to the next. | {winner} took it with {votes} to your {yourVotes}. The committee records the result and expects the orders done. Twenty-eight days to the next. | {winner} took it with {votes} to your {yourVotes}; the Gazette prints the count in full. Twenty-eight days to the next. | {winner} took it with {votes} to your {yourVotes}. The lake voted too. Twenty-eight days to the next. |
| `deputy-front` | {ordinal} on the list, sworn under the dome. One law a term is yours to put; every bill is yours to vote on. The Union Hall has the train times. | {ordinal} on the list, sworn in order. One law a term; every bill a vote. Beacon House expects the division lists. | {ordinal} on the list, sworn under the dome, which the Gazette's man watched from the gallery. One law a term; every bill a vote. | {ordinal} on the list, sworn under the dome, twenty-five minutes from the lake. One law a term; every bill a vote. |
| `president-front` | The republic's, for twenty-eight days. A law a week, the veto once, the Address once, and the Clarion watching with the rest. | The republic's, for twenty-eight days. A law a week, the veto once, the Address once. The committee has sent its congratulations and its list. | The republic's, for twenty-eight days. A law a week, the veto once, the Address once, and the Gazette's leader column every morning. | The republic's, for twenty-eight days, and the lake's for a term. A law a week, the veto once, the Address once. |
| `president-lost` | {winner} scored {score} to your {yourScore}. First on the list: a deputy's seat is yours, and Holm says that's where the work is. | {winner} scored {score} to your {yourScore}. First on the list: a deputy's seat, and the committee's expectation of a full term. | {winner} scored {score} to your {yourScore}; the Gazette has checked the arithmetic. First on the list: a deputy's seat is yours. | {winner} scored {score} to your {yourScore}. First on the list: a deputy's seat, and the lake line to it. |
| `dissolved-councillor` | {signatures} residents signed. Your seat ends today, the term uncompleted. Holm: "Then win it back." Names in on {weekday}. | {signatures} residents signed. Your seat ends today, the term uncompleted; the committee will want to know why. Names in on {weekday}. | {signatures} residents signed, which the Gazette has counted. Your seat ends today, the term uncompleted. Names in on {weekday}. | {signatures} residents signed, from the Front to the Rows. Your seat ends today, the term uncompleted. Names in on {weekday}. |
| `chair-vote` | {reason}. Confidence or no confidence, until {until}; two thirds remove. Holm is saying nothing, loudly. | {reason}. Confidence or no confidence, until {until}; two thirds remove. The committee votes in order. | {reason}. Confidence or no confidence, until {until}; two thirds remove. The Gazette is impartial, and curious. | {reason}. Confidence or no confidence, until {until}; two thirds remove. The lake has a view. |

Every deck ≤ 200 characters with the longest tokens. The Courier's non-political set (the slice-1, 5 and 6 lines) is transcribed by the designer in the content change with the Courier, as §11.3 says; its voice is above.

### 23.10 The twenty notes (`docs/tech/slice-7.md` §23)

1. The plan's row: rewritten (`docs/IMPLEMENTATION_PLAN.md` §5; the build line reads *the President* and *36 of 60*). 2. `TERM_EPOCH` as a code constant: accepted. 3. Families: §23.2. 4. The trigger: §23.1 #11. 5. Unrest: #12. 6. The Governor's rule ahead: #7, #8. 7. The unset line: #9. 8. The pick's ties: #23. 9. Timing: #14. 10. Deputies and venues: §23.5, §23.6. 11. Modals: §23.7. 12. The route and the councillors: #24, #25. 13. `scene.parliament` catalogued, not bound to the kind: accepted. 14. `nation.ts`: the developer's (T7). 15. The deputy's 14 days: confirmed (§3's table says so). 16. GDD §15.1's prose now says *Parliament* and *the Presidency*. 17. **Wording confirmed:** laws never touch Party XP or the odds of a §8.4 check; the caught check is a risk roll and `caughtDelta` moves it (§5.4, GDD §15.8). 18. The four voices: §23.9. 19. The quarter order: accepted. 20. Stacked stipends: accepted, counted by the report (Appendix C #65).

---

## 24. Review 4 addendum (6 Oct 2026)

- **§9.1, the city:** Clearwater is **one map** like a home city (GDD §14.13, review 4): no quarter outlines, bar or overview; the Front's four places are greyed pins with *Opens with a later edition* until slice 8; the Places list is grouped by quarter.
- **§9.2, the Casino:** its sheet carries **the council's blocks** (the desk for a councillor, the rule in force with its effect, the seven seats as rows, the order paper, the week's Issues, the Election card; GDD §15.3) under its own tickets; the kind stays `bar`. **§9.4, the room:** a ***Lodgings*** card at **the Rows** (*A bed in the Rows · 7 nights · 100 Iron · Rested banks to 250*), not on the residence card; half price under *Rents in the Rows*.
- **§11.3, the Courier:** the **lake resident's** paper; a visitor reads their own paper in its *Clearwater edition* (GDD §3.3). The Courier's city-group templates serve as the neutral local line in other papers' Clearwater editions; its ambient set is the edition's.
- **§3.1, the Governor:** the *What now* card's third line for a Governor reads the office's pay; the Governor's rule is item 1 on the Town Hall's *Up for a vote* block as on `/council`.


## Added 8 Oct 2026 — review 5

- **§9.4, the jobs:** the **Tram conductor pays 240** (was 200), by the rung rule of GDD §9.2 (`docs/design/review-5-answers.md` §5). The vendor (100) and the Cannery hand (180) are unchanged.
- **§7.2, the Curfew Order:** its window is §2.2's night; if the user takes the six-hour game day (answers §11), that is the last two hours of every six, a third of the day rather than ten hours in twenty-four. The bound (+100) is unchanged.
- **§9.2, the Sanatorium:** carries the *Treatment* card like every `hospital` place (answers §8).
