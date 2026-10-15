import { copy } from '@irongate/content/copy';
import type { FactionId, CandidateView, FrontPageView, PoliticsSummaryView } from '@irongate/rules';
import { useState } from 'react';
import { cx, formatUntil, formatWeekday } from '../format';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import { PersonMark } from './PersonMark';
import { Picture } from './Picture';
import { RuleCards, councilRuleNote, ruleWinnerLines } from './RuleCard';
import { Stamp } from './Stamp';

export { PersonMark } from './PersonMark';

/**
 * Slice 3's political screens (docs/design/slice-3-screens.md), reworked for the rule vote
 * (docs/design/voting-simplified.md §4; tech design §9.2, §9.6, §10): plain props, no tRPC. They
 * render the server's views and compute nothing but wording.
 */

// ---------------------------------------------------------------------------------------------
// The Election card (design §4.1): one component for the city screen, the paper's row and the HQ
// sheet. The server picks the state (`summary.card`); this words it.
// ---------------------------------------------------------------------------------------------

type ElectionRoute = NonNullable<PoliticsSummaryView['route']>;

export interface ElectionLines {
  line1: string;
  line2: string;
  primary: { label: string; route: ElectionRoute } | null;
  secondary: { label: string; route: ElectionRoute } | null;
}

/**
 * The card's lines and buttons for a summary (tech design §9.2): the seven states of design §4.1, the
 * result's lines by `how` (design §8.2), and the capital's `registered`.
 */
export function electionLines(
  s: PoliticsSummaryView,
  now: number = Date.now(),
  names: Partial<Record<FactionId, string>> = {},
): ElectionLines {
  const place = s.placeName ?? s.cityName;
  const e = copy.election;
  const k = s.card;
  const stand = { label: copy.standForTheCouncil(s.standCost), route: '/council/slate' as const };
  const slate = (label: string) => ({ label, route: '/council/slate' as const });
  const desk = { label: e.toYourDesk, route: '/council' as const };
  const ballot = (label: string) => ({ label, route: '/council/ballot' as const });
  const lines = (pair: readonly string[] | string[]) => ({ line1: pair[0]!, line2: pair[1]! });
  // The capital (design §4.1, §9.8): a district's card asks about Irongate, and a councillor's party
  // has one card, set by the bloc's top seat (design §8.6 Q4).
  const capital = s.seats === 2;
  const partyCard = k.councillor?.capital ?? null;
  switch (k.state) {
    case 'belowRank':
      return {
        ...lines(e.belowRank(s.cityName, s.rank2Title, k.rank2Fxp, k.fxp)),
        primary: null,
        secondary: ballot(e.seeTheBallot),
      };
    case 'vote': {
      const [line1, line2] = e.vote(s.cityName, formatUntil(k.closesAt, now), formatWeekday(k.runsFrom));
      return {
        line1: capital ? copy.capitalElection.question : line1!,
        line2: line2!,
        primary: ballot(e.voteNow),
        secondary: null,
      };
    }
    case 'voted':
      return {
        ...lines(e.voted(k.votedFor ?? '', formatWeekday(k.countAt), s.paperShortName)),
        primary: null,
        secondary: ballot(e.seeTheBallot),
      };
    case 'result': {
      const r = k.result;
      // A city with no rule in force and no count yet (test cities only): the kicker's question alone.
      if (!r) return { line1: e.kicker(place), line2: '', primary: null, secondary: k.canStand ? stand : null };
      const until = formatWeekday(r.runsUntil - 1);
      const next = formatWeekday(r.nextVoteAt);
      const fname = (f: FactionId) => names[f] ?? f;
      const c = r.capital;
      const pair =
        r.how === 'votes'
          ? e.result(r.winner, r.votes, r.voters, until, next)
          : r.how === 'tie'
            ? e.resultTie(r.winner, r.votes, until, next)
            : r.how === 'fallback'
              ? r.whose === 'councillor' && r.by
                ? e.resultFallbackUnrest(r.winner, r.by, s.cityName, until)
                : e.resultFallback(r.winner, until, next)
              : r.how === 'carried'
                ? e.resultCarried(r.winner, until, next)
                : r.how === 'draw'
                  ? e.resultDraw(r.winner, until, next)
                  : // `seats`: the capital (design §8.2): the bloc's party, or a shared card's two.
                    c && c.factionIds.length > 1
                    ? e.resultSharedSeats(
                        r.winner,
                        fname(c.factionIds[0]!),
                        fname(c.factionIds[1]!),
                        c.seats,
                        place,
                        c.districtSeats.map(fname),
                        until,
                        next,
                      )
                    : (r.seatTie ? e.resultSeatsTie : e.resultSeats)(
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
          e.standing(
            k.standing?.rule ?? '',
            formatWeekday(k.countAt),
            k.standing?.backers ?? 0,
            !(k.standing?.branchLine ?? false),
          ),
        ),
        primary: null,
        secondary: slate(e.seeWhosStanding),
      };
    case 'councillor':
      return {
        ...lines(
          e.councillor(
            k.councillor?.rule ?? '',
            formatUntil(k.councillor?.changeUntil ?? k.closesAt, now),
            formatWeekday(k.pollsOpenAt),
          ),
        ),
        primary: desk,
        secondary: null,
      };
    case 'nextInLine':
      // The capital: no line to be next in; the councillor who set the party's card (design §8.6 Q4).
      return {
        ...lines(partyCard && !partyCard.leadsBloc ? e.partyCardSet(partyCard.by, partyCard.rule) : e.nextInLine()),
        primary: null,
        secondary: desk,
      };
    case 'registered':
      // Slice 4 (screens §7.2): registered in a district, the first vote not yet open.
      return {
        ...lines(e.registered(place, s.pollsFromWeekday)),
        primary: slate(e.seeWhosStanding),
        secondary: null,
      };
  }
}

/** The desktop card as the ballot (tech design §9.2): the selection and the vote are the page's. */
export interface BallotInline {
  selected: string | null;
  onSelect: (ordinanceId: string) => void;
  onVote: () => void;
  pending: boolean;
}

export interface ElectionCardProps {
  summary: PoliticsSummaryView;
  /** Slice 4: every party's short name (the capital's result line). */
  factionNames?: Partial<Record<FactionId, string>>;
  onOpen: (route: ElectionRoute) => void;
  /**
   * `card`: wide screens, the side column and the HQ sheet (kicker with its note, two lines, the
   * rule line, one or two buttons); `row`: the paper's row (one tap to the primary route);
   * `compact`: one 44 px line, *COUNCIL RULE · line 1 ›*, under a phone's plate (the card folded).
   */
  layout?: 'card' | 'row' | 'compact';
  /**
   * The city screen's side column (from 640 px): on days 2–4 the card is the ballot, the three cards
   * with radio rings and *Vote for …* under them (desktop vote = two taps; design §4.1, §8.1 Q9).
   */
  ballotInline?: BallotInline;
  /** Rank titles of the reader's party, for the *Council rule* note (who votes, who stands). */
  rankTitles?: { rank2: string; rank3: string };
  now?: number;
  className?: string;
  /**
   * Slice 7 (screens §9.1): the petition to dissolve the council: the third line while one is open
   * (*A petition to dissolve the council: 2 of 4 names by …*) and the button to its page
   * (*Petition to dissolve the council · 10 Political Capital*, *Sign · 10 Political Capital*, *Signed*).
   */
  petition?: { line: string | null; label: string; onOpen: () => void } | null;
}

export function ElectionCard({
  summary: s,
  onOpen,
  layout = 'card',
  ballotInline,
  rankTitles,
  now,
  className,
  factionNames,
  petition,
}: ElectionCardProps) {
  const l = electionLines(s, now, factionNames);
  const capital = s.seats === 2;
  // Slice 4 (screens §7.2): in the capital the kicker names the district.
  const kicker = capital ? copy.election.capitalKicker(s.placeName ?? s.cityName) : copy.election.kicker(s.cityName);
  const k = s.card;
  const strong = k.state === 'vote' || k.state === 'councillor';
  // Tech design §9.2: line 3, the rule in force, in every state but `result`.
  const rule =
    s.inForce && k.state !== 'result'
      ? copy.election.ruleNow(s.inForce.name, s.inForce.plainLine, s.inForce.daysLeft)
      : null;
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
          {layout === 'row' && rule && (
            <span className="font-mono text-[11px] text-muted" data-testid="election-rule">
              {rule}
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
  // The desktop card as the ballot: the set cards with radio rings, *Vote for …* under them.
  const inline =
    ballotInline && k.state === 'vote' && s.ballot && s.ballot.status === 'set' && s.ballot.canVote ? s.ballot : null;
  const chosen = inline?.cards.find((c) => c.ordinanceId === ballotInline?.selected) ?? null;
  return (
    <section
      aria-label={kicker}
      className={cx('flex flex-col gap-1 border-[1.5px] border-ink bg-paper-card px-3 py-2', className)}
      data-testid="election-card"
      data-state={k.state}
    >
      {firstTime && (
        <p className="font-body text-[12.5px] leading-snug text-text-2 italic" data-testid="election-first-time">
          {firstTime}
        </p>
      )}
      <HelpButton
        notes={[
          councilRuleNote({
            cityName: capital ? 'Irongate' : s.cityName,
            rank2: rankTitles?.rank2 ?? s.rank2Title,
            rank3: rankTitles?.rank3 ?? s.rank3Title,
            fromWeekday: formatWeekday(k.pollsOpenAt),
            toWeekday: formatWeekday(k.countAt - 1),
            capital,
          }),
        ]}
        more={capital ? copy.help.ruleMore : undefined}
        label={`${kicker}: ${copy.ballot.howTheVoteWorks}`}
        testId="election-help"
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] font-semibold', helpMark)}>{kicker}</span>
      </HelpButton>
      <p className={cx('font-body text-[15px] leading-snug', strong && 'font-semibold')} data-testid="election-line1">
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
      {inline && ballotInline ? (
        <div className="flex flex-col gap-1.5 pt-1" data-testid="election-ballot">
          <RuleCards
            cards={inline.cards}
            mode="vote"
            label={copy.ballot.title}
            names={factionNames}
            capital={capital}
            selected={ballotInline.selected}
            onSelect={ballotInline.onSelect}
            disabled={ballotInline.pending}
          />
          <Button
            className="w-full"
            disabled={!chosen}
            pending={ballotInline.pending}
            onClick={ballotInline.onVote}
            data-testid="election-vote"
          >
            {chosen ? copy.ballot.voteFor(chosen.name) : copy.ballot.chooseARule}
          </Button>
        </div>
      ) : (
        (l.primary || l.secondary) && (
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
        )
      )}
      {petition && (
        <div className="flex flex-col gap-1 border-t border-dotted border-faint pt-1.5" data-testid="election-petition">
          {petition.line && <p className="font-mono text-[11.5px] text-failure">{petition.line}</p>}
          <button
            type="button"
            onClick={petition.onOpen}
            className="label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-3 text-[12px] text-ink hover:bg-ink hover:text-paper"
            data-testid="election-petition-open"
          >
            {petition.label}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Who's standing (design §4.5): the players, then the local candidates, each with their rule.
// ---------------------------------------------------------------------------------------------

export interface CandidateRowProps {
  candidate: CandidateView;
  onEndorse?: () => void;
  endorsePending?: boolean;
  /** Disables every Back button while one is in flight. */
  busy?: boolean;
}

export function CandidateRow({ candidate: c, onEndorse, endorsePending, busy }: CandidateRowProps) {
  const [open, setOpen] = useState(false);
  const line =
    c.kind === 'player'
      ? copy.stand.playerRow(c.rankTitle ?? '', c.standing.name, c.standing.cityName, c.backers?.n ?? 0)
      : copy.seats.localRow(c.standing.name);
  const e = c.backers;
  return (
    <li className="flex flex-col border-b border-dotted border-faint py-2" data-testid="slate-row" data-key={c.key}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-12 min-w-0 flex-1 cursor-pointer text-left"
        >
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            <PersonMark avatar={c.avatar} factionId={c.factionId} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-body text-[16px] leading-tight font-semibold">{c.name}</span>
              <span className="font-mono text-[11px] leading-snug text-muted">{line}</span>
              {c.rule && (
                <span className="font-mono text-[11px] leading-snug text-text-2" data-testid="slate-rule">
                  {copy.stand.ruleOf(c.rule.name)}
                </span>
              )}
            </span>
          </span>
        </button>
        {c.you ? (
          <span className="shrink-0 font-mono text-[12px] text-petrol">{copy.stand.you}</span>
        ) : c.backedByYou ? (
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
        <p className="pt-1 pl-[42px] font-mono text-[11px] text-muted" data-testid="slate-popover">
          {e && e.names.length > 0
            ? `${copy.backedBy(`${e.names.join(', ')}${e.more > 0 ? ` and ${e.more} more` : ''}`)} · `
            : ''}
          {copy.seats.popover(c.wardVote, e?.n ?? 0)}
        </p>
      )}
    </li>
  );
}

export interface SlateProps {
  candidates: CandidateView[];
  onEndorse?: (candidacyId: string) => void;
  endorsingId?: string | null;
}

/** Players first in filing order, then the local candidates in profile order (design §4.5). */
export function Slate({ candidates, onEndorse, endorsingId }: SlateProps) {
  const players = candidates.filter((c) => c.kind === 'player');
  const npcs = candidates.filter((c) => c.kind === 'npc');
  const row = (c: CandidateView) => (
    <CandidateRow
      key={c.key}
      candidate={c}
      onEndorse={() => c.candidacyId && onEndorse?.(c.candidacyId)}
      endorsePending={endorsingId === c.candidacyId}
      busy={!!endorsingId}
    />
  );
  const kicker = 'label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold';
  return (
    <div className="flex flex-col gap-1" aria-label={copy.stand.title}>
      <h2 className={kicker} data-testid="players-standing">
        {copy.stand.playersStanding}
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
            {copy.stand.localCandidates}
          </h2>
          <p className="font-mono text-[11.5px] leading-snug text-muted" data-testid="local-candidates-line">
            {copy.stand.localsLine}
          </p>
          <ul className="flex flex-col">{npcs.map(row)}</ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The front page (design §4.3): the photograph, ELECTED, the headline and the deck; under them the
// three result cards (the paper renders *What now* and the desk's button after it).
// ---------------------------------------------------------------------------------------------

export function FrontPage({
  front,
  names = {},
}: {
  front: FrontPageView;
  names?: Partial<Record<FactionId, string>>;
}) {
  const r = front.count.rule;
  return (
    <section className="flex flex-col gap-3 border-b border-ink pb-3" data-testid="front-page" aria-label="The seat won">
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
              <div className="halftone pointer-events-none absolute inset-0 text-ink opacity-30" aria-hidden="true" />
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
      {r && (
        <div className="flex flex-col gap-1.5" data-testid="front-page-result">
          <h3 className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
            {copy.ruleResult.title(r.weekday)}
          </h3>
          <RuleCards
            cards={r.cards}
            mode="result"
            label={copy.ruleResult.title(r.weekday)}
            names={names}
            winnerLines={ruleWinnerLines(r, names)}
          />
        </div>
      )}
    </section>
  );
}
