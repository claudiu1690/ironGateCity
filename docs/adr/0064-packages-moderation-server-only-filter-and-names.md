# ADR 0064 — `packages/moderation`: a pure, server-only package for the word filter, name checks and email normalisation, with its lists outside content

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §5.4–§5.6 sets out how text is checked:

- **A word filter** refuses a line (*That can't be said here.*, never echoing the word) or flags it to the queue (vote-buying patterns, URLs, phone numbers, emails, a soft list).
- **Names** are checked after folding (lower case, diacritics and leet folded, repeats collapsed, spacing removed) against the refuse list and an **impersonation list** (every NPC name in content, *moderator*, *admin*, *editor*, the mastheads).
- The lists contain the strings the content policy bans. They must stay **outside `packages/content`**, where the QA vocabulary guards would trip on them, and the user reviews them before the closed beta.

`packages/rules` and `packages/content` are both imported by the client. Anything placed there ships in the browser bundle. The design's default is a new pure package.

## Decision

1. A new workspace package **`packages/moderation`** (TypeScript, Vitest, no runtime dependency, no I/O):
   - `fold`, `foldTight`;
   - `checkText` → `ok | refuse | flag { tags }`;
   - `checkName` → `ok | refused | impersonation`, with the protected names passed in from content;
   - `normaliseEmail` (lower case; `+tags` dropped; dots dropped for gmail and googlemail);
   - `moderationAt`, `suggestRung`, `csvCell`.
2. **The lists** are JSON in `packages/moderation/lists/` (`refuse`, `flag`, `impersonation`), readable by the user as plain lists.
3. **Only `apps/server` and `packages/db` depend on it.** An ESLint `no-restricted-imports` rule in `apps/client`, `packages/ui` and `packages/content` forbids it, and a build test greps the client bundle for sentinel entries.
4. **Matching:** a refuse entry matches a whole folded token, and a phrase entry matches the space-stripped form. Ambiguous patterns are flags, never refusals.
5. **The game's own vocabulary always passes.** A fixture test loads all of content (titles, orders, headlines, places, NPC names, copy) and asserts every string is `ok`.

## Consequences

- The filter is fully unit-testable and cannot leak to the client.
- One internal package is added, not a dependency.
- The lists are data the user can review without reading code. Changing them needs a deploy, which suits a list reviewed by a person.
