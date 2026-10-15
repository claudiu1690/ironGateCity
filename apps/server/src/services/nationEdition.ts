import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Contribution, FactionState, Nation, contributionId } from '@irongate/db';
import type { CharacterDoc, FactionStateDoc, NationDoc, OfficeTermDoc } from '@irongate/db';
import {
  FACTION_IDS,
  PUSH,
  chairPhase,
  dayKey,
  dayStart,
  nationalPhase,
  selectNationalLines,
  termOf,
  TERM_DAYS,
} from '@irongate/rules';
import type { DayKey, FactionId, NationalSectionView, Office, StandingInput } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { pushPlaceName } from './views';
import { readPersonalLines } from './nationPersonal';
import type { NationalKind, PersonalLines } from './nationPersonal';
import { isContested, residenceOf } from './residence';

/**
 * Slice 7 T20 (docs/tech/slice-7.md §8.4, §11; design §4.2, §11): what the settlement reads of the
 * nation (the member's faction document, the party's target days met with the member's knock, the
 * personal national facts) and the paper's national section, live at read. The rules decide
 * (`standingOn`, `selectNationalLines`); this file reads and words.
 */

export type { NationalKind } from './nationPersonal';

export interface NationSettlementRead {
  faction: FactionStateDoc | null;
  /** Each ended day whose push was met and where the member knocked: +10 Party XP each (design §4.2). */
  pushMet: Array<{ day: DayKey; place: string }>;
  /** The personal national lines' facts (tech §11.2), stored at the settlement, and their fills. */
  kinds: NationalKind[];
  /** The fills every national line shares (the name, the party). */
  vars: Record<string, string>;
  /** Each line's own fills (`readPersonalLines`). */
  varsByKind: PersonalLines['varsByKind'];
  /** Epoch ms for a line whose deck keeps `{until}`. */
  until: PersonalLines['until'];
}

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
/** A list place in words: *First* … *Tenth*, then *11th*, *21st*, *22nd*, *23rd*. */
export function ordinalWord(n: number): string {
  if (ORDINALS[n - 1]) return ORDINALS[n - 1]!;
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** The settlement's nation reads, in its session (§8.4 step 1). */
export async function readNationSettlement(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  terms: readonly OfficeTermDoc[],
  session: ClientSession,
  /** The settlement's clock (a petition's `{needed}` reads the turnout roll as of now). */
  now: number = dayStart(today),
): Promise<NationSettlementRead> {
  const faction = await FactionState.findById(c.factionId).session(session).lean<FactionStateDoc>();
  const settled = c.day.settled;
  const pushMet: NationSettlementRead['pushMet'] = [];
  if (faction && settled !== null) {
    // The ended days since the last settlement (settled … today − 1) whose target was met.
    const met = (faction.pushDays ?? []).filter((p) => p.met && p.day >= settled && p.day < today);
    if (met.length > 0) {
      const ids = met.map((p) => contributionId(`push|${c.factionId}|${p.day}`, c._id));
      const mine = await Contribution.find({ _id: { $in: ids }, amount: { $gt: 0 } }, { scope: 1 })
        .session(session)
        .lean();
      for (const p of met)
        if (mine.some((m) => m.scope === `push|${c.factionId}|${p.day}`))
          pushMet.push({ day: p.day, place: pushPlaceName(content, p) });
    }
  }
  // The personal national lines (tech §11.2): their facts, each line's fills and its `{until}`.
  const lines = await readPersonalLines(content, c, today, terms, session, now);
  return { faction, pushMet, ...lines };
}

/** §8.4 step 4: the Chair's standing orders for today as `startOrders`' input, and who set them. */
export function standingInputOf(
  content: GameContent,
  c: CharacterDoc,
  faction: FactionStateDoc | null,
  today: DayKey,
): { standing: StandingInput; setBy: { characterId: string; name: string } } | null {
  if (!faction?.orders) return null;
  const s = faction.orders.next && today >= faction.orders.next.fromDay ? faction.orders.next : faction.orders.current;
  if (!s || today < s.fromDay) return null;
  const res = residenceOf(c);
  return {
    standing: {
      picks: s.picks,
      push: s.push,
      pushTemplates: { A: content.pushTemplate(c.factionId, 'A'), B: content.pushTemplate(c.factionId, 'B') },
      residencePlace: { cityId: res.cityId, districtId: res.districtId ?? null },
    },
    setBy: { characterId: s.setBy.characterId.toHexString(), name: s.setBy.name },
  };
}

/** The desk's target lines (*The party's target, Eastside · +10 Party XP*). */
export const targetLines = (met: NationSettlementRead['pushMet']) =>
  met.map((m) => ({ label: `The party's target, ${m.place}`, fxp: PUSH.fxp }));

/** A national line's facts as words: party ids as names, shares to one decimal, epochs as a boundary. */
function lineVars(content: GameContent, facts: Record<string, unknown>, now: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(facts)) {
    if (typeof v === 'string' && (FACTION_IDS as readonly string[]).includes(v)) out[k] = content.faction(v as FactionId).shortName;
    else if (typeof v === 'number' && /Share$/.test(k)) out[k] = v.toFixed(1);
    else if (typeof v === 'number' && k === 'until') out[k] = copy.boundary(v, now);
    else if (v !== null && v !== undefined) out[k] = String(v);
  }
  return out;
}

const fill = (text: string, vars: Record<string, string>) =>
  text.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, k: string) => vars[k] ?? whole);

/**
 * §11.1: the paper's national section, live at read: at most two of today's national lines for the
 * reader (`selectNationalLines`) and one line for an open window (the republic's vote, the names for
 * Chair), *From the capital* in the home papers and the Courier, *The republic* in the Herald.
 */
export async function nationalSection(
  content: GameContent,
  c: Pick<CharacterDoc, '_id' | 'factionId'>,
  paperCityId: string,
  now: number,
  nation?: NationDoc | null,
): Promise<NationalSectionView | null> {
  const today = dayKey(now);
  const n = nation === undefined ? await Nation.findById('republic').lean<NationDoc>() : nation;
  if (!n) return null;
  const picked = selectNationalLines(
    (n.news ?? []).map((x) => ({ ...x, factionId: x.factionId ?? null })) as never,
    { day: today, factionId: c.factionId, characterId: c._id.toHexString() },
  );
  const lines = picked.flatMap((item: { id: string; facts: Record<string, unknown> }) => {
    const t = content.nationalLines.find((l) => l.id === item.id);
    if (!t) return [];
    const vars = lineVars(content, item.facts, now);
    return [{ id: item.id, headline: fill(t.headline, vars), deck: fill(t.deck, vars) }];
  });
  const term = termOf(today);
  const N = TERM_DAYS.nation;
  const C = TERM_DAYS.chair;
  const p = copy.nation.paper;
  let window: NationalSectionView['window'] = null;
  if (nationalPhase(today) === 'voting') {
    const until = dayStart(term.fromDay + N.countDay);
    window = { label: p.voteNow(copy.boundary(until, now)), until, route: '/election/national' };
  } else if (chairPhase(today) === 'names') {
    const until = dayStart(term.fromDay + C.votesFrom);
    window = { label: p.namesInChair(copy.boundary(until, now)), until, route: '/faction/election' };
  }
  if (lines.length === 0 && !window) return null;
  return {
    title: paperCityId === 'irongate' ? p.theRepublic : p.fromTheCapital,
    lines,
    window,
  };
}

/** An office in words, for the desk's stipend line and the office cards (*Chair of the Red Collective*). */
export function officeTitle(content: GameContent, office: Office, cityId: string, factionId: FactionId): string {
  const cityName = content.city(cityId)?.name ?? cityId;
  const faction = content.faction(factionId);
  switch (office) {
    case 'governor':
      return `${isContested(content, cityId) ? 'Mayor' : 'Governor'} of ${cityName}`;
    case 'chair':
      return `Chair of the ${faction.name}`;
    case 'deputy':
      return `Deputy for the ${faction.shortName}`;
    case 'president':
      return 'President of the Republic';
    default:
      return `Councillor of ${cityName}`;
  }
}
