import { copy } from '@irongate/content/copy';
import type { FactionId, IssueRowView, TownHallView, WhatNowView } from '@irongate/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { dayStart } from '@irongate/rules';
import { cx, formatAt, formatUntil, formatWeekday } from '../format';
import { Button } from './Button';
import { IssueRow } from './Capital';
import { HelpButton, helpMark } from './Help';
import { OrderPaper, OrdinanceMenu, OrdinanceRow, PersonMark } from './Politics';

/**
 * Review 4 (answers §10–§11, ADR 0077): the Town Hall's sheet, the council's public face, in the
 * order of answers §11.2 after the ticket: *Your desk* for a councillor here, the rule in force, the
 * council as rows, the order paper read-only for everyone else, the week's Issues, and the Election
 * card (a slot: the page passes its own). Plain props; the acts are the page's.
 */

const kicker = 'label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold';

export interface DeskActs {
  /** The chosen item while voting (an ordinance id or 'against'). */
  selected: string | null;
  onSelect: (choice: string) => void;
  onVote: () => void;
  onPropose: (ordinanceId: string) => void;
  /** The act on its way ('councilVote' | 'propose'), from the page's political act. */
  pending: string | null;
  /** The refusal's words, if the last act was refused. */
  notice?: string | null;
}

export interface TownHallBlocksProps {
  hall: TownHallView;
  names: Partial<Record<FactionId, string>>;
  /** The reader's party (a local's crest; the order paper's branch). */
  factionId: FactionId;
  desk?: DeskActs;
  /** The Election card, as the page builds it (the city screen's component). */
  election?: ReactNode;
  /** An Issue row's *Where to act* (the first tagged place). */
  onWhereToAct?: (row: IssueRowView) => void;
  className?: string;
}

export function TownHallBlocks({ hall, names, factionId, desk, election, onWhereToAct, className }: TownHallBlocksProps) {
  return (
    <div className={cx('flex flex-col gap-3', className)} data-testid="town-hall">
      {hall.desk && desk && <YourDesk hall={hall} names={names} acts={desk} />}
      <RuleInForce hall={hall} />
      <CouncilRows hall={hall} factionId={factionId} />
      {!hall.desk && <UpForAVoteReadOnly hall={hall} />}
      <HallIssues hall={hall} names={names} onWhereToAct={onWhereToAct} />
      {election}
    </div>
  );
}

/** Answers §10.2: the councillor's desk: the vote, *Put forward a rule*, and the Next line. */
function YourDesk({ hall, names, acts }: { hall: TownHallView; names: Partial<Record<FactionId, string>>; acts: DeskActs }) {
  const d = hall.desk!;
  const [menuOpen, setMenuOpen] = useState(false);
  const voting = d.window.voting && d.you.councillor;
  const secretary = d.paper.items.find((i) => i.movedBy.kind === 'branch')?.movedBy.name ?? '';
  const chosen =
    acts.selected === 'against' ? copy.againstAll : d.paper.items.find((i) => i.ordinanceId === acts.selected)?.name;
  const proposed = d.you.proposed ? d.paper.items.find((i) => i.ordinanceId === d.you.proposed)?.name : null;
  const full = d.paper.items.filter((i) => i.movedBy.kind === 'player').length >= 3;
  return (
    <section aria-label={copy.hall.yourDesk} className="flex flex-col gap-2" data-testid="hall-desk">
      <div className={kicker}>{copy.hall.yourDesk}</div>
      <OrderPaper
        council={d}
        factionNames={names}
        secretary={secretary}
        selected={acts.selected}
        onSelect={voting ? acts.onSelect : undefined}
        disabled={!!acts.pending}
      />
      {voting && d.you.voted === null && (
        <Button
          className="w-full"
          disabled={!acts.selected}
          pending={acts.pending === 'councilVote'}
          onClick={acts.onVote}
          data-testid="desk-vote"
        >
          {chosen ? copy.voteFor(chosen) : copy.chooseAMotion}
        </Button>
      )}
      {voting && d.menu && (
        <div className="flex flex-col gap-1">
          {d.you.proposed ? (
            <p className="font-mono text-[12px] text-muted">{copy.youMoved(proposed ?? '')}</p>
          ) : full ? (
            <p className="font-mono text-[12px] text-muted">{copy.paperFull}</p>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setMenuOpen(true)} data-testid="desk-propose">
              {copy.propose(20)}
            </Button>
          )}
          <OrdinanceMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            items={d.menu}
            canAfford={d.you.pc >= 20}
            pending={acts.pending === 'propose'}
            onPropose={(id) => {
              setMenuOpen(false);
              acts.onPropose(id);
            }}
          />
        </div>
      )}
      {acts.notice && (
        <p role="status" className="font-body text-[13px] text-collective">
          {acts.notice}
        </p>
      )}
      <p className="font-mono text-[12px]" data-testid="desk-next">
        {deskNextLine(hall)}
      </p>
    </section>
  );
}

/** Answers §10.2: *Next: the council votes tomorrow 01:00.* and the other three by cycle day. */
export function deskNextLine(hall: Pick<TownHallView, 'desk'>): string {
  const n = hall.desk?.next;
  if (!n) return '';
  switch (n.kind) {
    case 'votes':
      return copy.council.deskNext.votes(formatAt(n.at));
    case 'voted':
      return copy.council.deskNext.voted(n.ordinance);
    case 'runs':
      return copy.council.deskNext.runs(
        n.ordinance,
        formatWeekday(dayStart(n.untilDay)),
        formatWeekday(dayStart(n.nominationsFromDay)),
      );
    case 'rose':
      return copy.council.deskNext.rose(formatWeekday(dayStart(n.nominationsFromDay)));
  }
}

/** Answers §11.2 block 3: the rule in force, its plain effect and the days left; or why there is none. */
function RuleInForce({ hall }: { hall: TownHallView }) {
  return (
    <section aria-label={copy.hall.ruleInForce} className="flex flex-col gap-1" data-testid="hall-rule">
      <HelpButton
        notes={[copy.help.ordinance(hall.passVotes, hall.seatCount)]}
        label={`${copy.hall.ruleInForce}: what a council rule is`}
        className={cx(kicker, 'w-full text-left')}
      >
        <span className={helpMark}>{copy.hall.ruleInForce}</span>
      </HelpButton>
      {hall.inForce ? (
        <>
          <span className="font-body text-[16px] font-semibold" data-testid="hall-rule-name">
            {hall.inForce.name}
          </span>
          <span className="font-body text-[14px] text-text-2" data-testid="hall-rule-line">
            {copy.hall.ruleLine(hall.inForce.plainLine, hall.inForce.daysLeft)}
          </span>
        </>
      ) : (
        <span className="font-body text-[14px] text-text-2" data-testid="hall-rule-line">
          {hall.noRule?.why === 'beforeVote' && hall.noRule.at !== null
            ? copy.hall.noRuleVotes(formatAt(hall.noRule.at))
            : copy.hall.noRuleDivided}
        </span>
      )}
    </section>
  );
}

/** Answers §11.2 block 4: the seats as rows, *Player · Organiser* or *Local candidate*, the term's end. */
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
              {s.votedFor && <span className="font-mono text-[11px]">{copy.hall.votedFor(s.votedFor)}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="pt-1.5 font-body text-[12.5px] text-text-2 italic">{copy.localCandidatesLine}</p>
    </section>
  );
}

/** Answers §11.2 block 5: the order paper read-only, and the next vote's moment or the result. */
function UpForAVoteReadOnly({ hall }: { hall: TownHallView }) {
  const divided = hall.paper.status === 'divided';
  const passed = hall.paper.items.find((i) => i.passed);
  return (
    <section aria-label={copy.hall.upForAVote} className="flex flex-col" data-testid="hall-paper">
      <div className={kicker}>{copy.hall.upForAVote}</div>
      {hall.paper.items.map((it) => (
        <OrdinanceRow
          key={it.ordinanceId}
          n={it.n}
          name={it.name}
          effectLine={it.effectLine}
          note={
            it.movedBy.kind === 'branch'
              ? copy.branchMotionBy(it.movedBy.name)
              : copy.movedBy(it.movedBy.you ? 'you' : it.movedBy.name)
          }
          right={divided ? it.votes : null}
          passed={it.passed}
        />
      ))}
      <p className="pt-1.5 font-mono text-[12px]" data-testid="hall-next-vote">
        {hall.nextVoteAt !== null
          ? copy.hall.nextVote(formatAt(hall.nextVoteAt))
          : passed
            ? copy.hall.voted(formatWeekday(hall.divideAt - 1), passed.name, passed.votes ?? 0, hall.seatCount)
            : copy.hall.votedNothing(formatWeekday(hall.divideAt - 1))}
      </p>
    </section>
  );
}

/** Answers §11.2 block 6: the city's two Issues as the paper's rows. */
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
  /** Absent at the hall itself (the desk is right below). */
  onDesk?: () => void;
  className?: string;
}

/**
 * Answers §10.1: *What now · your five days*, once per term: three numbered lines in the Standing
 * card's style, and *To your desk at the Town Hall*.
 */
export function WhatNowCard({ whatNow, hallName, onDesk, className }: WhatNowCardProps) {
  const lines = copy.council.whatNow.lines(formatAt(whatNow.divideAt), whatNow.seatCount, whatNow.passVotes);
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
