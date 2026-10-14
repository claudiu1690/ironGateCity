---
type: runbook
title: Add or Change Game Text
aliases: [change copy, game text, player-facing text, wording]
tags: [content, copy, writing]
updated: 2026-10-14
---

# Add or Change Game Text

**Use when:** any words a player reads change: a button, a help note, a ticket, an outcome, a
headline, an order, a story beat. Player-facing text is owned by the game-designer (project
CLAUDE.md, the team table). The rules are [[GDD#1.5 Plain words (review 2)|GDD §1.5]] and
[[GDD#13.1a The result modal|GDD §13.1a]].

## Where the text lives

All in `packages/content/src/data/` unless noted.

| Text | File |
|---|---|
| UI copy: HUD, tickets, the result modal, odds words, reasons, help notes, errors, map, *What's here*, council, ballot, travel, residence, the cells, night, kind labels | `copy.ts` (exported as `copy`; plain data, safe in the client) |
| Place names, blurbs, ticket names, ticket outcome texts | `cities/<city>.ts`; the Town Hall's shared ticket in `cities/townHall.ts` |
| Mission briefings, ways, outcomes | `missions/<city>.ts` |
| The papers' headlines | `headlines.ts` (home papers' slice-1 and ambient lines), `politicalHeadlines.ts`, `ruleHeadlines.ts` (the rule vote), `heraldHeadlines.ts` (the Herald), `localHeadlines.ts` (the local line of an edition), `capitalHomeHeadlines.ts` (capital news in home papers) |
| Party orders and the secretary's lines | `orders.ts` |
| Political result modals (*Vote cast*, standing, backing) | `politics.ts` |
| The opening (*Coming home*) | `origin.ts` |
| Ambition chapters | `ambitions.ts` |
| Journey cards, the hostile deck, the patrol stop | `journeyEvents.ts` |
| Issues of the Week | `issues.ts` |
| Council rules (ordinances) and their plain lines | `ordinances.ts` |
| Run-in opponents' six lines | `opponents.ts` |
| The cells' and the ward's tap | `held.ts` |
| Party cards, ranks | `factions.ts` |
| Items, jobs, nation cards | `items.ts`, `jobs.ts`, `nation.ts` |
| Image alt texts | `art.ts` |

> [!note] Inference
> Screens are meant to take their words from `copy.ts` and content, so "a new kind needs content,
> never client code" (`copy.ts`). A string typed straight into `apps/client` or `packages/ui` is
> probably in the wrong place; check before editing there.

## Steps

1. **Find the string** with a search across `packages/content/src/data/`. Check the design doc that
   settled it (often quoted word for word, e.g. `docs/design/review-5-answers.md`,
   `docs/design/voting-simplified.md` §8.6–§8.12). A settled string changes in both places.
2. **Write it in plain words** (GDD §1.5). The design keeps its terms (*canvass*, *FXP*,
   *ordinance*, *battleground*); **a screen never shows them**. The player reads *Talk to voters*,
   *Party XP*, *council rule*, *close race*, *comeback*, *rival ground*, *a run-in*, *the cells*,
   *your record*, *Reputation*. Use the §1.5 table for every term.
3. **Keep it short.** Narrative is **2–3 lines** (project CLAUDE.md rule 1). The loader enforces the
   ceiling: outcome bodies ≤ 240 characters and ≤ 4 sentences, headlines ≤ 80, mission briefings
   ≤ 300 and ≤ 4 sentences, place blurbs ≤ 200.
4. **No dice maths.** No roll, no chance, no percentage, no bar on a result (§13.1a, Appendix C
   #35). Odds are words: *Good odds*, *Fair odds*, *Long shot* (`copy.odds`). Numbers that are
   rewards and costs are shown, and every Energy button says what it does and what it costs
   (*Once more · 10 Energy*).
5. **Spell labels out.** Stats are written in full in sentences and on tickets (*Intelligence*,
   *your best, Strength*); the three-letter codes stay only on the Me tab's stat table and the
   level-up buttons. *Political Capital* is never abbreviated.
6. **House style** (`copy.ts` header): British English, no exclamation marks, times rendered by the
   client in the player's own clock (*in 24 min*, *at 14:40*, *tomorrow 01:00*); "UTC" never on a
   button, and nothing says *midnight* for the day's turn (review 4).
7. **Placeholders** must be on the allowed list for that kind of text (`load.ts`: ordinary, story,
   political and local lists; e.g. `{city}`, `{faction}`, `{until}`, `{paper}`). Missions take none.
8. **Vocabulary.** Campaign words (canvass, rally, speech, exposé, strike, battleground,
   groundswell), never war framing (front, uprising, enemy, troops). Vanguard and Collective text
   follows the [[design/content-policy-review#7. The checklist for future Vanguard content (the content policy, Appendix C #7)|content-policy checklist]].
   No real-world extremist symbols, titles or slogans.
9. **Keep the voice.**
   - The papers each have one: the *Coalport Clarion* (the mill and the quays), the *Duskwall
     Sentinel* (the city and the frontier), the *Ashford Gazette* (fair report, free comment), the
     *Irongate Herald* (all the republic); the *Clearwater Courier* is designed for slice 7.
   - The secretaries sign their lines: Holm (*— P.H.*, the branch, the Union Hall), Stahl
     (*— V.S.*, "the movement", "the district", "in good order"), Grey (*— T.G.*, "the Rooms",
     "the ward", the running joke of clause four). Idioms: [[design/slice-2-cities|slice-2 cities]]
     §1 and §2.
   - Moderation notes are signed **the editor** (slice 9, designed).
10. **Rules or numbers in the text** must match the GDD; if the text reflects a changed number,
    change the GDD in the same work.

## Checks before done

- Content loads (`loadContent()` via `tsx`, or start the server): length, sentence and placeholder
  problems are listed.
- `pnpm art:check && pnpm turbo run lint typecheck build`.
- The vocabulary test (`packages/content/test/qa.vocabulary.test.ts`) catches system terms on
  screens. Vitest is **not run** in the workflow since 8 Oct 2026 (the user's decision); run it only
  when asked: `pnpm --filter @irongate/content test`.
- Read it in the game (`pnpm dev:mem`) at phone size (390 × 844, and 375 × 667 for long texts): a
  ×1 Success result must not scroll (GDD §13.1a).

## Related

[[The Result Modal]] · [[The Morning Paper]] · [[Party Orders]] · [[Add a Mission]] ·
[[Add a Place]] · [[Content Package]] · [[People of Irongate]]
