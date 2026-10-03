import { isCheckedAction } from '@irongate/content';
import type { GameContent } from '@irongate/content';
import { Award, City, Contribution, District, IssueModel, OfficeTerm, contributionId } from '@irongate/db';
import type {
  CharacterDoc,
  CityDoc,
  ContributionDoc,
  DistrictDoc,
  IssueDoc,
  OfficeTermDoc,
} from '@irongate/db';
import {
  FACTION_IDS,
  actionEnergy,
  averageShares,
  computeCheck,
  councilDay,
  dayKey,
  findAdvancingItem,
  isNight,
  isPoliticalType,
  issueTags,
  itemSpec,
  jobLocks,
  jobPay,
  moraleState,
  ordinanceCheckBonuses,
  ordinanceTags,
  orderMatches,
  placeCheckBonuses,
  scoreboardLine,
  standingBonus,
  standingView,
  tier1Difficulty,
  topByBracket,
  trainingCost,
  trainingEnergy,
  weekOf,
} from '@irongate/rules';
import type {
  ActionDescriptor,
  ActionView,
  CharacterViewV5,
  CityView,
  DistrictStateView,
  DistrictView,
  FactionId,
  IssueRowView,
  ModifierSourceView,
  OpinionShares,
  OrdersState,
  PlaceModifiers,
  PlaceTagView,
  ScoreboardTableView,
} from '@irongate/rules';
import { gameError } from '../gameError';
import { leaderOf } from './actionService';
import { cycleKeyOf } from './ledger';
import { issueEffectsOn, modifiersFor, ordinanceIdOn } from './modifiers';
import { politicsSummary } from './politicsService';
import { residenceCityId, residenceCtx, residenceOf } from './residence';
import { residenceCardView } from './residenceService';
import { trainsFrom } from './travelService';
import {
  assetView,
  firstDayBonuses,
  namedStanding,
  preferredStat,
  standingSuccesses,
  toOrdersState,
  wornStats,
} from './views';

/** The order a tap here would advance (open first), or a done one it matched, for the ticket tag. */
function orderTag(
  content: GameContent,
  c: CharacterDoc,
  orders: OrdersState,
  a: ActionDescriptor,
): ActionView['order'] {
  const templates = content.ordersOf(c.factionId);
  let idx = findAdvancingItem(orders, templates, a, 'success', residenceCtx(c));
  if (idx < 0) {
    idx = orders.items.findIndex((item) => {
      const t = templates.find((x) => x.id === item.templateId);
      return t ? item.doneAt !== null && orderMatches(itemSpec(item, t).match, a, residenceCtx(c)) : false;
    });
  }
  if (idx < 0) return null;
  const item = orders.items[idx]!;
  const t = templates.find((x) => x.id === item.templateId)!;
  return {
    id: item.templateId,
    title: itemSpec(item, t).title,
    progress: Math.min(item.progress, item.target),
    target: item.target,
  };
}

/** Screens §5: the plate's word for a district. */
export function districtWord(
  d: Pick<DistrictDoc, 'opinion' | 'state'>,
  groundswell: DistrictStateView['groundswell'],
): DistrictStateView {
  const sorted = [...FACTION_IDS].sort((a, b) => d.opinion[b] - d.opinion[a]);
  const top = sorted[0]!;
  const leans = d.opinion[top] > d.opinion[sorted[1]!] ? top : null;
  return {
    battleground: d.state.battleground,
    controlledBy: d.state.controlledBy,
    groundswell,
    word: d.state.battleground ? 'closeRace' : d.state.controlledBy ? 'held' : leans ? 'leans' : 'contested',
    leans,
  };
}

/** The scoreboard of a place this election: the caller's line and the top three per bracket. */
async function scoreboardOf(
  content: GameContent,
  c: CharacterDoc,
  cityId: string,
  placeId: string,
  today: number,
): Promise<{ mine: { swing: number; rank: number; of: number } | null; table: ScoreboardTableView[] }> {
  const scope = `influence|${cycleKeyOf(content, cityId, placeId, today)}`;
  const rows = await Contribution.find({ scope }).lean<ContributionDoc[]>();
  const all = rows.map((r) => ({ amount: r.amount, lastAt: r.lastAt.getTime() }));
  const me = rows.find((r) => r._id === contributionId(scope, c._id));
  const line = scoreboardLine(me ? { amount: me.amount, lastAt: me.lastAt.getTime() } : null, all);
  const table = topByBracket(
    rows.map((r) => ({
      characterId: r.characterId.toHexString(),
      amount: r.amount,
      lastAt: r.lastAt.getTime(),
      level: r.level,
      doc: r,
    })),
    3,
  ).map((b) => ({
    bracket: b.bracket,
    rows: b.rows.map((r) => ({
      characterId: r.characterId,
      name: r.doc.name,
      factionId: r.doc.factionId,
      level: r.level,
      swing: r.amount / 1_000,
      you: r.characterId === c._id.toHexString(),
      hero: false,
    })),
  }));
  return { mine: line, table };
}

/**
 * Content city + live state + this character's odds, costs, orders and jobs (ADR 0003). Slice 3:
 * live costs, the Open Doors bonus and the ticket tags under the ordinance in force (ADR 0021), the
 * plate's morale and ordinance lines, and the HQ's council card. Slice 4: the capital's districts
 * (meters, states, Issues, seats, scoreboards, residence cards), the place tags on every ticket
 * (Issue, close race, comeback, members only), the city's Issues and effects, the Trains card and the
 * residence's Election card wherever the character is.
 */
export async function getCityView(
  content: GameContent,
  cityId: string,
  c: CharacterDoc,
  now: number,
  loaded?: CityDoc | null,
  places?: Map<string, CityDoc | null>,
): Promise<CityView> {
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });

  const docOf = async (id: string) =>
    places?.has(id)
      ? (places.get(id) ?? null)
      : loaded !== undefined && loaded?._id === id
        ? loaded
        : await City.findById(id).lean<CityDoc>();
  const state = await docOf(city.id);
  const residenceDoc = await docOf(residenceCityId(c));
  const capitalId = content.nation.capitalId;
  const capitalDoc = city.id === capitalId ? state : await docOf(capitalId);
  const districted = content.isDistricted(city.id);
  const districtDocs = districted
    ? new Map((await District.find({ cityId: city.id }).lean<DistrictDoc[]>()).map((d) => [d._id, d]))
    : new Map<string, DistrictDoc>();
  const values = wornStats(c, content);
  const difficulty = tier1Difficulty(city.role);
  const today = dayKey(now);
  const successes = standingSuccesses(c, city.id);
  const standing = namedStanding(content, city.id, successes);
  const bonus = standingBonus(successes, `${standing.name} in ${city.name}`);
  const orders = toOrdersState(c.orders);
  const liveOrders: OrdersState = orders.day === today ? orders : { day: today, items: [], allDoneAt: null };
  // Review 1 (§8.4): the First day row at home on the welcome day; a best-stat tie-break.
  const firstDay = firstDayBonuses(content, c, city.id, today);
  const prefer = preferredStat(content, c.factionId);
  const cityMods = modifiersFor(content, state, c.factionId, today, { cityId: city.id });
  const modsAt = (quarterId: string | undefined): PlaceModifiers =>
    districted && quarterId
      ? modifiersFor(content, state, c.factionId, today, {
          cityId: city.id,
          district: districtDocs.get(quarterId) ?? null,
        })
      : cityMods;
  const isResidence = city.id === residenceCityId(c);
  const ownHq = city.locations.find(
    (l) => l.kind === 'faction-hq' && (l.factionId ?? city.homeFactionId) === c.factionId,
  );
  // Review 2 (screens §1a), slice 4 (screens §7.2): the residence's Election card, wherever you are.
  const election = await politicsSummary(content, c, residenceDoc, now, today);
  const council = ownHq && isResidence ? election : null;
  const opinion: OpinionShares =
    districted && districtDocs.size > 0
      ? averageShares([...districtDocs.values()].map((d) => d.opinion))
      : (state?.opinion ?? city.baselineOpinion);
  const ordId = ordinanceIdOn(state, today);
  const ord = ordId ? content.ordinance(ordId) : undefined;
  const inForceTo = state?.ordinance?.id === ordId ? state?.ordinance?.toDay : undefined;

  // ADR 0029: this week's Issues of the city (public: momentum and the leader).
  const liveIds = state?.issues?.weekDay === weekOf(today) ? state.issues.live.map((l) => l.docId) : [];
  const issueDocs =
    liveIds.length > 0 ? await IssueModel.find({ _id: { $in: liveIds } }).lean<IssueDoc[]>() : [];
  const issueRows: IssueRowView[] = issueDocs
    .sort((a, b) => a.order - b.order)
    .map((d) => {
      const issue = content.issue(d.issueId);
      return {
        issueId: d.issueId,
        name: issue?.name ?? d.issueId,
        cityId: city.id,
        districtId: d.districtId,
        placeName: d.districtId ? (content.district(d.districtId)?.quarter.name ?? d.districtId) : city.name,
        leader: leaderOf(d.momentum),
        momentum: { ...d.momentum },
        effectLine: issue?.effectLine ?? '',
      };
    });
  // ADR 0030: the named sources in force, with their days left.
  const effects: ModifierSourceView[] = [
    ...(ord && inForceTo !== undefined
      ? [
          {
            sourceId: ord.id,
            name: ord.name,
            kind: 'ordinance' as const,
            effectLine: ord.effectLine,
            daysLeft: inForceTo - today,
          },
        ]
      : []),
    ...issueEffectsOn(state, today).map((e) => {
      const issue = content.issue(e.issueId);
      return {
        sourceId: e.issueId,
        name: issue?.name ?? e.issueId,
        kind: 'issue' as const,
        effectLine: issue?.effectLine ?? '',
        daysLeft: e.toDay - today,
      };
    }),
  ];

  // The capital's districts.
  let districts: DistrictView[] | null = null;
  if (districted) {
    const cal = councilDay(today, city.council?.offset ?? 0);
    const terms = await OfficeTerm.find({
      councilKey: `${city.id}:${cal.cycle}`,
      vacatedDay: null,
    }).lean<OfficeTermDoc[]>();
    const r = residenceOf(c);
    districts = [];
    for (const q of content.districtsOf(city.id)) {
      const d = districtDocs.get(q.id);
      if (!d) continue;
      const m = modsAt(q.id);
      districts.push({
        id: q.id,
        n: q.district!.n,
        name: q.name,
        blurb: q.blurb ?? '',
        frame: { ...q.frame },
        anchor: { ...q.district!.anchor },
        opinion: d.opinion,
        state: districtWord(d, m.place?.groundswell ?? null),
        issues: issueRows
          .filter((x) => x.districtId === q.id)
          .map((x) => ({ issueId: x.issueId, name: x.name, leader: x.leader, momentum: x.momentum })),
        seats: terms
          .filter((t) => t.districtId === q.id)
          .sort((a, b) => a.seat - b.seat)
          .map((t) => ({ name: t.holder.name, factionId: t.factionId!, local: t.holder.kind === 'npc' })),
        scoreboard: await scoreboardOf(content, c, city.id, q.id, today),
        residence: await residenceCardView(content, c, { cityId: city.id, districtId: q.id }, today, {
          capital: capitalDoc,
          residence: residenceDoc,
        }),
        you: { resident: r.cityId === city.id && r.districtId === q.id },
      });
    }
  }
  const homeScoreboard = districted ? null : await scoreboardOf(content, c, city.id, city.id, today);
  // eslint-disable-next-line no-restricted-properties -- the faction's home: the way back
  const atHome = !districted && city.id === c.homeCityId;
  const trains = (location: { kind: string }) =>
    city.id === capitalId && location.kind === 'station' && c.cityId === city.id
      ? trainsFrom(content, c, state, today)
      : null;

  return {
    id: city.id,
    name: city.name,
    role: city.role,
    ...(city.homeFactionId ? { homeFactionId: city.homeFactionId } : {}),
    opinion,
    cityOpinion: opinion,
    election,
    morale: city.homeFactionId
      ? {
          factionId: city.homeFactionId,
          share: opinion[city.homeFactionId],
          state: moraleState(opinion[city.homeFactionId]),
        }
      : null,
    ordinance:
      ord && inForceTo !== undefined
        ? {
            ordinanceId: ord.id,
            name: ord.name,
            line: ord.line,
            effectLine: ord.effectLine,
            daysLeft: inForceTo - today,
          }
        : null,
    map: { day: assetView(content, city.map.day), night: assetView(content, city.map.night) },
    quarters: city.quarters.map((q) => ({ id: q.id, name: q.name, frame: { ...q.frame } })),
    ...(city.clouds ? { clouds: true } : {}),
    isNight: isNight(now),
    standing,
    districts,
    scoreboard: homeScoreboard
      ? {
          mine: homeScoreboard.mine
            ? { placeId: city.id, placeName: city.name, factionId: c.factionId, ...homeScoreboard.mine }
            : null,
        }
      : null,
    issues: issueRows,
    effects,
    residence: atHome
      ? await residenceCardView(content, c, { cityId: city.id, districtId: null }, today, {
          capital: capitalDoc,
          residence: residenceDoc,
        })
      : null,
    locations: city.locations.map((location, index) => {
      const m = modsAt(location.quarterId);
      const place = m.place;
      const membersOnly =
        location.factionId && location.factionId !== c.factionId ? location.factionId : null;
      const tagged = new Set<string>();
      const actions = location.actions.map((action): ActionView => {
        const descriptor: ActionDescriptor = {
          kind: isCheckedAction(action) ? 'checked' : 'training',
          actionId: action.id,
          type: action.type,
          locationId: location.id,
          cityId: city.id,
          ...(location.quarterId ? { districtId: location.quarterId } : {}),
          locationKind: location.kind,
        };
        const base = {
          id: action.id,
          name: action.name,
          type: action.type,
          order: orderTag(content, c, liveOrders, descriptor),
        };
        if (isCheckedAction(action)) {
          let locked: ActionView['locked'] = null;
          if (membersOnly) locked = { reason: 'MEMBERS_ONLY', need: 0, factionId: membersOnly };
          else if (action.requires?.level !== undefined && c.level < action.requires.level) {
            locked = { reason: 'LEVEL', need: action.requires.level };
          } else if (
            action.requires?.standing !== undefined &&
            standingView(successes).level < action.requires.standing
          ) {
            locked = { reason: 'STANDING', need: action.requires.standing };
          }
          const cost = actionEnergy(action.energy, action.type, m);
          // Slice 4 (screens §5.2): Issue · Close race · Comeback · Members only.
          const placeTags: PlaceTagView[] = [];
          for (const t of place ? issueTags(place.issues, descriptor) : []) {
            tagged.add(t.issueId);
            placeTags.push({ kind: 'issue', issueId: t.issueId, name: t.name, pct: 50 });
          }
          const political = isPoliticalType(action.type);
          if (place?.battleground && political) placeTags.push({ kind: 'closeRace', fxpPct: 25 });
          const g = place?.groundswell;
          if (g && political && g.factionId === c.factionId)
            placeTags.push({ kind: 'comeback', factionId: g.factionId, pct: g.pct });
          if (membersOnly) placeTags.push({ kind: 'membersOnly', factionId: membersOnly as FactionId });
          return {
            ...base,
            kind: 'checked',
            givesFxp: action.givesFxp,
            energy: cost,
            energy3: cost * 3,
            preview: computeCheck({
              stats: action.stats,
              values,
              difficulty,
              bonuses: [
                ...firstDay,
                ...(bonus ? [bonus] : []),
                ...ordinanceCheckBonuses(action.type, m),
                ...placeCheckBonuses(action.type, m),
              ],
              prefer,
            }),
            locked,
            tags: ordinanceTags({
              kind: 'checked',
              type: action.type,
              base: action.energy,
              givesFxp: action.givesFxp,
              m,
            }),
            placeTags,
          };
        }
        const from = c.stats[action.trains];
        return {
          ...base,
          kind: 'training',
          givesFxp: false,
          energy: trainingEnergy(trainingCost(from), m),
          tags: ordinanceTags({ kind: 'training', type: action.type, base: trainingCost(from), m }),
          energy3: null,
          preview: null,
          trains: { stat: action.trains, from, to: from + 1 },
          // Review 3 (GDD §8.5): the button is the title's verb, from content.
          verb: action.verb,
          locked: membersOnly ? { reason: 'MEMBERS_ONLY', need: 0, factionId: membersOnly } : null,
          placeTags: membersOnly ? [{ kind: 'membersOnly', factionId: membersOnly }] : [],
        };
      });
      return {
        id: location.id,
        name: location.name,
        kind: location.kind,
        blurb: location.blurb,
        // Review 2 (answers §2.4): "at the Union Hall" in a result's reason line.
        ...(location.ref ? { ref: location.ref } : {}),
        n: index + 1,
        map: { x: location.map.x, y: location.map.y },
        ...(location.quarterId ? { quarterId: location.quarterId } : {}),
        ...(location.factionId ? { factionId: location.factionId } : {}),
        issueIds: [...tagged],
        trains: trains(location),
        actions,
        jobs: content.jobsAt(location.id).map((job) => {
          const unmet = jobLocks(job.unlock, { level: c.level, stats: values });
          const held = c.job?.id === job.id;
          return {
            jobId: job.id,
            name: job.name,
            blurb: job.blurb,
            pay: jobPay(job, c.factionId),
            held,
            locked: unmet[0] ?? null,
            unmet,
            isSwitch: !!c.job && !held,
          };
        }),
        council: location.id === ownHq?.id ? council : null,
      };
    }),
  };
}

/** For the Me tab: this election's scoreboard lines (every place the caller moved this cycle). */
export async function scoreboardLines(
  content: GameContent,
  c: CharacterDoc,
  today: number,
): Promise<NonNullable<CityView['scoreboard']>['mine'][]> {
  const mine = await Contribution.find({ characterId: c._id, kind: 'influence' }).lean<ContributionDoc[]>();
  const out: NonNullable<CityView['scoreboard']>['mine'][] = [];
  for (const row of mine) {
    if (row.ref !== cycleKeyOf(content, row.cityId, row.placeId, today)) continue;
    const all = await Contribution.find({ scope: row.scope }, { amount: 1, lastAt: 1 }).lean<
      ContributionDoc[]
    >();
    const line = scoreboardLine(
      { amount: row.amount, lastAt: row.lastAt.getTime() },
      all.map((r) => ({ amount: r.amount, lastAt: r.lastAt.getTime() })),
    );
    if (!line) continue;
    out.push({
      placeId: row.placeId,
      placeName:
        row.placeId === row.cityId
          ? (content.city(row.cityId)?.name ?? row.cityId)
          : (content.district(row.placeId)?.quarter.name ?? row.placeId),
      factionId: row.factionId,
      ...line,
    });
  }
  return out;
}

/** Tech design §8.3: the Me tab's hero title, heroes by place and this election's scoreboard. */
export async function meExtras(
  content: GameContent,
  c: CharacterDoc,
  today: number,
): Promise<Pick<CharacterViewV5, 'hero' | 'heroes' | 'scoreboard'>> {
  const awards = await Award.find({ characterId: c._id, kind: 'hero' }).sort({ day: -1 }).lean();
  const current = awards.find((a) => a.title && a.title.fromDay <= today && today < a.title.untilDay);
  const byPlace = new Map<string, number>();
  for (const a of awards) byPlace.set(a.placeId, (byPlace.get(a.placeId) ?? 0) + 1);
  const lines = await scoreboardLines(content, c, today);
  return {
    hero: current?.title ? { title: current.title.label, untilDay: current.title.untilDay } : null,
    heroes: [...byPlace.entries()].map(([placeId, n]) => ({
      placeName: content.district(placeId)?.quarter.name ?? content.city(placeId)?.name ?? placeId,
      n,
    })),
    scoreboard: lines.filter((l): l is NonNullable<typeof l> => l !== null),
  };
}
