import {
  FACTION_IDS,
  PLACEHOLDERS,
  POLITICAL_PLACEHOLDERS,
  STORY_PLACEHOLDERS,
  TIME_TOKENS,
  isPoliticalCondition,
  isPoliticalTemplate,
  placeholdersIn,
} from '@irongate/rules';
import type { ChapterRules, FactionId, ItemSpec, OrdinanceSpec, OriginSpec } from '@irongate/rules';
import { z } from 'zod';
import { ambitions } from './data/ambitions';
import { assets, avatars, scenes } from './data/art';
import { candidates } from './data/candidates';
import { ashford } from './data/cities/ashford';
import { coalport } from './data/cities/coalport';
import { duskwall } from './data/cities/duskwall';
import { factions } from './data/factions';
import { headlines } from './data/headlines';
import { items } from './data/items';
import { jobs } from './data/jobs';
import { ordinances } from './data/ordinances';
import { orderTemplates } from './data/orders';
import { origin } from './data/origin';
import { npcs, standingLevels } from './data/people';
import { politicalHeadlines } from './data/politicalHeadlines';
import { politics } from './data/politics';
import { Content, isCheckedAction } from './schemas';
import type {
  Action,
  Ambition,
  Asset,
  Chapter,
  City,
  Faction,
  HeadlineTemplate,
  Item,
  Job,
  Location,
  Npc,
  NpcCandidate,
  Ordinance,
  OrderTemplate,
  Platform,
} from './schemas';

/** Every data file, before validation. */
export const rawContent: unknown = {
  factions,
  cities: [coalport, duskwall, ashford],
  art: { assets, scenes },
  avatars,
  items,
  origin,
  ambitions,
  npcs,
  standingLevels,
  jobs,
  orderTemplates,
  headlines: [...headlines, ...politicalHeadlines],
  ordinances,
  candidates,
  politics,
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
const ALLOWED_PLACEHOLDERS = new Set<string>(PLACEHOLDERS);
/** Tech design §4.4: story texts have their own, separate list. */
const ALLOWED_STORY_PLACEHOLDERS = new Set<string>(STORY_PLACEHOLDERS);
/** Slice-3 tech design §4.3: political texts have their own list plus the client's time tokens. */
const ALLOWED_POLITICAL_PLACEHOLDERS = new Set<string>([...POLITICAL_PLACEHOLDERS, ...TIME_TOKENS]);
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
  }
  const needAsset = (where: string, id: string, kind: Asset['kind'] | Array<Asset['kind']>) => {
    const kinds = Array.isArray(kind) ? kind : [kind];
    const a = assetById.get(id);
    if (!a) problems.push(`${where} references unknown asset "${id}"`);
    else if (!kinds.includes(a.kind))
      problems.push(`${where} references "${id}", a ${a.kind}, not a ${kinds.join(' or ')}`);
  };
  for (const s of content.art.scenes) needAsset(`scene for ${s.locationKind}`, s.assetId, 'scene');

  for (const f of content.factions) unique('faction', f.id);
  const cityById = new Map(content.cities.map((c) => [c.id, c]));
  const locationById = new Map<string, { city: City; location: Location }>();
  const actionById = new Map<string, { city: City; location: Location; action: Action }>();

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
    city.locations.forEach((location, i) => {
      unique('location', location.id);
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
    checkText(`order "${t.id}"`, `${t.title} ${t.line}`);
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
  for (const id of DESIGN_ORDINANCE_IDS) {
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
      if (slate.length !== 9) problems.push(`cities.${city.id} has ${slate.length} NPC candidates, not 9`);
      for (const c of slate) {
        if (c.factionId !== city.homeFactionId)
          problems.push(`candidate "${c.id}" is not of ${city.id}'s home faction`);
      }
      slate.forEach((c, i) => {
        const prev = slate[i - 1];
        if (prev && c.profile >= prev.profile)
          problems.push(`candidates of ${city.id}: profiles must strictly descend in file order (${c.id})`);
      });
    }
  }
  for (const c of content.candidates) {
    if (!cityById.get(c.cityId)?.council) problems.push(`candidate "${c.id}": "${c.cityId}" has no council`);
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
  item(id: string): Item | undefined;
  /** What the rules need of an item (worn CHA, keepsakes). */
  itemSpec(id: string): ItemSpec | undefined;
  ambition(id: string): Ambition | undefined;
  chapter(ambitionId: string, n: number): Chapter | undefined;
  /** What the rules need of a chapter; undefined when content has no such chapter. */
  chapterRules(ambitionId: string, n: number): ChapterRules | undefined;
  /** The origin's questions in order, for `resolveOrigin`. */
  originSpec: OriginSpec;
  /** The faction's HQ location in its home city (exactly one, checked at load). */
  hqOf(factionId: FactionId): { city: City; location: Location };
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
  /** A council city's nine NPC candidates, in profile order. */
  slateOf(cityId: string): NpcCandidate[];
  candidate(id: string): NpcCandidate | undefined;
  /** Cities with a council (the three home cities in slice 3). */
  councilCities(): City[];
  platform(factionId: FactionId, id: string): Platform | undefined;
  /** One city's political headline templates (ADR 0023), in file order. */
  politicalHeadlinesOf(cityId: string): HeadlineTemplate[];
}

export function indexContent(content: Content): GameContent {
  const factions = new Map(content.factions.map((f) => [f.id, f]));
  const cities = new Map<string, City>();
  const locations = new Map<string, { city: City; location: Location }>();
  const actions = new Map<string, LocatedAction>();
  for (const city of content.cities) {
    cities.set(city.id, city);
    for (const location of city.locations) {
      locations.set(location.id, { city, location });
      for (const action of location.actions) actions.set(action.id, { city, location, action });
    }
  }
  const jobs = new Map(content.jobs.map((j) => [j.id, j]));
  const npcs = new Map(content.npcs.map((n) => [n.id, n]));
  const assets = new Map(content.art.assets.map((a) => [a.id, a]));
  const items = new Map(content.items.map((i) => [i.id, i]));
  const ambitionsById = new Map(content.ambitions.map((a) => [a.id, a]));
  const ordinancesById = new Map(content.ordinances.map((o) => [o.id, o]));
  const candidatesById = new Map(content.candidates.map((c) => [c.id, c]));
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
    hqOf: (factionId) => {
      const city = cities.get(factions.get(factionId)!.homeCityId)!;
      return { city, location: city.locations.find((l) => l.kind === 'faction-hq')! };
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
    slateOf: (cityId) => content.candidates.filter((c) => c.cityId === cityId),
    candidate: (id) => candidatesById.get(id),
    councilCities: () => content.cities.filter((c) => c.council !== undefined),
    platform: (factionId, id) => factions.get(factionId)?.platforms.find((p) => p.id === id),
    politicalHeadlinesOf: (cityId) =>
      content.headlines.filter((h) => h.cityId === cityId && isPoliticalTemplate(h)),
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
