# Slice 8 "A Life in the City": how to play it (17 Oct 2026)

Slice 8 is built, QA'd and fixed on branch `slice-0`. This page is for you to play it. It covers how to start, what is new, the dev panel's Life buttons, a 30-minute walk-through, what an account you already have will see, and the known limits. The playtest question is **do players have goals for the next month, not just the next session?**

## How to start

1. **Stop `pnpm dev:mem` completely and start it again.** This slice changes the database (migration 012) and the server; a running server from before will not have it. Run `pnpm install` first if you pulled.
2. Open <http://localhost:5173> and sign up (or sign in with an account from before, if that database is still running; see below).
3. The **Dev** button (dashed amber border, right edge, half-way down) opens the dev panel. The slice-8 buttons all start with **Life:** and are listed below.

Stopping `pnpm dev:mem` resets its database and the clock. The clock is shared by everyone on your local server, and it only moves forward.

## What is new

- **The Wardrobe** (Me tab). Four slots: **Coat · On you · Papers · Tools**. No weapons. What you wear sets your **Charisma**, and each item has a small effect (*better odds putting up posters*, *better odds at a checkpoint*…). Two outfits, **Town** and **Plain clothes**, one tap to switch; a flat adds **Evening**.
- **Shops** are cards on places: the clothes stall (a market), the party store (your party's hall), the tailor, the press, and the back room (from Rank 3: forged papers, and *have a mark struck off*). The stall buys things back at a tenth.
- **Rival ground.** In a good coat you are **recognised** in a rival town (Charisma 20 and up), and run-ins are likelier. Change into plain clothes before you arrive and nobody looks twice.
- **Someone to walk with you.** A doorman (Level 6, 400 a week), a steward (Rank 3, 1,200) or a minder (Level 16, 3,000), hired at the party store. In a run-in he gets his own row, *{Name} steps in*. Never against the police. When the week runs out he goes home; nothing else is lost.
- **The bar.** *Buy a round* (30 Iron, 2 Energy, three a day) puts you *in good spirits*: +10 % XP on your next three missions. *A plate of something* (100 Iron) makes you *well fed*: +10 % XP for four hours and Health +15. The hotel's *Dinner* (400 Iron, needs Charisma 10) does more.
- **The Dossier** (a fourth tab). Some actions land an **entry** on a named person. Three entries on the same name make a **Case File** (from Level 16). Take a Case File to a newspaper and print an **exposé**: three short steps, and the name's party loses ground in their town. You can also sell a file at a station, or turn it into an **informant** who reports every second morning for two weeks.
- **Patrons.** Edith Crane (the press, Herald House in Irongate) and Julius Marr (the money, the Pier Hotel in Clearwater). Visit, give gifts, do their **Requests** (in the paper's Letters) and your **Favour** climbs through four tiers, each with a perk.
- **The flat** (from Level 10): 2,500 Iron, then 150 a week, paid ahead. Better sleep, a bigger Rested pool, the Evening outfit and +2 Charisma in that town. If the rent runs out **the flat waits**; nothing is taken, and paying a week opens it again.
- **Legacy** (Me tab): a lasting record (council terms, offices, exposés, a patron's top tier, a finished Ambition) with eight perks to spend it on.
- **The paper** carries your life: personal headlines (*The Flat Waits*, *{Name} Exposed*), the desk's clocks (*Ahead*), and the **Letters**: patron Requests, informants' reports and Monday's gossip.
- **Clearwater's Front** opens: the Promenade, the Lido and the Pier Hotel, with society calls that need a good coat at the door.

**The fix round (17 Oct)** changed four small things:

- The share bar's tap target under the city plate now grows upward from the plate's foot, so it never takes a tap meant for a pin just below the plate. The Reputation box keeps its own tap.
- The Me tab's stat strip spells the stats out: *Strength · Intelligence · Agility · Charisma* (it read *STR · INT · AGI · CHA*).
- The Informants list now shows each informant's last report, as the design asked.
- A test now accepts *1 thing* as well as *2 things*.

## The Life buttons (dev panel)

| Button | What it does |
|---|---|
| **Life: Three entries on a rival name** | Three entries (political, pattern, criminal) on a rival name in the town you're in |
| **Life: Make it stale** | Every entry you hold becomes a week old (stale) |
| **Life: Next tap lands an entry** | Your next action lands a Dossier entry for sure |
| **Life: A Case File now** | A Case File on that name at once |
| **Life: Rent due today / Rent ran out** | A flat in your home town (bought if you have none), paid through today, or through yesterday (the flat waits) |
| **Life: Give me 20 Legacy** | 20 Legacy points to spend on the Me tab |
| **Life: Give me a party coat / The greatcoat and the hat / The press pass and the camera / Give me forged papers** | Given and worn at once |
| **Life: A doorman / A steward / A minder** | Someone walks with you for a week (free) |
| **Life: His last day / He goes home** | His contract ends today, or ran out yesterday |
| **Life: Well fed, 5 minutes left / Nine missions in hand / Three rounds today** | The bar's effects: a plate about to wear off; nine missions in good spirits; today's three rounds used up |
| **Life: Crane at 29 · 59 · 89 / Marr at 29 · 59 · 89** | A patron's Favour one short of the next tier: one gift crosses it |
| **Life: First visit two days ago** | Both patrons visited two days ago, so a Request arrives in the next morning's Letters |

You will also use **Level 10**, **Boost me**, **Give 2,000 Iron**, **Refill Energy**, **Next day**, **Next run-in · Set** and **Arrive now**.

## A 30-minute walk-through

Start with a new **Collective** member. Use **Level 10**, **Give 2,000 Iron** twice and **Refill Energy** whenever you need them. You start in Coalport.

**1. Buy a coat and watch Charisma move (3 min).**
Open the Me tab: the Wardrobe says *Town · Charisma 5* (the demob suit), and the stat strip spells out *Charisma*. Go to **Union Hall** on the map. Your party store's card sells the *Convenor's coat* (800 Iron, members only); the confirm shows *Charisma 5 → 12*. Buy it and tap **Wear it now**. The Me tab now reads Charisma 12. For a little more, the clothes stall at **Market Row** sells a good hat (400 Iron, +6).

**2. Dress for rival ground (5 min).**
Tap **Life: The greatcoat and the hat**. The Town chip now reads *recognised on rival ground*. Open the map, then **Nation**, and board for Duskwall. The journey plate warns *In this coat you'll be recognised in Duskwall* and offers **Change into plain clothes** (one tap). Tap **Arrive now**. You're in plain clothes, and the tickets say *Plain clothes · unnoticed*. Tap the chip to switch back to **Town**: the plate now says *recognised here* and the tickets *Recognised · run-ins likelier*. Travel back to Coalport.

**3. Hire a doorman and see him in a run-in (4 min).**
Back at **Union Hall**, the party store's card has *Someone to walk with you*. **Hire · 400 a week** gets you the doorman, and the Me tab's *Walking with you* names him. Tap **Next run-in · Set**, then do any mission. The run-in sheet's first row is his: *{Name} steps in · Fair odds*. Pick it and see whether he holds them off.

**4. A round and a plate at the bar (3 min).**
At **The Anchor**, the bar's card offers **A plate of something** (100 Iron): *Fed*, Health +15, *Well fed until {time}*. Then **Buy a round** (30 Iron, 2 Energy): *In good spirits · your next 3 missions*. Do a mission. Its receipt shows two extra lines, *Well fed · +10 % XP* and *In good spirits · +10 % XP · 2 left*.

**5. Three entries, a Case File, an exposé (6 min).**
A Case File needs Level 16. Open the browser console on the game's tab (F12, then *Console*) and paste:

```js
await fetch('/api/test/character', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: 16, cityId: 'irongate' }) })
```

Reload. You're now in Irongate. Tap **Life: Three entries on a rival name**. The Dossier tab gets a dot, and the name's card shows three entries. Tap **Make a Case File · 3 entries**: *Bound*. Go to **Herald House** (Old Town) and tap **Take a Case File to the paper · 20 Energy**. Step 1: pick the file and the angle (*The facts, plainly* or *The story, with a headline*). Step 2: pick how to handle the editor and tap **Take it to the editor**. A Success reads *Printed*, with the swing against the name's party and Legacy +2. Tap **Next day**: the front page carries *{name} EXPOSED*.

**6. Visit a patron and raise Favour (4 min).**
Edith Crane's card is at the top of Herald House's sheet: *A stranger · Favour 0*. Tap **Gift · 200 Iron**: *Favour 0 → 2*. To see a tier change, tap **Life: Crane at 29**. Wait for **Next day** (one gift a day), then give another gift: she becomes your *Associate*, and her perks line updates. With **Life: First visit two days ago** and **Next day**, her Request arrives in the paper's Letters.

**7. Buy the flat, let it lapse and wait (3 min).**
Me tab, **Where you sleep**: **A flat in Coalport · 2,500 Iron** (the flat is in your home town) gives *Yours*, and the outfit chips gain **Evening**. Tap **Life: Rent ran out**, then **Next day**. The paper prints *The Flat Waits*, and the Me tab says *Your flat waits · pay a week to sleep there*. Check that nothing is gone: the flat is still listed and your Iron is untouched. **Pay a week · 150** opens it again, from today, with no back rent.

**8. Take a Legacy perk (1 min).**
Your Legacy is the exposé's 2 plus anything else you earned. Tap **Life: Give me 20 Legacy**. On the Me tab's Legacy block, pick a perk (for example *A bigger Dossier* for 5, or *A name they know* for 10) and tap **Take it · 5 Legacy** (or 10). It reads *Taken ✓*, and the points to spend go down.

**9. Read the paper's letters (1 min).**
Open the paper. Below the news, the **Letters** carry Crane's Request with its deadline. If you turned a Case File into an informant (Dossier, *Recruit as an informant*, needs Associate with that town's patron), his reports arrive here every second morning, and his row on the Dossier's Informants list shows the last one.

## What an account you already have will see

The new database step (migration 012) runs when the server starts:

- Your current clothes become the **Town** outfit, and **Plain clothes** is your party's starting outfit with your party card. Evening is empty until you buy a flat.
- **Legacy is filled in from your history**: completed council terms (3 each), Governor (5), Chair (10), deputy (5), President (40), and hero or Issue awards (2 each). It is safe to run more than once.
- Nothing else changes: no patrons yet, an empty Dossier, no flat.
- A new character usually starts at Charisma 5 (the demob suit), so they need a better coat or a hat before the hotel's dinner (Charisma 10) or a society call's door.

## Known limits

- **Political Seasons are deferred** (your decision, 16 Oct): no 84-day season, no Champion, no awards, no Hall of Fame. The other month-long goals are in: a Case File, a patron's tier, a Request, the rent, a chapter's date, a bodyguard's week.
- **The Dossier and the exposé are the least clear part of the slice** (QA's verdict). It's worth watching whether players know where entries come from, why three make a file, and what the two angles do.
- Not built: Blackmail and Denounce (held back by design), the *While You Were Away* life lines, and Legacy from surviving a vote or a pledge.
- The rule line's tap on a city with a live council rule has not been measured by hand; the automated check passes.
