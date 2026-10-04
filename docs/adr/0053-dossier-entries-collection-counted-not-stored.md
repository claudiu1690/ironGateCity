# ADR 0053 — The Dossier: one collection for entries, Case Files and informants; the slot count is counted, not stored; entries land in the act's transaction

**Status:** proposed (slice 8) · **Date:** 2026-10-04

## Context

GDD §10 and design §4: the Dossier holds **entries** on the republic's named people (`{ subject, category, line, day, source }`), fresh for seven City Days and half weight after. Three entries' worth on one name bind into a **Case File** (Level 16), which never goes stale and is spent by an exposé, a sale or turning it into an **informant** (an entry every second day for 14 days). Capacity is 10–60 by Intelligence, +1 per perk; a full Dossier refuses new entries.

Entries come from eight sources: tier-1 intelligence Successes (10 % + worn items), surveillance and theft missions, the informer card, the cells' and the ward's taps, society calls, a patron's Monday gossip and informants. The plan names `dossierEntries`; the design suggests a `dossier.count` projection on the character, and informants reported by the day job.

## Decision

1. **`dossierEntries`**: one row per entry, Case File or informant (`kind`, `status`: held, bound, attached, informant, spent, sold), with the subject's party, town and district frozen at landing, and `used { how, day }` on a file. Rows are kept after use (the spymaster award, the report).
2. **The slot count is counted, not stored.** Every path that adds an entry writes the character under its version guard in the same transaction (the act's own, or the settlement's), so `countDocuments({ characterId, status: 'held' })` in the session cannot be raced, and there is no counter to drift. The tab's dot is `dossierLastAt > dossierSeenAt` on the character.
3. **An entry lands inside the act that earns it**: one roll from a named stream of the act's seed (`seed:dossier:{row}`) after the check, so it never shifts the check's or the run-in's rolls. One helper, `landEntry`, serves every source. The line's `{place}` and `{weekday}` are drawn at landing and stored, so a line never changes.
4. **Informant reports and patron gossip land in the character's settlement**, walking each boundary of the window in order, slot permitting, because the world never writes a character (ADR 0020). An absent player's reports arrive once each, when they next read.
5. **Freshness is computed** from `day`; nothing is deleted by time.
6. **Names are content** (`GameContent.names()`): candidates, secretaries, local deputies and party figures with a party and a town, plus dossier-only names that are never drawn at random.

## Consequences

- The character document stays small; the Dossier tab is one indexed read.
- Each use of a file is one status change filtered on `held`, so a file is never spent twice.
- The settlement gains one indexed read, only for characters with informants or a patron at Acquaintance.
- Players as names (v1.5) need only another source of names.
