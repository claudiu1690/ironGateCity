import type { GameContent } from '@irongate/content';
import { Award, City, Contribution, IssueModel, issueDocId } from '@irongate/db';
import type { CityDoc, ContributionDoc, IssueDoc, IssueResultDoc } from '@irongate/db';
import {
  HERO,
  ISSUES,
  applyPersuasion,
  createRng,
  drawIssues,
  electionKey,
  heroes,
  resolveIssue,
  topByBracket,
} from '@irongate/rules';
import type { DayKey, FactionId, OpinionShares, ScoreboardTableView } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { AlreadySettled, cityDayHooks, issueSeed } from './cityDayCore';
import { writeLedger } from './ledger';

/**
 * The Issues of the Week and the heroes, as steps of a city's boundary (tech design §7.4–§7.5,
 * ADR 0028, 0029). They run inside the boundary's transaction; every write is guarded on the status
 * it expects or keyed uniquely, so a second runner turns into a conflict and a retry.
 */

export type CityIssues = NonNullable<CityDoc['issues']>;

/** Draw and insert a week's two Issues (`live`, no momentum) for a city; the city's `live` list. */
export async function drawWeek(
  content: GameContent,
  cityId: string,
  weekDay: DayKey,
  lastWeek: readonly string[],
  session: ClientSession,
): Promise<CityIssues['live']> {
  if (cityDayHooks.noIssues?.has(cityId)) return [];
  const seed = issueSeed(cityId, weekDay);
  const picks = drawIssues({
    eligible: content.issuesFor(cityId).map((x) => ({ id: x.issue.id, districtId: x.districtId })),
    lastWeek,
    distinctDistricts: content.isDistricted(cityId),
    rng: createRng(seed),
  });
  if (picks.length === 0) return [];
  await IssueModel.insertMany(
    picks.map((p) => ({
      _id: issueDocId(cityId, weekDay, p.id),
      cityId,
      districtId: p.districtId,
      issueId: p.id,
      weekDay,
      order: p.order,
      seed,
      status: 'live',
      momentum: { vanguard: 0, collective: 0, alliance: 0 },
      result: null,
      resolvedAt: null,
    })),
    { session },
  );
  return picks.map((p) => ({
    docId: issueDocId(cityId, weekDay, p.id),
    issueId: p.id,
    districtId: p.districtId,
    order: p.order,
  }));
}

/**
 * §7.4 the Monday step: resolve last week's live Issues (the owner +3 in the Issue's place, the top
 * five's awards, the week's effect), then draw this week's two. `shares` holds each place's meter
 * (a district, or the home city) after the drift and is updated in place. Returns the city's new
 * `issues`.
 */
export async function issuesStep(i: {
  content: GameContent;
  cityId: string;
  d: DayKey;
  city: Pick<CityDoc, 'issues'>;
  shares: Map<string, OpinionShares>;
  homeFactionId: FactionId | null;
  at: Date;
  session: ClientSession;
}): Promise<CityIssues> {
  const { content, cityId, d, session, at } = i;
  const live = await IssueModel.find({ cityId, status: 'live', weekDay: { $lt: d } })
    .sort({ order: 1 })
    .session(session)
    .lean<IssueDoc[]>();
  // The last eight effects, ended ones too: each ended day's wage and Rested cap read their day's.
  const effects = [...(i.city.issues?.effects ?? [])];
  for (const doc of live) {
    const placeId = doc.districtId ?? cityId;
    const sh = i.shares.get(placeId);
    if (!sh) throw new Error(`no meter for "${placeId}"`);
    const r = resolveIssue({ momentum: doc.momentum, shares: sh });
    const result: IssueResultDoc = { ownerId: r.ownerId, by: r.by, opinion: null, top: [], effect: null };
    if (r.ownerId) {
      const owner = r.ownerId;
      const op = applyPersuasion(sh, {
        factionId: owner,
        swing: ISSUES.ownerSwing,
        ...(i.homeFactionId ? { homeFactionId: i.homeFactionId } : {}),
      });
      i.shares.set(placeId, op.shares);
      await writeLedger(
        content,
        [{ cityId, placeId, factionId: owner, swing: op.applied, kind: 'issue', ref: doc._id, day: d, at }],
        session,
      );
      const top = await Contribution.find({
        scope: `points|${doc._id}`,
        factionId: owner,
        amount: { $gt: 0 },
      })
        .sort({ amount: -1, lastAt: 1 })
        .limit(ISSUES.topFive)
        .session(session)
        .lean<ContributionDoc[]>();
      if (top.length > 0) {
        await Award.insertMany(
          top.map((t) => ({
            characterId: t.characterId,
            kind: 'issue',
            cityId,
            placeId,
            ref: doc._id,
            pc: ISSUES.topPc,
            title: null,
            amount: t.amount,
            bracket: null,
            day: d,
            creditedAt: null,
          })),
          { session },
        );
      }
      const effect = { fromDay: d, toDay: d + ISSUES.effectDays };
      Object.assign(result, {
        opinion: { applied: op.applied, before: sh[owner], after: op.shares[owner] },
        top: top.map((t) => ({ characterId: t.characterId, name: t.name, points: t.amount })),
        effect,
      });
      effects.push({ issueId: doc.issueId, docId: doc._id, ownerId: owner, ...effect });
    }
    const done = await IssueModel.updateOne(
      { _id: doc._id, status: 'live' },
      { $set: { status: r.ownerId ? 'owned' : 'lapsed', result, resolvedAt: at } },
      { session },
    );
    if (done.matchedCount === 0) throw new AlreadySettled();
  }
  const lastWeek = i.city.issues?.live.map((l) => l.issueId) ?? [];
  const drawn = await drawWeek(content, cityId, d, lastWeek, session);
  return { weekDay: d, live: drawn, effects: effects.slice(-8) };
}

/**
 * ADR 0029 §4: a city settled before slice 4 (a `world`, no `issues`) draws the week it is in, in
 * its own transaction, conditional on `issues` absent; no resolution.
 */
export async function bootstrapIssues(
  content: GameContent,
  cityId: string,
  weekDay: DayKey,
  session: ClientSession,
): Promise<void> {
  const city = await City.findById(cityId).session(session).lean<CityDoc>();
  if (!city?.world || city.issues) throw new AlreadySettled();
  const live = await drawWeek(content, cityId, weekDay, [], session);
  const done = await City.updateOne(
    { _id: cityId, issues: { $exists: false } },
    { $set: { issues: { weekDay, live, effects: [] } } },
    { session },
  );
  if (done.matchedCount === 0) throw new AlreadySettled();
}

/**
 * §7.5 the heroes at a count (cycle day 0): per place counted and per level bracket, the top
 * contributor of the election just counted (at least +0.5) gets an award (25 PC, the title until the
 * next count). Returns each place's scoreboard table (the top three per bracket), for the counted
 * election's result.
 */
export async function heroesStep(i: {
  cityId: string;
  places: ReadonlyArray<{ placeId: string; name: string; kind: 'district' | 'city' }>;
  /** The cycle counted (k − 1). */
  cycle: number;
  d: DayKey;
  /** The day the next count takes the title away. */
  untilDay: DayKey;
  session: ClientSession;
}): Promise<Map<string, ScoreboardTableView[]>> {
  const out = new Map<string, ScoreboardTableView[]>();
  for (const place of i.places) {
    const ref = electionKey(place.placeId, i.cycle);
    const docs = await Contribution.find({ scope: `influence|${ref}` })
      .session(i.session)
      .lean<ContributionDoc[]>();
    const rows = docs.map((c) => ({
      characterId: c.characterId.toHexString(),
      amount: c.amount,
      lastAt: c.lastAt.getTime(),
      level: c.level,
      doc: c,
    }));
    const named = heroes(rows);
    if (named.length > 0) {
      await Award.insertMany(
        named.map((h) => ({
          characterId: rows.find((r) => r.characterId === h.characterId)!.doc.characterId,
          kind: 'hero',
          cityId: i.cityId,
          placeId: place.placeId,
          ref,
          pc: HERO.pc,
          title: {
            label: `${place.kind === 'district' ? 'District' : 'City'} Hero, ${place.name}`,
            fromDay: i.d,
            untilDay: i.untilDay,
          },
          amount: h.amount,
          bracket: h.bracket,
          day: i.d,
          creditedAt: null,
        })),
        { session: i.session },
      );
    }
    const heroIds = new Set(named.map((h) => h.characterId));
    out.set(
      place.placeId,
      topByBracket(rows, 3).map((b) => ({
        bracket: b.bracket,
        rows: b.rows.map((r) => ({
          characterId: r.characterId,
          name: r.doc.name,
          factionId: r.doc.factionId,
          level: r.level,
          swing: r.amount / 1_000,
          you: false,
          hero: heroIds.has(r.characterId),
        })),
      })),
    );
  }
  return out;
}
