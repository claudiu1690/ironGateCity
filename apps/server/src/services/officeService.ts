import type { GameContent } from '@irongate/content';
import type { CharacterDoc } from '@irongate/db';
import { dayKey, ladderRows, nextDate, stipendOf } from '@irongate/rules';
import type { LadderView, Office, OfficeCardView, StandRefusal } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { officeOf, serviceRecord } from './nationAct';
import { isContested } from './residence';

/**
 * Slice 7 T13, T20 (docs/tech/slice-7.md §8.1, §8.3; screens §3): `office.mine`, the Me tab's office
 * cards (every current term, read from `officeTerms` by holder) and the ladder's five rows (the
 * completed terms by office and each rung's gate, `ladderRows`).
 */

/** The ladder's *need* in words (screens §3); null when the rung is open. */
function needLine(n: StandRefusal | null): string | undefined {
  if (!n) return undefined;
  switch (n.reason) {
    case 'RANK':
      return `Rank ${n.need}`;
    case 'LADDER':
      return n.rung === 'deputy'
        ? "A completed deputy's term"
        : n.need === 1
          ? 'A completed council term'
          : `A Governor's term or ${n.need} council terms`;
    case 'TENURE':
      return `${n.need} days in the party`;
    case 'TERM_LIMIT':
      return 'Two terms in a row: one off first';
    case 'NOT_ENOUGH_PC':
      return `${n.need} Political Capital`;
  }
}

export async function officeMine(
  content: GameContent,
  c: Pick<CharacterDoc, '_id' | 'rank' | 'createdAt' | 'factionId'>,
  now: number,
): Promise<{ offices: OfficeCardView[]; ladder: LadderView }> {
  const today = dayKey(now);
  const record = await serviceRecord(c, today);
  const faction = content.faction(c.factionId);
  const current = record.terms.filter(
    (t) => t.fromDay <= today && today < t.toDay && (t.vacatedDay ?? null) === null,
  );
  const order: Office[] = ['president', 'chair', 'deputy', 'governor', 'council'];
  const offices = current
    .sort((a, b) => order.indexOf(officeOf(a)) - order.indexOf(officeOf(b)))
    .map((t): OfficeCardView => {
      const office = officeOf(t);
      const cityName = content.city(t.cityId)?.name ?? t.cityId;
      const consecutive =
        office === 'chair' || office === 'president' ? (Math.min(2, record.consecutive[office]) as 1 | 2) : undefined;
      const base = { office, until: t.toDay, pay: stipendOf(office), ...(consecutive ? { consecutive } : {}) };
      switch (office) {
        case 'governor':
          return {
            ...base,
            title: `${isContested(content, t.cityId) ? 'Mayor' : 'Governor'} of ${cityName}`,
            route: `/office/governor/${t.cityId}`,
          };
        case 'chair':
          return { ...base, title: `Chair of the ${faction.name}`, route: '/faction?tab=chair' };
        case 'deputy':
          return { ...base, title: `Deputy for the ${faction.shortName}`, route: '/parliament' };
        case 'president':
          return { ...base, title: 'President of the Republic', route: '/office/president' };
        default:
          return { ...base, title: `Councillor of ${cityName}`, route: '/council' };
      }
    });
  const rows = ladderRows(record, {
    chair: nextDate(today, 'chairNames'),
    deputy: nextDate(today, 'nationNames'),
    president: nextDate(today, 'nationNames'),
  });
  return {
    offices,
    ladder: {
      rows: rows.map((r) => ({
        office: r.office,
        done: r.done,
        count: r.count,
        ...(needLine(r.need) ? { need: needLine(r.need)! } : {}),
        ...(r.opensOn !== null ? { opensOn: r.opensOn } : {}),
      })),
    },
  };
}

export async function getOfficeMine(deps: { user: SessionUser; content: GameContent; now: () => number }) {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  return officeMine(deps.content, doc, now);
}
