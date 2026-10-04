# ADR 0060 — Network sightings with calendar-epoch salted hashes, a device cookie set by a hook, and sign-up caps checked in our auth bridge

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §4.1–§4.2 (GDD §15.2) asks for:

- **One account per person.** A normalised email; **at most two accounts ever from one device** and **three per network (IPv4 /24, IPv6 /48) per City Day**. These are the only refusals a player sees.
- **The audit's inputs.** For every authenticated request: the account, the City Day, a **salted hash of the full IP** (the salt rotated every 30 days, so hashes are comparable within a month and useless after), the network prefix, the device id, and the minutes of activity. Kept 30 days, never in telemetry, and never shown as an address.

Locally every request comes from `127.0.0.1`, and Playwright creates many accounts from one machine. Better Auth owns sign-up, and its hook signatures vary between versions. Our Fastify bridge already forwards `/api/auth/*` and resolves the client IP (`TRUST_PROXY`, ADR 0001).

## Decision

1. **The device id** is `igc_d`: 128 random bits, HttpOnly, `SameSite=Lax`, one year, `Secure` on https. An `onRequest` hook sets it on any `/api/*` response that lacks it, so no extra endpoint is needed.
2. **`networkSightings`** (TTL 30 days), one row per account × City Day × IP hash × device:
   - it holds activity spans (minute precision);
   - the request context upserts it at most once a minute, outside the response path.
3. **Hashes, not addresses.**
   - `ipHash = HMAC(saltOf(epoch), ip)` and `netHash` for the /24 (/48);
   - the epoch is `floor(day ÷ 30)`, and `saltOf(epoch) = HMAC(AUDIT_SECRET, 'ip:' + epoch)`. The salt rotates with the calendar, with no job and no stored salt.
   - During an epoch's last 14 days, each row also stores the **next epoch's hashes**. The 14-day link window is then comparable across the switch: the design's "two salts during the switch".
4. **Loopback is never a network** (`ipHash: 'local'`, excluded from every rule), so local play is never linked or capped by address. With the test hooks only, a header supplies a fake address.
5. **Sign-up is guarded in our bridge** before Better Auth's handler. The guard checks the name filter, the normalised email, the invite code (closed beta), and then the caps.
   - The caps are **reservations** in `signupCaps`: a conditional upsert `{ count < limit }` on `dev:{deviceHash}` (kept 400 days) and on `net:{netHash}:{day}` (kept 2 days).
   - Refusals use Better Auth's error shape and the design's lines.
   - Better Auth's create hook sets `emailNorm`. A **unique partial index on `user.emailNorm`** is the backstop when two sign-ups race.
6. The caps can be switched per process by the test hooks (off by default in memory mode), so e2e and local play are not refused unless a spec turns them on.

## Consequences

- No rotation job and no salt storage. Sightings expire after 30 days, so nothing IP-derived outlives the window that makes it comparable.
- The guard does not depend on a Better Auth hook's signature, and has the IP and the cookie it needs.
- A reservation consumed by a sign-up that later fails is not returned. The cap is a soft guard and the numbers allow for it.
- Clearing cookies or changing networks defeats the caps. This is accepted: the caps are guards, not walls, and links still catch a shared device or interleaving use.
