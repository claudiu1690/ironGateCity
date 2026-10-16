import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { ActionLog, Candidacy, City, DossierEntry, LegacyEntry } from '@irongate/db';
import type { AwardDoc, CharacterDoc, CityDoc, DossierEntryDoc, LegacyEntryDoc, OfficeTermDoc, StoredPatron } from '@irongate/db';
import {
  BODYGUARD,
  DOSSIER,
  NO_MILESTONES,
  NO_PERKS,
  dayKey,
  dayStart,
  flatCounts,
  goneToday,
  informantReports,
  lastDay,
  legacyFromWindow,
  milestonesAfter,
  nextTier,
  patronDays,
  protegeLegacy,
  tierOf,
  toSpend,
} from '@irongate/rules';
import type {
  DayKey,
  ExposeOutcome,
  LegacyRow,
  LifeDesk,
  LifeLetter,
  Milestones,
  PatronId,
  PatronTier,
  StoredPatronState,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { landSettled } from './dossierService';
import type { SettledLanding } from './dossierService';
import { addLegacyInTx, legacyWords } from './legacyService';
import { advancePatrons, crossInTx } from './patronService';
import { weekdayName } from './lifeResult';
import { liveIssuesOf } from './modifiers';
import { residenceCityId, residenceOf } from './residence';

/**
 * Slice 8 phase B, lane 2 (T14, T16; tech design §3.11, §8.2 steps 4–8, §11.2; ADR 0053, 0055–0057):
 * the settlement's life steps, run inside the settlement's one transaction before its guarded write
 * (so a lost race rolls them back with it): patrons' Requests, Favour and tiers by the calendar
 * (`patronDays`), informants' reports and Monday's gossip (`landEntry`), Legacy from the window
 * (terms, awards credited now, the Unrest prize's +2, Protégé), the milestones, and the edition's
 * stored life lines, desk rows and Letters. Rested at boundaries is the settlement's projection
 * (`restOn`, T9) and the Monday perk is `settleDays`' `mondayPay`. Seasons are deferred.
 */

export interface LifeEdition {
  /** The stored conditions that hold (`PaperFacts.life.kinds`); the Letters' two are not among them. */
  kinds: string[];
  varsByKind: Record<string, Record<string, string>>;
  desk: LifeDesk;
  letters: LifeLetter[];
}

export interface LifeSettlement {
  /** Merged into the settlement's `$set` (patrons, milestones). */
  set: Record<string, unknown>;
  edition: LifeEdition;
}

const toState = (p: StoredPatron): StoredPatronState => ({
  id: p.id,
  favour: p.favour,
  firstVisitDay: p.firstVisitDay,
  requests: p.requests.map((r) => ({ ...r, doneAt: r.doneAt ? new Date(r.doneAt).getTime() : null })),
  next: p.next,
  tierDays: { ...(p.tierDays ?? {}) },
  favourDay: p.favourDay ?? null,
  discretionUntil: p.discretionUntil ?? null,
});

const tierWord = (t: PatronTier | null) => copy.life.patron.tiers[t ?? 'none'];

function perkLineOf(tier: PatronTier, patronId: string): string {
  const p = copy.life.patron.perks;
  if (tier === 'protege') return patronId === 'marr' ? p.protegeMarr : p.protegeCrane;
  return p[tier];
}

const milestonesOf = (c: CharacterDoc): Milestones => {
  const m = c.milestones;
  if (!m) return NO_MILESTONES;
  const t = (d: Date | null | undefined) => (d ? new Date(d).getTime() : null);
  return {
    caseFileAt: t(m.caseFileAt),
    chairVoteAt: t(m.chairVoteAt),
    nationalVoteAt: t(m.nationalVoteAt),
    listAt: t(m.listAt),
    deputyFromDay: m.deputyFromDay ?? null,
    completed: { ...NO_MILESTONES.completed, ...(m.completed ?? {}) },
  };
};

const yesterdayOf = (today: DayKey) => ({ from: new Date(dayStart(today - 1)), to: new Date(dayStart(today)) });

/** The settlement's life steps (`c` is the character before the boundary; `settled` not null). */
export async function settleLifeInTx(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  now: number,
  read: { terms: readonly OfficeTermDoc[]; awards: readonly AwardDoc[] },
): Promise<LifeSettlement> {
  const today = dayKey(now);
  const settled = c.day.settled ?? today - 1;
  const perks = { ...NO_PERKS, ...(c.legacy?.perks ?? {}) };
  const set: Record<string, unknown> = {};
  const legacyRows: LegacyRow[] = [];
  const landings: SettledLanding[] = [];
  const thanks: Array<{ patronId: string; requestId: string; favour: number }> = [];
  const crossings: Array<{ patronId: string; tier: PatronTier; favour: number }> = [];

  // (4) Patrons: Requests, Favour, tiers and Monday's gossip, by the calendar.
  const capitalId = content.nation.capitalId;
  const districts = content.districtsOf(capitalId).map((q) => q.id);
  let capital: CityDoc | null | undefined;
  const patrons = c.patrons ?? [];
  if (patrons.length > 0) {
    const next: StoredPatron[] = [];
    for (const p of patrons) {
      const spec = content.patron(p.id);
      if (!spec) {
        next.push(p);
        continue;
      }
      if (capital === undefined) capital = await City.findById(capitalId).session(session).lean<CityDoc>();
      const issue = liveIssuesOf(content, capitalId, capital, today)[0]?.issueId ?? null;
      const d = patronDays({
        state: toState(p),
        rotation: spec.requests.map((r) => ({ id: r.id, match: r.match, target: r.target, ...(r.minLevel ? { minLevel: r.minLevel } : {}) })),
        level: c.level,
        settled,
        today,
        perks,
        districts,
        liveIssue: () => issue,
      });
      for (const x of d.paid) thanks.push({ patronId: p.id, requestId: x.requestId, favour: x.favour });
      for (const x of d.crossed) {
        crossings.push({ patronId: p.id, tier: x.tier, favour: d.state.favour });
        if (x.tier === 'protege') legacyRows.push(protegeLegacy(p.id, x.day));
      }
      for (const g of d.gossipDays) {
        const landed = await landSettled(session, content, c, {
          kind: 'gossip',
          cityId: spec.cityId,
          category: spec.gossip,
          day: g,
          now,
          seed: `gossip:${c._id.toHexString()}:${p.id}`,
          patronId: p.id,
          daysLeft: 0,
        });
        if (landed) landings.push(landed);
      }
      next.push({
        ...p,
        favour: d.state.favour,
        requests: d.state.requests.map((r) => ({ ...r, doneAt: r.doneAt === null ? null : new Date(r.doneAt) })),
        next: d.state.next,
        tierDays: d.state.tierDays,
        thanks: d.paid.slice(-4).map((x) => ({ requestId: x.requestId, day: x.day })),
      });
    }
    set.patrons = next;
  }

  // (5) Informants: a report every second boundary for fourteen days, once each.
  const informants = await DossierEntry.find({
    characterId: c._id,
    status: 'informant',
    'informant.untilDay': { $gt: settled },
  })
    .session(session)
    .lean<DossierEntryDoc[]>();
  for (const f of informants) {
    const span = f.informant!;
    const reports = informantReports(span, settled, today);
    for (const r of reports) {
      const landed = await landSettled(session, content, c, {
        kind: 'informant',
        cityId: span.cityId,
        category: r.category,
        day: r.day,
        now,
        seed: `informant:${f._id.toHexString()}:${r.n}`,
        daysLeft: Math.max(0, span.untilDay - today),
      });
      if (landed) landings.push(landed);
    }
    if (reports.length > 0)
      await DossierEntry.updateOne(
        { _id: f._id, 'informant.reported': span.reported },
        { $set: { 'informant.reported': reports[reports.length - 1]!.n } },
        { session },
      );
  }

  // (6) Legacy from the window: completed terms by office, the awards credited now, Protégé.
  legacyRows.push(
    ...legacyFromWindow({
      settled,
      today,
      terms: read.terms.map((t) => ({
        id: t._id.toHexString(),
        office: t.office ?? 'council',
        toDay: t.toDay,
        completed: t.completed && (t.vacatedDay ?? null) === null,
        cityId: t.cityId ?? null,
      })),
      awards: read.awards.map((a) => ({ id: a._id.toHexString(), kind: a.kind as 'hero' | 'issue' | 'unrest', ref: a.ref, day: a.day })),
      survived: [],
    }),
  );
  const added = await addLegacyInTx(session, c._id, legacyRows);
  // T13 (lane 1): a crossing's piece (Protégé: the pen, the case) through `crossInTx`, after the
  // window's Legacy so its `protege:{patronId}` row is the one above (unique: nothing doubles); and
  // the entries the gossip and the informants landed count toward a Request that asks for entries.
  for (const x of crossings) await crossInTx(session, content, c._id, x.patronId as PatronId, [x.tier], today);
  const entryActs = landings.flatMap((l) => (l.landed && l.descriptor ? [{ a: l.descriptor, outcome: 'success' as const }] : []));
  if (entryActs.length > 0) {
    const r = advancePatrons(content, c, (set.patrons as StoredPatron[] | undefined) ?? patrons, entryActs, now);
    if (r.changed) set.patrons = r.patrons;
  }

  // (7) Milestones: completed terms by office, the first deputy term's day.
  const completedTerms = read.terms.filter(
    (t) => t.completed && (t.vacatedDay ?? null) === null && t.toDay > settled && t.toDay <= today,
  );
  const deputy = read.terms.find((t) => t.office === 'deputy' && t.fromDay <= today);
  const m0 = milestonesOf(c);
  const m1 = milestonesAfter(m0, {
    completedTerms: completedTerms.map((t) => ({ office: t.office ?? 'council' })),
    deputyFromDay: deputy?.fromDay ?? null,
  });
  // On a party list (a pick lost, or a list declared): read lazily until it is set.
  if (m0.listAt === null && (await Candidacy.exists({ characterId: c._id, kind: 'list' }).session(session)))
    set['milestones.listAt'] = new Date(now);
  if (JSON.stringify(m1.completed) !== JSON.stringify(m0.completed) || m1.deputyFromDay !== m0.deputyFromDay) {
    set['milestones.completed'] = m1.completed;
    set['milestones.deputyFromDay'] = m1.deputyFromDay;
  }

  // (8) The edition's life lines, desk rows and Letters.
  const legacyTotal = (c.legacy?.total ?? 0) + added.reduce((n, r) => n + r.points, 0);
  const edition = await lifeEdition(session, content, c, today, {
    landings,
    thanks,
    crossings,
    patrons: (set.patrons as StoredPatron[] | undefined) ?? patrons,
    legacyAdded: added,
    legacyTotal,
  });
  return { set, edition };
}

/** Tech design §11.2: the stored conditions and their fills; §11.1: the desk rows and the Letters. */
async function lifeEdition(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  i: {
    landings: readonly SettledLanding[];
    thanks: ReadonlyArray<{ patronId: string; requestId: string; favour: number }>;
    crossings: ReadonlyArray<{ patronId: string; tier: PatronTier; favour: number }>;
    patrons: readonly StoredPatron[];
    legacyAdded: readonly LegacyRow[];
    legacyTotal: number;
  },
): Promise<LifeEdition> {
  const yesterday = today - 1;
  const y = yesterdayOf(today);
  const isYesterday = (d: Date | null | undefined) => !!d && new Date(d) >= y.from && new Date(d) < y.to;
  const kinds: string[] = [];
  const v: Record<string, Record<string, string>> = {};
  const cityName = (id: string) => content.city(id)?.name ?? id;
  const residence = residenceCityId(c);
  const r = residenceOf(c);
  const street = r.districtId ? (content.district(r.districtId)?.quarter.name ?? cityName(residence)) : cityName(residence);
  const paper = content.city(residence)?.paper?.shortName ?? 'paper';

  // The Wardrobe: the first coat bought; recognised on rival ground (lane 1's firsts).
  if (isYesterday(c.firsts?.coat)) {
    const coatUid = c.equipment?.clothing;
    const coat = coatUid ? (c.inventory ?? []).find((x) => x.uid === coatUid) : undefined;
    kinds.push('coatBought');
    v.coatBought = { item: coat ? (content.item(coat.itemId)?.name ?? '') : '', charisma: String(c.stats.chaBase), street, paper };
  }
  if (isYesterday(c.firsts?.recognised)) {
    const coatUid = c.equipment?.clothing;
    const coat = coatUid ? (c.inventory ?? []).find((x) => x.uid === coatUid) : undefined;
    kinds.push('recognised');
    v.recognised = {
      city: cityName(c.today?.rivalCityId ?? c.cityId),
      office: copy.life.recognition.visitor,
      coat: (coat ? (content.item(coat.itemId)?.name ?? 'coat') : 'coat').toLowerCase(),
    };
  }

  // The exposé yesterday (the author's own paper; every other reader's line is live at read).
  const log = await ActionLog.findOne(
    { characterId: c._id, kind: 'expose', 'result.performedAt': { $gte: y.from.toISOString(), $lt: y.to.toISOString() } },
    { result: 1 },
  )
    .sort({ 'result.performedAt': -1 })
    .session(session)
    .lean();
  const out = (log?.result as { effects?: { expose?: ExposeOutcome } } | undefined)?.effects?.expose;
  if (out) {
    const kind = out.outcome === 'success' ? 'exposePrinted' : out.outcome === 'partial' ? 'exposeP3' : 'exposeSpiked';
    kinds.push(kind);
    v[kind] = exposeVars(content, out);
  }

  // The Dossier: a file bound yesterday; entries whose last fresh day is today.
  const file = await DossierEntry.findOne({ characterId: c._id, kind: 'file', day: yesterday }).session(session).lean<DossierEntryDoc>();
  if (file) {
    kinds.push('caseFileMade');
    v.caseFileMade = { subject: content.name(file.subjectId)?.name ?? file.subjectId };
  }
  const held = await DossierEntry.find({ characterId: c._id, kind: 'entry', status: 'held' }, { day: 1, subjectId: 1 })
    .session(session)
    .lean<Array<Pick<DossierEntryDoc, 'day' | 'subjectId'>>>();
  const staleTomorrow = held.filter((e) => e.day === today - (DOSSIER.freshDays - 1)).length;
  if (staleTomorrow > 0) {
    kinds.push('staleTomorrow');
    v.staleTomorrow = { n: String(staleTomorrow) };
  }

  // Patrons: thanks and tiers from this settlement.
  const pname = (id: string) => content.patron(id as 'crane')?.name ?? id;
  const lastThanks = i.thanks[i.thanks.length - 1];
  if (lastThanks) {
    const p = i.patrons.find((x) => x.id === lastThanks.patronId);
    const fav = p?.favour ?? 0;
    const nt = nextTier(fav);
    const req = content.request(lastThanks.requestId)?.request;
    kinds.push('requestThanks');
    v.requestThanks = {
      patron: pname(lastThanks.patronId),
      request: req?.title.replace('{district}', '') ?? lastThanks.requestId,
      favour: String(fav),
      tier: nt ? tierWord(nt.tier) : tierWord(tierOf(fav)),
      next: nt ? String(nt.at) : String(fav),
    };
  }
  const cross = i.crossings[i.crossings.length - 1];
  if (cross) {
    kinds.push('patronTier');
    v.patronTier = { tier: tierWord(cross.tier), patron: pname(cross.patronId), perkLine: perkLineOf(cross.tier, cross.patronId) };
  }

  // The flat: bought yesterday, due today, waiting since this morning.
  const flat = c.home?.flat ?? null;
  if (flat) {
    const until = weekdayName(flat.paidThroughDay);
    if (flat.boughtDay === yesterday) {
      kinds.push('flatBought');
      v.flatBought = { city: cityName(flat.cityId), restedLine: copy.life.knock.rested, until, paper };
    } else if (flat.paidThroughDay === today) {
      kinds.push('flatDue');
      v.flatDue = { street };
    } else if (flat.paidThroughDay === yesterday) {
      kinds.push('flatWaiting');
      v.flatWaiting = {};
    }
  }

  // Legacy: the largest entry added yesterday (an act's: an exposé, Protégé, a chapter) or in this settlement.
  const acted = await LegacyEntry.find({ characterId: c._id, day: yesterday }).session(session).lean<LegacyEntryDoc[]>();
  const rowsSeen = [
    ...i.legacyAdded,
    ...acted.filter((e) => !i.legacyAdded.some((r) => r.ref === e.ref)).map((e) => ({ ref: e.ref, kind: e.kind, points: e.points, day: e.day, params: e.params as LegacyRow['params'] })),
  ];
  const best = [...rowsSeen].sort((a, b) => b.points - a.points)[0];
  if (best) {
    const spend = toSpend({ total: i.legacyTotal, spent: c.legacy?.spent ?? 0 });
    kinds.push('legacyEntry');
    v.legacyEntry = {
      entry: legacyWords(content, { kind: best.kind, params: best.params, ref: best.ref }),
      total: String(i.legacyTotal),
      toSpend: String(spend),
    };
  }

  // A bodyguard's last day, and gone this morning (§24.5; lane 1's contract).
  const bg = c.bodyguard ?? null;
  if (bg) {
    if (lastDay(bg, today)) {
      kinds.push('bodyguardLast');
      v.bodyguardLast = { minder: bg.name };
    } else if (goneToday(bg, today)) {
      kinds.push('bodyguardGone');
      v.bodyguardGone = { minder: bg.name, price: String(weekPrice(bg.tier)) };
    }
  }

  // The Letters (design §10.2): Requests (one row each, open), informants' reports, the gossip.
  const letters: LifeLetter[] = [];
  for (const p of i.patrons)
    for (const q of p.requests) {
      if (q.doneAt || q.untilDay < today || q.arrivedDay > today) continue;
      const spec = content.request(q.id)?.request;
      if (!spec) continue;
      const district = q.params?.districtId ? (content.district(q.params.districtId)?.quarter.name ?? '') : '';
      const issue = q.params?.issueId ? (content.issue(q.params.issueId)?.name ?? '') : '';
      const fill = (s: string) =>
        s.replace('{district}', district).replace('{until}', weekdayName(q.untilDay)).replace('{issue}', issue);
      letters.push({
        kind: 'request',
        from: copy.life.patron.from(pname(p.id)),
        title: fill(spec.title),
        line: `${fill(spec.line)} · ${copy.life.patron.requestTag(weekdayName(q.untilDay))} · ${copy.life.patron.progress(q.progress, q.target)}`,
        patronId: p.id,
      });
    }
  for (const l of i.landings.filter((x) => x.kind === 'informant' && x.landed))
    letters.push({
      kind: 'informant',
      from: copy.life.dossier.paper.fromInformant,
      title: l.subject,
      line: `${l.line} · ${l.subject} · ${copy.life.dossier.category[l.category].toLowerCase()}. ${l.daysLeft} days of reports left.`,
    });
  for (const l of i.landings.filter((x) => x.kind === 'gossip' && x.landed))
    letters.push({
      kind: 'gossip',
      from: copy.life.dossier.paper.gossip(pname(l.patronId ?? ''), l.subject),
      title: l.subject,
      line: l.line,
      ...(l.patronId ? { patronId: l.patronId as 'crane' } : {}),
    });

  // The desk (design §10.3).
  const staleWhen = staleTomorrow > 0 ? 'tomorrow' : '';
  const ahead: string[] = [];
  for (const p of i.patrons) {
    const nt = nextTier(p.favour);
    if (nt && nt.at - p.favour <= 30) ahead.push(copy.life.ahead.patronTier(pname(p.id).split(' ').slice(-1)[0]!, tierWord(nt.tier), nt.at));
  }
  if (flat && flatCounts(flat, residenceCityId(c), today)) ahead.push(copy.life.ahead.rent(weekdayName(flat.paidThroughDay + 1)));
  if (bg && bg.paidThroughDay >= today) ahead.push(copy.life.ahead.minderLast(bg.name, weekdayName(bg.paidThroughDay)));
  const desk: LifeDesk = {
    dossier:
      held.length === 0 ? null : staleTomorrow > 0 ? copy.life.dossier.paper.desk(held.length, staleTomorrow, staleWhen) : copy.life.dossier.paper.deskNone(held.length),
    patrons:
      i.patrons.length === 0
        ? null
        : copy.life.patron.deskLine(
            patronDesk(i.patrons.find((p) => p.id === 'crane')),
            patronDesk(i.patrons.find((p) => p.id === 'marr')),
          ),
    sleep: !flat
      ? copy.life.home.deskRoom
      : flatCounts(flat, residenceCityId(c), today)
        ? copy.life.home.deskFlat(cityName(flat.cityId), weekdayName(flat.paidThroughDay))
        : copy.life.home.deskWaits(cityName(flat.cityId)),
    legacy: i.legacyTotal > 0 ? copy.life.legacy.deskLine(i.legacyTotal, toSpend({ total: i.legacyTotal, spent: c.legacy?.spent ?? 0 })) : null,
    ahead: ahead.slice(0, 3),
  };
  return { kinds, varsByKind: v, desk, letters };
}

/** The exposé's fills for its headlines (the author's stored line and every reader's live one). */
export function exposeVars(content: GameContent, out: ExposeOutcome): Record<string, string> {
  return {
    name: out.printed?.author ?? '',
    subject: out.subject,
    headlineLine: (out.printed?.line1 ?? '').replace(/\.$/, ''),
    line1: out.printed?.line1 ?? '',
    line2: out.printed?.line2 ?? '',
    party: content.faction(out.partyId).shortName,
    city: out.printed?.city ?? out.swing?.placeName ?? '',
  };
}

const patronDesk = (p: StoredPatron | undefined): string => {
  if (!p) return copy.life.patron.tiers.none;
  return `${copy.life.patron.tiers[tierOf(p.favour) ?? 'none']} ${p.favour}`;
};

const weekPrice = (tier: 1 | 2 | 3): number => BODYGUARD.tiers[tier].week;
