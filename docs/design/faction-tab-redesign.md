# The Faction tab: research and three redesigns (review 7)

Game designer, 15 Oct 2026. The user's Design Review 4 note on slice 6 (`docs/review/2026-10-15-review-7.md` #1): *the Faction tab is black on black, you can't tell the tabs apart; it needs a major rework, maybe a background image.* This is the research and three directions for the user to pick from. The mock-ups are `docs/design/faction-tab-redesign.html` (open it from the repo; it uses the built art by relative path and the game's fonts from Google Fonts). Nothing here is built; the pick becomes the slice-6 fix round's spec and a §2 rewrite of `slice-6-screens.md`.

---

## 1. What is wrong now

Measured on the slice-6 screenshots (`docs/qa/slice-6/faction-events.png`, `chat-phone.png`) and the code (`apps/client/src/routes/faction.tsx`, `packages/ui/src/components/FactionTabs.tsx`, `Chat.tsx`).

1. **Three ink bands stacked, four on Chat.** The HUD (ink, ~92 px), the faction header (ink, ~110 px) and the tab strip (ink, 44 px) sit on top of each other with no paper between them: about 250 px of black before the first line of content on a 390 × 844 phone, 300 px on Chat where the channel strip is a fourth ink band. The eye reads one black block with white words in it. Every other screen in the game is paper from the HUD down; this one is the exception, and it is the one with five sections to tell apart.
2. **The unselected tabs cannot be told apart.** The four unselected cells are ink (`#15181a`) separated by 1 px of ink-2 (`#3a4043`): **1.69:1**, well under the 3:1 floor WCAG 1.4.11 sets for a component's boundary. On a phone at normal brightness the dividers vanish and the strip reads as one bar with five words on it. The header band above is the same ink, so the strip has no top edge either.
3. **The selected tab is the only cue, and it is colour alone.** The current cell is paper on ink. That is high contrast (14:1), but it is a single cue (a fill), and because the content under it is also paper the selected cell reads as a hole in the black rather than a tab in front of its panel. There is no weight change, no bar, no shape change.
4. **No art, and the crest reads as a badge.** The slice-6 spec (§2) asked for *the faction's HQ scene cropped behind an ink band*; the build has a plain ink band. The crest is the real SVG (good), but it sits in a 56 px paper disc that reads as an avatar circle, smaller than the name beside it; on the Vanguard and the Alliance the square and triangle crests sit in the same round disc.
5. **The labels are small.** 10.5 px Oswald with reduced tracking at 360–390 px, to fit *Scoreboard*; on the desktop the same five labels are stretched across 1000 px with a 500 px paper slab for the selected one.
6. **The header repeats the HUD.** *Organiser* is in the HUD's name line and again in the header line.

What is not wrong: the parts themselves (Orders, Events, Members, Scoreboard, Chat) and their rows work and passed QA; the paper chips (*This week · All time*, the time chips) are the game's existing idiom for a selected state on paper and are fine. The redesign is the frame: the header, the strip and where chat sits.

---

## 2. Research: eight findings

1. **A selected tab needs at least two cues, and never a thin or low-contrast one.** NN/g's *Tabs, Used Right*: "Prominently highlight the selected tab", "Use at least two selection indicators", "Do not use thin, single-pixel strokes or poor-contrast colors", and connect the selected tab to its panel by proximity and a shared fill, with the tab list above the panel. Labels of one or two words; the fewer tabs the better; one row only. [nngroup.com](https://www.nngroup.com/articles/tabs-used-right/)
2. **3:1 for the parts of a control you need to see; colour never the only means.** WCAG 2.2 SC 1.4.11: visual information needed to identify a control and its state (selected, focused) must reach 3:1 against adjacent colours; a boundary is only required when nothing else shows the control is there, and "non-text information within controls that uses a change of hue alone" fails Use of Colour. Our 1.69:1 dividers fail this; a paper-2 fill on paper (1.16:1) could never pass it, which is why a fill alone cannot be the selected cue on paper. [w3.org](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) · [NICE design system: tabs](https://design-system.nice.org.uk/components/tabs/) ("colour is not used as the only visual means")
3. **Material's tabs put a 2–3 px active bar on a divider at the bottom of the row**, with primary tabs at the top of the content pane under the app bar and a fixed (equal-width) row when the labels fit, scrollable only when they do not. The bar sits where the tab meets its panel, which is NN/g's proximity rule made concrete. [m3.material.io](https://m3.material.io/components/tabs/guidelines) · [Android TabRow reference](https://developer.android.com/reference/kotlin/androidx/compose/material3/TabRow.composable)
4. **Apple's segmented control is about five segments on a phone, equal widths, text or icons but not both**, for closely related views of one thing. Five is our count; four fits more comfortably at 390 px with full-size labels. [developer.apple.com](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)
5. **Text over art needs a scrim, a box or copy space, measured at the worst spot.** Smashing Magazine's text-over-images series: a scrim or gradient behind the text, or a solid strip, or placing the text in the least busy area; 4.5:1 for body text and 3:1 for large text, measured where the image is lightest under light text. Our three HQ scenes are teal and dark with a bright window in each; paper text over them needs an ink scrim of 85 %+ at the text line, or the text goes on paper under the art. [smashingmagazine.com](https://www.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/)
6. **Clash of Clans (Oct 2026 interface rework) keeps chat as one persistent anchor with the channels inside it, and puts clan war as a card inside clan chat**, with a dedicated button only while a war is on. Principle to borrow: chat is a room you can always reach, and the branch's event belongs in the room as a card with a button, not only on a board. (Our system lines with *Join* already do this.) [supercell.com](https://supercell.com/en/games/clashofclans/blog/news/weve-revamped-the-clash-of-clans-user-interface/)
7. **Newspaper apps use a section ribbon under a masthead**, swipeable, with the bottom bar unchanged; Google News and SmartNews use a chip row under the top bar. A section strip on paper under a masthead is the newspaper idiom, which is the game's idiom. [fastcompany.com](https://www.fastcompany.com/91199198/the-new-york-times-app-redesign) · [androidauthority.com](https://www.androidauthority.com/google-news-home-tabs-redesign-3502968)
8. **On content-heavy pages let the hero scroll away and keep the tabs**; 44 px targets; off-screen tabs need a visible cue if the row scrolls. [uxcel: tabs on scroll](https://app.uxcel.com/courses/ui-components-best-practices/navigation-best-practices-771/define-tabs-behavior-on-content-scroll-3094)

Guild hubs in mobile strategy games (Rise of Kingdoms, Clash Royale) were checked but add nothing beyond #6: a banner with the emblem and name, a member list, a chat reachable from anywhere. We borrow the principles, not the screens.

### Measured contrast of the tokens (`packages/ui/src/tokens.css`)

| Pair | Ratio | Use |
|---|---|---|
| ink vs ink-2 | 1.69:1 | **fails** as a tab divider |
| paper vs ink | 14.4:1 | the selected bar, text |
| paper-2 vs paper | 1.16:1 | a fill, never the only cue |
| paper-card vs paper | 1.09:1 | the same |
| muted on paper | 5.9:1 | unselected labels |
| faint rule on paper | 2.5:1 | decorative dividers only |
| Collective red on paper | 6.8:1 | can be an accent line |
| Alliance slate on paper | 4.1:1 | can be an accent line |
| Vanguard ochre on paper | 2.1:1 | **cannot** carry state; ink does |

So in every direction the selected marker is **ink**; the faction's colour is a second, thinner line under it, never the cue on its own.

---

## 3. Principles for the redesign

- **Paper from the HUD down**, as every other screen. The only ink below the HUD is the art plate and the buttons.
- **The HQ scene is the header art** (`scene.union-hq` / `scene.vanguard-office` / `scene.alliance-hq`, already built at 640 and 1280). Text over it sits on an ink scrim measured at the window, or on paper beneath it.
- **The crest is the real SVG** (`crest.{faction}.svg`), 56–80 px, shown as a seal: its own shape, a paper edge and an ink keyline, no paper disc behind a square or a triangle.
- **The current part carries three cues**: weight, a fill, and a 3 px ink bar (or an inverted cell). Unselected parts have a visible boundary at 3:1 or a label at 4.5:1.
- **One row, one tap.** Five labels fit at 11 px Oswald in five 78 px cells at 390; no scrolling tab row.
- **Chat is never a second ink strip.** Its channels are the game's paper chips.
- **The strip stays, the art goes**: the plate scrolls away with the content; the strip is sticky under the HUD.

---

## 4. The three directions

### A · The Branch Office (recommended)

*A letterhead: the HQ scene as a plate, the crest as a seal over its edge, the name on paper, and a ruled strip of five.*

- **Header.** The HQ scene as a full-width plate, 128 px on a phone, 180 px on desktop, 1 px ink edge, 92 % opacity on ink. An ink gradient over its bottom 48 % carries one caps line at the bottom left: *COALPORT BRANCH · 9 HERE NOW* (paper on ink, 14:1 at the scrim; the window in each scene is above the scrim). Under the plate a 52 px letterhead row on paper: the name in Playfair 22 px ink, the Courier line *Organiser · 9 members* under it. (The rank title stays because this line is about the member's standing in the branch; the HUD's is their Level line. If the user wants it gone, the line reads *9 members · Coalport branch*.)
- **Crest.** The real SVG at 64 px (80 on desktop), overlapping the plate's bottom edge at the left by half its height, with a 2 px paper edge, a 1 px ink keyline and a soft shadow, like a seal pressed over a photograph. Its own shape: the Collective's disc, the Vanguard's square, the Alliance's triangle each read as what they are.
- **The strip.** Five equal cells, 44 px, on paper, a 1 px ink rule under the row and 1 px faint rules between cells (decorative; the labels at 5.9:1 identify the cells). Labels Oswald 11 px caps in `muted`. **The current cell:** ink text at weight 600, a paper-card fill, and a 3 px ink bar along its bottom that sits on the row's rule and touches the panel, with a 2 px line in the faction's colour just above the bar (the accent, never the cue). Three cues; the bar is 14:1. An unread dot (failure red, 6 px) after the label of Events or Chat as now. `aria-current="page"`; focus ring in petrol.
- **How each part starts.** *Orders:* the secretary's portrait and today's line, the three orders, then *THE BRANCH'S EVENT TODAY* (as built). *Events:* **Call an event** (or the Courier gate line), then *HERE · COALPORT* (as built). *Members:* a Courier summary line *9 members · 9 here now · 1 in the cells* above *Find a member* (new; the only content change), then the rows. *Scoreboard:* the period chips, the city chips, the kicker (as built). *Chat:* see below.
- **Chat on a phone.** The fifth cell. On Chat the plate and letterhead fold to one 52 px **compact letterhead** (crest 32 px, the name in Playfair 18, at the right in Courier *Coalport branch · 5 here*) so the lines get the screen; the channels are three paper chips (*Party · Coalport branch · Irongate branch*, the current one ink-filled, the existing `Chip`); the *n here · channel* line; the lines; the composer pinned above the tab bar. Nothing between the HUD and the composer is ink.
- **Phone, 390 × 844.** HUD 92 + plate 128 + letterhead 52 + strip 44 = 316 px before the panel; on Events the **Call an event** button and the whole first `EventCard` sit above the fold with 250 px to spare; on Members the summary, the search and three rows; on Chat (compact header) the chips, five lines and the composer. At 360 wide the labels keep 11 px (*Scoreboard* is 62 px in a 72 px cell).
- **Desktop (≥ 1024).** On the 720 px sheet of review 4: the plate at 180 px, the crest at 80 px, the letterhead; then the two columns as built, the left with four strip cells of 150 px **left-aligned, not stretched**, and the room as the 360 px right column under a paper-2 head band *THE ROOM · Coalport branch · 5 here* with the chips below it.
- **Cost.** 316 px of header on first open is more than now (250), but half of it is art and all of it scrolls away. The plate is a second copy of the scene the member sees on the HQ's place sheet; that is the point.

### B · The Noticeboard

*No tabs at the first level: a masthead and five notices pinned to a board, each with one live line; a part opens as its own screen.*

- **Header.** The HQ scene as a 150 px masthead with the crest (56 px, real SVG, paper keyline) and the name in Playfair 24 paper over an ink scrim (92 % at the text line), the Courier line in `dim` (8.3:1 on ink) under it: *Organiser · 9 members · 9 here now · Coalport branch*.
- **The board.** A 2 × 2 grid of notices on paper-card with 1.5 px ink borders and a pin, then a full-width notice for the room. Each notice: a caps title on a rule, one Playfair line that is the thing that matters now, one Courier line under it, and where there is one thing to do, its word in petrol (*Join*, *bail 150*). *ORDERS · 2 of 3 carried out · Talk to the workers at the Mill Gate · 1 of 2* · *EVENTS · Canvass Drive, 19:40 · Foundry Row · 1 of 4 roles · Join* · *MEMBERS · 9 here now · of 9 · Jan Sorel in the cells · bail 150* · *SCOREBOARD · You're 4th this week · Mira Hale leads · +3.1 moved* · *THE ROOM · Coalport branch · 5 here* with the last two lines, the composer and **Open the room**. One tap on a notice opens the part.
- **The parts** open as sub-screens (`/faction/orders` …): a 52 px row with a back arrow, the part's name in Playfair 18, the small crest at the right; the part's content as built below. Selected state does not arise: the screen's title is the part.
- **Chat.** The room's notice is the board's foot, with the composer in it so a one-line reply needs no second screen; **Open the room** opens the full chat screen. Unread lines put the dot on the room's title and on the Faction tab.
- **Phone.** The masthead and the four notices fit above the fold (HUD 92 + 150 + 2 × 108 + gaps = ~480 px); the room's notice needs one scroll. **Desktop:** the masthead, the four notices in a row, the room as the right column as built; the notices open the part in the left column (so on desktop B becomes A with cards for tabs).
- **Cost.** Every part is one tap further than in A or C; the board must be scrolled past to reach the room on a phone; the live lines are five more server reads on the hub (cheap, but new). Its strength is that it scales: a sixth part (the season in slice 8, a treasury later) is a sixth notice, not a sixth 65 px cell.

### C · The Masthead and the Room

*The slice-6 spec's intent done properly: the scene behind the name on a scrim; four parts as a segmented control; chat is a room you raise from anywhere.*

- **Header.** The HQ scene as a 156 px masthead; an ink scrim from 94 % at the bottom to clear at the top; the crest (56 px, real SVG, paper keyline) and the name in Playfair 24 paper at the bottom left; the Courier line in `dim`. At the bottom right a 44 px outlined **Room** button (a speech-bubble icon over the word, paper keyline on the scrim) carrying the unread dot.
- **The control.** Four equal cells (Orders · Events · Members · Scoreboard) as outlined paper cells with 1.5 px ink borders and 6 px gaps, 44 px tall, Oswald 11 px. **The current cell** is inverted (ink fill, paper text at 600) with a paper keyline inset 1.5 px, so it is a different shape as well as a different colour. Every cell has a 14:1 boundary. Four labels at full size fit at 360 px.
- **Chat.** Not a cell. **Room** raises a bottom sheet (76 % of the height, the existing `BottomSheet` curve) over whatever part is open, with the part dimmed behind: a head row *THE ROOM · Coalport branch · 5 here · ×*, the paper chips, the lines, the composer. Closing returns to the part where it was. A system line with a button (*Join*, *Post bail*) acts from the sheet; opening an event page closes the sheet. On desktop the Room button disappears and chat is the right column as built.
- **How each part starts:** as A, with the members' summary line.
- **Phone.** HUD 92 + masthead 156 + control 64 = 312 px before the panel; the same above-the-fold as A. **Desktop:** the masthead across the sheet, the four cells left-aligned, the room column.
- **Cost.** Chat loses its tab: a member who lives in the chat opens a sheet every visit (one tap, but a sheet), and the sheet hides the part it was raised over. The name over art depends on the scrim at the window in each scene (the Alliance's is the brightest; at 94 % it passes). Its strength: four parts breathe at 390 px, and the room is reachable from Orders or Members without leaving them.

---

## 5. Recommendation and defaults

**Build A, The Branch Office.** It fixes every item in §1 with the fewest new ideas: the tab is paper like the rest of the game, the strip is a newspaper section rule with a three-cue selected state, the scene is a lithograph plate rather than a backdrop for text (so no scrim arithmetic at the window), the crest is a seal, and chat keeps its tab and its one-tap channels. It keeps the slice-6 routes, the `tab` search param, the session memory and the desktop columns; it is a `FactionTabs` and header rewrite plus a compact header state on Chat, not a new information architecture. B is the fallback if the user wants a hub feel or expects more parts; C is the choice if the user wants chat reachable from inside every part on a phone.

Defaults where the user has not said:

- **The plate scrolls away; the strip is sticky** under the HUD (finding #8). On Chat the header is the compact letterhead and does not scroll.
- **The strip's labels stay words only**, no icons (NN/g, Apple: not both).
- **The faction colour** is the 2 px accent line under the selected bar, the crest, and the avatar rings. Nothing else on the tab is coloured by faction.
- **Unread dots** stay as built (events result waiting; a chat line for you), 6 px failure red after the label, `aria-label="new"`.
- **The header line** keeps the rank title. The *here now* count moves to the plate's caps line with the branch's city.
- **The Vanguard's plate** is `scene.vanguard-office` (the blank ochre banner on its wall is a plain cloth, no device; checked). The Alliance's is `scene.alliance-hq`, the Collective's `scene.union-hq`. No new art.
- **Phone held sideways** (`short:`): the plate is dropped, the compact letterhead is used on every part.
- **The first visit opens Events**, as now.

What A changes for the build (for the architect's note): `FactionTabs` (paper strip, three-cue state, left-aligned on desktop), the header in `routes/faction.tsx` (plate + letterhead + compact state; `Picture` with the HQ scene asset from `faction.hq`, which needs the scene id on the view), `ChatPanel`'s channel strip to `Chip`s, the desktop chat column's head band, the members' summary line (one count the `members` query already returns plus the cells count). Playwright: `faction-tabs` selected state asserts `aria-current` and the bar class; the QA screenshots are retaken.

---

## 6. Strings (new or changed, for `copy.ts`)

All directions: *{City} branch · {n} here now* (the plate's caps line) · *{rank} · {n} members* (the letterhead line) · *{n} members · {m} here now* · *{n} members · {m} here now · {k} in the cells* (the members' summary; the third part only when k > 0) · *The room* (the chat column's and sheet's head; the Chat cell keeps *Chat*).

B only: *Orders* · *{k} of 3 carried out* · *{order} · {done} of {n}* · *{event}, {time}* · *{venue} · {filled} of {roles} roles* · *{n} here now* · *of {total}* · *{name} in the cells · bail {iron}* · *You're {ordinal} this week* · *Nobody has moved yet* · *{name} leads · +{moved} moved* · *The room · {channel} · {n} here* · *Open the room* · *Back*.

C only: *Room* (the masthead button) · *The room · {channel} · {n} here* (the sheet's head).

Everything else on the tab keeps the slice-6 strings (screens §11).

---

## 7. Open for the user

1. **Which direction** (A recommended).
2. In A, does the letterhead keep the rank title, or read *{n} members · {city} branch*?
3. Should the plate collapse on scroll on every part (as proposed) or stay as a 52 px letterhead at all times?

The pick goes to `slice-6-screens.md` §2 as a rewrite, to the wiki's Faction/Together page and the Decision Log, and to the fix round.
