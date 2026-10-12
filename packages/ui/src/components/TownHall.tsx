import { copy } from '@irongate/content/copy';
import type { FactionId, IssueRowView, TownHallView, WhatNowView } from '@irongate/rules';
import { useState } from 'react';
import { cx, formatUntil, formatWeekday } from '../format';
import { Button } from './Button';
import { IssueRow, weekdayOf } from './Capital';
import { HelpButton, helpMark } from './Help';
import { OrdinanceRow, PersonMark, whoseLine } from './Politics';
import { BottomSheet } from './Sheets';

/**
 * Review 4 (answers §10–§11, ADR 0077); the voting rework (tech design §9.5): the Town Hall's sheet,
 * the council's public face: the rule in force, next week's rule (the ballot, with a councillor's own
 * rule and its picker), the council as rows, the stand block and the week's Issues. Plain props; the
 * acts are the page's.
 *
 * TODO(phase 3): `TownHallBlocks` v2 with `RuleCards`, the stand card and the rule picker sheet
 * (tech design §9.5); these blocks render the v2 view with the existing rows.
 */

const kicker = 'label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold';

export interface DeskActs {
  /** The rule chosen on the ballot (not yet cast). */
  selected: string | null;
  onSelect: (ordinanceId: string) => void;
  /** `council.vote` for the selected rule. */
  onVote: () => void;
  /** A councillor names their rule (`council.setRule`). */
  onSetRule: (ordinanceId: string) => void;
  /** The act on its way ('vote' | 'setRule'), from the page's political act. */
  pending: string | null;
  /** The refusal's words, if the last act was refused. */
  notice?: string | null;
}

export interface TownHallBlocksProps {
  hall: TownHallView;
  names: Partial<Record<FactionId, string>>;
  /** The reader's party (a local's crest). */
  factionId: FactionId;
  desk?: DeskActs;
  /** The stand block's button (to who's standing). */
  onStand?: () => void;
  /** An Issue row's *Where to act* (the first tagged place). */
  onWhereToAct?: (row: IssueRowView) => void;
  className?: string;
}

export function TownHallBlocks({ hall, names, factionId, desk, onStand, onWhereToAct, className }: TownHallBlocksProps) {
  return (
    <div className={cx('flex flex-col gap-3', className)} data-testid="town-hall">
      <RuleInForce hall={hall} names={names} />
      <NextWeeksRule hall={hall} names={names} acts={desk} />
      <CouncilRows hall={hall} factionId={factionId} />
      {hall.stand && onStand && <StandBlock hall={hall} onStand={onStand} />}
      <HallIssues hall={hall} names={names} onWhereToAct={onWhereToAct} />
    </div>
  );
}

/** How the rule in force won (design §8.2), or null when it was not decided by a rule ballot. */
function howLine(f: NonNullable<TownHallView['inForce']>, names: Partial<Record<FactionId, string>>): string | null {
  const party = (i: number) => {
    const id = f.factionIds[i];
    return id ? (names[id] ?? id) : '';
  };
  switch (f.how) {
    case 'votes':
      return f.countDay ? copy.rule.how.votes(weekdayOf(f.countDay), f.votes ?? 0, f.voters ?? 0) : null;
    case 'tie':
      return f.countDay ? copy.rule.how.tie(weekdayOf(f.countDay), f.votes ?? 0) : null;
    case 'fallback':
      return copy.rule.how.fallback;
    case 'seats':
      return f.factionIds.length > 1
        ? copy.rule.how.sharedSeats(party(0), party(1), f.seats ?? 0)
        : copy.rule.how.seats(party(0), f.seats ?? 0);
    case 'draw':
      return copy.rule.how.draw(party(0));
    case 'carried':
      return copy.rule.how.carried;
    default:
      return null;
  }
}

/** Block 1: the rule in force, its plain effect, the days left and how it won. */
function RuleInForce({ hall, names }: { hall: TownHallView; names: Partial<Record<FactionId, string>> }) {
  if (!hall.inForce) return null;
  const how = howLine(hall.inForce, names);
  return (
    <section aria-label={copy.hall.ruleInForce} className="flex flex-col gap-1" data-testid="hall-rule">
      <HelpButton
        notes={[copy.help.rule(hall.cityName, hall.seatCount)]}
        label={`${copy.hall.ruleInForce}: what a council rule is`}
        className={cx(kicker, 'w-full text-left')}
      >
        <span className={helpMark}>{copy.hall.ruleInForce}</span>
      </HelpButton>
      <span className="font-body text-[16px] font-semibold" data-testid="hall-rule-name">
        {hall.inForce.name}
      </span>
      <span className="font-body text-[14px] text-text-2" data-testid="hall-rule-line">
        {copy.hall.ruleLine(hall.inForce.plainLine, hall.inForce.daysLeft)}
      </span>
      {how && (
        <span className="font-mono text-[12px] text-muted" data-testid="hall-rule-how">
          {how}
        </span>
      )}
    </section>
  );
}

/**
 * Block 2: next week's rule, the ballot (provisional on days 0–1, set on days 2–4): the vote in the
 * block, a councillor's own rule and its picker, and the Next line.
 */
function NextWeeksRule({
  hall,
  names,
  acts,
}: {
  hall: TownHallView;
  names: Partial<Record<FactionId, string>>;
  acts?: DeskActs;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const b = hall.next;
  const c = hall.councillor;
  const voting = !!acts && b.status === 'set' && b.canVote && !b.myVote;
  const chosen = b.cards.find((x) => x.ordinanceId === acts?.selected);
  const next =
    b.status === 'provisional'
      ? copy.council.deskNext.townVotes(
          formatWeekday(b.pollsOpenAt),
          formatWeekday(b.countAt - 1),
          formatWeekday(b.countAt),
        )
      : copy.council.deskNext.theResult(formatWeekday(b.countAt));
  return (
    <section aria-label={copy.hall.nextWeeksRule} className="flex flex-col gap-2" data-testid="hall-next">
      <div className={kicker}>{copy.hall.nextWeeksRule}</div>
      <div role={voting ? 'radiogroup' : undefined} aria-label={copy.hall.nextWeeksRule}>
        {b.cards.map((card) => (
          <OrdinanceRow
            key={card.ordinanceId}
            name={card.name}
            line={card.plainLine}
            effectLine={card.effectLine}
            note={whoseLine(card, names)}
            right={voting ? 'radio' : card.yourVote ? 'mine' : null}
            selected={acts?.selected === card.ordinanceId}
            onSelect={voting ? () => acts.onSelect(card.ordinanceId) : undefined}
            disabled={!!acts?.pending}
          />
        ))}
      </div>
      {voting && (
        <Button
          className="w-full"
          disabled={!chosen}
          pending={acts.pending === 'vote'}
          onClick={acts.onVote}
          data-testid="hall-vote"
        >
          {chosen ? copy.ballot.voteFor(chosen.name) : copy.ballot.chooseARule}
        </Button>
      )}
      {b.status === 'provisional' && (
        <p className="font-mono text-[12px] text-muted">{copy.hall.ballotSetAt(formatUntil(b.setAt))}</p>
      )}
      {c && (
        <div className="flex flex-col gap-1" data-testid="hall-your-rule">
          <p className="font-body text-[14px]">
            {copy.stand.yourRule}: <strong className="font-semibold">{c.rule.name}</strong>
          </p>
          {!c.onBallot && <p className="font-mono text-[12px] text-muted">{copy.hall.nextInLine}</p>}
          {acts && c.menu.length > 0 && (
            <>
              <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)} data-testid="hall-change">
                {copy.hall.change}
              </Button>
              <BottomSheet open={pickerOpen} onOpenChange={setPickerOpen} title={copy.hall.pickerTitle}>
                <div className="flex flex-col" data-testid="rule-picker">
                  {c.menu.map((o) => (
                    <OrdinanceRow
                      key={o.ordinanceId}
                      name={o.name}
                      line={o.line}
                      effectLine={o.effectLine}
                      note={o.onBallot ? copy.hall.onTheBallot : undefined}
                      dimmed={o.onBallot}
                      right="radio"
                      selected={o.ordinanceId === c.rule.ordinanceId}
                      onSelect={() => {
                        setPickerOpen(false);
                        acts.onSetRule(o.ordinanceId);
                      }}
                      disabled={!!acts.pending}
                    />
                  ))}
                </div>
              </BottomSheet>
            </>
          )}
        </div>
      )}
      {acts?.notice && (
        <p role="status" className="font-body text-[13px] text-collective">
          {acts.notice}
        </p>
      )}
      <p className="font-mono text-[12px]" data-testid="hall-next-line">
        {next}
      </p>
      {c && <p className="font-mono text-[12px] text-muted">{copy.council.deskNext.pay}</p>}
    </section>
  );
}

/** Block 4: stand for the council, days 0–1 for a resident who may stand here. */
function StandBlock({ hall, onStand }: { hall: TownHallView; onStand: () => void }) {
  const st = hall.stand!;
  return (
    <section aria-label={copy.hall.standForTheCouncil} className="flex flex-col gap-2" data-testid="hall-stand">
      <div className={kicker}>{copy.hall.standForTheCouncil}</div>
      <p className="font-mono text-[12px] text-text-2">{copy.stand.gives}</p>
      <Button variant="outline" className="w-full" onClick={onStand}>
        {copy.standForTheCouncil(st.cost)}
      </Button>
    </section>
  );
}

/** Block 3: the seats as rows, *Player · Organiser* or *Local candidate*, the term's end. */
function CouncilRows({ hall, factionId }: { hall: TownHallView; factionId: FactionId }) {
  return (
    <section aria-label={copy.hall.council} className="flex flex-col" data-testid="hall-council">
      <div className={cx(kicker, 'flex items-baseline justify-between gap-2')}>
        <span>{copy.hall.council}</span>
        <span className="font-mono text-[11px] font-normal tracking-normal normal-case text-muted" data-testid="hall-term">
          {copy.hall.termEnds(formatWeekday(hall.termEndsAt - 1))}
        </span>
      </div>
      <ul className="flex flex-col">
        {hall.seats.map((s) => (
          <li
            key={s.seat}
            className={cx('flex min-h-12 items-center gap-3 border-b border-dotted border-faint py-1.5', s.you && 'bg-paper-2')}
            data-testid="hall-seat"
            data-kind={s.kind}
          >
            <PersonMark avatar={s.avatar} factionId={s.factionId ?? factionId} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-body text-[15px] font-semibold">
                {s.name}
                {s.you && <span className="ml-2 font-mono text-[11px] font-normal text-petrol">{copy.you}</span>}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {s.kind === 'player' ? copy.hall.player(s.rankTitle ?? '') : copy.hall.local}
                {s.districtName ? ` · ${s.districtName}` : ''}
              </span>
              {s.rule && <span className="font-mono text-[11px]">{copy.hall.ruleOf(s.rule)}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="pt-1.5 font-body text-[12.5px] text-text-2 italic">{copy.localCandidatesLine}</p>
    </section>
  );
}

/** Block 5: the city's two Issues as the paper's rows. */
function HallIssues({
  hall,
  names,
  onWhereToAct,
}: {
  hall: TownHallView;
  names: Partial<Record<FactionId, string>>;
  onWhereToAct?: (row: IssueRowView) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (hall.issues.length === 0) return null;
  return (
    <section aria-label={copy.hall.issues} className="flex flex-col" data-testid="hall-issues">
      <div className={kicker}>{copy.hall.issues}</div>
      <ul className="flex flex-col">
        {hall.issues.map((r) => (
          <IssueRow
            key={r.issueId}
            row={r}
            names={names}
            open={open === r.issueId}
            onToggle={() => setOpen((o) => (o === r.issueId ? null : r.issueId))}
            settles={formatUntil(hall.issuesSettleAt)}
            onWhereToAct={onWhereToAct}
          />
        ))}
      </ul>
    </section>
  );
}

export interface WhatNowCardProps {
  whatNow: WhatNowView;
  /** The hall's name, for the button (*To your desk at the Town Hall*). */
  hallName: string;
  /** Every party's short name (the capital's lines). */
  names?: Partial<Record<FactionId, string>>;
  /** Absent at the hall itself (the desk is right below). */
  onDesk?: () => void;
  className?: string;
}

/**
 * Answers §10.1; the voting rework (design §4.6): *What now · your five days*, once per term: your
 * rule on the ballot (or next in line; the capital's party card), the pay, and *To your desk at the
 * Town Hall*. TODO(phase 3): `WhatNowCard` v2's final layout (tech design §9.7).
 */
export function WhatNowCard({ whatNow: w, hallName, names = {}, onDesk, className }: WhatNowCardProps) {
  const r = copy.council.whatNow.rule;
  const party = w.capital ? (names[w.capital.factionId] ?? w.capital.factionId) : '';
  const first = w.capital
    ? w.capital.leadsBloc
      ? r.capitalLeads(party, w.rule.name)
      : r.capitalChosen(w.capital.by, party, w.rule.name)
    : w.rule.onBallot
      ? r.onBallot(w.rule.name, formatWeekday(w.pollsOpenAt), formatWeekday(w.countAt - 1), formatUntil(w.changeUntil))
      : r.nextInLine();
  const lines = [first, r.pay()];
  return (
    <section
      aria-label={copy.council.whatNow.kicker}
      className={cx('flex flex-col gap-1.5 border-[1.5px] border-petrol bg-paper-card p-3', className)}
      data-testid="what-now"
    >
      <span className="label-caps text-[10px] text-muted">{copy.council.whatNow.kicker}</span>
      <ol className="flex flex-col gap-1.5">
        {lines.map(([title, body], i) => (
          <li key={title} className="flex gap-2 font-body text-[13.5px] leading-snug">
            <span className="font-label text-[15px] text-petrol" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <strong className="font-semibold">{title}</strong> — {body}
            </span>
          </li>
        ))}
      </ol>
      {onDesk && (
        <Button variant="outline" className="mt-1 w-full" onClick={onDesk} data-testid="what-now-desk">
          {copy.council.whatNow.button(hallName)}
        </Button>
      )}
    </section>
  );
}
