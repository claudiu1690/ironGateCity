# ADR 0070 — Performance and accessibility checks: Playwright with CDP throttling and a bundle script for the budgets, `@axe-core/playwright` for WCAG; no Lighthouse CI

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Design §7 targets WCAG 2.2 AA. An axe run over every route and sheet on the screen matrix fails on any serious or critical issue, and every target must be at least 44 px.

Design §8 sets budgets with a *must* and a *target*:

- LCP of the first view at 4G on a Pixel 7 profile with a 4× CPU slowdown;
- INP and the API's p95;
- JS (gzipped) on the first route and in the whole app;
- fonts;
- the first session's art, a city's first tiled view, and a zoom to a place;
- decoded image memory;
- the day job's duration;
- crash-free sessions.

The design's default is Lighthouse CI for the budgets.

The stack already has Playwright, the art byte counters (`arrival.spec`, ADR 0015, 0024) and `vite preview` with the memory server. Lighthouse CI brings a large dependency tree and its own Chrome handling. Everything above can be measured with the Chrome DevTools Protocol from Playwright:

- network and CPU throttling;
- LCP through `PerformanceObserver`;
- interaction latency through the Event Timing API;
- bytes through the existing counters;
- bundle sizes through `node:zlib` on the build output.

axe has no reasonable hand-written substitute.

## Decision

1. **`pnpm report:perf`** builds the client and prints gzip per chunk (the first route and the whole app). It then runs a `perf` Playwright project on `vite preview` with the memory server:
   - CDP `Network.emulateNetworkConditions` (165 ms RTT, 8.1 Mbit/s) and `Emulation.setCPUThrottlingRate(4)` on the Pixel 7 profile, plus desktop 1440 × 900;
   - it measures LCP, tap-to-modal, art and tile bytes, and decoded image bytes;
   - a scripted load (`--load 50`) gives the API p95, and a timed run gives the day job for 1,000 characters.
   It prints *must* and *target*, and exits 1 over a *must*.
2. **One new dev dependency: `@axe-core/playwright`** (MPL-2.0; no runtime code ships). An `a11y` project runs axe on every route and sheet of the matrix, plus a helper that measures every interactive element's box for the 44 px rule.
3. Lighthouse is run by hand at the hosting step as a cross-check, not in CI.

## Consequences

- The budgets are checked locally today and in CI from lane D #1, with the tools already in the stack.
- The INP figure is a proxy (tap to modal under throttling), not field data. Field data comes from the beta's `api.timings` and Sentry.
- axe catches the mechanical failures. The designer's VoiceOver and NVDA pass covers the rest before the closed beta.
