import { copy } from '@irongate/content/copy';
import type { PoliticalResult, RewardLine } from '@irongate/rules';
import { formatClock } from './format';

/**
 * Slice 8 phase C, lane P (tech design §10.1, §24.7): a life act's knock-on lines (`knockOns.life`),
 * worded by the server. Where a line already words the Iron, the Energy or the Health, the modal's
 * generic line for it is skipped, so nothing prints twice. A time in a line is the server's UTC
 * *14:05* for `until`; it is shown in the player's clock.
 */
export function lifeLines(r: PoliticalResult): { lines: Array<{ id: string; text: string }>; skip: Set<'iron' | 'energy' | 'health'> } {
  const k = r.knockOns;
  const skip = new Set<'iron' | 'energy' | 'health'>();
  const raw = k.life ?? [];
  if (raw.length === 0) return { lines: [], skip };
  const spent = k.iron ? k.iron.before - k.iron.after : null;
  if (spent !== null && raw.some((l) => l === copy.life.knock.iron(spent) || l === copy.life.knock.ironGained(-spent)))
    skip.add('iron');
  if (k.energy && raw.includes(copy.life.bar.knock.energy)) skip.add('energy');
  // A meal's *Health +{n}* is the real gain (up to max); with no gain the line is absent, and so is Health's.
  if (k.health && (r.act === 'meal' || r.act === 'dinner')) skip.add('health');
  const utc = r.until !== null ? new Date(r.until).toISOString().slice(11, 16) : null;
  const local = r.until !== null ? formatClock(r.until) : null;
  return {
    lines: raw.map((text, i) => ({ id: `life-${i}`, text: utc && local ? text.replace(utc, local) : text })),
    skip,
  };
}

/**
 * Screens §18.5: a buff's part on an XP or Iron line, as a receipt line of its own: *Well fed · +10 %
 * XP*, *Well fed · +10 % Iron*, *In good spirits · +10 % XP · 2 left*.
 */
export function buffReceiptLines(rewards: { xp: RewardLine; iron: RewardLine }): string[] {
  const out: string[] = [];
  for (const p of rewards.xp.parts ?? []) {
    if (p.id === 'buff:wellFed') out.push(copy.life.bar.receipt.wellFedXp);
    else if (p.id === 'buff:spirits') {
      const left = /(\d+) left/.exec(p.label)?.[1];
      out.push(left !== undefined ? copy.life.bar.receipt.spirits(Number(left)) : p.label);
    }
  }
  for (const p of rewards.iron.parts ?? []) if (p.id === 'buff:wellFed') out.push(copy.life.bar.receipt.wellFedIron);
  return out;
}
