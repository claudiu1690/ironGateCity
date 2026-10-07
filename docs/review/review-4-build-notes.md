# Review 4: what changed in the build (7 Oct 2026)

Your twenty-five notes from 6 October, one by one: what the game does now, and where to look. Everything below is in the local build on branch `slice-0` (phases 0–9, and the QA fix round of 7 Oct). Start it with `pnpm dev:mem` and open <http://localhost:5173>. The dev panel (the dashed **Dev** button on the right) moves the clock, gives Levels and Ranks, and sends you to the cells; the README's walk-throughs say which buttons to press.

**Start a new account** to see the new opening: an account made before this build keeps its character, and a sign-up that stopped half-way through the old story starts again at the station (its name and face are kept).

| # | Your note | What the build does now | Where to see it |
|---|---|---|---|
| 1 | Some faces look the same | Five faces were redrawn, and the sign-up form offers all eighteen. | The sign-up form |
| 2 | The old man and his questions are a bad start | **The Last Train In.** You step off the night train at Irongate Central. Three people each ask a small favour: Holm (a parcel), Stahl (a bundle of flyers), Grey (a signature). **Whom you help is your party**, and you take the six o'clock to their town. On the train you choose what is in your suitcase (your stats) and what your father left under its lining (your Ambition, and his coat). The first thing you do in town is **the favour itself**, at your party's hall, highlighted when you arrive. Eight taps from sign-up to the first result. | Sign up, then the three screens; *To the city* on the paper |
| 3 | The paper looks odd on a big monitor | From 960 px wide the paper is a 720 px sheet with a frame and a shadow, lying on a dark desk. Phones and tablets are unchanged. | The Paper tab on a desktop |
| 4 | There is no clock | The top bar shows the time in your own clock (it follows the dev panel's clock). Every countdown reads one way: *in 24 min*, *at 14:40*, *tomorrow 01:00*, a weekday, or a date a week or more ahead (*19 October*). Nothing says *midnight* for the day's turn. | The top bar; any countdown |
| 5 | *Level 2 · place your point* stays after placing it | Fixed: the line changes at once to the stat you placed, *Level 2 · Intelligence 12 → 13*. With two points waiting it reads *Level 3 · place your points (2)*. | A result that levels you up |
| 6 | *That's all three: see the note* (what note?) | The third order's line now says what follows, in the secretary's voice: *That's the three; Holm has a word for you when you close this.* | Finish the day's three orders |
| 7 | Travel should happen on the nation map | **The journey runs on the nation map**: the route is drawn along the painted line, and your pin moves along it with *To Irongate · in 12 min* under it (*In Irongate* once you are in). The card turns up part-way, at a moment drawn when you board: the pin pulses and the card opens. Drag the map away and **Follow your pin** brings it back. On a desktop the details sit in a side sheet on the left, and the pin and its label always stay clear of it. | Level 10 (dev panel), Map → Nation → Irongate → Board |
| 8 | Parts of Irongate are in no district | The five districts now cover the whole picture, river included, split along the river's middle. Inside a district the map drags to the district's corners and no further. | Irongate's overview and each district |
| 9 | Register or take a room: what and why? | One button, **Live here**, with the plain reason under it (*vote and stand here, and your orders come from here*). A bed for a few nights is no longer on that card: it is a **Lodgings** card at Tram Junction, *Take a bed · 100 Iron* (50 while the *Eviction Notices* Issue holds). | *Where you live* in an Irongate district; Tram Junction's sheet |
| 10 | I won a seat; now what? | A **What now** card on the front page after you win (and once at the hall) says what a councillor does and when, with a button to your **desk at the Town Hall**: your vote, proposing a rule, and what comes next by day. | Win a seat (README's council walk-through) |
| 11 | Council rules are invisible; no place for the council | **Every city has a Town Hall pin**, open at every Level: the council's members (player or local candidate), the rule in force in plain words, the order paper, the week's Issues and the election. The rule in force is also one line on the city's plate, and tapping it opens the hall. Its note gives the council's own majority: four of seven at home, six of ten in Irongate. | The Town Hall pin in each city; the plate's *Council rule* line |
| 12 | Heat: how, what, and too small | Heat is its own line in the top bar, under Energy, in a larger size (and every label in the top bar opens its own note, on a phone held sideways too): *Heat 60 · Hot*, red when Hot or Wanted. Its note says what your state does and *Cool at 20:40*. The Political Capital label opens its own note now. | Dev panel → Heat 60, then tap *Heat* |
| 13 | Home orders do nothing in another city | Away from home the orders panel is one quiet line: *Your orders are in Coalport · 1 of 3 done*. | Any other city |
| 14 | What is the ISSUE tag? | The chip names the Issue (*Issue · Harbour Rates*) and opens a note saying what an Issue of the week is. | The Places list in Irongate |
| 15 | Keep the duty officer's lines | Kept. | The cells |
| 16 | Don't tell me to close the game | Gone from the cells, the infirmary and the train. *Energy keeps refilling* stays. | The cells; the train |
| 17 | *Legal Aid: half price*? | It reads *Legal Aid · the Alliance pays half your bail*, and its note explains the Alliance's legal-aid desk. | An Alliance character in the cells |
| 18 | What does Reputation do? | Its note says it plainly: each step makes everything you try in that town come off three times in a hundred more. Your tickets in a town where you are Familiar or better carry *Known here · better odds*. | Tap *Reputation* on the plate; tickets after ten wins in a town |
| 19 | A list of who is in prison | Every police station's sheet has **In the cells now**: who is held there (any party), and when they get out. | A station's sheet, from a second account |
| 20 | Prison has no repercussions | The cells now cost three things and take nothing you own: a longer sentence (20 minutes plus half your Heat, at most 60), **the day's party orders are off** until the day turns, and **a mark on your record** for every arrest. The release modal and the next paper say so. | Dev panel → Heat 60, *Next caught: on*, then a risky mission |
| 21 | Home cities have odd outlines like districts | Home cities are **one map** now: no outlines, no overview, no quarter bar. Places you can't use yet are **greyed pins with a lock**, and a tap says *Opens at Level 6*. The Places list groups places by quarter. Only Irongate has districts. | Coalport, Duskwall, Ashford |
| 22 | An order sent me to missions I can't take | Fixed: an order is offered only when you can take at least one matching ticket that day. | Party orders after Level 6 |
| 23 | A paper per city? | **Your paper, in a local edition.** You always read your own party's paper, and away from home it prints that town's edition: *The Coalport Clarion · Duskwall edition*, with that town's dateline, its Issues first and its election line, while your orders, letters and desk stay yours. | Travel anywhere and open the Paper |
| 24 | Health isn't always shown | Health is always in the top bar now, full or not. | The top bar |
| 25 | Show the rank names and what they unlock | Tap the Party XP label for **the rank ladder**: seven titles, the Party XP each needs, what each opens, your row marked. The Me tab reads *Red Collective · Activist · 1,212 / 2,000 to Organiser* (your party's name first). | The top bar's Party XP; the Me tab |

## Words we chose that you may want to change

A few lines had no wording in the design, so we wrote them; say if any jar:

- the travelling pin's label and button: *To Coalport · in 12 min*, *Follow your pin*, and the plate's row *On the way · {the card's title}*;
- the local election line: *Duskwall elects its council: names go in until Friday 03:00*;
- the welcome headline for the Vanguard and the Alliance: *Stahl's bundle goes out at Beacon House; start there.* and *Grey's tenant wants a witness at the Assembly Rooms; start there.* (the signature is the tenant's, so beat 2's echo reads *You witnessed a tenant's signature for Grey.*);
- two lines of the favours, changed to keep to the game's plain words: Holm's man on the door *counts them while you wait* (was *in front of you*), and Stahl's *Twenty flyers* (was *leaflets*).

The pin stays a plain pin, as you decided: *Your pin*, *Follow your pin*.

## Things to look at while you play

- The marker's first chapter is refitted to the new opening: nobody has called yet, so it offers *Ask the branch who in Clearwater holds paper like this* or *Say nothing to anyone, and put it back under the lining*, and the man in the good coat finds you on the third evening.
- The train compartment picture is now the empty compartment (a suitcase on the rack, a coat on one bench, a parcel on the other). On beat 2 your helper is *down the corridor arguing with the guard*, and comes back to ask about the suitcase; their face is beside the question.
- The favour from the platform is once only for everyone: someone who signs up after 22:00 UTC keeps the evening's three orders the next morning, with what they did still done, instead of being dealt them again; with all three done, they get the day's usual orders.
- Small wordings from the QA round: the *Take a job* order ends *The first wage lands tomorrow 03:00.* (in your clock; it said *Paid at midnight*); a one-minute stay prints *Spent 1 Minute in the Cells*; the Election card's rule line carries the rule's plain words, as the plate does.
