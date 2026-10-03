# Art wiring, October 2026: fourteen scenes and twelve faces

Game designer, 3 Oct 2026. The main session painted fourteen new location scenes and twelve new faces (`E:\Projects\ironGateCity Docs\art-direction\mvp\scenes\` and `mvp\avatars\`). Nothing here is wired yet: the developer adds the entries to `packages/content/src/data/art.ts` **after slice 4** (ADR 0007, ADR 0015), runs `pnpm art:build`, and the loader's cross-checks do the rest. This note is the content mapping: ids, bindings, alt texts, the sign-up order, and the content-policy read of every picture.

Every scene is 2688 × 1520 like the four slice-1 scenes (`widths: [640, 1280]`); every face is 880 × 1168 like the six slice-2 faces (the 4:5 crop `{ left: 60, top, width: 760, height: 950 }`, `widths: [128, 256]`). Alt texts are plain, at most 160 characters, and say what is drawn (GDD §13.5; the schema's limit).

## 1. Scenes

The §13.5 fallback ladder is unchanged: a location shows the scene bound to its **kind** (and faction, for an HQ), else a crop of the city map. These fourteen fill every kind the four cities use except `jail` (slice 5), `hospital` (slice 5, `hospital.png` exists and is reviewed then) and `parliament` (`parliament.png` exists; Parliament's actions are a gallery and a lobby, and the painting is the chamber, so it is held until an action is set in the chamber). One `SceneBinding` per row of this table; the asset id is `scene.<file>`.

| File | Asset id | Binding (`locationKind`, `factionId`) | Shows at (today's content and Irongate) | Alt text |
|---|---|---|---|---|
| `factory-gate.png` | `scene.factory-gate` | `factory-gate` | Coalport Mill Gate; Irongate the Ironworks Gate | A works gate at the shift change: men in caps streaming out under the clock, a tram waiting, a man handing a flyer to a woman in a red coat. |
| `docks.png` | `scene.docks` | `docks` | Coalport Harbour Quays; Irongate Riverside Quays | Dockers eating on the bollards at the water's edge, sacks and a crane behind them, a steamer and a tug on the harbour. |
| `market.png` | `scene.market` | `market` | Coalport Market Row, Duskwall Customs Market, Ashford Bridge Street; Irongate Market Square | A market under striped awnings round a stone column: a fish stall, bread and bootlaces, shoppers with baskets, a tram passing behind. |
| `station.png` | `scene.station` | `station` | Duskwall Goods Yard; Irongate Central Station | Inside a glass-roofed station: the departure board and clock, porters with trunks on trolleys, passengers in coats, a locomotive letting off steam. |
| `street.png` | `scene.street` | `street` | Coalport Foundry Row, Duskwall Rampart Row, Ashford Weavers' Row; Irongate's seven streets | A terraced street of brick houses: a woman with a flyer at a doorstep, washing on the lines, children playing football on the cobbles. |
| `square.png` | `scene.square` | `square` | Irongate the Forecourt, Basilica Square, Tram Junction, the Iron Bridge, the Esplanade | A speaker on a box on the steps of a church, a crowd in hats listening, a bandstand and trees behind them. |
| `hotel.png` | `scene.hotel` | `hotel` | Irongate the Grand Hotel | A grand hotel lobby: marble columns and a chandelier, a man reading a paper in an armchair, two men talking over a low table, the desk clerk beyond. |
| `court.png` | `scene.court` | `court` | Ashford's The Courts; Irongate the Supreme Court | A courtroom: three judges on the bench, counsel in gowns at the tables, a witness in the box, the public benches full. |
| `university.png` | `scene.university` | `university` | Ashford's University Quad | Students with books crossing a college quad in autumn, a green dome and a cloister behind the trees. |
| `library.png` | `scene.library` | `library` | Duskwall Archives; Irongate's law library is an action at the Supreme Court (`court`), so it keeps the court scene | A reading room: a man writing under a green lamp, shelves of bound files to the ceiling, a clerk with a trolley, a woman on a ladder. |
| `ministry.png` | `scene.ministry` | `ministry` | Duskwall Fortress Gate; Irongate the Ministries and Police Headquarters | A ministry counter: clerks stamping papers under hanging lamps, a queue of people in coats with cases, filing cabinets and a clock. |
| `alliance-hq.png` | `scene.alliance-hq` | `faction-hq`, **`alliance`** | Ashford's HQ; Irongate Concord House (members; a rival sees the map crop and *Members only*) | A committee round a long table with a map and tea cups, bookshelves, a window over the river and a domed roof. |
| `gym.png` | `scene.gym` | `gym` | No location yet. The GDD's `gym` is the athletic club (boxing clubs, the running track, §13.5); Irongate's Vanguard House is a `faction-hq` in slice 4, so its gymnasium action shows the Vanguard office scene. The gym scene arrives with the first `gym` location (a boxing club or a running track in a Level-6 quarter) | A boxing gym: two men sparring in the ring, others skipping and at the punchbags, tall windows over the town. |
| `theatre.png` | `scene.theatre` | `theatre` (the kind slice 4 adds) | Irongate the Opera | An opera foyer at the interval: evening dress and champagne, a marble staircase under chandeliers, an usher at a box door. |

**Focus points** (the schema's optional `focus`, used when a phone crops the 16:9 scene): `scene.factory-gate` `{ x: 0.6, y: 0.55 }` (the flyer changing hands), `scene.library` `{ x: 0.35, y: 0.6 }` (the man at the lamp), `scene.station` `{ x: 0.45, y: 0.6 }` (the porters); the rest are composed on the centre and need none.

With these, the `scenes` binding list grows from four entries to eighteen (the four of slice 1 stay: `union-hq` for the Collective's HQs, `vanguard-office` for the Vanguard's, `bar-anchor` for every `bar`, `newsroom` for `press`). Irongate's twenty-nine locations then all show a scene except Parliament (held) and St Agnes (slice 5): the fallback to the map crop still exists and is still tested.

**Content-policy read** (`docs/design/content-policy-review.md` §7; each picture looked at on 3 Oct 2026):

- No real-world symbol, flag, armband, uniform or insignia in any of the fourteen. The square's speaker stands on a box by a church with a bandstand behind: a political speech, no banner. The alliance-hq's wall carries a framed landscape and bookshelves.
- **The gym is a boxing club**: two sparring in a ring, skipping ropes, punchbags, singlets and shorts, daylight through tall windows. Sport, not drill: no uniforms, no ranks, nothing paramilitary. It fits the `gym` kind's "boxing clubs, the running track" exactly and is fine for the Vanguard's athletic club when one is placed; it is not Vanguard-specific and any faction's member trains there.
- The ministry is a permits counter with a queue, which reads as the state's bureaucracy, not a party's: right for the Ministries, Police Headquarters and Duskwall's Fortress Gate (a customs town, per the review).
- The factory gate, docks and street are campaign pictures (a flyer, a conversation, a doorstep); the court, library, university, hotel and theatre are civic. Nothing is a front, a march or a muster.

## 2. Faces

Twelve new faces join the six of slice 2: eighteen at sign-up, still cosmetic (Appendix C #19: the face has no effect, and the choice stays about the player). The asset id is `avatar.<key>` with the `avatar(key, top, alt)` helper; `top` is the crop's offset from the top of the 1168 px source and is **20 where a hat or the hair reaches the top of the picture, 40 otherwise** (the developer checks each in the art build and nudges by ten if a crown is clipped).

| File | Asset id | `top` | Alt text |
|---|---|---|---|
| `avatar-man-20s-b.png` | `avatar.man-20s-b` | 40 | A young man with cropped fair hair and freckles, in a cable-knit jumper, holding his flat cap. |
| `avatar-man-20s-c.png` | `avatar.man-20s-c` | 40 | A young man with dark curls and round spectacles, in a knitted waistcoat and a red tie, a book under his arm. |
| `avatar-man-30s-b.png` | `avatar.man-30s-b` | 40 | A man in his thirties with a shaved head and a moustache, in shirt sleeves and a dark waistcoat. |
| `avatar-man-30s-c.png` | `avatar.man-30s-c` | 40 | A man in his thirties with close-cropped hair, in a double-breasted suit with a red tie and a pocket handkerchief. |
| `avatar-man-40s-b.png` | `avatar.man-40s-b` | 20 | A man in his forties in a flat cap, unshaven, in a heavy worn coat with the collar up and a scarf. |
| `avatar-man-50s.png` | `avatar.man-50s` | 20 | A man in his fifties with silver hair and a short beard, a red knitted scarf over a tweed coat. |
| `avatar-woman-20s-b.png` | `avatar.woman-20s-b` | 20 | A young woman in a red beret over dark curls, in a striped blouse under a dark jacket. |
| `avatar-woman-20s-c.png` | `avatar.woman-20s-c` | 40 | A young woman with long dark curls and a pencil behind her ear, in a white shirt with the sleeves rolled, and braces. |
| `avatar-woman-30s-b.png` | `avatar.woman-30s-b` | 20 | A woman in her thirties with red hair in a plait and a smudge on her cheek, in a red neckerchief and dungarees. |
| `avatar-woman-30s-c.png` | `avatar.woman-30s-c` | 40 | A woman in her thirties with fair waved hair and a string of pearls, in a dark tailored jacket. |
| `avatar-woman-40s-b.png` | `avatar.woman-40s-b` | 20 | A woman in her forties in a small dark red hat and pearl earrings, in a tailored suit. |
| `avatar-woman-50s.png` | `avatar.woman-50s` | 40 | A woman in her fifties with grey hair pinned up and spectacles on a chain, in a dark cardigan with a brooch. |

The alt texts follow the six existing ones (hair, face, clothes; no skin tones for any face, the same rule for all eighteen). Policy: no insignia, no uniform; the brooch is a plain round one; the red ties, scarf, beret and neckerchief are clothes, not colours of a party (red is worn by faces across the order below, and every faction's recruit picks from the same eighteen).

### 2.1 The sign-up order (`avatars` in `art.ts`)

Eighteen in the order shown, mixing age, sex and look so that **the first row is varied whichever way the grid wraps** (rows of three on a phone; in rows of two every pair is a man and a woman; in a row of six the first six cover both sexes and four decades):

| # | Asset id | The look |
|---|---|---|
| 1 | `avatar.woman-20s-c` | shirt sleeves and braces, a pencil behind her ear |
| 2 | `avatar.man-40s-b` | flat cap, worn coat |
| 3 | `avatar.woman-50s` | grey hair up, spectacles on a chain |
| 4 | `avatar.man-20s` | braces, the scar (slice 2) |
| 5 | `avatar.woman-30s-c` | fair waves, pearls |
| 6 | `avatar.man-30s-c` | double-breasted suit |
| 7 | `avatar.woman-20s` | dark curls, cardigan, red scarf (slice 2) |
| 8 | `avatar.man-50s` | silver hair and beard |
| 9 | `avatar.woman-40s-b` | the small red hat |
| 10 | `avatar.man-20s-c` | spectacles, a book |
| 11 | `avatar.woman-30s-b` | red plait, dungarees |
| 12 | `avatar.man-40s` | tweed, moustache, cap in hand (slice 2) |
| 13 | `avatar.woman-40s` | greying hair pinned back, dark jacket (slice 2) |
| 14 | `avatar.man-30s-b` | shaved head, waistcoat |
| 15 | `avatar.woman-20s-b` | red beret |
| 16 | `avatar.man-30s` | curls, leather jacket (slice 2) |
| 17 | `avatar.woman-30s` | trench coat (slice 2) |
| 18 | `avatar.man-20s-b` | cropped fair hair, cable-knit jumper |

The face step's layout is the developer's (the onboarding spec shows six in two rows of three; eighteen is six rows, which scrolls on a 667 px phone: keep the *Continue* button sticky and the chosen face's row in view). The server's `UNKNOWN_AVATAR` check reads the same list, so nothing else changes.

## 3. For the developer, by file

- `packages/content/src/data/art.ts`: fourteen `scene.*` assets (§1, with the three focus points), fourteen `SceneBinding` rows (`alliance-hq` with `factionId: 'alliance'`), twelve `avatar(...)` assets (§2), the `avatars` list in the §2.1 order.
- `apps/client/public/art/`: the build's output for each (`pnpm art:build`); the budgets per ADR 0015.
- Tests: the existing loader check that every `scenes[]` asset exists and is a `scene`; add that every kind in `LocationKind` except `jail`, `hospital`, `parliament` and `barracks` has a binding, and that `avatars` has eighteen distinct `avatar` ids.
- The slice-4 design's "`theatre`: no scene yet" (`slice-4-battleground.md` §4.3) is superseded by this note once wired.
