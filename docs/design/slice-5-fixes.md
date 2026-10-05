# Slice 5 — QA fixes: the designer's decisions (5 Oct 2026)

Game designer, 5 Oct 2026. Answers to the rules and player-text points in `docs/qa/slice-5-report.md` (m1–m7, the §7 wording calls, the §5 nits that are text or rules, the §4 ambiguities). Each point is a decision, a reason, and the exact strings and ids to paste. The GDD edits are in §12; the design documents (`slice-5-risk.md`, `slice-5-screens.md`) carry the same rules where they belong.

**Applied by the designer in this change** (content texts the word-for-word tests read, and the design tables): the seven shortened briefings and the rally briefing's *constable* (§2), the Ashford blurb (§1), the opponent lines and the two *marks* (§8), the design rules in §4, §9, §10 and §11. **For the developer:** M1, m8, m9, n2, n3, n5 (not mine) and every `copy.ts` string, layout and server change below. Where a design table is read by a test, change the table and the content in the same commit.

---

## 1. m1 — the kicker and the blurb

**Decision.** `KIND_LABELS.hospital` → **Infirmary**; `KIND_LABELS.jail` → **Police** (the kind, so *10 · POLICE* beside *Harbour Police*, *Lock-up*, *Police Station*; *Police station* would double the Ashford name). The County Infirmary's blurb (`ashford.infirmary`):

> The county infirmary in its walled garden: long wards, a porter's lodge, and a queue of visitors at two with flowers from the market.

Applied in `slice-5-risk.md` §2.3; the developer changes `ashford.ts` and `copy.ts` and drops the two markers. The vocabulary sweep should read `kindLabel` and the place blurbs.

## 2. m2 and m3 — the briefings and the ticket

**Decision (m2): both.** The briefing cap is **300 characters** (was 380 in the build; the schema's 240 was never the briefings' bound), and the seven briefings over it are shortened below; the developer also makes the sheet **80 dvh on phones under 700 px tall**, so the title, the text and the first two rows sit above the button at 375 × 667 and 360 × 640 with a 300-character text. Why both: a 342-character briefing is six lines on a phone before the rows start, and the ways are the choice; the text is scenery.

| Id | Briefing (≤ 300, four sentences) |
|---|---|
| `coalport.union-hall.spike` | The Collective's duplicator runs in the back room of the Union Hall at night, and five hundred flyers come out of it by morning. The yard wall is low, the caretaker's round is at eleven, and a tradesman with a box of parts walks in at the front door. One bent drum and the branch is quiet for a week. |
| `duskwall.rampart-row.street-meeting` | The Vanguard holds its street meeting on Rampart Row at seven: fifty people in the road, a steward at each end and the organiser's man on a chair with the lists. The corner lamp is the only light, the back entries are open, and the one question the man on the chair can't answer is about the ration. |
| `duskwall.beacon-house.spike` | The Vanguard's duplicator runs in the basement of Beacon House every night, and five hundred sheets come out of it by morning. The yard wall is high, the doorman's round is at eleven, and a tradesman with a box of parts walks in at the side door. One bent drum and the district is quiet for a week. |
| `ashford.wharf.watch` | The wharf closes at six and the lock-keeper at eight. After that the barges below the bridge are nobody's business, and what comes off them goes up the towpath without a toll. There's the boat club verandah with a view of the lock, and the towpath, closer, with the police on it twice a night. |
| `ashford.assembly-rooms.spike` | The Alliance's duplicator runs in the committee room at the Assembly Rooms at night, and five hundred sheets are out by morning. The railings are low, the porter's round is at eleven, and a tradesman with a box of parts walks in at the side door. One bent drum and the Rooms are quiet for a week. |
| `irongate.grand-hotel.lobby-watch` | The Grand's lobby is where deputies dine and lobbyists wait, and after midnight it is where the ones who don't want to be seen together are seen together. There's an armchair behind the palms with a view of the lift, and a hall porter who knows every face in the capital. |
| `irongate.station-buffet.meeting` | The party leading this district holds its night meeting in the Buffet's back room at midnight: thirty porters and tram crews, a committee man on a chair with the lists. The fuse box is behind the counter, the yard door is on the latch, and the question the chair can't answer is about the fare. |

The loader's briefing bound becomes 300 (`StoryText` stays 240 for everything else).

**Decision (m3): layout, with one copy change.** The tags line carries **the type label and the odds word only** (Oswald caps 10 px, as specified); every other tag (*First day…*, the Issue, *Close race*, *Rival ground*, the record tag, *Party order*) goes on **a second line of chips** that exists only when there is one; the risk line is its own row. The rule in screens §10 becomes: **title (at most two lines) + type and odds (one) + chips (one, when any) + the risk line (one)**, so a ticket is four lines and five with a two-line title. The record tag reads the level word (§9.1 below).

## 3. m4 — the run-in's reason line

**Confirmed:** the run-in block's reason uses the mission modal's reason lines with the city's training places, exactly as a mission's own: *Your Agility is low for this. Raise it at Harbour Quays.* (the place is the city's training action for that stat, the Me tab's lookup); Charisma: *This needs Charisma, and yours is low. It comes from what you wear.*; a fight lost: the `power` line, which names no place. The gate passes `trainingPlaces` as `city.tsx` builds them.

## 4. m5 — the first-time record cards

**Rule.** A card shows on **each first crossing into a level** (*On file*, *Repeat offender*, *Notorious*), the Heat cards' pattern; the fade clause is printed **only when every live mark is minor**. Strings (`copy.risk.recordCard` becomes a function of the level, the live mark count and whether all are minor; `{marksLine}` as the paper's: *One mark*, *Two marks*, *Three marks*…):

| Case | Card |
|---|---|
| On file, all minor | *ON FILE · {marksLine}. {It fades\|They fade} in a fortnight if there's no more; Iron from missions is down a tenth until then.* |
| On file, not all minor (theft: two marks) | *ON FILE · {marksLine}, and they don't fade. Iron from missions is down a tenth; 30 Political Capital strikes one off.* |
| Repeat offender, all minor | *REPEAT OFFENDER · {marksLine}. Iron from missions is down a fifth and the police look harder at you. They fade in a fortnight if there's no more.* |
| Repeat offender, not all minor | *REPEAT OFFENDER · {marksLine}. Iron from missions is down a fifth and the police look harder at you. These don't fade; 30 Political Capital strikes one off.* |
| Notorious | *NOTORIOUS · {marksLine}. Iron from missions is down a third, bail is doubled, and the courts, the colleges and the Alliance's halls are shut to you. 30 Political Capital strikes one off.* |

QA's case (a first offence of three serious marks) reads *The police took your name · 3 marks · Repeat offender* and then the fourth row. Applied to screens §11.

## 5. m6 — *down to 25*

**Decision: the copy, not the rule.** The cells leave everyone at 25 (GDD §19.2, "whatever it was"): one rule, and a *Cool* player who lost to the police has been noticed, which is what 25 says. The release body: ***Heat is 25 and the duty officer has your page. He says mind how you go.*** (`released.body`); the knock-on *Heat 0 → 25 · Noticed* then reads true. Applied to screens §6.

## 6. m7 — rival ground on short phones

**Decision.** The plate's **pressure line stays visible at every size** (*Your work here draws from the Vanguard's morale · 1.3 of 2.0 points left today*): it is a rule the design promises before the tap. Under 700 px tall the plate may fold the **morale line and the Heat line** instead (the HUD shows Heat; the share is on the Election card). *Your orders are in Coalport today* is the orders panel's line and folds with the panel. Applied to screens §8.3.

## 7. §7's wording calls

### 7.1 The record tag

**Decision: the level word.** `copy.risk.recordTag(level, pct)` → ***On file · −10 % Iron***, ***Repeat offender · −20 % Iron***, ***Notorious · −30 % Iron***. Reason: in the tag run it is a state, like *Close race*, and the word is the one on the Me tab.

### 7.2 The risk line

**Decision: break only at the dots.** Each segment (*Heat +24*, *Dangerous*, *if caught, three marks on your record*) is non-breaking (`white-space: nowrap` per segment, the row's height growing with a wrap, which fixes n1); the longest segment is 37 characters, under a 360 px line at 11 px Courier. The phrase stays *if caught, a mark on your record*: *if caught: three marks* drops the thing the mark is on.

### 7.3 The run-in *did* sentences

**Rule.** The opponent's **pronoun is content**: `opponents[].pronoun: 'he' | 'they'` (the strike picket *they*, the five others *he*). The *did* line is **one sentence for a straight row, two for a failed row and its fight, and one merged sentence when luck chose**. The full set (`copy.risk.did`, `{he}` = *he* / *they*, verbs agree: *was* / *were*, *wasn't* / *weren't*, *pocketed*):

| Case | Line |
|---|---|
| fight, won | You fought and won. |
| fight, lost | You fought and lost. |
| run, ok | You ran. |
| run, failed → fight won | You tried to run; {he} {was} faster. You fought and won. |
| run, failed → fight lost | You tried to run; {he} {was} faster. You fought and lost. |
| talk, ok | You talked your way out. |
| talk, failed → won / lost | You tried to talk; {he} {wasn't} having it. You fought and {won\|lost}. |
| pay, ok | You paid {him\|them} off. |
| pay, failed → won / lost | You paid; {he} pocketed it and came at you anyway. You fought and {won\|lost}. |
| luck · fight | Luck chose to fight, and you {won\|lost}. |
| luck · run, ok | Luck chose to run, and you got away. |
| luck · run, failed | Luck chose to run; {he} {was} faster, and you {won\|lost} the fight. |
| luck · talk, ok | Luck chose to talk, and {he} let you go. |
| luck · talk, failed | Luck chose to talk; {he} {wasn't} having it, and you {won\|lost} the fight. |
| auto (unanswered) | as the luck lines, prefixed ***You didn't answer, so*** with *luck* in lower case: *You didn't answer, so luck chose to run; he was faster, and you lost the fight.* |

Luck never pays, so there is no luck · pay line. The opponent's own line (content) follows as now. `didLine(by, steps, pronoun)` replaces the draft's concatenation; the longest line is three sentences.

## 8. The nits that are text or rules (§5)

| # | Decision | Strings |
|---|---|---|
| n4 | The receipt's opinion row prints points, never a `%`: ***−0.20***; the Party XP part reads lower-case and joined as the other parts: *+6 · rival ground +3* | `copy.risk.parts.rivalGround` as is; the row's joiner is the receipt's *·* |
| n6 | ***Won at full strength* is judged when the run-in began**, before any row: a failed Run's damage does not lose it (you walked in whole). Code as built; the design says so | design §10.3 |
| n7 | Money is **Iron** in every line. The constable's paid line: *The notebook closes. "Mind how you go." Three hundred Iron is the going rate.*; the checkpoint's *Pay the lamp*: *Thirty Iron folded under the card, and the card comes back without the Iron and without a word…* | `opponents.ts`, `journeyEvents.ts`; design §10.6, §11.4 (applied) |
| n8 | The lines follow the pictures. Enforcer, appears: *A man in a flat cap steps off the kerb and asks what party you're with. He knows.* Picket, appears: *Three men come off the gate, one with a placard. "You're not from the branch."*; talked: *"I'm from the capital," you say, with the right accent, and the picket lets you through.* | `opponents.ts`; design §10.6 (applied); the chapter's *man in the good coat* (design §13) is a different man and stays |
| n10 | Health max is **100 at Level 1 and +5 for every level gained** (125 at 6, 145 at 10): the code is right; the GDD, design §9.1 and the ADR's *100 + 5 × Level* are reworded | GDD §6.1; design §9.1 (applied) |
| n11 | *a policeman who looks bored* → ***a constable who looks bored*** (`irongate.forecourt.rally`); *Lift the district roll* stays (*roll* is a register) | design §5.4 (applied) |
| n12 | The run-in rows' luck reason is by the row's band and never says *Try again*: *Good odds*: *Bad luck. The odds were good; it just didn't come off.*; *Fair odds*: *The odds were only fair.*; a *Long shot*: the stat line as now. The cap line (*The town has had enough today · no opinion*) is **its own row** under the tags, Courier, as screens §8.3 says | `copy.ts` reason lines (new `runIn` variants); `Missions.tsx` |

## 9. The deviations QA saw (accepted or not)

- **An Energy-short mission ticket** keeps its disabled button with *Needs 10 Energy · ready at 12:22* under it: **accepted** (the tier-1 tickets' form; one rule for every ticket). Screens §4.1 reworded.
- **The record lock at a court** (greyed buttons, *Not with your record* under each ticket): **accepted** for the same reason; the line is the reason slot's.
- **A later-edition teaser** must read its §2.3 teaser line (*Opens with a later edition · The station, the coal yards and the tram sheds.*), never the blurb: the developer wires `teaser`, not `blurb`, into the sheet's lock line.
- **Briefings** are bounded at 300 (§2).

## 10. The §4 ambiguities

- **A named target on rival ground.** A mission keeps its named target wherever it is played: an Alliance visitor tearing down the Vanguard's posters in Coalport hits the Vanguard (the third party there), **uncapped** (its share is small and the §14.2 floors hold); a mission or a tap whose target is the **home faction** (persuasion there, or a named target that is the home party) draws from it under the 2-point cap. Added to design §11.2.
- **The caught check after a failed *Pay them off*** counts the +10 (the attention you just drew, §6.2's rule): code as built; added to design §7.1.

## 11. Not mine

M1 (the double start; the architect's ADR 0032 reasoning to correct), m8 (focus), m9 (the Me tab's Heat target), n2, n3 (dev panel), n5 (pin overlays, allowed by review 3).

## 12. Where each rule now lives

| Point | GDD | Design |
|---|---|---|
| m1 kind labels, the blurb | — | `slice-5-risk.md` §2.3; `slice-5-screens.md` §1 (already bans the words) |
| m2 briefings ≤ 300; the sheet on short phones | — | `slice-5-risk.md` §4.4, §5 (texts); `slice-5-screens.md` §4.2, §10 |
| m3 the ticket's lines | — | `slice-5-screens.md` §4.1, §10 |
| m4 the reason line | — | `slice-5-screens.md` §4.3 (unchanged; confirmed) |
| m5 the record cards | — | `slice-5-screens.md` §4.3, §11 |
| m6 the release body | §19.2 unchanged | `slice-5-screens.md` §6 |
| m7 the plate on short phones | — | `slice-5-screens.md` §8.3, §10 |
| §7.1 the record tag · §7.2 the risk line · §7.3 the did lines | — | `slice-5-screens.md` §4.1, §4.3, §11; `slice-5-risk.md` §10.2 (pronoun) |
| n6 full strength at the start | §20 | `slice-5-risk.md` §10.3 |
| n7, n8 opponent and card lines | — | `slice-5-risk.md` §10.6, §11.4 |
| n10 Health max | §6.1 | `slice-5-risk.md` §9.1 |
| §10 the named target · the failed pay's +10 | §14.12, §11.2 | `slice-5-risk.md` §11.2, §7.1 |

**Economy:** nothing moves. No rate, cost, odds or threshold changes; the briefing cap and the layout are words and pixels.
