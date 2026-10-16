import { RECOGNITION } from './constants';
import { isPlainClothes } from './items';
import type { Office } from './ladder';

/**
 * Recognition on rival ground (design docs/design/slice-8-life.md §3.6, ADR 0052, §21.1 Q14–Q15):
 * worn Charisma, the highest office held now, the night and Legacy, added to every run-in roll on
 * rival ground before the 0–90 clamp. The client shows the server's word, never the figure.
 */

export type HeldOffice = 'none' | Office;

const OFFICE_ORDER: readonly HeldOffice[] = ['none', 'council', 'governor', 'chair', 'deputy', 'president'];

/** §21.1 Q15: offices held now (the `offices[]` projection), the one worth most. */
export function highestOffice(offices: ReadonlyArray<{ office: Office }>): HeldOffice {
  let best: HeldOffice = 'none';
  for (const { office } of offices) {
    const better =
      officePart(office) - officePart(best) || OFFICE_ORDER.indexOf(office) - OFFICE_ORDER.indexOf(best);
    if (better > 0) best = office;
  }
  return best;
}

const officePart = (o: HeldOffice): number => (o === 'none' ? 0 : RECOGNITION.office[o]);

export interface Recognition {
  total: number;
  cha: number;
  office: number;
  legacy: number;
  night: boolean;
  plain: boolean;
}

/**
 * Design §3.6: Charisma 20–29 +5, 30 and over +10; the office councillor +5, Governor or Chair +10,
 * deputy or President +15; both doubled at night (review 5's night, `nightAt` at the act); plus +1
 * per 10 Legacy, at most +5, never doubled. Plain clothes (worn Charisma under 10) drop the Charisma
 * part and halve the office part, rounded down. A Governor in a greatcoat (22) at night: 30.
 */
export function recognition(i: {
  wornCha: number;
  night: boolean;
  office: HeldOffice;
  legacy: number;
}): Recognition {
  const plain = isPlainClothes(i.wornCha);
  const band = RECOGNITION.cha.find(([at]) => i.wornCha >= at);
  const cha = plain ? 0 : (band?.[1] ?? 0);
  const office = plain ? Math.floor(officePart(i.office) / 2) : officePart(i.office);
  const legacy = Math.min(RECOGNITION.legacyMax, Math.floor(Math.max(0, i.legacy) / RECOGNITION.legacyPer));
  const total = (cha + office) * (i.night ? RECOGNITION.nightFactor : 1) + legacy;
  return { total, cha, office, legacy, night: i.night, plain };
}

/** Screens §2: the plate's and the ticket's words (*Recognised here · run-ins likelier* / *Plain clothes · unnoticed*). */
export type RecognitionWord = 'recognised' | 'plain' | null;

export const recognitionWord = (r: Recognition, rivalGround: boolean): RecognitionWord =>
  !rivalGround ? null : r.total > 0 ? 'recognised' : r.plain ? 'plain' : null;
