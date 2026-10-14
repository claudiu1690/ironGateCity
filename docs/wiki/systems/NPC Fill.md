---
type: system
title: NPC Fill
aliases: [Local candidates, Local councillors, Locals, NPC candidates, Local deputies, Party's own figures, Secretaries, The secretary, Run by the game]
tags: [politics, npc, low-population]
status: partly built
slice: "3 (home slates); 4 (capital slates); voting rework (locals' rules); top-level figures and local deputies designed for 7"
gdd: ["§15.3", "§15.4", "§15.5", "§15.6", "§15.10"]
adrs: ["0047", "0045", "0084"]
updated: 2026-10-14
---

# NPC Fill

## In one paragraph

Politics has to work with one player or fifty thousand. So the game runs townspeople and party
officials who **fill every list and every empty seat**: local candidates on every council slate,
local councillors in seats no player wins, the party secretary who issues orders and picks the
party's rule when no Chair exists, and (from slice 7) local deputies, a local Governor and each
party's own national figure. They are always **marked as run by the game**, never shown as
players, and the ratio is printed openly so a growing player base can watch itself take over.

## How it works

- **Council slates** ([[GDD#15.10 NPC fill: politics at any population|GDD §15.10]]):
  - **Home cities:** each faction has **nine named local candidates** with a profile (44 … 15). With *p* players standing, `max(0, 9 − p)` locals stand, from the top of the slate. Nine names for seven seats means at least two lose each cycle.
  - **Irongate:** **ten per faction, two per district** (profiles 28 and 20), filling each faction's district list to two names.
  - **Clearwater** (slice 7): three per party (28 / 22 / 16), filling each list to three.
  - A local's **local support** is its profile ±2 seeded jitter per cycle; the profiles are set so about five days' work in the capital beats a district's top local and *Known* alone does not.
- **Marking:** the faction mark in place of a face and the words ***Local candidate*** in place of a rank title on every slate, ballot, count and council screen. Lists group them under *Local candidates* with one line: *Townspeople run by the game. They fill the list so there is always a council; a player who is better known here beats them.* Their standing label is derived (`profile × 5`), so the top three read *One of Us*, the rest *Trusted*.
- **Local councillors never vote** (since 10 Oct 2026). There is no council vote. **Each home local carries a rule in content**, which fills the ballot's empty cards in seat order ([[City Council and the Rule Vote]]). Capital locals carry none (the party's card falls to the secretary). Locals never change a card and draw no pay.
- **The secretary** (Vanguard *Organiser Stahl*, Collective *Secretary Holm*, Alliance *Mr Grey*): issues the daily [[Party Orders]] until a Chair exists, calls the daily fixture event ([[Campaign Events]]), and supplies the **party's default rule** (card 1 when no Governor or Chair sets one): Vanguard *Rally Permits*, Collective *Long Service Order*, Alliance *Reading Room Grant*. From slice 7 the secretary is always on the Chair's ballot (*keep the orders as they are*) and tables bills for a party with no player Chair or deputy.
- **The ward vote is the NPC electorate:** at home a candidate's [[Local Standing]], in a battleground the opinion half of every score, so mission work counts even when few players vote.
- **The ratio is shown openly** (*NPC seats: 6 / 7*, *NPC seats: 38 / 60*).
- **At the top (slice 7):**
  - **Local deputies** fill Parliament's seats no player holds: eight named per party, then counted. They vote by the chain (player deputies' majority → the Chair's line → the secretary's line) and abstain while the home city is in Unrest ([[The Legislature and Laws]]).
  - **The party's own figures** (*Dr Konrad Albrecht*, Vanguard; *Hanna Brod*, Collective; *Professor Emil Faber*, Alliance) stand for President when no player carries the pick and hold the office when nobody wins it. They never back, pledge, veto or draw pay ([[National Elections]]).
  - **A local Governor** holds the chair when no player qualifies, marked *Local*; it sets nothing and draws nothing ([[Offices]]).

## Where it lives

**Rules:** [[GDD#15.10 NPC fill: politics at any population|GDD §15.10]] · [[GDD#15.3 City Councils|GDD §15.3]] · [[design/slice-3-politics|slice 3 design §5.2]] (the home slates) · [[design/slice-4-battleground|slice 4 design §8.3]] (the capital slates) · [[design/voting-simplified|voting-simplified Appendix A]] (the locals' rules) · [[design/slice-7-nation|slice 7 design §6.5, §9.5]] (the figures, local deputies, Clearwater's slate) · [[adr/0047-elections-above-the-council-reuse-the-box|ADR 0047]] (figures and the secretary as ballot lines, never characters) · [[adr/0045-parliament-bills-slots-and-computed-local-deputies|ADR 0045]] (local deputies computed, never stored)

**Code (built: council fill and the secretaries):**
- Rules: `packages/rules/src/council.ts` (`drawNpcSlate`, `npcsStanding`, `freezeList`, `wardVote`) · `packages/rules/src/capitalCount.ts` (`npcFill`) · `COUNCIL.slateSize` 9, `npcJitter` 2; `CAPITAL_COUNCIL.npcPerFaction` 2 in `constants.ts`
- Server: `apps/server/src/services/ruleBallot.ts` (`secretaryCard`, `homeFill`, `termRule`)
- Data: content `packages/content/src/data/candidates.ts` (57 locals: 27 home, 30 capital; each home local's `rule`) · `packages/content/src/data/factions.ts` (`secretary`, `branchMotion`, the default rule) · locals hold `officeTerms` rows like players (`holder.kind: 'npc'`)

## Status

- **Built:** home slates (slice 3), capital slates (slice 4), the *Local candidate* marking (review 3), the locals' rules on the ballot (voting rework, 12 Oct 2026), the secretaries' orders and default rules.
- **Designed, not built (slice 7):** local deputies, the party's own figures, a local Governor, Clearwater's slate, the secretary on the Chair's ballot and tabling bills.

## Decisions

- **NPCs are marked, and the marking is explained** (Appendix C #3, closed); *local* became *Local candidate* in review 3 so it can't read as *from here*.
- **Locals never vote; each home local carries a rule** (voting rework, 10 Oct 2026).
- **The secretaries table bills** (Appendix C #66).
- Appendix C #44 (*nine names in a branch of one*) closed 10 Oct 2026 by the voting rework.

## Open questions / drift

> [!warning] Drift
> GDD §15.10 says the locals' rules live in **`people.ts`**; they are in `packages/content/src/data/candidates.ts` (`people.ts` has none).

- Appendix C #22 (the ward-vote weights) is revised for the voting rework but stays a retune lever after playtests.

## Related

[[City Council and the Rule Vote]] · [[Offices]] · [[National Elections]] · [[The Legislature and Laws]] · [[Party Orders]] · [[Local Standing]] · [[People of Irongate]] · [[Iron Vanguard]] · [[Red Collective]] · [[Civic Alliance]]
