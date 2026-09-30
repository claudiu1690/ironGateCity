import { copy } from '@irongate/content/copy';
import type {
  CandidateView,
  CountRowView,
  CouncilSeatView,
  CouncilView,
  FrontPageView,
  OrdinanceMenuItemView,
  OrderPaperItemView,
  PoliticsSummaryView,
} from '@irongate/rules';
import { useState } from 'react';
import { cx, formatUntil, formatWeekday } from '../format';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Picture } from './Picture';
import { ProgressBar } from './ProgressBar';
import { BottomSheet } from './Sheets';
import { Stamp } from './Stamp';

/**
 * Slice 3's political screens (docs/design/slice-3-screens.md): plain props, no tRPC. They render
 * the server's views and compute nothing but wording.
 */

// ---------------------------------------------------------------------------------------------
// Marks: a player's avatar in a ring; an NPC's small faction mark in the same ring (screens §1).
// ---------------------------------------------------------------------------------------------

export function PersonMark({
  avatar,
  factionId,
  size = 32,
}: {
  avatar: CandidateView['avatar'];
  factionId: CandidateView['factionId'];
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-paper-2"
      style={{ width: size, height: size, borderColor: FACTION_STYLE[factionId].color }}
      aria-hidden="true"
      data-mark={avatar ? 'avatar' : 'ward'}
    >
      {avatar ? (
        <Picture
          asset={avatar}
          sizes={`${size}px`}
          decorative
          className="size-full object-cover object-top"
        />
      ) : (
        <FactionCrest factionId={factionId} size={12} />
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// The Polling Day row (screens §2.1) and the HQ council card (§7): one summary view.
// ---------------------------------------------------------------------------------------------

/** Lines 1 and 2 of the Polling Day row for a summary. */
export function pollingDayLines(s: PoliticsSummaryView): [string, string] {
  const pd = copy.pd;
  switch (s.state) {
    case 'belowRank':
      return pd.belowRank(s.cityName, s.pollsFromWeekday, s.rank2Title, 400) as [string, string];
    case 'ballot':
      return pd.ballot(formatUntil(s.closesAt)) as [string, string];
    case 'councilSits':
      return pd.councilSits(formatUntil(s.divideAt ?? s.closesAt)) as [string, string];
    case 'filed':
      return pd.filed(
        s.endorsements?.n ?? 0,
        s.endorsements?.needed ?? 2,
        s.branchLine
          ? copy.branchEndorsesYou
          : s.endorsements?.branchWillMakeUp
            ? copy.branchMakesUpTheNumber
            : pd.doOrders,
      ) as [string, string];
    case 'stand':
      return pd.stand(s.standCost, formatUntil(s.closesAt)) as [string, string];
    case 'count':
      return pd.count(
        s.count?.winner ?? '',
        s.count?.npcSeats ?? 0,
        s.count?.turnout.voters ?? 0,
        s.count?.turnout.eligible ?? 0,
      ) as [string, string];
    case 'voted':
      return pd.voted(s.votedFor ?? '', formatWeekday(s.countAt ?? s.closesAt)) as [string, string];
    case 'nominations':
      return pd.nominations(s.cityName, s.pollsFromWeekday) as [string, string];
  }
}

export interface PollingDayRowProps {
  summary: PoliticsSummaryView;
  onOpen?: (route: NonNullable<PoliticsSummaryView['route']>) => void;
}

/** Between Party orders and Letters on every edition (screens §2.1). */
export function PollingDayRow({ summary, onOpen }: PollingDayRowProps) {
  const [l1, l2] = pollingDayLines(summary);
  const strong = summary.state === 'ballot' || summary.state === 'stand' || summary.state === 'councilSits';
  const body = (
    <>
      <span className="flex min-w-0 flex-col">
        <span className={cx('font-body text-[15px] leading-snug', strong && 'font-semibold')}>{l1}</span>
        <span className="font-mono text-[11px] text-muted">{l2}</span>
      </span>
      {summary.route && (
        <span className="font-label text-[18px]" aria-hidden="true">
          ›
        </span>
      )}
    </>
  );
  return (
    <section aria-label={copy.pollingDay} className="flex flex-col" data-testid="polling-day">
      <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        {copy.pollingDay}
      </div>
      {summary.route && onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(summary.route!)}
          className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 border-b border-dotted border-faint py-2 text-left hover:bg-paper-card"
          data-testid="polling-day-row"
          data-state={summary.state}
        >
          {body}
        </button>
      ) : (
        <div
          className="flex min-h-14 items-center justify-between gap-3 border-b border-dotted border-faint py-2"
          data-testid="polling-day-row"
          data-state={summary.state}
        >
          {body}
        </div>
      )}
    </section>
  );
}

export interface CouncilCardProps {
  summary: PoliticsSummaryView;
  onOpen: (route: NonNullable<PoliticsSummaryView['route']>) => void;
}

/** The HQ sheet's council card, in the JobsCard style (screens §7). */
export function CouncilCard({ summary: s, onOpen }: CouncilCardProps) {
  const cc = copy.cc;
  const state =
    s.state === 'councilSits'
      ? cc.sits(formatUntil(s.divideAt ?? s.closesAt))
      : s.phase === 'nominations'
        ? cc.nominations(formatUntil(s.closesAt))
        : cc.polling(formatUntil(s.closesAt));
  let button: { label: string; route: NonNullable<PoliticsSummaryView['route']> } | null = null;
  if (s.state === 'councilSits') button = { label: cc.voteOnTheOrdinance, route: '/council' };
  else if (s.state === 'stand')
    button = { label: copy.standForTheCouncil(s.standCost), route: '/council/slate' };
  else if (s.state === 'ballot') button = { label: cc.castYourBallot, route: '/council/ballot' };
  else if (s.state === 'count') button = { label: cc.seeTheCount, route: '/council/count' };
  else if (s.phase === 'nominations' && s.state !== 'belowRank')
    button = { label: copy.seeTheSlate, route: '/council/slate' };
  else if (s.state !== 'belowRank' && s.state !== 'voted')
    button = { label: cc.seeTheCouncil, route: '/council' };
  return (
    <section
      aria-label={`${s.cityName} Council`}
      className="mt-1 flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper-card px-3 py-2"
      data-testid="council-card"
    >
      <h3 className="label-caps text-[11px] font-semibold">{s.cityName} Council</h3>
      <p className="font-body text-[14px]">{state}</p>
      {/* Review 1 #10: below Rank 2 the card has no button, so it says why, in the hint style,
          with the Polling Day row's line ("Stewards vote. 400 Faction XP makes a Steward.").
          TODO(game-designer): confirm this line on the card. */}
      {s.state === 'belowRank' && (
        <p className="font-mono text-[12px] text-muted" data-testid="council-card-reason">
          {pollingDayLines(s)[1]}
        </p>
      )}
      {s.state === 'filed' && s.endorsements && (
        <>
          <p className="font-mono text-[12px]" data-testid="council-card-endorsements">
            {copy.onTheSlate(s.endorsements.n, s.endorsements.needed)}
          </p>
          <ProgressBar label="Endorsements" value={s.endorsements.n} max={s.endorsements.needed} tone="ink" />
        </>
      )}
      {s.branchLine && <p className="font-mono text-[12px] text-petrol">{copy.branchEndorsesYou}</p>}
      {s.state === 'voted' && <p className="font-mono text-[12px] text-muted">{copy.cc.ballotCast}</p>}
      {s.inForce && (
        <p className="font-mono text-[11px] text-muted">
          {copy.ordinanceInForce(s.inForce.name, s.inForce.daysLeft)}
        </p>
      )}
      {button && (
        <button
          type="button"
          onClick={() => onOpen(button!.route)}
          className="label-caps min-h-11 cursor-pointer bg-ink px-3 text-[12px] text-paper hover:bg-ink-2"
        >
          {button.label}
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// The slate and the ballot (screens §3, §4).
// ---------------------------------------------------------------------------------------------

export interface CandidateRowProps {
  candidate: CandidateView;
  mode: 'slate' | 'ballot';
  /** Ballot mode: the row selected (not yet cast). */
  selected?: boolean;
  /** Ballot mode: the caller's cast ballot (the chosen row reads "Your ballot"; others are dimmed). */
  castKey?: string | null;
  onSelect?: () => void;
  onEndorse?: () => void;
  endorsePending?: boolean;
  /** Slate mode: disables every Endorse button while one is in flight. */
  busy?: boolean;
}

function standingLine(c: CandidateView): string {
  const rank = c.rankTitle ?? copy.ward;
  const parts = [rank, `${c.standing.name} in ${c.standing.cityName}`];
  if (c.endorsements) parts.push(`endorsements ${c.endorsements.n} / ${c.endorsements.needed}`);
  return parts.join(' · ');
}

export function CandidateRow({
  candidate: c,
  mode,
  selected,
  castKey,
  onSelect,
  onEndorse,
  endorsePending,
  busy,
}: CandidateRowProps) {
  const [open, setOpen] = useState(false);
  const cast = castKey !== undefined && castKey !== null;
  const mine = cast && castKey === c.key;
  const main = (
    <span className="flex min-w-0 flex-1 items-start gap-2.5">
      <PersonMark avatar={c.avatar} factionId={c.factionId} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-body text-[16px] leading-tight font-semibold">
          {c.name}
          {c.you && <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">{copy.you}</span>}
        </span>
        <span className="label-caps text-[10px] text-muted">{standingLine(c)}</span>
        <span className="font-body text-[13px] leading-snug text-text-2 italic">{c.platform}</span>
      </span>
    </span>
  );

  if (mode === 'ballot') {
    return (
      <li className={cx('border-b border-dotted border-faint', cast && !mine && 'opacity-50')}>
        <button
          type="button"
          role="radio"
          aria-checked={mine || !!selected}
          disabled={cast}
          onClick={onSelect}
          className="flex min-h-16 w-full cursor-pointer items-center gap-3 py-2 text-left disabled:cursor-default"
          data-testid="ballot-row"
          data-key={c.key}
        >
          {main}
          {mine ? (
            <span className="shrink-0 font-mono text-[12px] text-petrol">Your ballot</span>
          ) : (
            <span
              className={cx(
                'size-6 shrink-0 rounded-full border-2 border-ink',
                selected && 'bg-ink shadow-[inset_0_0_0_3px_var(--color-paper)]',
              )}
              aria-hidden="true"
            />
          )}
        </button>
      </li>
    );
  }

  const e = c.endorsements;
  return (
    <li
      className="flex flex-col border-b border-dotted border-faint py-2"
      data-testid="slate-row"
      data-key={c.key}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-12 min-w-0 flex-1 cursor-pointer text-left"
        >
          {main}
        </button>
        {c.you ? null : c.endorsedByYou ? (
          <span className="shrink-0 font-mono text-[12px] text-petrol">{copy.endorsed}</span>
        ) : c.canEndorse && (c.canEndorse.ok || c.canEndorse.reason === 'PC') ? (
          <button
            type="button"
            onClick={onEndorse}
            disabled={!c.canEndorse.ok || busy}
            aria-busy={endorsePending || undefined}
            className="label-caps min-h-11 shrink-0 cursor-pointer border-[1.5px] border-ink px-2.5 text-[11px] hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-faint disabled:text-muted disabled:hover:bg-transparent"
          >
            {endorsePending ? '…' : c.canEndorse.ok ? copy.endorse(10) : copy.needsPc(10)}
          </button>
        ) : null}
      </div>
      {open && (
        <p className="pt-1 pl-[42px] font-mono text-[11px] text-muted">
          {e && e.names.length > 0
            ? `Endorsed by ${e.names.join(', ')}${e.more > 0 ? ` and ${e.more} more` : ''} · `
            : ''}
          Ward vote {c.wardVote} · from {c.standing.successes} Successes
        </p>
      )}
    </li>
  );
}

export interface SlateProps {
  candidates: CandidateView[];
  mode: 'slate' | 'ballot';
  selectedKey?: string | null;
  castKey?: string | null;
  onSelect?: (key: string) => void;
  onEndorse?: (candidacyId: string) => void;
  endorsingId?: string | null;
}

/** Players first in filing order, then the ward candidates in profile order (screens §3.1). */
export function Slate({
  candidates,
  mode,
  selectedKey,
  castKey,
  onSelect,
  onEndorse,
  endorsingId,
}: SlateProps) {
  const players = candidates.filter((c) => c.kind === 'player');
  const npcs = candidates.filter((c) => c.kind === 'npc');
  const row = (c: CandidateView) => (
    <CandidateRow
      key={c.key}
      candidate={c}
      mode={mode}
      selected={selectedKey === c.key}
      castKey={castKey}
      onSelect={() => onSelect?.(c.key)}
      onEndorse={() => c.candidacyId && onEndorse?.(c.candidacyId)}
      endorsePending={endorsingId === c.candidacyId}
      busy={!!endorsingId}
    />
  );
  return (
    <div
      className="flex flex-col"
      role={mode === 'ballot' ? 'radiogroup' : undefined}
      aria-label="Candidates"
    >
      {players.length > 0 && <ul className="flex flex-col">{players.map(row)}</ul>}
      {npcs.length > 0 && (
        <>
          <div className="label-caps border-t border-ink pt-1.5 text-[10px] text-muted">
            {copy.wardCandidates}
          </div>
          <ul className="flex flex-col">{npcs.map(row)}</ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The count (screens §5.2).
// ---------------------------------------------------------------------------------------------

export function CountTable({
  rows,
  factionId = 'collective',
}: {
  rows: CountRowView[];
  factionId?: CandidateView['factionId'];
}) {
  return (
    <div className="flex flex-col gap-1.5" data-testid="count-table">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="label-caps border-b border-ink text-[10px] text-muted">
            <th scope="col" className="w-6 py-1 text-left font-normal">
              #
            </th>
            <th scope="col" className="py-1 text-left font-normal">
              Name
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              Ward
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              End.
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              Votes
            </th>
            <th scope="col" className="py-1 pl-1 text-right font-normal">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className={cx(
                'border-b border-dotted border-faint',
                r.you && 'bg-paper-2',
                r.place === 8 && 'border-t border-t-ink',
              )}
              data-testid="count-row"
              data-seated={r.seated}
            >
              <td className={cx('py-1.5 font-label', r.seated && 'border-l-[3px] border-l-ink pl-1')}>
                {r.place}
              </td>
              <td className="py-1.5">
                <span className="flex items-center gap-1.5">
                  {r.kind === 'npc' && <FactionCrest factionId={factionId} size={8} />}
                  <span className="font-body">{r.name}</span>
                  {r.kind === 'npc' && <span className="label-caps text-[9px] text-muted">{copy.ward}</span>}
                  {r.you && <span className="font-mono text-[11px] text-muted">{copy.you}</span>}
                  {r.yourVote && <span className="font-mono text-[11px] text-petrol">{copy.yourVote}</span>}
                  {r.place === 7 && (
                    <span className="font-mono text-[10px] text-muted">· {copy.theLine}</span>
                  )}
                </span>
              </td>
              <td className="py-1.5 pl-2 text-right font-label">{r.wardVote}</td>
              <td className="py-1.5 pl-2 text-right font-label">{r.endorsements}</td>
              <td className="py-1.5 pl-2 text-right font-label">{r.votes}</td>
              <td className="py-1.5 pl-1 text-right font-label font-semibold">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono text-[11px] text-muted">{copy.formula}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The front page (screens §2.2): the photograph, the ELECTED stamp, the headline, the count.
// ---------------------------------------------------------------------------------------------

export function FrontPage({
  front,
  factionId = 'collective',
}: {
  front: FrontPageView;
  factionId?: CandidateView['factionId'];
}) {
  return (
    <section
      className="flex flex-col gap-3 border-b border-ink pb-3"
      data-testid="front-page"
      aria-label="The seat won"
    >
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-5">
        <figure className="flex shrink-0 flex-col items-center gap-1">
          <div className="relative w-[160px] lg:w-[200px]">
            <div className="relative aspect-[4/5] w-full overflow-hidden border border-ink bg-paper-2">
              {front.avatar && (
                <Picture
                  asset={front.avatar}
                  sizes="256px"
                  decorative
                  className="size-full object-cover object-top [filter:grayscale(1)_contrast(1.15)]"
                />
              )}
              <div
                className="halftone pointer-events-none absolute inset-0 text-ink opacity-30"
                aria-hidden="true"
              />
            </div>
            <div className="absolute -top-3 -right-8">
              <Stamp tone="success" label={copy.elected} className="text-[20px]" animate={front.animate} />
            </div>
          </div>
          <figcaption className="text-center font-mono text-[11px]" data-testid="front-page-caption">
            {copy.electedCaption(front.caption.name, front.caption.rankTitle, front.caption.cityName)}
          </figcaption>
        </figure>
        <div className="flex flex-col gap-2">
          <h2 className="text-center font-display text-[34px] leading-[1.02] font-black lg:text-left">
            {front.headline}
          </h2>
          {front.deck && (
            <p className="text-center font-display text-[17px] leading-snug font-bold text-text-2 italic lg:text-left">
              {front.deck}
            </p>
          )}
        </div>
      </div>
      <CountTable rows={front.count.rows} factionId={factionId} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// The chamber (screens §6): seats, the order paper, the menu.
// ---------------------------------------------------------------------------------------------

export function SeatGrid({
  seats,
  factionId,
}: {
  seats: CouncilSeatView[];
  factionId: CandidateView['factionId'];
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Seats" data-testid="seat-grid">
      {seats.map((s) => (
        <li key={s.seat} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => (o === s.seat ? null : s.seat))}
            aria-expanded={open === s.seat}
            className={cx(
              'flex min-h-16 w-full cursor-pointer flex-col items-center gap-1 py-1',
              s.you && 'outline-2 outline-ink',
            )}
            data-testid="seat"
            data-kind={s.kind}
          >
            <PersonMark avatar={s.avatar} factionId={factionId} size={36} />
            <span className="label-caps max-w-full truncate text-[9px]">{s.name}</span>
            <span className="font-mono text-[9px] text-muted">{s.seat}</span>
          </button>
          {open === s.seat && (
            <div className="absolute top-full left-1/2 z-10 w-44 -translate-x-1/2 border border-ink bg-paper p-2 text-[12px] shadow-[0_6px_16px_rgb(0_0_0/0.3)]">
              <p className="font-body font-semibold">{s.name}</p>
              <p className="font-mono text-[11px] text-muted">
                {s.rankTitle ?? copy.ward} · {s.standingName}
              </p>
              {s.votedFor && <p className="font-mono text-[11px]">voted for {s.votedFor}</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface OrdinanceRowProps {
  n?: number;
  name: string;
  line?: string;
  effectLine?: string;
  note?: string;
  /** Radio (a councillor choosing), a cast mark, or the division's count. */
  right?: 'radio' | 'mine' | number | null;
  selected?: boolean;
  passed?: boolean;
  dimmed?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export function OrdinanceRow({
  n,
  name,
  line,
  effectLine,
  note,
  right,
  selected,
  passed,
  dimmed,
  onSelect,
  disabled,
}: OrdinanceRowProps) {
  const content = (
    <>
      {n !== undefined && <span className="w-4 shrink-0 font-mono text-[12px] text-muted">{n}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-body text-[15px] font-semibold">
          {name}
          {passed && (
            <Stamp tone="success" label={copy.passed} className="border-2 px-1.5 py-0 text-[12px]" />
          )}
        </span>
        {line && <span className="font-body text-[13px] leading-snug text-text-2 italic">{line}</span>}
        {effectLine && <span className="label-caps text-[10px] text-petrol">{effectLine} · 5 days</span>}
        {note && <span className="font-mono text-[11px] text-muted">{note}</span>}
      </span>
      {right === 'radio' && (
        <span
          className={cx(
            'size-6 shrink-0 rounded-full border-2 border-ink',
            selected && 'bg-ink shadow-[inset_0_0_0_3px_var(--color-paper)]',
          )}
          aria-hidden="true"
        />
      )}
      {right === 'mine' && (
        <span className="shrink-0 font-mono text-[12px] text-petrol">{copy.yourVote}</span>
      )}
      {typeof right === 'number' && <span className="shrink-0 font-label text-[16px]">{right}</span>}
    </>
  );
  const cls = cx(
    'flex min-h-14 w-full items-center gap-3 border-b border-dotted border-faint py-2 text-left',
    dimmed && 'opacity-50',
  );
  return onSelect ? (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      onClick={onSelect}
      disabled={disabled}
      className={cx(cls, 'cursor-pointer disabled:cursor-not-allowed')}
      data-testid="ordinance-row"
    >
      {content}
    </button>
  ) : (
    <div className={cls} data-testid="ordinance-row">
      {content}
    </div>
  );
}

export interface OrderPaperProps {
  council: CouncilView;
  secretary: string;
  selected: string | null;
  onSelect?: (choice: string) => void;
  disabled?: boolean;
}

/** The order paper (screens §6.3, §6.4): items, Against all, the division's counts after it. */
export function OrderPaper({ council: c, secretary, selected, onSelect, disabled }: OrderPaperProps) {
  const choosing = c.window.voting && c.you.councillor && c.you.voted === null && !!onSelect;
  const right = (id: string, votes: number | null): OrdinanceRowProps['right'] =>
    c.paper.status === 'divided' ? votes : choosing ? 'radio' : c.you.voted === id ? 'mine' : null;
  return (
    <section aria-label={copy.theOrderPaper} className="flex flex-col" data-testid="order-paper">
      <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        {copy.theOrderPaper}
      </div>
      <div role={choosing ? 'radiogroup' : undefined} aria-label={copy.theOrderPaper}>
        {c.paper.items.map((it: OrderPaperItemView) => (
          <OrdinanceRow
            key={it.ordinanceId}
            n={it.n}
            name={it.name}
            line={it.line}
            effectLine={it.effectLine}
            note={
              it.movedBy.kind === 'branch'
                ? copy.branchMotionBy(secretary || it.movedBy.name)
                : copy.movedBy(it.movedBy.you ? 'you' : it.movedBy.name)
            }
            right={right(it.ordinanceId, it.votes)}
            selected={selected === it.ordinanceId}
            passed={it.passed}
            onSelect={choosing ? () => onSelect!(it.ordinanceId) : undefined}
            disabled={disabled}
          />
        ))}
        <OrdinanceRow
          name={copy.againstAll}
          right={right('against', c.paper.against)}
          selected={selected === 'against'}
          onSelect={choosing ? () => onSelect!('against') : undefined}
          disabled={disabled}
        />
      </div>
      {c.paper.rose && <p className="pt-1.5 font-mono text-[12px] text-failure">{copy.roseWithoutMotion}</p>}
    </section>
  );
}

export interface OrdinanceMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OrdinanceMenuItemView[];
  canAfford: boolean;
  onPropose: (ordinanceId: string) => void;
  pending: boolean;
}

/** Propose an ordinance · 20 PC: one tap proposes (screens §6.5). */
export function OrdinanceMenu({
  open,
  onOpenChange,
  items,
  canAfford,
  onPropose,
  pending,
}: OrdinanceMenuProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={canAfford ? 'Propose an ordinance · 20 PC' : `Propose an ordinance · ${copy.needsPc(20)}`}
    >
      <div className="flex flex-col" data-testid="ordinance-menu">
        {items.map((o) => (
          <OrdinanceRow
            key={o.ordinanceId}
            name={o.name}
            line={o.line}
            effectLine={o.effectLine}
            note={o.onPaper ? copy.onThePaper : undefined}
            dimmed={o.onPaper || !canAfford}
            onSelect={() => onPropose(o.ordinanceId)}
            disabled={o.onPaper || !canAfford || pending}
          />
        ))}
      </div>
    </BottomSheet>
  );
}
