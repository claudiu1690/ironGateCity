import { copy } from '@irongate/content/copy';
import type { FactionId, IssueRowView, TownHallView, WhatNowView } from '@irongate/rules';
import { useState } from 'react';
import { cx, formatUntil, formatWeekday } from '../format';
import { Button } from './Button';
import { IssueRow, weekdayOf } from './Capital';
import { HelpButton, helpMark } from './Help';
import { PersonMark } from './PersonMark';
import { RuleCards, RulePicker, StandCard, councilRuleNote, howWords } from './RuleCard';

/**
 * Review 4 (answers §10–§11, ADR 0077); the voting rework (design §4.4, tech design §9.5): the Town
 * Hall's sheet, the council's public face, in five blocks after the ticket: the rule in force, next
 * week's rule (the ballot in the block; a councillor's own rule and its picker), the council as rows,
 * the stand card and the week's Issues. Plain props; the acts are the page's.
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
  /** Stand with a rule (`council.declare`). */
  onStand?: (ordinanceId: string) => void;
  /** The act on its way ('vote' | 'setRule' | 'declare'), from the page's political act. */
  pending: string | null;
  /** The refusal's words, if the last act was refused. */
  notice?: string | null;
}

export interface TownHallBlocksProps {
  hall: TownHallView;
  names: Partial<Record<FactionId, string>>;
  /** The reader's party (a local's crest). */
  factionId: FactionId;
  /** The reader's party's Rank 2 and Rank 3 titles (the *Council rule* note). */
  rankTitles?: { rank2: string; rank3: string };
  desk?: DeskActs;
  /** An Issue row's *Where to act* (the first tagged place). */
  onWhereToAct?: (row: IssueRowView) => void;
  className?: string;
}

export function TownHallBlocks({ hall, names, factionId, rankTitles, desk, onWhereToAct, className }: TownHallBlocksProps) {
  const eligible = !!hall.stand && hall.stand.requirements.every((r) => r.met);
  return (
    <div className={cx('flex flex-col gap-3', className)} data-testid="town-hall">
      <RuleInForce hall={hall} names={names} rankTitles={rankTitles} />
      <NextWeeksRule hall={hall} names={names} acts={desk} />
      <CouncilSeats hall={hall} factionId={factionId} />
      {eligible && desk?.onStand && (
        <StandCard
          stand={hall.stand}
          cityName={hall.cityName}
          onStand={desk.onStand}
          pending={desk.pending === 'declare'}
        />
      )}
      <HallIssues hall={hall} names={names} onWhereToAct={onWhereToAct} />
    </div>
  );
}

/** Block 1: the rule in force, its plain effect, the days left and how it won (design §8.2). */
function RuleInForce({
  hall,
  names,
  rankTitles,
}: {
  hall: TownHallView;
  names: Partial<Record<FactionId, string>>;
  rankTitles?: { rank2: string; rank3: string };
}) {
  const f = hall.inForce;
  if (!f) return null;
  const how = howWords(
    {
      how: f.how,
      weekday: f.countDay !== null ? weekdayOf(f.countDay) : null,
      votes: f.votes,
      voters: f.voters,
      factionIds: f.factionIds,
      seats: f.seats,
    },
    names,
  );
  const note = councilRuleNote({
    cityName: hall.seatCount === 10 ? 'Irongate' : hall.cityName,
    rank2: rankTitles?.rank2 ?? '',
    rank3: rankTitles?.rank3 ?? '',
    fromWeekday: formatWeekday(hall.next.pollsOpenAt),
    toWeekday: formatWeekday(hall.next.countAt - 1),
    capital: hall.seatCount === 10,
  });
  return (
    <section aria-label={copy.hall.ruleInForce} className="flex flex-col gap-1" data-testid="hall-rule">
      <HelpButton
        notes={[note]}
        more={hall.seatCount === 10 ? copy.help.ruleMore : undefined}
        label={`${copy.hall.ruleInForce}: ${copy.ballot.howTheVoteWorks}`}
        className={cx(kicker, 'w-full text-left')}
      >
        <span className={helpMark}>{copy.hall.ruleInForce}</span>
      </HelpButton>
      <span className="font-body text-[16px] font-semibold" data-testid="hall-rule-name">
        {f.name}
      </span>
      <span className="font-body text-[14px] text-text-2" data-testid="hall-rule-line">
        {copy.hall.ruleLine(f.plainLine, f.daysLeft)}
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
 * Block 2: next week's rule (design §4.4). Days 2–4: the three cards with the vote inside the block,
 * or *your vote*. Days 0–1: the cards as they stand and when the ballot is set; a councillor's card
 * carries *your rule* and *Change ›* (or the *next in line* line). Then the Next line and the pay.
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
  const voting = !!acts && b.status === 'set' && b.canVote;
  const cast = b.cards.some((x) => x.yourVote);
  const chosen = b.cards.find((x) => x.ordinanceId === acts?.selected);
  const canChange = !!acts && !!c && c.menu.length > 0;
  const change = canChange ? (
    <button
      type="button"
      onClick={() => setPickerOpen(true)}
      disabled={!!acts.pending}
      className="-my-1 inline-flex min-h-11 cursor-pointer items-center self-start font-mono text-[13px] text-ink underline underline-offset-2"
      data-testid="hall-change"
    >
      {copy.hall.change}
    </button>
  ) : null;
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
      <RuleCards
        cards={b.cards}
        mode={voting ? 'vote' : 'show'}
        label={copy.hall.nextWeeksRule}
        names={names}
        selected={acts?.selected ?? null}
        onSelect={acts?.onSelect}
        disabled={!!acts?.pending}
        extra={c?.onBallot && change ? { [c.rule.ordinanceId]: change } : undefined}
        capital={b.capital}
      />
      {voting && !cast && acts && (
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
        <p className="font-mono text-[12px] text-muted" data-testid="hall-ballot-set">
          {copy.hall.ballotSetAt(formatUntil(b.setAt))}
        </p>
      )}
      {c && !c.onBallot && (
        <div className="flex flex-col gap-0.5" data-testid="hall-next-in-line">
          <p className="font-mono text-[12px] text-text-2">
            {/* The capital: the party's one card, set by the bloc's top seat (design §8.6 Q4). */}
            {c.capital && !c.capital.leadsBloc
              ? copy.hall.partyCardSet(c.capital.by, names[c.capital.factionId] ?? c.capital.factionId, c.capital.rule)
              : copy.hall.nextInLine}
          </p>
          <p className="font-mono text-[12px]">
            {copy.stand.yourRule}: <span className="font-semibold">{c.rule.name}</span>
          </p>
          {change}
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
      {c && (
        <p className="font-mono text-[12px] text-muted" data-testid="hall-pay">
          {copy.council.deskNext.pay}
        </p>
      )}
      {canChange && (
        <RulePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          menu={c.menu}
          current={c.rule.ordinanceId}
          own={c.rule.ordinanceId}
          onPick={acts.onSetRule}
          disabled={!!acts.pending}
        />
      )}
    </section>
  );
}

/** Block 3: the seats as rows, *Player · Organiser · rule: …* or *Local candidate*, the term's end. */
function CouncilSeats({ hall, factionId }: { hall: TownHallView; factionId: FactionId }) {
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
                {s.kind === 'player' && s.rule ? ` · ${copy.hall.ruleOf(s.rule)}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="pt-1.5 font-body text-[12.5px] text-text-2 italic">{copy.stand.localsLine}</p>
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
 * The voting rework (design §4.6, tech design §9.7): *What now · your five days*, once per term: two
 * numbered lines (your rule on the ballot, or next in line; the capital's party card) and the pay,
 * then *To your desk at the Town Hall*.
 */
export function WhatNowCard({ whatNow: w, hallName, names = {}, onDesk, className }: WhatNowCardProps) {
  const r = copy.council.whatNow.rule;
  const party = w.capital ? (names[w.capital.factionId] ?? w.capital.factionId) : '';
  const first = w.capital
    ? w.capital.leadsBloc
      ? r.capitalLeads(party, w.rule.name)
      : r.capitalChosen(w.capital.by, party, w.capital.rule ?? w.rule.name)
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
        <Button className="mt-1 w-full" onClick={onDesk} data-testid="what-now-desk">
          {copy.council.whatNow.button(hallName)}
        </Button>
      )}
    </section>
  );
}

