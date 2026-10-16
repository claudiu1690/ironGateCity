import type { GameContent } from '@irongate/content';
import { City } from '@irongate/db';
import type { CharacterDoc, CityDoc } from '@irongate/db';
import { WEEKDAY_NAMES, weekday } from '@irongate/rules';
import type { DayKey, PoliticalAct, PoliticalResult } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { residenceCityId } from './residence';
import { toCharacterView } from './views';

/**
 * Slice 8 phase B, lane 2 (tech design §10.1): the political result modal's shell for a life in the
 * city's acts (the Dossier, the flat, Legacy). The masthead is the residence's paper, the place the
 * residence; the texts come from `copy.life` and the numbers from the act.
 */
export async function lifePolitical(i: {
  content: GameContent;
  session: ClientSession;
  updated: CharacterDoc;
  now: number;
  idempotencyKey: string;
  act: PoliticalAct;
  stamp: string;
  headline: string;
  body: string;
  knockOns?: Partial<PoliticalResult['knockOns']>;
  view: PoliticalResult['view'];
  until?: number | null;
}): Promise<PoliticalResult> {
  const { content, updated: c } = i;
  const residenceCity = await City.findById(residenceCityId(c)).session(i.session).lean<CityDoc>();
  const home = content.city(residenceCityId(c));
  const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
  return {
    kind: 'political',
    act: i.act,
    stamp: { label: i.stamp, tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: home?.id ?? c.cityId, cityName: home?.name ?? c.cityId },
    headline: i.headline,
    body: i.body,
    until: i.until ?? null,
    at: i.now,
    knockOns: { pc: null, morale: null, backers: null, ...(i.knockOns ?? {}) },
    performedAt: new Date(i.now).toISOString(),
    idempotencyKey: i.idempotencyKey,
    character: toCharacterView(c, i.now, content, null, { city: residenceCity }),
    view: i.view,
  };
}

/** *Thursday*: a day key's weekday in words (the Dossier's clocks, the rent, the informants). */
export const weekdayName = (day: DayKey): string => WEEKDAY_NAMES[weekday(day)] ?? '';
