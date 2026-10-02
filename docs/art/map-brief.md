# Map art brief v2: bigger cities, square canvases, every place readable at zoom

> **Revised 1 Oct 2026 (quarters).** Every city is now an **overview map plus quarter maps** (`docs/design/city-quarters.md`; GDD §14.13). Sections marked **REVISED** changed for it; everything else (the style rules, the camera, the night method, the acceptance checks, the other cities' prompts) still holds. **Coalport is the test**: §0 is the new order of work and §4 is rewritten.

> **Superseded 2 Oct 2026 (maps v3).** The maps were made another way: **one big painted bird's-eye picture per city** (8,640 px; the capital 11,520; the nation 9,216), day and night, in `art-direction/maps-v3/`, served as Deep Zoom tiles with a quarter as a frame on the picture (`docs/design/maps-v3-integration.md`). The grids, plates, footprints, pin targets and prompts below are the retired pen-and-ink plan and no longer describe the art; the pins that count are the survey `maps-v3/pins/pins.json`, transcribed in `packages/content/src/data/mapPins.ts`. Two named places changed with the painting: **St Barbara's** (Coalport) is the old town's Gothic church by the canal, not a plain-towered church on the hill above the station; Clearwater's **tin chapel** is a stone church with a green copper spire and is now **St Martin's**. The content-policy checks (§11: no text, no flags, no devices, civic police) still apply to any repaint.

Game designer, 1 Oct 2026. The brief that drives the regeneration of every map with the connected image-generation tool (GPT Image 2.5 or Nano Banana 2, image-to-image with the current map as a style reference). The user chose to regenerate from scratch rather than extend the current art, and approved the tool. **Coalport day and night go first, for the user's approval, before any other map is generated.**

Inputs: the current maps in `E:\Projects\ironGateCity Docs\art-direction\maps-pen\` (the style to match), the design canvas (`docs/mockups/Main.dc.html`), the location lists in `docs/design/slice-1-content.md` §1.1, `slice-2-cities.md` §1.1 and §2.1, `slice-4-battleground.md` §4.1–4.3, the content policy in `docs/design/content-policy-review.md` §7, and the developer's findings on map shape (§1 below).

What this document is not: it changes no rule. The pin fractions below are **targets for the generation**; the final fractions are measured on the delivered art and written into `packages/content` and the slice documents afterwards (§11).

---

## 0. The order of work (REVISED 1 Oct 2026)

Coalport first, as before, but as **one overview and three quarters** (`docs/design/city-quarters.md` §7). Nothing else is generated until the user has approved the Coalport test.

| # | Image | Files (`maps-pen-v2/coalport/`) | Gate |
|---|---|---|---|
| 1 | **Coalport overview, day** (§4.5) | `overview-day.png` | **User approval** of the town's scale and composition; checks 1, 2, 4, 5, 7, 8 and 16 |
| 2 | **The Mill quarter, day** (§4.6), from the overview's Mill footprint | `mill-day.png` | **User approval** of the quarter's style and richness; checks 1–8, 11, 13, 14; the six pins measured |
| 3 | **The Harbour quarter, day** (§4.7) | `harbour-day.png` | Checks 1–8, 11, 13–15; the five pins measured |
| 4 | **Night**: overview, the Mill, the Harbour (§4.9, §5) | `overview-night.png`, `mill-night.png`, `harbour-night.png` | **User approval** of the night treatment; checks 9, 10 |
| 5 | **The Sidings quarter**, day and night (§4.8) | `sidings-day.png`, `sidings-night.png` | As 3 and 4 |
| 6 | *(optional)* the seamless-stitch experiment (`city-quarters.md` §6) | scratch only | Its own verdict; never blocks |
| 7 | **The user's decision**: quarters for every city | | |
| 8– | Duskwall (overview + 3), Ashford (overview + 3), Irongate (overview + 5 districts), Clearwater (overview + 3), the nation | per city folder | Acceptance checks (§11) |

Coalport is eight images (four maps, day and night). The whole set is **23 maps, 46 images** (four home and swing cities at four maps each, the capital at six, the nation at one). Masters go to `E:\Projects\ironGateCity Docs\art-direction\maps-pen-v2\<city>\`; the old folder stays as the style reference until every city is approved, then is retired (kept in git history).

---

## 1. Shape, size and the pipeline

**The developer's findings, which this brief obeys:**

- Square art (1:1) suits every screen best: a phone fits it by width, a desktop by height, and the same cluster rule works for both.
- The target is about 6144 × 6144, but the generators output about 4K at most: **generate at 4096 × 4096 and upscale ×1.5 to 6144 × 6144**.
- At rest, the city's pins must sit in a **compact central region of about 25–30 % of the art's width and height, a bit right of and above centre**, so they stay clear of the HUD, the tab bar and the location sheet at every screen size. (`CityMap` fits the pins' box between the overlay bands and zooms a tapped pin to 2.5 × that fit, never past the art's native resolution.)
- The rest of the art is the **surrounding city**, revealed when zooming into a place near the cluster's edge. It must be rich, not empty.

**Canvas**

| | |
|---|---|
| Aspect | 1 : 1, every map, the nation map included |
| Generation size | 4096 × 4096 (the generator's largest square; if the model's largest is 2048, generate at 2048 and upscale ×3, and expect to re-generate any location that fails check 6 in §10) |
| Master | 6144 × 6144 PNG, RGB, no alpha, no embedded profile other than sRGB |
| Upscale | ×1.5 with an illustration-aware upscaler (line-art model, no face enhancement, no sharpening halo). The upscale is checked at 100 % on a crop around each pin (§10, check 6) |
| Derivatives | The developer's choice (1024 / 2048 / 4096 / 6144 WebP or JPEG); the content data records the master's size |
| Edges | The drawing runs to all four edges. No paper margin, no frame, no vignette, no fade, no sky |

**Prompt budget.** Every day prompt in this document measures 1,190–1,250 characters and every assembled night prompt 750–850, so each fits the tools' prompt fields with room for a one-line correction after a failed check.

**Why the generation is image-to-image.** The current map of the same city is attached as the **style reference** (the linework, the wash, the camera and the palette), never as a composition to copy: every composition below is new. For the night image the **generated day map is the reference**, at the highest structure fidelity the tool offers, so the two line up (§5).

**Overviews and quarters (REVISED 1 Oct 2026).** The overview and every quarter are each a **4096 × 4096 generation upscaled to 6144**, the same canvas rules as above. The overview is generated first, from the current city map as its style reference. **Each quarter is then generated from the overview's crop of its footprint** (§4.1) as the composition reference at medium structure fidelity, with the approved overview as the style reference where the tool takes two; if it takes one, use the crop and let the prompt's first sentence carry the style. The crop fixes where the water, the rail and the big structures fall, so the zoom from the overview into the quarter reads as the same town getting closer (check 14). The night image of each is generated from its own approved day image (§5).

---

## 2. Composition rules for every city map

**The core box.** The pins sit inside a box from **x 0.40 to 0.68 and y 0.32 to 0.60** of the canvas (28 % of each side; centre at 0.54, 0.46: right of and above the middle). Each place is a distinct building or square with a street between it and its neighbours, so that two pins never touch at the fitted zoom. Nothing in the box is empty ground: the streets between the places carry trams, carts, queues and stalls.

**The ring.** Everything outside the box is the rest of the city: more of the same streets, the big structures that give the city its silhouette (the mill, the fortress, the dome, the station's rail fan), the water, the hills, and the **reserved spots** for later slices (§3–§8 list them per city). The ring is drawn at the same density as the core: a player who zooms into an edge pin sees a city, not paper.

**Scale.** A location's building spans roughly **5–8 % of the canvas width** (200–330 px at 4096; 300–500 px at 6144). Terraces and rows are long enough to read as a street (10–15 % of the width). The pin's building is the biggest thing in its immediate block.

**Camera.** High oblique bird's-eye, about 45° down, the same as the current maps: roofs fully visible, two faces of each building (front to the lower-left, side to the lower-right), light from the upper-left, soft shadows to the lower-right. Not true isometric; the current maps' slight perspective is right. No horizon, no sky; hills, heaps and mountains sit on the ground plane at the edges.

**Where pins land.** Every pin sits on the building's entrance (the gate, the steps, the door) or in the middle of its square or street, not on its roof, so the zoomed view shows the doorway and the life around it.

**The ASCII grids** in §3–§8 are 10 × 10 (each cell 10 % of the canvas, column = x, row = y). They are a layout sketch; the pin fractions are the targets.

**The overview (REVISED 1 Oct 2026).** An overview shows the whole town at small scale and carries only **quarter plates**: no place pins and no pin zoom. The plates sit inside the **central 60 %** (x and y 0.20–0.80), the nation map's rule, each on the structure its quarter is known by. Every quarter's footprint on the overview is a square region (§4.1); footprints overlap a little at their edges, which is the "edges agree" rule at work. The core-box rule above applies **per quarter map**, which holds four to six places.

---

## 3. Style rules (every map)

1. **The same hand.** Pen-and-ink linework in sepia-black (`#15181A` at about 70 % on cream), fine and even, every building drawn with its windows, chimneys, roof tiles, gutters and doorways; tiny figures in hats and coats; a tram with its pole, carts, a few period lorries and saloon cars. Watercolour wash, muted and flat: paper `#EFE6D2`, brick in warm red-browns, slate and zinc roofs in blue-greys, stone in cream and grey, grass and trees in a dull sage, water in petrol `#1E4D52` lightened toward `#6FB3B0`. No gradients, no glow, no photographic texture.
2. **1946 Central European texture.** Steep tiled roofs and mansards, courtyard tenements four floors round a yard, baroque church towers with onion-less caps, a town hall with a clock tower, cobbles, tram wires, advertising columns (blank), kiosks, market halls with iron roofs, canal basins, goods sheds, allotments, bicycle racks, washing lines, coal carts, steam at the station. Nothing after 1946 and nothing British-colonial or American: no skyscrapers, no neon, no aerials, no fins on cars.
3. **No text, labels or lettering** on buildings, boats, trams, posters, shop fronts or the ground. Posters on walls are plain coloured rectangles or pictorial. Tram destination boards, shop signs and boat names are blank. (The current Ashford map has lettering on Gazette House; that is the thing to avoid.)
4. **Politics is the colour** (design canvas, principle 03): the art is faction-neutral. No banners, no faction colours on buildings, no crests. District borders and states are interface overlays.
5. **Content policy** (`content-policy-review.md` §7). No real-world extremist symbols, flags or insignia anywhere: no flags on any building (the current Duskwall gatehouse has two; drop them), no eagles, wreaths, runes, fasces, torches, lightning, arrows or crosses as devices, no salutes, no marching columns, no uniforms as a crowd. **No soldiers, no military vehicles, no barracks, no parade ground** (the current Duskwall has army lorries and a drill square; it becomes a customs town, §4). The police on Garrison Hill are a civic police: a gatehouse with a queue, black saloons in the yard, a bicycle rank.
6. **No war damage** beyond the one existing place: the Bombed Blocks in Station & Market (§6.3), drawn as houses half standing with repair crews and hoardings, neutral, not a ruin field. The scaffolded ruins in the current Duskwall and the rubble in the current Irongate close-up are gone. One ministry in the Government Quarter is "under scaffolding since the war": scaffolding on a sound building, not damage.
7. **Life.** Shift changes, queues, market crowds, children, dogs, a band, a funeral, a wedding at the church, a football match, washing day. The city is busy at every zoom.

---

## 4. Coalport: the overview and three quarters (REVISED 1 Oct 2026; the test)

Home city of the Collective: the mill and the docks against the men who own them. Brick, soot, barges, chimneys, a river basin opening to the sea. Baseline V 9 / C 70 / A 6 / N 15. Paper: the *Clarion*. The design (places, unlocks, teasers, the test's acceptance) is `docs/design/city-quarters.md`; this section is what the generator needs.

| Quarter | Opens | Places |
|---|---|---|
| **The Mill** | Level 1 (built) | Mill Gate, Market Row, Union Hall, Foundry Row, Harbour Quays, The Anchor |
| **The Harbour** | Level 6 (slice 5) | The Shipyard, The Infirmary, Customs House, The Far Bank, Harbour Police |
| **The Sidings** | Level 10 (slice 4, with the train) | Coalport Station, Coal Yards, Tram Depot, St Barbara's |

### 4.1 The overview: layout, grid, plates and footprints

The whole town at small scale. The **steel mill** stands a little above the middle, its furnace and chimneys the tallest things on the map; the market, the union hall and the terraces beside and above it; the **quays** below it on the **river basin**, which runs from a swing bridge at the lower left across the lower half of the map, widening to a **harbour mouth** with a lighthouse mole at the lower right and a collier at sea. **Left of the mill:** the rail line from the left edge into a small **station**, the **coal yards and sidings** below it, a **tram depot** near the swing bridge, and **St Barbara's** tower on the hill above the station. **Right of the quays:** the **shipyard slipway**, the **gasworks** above it, the **infirmary**, and at the mole's root the **customs house**. **Across the water:** the far bank with the **fish market** under its iron roof, the **harbour police** by the ferry stage, bonded warehouses and a lower town. Slag heaps, allotments and a cemetery along the top; a football ground at the top right.

```
       0  1  2  3  4  5  6  7  8  9
   0   ^^ ^^ ^^ ^^ ^^ ^^ .. .. .. ..    slag heaps, allotments, the cemetery
   1   .. CH .. .. TT TT TT .. FG ..    St Barbara's on the hill · terraces · football ground
   2   == St .. MM MM TT .. .. GW ..    station · the mill and furnace · gasworks
   3   == CY .. MM MM mk UH .. GW ..    coal yards · Market Row · Union Hall
   4   .. CY CY .. .. QQ .. SY SY ..    the quays · the shipyard slipway
   5   .. .. TD An ~~ ~~ ~~ IN SY ~~    tram depot · The Anchor · the basin · the infirmary
   6   .. .. .. ~~ ~~ ~~ ~~ ~~ ~~ CU    the swing bridge · the basin · customs house
   7   .. .. .. FM FB FB HP ~~ ~~ ML    fish market · far bank · harbour police · the mole
   8   .. .. .. .. LT LT .. ~~ ~~ ~~    the lower town · the harbour mouth
   9   .. .. .. .. .. .. ~~ ~~ ~~ ~~    the sea, a collier standing off
```

`MM` the mill · `mk` Market Row · `UH` Union Hall · `QQ` the quays · `An` The Anchor · `St` station · `CY` coal yards · `TD` tram depot · `CH` church · `SY` shipyard · `IN` infirmary · `CU` customs house · `HP` harbour police · `FM` fish market · `FB` far bank · `LT` lower town · `ML` the mole and lighthouse · `GW` gasworks · `FG` football ground · `~~` water · `==` rail · `^^` heaps.

**Plates and footprints** (fractions of the overview). The footprint is the part of the overview that the quarter map's central half (x and y 0.25–0.75) depicts; it is the crop used as the quarter's composition reference (§1) and the frame the zoom-in animates to. Footprints overlap at their edges on purpose.

| Quarter | Plate x, y | Footprint left, top, width, height | The plate sits on |
|---|---|---|---|
| The Mill | 0.48, 0.38 | 0.30, 0.20, 0.36, 0.36 | Market Row, between the gate and the hall |
| The Sidings | 0.22, 0.44 | 0.04, 0.26, 0.36, 0.36 | The station forecourt |
| The Harbour | 0.70, 0.66 | 0.52, 0.48, 0.36, 0.36 | The ferry on the basin |

### 4.2 The Mill quarter (today's six places)

The core is the brief's original Coalport composition; the ring now shows the other two quarters at its edges.

```
       0  1  2  3  4  5  6  7  8  9
   0   ^^ ^^ ^^ ^^ ^^ ^^ .. .. ^^ ^^    slag heaps, allotments, the cemetery, St Barbara's tower at top left
   1   CH .. .. .. .. TT TT TT .. ..    upper terraces, the school, the public baths
   2   St MM MM MM .. TT TT .. .. GW    station at the edge · mill chimneys and furnace · gasworks at the right
   3   == MM MM MM[ 1  4  .  3 ].. GW   Mill Gate · Foundry Row · Union Hall
   4   == CY MM MM[ .  2  .  . ]SY ..   coal yards · Market Row · the slipway at the right edge
   5   == CY CY ==[ 6  .  5  . ]SY ~~   The Anchor · Harbour Quays
   6   .. CY TD ~~ ~~ ~~ ~~ ~~ ~~ ~~    the basin: steamers, barges, a swing bridge at left, the tram depot
   7   .. .. .. .. ~~ ~~ ~~ ~~ ~~ ~~    far bank: bonded warehouses, the fish market
   8   .. .. .. .. .. ~~ ~~ ~~ ~~ ~~    the harbour mouth, the lighthouse mole far at the lower right
   9   .. .. .. .. .. .. ~~ ~~ ~~ ~~    the sea
```

| # | Id | Pin x, y | What the generator must draw, and where the pin lands |
|---|---|---|---|
| 1 | `coalport.mill-gate` | 0.42, 0.44 | **Mill Gate:** a large brick gatehouse with an arched gate in the mill's east wall, a clock over the arch, a tall chimney and the blast furnace behind, a crowd of workers in caps at shift change, a tram waiting. Pin on the arch. |
| 2 | `coalport.market-row` | 0.53, 0.50 | **Market Row:** a cobbled street of striped awnings and trestle stalls between the mill and the quay, a stone market cross on a plinth at its middle, a bread queue, a tram line through it. Pin on the cross. |
| 3 | `coalport.union-hall` | 0.65, 0.40 | **Union Hall:** a civic hall with four columns and a pediment, wide steps, a tram loop in front, a bicycle rank, men in caps on the steps. Pin on the steps. |
| 4 | `coalport.terraces` | 0.55, 0.34 | **Foundry Row:** long rows of two-storey brick terraces with slate roofs, back yards with washing lines, a gable end (blank), children in the street, a rent-man's bicycle. Pin in the middle of the street. |
| 5 | `coalport.quays` | 0.60, 0.58 | **Harbour Quays:** a stone quay with two cranes, a row of brick warehouses with hoists, a coal steamer alongside, barges, bollards, dockers eating on the quay. Pin on the quay in front of the crane. |
| 6 | `coalport.anchor` | 0.43, 0.59 | **The Anchor:** a corner pub at the quay's left end, three storeys, a lamp over the door, barrels on the pavement, dockers at the door, the basin at its feet. Pin on the door. |

**The ring:** coal yards with wagons and the station at the left and top-left (the Sidings); the slipway and the gasworks at the right, the far bank and the harbour mouth at the bottom (the Harbour); the school and the baths above the terraces, allotments and slag heaps along the top, a hill chapel and cemetery at the top-left, a swing bridge over the basin at the left, coal carts and a horse trough, a pawnbroker's corner, a chip shop queue, a street with a brass band.

### 4.3 The Harbour quarter

```
       0  1  2  3  4  5  6  7  8  9
   0   TT TT .. .. .. .. .. GW GW ..    terraces' end · gasworks (reserved)
   1   UH .. .. .. .. .. .. GW GW ..    the union hall's roof at the top left
   2   QQ QQ .. .. .. .. .. .. .. ..    the quays' cranes at the left edge
   3   QQ .. .. ..[ 7  .  9  . ].. ..   The Shipyard · The Infirmary
   4   An ~~ ~~ ~~[ .  .  .  8 ]~~ ~~   The Anchor at the edge · the basin · Customs House at the mole's root
   5   ~~ ~~ ~~ ~~[ 11 .  10 . ]ML ~~   The Far Bank (fish market) · Harbour Police · the mole
   6   .. FB FB .. .. .. .. .. ~~ ~~    bonded warehouses · the ferry stage
   7   .. LT LT LT LT .. .. ~~ ~~ ~~    the lower town · the harbour mouth
   8   .. .. LT LT .. .. ~~ ~~ ~~ ~~    nets, a bathing place · the sea
   9   .. .. .. .. .. ~~ ~~ ~~ ~~ ~~    a collier standing off, a pilot boat
```

| # | Id | Pin x, y | What the generator must draw, and where the pin lands |
|---|---|---|---|
| 7 | `coalport.shipyard` | 0.43, 0.37 | **The Shipyard:** a hull on the stocks under a gantry, a drawing-office shed, a steam crane, workers on the staging, a slipway into the basin. Pin on the yard gate at the slipway's head. |
| 8 | `coalport.customs-house` | 0.66, 0.47 | **Customs House:** a stone customs house with a clock at the root of the mole, a bonded shed, lorries and carts being checked, inspectors with clipboards. No flag on the mast. Pin on the door under the clock. |
| 9 | `coalport.infirmary` | 0.60, 0.34 | **The Infirmary:** a brick hospital with a glass-roofed ward wing, a walled forecourt with a gate, an ambulance, visitors at two. Pin on the gate. |
| 10 | `coalport.harbour-police` | 0.60, 0.59 | **Harbour Police:** a small police station beside the ferry stage, a lamp over the door, a yard with black saloons and a bicycle rank, a sergeant at the door. Civic police; no uniformed crowd. Pin on the door. |
| 11 | `coalport.far-bank` | 0.46, 0.59 | **The Far Bank:** the ferry stage and the fish market under an iron roof on the fish quay, boats, crates, a morning crowd, the lower town's narrow streets behind. Pin on the market's open front. |

The basin crosses the core from the left edge (y about 0.45–0.52) and widens to the harbour mouth at the lower right; the ferry crosses between the slipway and the fish market, so the water inside the core box is busy (barges, the ferry, a tug), never empty. **The ring:** the quays' cranes and the Anchor at the left edge (the Mill); the gasworks with two holders at the top right (reserved for a later place); bonded warehouses, the lower town, nets drying, a bathing place, a pilot boat, gulls, the lighthouse mole and a collier at sea.

### 4.4 The Sidings quarter

```
       0  1  2  3  4  5  6  7  8  9
   0   ^^ ^^ ^^ CM CM ^^ ^^ ^^ ^^ ^^    slag heaps · the cemetery and its chapel
   1   .. .. .. .. .. BA .. .. TT TT    public baths (reserved) · the terraces' end
   2   PH .. .. .. SC .. .. .. TT MM    pit-head far at the left · school · the mill's chimneys at the right edge
   3   == == == ==[ .  12 .  15]MM MM   Coalport Station · St Barbara's on the hill
   4   == == == ==[ 13 == == . ]MM MM   Coal Yards (sidings off the line)
   5   .. CY CY ..[ .  .  14 . ].. ..   Tram Depot
   6   .. .. .. .. .. .. .. .. SB ~~    railway cottages · the swing bridge at the lower right
   7   .. .. .. .. .. .. .. ~~ ~~ ~~    the basin's upper reach
   8   .. .. .. .. .. .. ~~ ~~ ~~ ~~
   9   .. .. .. .. .. .. .. ~~ ~~ ~~
```

| # | Id | Pin x, y | What the generator must draw, and where the pin lands |
|---|---|---|---|
| 12 | `coalport.station` | 0.50, 0.37 | **Coalport Station:** a small brick station with one platform canopy, a goods shed, a train with steam, a forecourt with a cab and a tram stop, a porter with a barrow. Pin on the forecourt door. |
| 13 | `coalport.coal-yards` | 0.43, 0.52 | **Coal Yards:** walled yards of coal heaps, loaded wagons on four sidings, a weighbridge hut at the gate, a shunting engine, carts queueing. Pin on the weighbridge gate. |
| 14 | `coalport.tram-depot` | 0.62, 0.56 | **Tram Depot:** an open-fronted shed with three trams, a fan of track, a mess room with a stove-pipe, crews at the door. Pin on the shed's open front. |
| 15 | `coalport.st-barbaras` | 0.65, 0.35 | **St Barbara's:** a church with a plain tower and a bell, a railed forecourt on the hill above the station, a wedding party on the steps. No device on the tower. Pin on the forecourt. |

**The ring:** the mill's furnace and chimneys at the right edge and the swing bridge at the lower right (the Mill); the line running off the left edge toward the countryside with a pit-head winding tower far out; the public baths with a glass roof and the school with a yard (reserved for later places); railway cottages, coal carts and a horse trough, allotments, slag heaps and the cemetery with its chapel along the top.

### 4.5 Prompt: Coalport overview, day

Reference image: `maps-pen/coalport.png` (style only).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. Coalport, 1946, a Central European steel and coal port, the whole town in one view. Centre, above the middle: a brick steel mill with a blast furnace, three chimneys and an arched clock gatehouse; a market street of striped awnings; a columned union hall; long brick terraces; a stone quay with two cranes and a corner pub. Left: a railway from the left edge into a small station, walled coal yards with sidings and wagons, an open tram depot, a church tower on the hill above. Right and below: a shipyard slipway with a hull on the stocks, a gasworks, the river basin widening to a harbour mouth with a stone mole, a lighthouse and a customs house, a collier at sea; across the water a far bank of warehouses, a fish market under an iron roof and a lower town, a ferry crossing. Slag heaps and allotments along the top. Smoke, trams and crowds. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 4.6 Prompt: The Mill quarter, day (generated first)

Reference images: the approved overview's Mill footprint crop (composition, medium fidelity) and the approved overview (style).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Mill quarter of Coalport, 1946, a Central European steel and coal port. Core, centre-right: a brick steel mill with a tall blast furnace and three chimneys, its arched clock gatehouse opening on a cobbled street of workers at shift change; below, a market street of striped awnings round a stone cross; to the right a columned union hall by a tram loop; above, long brick terraces with washing; below, a stone quay with two cranes, warehouses, a coal steamer and barges, and a corner pub at the quay's left end. Around it: walled coal yards with wagons and a small station at the left, a church tower on the hill at the top left, a shipyard slipway and a gasworks at the right, the river basin along the bottom with a swing bridge at the left and a fish market on the far bank, the harbour mouth far at the lower right. Smoke and crowds. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 4.7 Prompt: The Harbour quarter, day (the second quarter of the test)

Reference images: the overview's Harbour footprint crop (composition) and the approved overview (style).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Harbour quarter of Coalport, 1946, a Central European coal port. A river basin enters at the left edge, runs across the middle and widens into a harbour mouth with a stone mole and a lighthouse at the lower right; a collier at sea. Core, centre-right: on the near bank a shipyard slipway with a hull on the stocks under a gantry and a steam crane; a brick infirmary with a glass-roofed ward and an ambulance at its gate; at the mole's root a stone customs house with a clock; a steam ferry crossing to the far bank, with a fish market under an iron roof on a fish quay with boats, and beside the ferry stage a small police station with a lamp over its door and saloons in its yard. Around it: quay cranes and a corner pub at the left edge, a gasworks at the top right, a lower town of narrow houses, nets drying, a pilot boat, barges. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 4.8 Prompt: The Sidings quarter, day (after the test is approved)

Reference images: the overview's Sidings footprint crop (composition) and the approved overview (style).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Sidings quarter of Coalport, 1946, a Central European coal port. A railway enters at the left edge and runs across the core toward the right. Core, centre-right: a small brick station with one platform canopy, a goods shed and a train with steam; walled coal yards of coal heaps and loaded wagons on four sidings, a weighbridge hut and a shunting engine; an open-fronted tram depot with three trams and a fan of track; above the station on the hill a church with a plain tower and a forecourt with a wedding party. Around it: the steel mill's furnace and chimneys at the right edge, a swing bridge over the river basin at the lower right, railway cottages, coal carts, a public baths with a glass roof, a school with a yard, allotments, slag heaps and a cemetery along the top, a pit-head winding tower far at the left edge. Smoke and shift crowds. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 4.9 Night: the shared prompt and Coalport's four light lines

Reference image for each: **its own approved day image**, at the tool's highest structure fidelity (image-to-image strength low, or the "edit, keep composition" mode). The prompt is the shared night prompt below with `{LIGHT}` replaced by the image's light line; every assembled prompt is 800–840 characters.

```prompt
Repaint the attached map as the same drawing at night. Move nothing: every building, street, boat, tram and figure stays exactly where it is, pixel-aligned with the attached image, same linework, same camera. Wash the whole scene in deep blue-grey night ink; warm amber light in windows and doorways, lit tram windows, street lamps with soft pools of light on the cobbles, lamplight and window light reflected in the water. {LIGHT} No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

| Image | `{LIGHT}` |
|---|---|
| Overview | The blast furnace glows orange and lights its smoke; dock floodlights on the quays; the station canopy lit; a lighthouse beam at the harbour mouth; lamps across the swing bridge; the far bank dim with a few lit windows. |
| The Mill | The blast furnace glows orange with sparks and lights the smoke above it; dock floodlights on the quay; the corner pub's windows bright; the terraces dim with a few lit windows; a lighthouse beam far at the lower right. |
| The Harbour | Floodlights on the slipway staging; the infirmary's ward windows warm; the customs house lit at its door; the ferry's lanterns and the lighthouse beam on the water; the police station's lamp; the far bank's lower town dim with a few lit windows. |
| The Sidings | Signal lamps along the sidings and a lit shunting engine; the station canopy and waiting room glowing; the tram depot bright inside with lit trams; the church dark but for a lamp at its door; the furnace glow at the right edge. |

The other cities' night prompts (§5) are this prompt with their own light line in place of `{LIGHT}`.

---

## 5. The night variant (every map)

> **REVISED 1 Oct 2026:** the method is unchanged and applies to every overview and every quarter, each from its own approved day image. Coalport's four light lines are in §4.9; the other cities' lines below are kept for their first quarters and will be split per quarter when those are designed.

- **Same composition, same drawing.** The night image is generated from the approved day image as its reference, with the tool set to keep structure. Pins must land on the same spots in both: the acceptance check overlays the two at 50 % and the difference must show only colour, with every pin's building within **1 % of the width (40 px at 4096)** of its day position. If a generation drifts past that, it is regenerated at higher fidelity; if the tool cannot hold the composition, the fallback is a **graded day map** (a blue-grey multiply layer and a lights pass painted only on windows, lamps and water) made by hand from the day master.
- **Treatment,** matching the current night maps: a deep blue-grey wash over everything (`#2B3340` to `#1E2A38`), warm amber windows (`#F4B860`) in about one window in three, lamp pools on the streets, lit trams, reflections on water, the linework still crisp. The sky is never shown, so there is no moon or stars.
- **Each city's light:** Coalport the furnace and dock floodlights; Duskwall the searchlight on Beacon House sweeping the market and lamps along the fortress wall; Ashford lamplit avenues, the dome lit from inside, the late train; Irongate the glass station glowing, the Parliament dome floodlit, lamps on the bridges, the works' furnaces on the east bank; Clearwater the casino blazing and the terraces dim; the nation map lit cities with the furnace glow at Coalport and the searchlight at Duskwall.
- **Shared night prompt.** Every night image uses the shared night prompt (§4.9) with `{LIGHT}` replaced by the city's light line from the table below. Each stays under 1,200 characters. Nation map: the second sentence reads "every town, train, river and field stays exactly where it is".

| Map | The city's light line |
|---|---|
| Coalport (overview and quarters) | See §4.9 |
| Duskwall | The searchlight on the tower by the district office throws one pale beam across the market tents; lamps along the fortress wall and in the gate arch; the archives dark but for the porter's window; the goods yard lit by a signal lamp and the station canopy. |
| Ashford | Lamplit avenues and bridges, the college dome lit from inside, café windows bright along the river, a late train with lit carriages at the station, the courts and the newspaper's print room glowing. |
| Irongate overview | The glass station glows, the Parliament dome is floodlit, lamps run along both banks and across the bridges, the works' furnaces glow on the east bank, the citadel on its hill dark but for the gatehouse. |
| Government Quarter | The Parliament dome floodlit, the forecourt lamps reflected in the pool, the opera's foyer blazing with carriages at its steps, the ministries dark but for a few late windows. |
| Old Town | Lamps at every café door along the lane, the basilica's dome lit from below, the hospital's windows warm, the press building's print room bright at ground level. |
| Station & Market | The three glass arches glowing from inside, lit trams at the junction, the hotel's windows bright, the market stalls shuttered and dark, lamps in the half-standing blocks. |
| Eastside | Furnace glow and sparks from the works, floodlights on the quays, the bar's lamp at the end of the quay, lit tram crossing the lattice bridge, reflections on the river. |
| Garrison Hill | The citadel gatehouse lit, lamps along the esplanade and the bandstand dark, villa windows warm behind their walls, the tavern bright at the tram terminus. |
| Clearwater | The domed casino blazing with every window lit and lamps along the promenade, lit yachts in the harbour, the tram depot glowing, the terraces dim with few lit windows. |
| Nation | Each city a cluster of lights: the capital brightest with its floodlit dome, a furnace glow on the coast at the south-west, one pale searchlight beam at the walled town in the north-east mountains, lit trains on the lines. |

---

## 6. Duskwall (maps 3 and 4)

> **Quarter plan (REVISED 1 Oct 2026; `city-quarters.md` §8.1).** Three quarters: **The Fortress** (Level 1: the six places below), **The Pass** (Level 6: the frontier checkpoint, the mountain inn, the sawmill, the customs lock-up, an infirmary) and **The Town** (Level 10: the station, the town square and church, the Signal Lamp, the brewery). The composition and prompt below stand for **The Fortress quarter**; the overview and the other two quarters are designed after the Coalport test, and the reserved spots below are their raw material.

Home city of the Vanguard: a frontier customs town in the mountains (content-policy review §1.4). The old fortress now houses the frontier customs; the customs auctions what it seizes under the walls. **A party, not a militia:** no parade ground, no barracks, no soldiers, no army lorries, no flags. Baseline V 70 / C 6 / A 9 / N 15. Paper: the *Sentinel*.

### 6.1 Layout in words

**Mountains** fill the top and right edges, with pine forest coming down to the town and the **frontier road** climbing in hairpins to a pass at the top-right. The **fortress** stands at the top-left of the core on a rock: curtain walls with round towers, and inside them the cobbled **Fortress Square** with the customs house along one side, bonded sheds, lorries being checked and a bandstand in a corner. The **south gatehouse** is the Fortress Gate. Below the walls, the **Customs Market** of tents and trestles. East of the fortress, the **State Archives**, a stone quadrangle. South-east, **Beacon House** with the searchlight tower on its roof. The **railway** comes in from the left edge along the bottom of the core, with the **goods yard** at the bottom-left of the box, **Rampart Row** terraces along the line, and a small station below. A mountain stream with a **sawmill and timber yards** runs down the left side; the civilian town, with its square, church and inns, spreads below and to the right of the core.

### 6.2 Grid

```
       0  1  2  3  4  5  6  7  8  9
   0   ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^    peaks, snow, the pass road's hairpins at top-right
   1   ## ## ## ## ## ## ^^ ^^ ^^ ^^    pine forest, a mountain inn, the frontier barrier far up
   2   ## ## FF FF FF Ck ## .. ^^ ^^    fortress walls on the rock · checkpoint (reserved) on the road
   3   SM .. FF FF[ 1  .  .  4 ].. ..   Fortress Gate · State Archives
   4   SM .. .. ..[ .  2  .  . ].. ..   Customs Market
   5   .. .. .. ..[ 5  6  .  3 ]SL ..   Goods Yard · Rampart Row · Beacon House · Signal Lamp (reserved)
   6   == == == == == == St == == ==    the railway, the station, a tunnel mouth at the right edge
   7   .. .. .. .. TS CH .. .. .. ..    the civilian town: town square, church, inns
   8   .. .. .. .. .. .. .. .. ## ##    lower town, a brewery, villas, the river
   9   ## ## .. .. .. .. ## ## ## ##    forest and farms at the bottom
```

`FF` fortress · `Ck` checkpoint · `SM` sawmill · `SL` Signal Lamp · `St` station · `TS` town square · `CH` church · `##` forest.

### 6.3 The six places

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `duskwall.garrison-gate` | 0.46, 0.41 | **Fortress Gate:** the arched gatehouse in the fortress's south wall, two round towers, a customs barrier and a hut at the arch, lorries queueing to be checked, men in overcoats with clipboards, the Fortress Square visible inside. No flags. Pin on the arch. |
| 2 | `duskwall.quartermaster-market` | 0.53, 0.49 | **Customs Market:** rows of canvas tents and trestles on the open ground below the wall, stacked crates and bales, an auctioneer on a box, a ration queue at one tent, a parked lorry used as a platform. Pin in the middle of the tent rows. |
| 3 | `duskwall.beacon-house` | 0.63, 0.55 | **Beacon House:** a tall stone office of four storeys with a steel lattice tower on its roof carrying a searchlight, a walled yard with volunteers in caps, a side door with a lamp. Pin on the front door at the tower's foot. |
| 4 | `duskwall.archives` | 0.64, 0.38 | **State Archives:** a severe stone quadrangle round an inner court, a colonnaded front with steps, tall narrow windows, clerks on the steps at five. Pin on the colonnade. |
| 5 | `duskwall.goods-yard` | 0.42, 0.56 | **Goods Yard:** sidings below the fortress rock, a goods shed, a freight train with a steam engine, loaders on the buffers, coal and timber wagons, a checker's hut. Pin on the goods shed beside the train. |
| 6 | `duskwall.rampart-row` | 0.51, 0.60 | **Rampart Row:** railwaymen's terraces along the line, washing across the street, children on the steps, a blank gable end at the row's foot. Pin in the middle of the row. |

### 6.4 More stuff, and the reserved spots

| Reserved | x, y | Kind | Drawn as |
|---|---|---|---|
| Frontier checkpoint (slice 5) | 0.56, 0.27 | `ministry` | A striped barrier across the pass road above the Archives, a customs hut, a queue of carts and one lorry, a sentry box with a civilian inspector |
| The Signal Lamp (slice 5) | 0.72, 0.56 | `bar` | A railwaymen's inn in the terraces east of the tower, a lamp over the door, a yard with barrels |
| Duskwall station | 0.60, 0.65 | `station` | A timber-canopied station on the line, a water tower, a tunnel mouth at the right edge |
| Fortress Square | 0.44, 0.33 | `square` | Inside the walls: the customs house (a long stone block), bonded sheds, a bandstand, lorries being checked |
| Town square and church | 0.50, 0.74 | `square` | A cobbled square with a fountain, a baroque church, inns with painted shutters, a Sunday band |
| Sawmill and timber yards | 0.08, 0.36 | `factory-gate` | A mill on the mountain stream, stacked timber, a flume, log carts |
| Mountain inn | 0.80, 0.14 | `bar` | A chalet inn on the pass road with a terrace |
| The brewery and the villas | 0.30, 0.82 | — | A brewery with a chimney, a street of officials' villas with gardens, a bathing place on the river |

Also in the ring: the pass road's hairpins to the top-right, late autumn with bare larches and first snow on the tops, a cable hoist for timber, a shrine at the road's bend, a cemetery with a chapel, a school, a bathhouse, a cattle market, goats on the lower slopes.

### 6.5 Prompt: Duskwall day (map 3)

Reference image: `maps-pen/duskwall.png` (style only; ignore its lorries, flags and ruins).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. Duskwall, 1946, a frontier customs town in the mountains. Core, centre-right: an old stone fortress on a rock with round towers; inside its walls a cobbled square with a long customs house, bonded sheds, lorries being checked and a bandstand; its arched south gatehouse with a barrier opens on a market of canvas tents and crates below the wall; east of the fortress a severe stone quadrangle with a colonnaded front; south-east a tall office with a lattice searchlight tower on its roof; a railway along the core's foot with a goods yard, a freight train and railwaymen's terraces. Around it: pine forest and snowy peaks at top and right, a pass road in hairpins with a customs barrier, a sawmill on a mountain stream at left, a station and a tunnel, a town square with a baroque church and inns, a brewery, villas and farms below. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

Night: §4.9 with the Duskwall light line (§5).

---

## 7. Ashford (maps 5 and 6)

> **Quarter plan (REVISED 1 Oct 2026; `city-quarters.md` §8.1).** Three quarters: **The College** (Level 1: the six places below), **The Wharf** (Level 6: the wharf and boat club, the brewery, the cattle market, the county infirmary, the police station by the lower bridge) and **Station Road** (Level 10: the station, the town hall, the Corn Exchange, the theatre, the park, the Press Club). The composition and prompt below stand for **The College quarter**.

Home city of the Alliance: a university town on the river. The college under its dome, the county courts, the *Gazette*, cafés on the bridges, a station at the edge of the old town. Calm and respectable; the Alliance's argument happens over coffee. Baseline V 6 / C 9 / A 70 / N 15. Paper: the *Gazette*.

### 7.1 Layout in words

The **river** enters at the left edge a little below the middle, curves under the core and leaves at the bottom edge right of centre, with two stone **bridges**: the upper one at the core's lower-left corner, the lower one below the core. **Bridge Street**, the market and café bank, runs along the near bank between them. **Gazette House** and the **Assembly Rooms** stand in the old town at the top-left of the core; the **University Quad** under its green dome is the core's centrepiece, right of centre; the **Courts** stand on a square to its upper right; **Weavers' Row** tenements are at the core's lower-right, behind the **station**, whose lines run off to the right edge. Across the river (bottom-left) is the lower town with the brewery, the cattle market and the wharf. The ring above the core is the respectable town: a town hall with a clock tower, the Corn Exchange, a theatre, a park with a bandstand, the college ground, villas with gardens at the top-right.

### 7.2 Grid

```
       0  1  2  3  4  5  6  7  8  9
   0   .. .. .. .. PK PK .. VV VV VV    park and bandstand · villas with gardens
   1   .. .. TH .. PK CE .. .. VV VV    town hall · Corn Exchange · theatre
   2   .. .. .. .. GG GG .. .. .. ..    college ground, cathedral close
   3   .. .. .. ..[ 1  2  .  4 ].. ..   Gazette House · Assembly Rooms · the Courts
   4   ~~ ~~ .. ..[ .  .  3  . ].. ..   University Quad (the dome)
   5   .. ~~ ~~ B1[ 5  .  6  . ]St ..   Bridge Street · Weavers' Row · station (reserved)
   6   BR .. .. ~~ ~~ B2 .. == == ==    brewery · lower bridge · the lines to the right edge
   7   .. CM .. WH ~~ ~~ .. .. .. ..    cattle market · wharf and boat club (reserved)
   8   .. .. .. .. .. ~~ ~~ .. .. ..    lower town, a mill on the weir, almshouses
   9   .. .. .. .. .. .. ~~ ~~ .. ..    water meadows, a lock, barges queueing
```

`B1`/`B2` the bridges · `WH` wharf · `BR` brewery · `CM` cattle market · `TH` town hall · `CE` Corn Exchange · `PK` park · `GG` college ground · `VV` villas.

### 7.3 The six places

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `ashford.gazette-house` | 0.43, 0.38 | **Gazette House:** the biggest building in the old town, four storeys of stone with a glass-roofed print room along its side, a loading bay with newspaper vans, a blank fascia (no lettering), printers at the bay at four. Pin on the front door. |
| 2 | `ashford.assembly-rooms` | 0.51, 0.33 | **Assembly Rooms:** a pedimented concert hall of two storeys with tall windows and a portico, a lamp either side of the door, a poster board (blank), gentlemen on the steps. Pin on the portico. |
| 3 | `ashford.university` | 0.60, 0.42 | **University Quad:** a college round a lawn, a green copper dome over the chapel at its far side, arcades, a gatehouse on the street, students on the grass and at the gate. Pin on the gatehouse. |
| 4 | `ashford.courts` | 0.66, 0.34 | **The Courts:** a columned courthouse on a square, wide steps, a public queue on the steps, a tram stop and a cab rank in the square. Pin on the steps. |
| 5 | `ashford.bridge-street` | 0.46, 0.52 | **Bridge Street:** stalls with striped awnings and café tables under umbrellas along the river bank between the two bridges, a bookstall, a news-stand, barges moored below. Pin among the stalls. |
| 6 | `ashford.weavers-row` | 0.63, 0.56 | **Weavers' Row:** old tenements of four floors round an inner yard, red-tiled roofs, washing lines across the yard, a builder's yard with hoardings beside it, children on the stairs. Pin on the yard's arch. |

### 7.4 More stuff, and the reserved spots

| Reserved | x, y | Kind | Drawn as |
|---|---|---|---|
| Ashford station (slice 4 train) | 0.74, 0.56 | `station` | A station with an iron canopy at the old town's edge, a train with steam, the lines to the right edge, a goods shed |
| The wharf and boat club (slice 5) | 0.44, 0.70 | `docks` | A wharf below the lower bridge, a boathouse with racing shells, barges, a crane |
| Press Club (GDD §14.1) | 0.56, 0.48 | `bar` | A club house with a bay window and a lamp between the college and Bridge Street |
| Town hall and Corn Exchange | 0.26, 0.14 / 0.52, 0.14 | `square` / `market` | A clock tower on a square; a domed exchange with a colonnade |
| Theatre | 0.62, 0.16 | `theatre` | A theatre with a canopy and poster boards (blank) |
| Park and bandstand | 0.44, 0.08 | `square` | Railings, a bandstand, a pond, nannies with prams |
| College ground | 0.46, 0.22 | `square` | A cricket pitch with a pavilion |
| The brewery | 0.08, 0.62 | `factory-gate` | A brewery with a chimney and drays, across the river |
| Cattle market | 0.16, 0.74 | `market` | Pens, a sale ring, farmers' carts |
| The lock and the weir | 0.64, 0.92 | — | Barges queueing at a lock, a mill on the weir |

Also in the ring: a cathedral close with a spire at the top-left of the college, almshouses, a hospital, a tram depot, villa suburbs with gardens at the top-right, water meadows and rowing eights at the bottom.

### 7.5 Prompt: Ashford day (map 5)

Reference image: `maps-pen/ashford.png` (style only; no lettering this time).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. Ashford, 1946, a university town on a river. Core, centre-right: a college quadrangle round a lawn under a green copper dome, its gatehouse on the street; a columned courthouse with a queue on its steps to the upper right; at the core's upper left a big stone newspaper building with a glass-roofed print room and a loading bay, beside a pedimented concert hall; at the lower left a river bank of market stalls with striped awnings and café tables between two stone bridges; at the lower right old four-storey tenements round a yard with washing lines, behind a station. Around it: the river entering at left and leaving at the bottom, a town hall with a clock tower, a domed corn exchange, a park with a bandstand, villas with gardens at top right, a brewery, a cattle market, a boathouse wharf, a lock and water meadows. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

Night: §4.9 with the Ashford light line (§5).

---

## 8. Irongate (maps 7–18)

### 8.1 The decision: five district maps and one overview, not one big map

> **REVISED 1 Oct 2026:** this decision is now the general rule for every city (GDD §14.13): an overview with plates and one map per quarter. **Irongate's districts are its quarters.** A district gets no sub-quarters in the MVP; one that outgrows six places gets a second quarter map under the same district meter (Appendix C #41). Each district plate also needs a **footprint** (§4.1's rule) for the zoom-in; the footprints are set when the overview is generated.

The slice-4 design (and GDD §14.9) had **one image serve both levels**: the overview whole with five plates, the district view a crop of the same image. That was right for a 5056 × 3392 painting with the pins placed on it after the fact. It is wrong for the new zoom model, for three reasons:

1. **Legibility.** Twenty-nine places on one 4096 canvas, each with its district's ring around it, gives every building about 2–3 % of the width (80–120 px), half a home city's 5–8 %. Zooming into a pin at 2.5 × the district fit shows about 650 px of art: a block of small mush instead of a building with a doorway.
2. **The cluster rule.** Each district view must put its 5–6 pins in a compact region with a rich ring around it, exactly like a home city. On one image the five clusters would have to share the ring, and the overview would show a capital that is five tight knots on empty ground.
3. **The generator's attention.** A single image-to-image generation holds about one city's worth of detail at this scale. Five generations hold five.

So: **one overview map** (`irongate-day/night.png`), square, the whole capital in the current `irongate-districts` composition redrawn, carrying only the **five district plates** (no building pins); and **five district maps**, each a square city map following §2 exactly, with its district in the core box and its neighbours at its edges, so the river, the bridges, the hill and the station fall in the same relative places on every map. The overview is what the nation map's Irongate plate opens into and what the tram bar returns to; tapping a plate opens that district's map. Twelve images instead of two, and the `irongate-closeup` art is retired.

**Knock-ons** (made after approval, §11): GDD §14.9's "on the map" bullet and slice-4 §4.2 (the crops) are replaced; `irongate.*` locations' `map.x/y` become fractions of **their district's** image; the district gets a `map { day, night, size }` of its own; the overview's plate positions are the §8.2 table.

### 8.2 The capital's plan (the overview, maps 7 and 8)

The **river** enters at the top edge right of centre and runs down the right third of the canvas, bending to leave at the bottom-right. **Eastside** is the far bank, right of the river. **Three bridges**: the Upper Bridge (road, stone) at the Government Quarter's level, the **Iron Bridge** (lattice, the tram) at the Station's level, and a railway bridge below. The **Government Quarter** is top-centre on a slight rise: the Parliament dome, the ministries, the opera. The **Old Town** is top-left of centre: the basilica's dome, the spire of St Agnes, lanes. **Station & Market** is the centre: the three glass arches with the rail fan running to the bottom edge, the market and the tram junction above it. **Garrison Hill** is bottom-left on a real hill: the star-walled citadel, the esplanade, the villas. The ring: wooded hills and villas at the top-left, parks and the botanical garden at the top, the river's downstream reaches with a power station and gasworks at the bottom-right, suburbs, a racecourse and a cemetery at the bottom-left, allotments along the railway.

```
       0  1  2  3  4  5  6  7  8  9
   0   ## ## .. .. PK PK ~~ .. .. ..    wooded hills · parks, the botanical garden · the river from the top
   1   ## .. .. .. .. .. ~~ EE EE ..    Government Quarter's north edge · Eastside's works and chimneys
   2   .. OT OT GQ GQ GQ ~~ EE EE ..    Old Town · Government Quarter (dome) · the Upper Bridge
   3   .. OT OT OT GQ GQ ~~ EE EE ..    basilica dome, the spire · the opera · Eastside's quays
   4   .. .. OT SM SM SM B~ EE EE ..    Market Square, the junction · the Iron Bridge · tenements
   5   .. GH GH SM SM SM ~~ EE .. ..    the Hill's gate and tavern · the glass station · the Red Lantern
   6   .. GH GH GH == == RB ~~ .. ..    Vanguard House, the esplanade · the rail fan · railway bridge
   7   .. GH GH GH == == .. ~~ ~~ ..    the citadel · goods yards · downstream: gasworks, power station
   8   CM .. VV VV == == .. .. ~~ ~~    cemetery · the villas · allotments
   9   RC RC .. .. == == .. .. .. ~~    racecourse, suburbs
```

`OT` Old Town · `GQ` Government Quarter · `SM` Station & Market · `EE` Eastside · `GH` Garrison Hill · `B~` the Iron Bridge · `RB` railway bridge · `RC` racecourse · `CM` cemetery.

**Plates** (the overview's "pins", fractions of the overview image; five district plates, no building pins):

| District | Plate x, y | What the plate sits on |
|---|---|---|
| Government Quarter | 0.50, 0.28 | The forecourt in front of the Parliament dome |
| Old Town | 0.34, 0.36 | Basilica Square |
| Station & Market | 0.50, 0.50 | The tram junction above the station's arches |
| Eastside | 0.74, 0.42 | The quays below the works |
| Garrison Hill | 0.36, 0.64 | The esplanade below the citadel |

District borders are an interface overlay; the art draws no borders.

### 8.3 Prompt: Irongate overview day (map 7)

Reference image: `maps-pen/irongate-districts.png` (style only).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. Irongate, 1946, the capital of a Central European republic. A river enters at the top right of centre, runs down the right third and leaves at the bottom right under three bridges. Top centre on a rise: a parliament with a green dome, a paved forecourt with a statue and pool, three stone ministries, a columned opera. Top left: an old town of lanes, a domed basilica, a spired hospital. Centre: a market square round a column, a tram junction, a grand hotel, a station with three glass arches and a fan of tracks to the bottom edge, half-standing houses with repair crews. Right bank: an ironworks with chimneys, cranes on quays, tenements. Bottom left on a hill: a star-walled citadel with a civic gatehouse, an esplanade with a bandstand, a red quadrangle round a garden, villas behind walls. Parks, gasworks, a racecourse and suburbs at the edges. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

Night: §4.9 with the Irongate overview light line.

### 8.4 Government Quarter (maps 9 and 10)

White stone and green copper. **Edges:** Old Town's lanes and the basilica dome at the left edge; the river and the Upper Bridge at the right edge; the market and the tram junction at the bottom edge; parks, embassies, the national bank and the museum at the top.

```
       0  1  2  3  4  5  6  7  8  9
   0   PK PK PK .. .. .. .. .. ~~ ..    parks, the botanical garden, the museum
   1   .. .. NB .. .. .. .. .. ~~ ..    national bank, embassies
   2   OT OT .. .. .. .. .. .. ~~ ..    Old Town lanes · the mint
   3   OT OT .. ..[ 4  1  .  3 ]~~ ..   Supreme Court · Parliament · Ministries
   4   OT OT .. ..[ .  2  .  . ]B~ ..   the Forecourt · the Upper Bridge
   5   .. .. .. ..[ 5  .  6  . ]~~ ..   Opera · Chancery Row
   6   .. .. .. .. .. .. .. .. ~~ ..    the hotel, the junction
   7   .. .. .. SM SM SM SM .. ~~ ..    Market Square, trams
   8   .. .. .. SM SM SM SM .. ~~ ..    the station's arches at the bottom
   9   .. .. .. .. .. .. .. .. ~~ ..
```

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `irongate.parliament` | 0.52, 0.34 | **Parliament:** a long white-stone parliament with a green copper dome, a columned portico with wide steps, railings, a queue for the public gallery, cabs. Pin on the steps. |
| 2 | `irongate.forecourt` | 0.52, 0.45 | **The Forecourt:** a paved square before Parliament, an equestrian statue in the middle, a rectangular pool, six tram shelters round its edge, a lunchtime crowd on the benches. Pin on the statue's plinth. |
| 3 | `irongate.ministries` | 0.63, 0.40 | **The Ministries:** three identical stone blocks in a row, one wrapped in scaffolding, a porter's lodge, clerks on the pavement at five. Pin on the middle block's door. |
| 4 | `irongate.supreme-court` | 0.44, 0.35 | **The Supreme Court:** a red-roofed quadrangle with a pedimented front and a queue of petitioners on its steps. Pin on the steps. |
| 5 | `irongate.opera` | 0.44, 0.52 | **The Opera:** columns, a pediment with a blank frieze, a glass canopy over the foyer doors, a carriage sweep, posters (blank) in frames. Pin on the foyer doors. |
| 6 | `irongate.chancery-row` | 0.56, 0.55 | **Chancery Row:** a terrace of lawyers' chambers with iron railings, brass plates (blank), area steps, a clerk with a bundle at every door. Pin in the middle of the row. |

Ring and reserved: the national bank (0.26, 0.14, `ministry`), the museum and the botanical garden (0.40, 0.06, `square`), the mint (0.30, 0.26), embassies with gardens along the top, the Upper Bridge (0.86, 0.44) with the river's embankment lamps, the Grand Hotel's roof at the bottom-right, the Old Town's lanes at the left edge.

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Government Quarter of a 1946 Central European capital, white stone and green copper. Core, centre-right: a long parliament with a green dome and a columned portico; before it a paved forecourt with an equestrian statue, a rectangular pool, six tram shelters and lunchtime crowds; to its right three identical stone ministries, one in scaffolding; to its left a red-roofed court quadrangle with a queue on its steps; below, a columned opera with a glass canopy and a carriage sweep, and a terrace of lawyers' chambers with iron railings. Around it: parks, a botanical garden, a museum, a national bank and embassies at the top; a river with an embankment and a stone bridge at the right edge; old-town lanes and a domed basilica at the left edge; a market square, trams and a glass-roofed station at the bottom edge. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 8.5 Old Town (maps 11 and 12)

Cobbles, cafés, the basilica, the Herald and the Press Club. **Edges:** the Government Quarter's dome at the right edge; the market at the bottom-right; Garrison Hill's slope and Vanguard House's roofs at the bottom-left; wooded hills and villas at the top and left.

```
       0  1  2  3  4  5  6  7  8  9
   0   ## ## ## .. .. .. .. .. .. ..    wooded hills, villas
   1   ## .. .. .. .. .. .. .. .. ..    the old walls' remnants, a monastery
   2   .. .. .. TH .. .. .. .. .. GQ    town hall with clock tower · the Quarter's dome at right
   3   .. .. .. ..[ 4  .  1  . ]GQ GQ   St Agnes (spire) · Herald House
   4   .. .. .. ..[ 5  .  3  2 ].. ..   Lantern Lane · Press Club · Concord House
   5   .. .. MH ..[ .  .  6  . ].. ..   old market hall · Basilica Square (dome)
   6   .. .. .. .. .. .. .. .. SM SM    guild houses, the lanes · the market's awnings
   7   GH GH .. .. .. .. .. .. SM SM    the Hill's slope, Vanguard House's red roofs
   8   GH GH GH .. .. .. .. .. .. ..    the Hill Gate, the tram terminus
   9   GH GH GH .. .. .. .. .. .. ..
```

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `irongate.herald-house` | 0.60, 0.36 | **Herald House:** a long grey office of five storeys with a glass-roofed print hall behind, a loading bay with newspaper vans, a blank fascia. Pin on the front door. |
| 2 | `irongate.concord-house` | 0.66, 0.46 | **Concord House:** a red-roofed hall of two storeys behind the basilica, round-arched windows, a porch with a lamp, a small garden with railings. Pin on the porch. |
| 3 | `irongate.press-club` | 0.58, 0.46 | **The Press Club:** a narrow club house with a bay window and a lamp, a side alley, journalists at the door. Pin on the door. |
| 4 | `irongate.st-agnes` | 0.44, 0.34 | **St Agnes Hospital:** a hospital with a chapel spire, a walled forecourt with a gate, a visitors' queue at two, an ambulance. Pin on the gate. |
| 5 | `irongate.lantern-lane` | 0.44, 0.44 | **Lantern Lane:** a narrow curving lane of cafés and bookshops, a lamp at every door, café tables, awnings, bookstalls. Pin in the middle of the lane. |
| 6 | `irongate.basilica-square` | 0.60, 0.56 | **Basilica Square:** a domed basilica with a wide flight of steps, a fountain in the square, a Sunday crowd coming down the steps. Pin on the steps. |

Ring and reserved: the town hall with its clock tower (0.34, 0.22, `square`), the old market hall under an iron roof (0.26, 0.52, `market`), a monastery with a cloister (0.20, 0.12), remnants of the old walls, guild houses with stepped gables, a tram depot (0.78, 0.74), the Hill Gate and the tram terminus at the bottom-left, the Quarter's dome at the right edge.

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Old Town of a 1946 Central European capital: cobbled lanes, cafés, gables. Core, centre-right: a domed basilica with wide steps on a square with a fountain; a narrow curving lane of cafés, bookshops and lamps; a hospital with a chapel spire and a walled forecourt; a long grey newspaper building with a glass-roofed print hall and a loading bay; a narrow club house with a bay window; a red-roofed hall with round-arched windows behind the basilica. Around it: a town hall with a clock tower, an old market hall under an iron roof, guild houses with stepped gables, a monastery cloister, a tram depot; wooded hills with villas at top and left; a green parliament dome at the right edge; striped market awnings at the bottom right; a hill with a red quadrangle and a tram terminus at the bottom left. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 8.6 Station & Market (maps 13 and 14)

Crowds, trams, traders, hotels, and the Bombed Blocks behind the market. **Edges:** the Government Quarter's opera and Chancery Row at the top; the Old Town's lanes at the left; the river and the Iron Bridge at the right; the rail fan to the bottom edge with goods yards.

```
       0  1  2  3  4  5  6  7  8  9
   0   OT OT GQ GQ GQ GQ GQ .. ~~ ..    the opera, Chancery Row · the river
   1   OT OT .. .. .. .. .. .. ~~ ..
   2   OT .. .. .. .. .. .. .. ~~ ..    the Old Town's lanes at left
   3   .. .. .. ..[ 1  .  .  4 ]~~ ..   Market Square · Grand Hotel
   4   .. .. .. ..[ .  2  .  . ]B~ EE   Tram Junction · the Iron Bridge · Eastside's cranes
   5   .. .. .. ..[ 5  .  3  6 ]~~ ..   Bombed Blocks · Central Station · Station Buffet
   6   .. .. .. .. == == == == ~~ ..    platforms, the rail fan
   7   GH .. .. == == == == RB ~~ ..    goods yards · railway bridge
   8   GH GH .. == == == == .. ~~ ..    engine sheds, a signal box, allotments
   9   GH GH == == == == == .. .. ~~
```

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `irongate.market-square` | 0.44, 0.38 | **Market Square:** striped awnings round a tall column with a figure on top, bread and fish stalls, a tram queue at the square's edge, a market beadle. Pin on the column. |
| 2 | `irongate.tram-junction` | 0.54, 0.44 | **Tram Junction:** a wide crossing where five tram lines meet, shelters on every corner, overhead wires, four trams at once, a policeman on a box. Pin on the crossing's centre. |
| 3 | `irongate.central-station` | 0.56, 0.56 | **Central Station:** three great glass-and-iron arches side by side, a stone front with a clock, a forecourt with cabs and porters, the platforms and a fan of tracks running to the bottom edge. Pin on the central arch's doors. |
| 4 | `irongate.grand-hotel` | 0.64, 0.37 | **The Grand Hotel:** a tall stone hotel of seven storeys with a mansard roof, a canopy over the entrance, a doorman, cabs waiting. Pin on the canopy. |
| 5 | `irongate.bombed-blocks` | 0.43, 0.53 | **The Bombed Blocks:** two streets of houses behind the market, half of them sound and lived in with washing out, half roofless with hoardings and scaffolding, a repair crew with a cement mixer, a brazier. Neutral, not a ruin field. Pin at the street's end. |
| 6 | `irongate.station-buffet` | 0.65, 0.56 | **The Station Buffet:** a buffet under the station's east arch with its own street door, a lamp, a canopy, night-shift men at the door. Pin on the buffet's door. |

Ring and reserved: the goods yards, engine sheds and a signal box in the rail fan (0.40, 0.76, `station`), a coal merchant, allotments along the lines, a cheap hotel row (0.72, 0.30, `hotel`), a cinema with a blank canopy (0.36, 0.28, `theatre`), the Iron Bridge's near end (0.86, 0.44), the opera's roof at the top.

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The station district of a 1946 Central European capital: crowds, trams, traders. Core, centre-right: a station with three great glass arches, a stone front with a clock, a forecourt of cabs, and a fan of tracks to the bottom edge; a buffet under its east arch; above it a wide tram crossing where five lines meet, with shelters on every corner; a market square of striped awnings round a tall column; a tall mansard-roofed hotel with a canopy and a doorman; behind the market two streets of houses, half lived in with washing out, half roofless behind hoardings with a repair crew. Around it: goods yards, engine sheds, a signal box and allotments along the tracks; a lattice tram bridge and a river with cranes beyond at the right edge; a columned opera at the top; old-town lanes at the left; a cinema and cheap hotels. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 8.7 Eastside (maps 15 and 16)

The cranes, the works, the quays and the tenements on the far bank. **Edges:** the river runs top to bottom along the **left** of the core, with the Station's arches and the Quarter's dome on the far bank at the left edge; the Upper Bridge at the top-left; more works, a canal basin and a gasworks at the right and bottom.

```
       0  1  2  3  4  5  6  7  8  9
   0   GQ ~~ ~~ .. .. WW WW WW .. ..    the Quarter's dome across the river · the works' chimneys
   1   GQ ~~ ~~ .. .. WW WW WW .. ..
   2   .. B1 ~~ .. .. .. .. .. .. ..    the Upper Bridge
   3   .. ~~ ~~ ..[ .  .  1  . ].. ..   Ironworks Gate
   4   SM ~~ ~~ ..[ .  2  .  5 ].. ..   Union House · Foundry Row
   5   SM ~~ ~~ ..[ 4  3  .  6 ].. ..   Iron Bridge · Riverside Quays · Red Lantern
   6   SM ~~ ~~ .. .. .. .. .. CB CB    goods station · canal basin
   7   == RB ~~ .. .. .. .. .. GW GW    railway bridge · gasworks
   8   .. ~~ ~~ .. .. .. .. .. .. ..    tram depot, allotments, the abattoir
   9   .. ~~ ~~ ~~ .. .. .. .. .. ..    downstream, the power station
```

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `irongate.ironworks-gate` | 0.60, 0.34 | **The Ironworks Gate:** a brick works gate with an arch and a clock under four chimneys and a rolling shed, a long blank wall beside it, a shift crowd. Pin on the arch. |
| 2 | `irongate.union-house` | 0.52, 0.42 | **Union House:** a yellow-rendered terrace of three storeys above the quays, a porch with a lamp, bicycles at the railings, a yard with a duplicator's window. Pin on the porch. |
| 3 | `irongate.riverside-quays` | 0.50, 0.52 | **Riverside Quays:** a stone quay with three cranes, bales and barrels, barges and a tug, warehouses with hoists, lorries queueing to the bridge, dockers on bollards. Pin on the quay under the middle crane. |
| 4 | `irongate.iron-bridge` | 0.42, 0.56 | **The Iron Bridge:** a lattice-girder bridge with a tram on it, stone piers with lamps, a crowd walking over at the shift change. Pin on the bridge's east end. |
| 5 | `irongate.foundry-row` | 0.64, 0.46 | **Foundry Row:** tenements four floors round a yard between the works and the river, washing lines across the yard, children, a corner shop. Pin on the yard's arch. |
| 6 | `irongate.red-lantern` | 0.60, 0.59 | **The Red Lantern:** a dockers' bar at the end of the quays, a red lamp over the door, a piano through the window, men at the door. Pin on the door. |

Ring and reserved: a goods station (0.30, 0.66, `station`), a canal basin with narrow boats (0.84, 0.62, `docks`), gasworks with two holders (0.86, 0.74, `factory-gate`), a tram depot and an abattoir at the bottom, a power station with cooling towers downstream at the bottom-left, the Upper Bridge at (0.14, 0.24), the station's arches on the far bank at the left edge.

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The east bank of a 1946 Central European capital: works, quays and tenements. A river runs top to bottom along the left third under a stone bridge at top, a lattice tram bridge mid and a railway bridge below; on the far bank at the left edge a station with glass arches and a green parliament dome. Core, centre-right: an ironworks gate with an arch and clock under four chimneys and a rolling shed; a yellow three-storey terrace with a porch above the quays; a stone quay with three cranes, barges, a tug and warehouses; tenements four floors round a yard with washing lines; a dockers' bar with a red lamp at the end of the quays; the tram bridge's east end with a shift crowd walking over. Around it: a goods station, a canal basin with narrow boats, gasworks with two holders, a tram depot, a power station with cooling towers downstream. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 8.8 Garrison Hill (maps 17 and 18)

The old citadel, now police headquarters; the esplanade below it; the villas behind their walls. A place name, not a garrison (`content-policy-review.md` §6). **Edges:** the Old Town's roofs and the basilica dome down the hill at the top; the station's rail fan at the right; the cemetery, the racecourse and the suburbs at the bottom and left.

```
       0  1  2  3  4  5  6  7  8  9
   0   ## OT OT OT OT .. .. .. SM SM    the Old Town down the hill · the market's edge
   1   ## .. OT OT .. .. .. .. SM SM
   2   ## .. .. .. .. .. .. .. == ==    the station's rail fan at the right edge
   3   .. .. WT ..[ 1  .  2  . ]== ==   Vanguard House · Gate Tavern (tram terminus) · water tower
   4   .. .. .. ..[ .  3  .  . ]== ==   the Esplanade (bandstand)
   5   .. .. .. ..[ 4  .  .  5 ].. ==   Police HQ (the citadel) · the Villas
   6   .. .. .. .. CT CT .. VV VV ..    the citadel's walls and bastions · more villas
   7   OB .. .. .. CT CT .. VV .. ..    observatory · ramparts as a public walk
   8   CM CM .. .. .. .. .. .. .. ..    the cemetery with its chapel
   9   CM CM RC RC RC .. .. .. .. ..    the racecourse, suburbs
```

| # | Id | Pin x, y | What the generator must draw |
|---|---|---|---|
| 1 | `irongate.vanguard-house` | 0.44, 0.37 | **Vanguard House:** a red-brick quadrangle of three storeys round a formal garden with a fountain, a gymnasium wing with tall windows, a gate with a lodge. No banners, no flag. Pin on the gate. |
| 2 | `irongate.gate-tavern` | 0.60, 0.36 | **The Gate Tavern:** a tavern by the Hill Gate where the tram turns, a tram terminus loop in front, a lamp, a yard with barrels, clerks at the door. Pin on the door. |
| 3 | `irongate.esplanade` | 0.54, 0.46 | **The Esplanade:** open ground below the citadel walls with a bandstand, gravel walks, benches, a Sunday crowd, a band at three, a tram stop at the gate. Pin on the bandstand. |
| 4 | `irongate.police-hq` | 0.44, 0.55 | **Police Headquarters:** a star-walled citadel with bastions, a civic gatehouse with a clock and a notice board (blank), a permits queue at the gate, black police saloons and a bicycle rank in the inner yard. No parade ground: the yard has sheds, a garage and a garden. Pin on the gatehouse. |
| 5 | `irongate.villas` | 0.64, 0.56 | **The Villas:** officials' villas behind garden walls on the road up the Hill, iron gates, gravel drives, a maid at a door, chestnut trees. Pin on the road between the gates. |

Ring and reserved: a water tower (0.26, 0.32), an observatory (0.08, 0.72), the cemetery with a chapel (0.10, 0.86), the racecourse (0.30, 0.92), the ramparts as a public walk with cannon-less bastions, a convent school, the Old Town's roofs and dome down the hill at the top, the rail fan at the right edge.

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. A hill district of a 1946 Central European capital: an old star-walled citadel, now the civic police headquarters, above the town. Core, centre-right: the citadel's bastions and a gatehouse with a clock and a queue at the gate, police saloons and a bicycle rank in a yard with sheds and a garden; below the walls an open esplanade with a bandstand and a Sunday crowd; a red-brick quadrangle round a formal garden with a fountain and a gymnasium wing; a tavern at a tram terminus loop by the hill gate; officials' villas behind garden walls with iron gates and chestnut trees on the road up. Around it: a water tower, an observatory, a cemetery with a chapel, a racecourse, suburbs; old-town roofs and a domed basilica down the hill at the top; a station's fan of tracks at the right edge. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

---

## 9. Clearwater (maps 19 and 20)

> **Quarter plan (REVISED 1 Oct 2026; `city-quarters.md` §8.3).** Three quarters, all open to anyone who arrives (nobody reaches Clearwater below Level 10): **The Front** (the Promenade, the Casino, the Lido, the pier hotel), **The Depot** (the Tram Depot, Back Lane Market, The Rows, St Martin's (was "the tin chapel"; painted as a stone church with a green spire), the sanatorium) and **The Harbour** (the Harbour, the cannery, the station, the harbour police). The composition and prompt below are kept as the first draft of the overview.

The swing city, locked in play until slice 7 (*No service yet*). Wealthy suburbs beside a restless working class: the society district on the slope above the water, the tram hub, the harbour, the terraces below (GDD §14.1). Baseline provisional V 20 / C 24 / A 24 / N 32. Paper, provisional: the *Courier*.

**The six places below are provisional**, chosen for the art so the set is consistent; slice 7 confirms or renames them before any data is written (GDD Appendix C, to be opened as a new item, §11). They use existing kinds only.

### 9.1 Layout in words

A **lake** fills the right and top-right of the canvas, with a bay and a stone **harbour mole**. The **slope** rises to the top-left: villas with gardens, and the domed **Casino** above the **Promenade**, a lakeside walk with a bandstand, a pier and a bathing pavilion further along. The **Tram Depot** sits in the middle of the core where the lines from the slope, the promenade and the terraces meet. Below and left, the **Rows** (workers' terraces) and the **Back Lane Market** under the depot's arches, and beyond them the cannery, the station and the gasworks at the bottom and left.

### 9.2 Grid

```
       0  1  2  3  4  5  6  7  8  9
   0   VV VV VV VV .. .. ~~ ~~ ~~ ~~    villas on the slope · the lake
   1   VV VV VV .. .. .. LD ~~ ~~ ~~    the lido / bathing pavilion (reserved)
   2   VV VV .. .. .. .. .. PR ~~ ~~    the promenade's north end, the pier
   3   .. VV .. ..[ .  2  .  1 ]~~ ~~   Casino (dome) · Promenade
   4   .. .. .. ..[ 3  .  .  . ]~~ ~~   Tram Depot
   5   .. .. .. ..[ 5  6  .  4 ]~~ ~~   Back Lane Market · The Rows · Harbour (mole)
   6   .. .. St .. .. .. .. CN ~~ ~~    station (reserved) · cannery (reserved)
   7   .. == == .. .. .. .. .. ~~ ~~    the lines, the gasworks
   8   == == .. .. .. .. .. .. .. ~~    more terraces, a chapel, a football ground
   9   == .. .. .. .. .. .. .. .. ~~    the lakeshore road south
```

### 9.3 The six places (provisional)

| # | Id (provisional) | Pin x, y | Kind | What the generator must draw |
|---|---|---|---|---|
| 1 | `clearwater.promenade` | 0.62, 0.38 | `square` | **The Promenade:** a lakeside walk with a balustrade, lamps, a bandstand, benches, a pier with a kiosk, Sunday hats. Pin on the bandstand. |
| 2 | `clearwater.casino` | 0.51, 0.33 | `bar` | **The Casino:** a domed society hall above the promenade with a columned front, terraces, a formal garden with a fountain, cars at the sweep. Pin on the front steps. |
| 3 | `clearwater.tram-depot` | 0.44, 0.45 | `station` | **Tram Depot:** a big open-fronted shed with a glass roof, a fan of tracks, four trams, a works yard, crews at the gate. Pin on the shed's open front. |
| 4 | `clearwater.harbour` | 0.65, 0.56 | `docks` | **The Harbour:** a stone mole with a small lighthouse, yachts and fishing boats, a slipway, a fish quay with crates, a ferry at the stage. Pin on the quay. |
| 5 | `clearwater.back-lane-market` | 0.43, 0.56 | `market` | **Back Lane Market:** a lane of barrows and stalls under the depot's railway arches, watchful men, crates, a café with a hatch. Pin in the lane. |
| 6 | `clearwater.the-rows` | 0.54, 0.60 | `street` | **The Rows:** crowded workers' terraces below the depot, back yards, washing, children, a corner shop. Pin in the middle of the row. |

### 9.4 More stuff, and the reserved spots

| Reserved | x, y | Kind | Drawn as |
|---|---|---|---|
| The Villas on the slope (lodging, GDD §21) | 0.24, 0.20 | `street` | Villas with gardens and views, a road in curves, gates |
| The Lido | 0.66, 0.14 | `square` | A bathing pavilion with changing huts, a diving stage |
| Clearwater station (slice 7) | 0.26, 0.64 | `station` | A station with a canopy, lines to the left and bottom edges |
| The Cannery | 0.74, 0.66 | `factory-gate` | A fish cannery on the harbour's south side with a chimney |
| The gasworks and the football ground | 0.40, 0.76 / 0.70, 0.84 | — | Two holders; a pitch with a stand |
| A hospital and a church | 0.14, 0.44 / 0.56, 0.80 | `hospital` / `square` | A lakeside sanatorium; a church in the terraces (painted as a stone church with a green copper spire above the tram sheds: St Martin's, `clearwater.st-martins`, at 0.55, 0.22 of the v3 picture) |

Also in the ring: a lakeshore road with a boat-hire stage, a hotel with a terrace by the pier, a steam ferry on the lake, a wooded point at the top-right, a cemetery, a tram line climbing the slope.

### 9.5 Prompt: Clearwater day (map 19)

Reference image: `maps-pen/clearwater.png` (style only).

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. Clearwater, 1946, a Central European lake town, rich and poor side by side. A lake fills the right and top right with a bay and a stone harbour mole. Core, centre-right: a lakeside promenade with a balustrade, lamps, a bandstand and a pier; above it a domed society casino with a columned front, terraces and a formal garden; a big open-fronted tram depot with a glass roof and a fan of tracks; a harbour with a small lighthouse, yachts, fishing boats and a fish quay; a lane of barrows under railway arches behind the depot; crowded workers' terraces with back yards and washing below. Around it: villas with gardens on the slope at top left, a bathing pavilion, a station with lines to the left edge, a fish cannery with a chimney, gasworks, a football ground, a steam ferry on the lake, a wooded point. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

Night: §4.9 with the Clearwater light line (§5).

---

## 10. The nation (maps 21 and 22) (REVISED 1 Oct 2026: more distance)

The whole republic in one view, square. Five cities far apart, joined by rail lines through the capital, so a 12–25-minute journey looks like one. **The new scale:** each city is drawn at about **6 % of the width** (250 px at 4096), down from 10–12 %, so the gaps between cities are three to four city-widths of countryside; **three or four small halts on every line** (a village with a church tower, a station building, a water tower, a level crossing) and a junction outside the capital are scenery, with no pins and no names. Travel times stay at 12 / 15 / 25 (GDD Appendix C #8). There is no zoom-to-pin on this map (a tap opens the city overview), so the cluster rule is looser: **all five cities inside the central 60 %** (x and y 0.20–0.80) so they clear the HUD and the tab bar at the initial fit on a 360-px phone, and the outer 20 % is landscape.

### 10.1 Layout and the five pins

| City | Pin x, y | Drawn as (it must read as its city at this scale) |
|---|---|---|
| Irongate | 0.50, 0.47 | The capital on its river: the green dome, the glass station, three bridges, the citadel hill, chimneys on the east bank; the biggest city by far |
| Ashford | 0.24, 0.24 | A college town on a river: a green dome over a quadrangle, a courthouse, two bridges, water meadows |
| Duskwall | 0.78, 0.26 | A walled fortress town on a rock in the mountains: round towers, a pass road, a tunnel mouth, pines, snow on the peaks |
| Coalport | 0.22, 0.74 | A steel and coal port on the coast: a blast furnace and chimneys with smoke, cranes, a harbour mole, a collier at sea |
| Clearwater | 0.76, 0.74 | A lake town: villas on a slope, a domed casino, a harbour mole, yachts, a steam ferry |

**Lines** (the interface draws the route overlay along the painted track): four lines out of the capital, as the current art: the **campus line** north-west to Ashford through farmland and villages; the **mountain line** north-east to Duskwall over a viaduct and into a tunnel; the **coast line** south-west to Coalport along the river to the sea; the **lake line** south-east to Clearwater. Every line passes through Irongate.

**Landscape:** snow peaks and pine forest along the top-right and right; the sea along the left and bottom-left with cliffs and a lighthouse; the lake at the bottom-right; a river from the mountains through the capital to the sea at Coalport; farmland in strips, villages with church towers, a monastery on a hill, a quarry, a dam in the mountains, a ferry on the lake, a steamer at sea, trains on every line with a plume of steam.

```
       0  1  2  3  4  5  6  7  8  9
   0   .. .. .. ## ## ^^ ^^ ^^ ^^ ^^    peaks and forest
   1   .. .. .. .. ## ## ^^ ^^ ^^ ^^
   2   .. AS AS .. .. .. ## ^^ DW ^^    Ashford · Duskwall on its rock
   3   .. .. == .. .. .. == ^^ ^^ ^^    the campus line · the mountain line, viaduct, tunnel
   4   .. .. .. == .. IG ~~ .. ## ##    Irongate on the river
   5   ~~ .. .. .. == IG == .. .. ..
   6   ~~ ~~ .. .. ~~ .. .. == .. ..    the river to the sea · the lake line
   7   ~~ ~~ CP ~~ .. .. .. .. CW ~~    Coalport on the coast · Clearwater on the lake
   8   ~~ ~~ ~~ ~~ .. .. .. .. ~~ ~~    the sea · the lake
   9   ~~ ~~ ~~ .. .. .. .. .. ~~ ~~
```

### 10.2 Prompt: nation day (map 21) (REVISED 1 Oct 2026)

Reference image: `maps-pen/nation-day.png` (style only).

```prompt
Style of the reference: pen-and-ink bird's-eye map of a whole country, fine sepia lines, muted watercolour on cream paper, every town drawn building by building at small scale, tiny trains with steam; high oblique view, no sky, art to all edges, square. A small Central European republic, 1946: five small cities far apart, joined by long railways through the capital. Centre: the capital on a river with a green parliament dome, a glass station, three bridges, a citadel hill and chimneys on the east bank, the biggest by far. Upper left: a college town with a green dome and two bridges. Upper right: a walled fortress town on a rock in snowy pine mountains, a viaduct and a tunnel. Lower left: a coal port on the coast with a blast furnace, chimneys, cranes and a harbour mole. Lower right: a lake town with villas, a domed casino and yachts. On every line three or four small halts, villages with a church tower and a station; a junction outside the capital. Between them farms, a monastery, forests, a lighthouse, a ferry on the lake, a train on every line. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

Night: §4.9 with the nation light line (§5), the second sentence reading "every town, train, river and field stays exactly where it is".

---

## 11. Acceptance checks (every image, before it is used)

Run on the 4096 generation before the upscale, then again on the 6144 master. A map passes when every row is a yes; the designer signs the table in the PR that adds the art.

| # | Check | How |
|---|---|---|
| 1 | **Square, the right size, RGB** | 4096 × 4096 on generation, 6144 × 6144 master; no alpha; no border, frame, vignette, paper margin or sky at any edge; the drawing continues to all four edges |
| 2 | **Composition matches the grid** | Overlay the §-grid at 10 % lines: the water, rail, hills and the big structures fall in their cells; the core box (x 0.40–0.68, y 0.32–0.60) holds every pin's building with streets between them; nothing in the box is empty ground |
| 3 | **Every location is recognisable where its pin sits** | Crop a 512 × 512 box (at 4096) centred on each target pin and compare with the "what the generator must draw" line: the building type, its distinguishing parts (the arch, the dome, the cranes, the tower) and the life around it must all be there. Record the measured pin (the entrance or square centre) as the final x, y |
| 4 | **No text** | At 100 %, scan every sign, fascia, poster, tram board, boat, shop front, notice board and the ground: no letters, numbers or letter-like marks. One clear word anywhere fails the image; a blank or pictorial sign passes |
| 5 | **Content policy** (`content-policy-review.md` §7) | No flags on any building; no insignia, eagles, wreaths, runes, fasces, torches, lightning, arrows or crosses as devices; no uniformed crowds, salutes or marching columns; no soldiers, military vehicles, barracks or parade grounds; no ruins beyond the Bombed Blocks on the Station & Market map; the police on Garrison Hill civic. Duskwall's fortress yard is a customs square with a bandstand |
| 6 | **Enough detail at zoom** | On a 360-px phone the pin zoom shows about 11 % of the width (450 px at 4096, 680 at 6144): at that crop the doorway, windows, cobbles and figures of the pin's building are drawn, not smeared; the upscale has added no halo or waxy texture. Fail: regenerate the image, not just the crop |
| 7 | **Period** | Only 1930s–40s vehicles (trams with poles, bonneted lorries, saloons); no buses with flat fronts, no aerials, no neon, no concrete towers |
| 8 | **Style consistent across the set** | Side by side with the approved Coalport day map: the same line weight, the same cream, the same muted wash, the same camera angle and light direction; a stranger would say one hand drew them |
| 9 | **The night variant aligns** | Overlay day and night at 50 % and compute the difference: only colour changes; every pin's building within 1 % of the width (40 px at 4096) of its day position; the same figures, trams and boats in the same places. Lit windows in about one window in three, lamps with pools, water reflections, the city's own light from the §5 table, linework still crisp. Fail: regenerate at higher structure fidelity, or fall back to the graded day map (§5) |
| 10 | **Day and night share the pins** | The content data stores one set of fractions per map; both images must satisfy check 3 at those fractions |
| 11 | **The ring is rich** | Zoom into the edge pins (the ones nearest the box's edges) at 2.5 × the fit: the view is full of city on every side; the reserved spots in the city's table are present and recognisable |
| 12 | **Edges agree (Irongate only)** | Each district map's four edges show what its §8 table says (the river on the correct side, the dome, the arches, the hill), and the overview's five plates sit on the structures named in §8.2 |
| 13 | **Style holds across levels** (REVISED 1 Oct 2026) | The overview and each of its quarters side by side at the same on-screen size, and two quarters side by side: the same line weight, cream, wash, camera and light direction; the overview's furnace, slipway or mole and the quarter's are the same building drawn at two scales. A stranger says one hand drew them all |
| 14 | **The zoom reads as one town** | Crop the overview to the quarter's footprint (§4.1) and overlay the quarter's central half (x, y 0.25–0.75) at 50 %: the water, the rail and the big structures fall within **5 % of the width** of each other, so the zoom-and-cross-fade shows the same place getting closer. Adjacent quarters' shared edges show the same structures |
| 15 | **Quarter edges agree** | Each quarter map's edges show what its table says (the Mill's right edge shows the slipway and the gasworks; the Harbour's left edge shows the quays' cranes and the pub) |
| 16 | **The teaser works** | On the overview at the phone fit, every plate (open or locked) is readable, sits on its named structure, and lies inside the central 60 %; the drawing under a locked plate is not dimmed or greyed, since the lock is an interface overlay |

---

## 12. Knock-ons once Coalport is approved (REVISED 1 Oct 2026)

Done with the quarters design (1 Oct 2026): GDD §14.13 (the chain, the gates, the teaser), §14.9's "on the map" bullet, §13.5's note, the §0 row and Appendix C #38–41. Still to do after the art is approved:

| Where | Edit |
|---|---|
| GDD §2.2 | Map assets are square masters at 6144 × 6144, day and night, one per overview and per quarter; the day/night rule is unchanged |
| GDD §14.1 / Appendix C #40 | Clearwater's six locations (§9.3, provisional) confirmed or renamed in slice 7 |
| `city-quarters.md` §4, `slice-1-content.md` §1.1, `slice-2-cities.md` §1.1 and §2.1, `slice-4-battleground.md` §2.1, §4.2 and §4.3 | Pin fractions (now of the quarter image), plate positions and footprints replaced by the measured values; slice-4 §4.2's crops deleted |
| `packages/content` | `city.overview`, `city.quarters[]` (or `district.*` in the capital) and `location.quarterId`, as the architect decides from `city-quarters.md` §9; `location.map` re-measured per quarter; nation pins re-measured |
| `docs/mockups/Main.dc.html` | The Duskwall alt text (already flagged in `content-policy-review.md` §8), the new plates, the quarter header and the quarter bar |

Nothing here changes a number or a name. Faction naming stays parked.
