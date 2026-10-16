import { copy } from '@irongate/content/copy';
import { FACTION_IDS, TERM_DAYS, WEEKDAY_NAMES, weekday } from '@irongate/rules';
import type { FactionId, NationRepublicView, NationalSectionView, TermLineView } from '@irongate/rules';
import { cx, formatShare, formatUntil } from '../format';
import { Button } from './Button';
import { OpinionBars } from './Capital';
import type { FactionNames } from './Capital';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { HelpButton, helpMark } from './Help';

/**
 * Slice 7 (docs/design/slice-7-screens.md §2): the nation map's new layer. `NationBar` (who holds the
 * republic, one bar in the parties' colours), `LawChips` (the laws in force), the republic sheet's
 * body (`RepublicSheetBody`: the five cities weighted, the term line and the one act), and the city
 * card's Governor line and plate word. Plain props; the server decides every share and state.
 */

const nameOf = (names: FactionNames, f: FactionId): string => names[f] ?? f[0]!.toUpperCase() + f.slice(1);
const t = copy.nation.bar;

// ---------------------------------------------------------------------------------------------
// The bar (screens §2: 44 px under the top bar).
// ---------------------------------------------------------------------------------------------

export interface NationBarProps {
  bar: NationRepublicView['bar'];
  names: FactionNames;
  /** Tap: the republic sheet. */
  onOpen: () => void;
  className?: string;
}

/** The republic's three shares as one bar with the figures on it; the kicker and *the {party} leads*. */
export function NationBar({ bar, names, onOpen, className }: NationBarProps) {
  const total = FACTION_IDS.reduce((n, f) => n + bar.shares[f], 0) || 1;
  const label = `${t.whoHolds}: ${FACTION_IDS.map((f) => `${nameOf(names, f)} ${formatShare(bar.shares[f])}`).join(' · ')}; ${t.leads(nameOf(names, bar.leader))}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={label}
      className={cx(
        'flex h-11 w-full shrink-0 cursor-pointer flex-col justify-center gap-[3px] border-b border-ink bg-paper px-3 text-left text-ink hover:bg-paper-2',
        className,
      )}
      data-testid="nation-bar"
    >
      <span className="flex items-baseline justify-between gap-2" aria-hidden="true">
        <span className={cx('label-caps text-[9.5px] font-semibold text-muted', helpMark)}>{t.whoHolds}</span>
        <span className="truncate font-mono text-[10.5px] text-text-2" data-testid="nation-bar-leads">
          {t.leads(nameOf(names, bar.leader))}
        </span>
      </span>
      <span className="flex h-[17px] w-full overflow-hidden" aria-hidden="true">
        {FACTION_IDS.map((f) => (
          <span
            key={f}
            className="flex min-w-0 items-center justify-center overflow-hidden px-1 font-label text-[10.5px] leading-none whitespace-nowrap text-paper"
            style={{ width: `${(bar.shares[f] / total) * 100}%`, background: FACTION_STYLE[f].color }}
            data-testid={`nation-bar-${f}`}
          >
            {nameOf(names, f)} {formatShare(bar.shares[f])}
          </span>
        ))}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// The law chips (screens §2: 36 px, at most five, scrolling sideways on a phone).
// ---------------------------------------------------------------------------------------------

export interface LawChipsProps {
  laws: NationRepublicView['laws'];
  /** A tap: the law book. */
  onOpen: () => void;
  className?: string;
}

export function LawChips({ laws, onOpen, className }: LawChipsProps) {
  const chips =
    laws.length > 0
      ? laws.map((l) => `${l.name} · ${l.daysLeft} ${l.daysLeft === 1 ? 'day' : 'days'}`)
      : [t.noLaw];
  return (
    <div
      className={cx(
        'flex h-9 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-ink bg-paper-2 px-2 [scrollbar-width:none]',
        className,
      )}
      data-testid="law-chips"
      role="list"
      aria-label={copy.nation.parliament.lawsInForce}
    >
      {chips.map((c) => (
        <span role="listitem" key={c} className="shrink-0">
          <button
            type="button"
            onClick={onOpen}
            className="label-caps relative flex h-7 cursor-pointer items-center border-[1.5px] border-ink bg-paper px-2 text-[10.5px] whitespace-nowrap text-ink after:absolute after:-inset-y-2 after:inset-x-0 hover:bg-ink hover:text-paper"
            data-testid="law-chip"
          >
            {c}
          </button>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The term line (screens §2.1; the republic's calendar in words).
// ---------------------------------------------------------------------------------------------

/** *The republic votes from Thursday · 6 days* / *Names in until …* / *Voting open until …*. */
export function termLineText(term: TermLineView, today: number, now?: number): string {
  switch (term.phase) {
    case 'names':
      return t.namesIn(formatUntil(term.until ?? 0, now));
    case 'pick':
      return t.partiesPick(formatUntil(term.until ?? 0, now));
    case 'voting':
      return t.votingOpen(formatUntil(term.until ?? 0, now));
    case 'result':
      return t.resultIn;
    default: {
      const days = TERM_DAYS.nation.votesFrom - term.termDay;
      const day = today + (days > 0 ? days : days + 28);
      return t.votesFrom(WEEKDAY_NAMES[weekday(day)], days > 0 ? days : days + 28);
    }
  }
}

/** The one act a player has on the republic today (screens §2.1), its label and route. */
export function republicAct(act: NationRepublicView['act']): { label: string; route: string } | null {
  if (!act) return null;
  switch (act.kind) {
    case 'vote':
      return { label: copy.election.voteNow, route: '/election/national/vote' };
    case 'candidates':
      return { label: t.seeCandidates, route: '/election/national' };
    case 'standList':
      return { label: copy.nation.election.standList, route: '/election/national' };
    case 'standPresident':
      return { label: copy.nation.election.standPresident, route: '/election/national' };
    case 'pick':
      return { label: copy.nation.election.thePick, route: '/election/pick' };
  }
}

// ---------------------------------------------------------------------------------------------
// The republic sheet's body (screens §2.1).
// ---------------------------------------------------------------------------------------------

/** The plate word of a city (screens §2): *held by the Alliance* / *contested* / *close race today* / *Vanguard · Fired up*. */
export function cityWord(c: NationRepublicView['cities'][number], names: FactionNames): string {
  if (c.word === 'held') return t.heldBy(nameOf(names, c.heldBy!));
  if (c.word === 'contested') return t.contested;
  if (c.word === 'closeRace') return t.closeRace;
  const morale = copy.moraleWord[c.word] ?? c.word;
  return c.heldBy ? `${nameOf(names, c.heldBy)} · ${morale}` : morale;
}

/** The city card's Governor line (screens §2): *Governor: {name}* / *Mayor: {name}* / *a local holds the chair*. */
export function governorLine(g: NationRepublicView['cities'][number]['governor']): string | null {
  if (!g) return null;
  if (g.local) return `${g.title === 'Mayor' ? t.mayor(g.name) : t.governor(g.name)} · ${t.localHolds}`;
  return g.title === 'Mayor' ? t.mayor(g.name) : t.governor(g.name);
}

export interface RepublicSheetBodyProps {
  republic: NationRepublicView;
  names: FactionNames;
  /** A route to open (the act's button, *Parliament*). */
  onGo: (route: string) => void;
}

export function RepublicSheetBody({ republic: r, names, onGo }: RepublicSheetBodyProps) {
  const act = republicAct(r.act);
  // The capital first (screens §2.1).
  const rows = [...r.cities].sort((a, b) => b.weight - a.weight);
  return (
    <div className="flex flex-col gap-3" data-testid="republic-sheet">
      <HelpButton
        notes={[copy.nation.help.whoHolds()]}
        label={`What ${t.whoHolds} means`}
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] font-semibold text-muted', helpMark)}>{t.whoHolds}</span>
      </HelpButton>
      <span className="flex h-5 w-full overflow-hidden" aria-hidden="true">
        {FACTION_IDS.map((f) => (
          <span
            key={f}
            className="flex min-w-0 items-center justify-center overflow-hidden font-label text-[11px] whitespace-nowrap text-paper"
            style={{ width: `${r.bar.shares[f]}%`, background: FACTION_STYLE[f].color }}
          >
            {nameOf(names, f)} {formatShare(r.bar.shares[f])}
          </span>
        ))}
      </span>
      <p className="font-mono text-[11.5px] leading-snug text-text-2">{t.weights}</p>
      <ul className="flex flex-col divide-y divide-ink/30 border-y border-ink">
        {rows.map((c) => (
          <li
            key={c.cityId}
            className="flex flex-col gap-1 py-2"
            data-testid="republic-city"
            data-city={c.cityId}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-body text-[15px] font-semibold">{c.name}</span>
              <span className={cx('font-mono text-[11.5px]', c.unrest ? 'text-failure' : 'text-text-2')}>
                {Math.round(c.weight * 100)}
                {c.unrest ? ` · ${t.unrestHalf}` : ''}
              </span>
            </span>
            <OpinionBars values={c.shares} names={names} />
            <span
              className="flex items-center gap-1.5 font-mono text-[11px] text-text-2"
              data-testid="republic-city-word"
            >
              {c.heldBy && <FactionCrest factionId={c.heldBy} size={9} />}
              {cityWord(c, names)}
              {governorLine(c.governor) ? ` · ${governorLine(c.governor)}` : ''}
            </span>
          </li>
        ))}
      </ul>
      <HelpButton notes={[copy.nation.help.term()]} label="What a term is" className="-my-2 self-start">
        <span className={cx('font-mono text-[12px] text-ink', helpMark)} data-testid="term-line">
          {termLineText(r.term, r.bar.day)}
        </span>
      </HelpButton>
      {act && (
        <Button className="w-full" onClick={() => onGo(act.route)} data-testid="republic-act">
          {act.label}
        </Button>
      )}
      <button
        type="button"
        onClick={() => onGo('/parliament')}
        className="label-caps min-h-11 cursor-pointer self-start text-[12px] text-ink underline decoration-dotted underline-offset-4"
        data-testid="republic-parliament"
      >
        {t.parliament}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The paper (screens §11): *From the capital* / *The republic*, and the Election row's second row.
// ---------------------------------------------------------------------------------------------

export interface NationalSectionProps {
  section: NationalSectionView;
  /** The open window's line, a tap opening its screen. */
  onOpen: (route: string) => void;
}

/** Up to two national lines as headline rows, then the open window's line in Courier. */
export function NationalSection({ section, onOpen }: NationalSectionProps) {
  return (
    <section aria-label={section.title} className="flex flex-col" data-testid="paper-national">
      <h2 className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        {section.title}
      </h2>
      {section.lines.map((l) => (
        <div
          key={l.id}
          className="flex flex-col gap-1 border-b border-dotted border-faint py-2"
          data-testid="national-line"
          data-id={l.id}
        >
          <h3 className="font-display text-[19px] leading-tight font-bold">{l.headline}</h3>
          {l.deck && <p className="font-body text-[14px] leading-snug text-text-2">{l.deck}</p>}
        </div>
      ))}
      {section.window && (
        <button
          type="button"
          onClick={() => onOpen(section.window!.route)}
          className="flex min-h-11 cursor-pointer items-center justify-between gap-2 border-b border-dotted border-faint text-left font-mono text-[12px] text-ink hover:bg-paper-card"
          data-testid="national-window"
        >
          <span>{section.window.label}</span>
          <span aria-hidden="true" className="font-label text-[16px]">
            ›
          </span>
        </button>
      )}
    </section>
  );
}

/** The Election row's second row (screens §11): the Chair's or the republic's open window. */
export function ElectionWindowRow({
  window: w,
  onOpen,
}: {
  window: NonNullable<NationalSectionView['window']>;
  onOpen: (route: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(w.route)}
      className="-mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 border-b border-ink text-left hover:bg-paper-card"
      data-testid="election-row-2"
    >
      <span className="flex flex-col">
        <span className="label-caps text-[10px] font-semibold text-muted">
          {copy.nation.paper.electionKicker}
        </span>
        <span className="font-body text-[14px]">{w.label}</span>
      </span>
      <span aria-hidden="true" className="font-label text-[18px]">
        ›
      </span>
    </button>
  );
}
