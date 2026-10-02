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
import { HelpButton, helpMark } from './Help';
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
// Review 2 (screens §1a, §2.1, §7): the Election card. One component for the city screen, the
// paper's row and the HQ sheet: the phase in plain words, what the player can do now, the countdown
// and one button. The server picks the state (`summary.card`); this words it.
// ---------------------------------------------------------------------------------------------

type ElectionRoute = NonNullable<PoliticsSummaryView['route']>;

const DAY_MS = 86_400_000;
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/** Whole days to a boundary, rounded up (at least 1 while it is ahead). */
const daysTo = (at: number, now: number) => Math.max(1, Math.ceil((at - now) / DAY_MS));

export interface ElectionLines {
  line1: string;
  line2: string;
  primary: { label: string; route: ElectionRoute } | null;
  secondary: { label: string; route: ElectionRoute } | null;
}

/** The card's lines and buttons for a summary (screens §2.1's table). */
export function electionLines(s: PoliticsSummaryView, now: number = Date.now()): ElectionLines {
  const e = copy.election;
  const k = s.card;
  const stand = { label: copy.standForTheCouncil(s.standCost), route: '/council/slate' as const };
  const slate = (label: string) => ({ label, route: '/council/slate' as const });
  const lines = (pair: readonly string[] | string[]) => ({ line1: pair[0]!, line2: pair[1]! });
  switch (k.state) {
    case 'belowRank':
      return {
        ...lines(e.belowRank(s.cityName, formatWeekday(k.countAt), s.rank2Title, k.rank2Fxp, k.fxp)),
        primary: null,
        secondary: slate(e.seeWhosStanding),
      };
    case 'candidates':
      return {
        ...lines(e.candidates(formatWeekday(k.pollsOpenAt), e.days(daysTo(k.closesAt, now)))),
        primary: k.canStand ? stand : slate(e.seeWhosStanding),
        secondary: k.canStand ? slate(e.seeWhosStanding) : null,
      };
    case 'standing':
      return {
        ...lines(e.standing(k.backers?.n ?? 0, k.backers?.needed ?? 2, formatUntil(k.closesAt))),
        primary: slate(e.seeTheCandidates),
        secondary: null,
      };
    case 'backing':
      return {
        ...lines(e.backing(k.backing ?? '', formatWeekday(k.pollsOpenAt), e.days(daysTo(k.closesAt, now)))),
        primary: slate(e.seeWhosStanding),
        secondary: null,
      };
    case 'voting':
      return {
        ...lines(e.voting(formatUntil(k.closesAt), daysTo(k.closesAt, now))),
        primary: { label: e.voteNow, route: '/council/ballot' },
        secondary: null,
      };
    case 'candidateVoting':
      return {
        ...lines(e.candidateVoting(formatUntil(k.closesAt))),
        primary: { label: e.voteNow, route: '/council/ballot' },
        secondary: null,
      };
    case 'voted':
      return {
        ...lines(e.voted(k.votedFor ?? '', formatWeekday(k.countAt), s.paperShortName)),
        primary: { label: e.seeTheCandidates, route: '/council/ballot' },
        secondary: null,
      };
    case 'result': {
      const r = k.result!;
      const y = r.yourLine;
      const your = !y
        ? null
        : y.kind === 'elected'
          ? e.yourLine.elected(ORDINALS[y.place - 1] ?? String(y.place))
          : y.kind === 'missed'
            ? e.yourLine.missed(y.margin)
            : y.kind === 'voteWon'
              ? e.yourLine.voteWon(y.name)
              : e.yourLine.voteLost(y.name);
      return {
        ...lines(e.result(r.winner, your, formatWeekday(r.councilUntil - 1), formatUntil(r.namesUntil))),
        primary: { label: e.seeTheResult, route: '/council/count' },
        secondary: k.canStand ? stand : null,
      };
    }
    case 'councilSits':
      return {
        ...lines(e.councilSits(formatUntil(k.closesAt), e.days(daysTo(k.closesAt, now)))),
        primary: { label: e.voteOnTheRule, route: '/council' },
        secondary: null,
      };
    case 'councilVoted':
      return {
        ...lines(e.councilVoted(k.rule?.votedFor ?? e.noneOfThese, formatWeekday(k.closesAt))),
        primary: { label: e.seeTheCouncil, route: '/council' },
        secondary: null,
      };
  }
}

export interface ElectionCardProps {
  summary: PoliticsSummaryView;
  onOpen: (route: ElectionRoute) => void;
  /**
   * `card`: wide screens, the side column and the HQ sheet (kicker with its note, two lines, the
   * rule line, one or two buttons); `row`: the paper's row (one tap to the primary route);
   * `compact`: one 44 px line, *ELECTION · line 1 ›*, under a phone's plate (the card folded).
   */
  layout?: 'card' | 'row' | 'compact';
  now?: number;
  className?: string;
}

export function ElectionCard({ summary: s, onOpen, layout = 'card', now, className }: ElectionCardProps) {
  const l = electionLines(s, now);
  const k = s.card;
  const strong = k.state === 'voting' || k.state === 'candidateVoting' || k.state === 'councilSits';
  const rule = s.inForce ? copy.election.ruleLine(s.inForce.name, s.inForce.daysLeft) : null;
  const firstTime = k.firstTime ? copy.election.firstTime(s.cityName, s.rank3Title) : null;
  const target = l.primary ?? l.secondary;
  if (layout !== 'card') {
    const body = (
      <>
        <span className={cx('flex min-w-0', layout === 'compact' ? 'items-baseline gap-2' : 'flex-col')}>
          {layout === 'compact' && (
            <span className="label-caps shrink-0 text-[9.5px] font-semibold text-muted">
              {copy.election.rowKicker}
            </span>
          )}
          {layout === 'row' && firstTime && (
            <span className="font-body text-[12px] leading-snug text-text-2 italic">{firstTime}</span>
          )}
          <span
            className={cx(
              'font-body leading-snug',
              layout === 'compact' ? 'truncate text-[13.5px]' : 'text-[15px]',
              strong && 'font-semibold',
            )}
            data-testid="election-line1"
          >
            {l.line1}
          </span>
          {layout === 'row' && (
            <span className="font-mono text-[11px] text-muted" data-testid="election-line2">
              {l.line2}
            </span>
          )}
        </span>
        {target && (
          <span className="font-label text-[18px]" aria-hidden="true">
            ›
          </span>
        )}
      </>
    );
    return (
      <section
        aria-label={copy.election.kicker(s.cityName)}
        className={cx('flex flex-col', className)}
        data-testid="polling-day"
        data-state={k.state}
      >
        {layout === 'row' && (
          <div className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
            {copy.election.rowKicker}
          </div>
        )}
        {target ? (
          <button
            type="button"
            onClick={() => onOpen(target.route)}
            className={cx(
              'flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left hover:bg-paper-card',
              layout === 'row' ? 'border-b border-dotted border-faint py-1.5' : 'py-0.5',
            )}
            data-testid="polling-day-row"
            data-state={k.state}
          >
            {body}
          </button>
        ) : (
          <div
            className="flex min-h-11 items-center justify-between gap-3 border-b border-dotted border-faint py-1.5"
            data-testid="polling-day-row"
            data-state={k.state}
          >
            {body}
          </div>
        )}
      </section>
    );
  }
  return (
    <section
      aria-label={copy.election.kicker(s.cityName)}
      className={cx('flex flex-col gap-1 border-[1.5px] border-ink bg-paper-card px-3 py-2', className)}
      data-testid="election-card"
      data-state={k.state}
    >
      {firstTime && (
        <p
          className="font-body text-[12.5px] leading-snug text-text-2 italic"
          data-testid="election-first-time"
        >
          {firstTime}
        </p>
      )}
      <HelpButton
        notes={[
          copy.help.election(s.cityName, s.rank2Title, s.rank3Title),
          ...(s.inForce ? [copy.help.rule(s.cityName)] : []),
        ]}
        label={`What the ${s.cityName} election means`}
        testId="election-help"
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] font-semibold', helpMark)}>
          {copy.election.kicker(s.cityName)}
        </span>
      </HelpButton>
      <p
        className={cx('font-body text-[15px] leading-snug', strong && 'font-semibold')}
        data-testid="election-line1"
      >
        {l.line1}
      </p>
      <p className="font-mono text-[11px] text-muted" data-testid="election-line2">
        {l.line2}
      </p>
      {k.state === 'standing' && k.backers && (
        <>
          <ProgressBar
            label={copy.election.kicker(s.cityName)}
            value={k.backers.n}
            max={k.backers.needed}
            tone="ink"
          />
          {k.backers.branchLine && (
            <p className="font-mono text-[12px] text-petrol">{copy.branchEndorsesYou}</p>
          )}
        </>
      )}
      {rule && (
        <p className="font-mono text-[11px] text-muted" data-testid="election-rule">
          {rule}
        </p>
      )}
      {(l.primary || l.secondary) && (
        <div className="flex flex-col gap-1.5 pt-1 sm:flex-row">
          {l.primary && (
            <button
              type="button"
              onClick={() => onOpen(l.primary!.route)}
              className="label-caps min-h-11 flex-1 cursor-pointer bg-ink px-3 text-[12px] text-paper hover:bg-ink-2"
              data-testid="election-primary"
            >
              {l.primary.label}
            </button>
          )}
          {l.secondary && (
            <button
              type="button"
              onClick={() => onOpen(l.secondary!.route)}
              className="label-caps min-h-11 flex-1 cursor-pointer border-[1.5px] border-ink px-3 text-[12px] text-ink hover:bg-ink hover:text-paper"
              data-testid="election-secondary"
            >
              {l.secondary.label}
            </button>
          )}
        </div>
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
  if (c.endorsements) parts.push(copy.backersOf(c.endorsements.n, c.endorsements.needed));
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
            <span className="shrink-0 font-mono text-[12px] text-petrol">{copy.youVotedFor(c.name)}</span>
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
            ? `${copy.backedBy(`${e.names.join(', ')}${e.more > 0 ? ` and ${e.more} more` : ''}`)} · `
            : ''}
          {copy.localSupport(c.wardVote)}
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
  // Review 3 (GDD §15.10, answers §6.2): who's who is said on every list, in words. Players first
  // under their own rule, then the local candidates with the line that says what they are.
  const kicker = 'label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold';
  return (
    <div
      className="flex flex-col gap-1"
      role={mode === 'ballot' ? 'radiogroup' : undefined}
      aria-label="Candidates"
    >
      <h2 className={kicker} data-testid="players-standing">
        {copy.playersStanding}
      </h2>
      {players.length > 0 ? (
        <ul className="flex flex-col">{players.map(row)}</ul>
      ) : (
        <p className="pb-1 font-mono text-[11.5px] text-muted" data-testid="no-players-standing">
          {copy.noPlayersStanding}
        </p>
      )}
      {npcs.length > 0 && (
        <>
          <h2 className={cx(kicker, 'mt-2')} data-testid="local-candidates">
            {copy.wardCandidates}
          </h2>
          <p className="font-mono text-[11.5px] leading-snug text-muted" data-testid="local-candidates-line">
            {copy.localCandidatesLine}
          </p>
          <p className="font-mono text-[11.5px] leading-snug text-muted" data-testid="last-seat-close">
            {copy.lastSeatClose}
          </p>
          <ul className="flex flex-col">{npcs.map(row)}</ul>
        </>
      )}
    </div>
  );
}

export interface HowElectionsWorkProps {
  cityName: string;
  /** The faction's Rank 2 and Rank 3 titles (who votes, who stands). */
  rank2: string;
  rank3: string;
  className?: string;
}

/**
 * Review 3 (answers §6.4): the visible Courier link *How elections work* (dotted underline) under the
 * title on who's standing, the vote and the result; it opens the five-line note the Election card's
 * kicker opens.
 */
export function HowElectionsWork({ cityName, rank2, rank3, className }: HowElectionsWorkProps) {
  return (
    <HelpButton
      notes={[copy.help.election(cityName, rank2, rank3)]}
      label={copy.howElectionsWork}
      testId="how-elections-work"
      className={cx(
        '-my-2 inline-flex items-center self-start font-mono text-[12px] text-ink',
        helpMark,
        className,
      )}
    >
      {copy.howElectionsWork}
    </HelpButton>
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
              <span className="max-[400px]:hidden">{copy.resultColumns[2]}</span>
              <span className="min-[401px]:hidden">{copy.resultColumnsShort[2]}</span>
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              <span className="max-[400px]:hidden">{copy.resultColumns[3]}</span>
              <span className="min-[401px]:hidden">{copy.resultColumnsShort[3]}</span>
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              {copy.resultColumns[4]}
            </th>
            <th scope="col" className="py-1 pl-1 text-right font-normal">
              {copy.resultColumns[5]}
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

/** Propose an ordinance · 20 Political Capital: one tap proposes (screens §6.5). */
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
      title={canAfford ? copy.propose(20) : `${copy.propose(20).split(' · ')[0]} · ${copy.needsPc(20)}`}
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
