import { copy } from '@irongate/content/copy';
import { CAPITAL_COUNCIL, COUNCIL } from '@irongate/rules';
import type {
  CouncilRowView,
  FactionId,
  OrdinanceMenuItemView,
  RuleCardView,
  RuleHow,
  RuleResultView,
  StandCardView,
} from '@irongate/rules';
import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { cx, formatWeekday } from '../format';
import { Button } from './Button';
import { FactionCrest } from './FactionCrest';
import { HelpButton, helpMark } from './Help';
import { PersonMark } from './PersonMark';
import { BottomSheet } from './Sheets';
import { Stamp } from './Stamp';
import { onRadioArrowKey } from './Story';

/**
 * The voting rework (docs/tech/voting-rework.md §9.1, §9.4, §9.6; design §4.2–§4.5): the rule cards
 * (vote, show and result), the council rows of a count, the rule picker, the stand card and the
 * *How the vote works* link. Plain props; the acts are the page's. Every word is `copy`.
 */

type Names = Partial<Record<FactionId, string>>;
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const party = (names: Names, f: FactionId | undefined) => (f ? (names[f] ?? f) : '');

/**
 * Whose a card is, the Courier line under it (design §4.2): *the branch's rule · …* at home; in the
 * capital (`capital`) *the Vanguard's rule · …*, or a shared card's two parties.
 */
export function whoseLine(card: RuleCardView, names: Names, capital = false): string {
  const w = card.whose;
  if (w.kind === 'councillor') return w.you ? copy.rule.whose.you : copy.rule.whose.councillor(w.name);
  const [a, b] = w.factionIds;
  if (a && b) return copy.rule.whose.shared(party(names, a), party(names, b));
  // Design §8.9 Q2: a councillor leading the party's bloc by title and name; the secretary by `addressedAs`.
  if (a && w.via === 'councillor') return copy.rule.whose.partyCouncillor(party(names, a), w.by);
  return capital && a ? copy.rule.whose.party(party(names, a), w.by) : copy.rule.whose.branch(w.by);
}

/**
 * How a rule won (design §8.2, `copy.rule.how.*`): under *The rule in force* at the hall and under
 * *PASSED* on the result's winner card. Null when it was not decided by a rule ballot.
 */
export function howWords(
  i: {
    how: RuleHow | null;
    /** The count's weekday ("won Sunday with …"). */
    weekday: string | null;
    votes: number | null;
    voters: number | null;
    factionIds: readonly FactionId[];
    seats: number | null;
    /** The Unrest fallback: the councillor whose card was card 1. */
    councillor?: string | null;
    /** `seats` level with another card, settled on votes or opinion (design §8.12). */
    seatTie?: boolean;
  },
  names: Names,
): string | null {
  switch (i.how) {
    case 'votes':
      return i.weekday ? copy.rule.how.votes(i.weekday, i.votes ?? 0, i.voters ?? 0) : null;
    case 'tie':
      return i.weekday ? copy.rule.how.tie(i.weekday, i.votes ?? 0) : null;
    case 'fallback':
      return i.councillor ? copy.rule.how.fallbackUnrest(i.councillor) : copy.rule.how.fallback;
    case 'seats':
      if (i.factionIds.length > 1) {
        const [a, b] = [party(names, i.factionIds[0]), party(names, i.factionIds[1])];
        return i.seatTie ? copy.rule.how.sharedSeatsTie(a, b, i.seats ?? 0) : copy.rule.how.sharedSeats(a, b, i.seats ?? 0);
      }
      return i.seatTie
        ? copy.rule.how.seatsTie(party(names, i.factionIds[0]), i.seats ?? 0)
        : copy.rule.how.seats(party(names, i.factionIds[0]), i.seats ?? 0);
    case 'draw':
      return copy.rule.how.draw(party(names, i.factionIds[0]));
    case 'carried':
      return copy.rule.how.carried;
    default:
      return null;
  }
}

/**
 * The result's winner card, under *PASSED* (design §4.3, §8.2): how it won, then *runs until
 * Thursday*. The count page and the front page.
 */
export function ruleWinnerLines(r: RuleResultView, names: Names): string[] {
  const winner = r.cards.find((x) => x.won);
  const how = howWords(
    {
      how: r.how,
      weekday: r.weekday,
      votes: winner?.votes ?? null,
      voters: r.turnout?.voters ?? null,
      factionIds: winner?.whose.kind === 'party' ? winner.whose.factionIds : [],
      seats: winner?.seats ?? null,
      councillor: r.how === 'fallback' && winner?.whose.kind === 'councillor' ? winner.whose.name : null,
      seatTie: r.seatTie ?? false,
    },
    names,
  );
  return [...(how ? [how] : []), copy.ruleResult.runsUntil(formatWeekday(r.runsUntil - 1))];
}

// ---------------------------------------------------------------------------------------------
// The rule cards (design §4.2, §4.3).
// ---------------------------------------------------------------------------------------------

export type RuleCardMode = 'vote' | 'show' | 'result';

/** A card's count at the result: votes (home) or seats (the capital), its share, whether it won. */
export interface RuleCardResult {
  votes: number;
  seats: number | null;
  share: number;
  won: boolean;
}

export interface RuleCardProps {
  card: RuleCardView & Partial<RuleCardResult>;
  mode: RuleCardMode;
  names?: Names;
  /** Vote mode: the card chosen (not yet cast). */
  selected?: boolean;
  /** A vote is cast on this ballot: the chosen card carries *your vote*, the others dim to 50 %. */
  cast?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  /** Result mode: the winner's lines under *PASSED* (how it won, *runs until Thursday*). */
  winnerLines?: readonly string[];
  /** Show mode: under the card (a councillor's *Change ›*). */
  extra?: ReactNode;
  /** Three columns from 960 px (the ballot's sheet): the card grows to 160 px. */
  row?: boolean;
  /** The capital (design §4.2, §4.3): the party's whose line; at the result, seats as bars. */
  capital?: boolean;
}

export function RuleCard({
  card,
  mode,
  names = {},
  selected = false,
  cast = false,
  onSelect,
  disabled,
  winnerLines,
  extra,
  row,
  capital = false,
}: RuleCardProps) {
  const choosing = mode === 'vote' && !cast;
  const on = choosing && selected;
  const won = mode === 'result' && !!card.won;
  const crests = card.whose.kind === 'party' ? card.whose.factionIds : [];
  const count = mode === 'result' ? (card.seats ?? card.votes ?? 0) : null;
  // The capital's result (design §4.3): the seats behind the card as bars, of ten.
  const seats = mode === 'result' && card.seats != null ? card.seats : null;
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="flex flex-wrap items-center gap-x-2 font-body text-[16px] leading-tight font-semibold">
          {card.name}
          {won && (
            <Stamp
              tone="success"
              label={copy.ruleResult.passed}
              animate={false}
              // QA m9: the stamp's own size wins without `!` (cx does not merge classes), which set it
              // at 26 px over the share bar; small, with room for its tilt.
              className="my-1 border-2! px-1.5! py-0! text-[12px]! tracking-[0.1em]!"
            />
          )}
        </span>
        {seats !== null ? (
          <span className="flex gap-0.5" aria-hidden="true" data-testid="rule-card-seats">
            {Array.from({ length: CAPITAL_COUNCIL.seats }, (_, i) => (
              <span
                key={i}
                className={cx('inline-block h-3 w-1.5', i < seats ? 'bg-ink' : 'bg-track')}
                data-testid={i < seats ? 'rule-card-seat' : undefined}
              />
            ))}
          </span>
        ) : mode === 'result' && (
          <span className="block h-[3px] w-full bg-track" aria-hidden="true">
            <span
              className="block h-full bg-ink"
              style={{ width: `${Math.round(Math.max(0, Math.min(1, card.share ?? 0)) * 100)}%` }}
              data-testid="rule-card-bar"
            />
          </span>
        )}
        <span className="font-body text-[14px] leading-tight">{card.plainLine}</span>
        <span className={cx('label-caps text-[10px] leading-tight', on ? 'text-energy-light' : 'text-petrol')}>
          {copy.rule.effect(card.effectLine, COUNCIL.ordinanceDays)}
        </span>
        <span
          className={cx('flex items-center gap-1 font-mono text-[11px] leading-tight', on ? 'text-paper/85' : 'text-muted')}
          data-testid="rule-card-whose"
        >
          {crests.map((f) => (
            <FactionCrest key={f} factionId={f} size={10} />
          ))}
          <span>{whoseLine(card, names, capital)}</span>
        </span>
        {card.yourVote && (cast || mode !== 'vote') && (
          <span className="font-mono text-[11px] text-petrol" data-testid="rule-card-your-vote">
            {copy.ballot.yourVote}
          </span>
        )}
        {won &&
          winnerLines?.map((l) => (
            <span key={l} className="font-mono text-[11px] text-petrol" data-testid="rule-card-won">
              {l}
            </span>
          ))}
        {extra}
      </span>
      {choosing && (
        <span
          className={cx(
            'mt-0.5 size-6 shrink-0 rounded-full border-2',
            on ? 'border-paper bg-paper shadow-[inset_0_0_0_4px_var(--color-ink)]' : 'border-ink',
          )}
          aria-hidden="true"
        />
      )}
      {count !== null && (
        <span className="shrink-0 font-label text-[16px]" data-testid="rule-card-count">
          {count}
        </span>
      )}
    </>
  );
  const cls = cx(
    'flex w-full min-h-[88px] items-start gap-3 border-[1.5px] border-ink px-3 py-1.5 text-left',
    row && 'min-[960px]:min-h-[160px]',
    on ? 'bg-ink text-paper' : 'bg-paper-card',
    cast && !card.yourVote && 'opacity-50',
  );
  const data = {
    'data-testid': 'rule-card',
    'data-ordinance': card.ordinanceId,
    'data-won': mode === 'result' ? String(won) : undefined,
  };
  if (choosing) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={onSelect}
        onKeyDown={onRadioArrowKey}
        disabled={disabled}
        className={cx(
          cls,
          'cursor-pointer hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol disabled:cursor-not-allowed',
          on && 'hover:bg-ink',
        )}
        {...data}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={cls} {...data}>
      {body}
    </div>
  );
}

export interface RuleCardsProps {
  cards: ReadonlyArray<RuleCardView & Partial<RuleCardResult>>;
  mode: RuleCardMode;
  /** The group's name (its kicker or title). */
  label: string;
  names?: Names;
  selected?: string | null;
  onSelect?: (ordinanceId: string) => void;
  disabled?: boolean;
  /** `stack` (phones, the hall, the side column); `auto` adds one row of three from 960 px. */
  layout?: 'stack' | 'auto';
  winnerLines?: readonly string[];
  /** Show mode: a node under a card, by its rule. */
  extra?: Readonly<Record<string, ReactNode>>;
  /** The capital's cards (one per party; seats at the result). */
  capital?: boolean;
  className?: string;
}

/**
 * The three cards (tech design §9.1): a radio group with the arrow keys in vote mode (until a vote is
 * cast); a list otherwise. *Already voted* is read from the cards' own `yourVote`.
 */
export function RuleCards({
  cards,
  mode,
  label,
  names,
  selected,
  onSelect,
  disabled,
  layout = 'stack',
  winnerLines,
  extra,
  capital,
  className,
}: RuleCardsProps) {
  const cast = mode === 'vote' && cards.some((c) => c.yourVote);
  const choosing = mode === 'vote' && !cast;
  return (
    <div
      role={choosing ? 'radiogroup' : 'list'}
      aria-label={label}
      className={cx('flex flex-col gap-2', layout === 'auto' && 'min-[960px]:grid min-[960px]:grid-cols-3', className)}
      data-testid="rule-cards"
      data-mode={mode}
    >
      {cards.map((c) => {
        const card = (
          <RuleCard
            card={c}
            mode={mode}
            names={names}
            selected={selected === c.ordinanceId}
            cast={cast}
            onSelect={() => onSelect?.(c.ordinanceId)}
            disabled={disabled}
            winnerLines={winnerLines}
            extra={extra?.[c.ordinanceId]}
            row={layout === 'auto'}
            capital={capital}
          />
        );
        return choosing ? (
          <Fragment key={c.ordinanceId}>{card}</Fragment>
        ) : (
          <div key={c.ordinanceId} role="listitem">
            {card}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// A rule as a row (the rule picker's eleven).
// ---------------------------------------------------------------------------------------------

export interface OrdinanceRowProps {
  name: string;
  line?: string;
  effectLine?: string;
  note?: string;
  /** Radio (choosing a rule). */
  right?: 'radio' | null;
  selected?: boolean;
  dimmed?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export function OrdinanceRow({ name, line, effectLine, note, right, selected, dimmed, onSelect, disabled }: OrdinanceRowProps) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-body text-[15px] font-semibold">{name}</span>
        {line && <span className="font-body text-[13px] leading-snug text-text-2">{line}</span>}
        {effectLine && (
          <span className="label-caps text-[10px] text-petrol">
            {copy.rule.effect(effectLine, COUNCIL.ordinanceDays)}
          </span>
        )}
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
      onKeyDown={onRadioArrowKey}
      disabled={disabled}
      className={cx(cls, 'cursor-pointer disabled:cursor-not-allowed')}
      data-testid="ordinance-row"
      data-ordinance-row={name}
    >
      {content}
    </button>
  ) : (
    <div className={cls} data-testid="ordinance-row">
      {content}
    </div>
  );
}

export interface RulePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: readonly OrdinanceMenuItemView[];
  /** The rule chosen now (the radio). */
  current: string;
  /** The picker's owner's own card: never dimmed as *already on the ballot*. */
  own?: string | null;
  onPick: (ordinanceId: string) => void;
  disabled?: boolean;
}

/**
 * The rule picker (design §4.4, §4.5): *Your rule · choose one*, the eleven rules, one tap. A rule
 * already on the ballot is dimmed with *already on the ballot · yours would be skipped*, not disabled
 * (design §8.1 Q10).
 */
export function RulePicker({ open, onOpenChange, menu, current, own, onPick, disabled }: RulePickerProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={copy.hall.pickerTitle}>
      <div role="radiogroup" aria-label={copy.hall.pickerTitle} className="flex flex-col" data-testid="rule-picker">
        {menu.map((o) => {
          const skipped = o.onBallot && o.ordinanceId !== own;
          return (
            <OrdinanceRow
              key={o.ordinanceId}
              name={o.name}
              line={o.plainLine}
              effectLine={o.effectLine}
              note={skipped ? copy.hall.onTheBallot : undefined}
              dimmed={skipped}
              right="radio"
              selected={o.ordinanceId === current}
              onSelect={() => {
                onOpenChange(false);
                onPick(o.ordinanceId);
              }}
              disabled={disabled}
            />
          );
        })}
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------------------------
// The council rows of a count (design §4.3).
// ---------------------------------------------------------------------------------------------

export interface CouncilRowsProps {
  rows: readonly CouncilRowView[];
  /** A row without its own party (a home local): the city's. */
  factionId?: FactionId;
  /** The sentence under the list (*Seats go to the seven best known in Coalport…*); absent: none. */
  sentence?: string | null;
  /** The kicker (*The council*); absent: none (the capital's rows sit under a party row). */
  kicker?: boolean;
}

/**
 * The council (design §4.3): the seated as rows, *the line*, then the unseated with *8th · 4 short*.
 * A tap on a row shows its two numbers (*local support 40 · backers 2*) under it.
 */
export function CouncilRows({ rows, factionId = 'collective', sentence, kicker = true }: CouncilRowsProps) {
  const [open, setOpen] = useState<string | null>(null);
  const seated = rows.filter((r) => r.seated);
  const unseated = rows.filter((r) => !r.seated);
  const row = (r: CouncilRowView) => {
    const shown = open === r.key;
    return (
      <li
        key={r.key}
        className={cx('border-b border-dotted border-faint', r.you && 'bg-paper-2')}
        data-testid="council-row"
        data-seated={r.seated}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => (o === r.key ? null : r.key))}
          aria-expanded={shown}
          className="flex min-h-12 w-full cursor-pointer items-center gap-3 py-1.5 text-left"
        >
          <PersonMark avatar={r.avatar} factionId={r.factionId ?? factionId} size={28} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-body text-[15px] font-semibold">
              {r.name}
              {r.you && <span className="ml-1.5 font-mono text-[11px] font-normal text-petrol">{copy.you}</span>}
            </span>
            <span className="font-mono text-[11px] leading-snug text-muted">
              {r.kind === 'player'
                ? copy.seats.row(r.rankTitle ?? '', r.standingName, r.backers)
                : copy.seats.localRow(r.standingName)}
              {r.kind === 'player' && r.rule
                ? ` · ${r.you ? copy.seats.rule(r.rule.name) : copy.stand.ruleOf(r.rule.name)}`
                : ''}
            </span>
          </span>
          {!r.seated && r.short !== null && (
            <span className="shrink-0 font-mono text-[11px] text-muted" data-testid="council-row-short">
              {copy.seats.short(ORDINALS[r.place - 1] ?? String(r.place), r.short)}
            </span>
          )}
        </button>
        {shown && (
          <p
            className="mb-1.5 ml-10 inline-block border border-ink bg-paper-card px-2 py-1 font-mono text-[11px]"
            role="note"
            data-testid="council-popover"
          >
            {copy.seats.popover(r.wardVote, r.backers)}
          </p>
        )}
      </li>
    );
  };
  return (
    <section aria-label={copy.ruleResult.council} className="flex flex-col" data-testid="council-rows">
      {kicker && (
        <h2 className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
          {copy.ruleResult.council}
        </h2>
      )}
      <ul className="flex flex-col">
        {seated.map(row)}
        {seated.length > 0 && unseated.length > 0 && (
          <li
            role="separator"
            className="label-caps flex items-center gap-2 py-1 text-[10px] text-muted before:h-px before:flex-1 before:bg-ink after:h-px after:flex-1 after:bg-ink"
            data-testid="the-line"
          >
            {copy.ruleResult.theLine}
          </li>
        )}
        {unseated.map(row)}
      </ul>
      {sentence && (
        <p className="pt-1.5 font-mono text-[11.5px] leading-snug text-text-2" data-testid="seats-sentence">
          {sentence}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// The stand card (design §4.5, tech design §9.6).
// ---------------------------------------------------------------------------------------------

export interface StandCardProps {
  /** Days 0–1, not a candidate, not sitting (the server's). */
  stand: StandCardView | null;
  cityName: string;
  /** After standing: the candidacy (*You're standing · your rule: … · 1 backer*). */
  candidacy?: { rule: string; backers: number; branchLine: boolean } | null;
  onStand: (ordinanceId: string) => void;
  pending?: boolean;
  className?: string;
}

/**
 * *Stand for the council*: two ticks (or the cross and what is missing, and no button), the seat
 * line, *Your rule* with *Change ›* (the choice is the card's own until the stand), and *Stand · 10
 * Political Capital*. After standing it reads *You're standing · your rule: …* and the branch's line.
 */
export function StandCard({ stand, cityName, candidacy, onStand, pending, className }: StandCardProps) {
  const [rule, setRule] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const box = cx('flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3', className);
  if (candidacy) {
    return (
      <section aria-label={copy.stand.kicker} className={box} data-testid="stand-card" data-state="standing">
        <h2 className="label-caps text-[11px] font-semibold">{copy.stand.kicker}</h2>
        <p className="font-body text-[15px]" data-testid="stand-standing">
          {copy.stand.standing(candidacy.rule, candidacy.backers)}
        </p>
        {candidacy.branchLine && <p className="font-mono text-[12px] text-petrol">{copy.branchEndorsesYou}</p>}
      </section>
    );
  }
  if (!stand) return null;
  const rank = stand.requirements.find((r) => r.id === 'rank');
  const known = stand.requirements.find((r) => r.id === 'known');
  const eligible = stand.requirements.every((r) => r.met);
  const chosen = rule ?? stand.defaultRule;
  const item = stand.menu.find((o) => o.ordinanceId === chosen);
  const cross = (text: string) => (
    <li className="text-collective">
      <span aria-hidden="true">✗ </span>
      {text}
    </li>
  );
  return (
    <section aria-label={copy.stand.kicker} className={box} data-testid="stand-card" data-state="stand">
      <h2 className="label-caps text-[11px] font-semibold">{copy.stand.kicker}</h2>
      <ul className="flex flex-col gap-0.5 font-mono text-[12px]" data-testid="stand-ticks">
        {rank &&
          (rank.met
            ? <li>{copy.stand.tickRank(COUNCIL.standRank, rank.rankTitle ?? '')}</li>
            : cross(copy.stand.needsRank(COUNCIL.standRank, rank.fxpToGo ?? 0)))}
        {known &&
          (known.met
            ? <li>{copy.stand.tickKnown(cityName, known.successes ?? 0)}</li>
            : cross(copy.stand.needsKnown(cityName, known.successes ?? 0, known.need ?? 0)))}
      </ul>
      <p className="font-mono text-[12px] text-text-2" data-testid="seat-gives">
        {copy.stand.gives}
      </p>
      {eligible && (
        <>
          <div className="flex items-center gap-3 border-y border-dotted border-faint py-1.5" data-testid="stand-rule">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="label-caps text-[10px] text-muted">{copy.stand.yourRule}</span>
              <span className="font-body text-[15px] font-semibold" data-testid="stand-rule-name">
                {item?.name ?? chosen}
              </span>
              {item && <span className="font-body text-[13px] leading-snug text-text-2">{item.plainLine}</span>}
            </span>
            <button
              type="button"
              onClick={() => setPicker(true)}
              disabled={pending}
              className="min-h-11 shrink-0 cursor-pointer px-1 font-mono text-[13px] underline underline-offset-2"
              data-testid="stand-change"
            >
              {copy.hall.change}
            </button>
          </div>
          <Button
            onClick={() => onStand(chosen)}
            pending={pending}
            disabled={!stand.canStand}
            className="w-full"
            data-testid="stand-button"
          >
            {stand.reason === 'NOT_ENOUGH_PC' ? copy.needsPc(stand.cost) : copy.declare(stand.cost)}
          </Button>
          <p className="font-mono text-[11px] text-muted">{copy.stand.costs}</p>
          <RulePicker
            open={picker}
            onOpenChange={setPicker}
            menu={stand.menu}
            current={chosen}
            onPick={setRule}
          />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// *How the vote works* (design §4.9): the *Council rule* note behind a visible link.
// ---------------------------------------------------------------------------------------------

export interface HowTheVoteWorksProps {
  cityName: string;
  /** The faction's Rank 2 and Rank 3 titles (who votes, who stands). */
  rank2: string;
  rank3: string;
  /** The city's voting days ("Wednesday to Saturday"). */
  fromWeekday: string;
  toWeekday: string;
  capital?: boolean;
  className?: string;
}

export function councilRuleNote(p: Omit<HowTheVoteWorksProps, 'className'>) {
  return copy.help.rule(p.cityName, p.rank2, p.rank3, p.fromWeekday, p.toWeekday, p.capital);
}

export function HowTheVoteWorks({ className, ...p }: HowTheVoteWorksProps) {
  return (
    <HelpButton
      notes={[councilRuleNote(p)]}
      more={p.capital ? copy.help.ruleMore : undefined}
      label={copy.ballot.howTheVoteWorks}
      testId="how-the-vote-works"
      className={cx('-my-2 inline-flex items-center self-start font-mono text-[12px] text-ink', helpMark, className)}
    >
      {copy.ballot.howTheVoteWorks}
    </HelpButton>
  );
}

// ---------------------------------------------------------------------------------------------
// The rule always visible (design §4.7, §8.1 Q6; tech design §9.9): the folded plate's chip.
// ---------------------------------------------------------------------------------------------

export interface RuleChipProps {
  name: string;
  daysLeft: number;
  /**
   * The plate's chip on a short phone (design §8.11 Q2): the rule's name alone; the aria-label keeps
   * the days. The place sheet's chip keeps them on screen too.
   */
  short?: boolean;
  /** A tap opens the Town Hall. */
  onOpen?: () => void;
  className?: string;
  testId?: string;
}

/**
 * *STREET FUND · 3 DAYS*, Oswald caps on paper-2. On a phone it sits right of the plate's kicker
 * when the plate's rule line is folded away (under 700 px tall), and in the place sheet's header
 * while a sheet covers the plate. The pill is small; the button around it is a 44 px target whose
 * negative margins keep the row's height.
 */
export function RuleChip({ name, daysLeft, short = false, onOpen, className, testId = 'rule-chip' }: RuleChipProps) {
  const text = copy.plate.ruleChip(name, daysLeft);
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className={cx(
        'relative z-20 -my-[15px] min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center disabled:cursor-default',
        // `className` may hide it (`hidden`, shown under a media query); shown, it is a flex box.
        className ?? 'inline-flex',
      )}
      data-testid={testId}
      aria-label={`${text}. ${copy.hall.ruleInForce}`}
    >
      <span className="label-caps bg-paper-2 px-1.5 py-0.5 text-[9.5px] leading-none whitespace-nowrap text-ink">
        {short ? copy.plate.ruleChip(name) : text}
      </span>
    </button>
  );
}
