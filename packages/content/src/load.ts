import {
  CAPITAL_PLACEHOLDERS,
  FACTION_IDS,
  JOURNEY_PLACEHOLDERS,
  PLACEHOLDERS,
  POLITICAL_PLACEHOLDERS,
  RISK_PLACEHOLDERS,
  STORY_PLACEHOLDERS,
  TIME_TOKENS,
  isPoliticalCondition,
  isPoliticalTemplate,
  placeholdersIn,
} from '@irongate/rules';
import type {
  ChapterRules,
  FactionId,
  IssueMatch,
  ItemSpec,
  OrdinanceSpec,
  OriginSpec,
} from '@irongate/rules';
import { z } from 'zod';
import { ambitions } from './data/ambitions';
import { assets, avatars, missionCards, scenes } from './data/art';
import { candidates, irongateCandidates } from './data/candidates';
import { capitalHomeHeadlines } from './data/capitalHomeHeadlines';
import { ashford } from './data/cities/ashford';
import { coalport } from './data/cities/coalport';
import { duskwall } from './data/cities/duskwall';
import { irongate } from './data/cities/irongate';
import { factions } from './data/factions';
import { headlines } from './data/headlines';
import { held } from './data/held';
import { heraldHeadlines } from './data/heraldHeadlines';
import { issues } from './data/issues';
import { items } from './data/items';
import { irongateJobs, jobs } from './data/jobs';
import { journeyEvents } from './data/journeyEvents';
import { mapPins } from './data/mapPins';
import { nation } from './data/nation';
import { opponents } from './data/opponents';
import { ordinances } from './data/ordinances';
import { orderTemplates } from './data/orders';
import { origin } from './data/origin';
import { npcs, standingLevels } from './data/people';
import { politicalHeadlines } from './data/politicalHeadlines';
import { politics } from './data/politics';
import tiles from './data/tiles.json';
import { inPolygon } from './geometry';
import { slice5Problems } from './slice5';
import { Content, isCheckedAction } from './schemas';
import type {
  Action,
  Ambition,
  Asset,
  Chapter,
  City,
  Faction,
  HeadlineTemplate,
  HeldAction,
  Issue,
  Item,
  Job,
  JourneyEvent,
  Location,
  Mission,
  Nation,
  Npc,
  NpcCandidate,
  Opponent,
  Ordinance,
  OrderTemplate,
  Platform,
  Quarter,
  TilesEntry,
} from './schemas';
import type { MissionType } from '@irongate/rules';

/** Every data file, before validation. */
export const rawContent: unknown = {
  factions,
  cities: [coalport, duskwall, ashford, irongate],
  art: { assets, scenes, missionCards },
  tilePyramids: tiles,
  avatars,
  items,
  origin,
  ambitions,
  npcs,
  standingLevels,
  jobs: [...jobs, ...irongateJobs],
  orderTemplates,
  headlines: [...headlines, ...politicalHeadlines, ...capitalHomeHeadlines, ...heraldHeadlines],
  ordinances,
  candidates: [...candidates, ...irongateCandidates],
  politics,
  nation,
  journeyEvents,
  issues,
  opponents,
  held,
};

/**
 * Ordinance ids renamed (review 1: the Long Service Order; review 2: the Street Register and the
 * Street Fund, migration 005); a stored old id resolves to the new one.
 */
export const RENAMED_ORDINANCE_IDS: Readonly<Record<string, string>> = {
  'ord.shift-hours': 'ord.long-service',
  'ord.ward-register': 'ord.street-register',
  'ord.ward-fund': 'ord.street-fund',
};

/** Design §10.1: the ten ordinances of the home-city menu. */
export const DESIGN_ORDINANCE_IDS = [
  'ord.public-works',
  'ord.long-service',
  'ord.street-permits',
  'ord.rally-permits',
  'ord.reading-room',
  'ord.rest-day',
  'ord.open-doors',
  'ord.street-register',
  'ord.street-fund',
  'ord.public-meetings',
] as const;

/** Slice 4 (design §8.5): the eleventh rule, on every menu (the capital's is the ten plus it). */
export const TRAM_SUBSIDY_ID = 'ord.tram-subsidy';

/** Slice 4 (design §12, tech design §4.2): the slice-4 templates every home paper carries. */
export const CAPITAL_HOME_HEADLINE_NAMES = [
  'train-open',
  'issues-drawn',
  'issue-leading',
  'issue-open',
  'issue-resolved',
  'issue-lapsed',
  'issue-pc',
  'hero',
  'moved-away',
  'quoted',
] as const;

/** Slice 4 (design §9.6, §12): the Herald's templates, by id suffix (`hl.ig.<name>`). */
export const HERALD_HEADLINE_NAMES = [
  'welcome-resident',
  'first-arrival',
  'train-open',
  'seat-won',
  'seat-top',
  'seat-lost',
  'seat-lost-bloc',
  'seat-lost-tie',
  'filed',
  'on-ballot',
  'struck',
  'voted-won',
  'voted-lost',
  'voted-lost-tie',
  'moved',
  'seat-ended',
  'council-passed',
  'council-failed',
  'count',
  'polls-open',
  'nominations',
  'ordinance-city',
  'battleground',
  'battleground-new',
  'battleground-over',
  'groundswell',
  'district-line',
  'hero',
  'quoted',
  'issues-drawn',
  'issue-leading',
  'issue-open',
  'issue-resolved',
  'issue-lapsed',
  'issue-pc',
  // The slice-1 kinds, in the Herald's voice (design §12's stand-in row).
  'rank-up-2',
  'rank-up-3',
  'rank-up',
  'level-up',
  'level-up-quiet',
  'standing',
  'orders-done',
  'seniority-5',
  'seniority-10',
  'away',
  'away-no-job',
  'idle',
] as const;

/** Design §3, §19 Q2: what one outcome of a journey card may pay at most. */
export const JOURNEY_REWARD_CAPS = {
  xp: 45,
  fxp: 6,
  opinion: 0.05,
  momentum: 10,
  rested: 10,
  iron: 100,
} as const;

/** Design §8, §17: the political templates every home paper carries (by id suffix). */
export const POLITICAL_HEADLINE_NAMES = [
  'seat-won',
  'seat-top',
  'seat-lost',
  'seat-lost-tie',
  'filed',
  'on-ballot',
  'struck',
  'voted-won',
  'voted-lost',
  'voted-lost-tie',
  'moved',
  'seat-ended',
  'council-passed',
  'council-failed',
  'count',
  'stands-firm',
  'ordinance-city',
  'polls-open',
  'nominations',
] as const;

export class ContentError extends Error {
  override name = 'ContentError';
}

/** §4.3 of the slice-1 tech design: two hotspots closer than this are too close to tap. */
const MIN_HOTSPOT_DISTANCE = 0.03;
/** Maps v3 §2: a pin lies at least this far inside its quarter's frame. */
const FRAME_MARGIN = 0.02;
/** Slice 5 (tech design §4.3): the risk headlines' placeholders join the stored and the live sets. */
const ALLOWED_PLACEHOLDERS = new Set<string>([...PLACEHOLDERS, ...RISK_PLACEHOLDERS]);
/** Tech design §4.4: story texts have their own, separate list. */
const ALLOWED_STORY_PLACEHOLDERS = new Set<string>(STORY_PLACEHOLDERS);
/** Slice-3 tech design §4.3: political texts have their own list plus the client's time tokens. */
const ALLOWED_POLITICAL_PLACEHOLDERS = new Set<string>([
  ...POLITICAL_PLACEHOLDERS,
  ...TIME_TOKENS,
  // Slice 4 (tech design §4.3): the capital's and the Issues' live lines.
  ...CAPITAL_PLACEHOLDERS,
  // Slice 5: *Rival Callers*' {lost}.
  ...RISK_PLACEHOLDERS,
]);
/** Slice 4: a journey card's detail and texts. */
const ALLOWED_JOURNEY_PLACEHOLDERS = new Set<string>(JOURNEY_PLACEHOLDERS);
/** Slice 4 (design §4.2): the nation map's frame holds every city pin at least this far inside. */
const NATION_FRAME_MARGIN = 0.06;
/** GDD §1.2 pillar 7 (content §13.7, n9): an outcome text is at most 240 characters and 4 sentences. */
const OUTCOME_TEXT_MAX_CHARS = 240;
const OUTCOME_TEXT_MAX_SENTENCES = 4;

/** Sentences in a text: split after . ? or ! (and a closing quote), before whitespace. */
export function sentenceCount(text: string): number {
  return text
    .trim()
    .split(/(?<=[.?!]["'’”)]?)\s+/)
    .filter((part) => part.length > 0).length;
}

/**
 * Validate content with the Zod schemas (throws with the path of the bad field) and the
 * cross-checks the schemas can't express.
 */
export function parseContent(raw: unknown): Content {
  const parsed = Content.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(`Invalid content:\n${z.prettifyError(parsed.error)}`);
  }
  const content = parsed.data;
  const problems: string[] = [];

  const seen = new Set<string>();
  const unique = (kind: string, id: string) => {
    if (seen.has(id)) problems.push(`duplicate id "${id}" (${kind})`);
    seen.add(id);
  };

  // Art: ids unique, referenced ids exist with the right kind.
  const assetById = new Map<string, Asset>();
  for (const a of content.art.assets) {
    if (assetById.has(a.id)) problems.push(`duplicate asset id "${a.id}"`);
    assetById.set(a.id, a);
    if (a.crop && (a.crop.width !== a.width || a.crop.height !== a.height)) {
      problems.push(`asset "${a.id}": width/height must be the crop's size`);
    }
  }
  for (const a of content.art.assets) {
    if (a.kind === 'vector') {
      if (a.widths.length > 0) problems.push(`asset "${a.id}": a vector has no widths`);
      if (!a.source.endsWith('.svg')) problems.push(`asset "${a.id}": a vector's source must be an .svg`);
    } else if (a.widths.length === 0) {
      problems.push(`asset "${a.id}": needs at least one width`);
    }
    if (a.webpWidths?.some((w) => !a.widths.includes(w)))
      problems.push(`asset "${a.id}": webpWidths must be some of its widths`);
  }
  const needAsset = (where: string, id: string, kind: Asset['kind'] | Array<Asset['kind']>) => {
    const kinds = Array.isArray(kind) ? kind : [kind];
    const a = assetById.get(id);
    if (!a) problems.push(`${where} references unknown asset "${id}"`);
    else if (!kinds.includes(a.kind))
      problems.push(`${where} references "${id}", a ${a.kind}, not a ${kinds.join(' or ')}`);
  };
  for (const s of content.art.scenes) needAsset(`scene for ${s.locationKind}`, s.assetId, 'scene');
  // ADR 0024 (maps v3): every catalogue map has its tile pyramid, at the catalogue's size.
  for (const a of content.art.assets) {
    if (a.kind !== 'map') continue;
    const t = content.tilePyramids[a.id];
    if (!t) problems.push(`map "${a.id}" has no entry in tiles.json (run pnpm art:tiles)`);
    else if (t.width !== a.width || t.height !== a.height)
      problems.push(`map "${a.id}" is ${a.width} × ${a.height} but its tiles are ${t.width} × ${t.height}`);
  }

  for (const f of content.factions) unique('faction', f.id);
  const cityById = new Map(content.cities.map((c) => [c.id, c]));
  const locationById = new Map<string, { city: City; location: Location }>();
  const actionById = new Map<string, { city: City; location: Location; action: Action }>();

  const quarterIds = new Set<string>();
  for (const city of content.cities) {
    unique('city', city.id);
    if (city.id.includes('.')) problems.push(`city id "${city.id}" must not contain a dot`);
    needAsset(`cities.${city.id}.map.day`, city.map.day, 'map');
    needAsset(`cities.${city.id}.map.night`, city.map.night, 'map');
    const { vanguard, collective, alliance, neutral } = city.baselineOpinion;
    const sum = vanguard + collective + alliance + neutral;
    if (Math.abs(sum - 100) > 1e-9)
      problems.push(`cities.${city.id}.baselineOpinion sums to ${sum}, not 100`);
    if (city.role === 'home') {
      if (!city.homeFactionId) {
        problems.push(`cities.${city.id} is a home city without a homeFactionId`);
      } else {
        const faction = content.factions.find((f) => f.id === city.homeFactionId);
        if (faction?.homeCityId !== city.id) {
          problems.push(
            `cities.${city.id} is home to "${city.homeFactionId}", whose homeCityId is not "${city.id}"`,
          );
        }
      }
    } else if (city.homeFactionId) {
      problems.push(`cities.${city.id} is a battleground but has a homeFactionId`);
    }
    // Maps v3 §2: quarters are frames on the city's picture; every pin inside its own, with margin.
    const quarterById = new Map(city.quarters.map((q) => [q.id, q]));
    // Slice 5: quarters have their own id space (the design names Ashford's second quarter and its
    // wharf both `ashford.wharf`; a quarter is a route segment, a place a `?loc=`).
    for (const q of city.quarters) {
      if (quarterIds.has(q.id)) problems.push(`duplicate quarter id "${q.id}"`);
      quarterIds.add(q.id);
      if (!q.id.startsWith(`${city.id}.`))
        problems.push(`quarter "${q.id}" must be dotted under its city "${city.id}"`);
    }
    city.locations.forEach((location, i) => {
      unique('location', location.id);
      const quarter = quarterById.get(location.quarterId);
      if (!quarter) {
        problems.push(
          `location "${location.id}": quarterId "${location.quarterId}" is not a quarter of ${city.id}`,
        );
      } else {
        const { x0, y0, x1, y1 } = quarter.frame;
        const { x, y } = location.map;
        const e = 1e-9;
        if (
          x < x0 + FRAME_MARGIN - e ||
          x > x1 - FRAME_MARGIN + e ||
          y < y0 + FRAME_MARGIN - e ||
          y > y1 - FRAME_MARGIN + e
        )
          problems.push(
            `location "${location.id}": its pin (${x}, ${y}) is not ${FRAME_MARGIN} inside ${quarter.id}'s frame`,
          );
      }
      locationById.set(location.id, { city, location });
      if (!location.id.startsWith(`${city.id}.`)) {
        problems.push(`location "${location.id}" must be dotted under its city "${city.id}"`);
      }
      for (const other of city.locations.slice(i + 1)) {
        const d = Math.hypot(location.map.x - other.map.x, location.map.y - other.map.y);
        if (d < MIN_HOTSPOT_DISTANCE) {
          problems.push(`hotspots "${location.id}" and "${other.id}" are too close (${d.toFixed(3)})`);
        }
      }
      for (const action of location.actions) {
        unique('action', action.id);
        const texts = Object.entries(action.text) as Array<[string, { body: string }]>;
        for (const [outcome, t] of texts) {
          if (t.body.length > OUTCOME_TEXT_MAX_CHARS) {
            problems.push(
              `action "${action.id}" ${outcome} text is ${t.body.length} characters (at most ${OUTCOME_TEXT_MAX_CHARS})`,
            );
          }
          const n = sentenceCount(t.body);
          if (n > OUTCOME_TEXT_MAX_SENTENCES) {
            problems.push(
              `action "${action.id}" ${outcome} text has ${n} sentences (at most ${OUTCOME_TEXT_MAX_SENTENCES})`,
            );
          }
        }
        actionById.set(action.id, { city, location, action });
        if (!action.id.startsWith(`${location.id}.`)) {
          problems.push(`action "${action.id}" must be dotted under its location "${location.id}"`);
        }
      }
      // Slice 5 (ADR 0031): missions share the id space and the text rules.
      for (const mission of location.missions ?? []) {
        unique('mission', mission.id);
        if (!mission.id.startsWith(`${location.id}.`))
          problems.push(`mission "${mission.id}" must be dotted under its location "${location.id}"`);
        if (sentenceCount(mission.briefing) > OUTCOME_TEXT_MAX_SENTENCES)
          problems.push(`mission "${mission.id}" briefing has more than 4 sentences`);
        const texts: Array<[string, string]> = Object.entries(mission.text).map(
          ([o, t]) => [`${o} text`, t.body] as [string, string],
        );
        for (const [what, body] of texts) {
          if (body.length > OUTCOME_TEXT_MAX_CHARS)
            problems.push(`mission "${mission.id}" ${what} is ${body.length} characters (at most 240)`);
          const n = sentenceCount(body);
          if (n > OUTCOME_TEXT_MAX_SENTENCES)
            problems.push(`mission "${mission.id}" ${what} has ${n} sentences (at most 4)`);
        }
      }
    });
  }

  // Jobs (review 1: a wage, no shift action): each at a loaded location.
  const jobById = new Map<string, Job>();
  for (const job of content.jobs) {
    unique('job', job.id);
    jobById.set(job.id, job);
    if (!locationById.has(job.locationId))
      problems.push(`job "${job.id}": unknown location "${job.locationId}"`);
  }

  // NPCs.
  const npcById = new Map<string, Npc>();
  for (const npc of content.npcs) {
    unique('npc', npc.id);
    npcById.set(npc.id, npc);
    needAsset(`npc "${npc.id}".portrait`, npc.portrait, 'portrait');
  }

  // Items (tech design §4.3).
  const itemById = new Map<string, Item>();
  for (const item of content.items) {
    unique('item', item.id);
    itemById.set(item.id, item);
    if (item.slot === null && !item.keepsake)
      problems.push(`item "${item.id}" has no slot, so it must be a keepsake`);
    if (item.art !== 'faction-crest') needAsset(`item "${item.id}".art`, item.art, ['item', 'vector']);
  }
  const needItem = (where: string, id: string, slot?: 'clothing' | 'document') => {
    const item = itemById.get(id);
    if (!item) problems.push(`${where} references unknown item "${id}"`);
    else if (slot && item.slot !== slot) problems.push(`${where} references "${id}", which is not ${slot}`);
    return item;
  };

  for (const f of content.factions) {
    // Every home city is loaded from slice 2 and must point back (the slice-0 relaxation is gone).
    const home = cityById.get(f.homeCityId);
    if (!home) {
      problems.push(`factions.${f.id}.homeCityId "${f.homeCityId}" is not loaded`);
    } else {
      if (home.role !== 'home' || home.homeFactionId !== f.id) {
        problems.push(`factions.${f.id}.homeCityId "${f.homeCityId}" is not a home city of "${f.id}"`);
      }
      const hqs = home.locations.filter((l) => l.kind === 'faction-hq').length;
      if (hqs !== 1) problems.push(`cities.${home.id} needs exactly one faction-hq location, has ${hqs}`);
      if (!home.paper) problems.push(`cities.${home.id} is a home city without a paper`);
    }
    needAsset(`factions.${f.id}.crestArt`, f.crestArt, 'vector');
    needItem(`factions.${f.id}.kit.outfit`, f.kit.outfit, 'clothing');
    needItem(`factions.${f.id}.kit.card`, f.kit.card, 'document');
    const npc = npcById.get(f.secretary.npcId);
    if (!npc) problems.push(`factions.${f.id}.secretary: unknown npc "${f.secretary.npcId}"`);
    else if (npc.factionId !== f.id)
      problems.push(`factions.${f.id}.secretary "${npc.id}" is not of that faction`);
    for (const slot of ['A', 'B', 'C'] as const) {
      if (!content.orderTemplates.some((t) => t.factionId === f.id && t.slot === slot)) {
        problems.push(`factions.${f.id} has a secretary but no order template in slot ${slot}`);
      }
    }
    // ADR 0012, review 1: the welcome set names that faction's templates: slot A per best stat
    // (each a checked action in the home city that checks that stat), B, and C (Take a job).
    const welcome: Array<[string, string, 'A' | 'B' | 'C']> = [
      ['A.str', f.welcomeOrders.A.str, 'A'],
      ['A.int', f.welcomeOrders.A.int, 'A'],
      ['A.agi', f.welcomeOrders.A.agi, 'A'],
      ['B', f.welcomeOrders.B, 'B'],
      ['C', f.welcomeOrders.C, 'C'],
    ];
    for (const [key, id, slot] of welcome) {
      const t = content.orderTemplates.find((x) => x.id === id);
      if (!t || t.factionId !== f.id || t.slot !== slot) {
        problems.push(
          `factions.${f.id}.welcomeOrders.${key} "${id}" is not a ${f.id} template in slot ${slot}`,
        );
        continue;
      }
      if (slot === 'C' && !(t.match.kinds ?? []).includes('takeJob'))
        problems.push(`factions.${f.id}.welcomeOrders.C "${id}" must match takeJob`);
      if (slot === 'A') {
        const stat = key.slice(2);
        const first = t.match.actionIds?.[0];
        const hit = first ? actionById.get(first) : undefined;
        if (
          !hit ||
          hit.city.id !== f.homeCityId ||
          !isCheckedAction(hit.action) ||
          hit.action.stats[0] !== stat
        )
          problems.push(
            `factions.${f.id}.welcomeOrders.${key} "${id}" must name a home action that checks ${stat.toUpperCase()}`,
          );
      }
    }
  }

  // Story texts (tech design §4.3, §4.4): 240 characters, 4 sentences, story placeholders only.
  const checkStory = (where: string, text: string) => {
    if (text.length > OUTCOME_TEXT_MAX_CHARS)
      problems.push(`${where} is ${text.length} characters (at most 240)`);
    const n = sentenceCount(text);
    if (n > OUTCOME_TEXT_MAX_SENTENCES) problems.push(`${where} has ${n} sentences (at most 4)`);
    for (const p of placeholdersIn(text)) {
      if (!ALLOWED_STORY_PLACEHOLDERS.has(p)) problems.push(`${where}: unknown story placeholder {${p}}`);
    }
  };

  // The origin.
  const ambitionIds = new Set(content.ambitions.map((a) => a.id));
  const questions = content.origin.steps.flatMap((s) => s.questions);
  content.origin.steps.forEach((s, i) => {
    unique('origin step', s.id);
    needAsset(`origin.steps[${i}].art`, s.art, 'scene');
    needAsset(`origin.steps[${i}].portrait`, s.portrait, 'portrait');
    checkStory(`origin.steps[${i}].narrative`, s.narrative);
  });
  needAsset('origin.street.art', content.origin.street.art, 'scene');
  checkStory('origin.street.narrative', content.origin.street.narrative);
  for (const q of questions) {
    unique('origin question', q.id);
    const ids = new Set(q.answers.map((a) => a.id));
    if (ids.size !== q.answers.length) problems.push(`origin question "${q.id}" has duplicate answer ids`);
    for (const a of q.answers) {
      for (const e of a.effects) {
        if (e.kind === 'wear') needItem(`origin "${q.id}" ${a.id}`, e.itemId, 'clothing');
        if (e.kind === 'ambition' && !ambitionIds.has(e.ambitionId))
          problems.push(`origin "${q.id}" ${a.id}: unknown ambition "${e.ambitionId}"`);
      }
    }
  }
  const promise = questions.find((q) => q.answers.every((a) => a.effects.some((e) => e.kind === 'ambition')));
  const promised = promise?.answers.flatMap((a) => a.effects.filter((e) => e.kind === 'ambition')) ?? [];
  if (
    !promise ||
    promised.length !== 3 ||
    new Set(promised.map((e) => (e.kind === 'ambition' ? e.ambitionId : ''))).size !== 3
  ) {
    problems.push(
      'origin: one question must give each answer exactly one Ambition, naming three different Ambitions',
    );
  } else if (content.origin.steps[2].questions[0].id !== promise.id) {
    problems.push("origin: the promise (the Ambition question) must be step 3's first question");
  }
  const wishes = questions.find((q) => q.answers.every((a) => a.effects.some((e) => e.kind === 'wish')));
  const wished = new Set(
    wishes?.answers.flatMap((a) => a.effects.flatMap((e) => (e.kind === 'wish' ? [e.factionId] : []))) ?? [],
  );
  if (!wishes || wished.size !== FACTION_IDS.length)
    problems.push('origin: one question must carry a wish for each faction');
  content.origin.reference.forEach((r, i) => {
    const q = questions[i];
    if (!q || q.id !== r.questionId) problems.push(`origin.reference[${i}] must answer "${q?.id}" in order`);
    else if (!q.answers.some((a) => a.id === r.answerId))
      problems.push(`origin.reference[${i}]: unknown answer "${r.answerId}"`);
  });

  // Ambitions.
  for (const amb of content.ambitions) {
    unique('ambition', amb.id);
    amb.chapters.forEach((ch, i) => {
      if (ch.n !== i + 1)
        problems.push(`ambition "${amb.id}": chapters must be numbered 1, 2, … (found ${ch.n} at ${i + 1})`);
      if (!ch.story) return;
      const s = ch.story;
      const where = `ambition "${amb.id}" chapter ${ch.n}`;
      if (new Set(s.choose.choices.map((c) => c.id)).size !== 2)
        problems.push(`${where}: duplicate choice ids`);
      if (new Set(s.check.approaches.map((a) => a.id)).size !== s.check.approaches.length)
        problems.push(`${where}: duplicate approach ids`);
      const keep = needItem(`${where}.keepsake`, s.keepsake);
      if (keep && !keep.keepsake) problems.push(`${where}.keepsake "${keep.id}" is not a keepsake`);
      checkStory(`${where} choose`, s.choose.narrative);
      checkStory(`${where} check`, s.check.narrative);
      for (const [o, t] of Object.entries(s.result)) checkStory(`${where} ${o} text`, t.body);
      for (const c of s.choose.choices) checkStory(`${where} choice ${c.id}`, c.text);
    });
    const first = amb.chapters[0];
    if (!first?.story || first.requires)
      problems.push(`ambition "${amb.id}": chapter 1 must be playable with no requirement`);
    if (amb.chapters.length > amb.chaptersPlanned)
      problems.push(`ambition "${amb.id}" has more chapters than planned`);
  }

  // Avatars.
  if (new Set(content.avatars).size !== content.avatars.length) problems.push('avatars must be distinct');
  content.avatars.forEach((id, i) => needAsset(`avatars[${i}]`, id, 'avatar'));
  const factionIds = new Set(content.factions.map((f) => f.id));
  if (factionIds.size !== content.factions.length) problems.push('each faction must appear once');

  // Party orders.
  const checkText = (where: string, text: string) => {
    for (const p of placeholdersIn(text)) {
      if (!ALLOWED_PLACEHOLDERS.has(p)) problems.push(`${where}: unknown placeholder {${p}}`);
    }
  };
  for (const t of content.orderTemplates) {
    unique('order template', t.id);
    for (const m of [t.match]) {
      for (const id of m.actionIds ?? [])
        if (!actionById.has(id)) problems.push(`order "${t.id}": unknown action "${id}"`);
      for (const id of m.locationIds ?? [])
        if (!locationById.has(id)) problems.push(`order "${t.id}": unknown location "${id}"`);
      if (m.cityId && m.cityId !== 'home' && !cityById.has(m.cityId))
        problems.push(`order "${t.id}": city "${m.cityId}" is not loaded`);
    }
    // Slice-4 fixes §2: an order's placeholders are its own set (`{issue}`, `{city}`, `{verbs}`),
    // checked with the capital rules below.
  }

  // Headlines. Slice 3: a template uses political conditions only, or none; political ones use the
  // political placeholders and the time tokens.
  const checkPolitical = (where: string, text: string) => {
    for (const p of placeholdersIn(text)) {
      if (!ALLOWED_POLITICAL_PLACEHOLDERS.has(p))
        problems.push(`${where}: unknown political placeholder {${p}}`);
    }
  };
  for (const h of content.headlines) {
    unique('headline', h.id);
    if (!cityById.has(h.cityId)) problems.push(`headline "${h.id}": city "${h.cityId}" is not loaded`);
    if (isPoliticalTemplate(h)) {
      if (!h.when.every(isPoliticalCondition))
        problems.push(`headline "${h.id}" mixes political and slice-1 conditions`);
      checkPolitical(`headline "${h.id}"`, `${h.headline} ${h.deck ?? ''}`);
    } else {
      checkText(`headline "${h.id}"`, `${h.headline} ${h.deck ?? ''}`);
    }
  }
  for (const city of content.cities) {
    if (city.role !== 'home' || !city.paper) continue;
    const names = new Set(
      content.headlines
        .filter((h) => h.cityId === city.id && isPoliticalTemplate(h))
        .map((h) => h.id.slice(h.id.lastIndexOf('.') + 1)),
    );
    for (const n of POLITICAL_HEADLINE_NAMES) {
      if (!names.has(n)) problems.push(`cities.${city.id}: the paper has no political "${n}" headline`);
    }
  }

  // Slice 3: ordinances (ADR 0021; the bounds and one-per-kind are in the schema).
  const ordinanceIds = new Set<string>();
  for (const o of content.ordinances) {
    unique('ordinance', o.id);
    ordinanceIds.add(o.id);
  }
  for (const id of [...DESIGN_ORDINANCE_IDS, TRAM_SUBSIDY_ID]) {
    if (!ordinanceIds.has(id)) problems.push(`ordinances: the design's "${id}" is missing`);
  }

  // Slice 3: NPC slates (design §5.2).
  const secretaryNames = new Set(content.factions.map((f) => npcById.get(f.secretary.npcId)?.name));
  for (const c of content.candidates) {
    unique('npc candidate', c.id);
    if (secretaryNames.has(c.name)) problems.push(`candidate "${c.id}" shares a name with a secretary`);
  }
  const offsets = new Map<number, string>();
  for (const city of content.cities) {
    if (city.role === 'home' && !city.council)
      problems.push(`cities.${city.id} is a home city without a council`);
    if (city.council) {
      const other = offsets.get(city.council.offset);
      if (other)
        problems.push(`cities.${city.id} and ${other} share the council offset ${city.council.offset}`);
      offsets.set(city.council.offset, city.id);
      const slate = content.candidates.filter((c) => c.cityId === city.id);
      if (isDistricted(city)) {
        if (city.council.seats !== 10)
          problems.push(`cities.${city.id}: a council with districts has 10 seats`);
        // Slice 4 (design §8.3): two per faction per district, profile order in file order.
        for (const q of city.quarters) {
          for (const f of FACTION_IDS) {
            const two = slate.filter((c) => c.districtId === q.id && c.factionId === f);
            if (two.length !== 2) problems.push(`${q.id} has ${two.length} ${f} NPC candidates, not 2`);
            if (two.length === 2 && two[0]!.profile <= two[1]!.profile)
              problems.push(`candidates of ${q.id} (${f}): profiles must strictly descend in file order`);
          }
        }
        for (const c of slate) {
          if (!c.districtId || !city.quarters.some((q) => q.id === c.districtId))
            problems.push(`candidate "${c.id}" needs a districtId of ${city.id}`);
        }
      } else {
        if (city.council.seats !== 7) problems.push(`cities.${city.id}: a home council has 7 seats`);
        if (slate.length !== 9) problems.push(`cities.${city.id} has ${slate.length} NPC candidates, not 9`);
        for (const c of slate) {
          if (c.factionId !== city.homeFactionId)
            problems.push(`candidate "${c.id}" is not of ${city.id}'s home faction`);
          if (c.districtId !== undefined) problems.push(`candidate "${c.id}": ${city.id} has no districts`);
        }
        slate.forEach((c, i) => {
          const prev = slate[i - 1];
          if (prev && c.profile >= prev.profile)
            problems.push(`candidates of ${city.id}: profiles must strictly descend in file order (${c.id})`);
        });
      }
    }
  }
  const candidateNames = new Set<string>();
  for (const c of content.candidates) {
    if (!cityById.get(c.cityId)?.council) problems.push(`candidate "${c.id}": "${c.cityId}" has no council`);
    if (candidateNames.has(c.name)) problems.push(`candidate "${c.id}" shares the name "${c.name}"`);
    candidateNames.add(c.name);
  }

  // Slice 3: factions' platforms, branch motions and the Unrest pair (design §6.4, §10.2, §11.3).
  const crisisNamed = new Set<string>();
  for (const f of content.factions) {
    if (new Set(f.platforms.map((p) => p.id)).size !== 3)
      problems.push(`factions.${f.id}.platforms need three distinct ids`);
    if (!ordinanceIds.has(f.branchMotion))
      problems.push(`factions.${f.id}.branchMotion "${f.branchMotion}" is not an ordinance`);
    f.restoreOrders.forEach((id, i) => {
      const slot = (['A', 'B'] as const)[i]!;
      crisisNamed.add(id);
      const t = content.orderTemplates.find((x) => x.id === id);
      if (!t || t.factionId !== f.id || t.slot !== slot || t.use !== 'crisis' || t.doneFxp !== 40) {
        problems.push(
          `factions.${f.id}.restoreOrders[${i}] "${id}" must be a ${f.id} crisis template in slot ${slot} paying 40`,
        );
      }
    });
  }
  for (const t of content.orderTemplates) {
    if (t.use === 'crisis' && !crisisNamed.has(t.id))
      problems.push(`order "${t.id}" is a crisis template no faction names in restoreOrders`);
  }

  // Slice 3: the political result texts (screens §9): 240 characters, 4 sentences, the political
  // placeholders and the time tokens.
  for (const [act, t] of Object.entries(content.politics.results)) {
    const where = `politics.results.${act}`;
    if (t.body.length > OUTCOME_TEXT_MAX_CHARS) problems.push(`${where} is ${t.body.length} characters`);
    const n = sentenceCount(t.body);
    if (n > OUTCOME_TEXT_MAX_SENTENCES) problems.push(`${where} has ${n} sentences (at most 4)`);
    checkPolitical(where, `${t.headline} ${t.body} ${t.next}`);
  }

  problems.push(...slice4Problems(content, { cityById, locationById, actionById, ordinanceIds }));
  problems.push(...slice5Problems(content, { cityById, locationById, assetById, mapPins }));
  for (const city of content.cities) {
    if (city.paper && !content.headlines.some((h) => h.cityId === city.id && h.group === 'ambient')) {
      problems.push(`cities.${city.id} has a paper but no ambient headline`);
    }
  }

  if (problems.length > 0) {
    throw new ContentError(`Invalid content:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  return content;
}

export { inPolygon } from './geometry';

/** A city with districts (the capital): its quarters carry `district` (ADR 0027). */
const isDistricted = (city: City): boolean => city.quarters.some((q) => q.district !== undefined);

const sumShares = (s: { vanguard: number; collective: number; alliance: number; neutral: number }) =>
  s.vanguard + s.collective + s.alliance + s.neutral;

/** Slice 4 (tech design §4.2): the districts, HQs, the nation, the cards, the Issues, orders, papers. */
function slice4Problems(
  content: Content,
  idx: {
    cityById: Map<string, City>;
    locationById: Map<string, { city: City; location: Location }>;
    actionById: Map<string, { city: City; location: Location; action: Action }>;
    ordinanceIds: Set<string>;
  },
): string[] {
  const problems: string[] = [];
  const e = 1e-9;
  const inside = (
    p: { x: number; y: number },
    f: { x0: number; y0: number; x1: number; y1: number },
    m = 0,
  ) => p.x >= f.x0 + m - e && p.x <= f.x1 - m + e && p.y >= f.y0 + m - e && p.y <= f.y1 - m + e;

  // Districts (ADR 0027).
  for (const city of content.cities) {
    const districts = city.quarters.filter((q) => q.district);
    if (districts.length === 0) continue;
    if (districts.length !== city.quarters.length)
      problems.push(`cities.${city.id}: every quarter of a city with districts needs a district`);
    if (city.role !== 'battleground')
      problems.push(`cities.${city.id}: a city with districts is a battleground`);
    districts.forEach((q, i) => {
      const d = q.district!;
      if (d.n !== i + 1) problems.push(`${q.id}: district n must run 1…k in order (found ${d.n})`);
      if (Math.abs(sumShares(d.baselineOpinion) - 100) > 1e-9)
        problems.push(`${q.id}.baselineOpinion sums to ${sumShares(d.baselineOpinion)}, not 100`);
      if (!inside(d.anchor, q.frame)) problems.push(`${q.id}: its anchor is outside its frame`);
      if (!q.blurb) problems.push(`${q.id}: a district needs a blurb`);
      // The user's district lock (3 Oct 2026): the anchor inside the district's outline (slice 5:
      // the outline is the quarter's; pins and overlaps are checked for every city, slice5.ts).
      if (!q.outline) problems.push(`${q.id}: a district needs an outline`);
      else if (!inPolygon(d.anchor, q.outline)) problems.push(`${q.id}: its anchor is outside its outline`);
    });
    for (const f of [...FACTION_IDS, 'neutral'] as const) {
      const avg = districts.reduce((sum, q) => sum + q.district!.baselineOpinion[f], 0) / districts.length;
      if (Math.abs(avg - city.baselineOpinion[f]) > 0.0005)
        problems.push(`cities.${city.id}.baselineOpinion.${f} is not the average of its districts (${avg})`);
    }
  }

  // Locations: HQs carry their faction (members only), one per faction per city; pins = the survey.
  for (const city of content.cities) {
    const seenHq = new Set<string>();
    for (const l of city.locations) {
      if (l.kind === 'faction-hq') {
        if (!l.factionId) problems.push(`location "${l.id}": a faction-hq needs a factionId`);
        else {
          if (seenHq.has(l.factionId)) problems.push(`cities.${city.id} has two ${l.factionId} HQs`);
          seenHq.add(l.factionId);
          if (city.role === 'home' && l.factionId !== city.homeFactionId)
            problems.push(`location "${l.id}": a home city's HQ is its home faction's`);
        }
      } else if (l.factionId) {
        problems.push(`location "${l.id}": only a faction-hq is members only`);
      }
    }
    if (isDistricted(city) || city.quarters.length > 1) {
      const survey = new Map((mapPins[city.id]?.pins ?? []).map((p) => [p.id, p]));
      for (const l of city.locations) {
        const pin = survey.get(l.id);
        if (!pin || pin.x !== l.map.x || pin.y !== l.map.y)
          problems.push(`location "${l.id}": its pin is not its survey pin`);
      }
    }
  }

  // The nation (design §2).
  const n = content.nation;
  const survey = mapPins.nation?.pins ?? [];
  if (n.cities.map((c) => c.cityId).join() !== survey.map((p) => p.id).join())
    problems.push('nation.cities must be mapPins.nation, in order');
  for (const c of n.cities) {
    const pin = survey.find((p) => p.id === c.cityId);
    if (pin && (pin.x !== c.x || pin.y !== c.y)) problems.push(`nation.${c.cityId}: not at its survey pin`);
    if (!inside(c, n.frame, NATION_FRAME_MARGIN))
      problems.push(`nation.${c.cityId}: not ${NATION_FRAME_MARGIN} inside the nation frame`);
    const city = idx.cityById.get(c.cityId);
    if (c.service === 'open' && !city) problems.push(`nation.${c.cityId}: an open city must be content`);
    if (!city && !c.baselineOpinion)
      problems.push(`nation.${c.cityId}: a city with no content needs its baseline`);
    if (c.cityId === n.capitalId && c.minutes !== 0) problems.push('nation: the capital is 0 minutes away');
    if (c.cityId !== n.capitalId && c.minutes <= 0) problems.push(`nation.${c.cityId}: needs a journey time`);
    // The arrival point is the city's station pin on its own picture.
    const station = (mapPins[c.cityId]?.pins ?? []).find(
      (p) => p.id === `${c.cityId}.station` || p.id === `${c.cityId}.central-station`,
    );
    if (!station || station.x !== c.arrival.x || station.y !== c.arrival.y)
      problems.push(`nation.${c.cityId}: arrival must be the city's station pin`);
  }
  const capital = idx.cityById.get(n.capitalId);
  if (!capital || !isDistricted(capital))
    problems.push(`nation.capitalId "${n.capitalId}" must be a city with districts`);

  // The journey cards (design §3, §19 Q2).
  // Slice 5: each deck has exactly one card drawn first (the passenger, the checkpoint).
  for (const deck of ['ordinary', 'hostile'] as const) {
    const firsts = content.journeyEvents.filter((j) => j.deck === deck && j.first);
    if (firsts.length !== 1) problems.push(`journeyEvents: exactly one ${deck} card is drawn first`);
  }
  const story = (where: string, text: string) => {
    if (text.length > 240) problems.push(`${where} is ${text.length} characters (at most 240)`);
    // A card's quoted speech counts as part of its sentence (the setups are dialogue; 240 is the bound).
    if (sentenceCount(text.replace(/"[^"]*"/g, 'Q')) > 4) problems.push(`${where} has more than 4 sentences`);
    for (const p of placeholdersIn(text))
      if (!ALLOWED_JOURNEY_PLACEHOLDERS.has(p)) problems.push(`${where}: unknown placeholder {${p}}`);
  };
  const jevIds = new Set<string>();
  for (const j of content.journeyEvents) {
    if (!j.id.startsWith('jev.')) problems.push(`journey event "${j.id}" must be jev.*`);
    if (jevIds.has(j.id)) problems.push(`duplicate journey event "${j.id}"`);
    jevIds.add(j.id);
    story(`${j.id}.setup`, j.setup);
    story(`${j.id}.ignore`, j.ignore);
    if (new Set(j.choices.map((c) => c.id)).size !== j.choices.length)
      problems.push(`${j.id}: duplicate choice ids`);
    for (const c of j.choices) {
      const where = `${j.id}.${c.id}`;
      for (const p of placeholdersIn(c.detail))
        if (!ALLOWED_JOURNEY_PLACEHOLDERS.has(p))
          problems.push(`${where}.detail: unknown placeholder {${p}}`);
      if (c.stats && !c.partial) problems.push(`${where}: a checked choice needs a partial`);
      if (!c.stats && c.partial && !c.gate) problems.push(`${where}: an unchecked choice has no partial`);
      if (c.gate && (c.stats || !c.partial))
        problems.push(`${where}: a gate is on an unchecked choice with a success and a partial`);
      for (const [o, out] of [
        ['success', c.success],
        ['partial', c.partial],
      ] as const) {
        if (!out) continue;
        story(`${where}.${o}`, out.text.body);
        for (const [k, cap] of Object.entries(JOURNEY_REWARD_CAPS)) {
          const v = (out.rewards as Record<string, number | undefined>)[k] ?? 0;
          if (v > cap) problems.push(`${where}.${o}: ${k} ${v} is over the card cap ${cap}`);
        }
      }
      if (c.cost && (c.partial?.rewards.iron ?? 0) > c.cost.iron)
        problems.push(`${where}: a partial returns at most the stake`);
    }
  }

  // The Issues (design §9.5, ADR 0029).
  const issueIds = new Set<string>();
  const eligible = new Map<string, Array<{ id: string; districtId: string | null }>>();
  for (const iss of content.issues) {
    if (!iss.id.startsWith('issue.')) problems.push(`issue "${iss.id}" must be issue.*`);
    if (issueIds.has(iss.id)) problems.push(`duplicate issue "${iss.id}"`);
    issueIds.add(iss.id);
    for (const w of iss.where) {
      const city = idx.cityById.get(w.cityId);
      if (!city?.council) {
        problems.push(`issue "${iss.id}": "${w.cityId}" is not a council city`);
        continue;
      }
      if (isDistricted(city)) {
        if (!w.districtId || !city.quarters.some((q) => q.id === w.districtId))
          problems.push(`issue "${iss.id}" in ${city.id} needs one of its districts`);
      } else if (w.districtId) problems.push(`issue "${iss.id}": ${city.id} has no districts`);
      const list = eligible.get(city.id) ?? [];
      list.push({ id: iss.id, districtId: w.districtId ?? null });
      eligible.set(city.id, list);
      for (const f of w.feeds) {
        if (f.districtId !== undefined && f.districtId !== w.districtId)
          problems.push(`issue "${iss.id}": a feed's district must be the Issue's`);
        for (const id of f.locationIds ?? []) {
          const hit = idx.locationById.get(id);
          if (!hit || hit.city.id !== city.id)
            problems.push(`issue "${iss.id}": "${id}" is not a place in ${city.id}`);
          else if (w.districtId && hit.location.quarterId !== w.districtId)
            problems.push(`issue "${iss.id}": "${id}" is not in ${w.districtId}`);
        }
      }
    }
  }
  // Slice 5 (design §12.1): the deck grows to 24.
  if (content.issues.length !== 24) problems.push(`issues: the deck has ${content.issues.length}, not 24`);
  for (const city of content.cities) {
    if (!city.council) continue;
    const list = eligible.get(city.id) ?? [];
    if (list.length < 4) problems.push(`cities.${city.id} has ${list.length} eligible Issues (at least 4)`);
    if (isDistricted(city) && new Set(list.map((x) => x.districtId)).size < 2)
      problems.push(`cities.${city.id}: Issues in at least two districts`);
  }

  // Party orders (design §10): two capital templates in A and in B per faction; `{issue}` only on
  // issue-tagged orders; slot C rotation templates serve everyone.
  for (const f of FACTION_IDS) {
    for (const slot of ['A', 'B'] as const) {
      const n2 = content.orderTemplates.filter(
        (t) => t.factionId === f && t.slot === slot && t.residence === 'capital',
      ).length;
      if (n2 !== 2) problems.push(`factions.${f} has ${n2} capital orders in slot ${slot}, not 2`);
    }
  }
  for (const t of content.orderTemplates) {
    const used = placeholdersIn(`${t.title} ${t.line}`);
    if (used.includes('issue') && !t.match.issueTagged)
      problems.push(`order "${t.id}": {issue} only on an issue-tagged order`);
    // Slice-4 fixes §2 (QA m1): `{city}` and `{verbs}` resolved at read; `{verbs}` names training.
    if (used.includes('verbs') && !(t.match.kinds?.length === 1 && t.match.kinds[0] === 'training'))
      problems.push(`order "${t.id}": {verbs} only on a training order`);
    for (const ph of used)
      if (!['issue', 'city', 'verbs'].includes(ph)) problems.push(`order "${t.id}": unknown placeholder {${ph}}`);
    if (t.slot === 'C' && t.use === 'rotation' && t.residence !== 'any')
      problems.push(`order "${t.id}": a slot C rotation order serves every residence`);
    // Slice 5 (design §12.2): the slot-B mission order serves every residence too.
    if (t.slot !== 'C' && t.residence === 'any' && !(t.slot === 'B' && t.minLevel !== undefined))
      problems.push(`order "${t.id}": only slot C (and slot B's mission order) is for any residence`);
    const d = t.match.districtId;
    if (
      d !== undefined &&
      d !== 'home' &&
      !content.cities.some((c) => c.quarters.some((q) => q.id === d && q.district))
    )
      problems.push(`order "${t.id}": "${d}" is not a district`);
  }

  // The papers (design §9.6, §12).
  for (const city of content.cities) {
    if (!city.paper) continue;
    const names = new Set(
      content.headlines.filter((h) => h.cityId === city.id).map((h) => h.id.slice(h.id.lastIndexOf('.') + 1)),
    );
    const want = isDistricted(city) ? HERALD_HEADLINE_NAMES : CAPITAL_HOME_HEADLINE_NAMES;
    for (const name of want)
      if (!names.has(name)) problems.push(`cities.${city.id}: the paper has no "${name}" headline`);
  }
  if (!idx.ordinanceIds.has(TRAM_SUBSIDY_ID)) problems.push(`ordinances: "${TRAM_SUBSIDY_ID}" is missing`);
  return problems;
}

export interface LocatedAction {
  city: City;
  location: Location;
  action: Action;
}

/** Content plus id lookups. Built once; content is immutable at runtime. */
export interface GameContent extends Content {
  faction(id: FactionId): Faction;
  city(id: string): City | undefined;
  location(id: string): { city: City; location: Location } | undefined;
  action(id: string): LocatedAction | undefined;
  job(id: string): Job | undefined;
  jobsAt(locationId: string): Job[];
  npc(id: string): Npc | undefined;
  asset(id: string): Asset;
  /** ADR 0024: a map's tile pyramid, or undefined (not tiled). */
  tiles(id: string): TilesEntry | undefined;
  item(id: string): Item | undefined;
  /** What the rules need of an item (worn CHA, keepsakes). */
  itemSpec(id: string): ItemSpec | undefined;
  ambition(id: string): Ambition | undefined;
  chapter(ambitionId: string, n: number): Chapter | undefined;
  /** What the rules need of a chapter; undefined when content has no such chapter. */
  chapterRules(ambitionId: string, n: number): ChapterRules | undefined;
  /** The origin's questions in order, for `resolveOrigin`. */
  originSpec: OriginSpec;
  /**
   * The faction's HQ location in `cityId` (default: its home city, where there is exactly one,
   * checked at load), or undefined when that city has none of the faction's.
   */
  hqOf(factionId: FactionId, cityId?: string): { city: City; location: Location };
  /** One faction's order templates, in file order. */
  ordersOf(factionId: FactionId): OrderTemplate[];
  /** One city's headline templates, political ones excluded (the settlement's selector). */
  headlinesOf(cityId: string): HeadlineTemplate[];
  standingNames: string[];
  // Slice 3.
  ordinance(id: string): Ordinance | undefined;
  /** What the rules need of an ordinance (ADR 0021). */
  ordinanceSpec(id: string): OrdinanceSpec | undefined;
  /** The ten, in menu order. */
  ordinancesMenu(): Ordinance[];
  candidate(id: string): NpcCandidate | undefined;
  /** Cities with a council (the three home cities in slice 3). */
  councilCities(): City[];
  platform(factionId: FactionId, id: string): Platform | undefined;
  /** One city's political headline templates (ADR 0023), in file order. */
  politicalHeadlinesOf(cityId: string): HeadlineTemplate[];
  // Slice 4 (tech design §4.1).
  nationCity(cityId: string): Nation['cities'][number] | undefined;
  journeyEvent(id: string): JourneyEvent | undefined;
  /** The card ids in file order (the first-journey card is one of them). */
  journeyDeck(): string[];
  issue(id: string): Issue | undefined;
  /** The Issues a city can draw, with its district there and the feeds there, in file order. */
  issuesFor(cityId: string): Array<{ issue: Issue; districtId: string | null; feeds: IssueMatch[] }>;
  /** A capital district (a quarter with `district`) and its city. */
  district(id: string): { city: City; quarter: Quarter } | undefined;
  /** A city's districts in pin order ([] for a city without). */
  districtsOf(cityId: string): Quarter[];
  isDistricted(cityId: string): boolean;
  /**
   * NPC candidates of a place: a home city's nine (profile order), or a district's six (with
   * `factionId`, that faction's two).
   */
  slateOf(placeId: string, factionId?: FactionId): NpcCandidate[];
  /** The capital's menu: the ten plus the Tram Subsidy (every menu has it, design §8.5). */
  irongateMenu(): Ordinance[];
  capitalCity(): City;
  // Slice 5 (tech design §4.1).
  mission(id: string): LocatedMission | undefined;
  /** A place's missions, in content order ([] for none). */
  missionsAt(locationId: string): Mission[];
  opponent(id: string): Opponent | undefined;
  /** A home city's opponents for a visitor's tier-1 run-in ([] elsewhere). */
  runInPoolOf(cityId: string): string[];
  /** The cells and the infirmary of a city, located (undefined for a city without). */
  servicesOf(cityId: string): { cells: { city: City; location: Location }; infirmary: { city: City; location: Location } } | undefined;
  heldAction(kind: 'cells' | 'infirmary'): HeldAction;
  quartersOf(cityId: string): Quarter[];
  quarterOf(locationId: string): Quarter | undefined;
  /** The hostile deck's rotation (the checkpoint, the informer, the conductor), file order. */
  hostileRotation(): string[];
  /** The first rival trip's card (the checkpoint). */
  hostileFirst(): string;
  /** *Your name is on a list* and its Heat (outside the rotation). */
  listedCard(): { id: string; heatAtLeast: number };
  /** The rung-4 mission card of a type (an asset id). */
  missionCard(type: MissionType): string;
}

export interface LocatedMission {
  city: City;
  location: Location;
  mission: Mission;
}

export function indexContent(content: Content): GameContent {
  const factions = new Map(content.factions.map((f) => [f.id, f]));
  const cities = new Map<string, City>();
  const locations = new Map<string, { city: City; location: Location }>();
  const actions = new Map<string, LocatedAction>();
  const missions = new Map<string, LocatedMission>();
  for (const city of content.cities) {
    cities.set(city.id, city);
    for (const location of city.locations) {
      locations.set(location.id, { city, location });
      for (const action of location.actions) actions.set(action.id, { city, location, action });
      for (const mission of location.missions ?? []) missions.set(mission.id, { city, location, mission });
    }
  }
  const jobs = new Map(content.jobs.map((j) => [j.id, j]));
  const npcs = new Map(content.npcs.map((n) => [n.id, n]));
  const assets = new Map(content.art.assets.map((a) => [a.id, a]));
  const items = new Map(content.items.map((i) => [i.id, i]));
  const ambitionsById = new Map(content.ambitions.map((a) => [a.id, a]));
  const ordinancesById = new Map(content.ordinances.map((o) => [o.id, o]));
  const candidatesById = new Map(content.candidates.map((c) => [c.id, c]));
  const districts = new Map<string, { city: City; quarter: Quarter }>();
  for (const city of content.cities)
    for (const quarter of city.quarters) if (quarter.district) districts.set(quarter.id, { city, quarter });
  const chapter = (ambitionId: string, n: number) =>
    ambitionsById.get(ambitionId)?.chapters.find((c) => c.n === n);
  return {
    ...content,
    item: (id) => items.get(id),
    itemSpec: (id) => {
      const i = items.get(id);
      return i ? { id: i.id, slot: i.slot, cha: i.cha, keepsake: i.keepsake } : undefined;
    },
    ambition: (id) => ambitionsById.get(id),
    chapter,
    chapterRules: (ambitionId, n) => {
      const ch = chapter(ambitionId, n);
      if (!ch) return undefined;
      const s = ch.story;
      const none = { xp: 0, fxp: 0, iron: 0 };
      return {
        n: ch.n,
        ...(ch.requires ? { requires: { ...ch.requires } } : {}),
        playable: s !== undefined,
        choices: s ? s.choose.choices.map((c) => ({ id: c.id, flag: c.flag })) : [],
        approaches: s ? s.check.approaches.map((a) => ({ id: a.id, stats: a.stats })) : [],
        difficulty: s?.check.difficulty ?? 0,
        energy: s?.check.energy ?? 0,
        rewards: s ? s.rewards : { success: none, partial: none, failure: none },
      };
    },
    originSpec: {
      questions: content.origin.steps.flatMap((s) =>
        s.questions.map((q) => ({
          id: q.id,
          answers: q.answers.map((a) => ({ id: a.id, effects: a.effects })),
        })),
      ),
    },
    hqOf: (factionId, cityId) => {
      const city = cities.get(cityId ?? factions.get(factionId)!.homeCityId)!;
      const hq =
        city.locations.find((l) => l.kind === 'faction-hq' && l.factionId === factionId) ??
        city.locations.find((l) => l.kind === 'faction-hq' && l.factionId === undefined);
      return { city, location: hq! };
    },
    faction: (id) => {
      const f = factions.get(id);
      if (!f) throw new ContentError(`unknown faction "${id}"`);
      return f;
    },
    city: (id) => cities.get(id),
    location: (id) => locations.get(id),
    action: (id) => actions.get(id),
    job: (id) => jobs.get(id),
    jobsAt: (locationId) => content.jobs.filter((j) => j.locationId === locationId),
    npc: (id) => npcs.get(id),
    asset: (id) => {
      const a = assets.get(id);
      if (!a) throw new ContentError(`unknown asset "${id}"`);
      return a;
    },
    tiles: (id) => content.tilePyramids[id],
    ordersOf: (factionId) => content.orderTemplates.filter((t) => t.factionId === factionId),
    headlinesOf: (cityId) => content.headlines.filter((h) => h.cityId === cityId && !isPoliticalTemplate(h)),
    standingNames: content.standingLevels.map((s) => s.name),
    // Review 1: a city or order paper stored before the rename still says 'ord.shift-hours'.
    ordinance: (id) => ordinancesById.get(RENAMED_ORDINANCE_IDS[id] ?? id),
    ordinanceSpec: (id) => {
      const o = ordinancesById.get(id);
      return o ? { id: o.id, name: o.name, effects: o.effects } : undefined;
    },
    ordinancesMenu: () => [...content.ordinances],
    slateOf: (placeId, factionId) =>
      content.candidates.filter(
        (c) =>
          (c.districtId === placeId || (c.cityId === placeId && c.districtId === undefined)) &&
          (factionId === undefined || c.factionId === factionId),
      ),
    candidate: (id) => candidatesById.get(id),
    councilCities: () => content.cities.filter((c) => c.council !== undefined),
    platform: (factionId, id) => factions.get(factionId)?.platforms.find((p) => p.id === id),
    politicalHeadlinesOf: (cityId) =>
      content.headlines.filter((h) => h.cityId === cityId && isPoliticalTemplate(h)),
    nationCity: (cityId) => content.nation.cities.find((c) => c.cityId === cityId),
    journeyEvent: (id) => content.journeyEvents.find((j) => j.id === id),
    // Slice 5: the ordinary deck only (the hostile cards are drawn on the way to rival ground).
    journeyDeck: () => content.journeyEvents.filter((j) => j.deck === 'ordinary').map((j) => j.id),
    issue: (id) => content.issues.find((i) => i.id === id),
    issuesFor: (cityId) =>
      content.issues.flatMap((issue) =>
        issue.where
          .filter((w) => w.cityId === cityId)
          .map((w) => ({ issue, districtId: w.districtId ?? null, feeds: w.feeds })),
      ),
    district: (id) => districts.get(id),
    districtsOf: (cityId) => cities.get(cityId)?.quarters.filter((q) => q.district !== undefined) ?? [],
    isDistricted: (cityId) => {
      const c = cities.get(cityId);
      return c !== undefined && isDistricted(c);
    },
    irongateMenu: () => [...content.ordinances],
    capitalCity: () => cities.get(content.nation.capitalId)!,
    mission: (id) => missions.get(id),
    missionsAt: (locationId) => locations.get(locationId)?.location.missions ?? [],
    opponent: (id) => content.opponents.find((o) => o.id === id),
    runInPoolOf: (cityId) => [...(cities.get(cityId)?.runInPool ?? [])],
    servicesOf: (cityId) => {
      const s = cities.get(cityId)?.services;
      const cells = s ? locations.get(s.cells) : undefined;
      const infirmary = s ? locations.get(s.infirmary) : undefined;
      return cells && infirmary ? { cells, infirmary } : undefined;
    },
    heldAction: (kind) => content.held[kind],
    quartersOf: (cityId) => [...(cities.get(cityId)?.quarters ?? [])],
    quarterOf: (locationId) => {
      const hit = locations.get(locationId);
      return hit?.city.quarters.find((q) => q.id === hit.location.quarterId);
    },
    hostileRotation: () =>
      content.journeyEvents.filter((j) => j.deck === 'hostile' && j.heatAtLeast === undefined).map((j) => j.id),
    hostileFirst: () => content.journeyEvents.find((j) => j.deck === 'hostile' && j.first)!.id,
    listedCard: () => {
      const j = content.journeyEvents.find((x) => x.deck === 'hostile' && x.heatAtLeast !== undefined)!;
      return { id: j.id, heatAtLeast: j.heatAtLeast! };
    },
    missionCard: (type) => content.art.missionCards.find((m) => m.missionType === type)!.assetId,
  };
}

export function loadContent(raw: unknown = rawContent): GameContent {
  return indexContent(parseContent(raw));
}

let memo: GameContent | undefined;

/** The validated game content, parsed once per process. */
export function getContent(): GameContent {
  memo ??= loadContent();
  return memo;
}

export { isCheckedAction };
