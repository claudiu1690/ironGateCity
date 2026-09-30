import type { OrderTemplate, Rng } from '../src';

/** An Rng that returns the given rolls in order (for exact outcome sequences). */
export function fixedRng(rolls: number[], seed = 'fixed'): Rng {
  let i = 0;
  const roll100 = () => {
    const r = rolls[i++];
    if (r === undefined) throw new Error('fixedRng ran out of rolls');
    return r;
  };
  return { seed, next: () => (roll100() - 1) / 100, int: () => roll100(), roll100 };
}

const t = (
  id: string,
  slot: 'A' | 'B' | 'C',
  title: string,
  match: OrderTemplate['match'],
  target: number,
  counts: OrderTemplate['counts'] = 'attempts',
  use?: OrderTemplate['use'],
): OrderTemplate => ({
  id,
  factionId: 'collective',
  slot,
  title,
  line: `${title}.`,
  match,
  target,
  counts,
  ...(use ? { use } : {}),
});

/** The Collective's templates after review 1 (answers §3.1), in file order, without the crisis pair. */
export const TEMPLATES: OrderTemplate[] = [
  t('dir.canvass-coalport', 'A', 'Canvass Coalport', { actionTypes: ['canvass'], cityId: 'coalport' }, 3),
  t('dir.shift-change', 'A', 'Be at the gate', { actionIds: ['coalport.mill-gate.canvass'] }, 2),
  t('dir.foundry-row', 'A', 'Knock Foundry Row', { actionIds: ['coalport.terraces.canvass'] }, 2),
  t('dir.noon-break', 'A', 'The quays at noon', { actionIds: ['coalport.quays.noon-break'] }, 2),
  t('dir.anchor', 'A', 'The Anchor after the shift', { actionIds: ['coalport.anchor.regulars'] }, 2),
  t('dir.paper-the-town', 'B', 'Paper the town', { actionTypes: ['propaganda'], cityId: 'coalport' }, 3),
  t('dir.say-it', 'B', 'Get up and say it', { actionTypes: ['speech'], cityId: 'coalport' }, 1),
  t('dir.report', 'B', 'Report to the hall', { actionIds: ['coalport.union-hall.committee'] }, 1),
  t('dir.ears-open', 'B', 'Keep your ears open', { actionTypes: ['intelligence'], cityId: 'coalport' }, 2),
  t('dir.sharpen-up', 'C', 'Sharpen up', { kinds: ['training'] }, 1),
  t('dir.full-day', 'C', 'A full day', { kinds: ['checked'], cityId: 'home' }, 6, 'successes'),
  t('dir.five-in-the-book', 'C', 'Five attempts', { kinds: ['checked'], cityId: 'home' }, 5),
  t('dir.take-a-job', 'C', 'Take a job', { kinds: ['takeJob'] }, 1, 'attempts', 'welcome'),
];

export const NAMES = ['Stranger', 'Familiar', 'Known', 'Trusted', 'One of Us'] as const;
