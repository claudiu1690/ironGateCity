import type { GameContent } from '@irongate/content';
import { City, Election } from '@irongate/db';
import type { CharacterDoc, CityDoc, ElectionDoc } from '@irongate/db';
import {
  COUNCIL,
  ambientFor,
  councilDay,
  dayStart,
  electionKey,
  fillTemplate,
  pressureOn,
  selectLocalLine,
  selectPoliticalHeadlines,
} from '@irongate/rules';
import type { CountRow, DayKey, LiveHeadline, LocalFacts, PaperView, PoliticalFacts } from '@irongate/rules';
import { capitalFacts, visitorFacts } from './capitalPaper';
import { ruleHeadlineFacts } from './politicsService';

/**
 * Review 4 (docs/tech/review-4.md §5.3, ADR 0074): a local edition's parts, composed at read for the
 * city the reader is in when it is not their paper's. Nothing here is stored. The local line (the
 * Herald's own city lines in the capital; one neutral `hl.local.*` line in a home city), the local
 * ambient line, and the local election's Courier line.
 */

/** The neutral local-line templates (answers §29.1): `cityId: '*'`. */
export const localTemplates = (content: GameContent) => content.headlines.filter((h) => h.cityId === '*');

/**
 * The capital's local line: the Herald's city lines a visitor read before review 4 (slice 4's visitor
 * block), selected with the visitor facts; the first by priority. The reader's own first arrival
 * in the capital is theirs (`firstCapitalArrivalYesterday`), so it carries over as before.
 */
async function capitalLine(
  content: GameContent,
  c: CharacterDoc,
  residenceFirstArrival: { fact: boolean; vars: Partial<Record<string, string>> | undefined },
  today: DayKey,
): Promise<LiveHeadline | null> {
  const capital = content.nation.capitalId;
  const cf = await capitalFacts(content, c, capital, today, { personal: false, district: false });
  cf.facts.firstCapitalArrivalYesterday = residenceFirstArrival.fact;
  const capDoc = await City.findById(capital).lean<CityDoc>();
  const cal = councilDay(today, content.city(capital)!.council!.offset);
  // The voting rework, phase 5: the capital's rule headlines (decided, the vote open) for a visitor too.
  const rf = await ruleHeadlineFacts(content, capital, today, null);
  const facts: PoliticalFacts = {
    ...visitorFacts({ cycleDay: cal.cycleDay, phase: cal.phase }, cf.facts),
    ruleFromToday: capDoc?.ordinance?.fromDay === today && capDoc.world?.bootstrappedDay !== today,
    rule: rf.rule,
    // `{rank3}` too (the candidates line names who can stand); slice 4's visitor block left it out.
    vars: {
      ...cf.vars,
      name: c.name,
      city: content.city(capital)!.name,
      rank3: content.faction(c.factionId).rankTitles[COUNCIL.standRank - 1]!,
    },
    varsByKind: {
      ...cf.varsByKind,
      ...rf.varsByKind,
      ...(residenceFirstArrival.vars ? { firstCapitalArrivalYesterday: residenceFirstArrival.vars } : {}),
    },
    until: {
      nominations: dayStart(cal.election.pollsFrom),
      polls: dayStart(cal.election.countDay),
      ...(rf.ruleEnds !== undefined ? { ruleEnds: rf.ruleEnds } : {}),
    },
  };
  return selectPoliticalHeadlines(content.politicalHeadlinesOf(capital), facts)[0] ?? null;
}

/** A home city's neutral local line (answers §29.1), from its own facts this morning. */
async function homeCityLine(
  content: GameContent,
  cityId: string,
  doc: CityDoc | null,
  today: DayKey,
): Promise<LiveHeadline | null> {
  const spec = content.city(cityId);
  const offset = spec?.council?.offset;
  if (!spec || offset === undefined) return null;
  const cal = councilDay(today, offset);
  const home = spec.homeFactionId ?? null;
  const vars: Partial<Record<string, string>> = { city: spec.name };
  const countToday = cal.cycleDay === 0;
  if (countToday) {
    const prev = await Election.findById(electionKey(cityId, cal.cycle - 1)).lean<ElectionDoc>();
    const result = prev?.status === 'counted' ? prev.result : null;
    if (result) {
      const rows = result.rows as CountRow[];
      vars.npcSeats = String(result.npcSeats);
      vars.playerSeats = String(rows.filter((r) => r.seated).length - result.npcSeats);
    }
  }
  const ruleFromToday =
    !!doc?.ordinance && doc.ordinance.fromDay === today && doc.world?.bootstrappedDay !== today;
  if (ruleFromToday && doc?.ordinance) {
    const o = content.ordinance(doc.ordinance.id);
    vars.ordinance = o?.name ?? '';
    vars.plainLine = o?.plainLine ?? '';
  }
  let moraleLost: number | null = null;
  let homeShare: number | null = null;
  if (home) {
    vars.faction = content.faction(home).shortName;
    moraleLost = pressureOn(doc?.rivalPressure, today - 1) / 1_000;
    vars.lost = moraleLost.toFixed(1);
    homeShare = (doc?.opinion ?? spec.baselineOpinion)?.[home] ?? 0;
    vars.share = (Math.round(homeShare * 10 + 1e-7) / 10).toFixed(1);
  }
  const facts: LocalFacts = {
    // A count with no stored result (a city bootstrapped this cycle) prints no seat line.
    countToday: countToday && vars.npcSeats !== undefined,
    phase: cal.phase,
    cycleDay: cal.cycleDay,
    ruleFromToday,
    moraleLost,
    homeShare,
    vars,
    until: { nominations: dayStart(cal.election.pollsFrom), polls: dayStart(cal.election.countDay) },
  };
  return selectLocalLine(localTemplates(content), facts);
}

export interface LocalParts {
  ambient: LiveHeadline | null;
  line: LiveHeadline | null;
}

/**
 * ADR 0074 §3–§4: the local line and the local ambient line of `cityId`'s edition this morning. The
 * ambient line is the one that city's own paper prints today (the settlement's rotation).
 */
export async function localParts(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  doc: CityDoc | null,
  today: DayKey,
  residenceFirstArrival: { fact: boolean; vars: Partial<Record<string, string>> | undefined },
): Promise<LocalParts> {
  const name = content.city(cityId)?.name ?? cityId;
  const t = ambientFor(content.headlinesOf(cityId), today);
  const ambient: LiveHeadline | null = t
    ? {
        templateId: t.id,
        group: t.group,
        priority: t.priority,
        headline: fillTemplate(t.headline, { city: name }),
        ...(t.deck ? { deck: fillTemplate(t.deck, { city: name }) } : {}),
      }
    : null;
  const line =
    cityId === content.nation.capitalId
      ? await capitalLine(content, c, residenceFirstArrival, today)
      : await homeCityLine(content, cityId, doc, today);
  return { ambient, line };
}

/**
 * Answers §23.2: the local city's election as a Courier line under the reader's own Election row,
 * not actionable: while its council takes names or is polling, with the boundary.
 */
export function localElection(content: GameContent, cityId: string, today: DayKey): PaperView['localElection'] {
  const spec = content.city(cityId);
  const offset = spec?.council?.offset;
  if (!spec || offset === undefined) return null;
  const cal = councilDay(today, offset);
  return {
    cityName: spec.name,
    phase: cal.phase,
    until: dayStart(cal.phase === 'nominations' ? cal.election.pollsFrom : cal.election.countDay),
  };
}
