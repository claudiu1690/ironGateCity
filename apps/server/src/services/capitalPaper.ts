import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import {
  Award,
  City,
  Contribution,
  District,
  Election,
  IssueModel,
  Journey,
  contributionId,
} from '@irongate/db';
import type {
  AwardDoc,
  CharacterDoc,
  CityDoc,
  DistrictDoc,
  ElectionDoc,
  IssueDoc,
  JourneyDoc,
} from '@irongate/db';
import {
  FACTION_IDS,
  councilDay,
  dayKey,
  dayStart,
  electionKey,
  isMonday,
  nextMonday,
  pressureOn,
  weekOf,
} from '@irongate/rules';
import type {
  CapitalFacts,
  CapitalPlaceholder,
  CountRow,
  DayKey,
  FactionId,
  IssueRowView,
  PaperView,
  PoliticalFacts,
  PoliticalPlaceholder,
  RiskPlaceholder,
} from '@irongate/rules';
import { leaderOf } from './actionService';
import { districtWord } from './cityService';
import { cycleKeyOf } from './ledger';
import { groundswellOn } from './modifiers';
import { weekdayName } from './politicsService';
import { residenceOf } from './residence';

/**
 * The Morning Paper v4's live capital and Issue facts (slice-4 tech design §11.2–§11.3): read at
 * read from the city, district, Issue and award documents, as the views read them, so no edition
 * write is needed. Also the paper's Issues section (screens §7.1).
 */

type Vars = Partial<Record<PoliticalPlaceholder | CapitalPlaceholder | RiskPlaceholder, string>>;
type VarsByKind = NonNullable<PoliticalFacts['varsByKind']>;

const fname = (content: GameContent, f: FactionId) => content.faction(f).shortName;
const pts = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
const BRACKETS = ['1–15', '16–30', '31 and up'] as const;
const ord = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/** A city's Issue rows this week (public momentum, the leader, the effect line). */
export async function issueRowsOf(
  content: GameContent,
  cityId: string,
  city: Pick<CityDoc, 'issues'> | null,
  today: DayKey,
): Promise<IssueRowView[]> {
  const live = city?.issues?.weekDay === weekOf(today) ? city.issues.live : [];
  if (live.length === 0) return [];
  const docs = await IssueModel.find({ _id: { $in: live.map((l) => l.docId) } }).lean<IssueDoc[]>();
  return docs
    .sort((a, b) => a.order - b.order)
    .map((d) => {
      const issue = content.issue(d.issueId);
      return {
        issueId: d.issueId,
        name: issue?.name ?? d.issueId,
        cityId,
        districtId: d.districtId,
        placeName: d.districtId
          ? (content.district(d.districtId)?.quarter.name ?? d.districtId)
          : (content.city(cityId)?.name ?? cityId),
        leader: leaderOf(d.momentum),
        momentum: { ...d.momentum },
        effectLine: issue?.effectLine ?? '',
        ...(issue ? { blurb: issue.blurb, stances: { ...issue.stances } } : {}),
      };
    });
}

/**
 * Screens §7.1: the residence city's two, then the capital's, then the rest folded. Review 4 (answers
 * §23.2, ADR 0074): in a local edition the city the reader is in comes first, its rows marked
 * `local`, then the residence's (and the capital's when it is neither).
 */
export async function paperIssues(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  opts: { local?: string | null } = {},
): Promise<NonNullable<PaperView['issues']>> {
  const residence = residenceOf(c).cityId;
  const capital = content.nation.capitalId;
  const local = opts.local && opts.local !== residence ? opts.local : null;
  const ids = content.councilCities().map((x) => x.id);
  const docs = new Map(
    (await City.find({ _id: { $in: ids } }, { issues: 1 }).lean<CityDoc[]>()).map((d) => [d._id, d]),
  );
  const rowsOf = (id: string) => issueRowsOf(content, id, docs.get(id) ?? null, today);
  const first = [local, residence, capital].filter((x, i, all): x is string => !!x && all.indexOf(x) === i);
  const rows: IssueRowView[] = [];
  for (const id of first) rows.push(...(await rowsOf(id)).map((r) => (id === local ? { ...r, local: true } : r)));
  const more: IssueRowView[] = [];
  for (const id of ids) if (!first.includes(id)) more.push(...(await rowsOf(id)));
  return { newThisWeek: isMonday(today), settlesAt: dayStart(nextMonday(today)), rows, more };
}

/**
 * §11.3: the capital and Issue facts of `cityId`'s paper for this character, and their
 * placeholders. `personal` adds the character's own lines (a move, an arrival, a hero, a quote, the
 * Issue PC); `district` the residence district's lines (residents only: a visitor's Herald prints
 * neither the count nor the district line).
 */
export async function capitalFacts(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  today: DayKey,
  opts: { personal: boolean; district: boolean },
): Promise<{ facts: CapitalFacts; vars: Vars; varsByKind: VarsByKind }> {
  const capital = content.nation.capitalId;
  const r = residenceOf(c);
  const city = await City.findById(cityId).lean<CityDoc>();
  const vars: Vars = { faction: fname(content, c.factionId) };
  const varsByKind: VarsByKind = {};
  const facts: CapitalFacts = {
    registeredYesterday: false,
    firstCapitalArrivalYesterday: false,
    hero: null,
    issuePcYesterday: false,
    quotedYesterday: false,
    issuesDrawnToday: false,
    issueLeading: false,
    issueOpen: false,
    issueResolved: null,
    districtBattleground: false,
    districtBecameBattleground: false,
    districtLeftBattleground: false,
    groundswellStarted: false,
    districtLine: false,
    // Slice 5 (tech design §11.2): what the city's home faction lost to rivals yesterday, `{lost}`.
    moraleLostToRivals: pressureOn(city?.rivalPressure, today - 1) / 1_000,
  };
  vars.lost = (facts.moraleLostToRivals ?? 0).toFixed(1);

  if (opts.personal) {
    if (r.sinceDay === today - 1 && r.cityId === capital && r.districtId) {
      facts.registeredYesterday = true;
      vars.district = content.district(r.districtId)?.quarter.name ?? r.districtId;
      varsByKind.registeredYesterday = {
        district: vars.district,
        weekday: weekdayName(r.votesFromDay),
      };
    }
    if (c.firstCapitalArrivalAt && dayKey(c.firstCapitalArrivalAt.getTime()) === today - 1) {
      facts.firstCapitalArrivalYesterday = true;
      const j = await Journey.findOne({ characterId: c._id, to: capital }).sort({ n: 1 }).lean<JourneyDoc>();
      // Slice-4 fixes §5 (QA m4): the deck counts today's close races (the nation card's count).
      const close = await District.countDocuments({ cityId: capital, 'state.battleground': true });
      varsByKind.firstCapitalArrivalYesterday = {
        origin: content.city(j?.from ?? '')?.name ?? 'home',
        closeRaces: copy.capital.closeRacesOfFive(close),
      };
    }
    const awards = await Award.find({ characterId: c._id, day: today }).lean<AwardDoc[]>();
    const hero = awards.find((a) => a.kind === 'hero');
    if (hero) {
      facts.hero = hero.placeId === hero.cityId ? 'city' : 'district';
      varsByKind.heroYesterday = {
        district:
          hero.placeId === hero.cityId
            ? (content.city(hero.cityId)?.name ?? hero.cityId)
            : (content.district(hero.placeId)?.quarter.name ?? hero.placeId),
        swing: pts((hero.amount ?? 0) / 1_000),
        bracket: BRACKETS[(hero.bracket ?? 1) - 1]!,
      };
    }
    const issuePc = awards.find((a) => a.kind === 'issue');
    if (issuePc) {
      facts.issuePcYesterday = true;
      varsByKind.issuePcYesterday = {
        issueShort: content.issue(issuePc.ref.split(':').slice(2).join(':'))?.short ?? '',
      };
    }
    if (c.lastQuoted?.day === today - 1) {
      facts.quotedYesterday = true;
      varsByKind.quotedYesterday = { issueShort: content.issue(c.lastQuoted.issueId)?.short ?? 'the week' };
    }
  }

  // The Issues of the paper's city.
  const live = city?.issues?.weekDay === weekOf(today) ? city.issues.live : [];
  const docs = live.length
    ? await IssueModel.find({ _id: { $in: live.map((l) => l.docId) } }).lean<IssueDoc[]>()
    : [];
  const byOrder = (n: number) => docs.find((d) => d.order === n);
  const first = byOrder(1);
  const second = byOrder(2);
  const issueOf = (d: IssueDoc | undefined) => (d ? content.issue(d.issueId) : undefined);
  const placeNameOf = (d: IssueDoc | undefined) =>
    d?.districtId
      ? (content.district(d.districtId)?.quarter.name ?? d.districtId)
      : (content.city(cityId)?.name ?? '');
  if (isMonday(today)) {
    if (city?.issues?.weekDay === today && live.length > 0) {
      facts.issuesDrawnToday = true;
      varsByKind.issuesDrawnToday = {
        issue1: issueOf(first)?.name ?? '',
        issue2: issueOf(second)?.name ?? '',
        issue1Blurb: issueOf(first)?.blurb ?? '',
        issue2Blurb: issueOf(second)?.blurb ?? '',
        district2: placeNameOf(second),
      };
    }
    const resolved = await IssueModel.find({ cityId, weekDay: today - 7, status: { $ne: 'live' } })
      .sort({ order: 1 })
      .lean<IssueDoc[]>();
    const owned = resolved.find((d) => d.status === 'owned' && d.result?.ownerId);
    const lapsed = resolved.find(
      (d) => d.status === 'lapsed' && FACTION_IDS.every((f) => (d.momentum[f] ?? 0) === 0),
    );
    if (owned || lapsed) {
      facts.issueResolved = { owned: !!owned, lapsed: !!lapsed };
      if (owned) {
        const issue = content.issue(owned.issueId);
        const owner = owned.result!.ownerId!;
        varsByKind.issueResolvedToday = {
          faction: fname(content, owner),
          issueShort: issue?.short ?? '',
          stance: issue?.stances[owner] ?? '',
          effectLine: issue?.effectLine ?? '',
        };
      } else if (lapsed) {
        varsByKind.issueResolvedToday = { issueShort: content.issue(lapsed.issueId)?.short ?? '' };
      }
    }
  } else if (first) {
    const issue = issueOf(first);
    const leader = leaderOf(first.momentum);
    const order = [...FACTION_IDS].sort((a, b) => first.momentum[b] - first.momentum[a]);
    const common = { issue1Short: issue?.short ?? '', district: placeNameOf(first) };
    if (leader) {
      facts.issueLeading = true;
      varsByKind.issueLeading = {
        ...common,
        faction: fname(content, order[0]!),
        m1: String(first.momentum[order[0]!]),
        second: fname(content, order[1]!),
        m2: String(first.momentum[order[1]!]),
        third: fname(content, order[2]!),
        m3: String(first.momentum[order[2]!]),
      };
    } else if (FACTION_IDS.every((f) => first.momentum[f] === 0)) {
      facts.issueOpen = true;
      varsByKind.issueOpen = common;
    }
  }

  // The residence district's lines (a capital resident reading the Herald).
  if (opts.district && r.cityId === cityId && r.districtId) {
    const d = await District.findById(r.districtId).lean<DistrictDoc>();
    if (d) {
      const name = content.district(d._id)?.quarter.name ?? d._id;
      const ranked = [...FACTION_IDS].sort((a, b) => d.opinion[b] - d.opinion[a]);
      const fresh = d.state.day === today;
      facts.districtBattleground = d.state.battleground;
      facts.districtBecameBattleground = fresh && d.state.battleground && !d.state.previous.battleground;
      facts.districtLeftBattleground = fresh && !d.state.battleground && d.state.previous.battleground;
      facts.groundswellStarted = d.groundswell?.fromDay === today;
      facts.districtLine = true;
      const w = districtWord(d, groundswellOn(d, today));
      const top = ranked[0]!;
      const state =
        w.word === 'closeRace'
          ? copy.capital.closeRace
          : w.word === 'held'
            ? copy.capital.heldBy(fname(content, top), d.opinion[top].toFixed(1))
            : w.word === 'leans'
              ? copy.capital.leans(fname(content, top))
              : 'Contested';
      const scope = `influence|${cycleKeyOf(content, cityId, d._id, today)}`;
      const rows = await Contribution.find({ scope }, { amount: 1, lastAt: 1 }).lean();
      const mine = rows.find((x) => x._id === contributionId(scope, c._id));
      const higher = mine
        ? rows.filter((x) => x.amount > mine.amount || (x.amount === mine.amount && x.lastAt < mine.lastAt))
            .length
        : 0;
      Object.assign(vars, {
        district: name,
        leader: fname(content, ranked[0]!),
        second: fname(content, ranked[1]!),
        third: fname(content, ranked[2]!),
        leaderShare: d.opinion[ranked[0]!].toFixed(1),
        secondShare: d.opinion[ranked[1]!].toFixed(1),
        thirdShare: d.opinion[ranked[2]!].toFixed(1),
        state,
        yourSwing: pts((mine?.amount ?? 0) / 1_000),
        yourRank: mine ? ord(higher + 1) : '–',
        contributors: String(rows.length),
      });
      if (d.groundswell?.fromDay === today) {
        varsByKind.groundswellStarted = { district: name, faction: fname(content, d.groundswell.factionId) };
      }
      // Cycle day 0: the count's line (seats by party, the district's winners, its turnout).
      const offset = content.city(cityId)?.council?.offset ?? 0;
      const cal = councilDay(today, offset);
      if (cal.cycleDay === 0) {
        const es = await Election.find({
          cityId,
          kind: 'district',
          cycle: cal.cycle - 1,
          status: 'counted',
        }).lean<ElectionDoc[]>();
        const seats: Record<FactionId, number> = { vanguard: 0, collective: 0, alliance: 0 };
        for (const e of es)
          for (const row of e.result!.rows as Array<CountRow & { factionId: FactionId }>)
            if (row.seated) seats[row.factionId] += 1;
        const mineE = es.find((e) => e._id === electionKey(r.districtId!, cal.cycle - 1));
        const winners = mineE
          ? (mineE.result!.rows as Array<CountRow & { factionId: FactionId }>)
              .filter((x) => x.seated)
              .map((x) => fname(content, x.factionId))
              .join(', ')
          : '';
        Object.assign(vars, {
          seatsV: String(seats.vanguard),
          seatsC: String(seats.collective),
          seatsA: String(seats.alliance),
          seatsFaction: String(seats[c.factionId]),
          winners,
        });
      }
    }
  }
  return { facts, vars, varsByKind };
}

/** The facts of a visitor's Herald: the capital's own city lines, no count and no district line. */
export function visitorFacts(
  base: { cycleDay: number; phase: PoliticalFacts['phase'] },
  capital: CapitalFacts,
) {
  return {
    seat: null,
    filedYesterday: false,
    termEnded: false,
    countToday: false,
    phase: base.phase,
    cycleDay: base.cycleDay,
    leftUnrest: false,
    capital,
  };
}
