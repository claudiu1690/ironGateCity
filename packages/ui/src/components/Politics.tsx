import { copy } from '@irongate/content/copy';
import type {
  FactionId,
  CandidateView,
  CouncilRowView,
  FrontPageView,
  PoliticsSummaryView,
  RuleCardView,
  RuleResultView,
} from '@irongate/rules';
import { useState } from 'react';
import { cx, formatUntil, formatWeekday } from '../format';
import { HelpButton, helpMark } from './Help';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Picture } from './Picture';
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

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

export interface ElectionLines {
  line1: string;
  line2: string;
  primary: { label: string; route: ElectionRoute } | null;
  secondary: { label: string; route: ElectionRoute } | null;
}

/**
 * The card's lines and buttons for a summary. The voting rework (tech design §9.2): the seven states
 * of design §4.1 with the v2 copy; the capital's `registered` is kept.
 */
export function electionLines(
  s: PoliticsSummaryView,
  now: number = Date.now(),
  names: Partial<Record<FactionId, string>> = {},
): ElectionLines {
  const place = s.placeName ?? s.cityName;
  const e = copy.election;
  const v = e.v2;
  const k = s.card;
  const stand = { label: copy.standForTheCouncil(s.standCost), route: '/council/slate' as const };
  const slate = (label: string) => ({ label, route: '/council/slate' as const });
  const desk = { label: e.toYourDesk, route: '/council' as const };
  const lines = (pair: readonly string[] | string[]) => ({ line1: pair[0]!, line2: pair[1]! });
  switch (k.state) {
    case 'belowRank':
      return {
        ...lines(v.belowRank(s.cityName, s.rank2Title, k.rank2Fxp, k.fxp)),
        primary: null,
        secondary: slate(e.seeWhosStanding),
      };
    case 'vote':
      // TODO(phase 4): the capital's card lines (*Which rule for Irongate next week?*, design §9.8).
      return {
        ...lines(v.vote(s.cityName, formatUntil(k.closesAt, now), formatWeekday(k.runsFrom))),
        primary: { label: e.voteNow, route: '/council/ballot' },
        secondary: null,
      };
    case 'voted':
      return {
        ...lines(v.voted(k.votedFor ?? '', formatWeekday(k.countAt), s.paperShortName)),
        primary: { label: e.seeTheBallot, route: '/council/ballot' },
        secondary: null,
      };
    case 'result': {
      const r = k.result;
      // A city with no rule in force and no count yet (test cities only): the kicker's question alone.
      if (!r) return { line1: v.kicker(place), line2: '', primary: null, secondary: k.canStand ? stand : null };
      const until = formatWeekday(r.runsUntil - 1);
      const next = formatWeekday(r.nextVoteAt);
      const fname = (f: FactionId) => names[f] ?? f;
      const c = r.capital;
      const pair =
        r.how === 'votes'
          ? v.result(r.winner, r.votes, r.voters, until, next)
          : r.how === 'tie'
            ? v.resultTie(r.winner, r.votes, until, next)
            : r.how === 'fallback'
              ? // TODO(phase 3): `resultFallbackUnrest` when card 1 was a councillor's (needs the name).
                v.resultFallback(r.winner, until, next)
              : r.how === 'carried'
                ? v.resultCarried(r.winner, until, next)
                : r.how === 'draw'
                  ? v.resultDraw(r.winner, until, next)
                  : // `seats`: the capital (TODO(phase 4): the card's capital lines, design §9.8).
                    c && c.factionIds.length > 1
                    ? v.resultSharedSeats(
                        r.winner,
                        fname(c.factionIds[0]!),
                        fname(c.factionIds[1]!),
                        c.seats,
                        place,
                        c.districtSeats.map(fname),
                        until,
                        next,
                      )
                    : v.resultSeats(
                        r.winner,
                        c?.factionIds[0] ? fname(c.factionIds[0]) : '',
                        c?.seats ?? 0,
                        place,
                        (c?.districtSeats ?? []).map(fname),
                        until,
                        next,
                      );
      return {
        ...lines(pair),
        primary: { label: e.seeTheResult, route: '/council/count' },
        secondary: k.canStand ? stand : null,
      };
    }
    case 'standing':
      return {
        ...lines(
          v.standing(
            k.standing?.rule ?? '',
            formatWeekday(k.countAt),
            k.standing?.backers ?? 0,
            !(k.standing?.branchLine ?? false),
          ),
        ),
        primary: slate(e.seeTheCandidates),
        secondary: null,
      };
    case 'councillor':
      // TODO(phase 4): the capital's *your party's card is set* form (design §8.6 Q4).
      return {
        ...lines(
          v.councillor(
            k.councillor?.rule ?? '',
            formatUntil(k.councillor?.changeUntil ?? k.closesAt, now),
            formatWeekday(k.pollsOpenAt),
          ),
        ),
        primary: desk,
        secondary: null,
      };
    case 'nextInLine':
      return { ...lines(v.nextInLine()), primary: desk, secondary: null };
    case 'registered':
      // Slice 4 (screens §7.2): registered in a district, the first vote not yet open.
      return {
        // The first polls this player votes in (the server's weekday: this cycle's or the next's).
        ...lines(e.registered(place, s.pollsFromWeekday)),
        primary: slate(e.seeWhosStanding),
        secondary: null,
      };
  }
}

export interface ElectionCardProps {
  summary: PoliticsSummaryView;
  /** Slice 4: every party's short name (the capital's result line). */
  factionNames?: Partial<Record<FactionId, string>>;
  onOpen: (route: ElectionRoute) => void;
  /**
   * `card`: wide screens, the side column and the HQ sheet (kicker with its note, two lines, the
   * rule line, one or two buttons); `row`: the paper's row (one tap to the primary route);
   * `compact`: one 44 px line, *ELECTION · line 1 ›*, under a phone's plate (the card folded).
   */
  layout?: 'card' | 'row' | 'compact';
  // TODO(phase 3): `ballotInline`, the rule cards and *Vote for …* on the side column (tech design §9.2).
  now?: number;
  className?: string;
}

export function ElectionCard({
  summary: s,
  onOpen,
  layout = 'card',
  now,
  className,
  factionNames,
}: ElectionCardProps) {
  const l = electionLines(s, now, factionNames);
  // Slice 4 (screens §7.2): in the capital the kicker names the district.
  const kicker =
    s.seats === 2 ? copy.election.v2.capitalKicker(s.placeName ?? s.cityName) : copy.election.v2.kicker(s.cityName);
  const k = s.card;
  const strong = k.state === 'vote' || k.state === 'councillor';
  // Tech design §9.2: line 3, the rule in force, in every state but `result`.
  const rule =
    s.inForce && k.state !== 'result'
      ? copy.election.ruleNow(s.inForce.name, s.inForce.plainLine, s.inForce.daysLeft)
      : null;
  const firstTime = k.firstTime ? copy.election.v2.firstTime(s.cityName, s.rank3Title) : null;
  const target = l.primary ?? l.secondary;
  if (layout !== 'card') {
    const body = (
      <>
        <span className={cx('flex min-w-0', layout === 'compact' ? 'items-baseline gap-2' : 'flex-col')}>
          {layout === 'compact' && (
            <span className="label-caps shrink-0 text-[9.5px] font-semibold text-muted">
              {copy.election.v2.rowKicker}
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
        aria-label={kicker}
        className={cx('flex flex-col', className)}
        data-testid="polling-day"
        data-state={k.state}
      >
        {layout === 'row' && (
          <div className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
            {copy.election.v2.rowKicker}
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
      aria-label={kicker}
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
          s.seats === 2
            ? copy.help.capitalElection(s.rank2Title, s.rank3Title)
            : copy.help.election(s.cityName, s.rank2Title, s.rank3Title),
          ...(s.inForce ? [copy.help.rule(s.cityName, s.seats === 2 ? 10 : 7)] : []),
        ]}
        label={`What the ${s.cityName} election means`}
        testId="election-help"
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] font-semibold', helpMark)}>{kicker}</span>
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
      {k.state === 'standing' && k.standing?.branchLine && (
        <p className="font-mono text-[12px] text-petrol">{copy.branchEndorsesYou}</p>
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
  if (c.backers) return copy.stand.playerRow(rank, c.standing.name, c.standing.cityName, c.backers.n);
  return [rank, `${c.standing.name} in ${c.standing.cityName}`].join(' · ');
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
        {/* TODO(phase 3): the slate's rows as design §9.6 words them (StandCard and the list). */}
        {c.rule && (
          <span className="font-body text-[13px] leading-snug text-text-2 italic">{copy.stand.ruleOf(c.rule.name)}</span>
        )}
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

  const e = c.backers;
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
        {c.you ? null : c.backedByYou ? (
          <span className="shrink-0 font-mono text-[12px] text-petrol">{copy.endorsed}</span>
        ) : c.canBack && (c.canBack.ok || c.canBack.reason === 'PC') ? (
          <button
            type="button"
            onClick={onEndorse}
            disabled={!c.canBack.ok || busy}
            aria-busy={endorsePending || undefined}
            className="label-caps min-h-11 shrink-0 cursor-pointer border-[1.5px] border-ink px-2.5 text-[11px] hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-faint disabled:text-muted disabled:hover:bg-transparent"
          >
            {endorsePending ? '…' : c.canBack.ok ? copy.endorse(10) : copy.needsPc(10)}
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
          {/* QA slice 4 m6: on the ballot the names come first and the two lines that say what local
              candidates are follow them, so a name shows above the vote button on a short phone. */}
          {mode === 'ballot' && <ul className="flex flex-col">{npcs.map(row)}</ul>}
          <p className="font-mono text-[11.5px] leading-snug text-muted" data-testid="local-candidates-line">
            {copy.localCandidatesLine}
          </p>
          <p className="font-mono text-[11.5px] leading-snug text-muted" data-testid="last-seat-close">
            {copy.lastSeatClose}
          </p>
          {mode !== 'ballot' && <ul className="flex flex-col">{npcs.map(row)}</ul>}
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
  /** Slice 4: the capital's note (two seats a district, three parties). */
  capital?: boolean;
}

/**
 * Review 3 (answers §6.4): the visible Courier link *How elections work* (dotted underline) under the
 * title on who's standing, the vote and the result; it opens the five-line note the Election card's
 * kicker opens.
 */
export function HowElectionsWork({ cityName, rank2, rank3, className, capital }: HowElectionsWorkProps) {
  return (
    <HelpButton
      notes={[capital ? copy.help.capitalElection(rank2, rank3) : copy.help.election(cityName, rank2, rank3)]}
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

/** Whose a card is, in the Courier line under it (design §4.2). */
export function whoseLine(card: RuleCardView, names: Partial<Record<FactionId, string>>): string {
  const w = card.whose;
  if (w.kind === 'councillor') return w.you ? copy.rule.whose.you : copy.rule.whose.councillor(w.name);
  const [a, b] = w.factionIds;
  if (a && b) return copy.rule.whose.shared(names[a] ?? a, names[b] ?? b);
  return copy.rule.whose.branch(w.by);
}

/**
 * The voting rework, phase 2: the rule cards of a count as plain rows (name, votes, PASSED on the
 * winner). TODO(phase 3): `RuleCards` in result mode (share bars, *runs until*, tech design §9.4).
 */
export function RuleResultList({
  rule,
  names = {},
}: {
  rule: RuleResultView | null;
  names?: Partial<Record<FactionId, string>>;
}) {
  if (!rule) return null;
  return (
    <section aria-label={copy.ruleResult.title(rule.weekday)} className="flex flex-col" data-testid="rule-result">
      {rule.cards.map((c) => (
        <OrdinanceRow
          key={c.ordinanceId}
          name={c.name}
          line={c.plainLine}
          note={
            c.won
              ? `${whoseLine(c, names)} · ${copy.ruleResult.runsUntil(formatWeekday(rule.runsUntil - 1))}`
              : whoseLine(c, names)
          }
          right={c.votes}
          passed={c.won}
        />
      ))}
    </section>
  );
}

/**
 * The voting rework, phase 2: the council of a count as plain rows, the seated then *the line* then
 * the unseated. TODO(phase 3): `CouncilRows` with the popover (tech design §9.4).
 */
export function CouncilRowList({
  rows,
  factionId = 'collective',
}: {
  rows: CouncilRowView[];
  factionId?: CandidateView['factionId'];
}) {
  const seated = rows.filter((r) => r.seated).length;
  return (
    <section aria-label={copy.ruleResult.council} className="flex flex-col" data-testid="council-rows">
      <div className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
        {copy.ruleResult.council}
      </div>
      <ul className="flex flex-col">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className={cx(
              'flex min-h-12 items-center gap-3 border-b border-dotted border-faint py-1.5',
              r.you && 'bg-paper-2',
              i === seated && seated > 0 && 'border-t border-t-ink',
            )}
            data-testid="council-row"
            data-seated={r.seated}
          >
            <PersonMark avatar={r.avatar} factionId={r.factionId ?? factionId} size={28} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-body text-[15px] font-semibold">
                {r.name}
                {r.you && <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">{copy.you}</span>}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {r.kind === 'player'
                  ? copy.seats.row(r.rankTitle ?? '', r.standingName, r.backers)
                  : copy.seats.localRow(r.standingName)}
                {r.rule ? ` · ${r.you ? copy.seats.rule(r.rule.name) : copy.stand.ruleOf(r.rule.name)}` : ''}
              </span>
            </span>
            {!r.seated && r.short !== null && (
              <span className="shrink-0 font-mono text-[11px] text-muted">
                {copy.seats.short(ORDINALS[r.place - 1] ?? String(r.place), r.short)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
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
      {/* TODO(phase 3): the three result cards and *What now* under the headline (tech design §10). */}
      <RuleResultList rule={front.count.rule} />
      <CouncilRowList rows={front.count.council} factionId={factionId} />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// A rule as a row (the rule picker; phase 2's stand-ins for the cards).
// ---------------------------------------------------------------------------------------------

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
