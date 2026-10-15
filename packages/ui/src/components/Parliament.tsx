import { copy } from '@irongate/content/copy';
import { FACTION_IDS, PARLIAMENT, dayStart } from '@irongate/rules';
import type { BillPageView, BillRowView, DayKey, FactionId, LineVote } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatUntil, formatWeekday } from '../format';
import { Button } from './Button';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';

const P = copy.nation.parliament;
const HALF_DAY = 12 * 3_600_000;

/** A day key in the player's words: *17 October*. */
export function dayDate(d: DayKey): string {
  return new Date(dayStart(d) + HALF_DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}
/** A day key's weekday: *Thursday*. */
export function dayWeekday(d: DayKey): string {
  return formatWeekday(dayStart(d) + HALF_DAY);
}

export type FactionNames = Partial<Record<FactionId, string>>;
export const nameOf = (names: FactionNames, f: FactionId): string => names[f] ?? f[0]!.toUpperCase() + f.slice(1);

/** A line or a vote in words: *For*, *Against*, *free*. */
export function lineWord(v: 'for' | 'against' | 'abstain' | LineVote): string {
  return v === 'for' ? copy.nation.chair.for : v === 'against' ? copy.nation.chair.against : 'free';
}

// ---------------------------------------------------------------------------------------------
// The chamber's bar (screens §6.1): sixty seats in three faction colours, a tap opens a bloc.
// ---------------------------------------------------------------------------------------------

export interface BlocBarProps {
  seats: Record<FactionId, { seats: number; players: number }>;
  names: FactionNames;
  onBloc?: (f: FactionId) => void;
}

export function BlocBar({ seats, names, onBloc }: BlocBarProps) {
  return (
    <div className="flex w-full border-[1.5px] border-ink" role="group" aria-label={P.header} data-testid="bloc-bar">
      {FACTION_IDS.map((f) => {
        const s = seats[f]?.seats ?? 0;
        if (s === 0) return null;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onBloc?.(f)}
            className="label-caps relative flex min-h-11 cursor-pointer items-center justify-center gap-1 border-r border-ink text-[11px] text-paper last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-paper"
            style={{ flexGrow: s, flexBasis: 0, background: FACTION_STYLE[f].color }}
            aria-label={copy.nation.parliament.blocSeats(nameOf(names, f), s)}
            data-testid={`bloc-${f}`}
          >
            <FactionCrest factionId={f} size={10} color="var(--color-paper)" />
            <span className="[text-shadow:0_1px_0_rgb(0_0_0/0.45)]">{s}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// A bill's row on the order paper (screens §6.1).
// ---------------------------------------------------------------------------------------------

/** The bill's title: the law's name, or for a removal the motion itself. */
export function billTitle(b: Pick<BillRowView, 'kind' | 'law' | 'strikes'>): string {
  if (b.kind === 'removal') return copy.nation.petition.removal.split(' · ')[0]!;
  if (b.kind === 'strike') return P.strikes(b.strikes ?? b.law?.name ?? '');
  return b.law?.name ?? '';
}

/** The tag under the line: factional, a strike-out, a removal, an override. */
export function billTag(b: Pick<BillRowView, 'kind' | 'factional' | 'strikes'>): string | null {
  if (b.kind === 'removal') return P.removal;
  if (b.kind === 'override') return P.override;
  if (b.kind === 'strike') return null;
  return b.factional ? P.factional : null;
}

export function tablerLine(b: BillRowView, names: FactionNames): string {
  if (b.tabledBy.kind === 'clerk') return copy.nation.petition.clerk;
  const party = b.tabledBy.factionId ? nameOf(names, b.tabledBy.factionId) : '';
  return P.billRow(b.tabledBy.name, party, formatUntil(b.until), b.needed);
}

export function localsLine(b: Pick<BillRowView, 'localLines'>, names: FactionNames): string {
  return FACTION_IDS.map((f) => {
    const l = b.localLines[f];
    if (!l) return null;
    const word = l.vote === 'abstain' ? 'free' : l.vote === 'for' ? 'For' : 'Against';
    return P.localsLine(nameOf(names, f), word);
  })
    .filter(Boolean)
    .join(' · ');
}

export interface BillRowProps {
  bill: BillRowView;
  names: FactionNames;
  /** The President's bill heads the paper, marked. */
  presidents?: boolean;
  /** The row's link (the bill's page). */
  link: (children: ReactNode) => ReactNode;
  /** A deputy who has not voted: the selected side (one tap selects; the sticky button commits). */
  selected?: 'for' | 'against' | null;
  onSelect?: (v: 'for' | 'against') => void;
}

export function BillRow({ bill: b, names, presidents, link, selected, onSelect }: BillRowProps) {
  const tag = billTag(b);
  const canVote = b.you.canVote && !b.you.vote && !!onSelect;
  return (
    <li
      className="flex min-h-[88px] gap-2 border-b border-dotted border-faint py-2"
      data-testid="bill-row"
      data-bill-id={b.billId}
      data-kind={b.kind}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {link(
          <span className="flex min-h-11 flex-col justify-center">
            {presidents && <span className="label-caps text-[10px] text-petrol">{P.thePresidents}</span>}
            <span className="font-body text-[15px] leading-snug font-semibold underline-offset-2 hover:underline" data-testid="bill-name">
              {billTitle(b)}
            </span>
          </span>,
        )}
        <span className="font-mono text-[11px] leading-snug text-muted" data-testid="bill-line">
          {tablerLine(b, names)}
        </span>
        {b.law?.line && b.kind !== 'removal' && (
          <span className="font-body text-[13px] leading-snug text-text-2 italic">{b.law.line}</span>
        )}
        {tag && (
          <span className="label-caps self-start border border-ink px-1 text-[10px]" data-testid="bill-tag">
            {tag}
          </span>
        )}
        <span className="font-mono text-[11px] text-muted" data-testid="bill-locals">
          {localsLine(b, names)}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        {canVote ? (
          <div className="flex" role="radiogroup" aria-label={billTitle(b)}>
            {(['for', 'against'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={selected === v}
                onClick={() => onSelect?.(v)}
                className={cx(
                  'label-caps min-h-11 w-11 cursor-pointer border-[1.5px] border-ink text-[11px] first:border-r-0',
                  selected === v ? 'bg-ink text-paper' : 'bg-paper-card text-ink',
                )}
                data-testid={`bill-pick-${v}`}
              >
                {v === 'for' ? copy.nation.chair.for : copy.nation.chair.against}
              </button>
            ))}
          </div>
        ) : b.you.vote ? (
          <span className="font-mono text-[11px] text-petrol" data-testid="bill-your-vote">
            {b.you.vote === 'for' ? P.yourVoteFor : P.yourVoteAgainst}
          </span>
        ) : null}
        <span className="label-caps text-[11px] whitespace-nowrap" data-testid="bill-count">
          {P.forAgainst(b.counts.for, b.counts.against)}
        </span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------------------------
// The count on a bill's page (screens §6.2): For · Against with each party's players and locals.
// ---------------------------------------------------------------------------------------------

export function BillCount({ bill, names }: { bill: BillPageView; names: FactionNames }) {
  const d = bill.division;
  const rows = FACTION_IDS.map((f) => {
    const players = {
      for: bill.votes.filter((v) => v.factionId === f && v.vote === 'for').length,
      against: bill.votes.filter((v) => v.factionId === f && v.vote === 'against').length,
    };
    const loc = d ? d.byFaction[f].locals : bill.localLines[f];
    return { f, players, locals: { n: loc?.n ?? 0, vote: loc?.vote ?? 'abstain' } };
  });
  const side = (s: 'for' | 'against') =>
    rows
      .map((r) => {
        const p = r.players[s];
        const l = r.locals.vote === s ? r.locals.n : 0;
        if (p === 0 && l === 0) return null;
        return `${nameOf(names, r.f)}: ${p} ${p === 1 ? 'player' : 'players'}, ${l} locals${l ? ' (the party line)' : ''}`;
      })
      .filter(Boolean)
      .join(' · ') || '—';
  return (
    <table className="w-full border-collapse font-body text-[13px]" data-testid="bill-count-table">
      <caption className="label-caps pb-1 text-left text-[10px] text-muted">
        {P.forAgainst(bill.counts.for, bill.counts.against)} · {bill.needed} of {PARLIAMENT.seats}
      </caption>
      <tbody>
        {(['for', 'against'] as const).map((s) => (
          <tr key={s} className="border-t border-ink align-top" data-testid={`count-${s}`}>
            <th scope="row" className="label-caps w-[76px] py-1.5 pr-2 text-left text-[11px]">
              {s === 'for' ? copy.nation.chair.for : copy.nation.chair.against}
              <span className="block font-mono text-[18px] font-bold normal-case">{bill.counts[s]}</span>
            </th>
            <td className="py-1.5 text-[12.5px] leading-snug">{side(s)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------------------------
// The party line's three chips (screens §5.2): For · Against · Free vote.
// ---------------------------------------------------------------------------------------------

export function LineChips({
  value,
  onPick,
  pending,
  label,
}: {
  value: LineVote | null;
  onPick: (v: LineVote) => void;
  pending?: boolean;
  label: string;
}) {
  const words: Record<LineVote, string> = {
    for: copy.nation.chair.for,
    against: copy.nation.chair.against,
    free: copy.nation.chair.freeVote,
  };
  return (
    <div className="flex" role="radiogroup" aria-label={label} data-testid="line-chips">
      {(['for', 'against', 'free'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={pending}
          onClick={() => value !== v && onPick(v)}
          className={cx(
            'label-caps min-h-11 flex-1 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] not-last:border-r-0 disabled:opacity-60',
            value === v ? 'bg-ink text-paper' : 'bg-paper-card text-ink',
          )}
          data-testid={`line-${v}`}
        >
          {words[v]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// A law's row (the law book, the catalogue; screens §6.3, §8).
// ---------------------------------------------------------------------------------------------

export interface LawRowProps {
  name: string;
  /** The effect in caps: *WAGES +10 % · 14 DAYS LEFT*. */
  effect: string;
  line: string;
  tag?: string | null;
  meta?: string | null;
  /** One tap puts it (the catalogue), or a text button (the law book's strike). */
  action?: ReactNode;
  onPick?: () => void;
  disabled?: boolean;
  testId?: string;
  lawId?: string;
}

export function LawRow({ name, effect, line, tag, meta, action, onPick, disabled, testId = 'law-row', lawId }: LawRowProps) {
  const body = (
    <>
      <span className="font-body text-[15px] leading-snug font-semibold">{name}</span>
      <span className="label-caps text-[10.5px] text-petrol">{effect}</span>
      <span className="font-body text-[13px] leading-snug text-text-2 italic">{line}</span>
      {tag && <span className="label-caps self-start border border-ink px-1 text-[10px]">{tag}</span>}
      {meta && <span className="font-mono text-[11px] text-muted">{meta}</span>}
    </>
  );
  return (
    <li className="border-b border-dotted border-faint" data-testid={testId} data-law-id={lawId}>
      {onPick ? (
        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          className="flex min-h-[96px] w-full cursor-pointer flex-col items-start gap-0.5 py-2 text-left hover:bg-paper-card disabled:cursor-default disabled:opacity-55"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-[72px] flex-col gap-0.5 py-2">
          {body}
          {action}
        </div>
      )}
    </li>
  );
}

/** A sticky bar over the tab bar for the page's one commit (the vote, Set the orders). */
export function StickyBar({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div
      className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-1 border-t border-track bg-paper px-4 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:mx-0 lg:border lg:border-ink lg:p-2"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

/** A text button in the Courier style (*The law book*, *How Parliament works*). */
export function TextLink({ children, onClick, testId }: { children: ReactNode; onClick: () => void; testId?: string }) {
  return (
    <Button variant="outline" className="min-h-11 border-0 px-0 font-mono text-[12px] normal-case underline underline-offset-2 hover:bg-transparent hover:text-petrol" onClick={onClick} data-testid={testId}>
      {children}
    </Button>
  );
}
