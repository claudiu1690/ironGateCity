import { copy } from '@irongate/content/copy';
import type { FactionId, NationalCandidateView, NationalResultView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatShare } from '../format';
import { Button } from './Button';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { nameOf } from './Parliament';
import type { FactionNames } from './Parliament';

const E = copy.nation.election;

/**
 * One row of a ballot (the Chair's, the party's pick, the republic's, the vote on the Chair): a radio
 * row, 44 px or more, the name in body 600 and the lines under it; selected: inverted ring and
 * *your choice*. The sticky button commits (the parent's).
 */
export interface BallotChoiceProps {
  name: string;
  lines?: ReactNode;
  selected: boolean;
  onSelect?: () => void;
  /** The voter's own vote (after it is cast). */
  yours?: boolean;
  factionId?: FactionId;
  /** At the right (a Back button). */
  aside?: ReactNode;
  testId?: string;
  choiceKey?: string;
}

export function BallotChoice({ name, lines, selected, onSelect, yours, factionId, aside, testId = 'ballot-choice', choiceKey }: BallotChoiceProps) {
  const ring = (
    <span
      aria-hidden
      className={cx(
        'mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink',
        selected && 'bg-ink',
      )}
    >
      {selected && <span className="size-2 rounded-full bg-paper" />}
    </span>
  );
  const body = (
    <>
      {onSelect && ring}
      {factionId && <FactionCrest factionId={factionId} size={14} className="mt-1 shrink-0" />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="font-body text-[15px] leading-snug font-semibold">{name}</span>
        {lines}
        {yours && <span className="font-mono text-[11px] text-petrol">your vote</span>}
      </span>
    </>
  );
  return (
    <li
      className={cx('flex items-start gap-2 border-b border-dotted border-faint', selected && 'bg-paper-card')}
      data-testid={testId}
      data-key={choiceKey}
      data-selected={selected ? 'true' : undefined}
    >
      {onSelect ? (
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={onSelect}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-2 py-2 pl-1"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-11 min-w-0 flex-1 items-start gap-2 py-2 pl-1">{body}</div>
      )}
      {aside && <div className="flex shrink-0 items-center self-center py-1">{aside}</div>}
    </li>
  );
}

/** Two pledges as chips (Oswald 11 px), wrapping to one line. */
export function PledgeChips({ pledges }: { pledges: string[] }) {
  if (pledges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1" data-testid="pledges">
      {pledges.map((p) => (
        <span key={p} className="label-caps border border-ink px-1 text-[10px]">
          {p}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// The republic's three candidates (screens §7.3): one row per party.
// ---------------------------------------------------------------------------------------------

export interface NationalBallotProps {
  candidates: NationalCandidateView[];
  names: FactionNames;
  /** The vote: the selected party, one tap selects. Absent: the list only. */
  selected?: FactionId | null;
  onSelect?: (f: FactionId) => void;
  yourVote?: FactionId | null;
  /** *Back · 10 Political Capital* on the voter's own party's row when a backing is left. */
  onBack?: (f: FactionId) => void;
  backPending?: boolean;
  backedName?: string | null;
}

export function NationalBallot({ candidates, names, selected, onSelect, yourVote, onBack, backPending, backedName }: NationalBallotProps) {
  return (
    <ul className="flex flex-col" role={onSelect ? 'radiogroup' : undefined} aria-label={E.whoStands} data-testid="national-ballot">
      {candidates.map((c) => (
        <BallotChoice
          key={c.factionId}
          choiceKey={c.factionId}
          testId="national-row"
          name={c.name}
          factionId={c.factionId}
          selected={selected === c.factionId}
          onSelect={onSelect ? () => onSelect(c.factionId) : undefined}
          yours={yourVote === c.factionId}
          lines={
            <>
              <span className="font-mono text-[11px] text-muted">
                {c.kind === 'npc' ? E.ownCandidateTag(nameOf(names, c.factionId)) : nameOf(names, c.factionId)}
              </span>
              {c.platform && <span className="font-body text-[13px] text-text-2 italic">{c.platform}</span>}
              {c.pledges.length === 2 && (
                <span className="font-mono text-[11px]">{E.pledges(c.pledges[0]!.name, c.pledges[1]!.name)}</span>
              )}
            </>
          }
          aside={
            c.canBack && onBack ? (
              <Button variant="outline" className="px-2 text-[11px]" pending={backPending} onClick={() => onBack(c.factionId)} data-testid="back-president">
                {E.back}
              </Button>
            ) : backedName && backedName === c.name ? (
              <span className="font-mono text-[11px] text-petrol">{E.backed}</span>
            ) : undefined
          }
        />
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// The republic's result (screens §7.4): seven columns, the winner's row ruled.
// ---------------------------------------------------------------------------------------------

export function ScoreTable({ result, names }: { result: NationalResultView; names: FactionNames }) {
  const order = [...result.scores].sort((a, b) => b.score - a.score);
  const who = (f: FactionId) =>
    result.president.factionId === f
      ? result.president.name
      : result.runnerUp?.factionId === f
        ? result.runnerUp.name
        : '';
  const C = E.columns;
  return (
    <div className="overflow-x-auto" data-testid="score-table">
      <table className="w-full min-w-[340px] border-collapse text-left">
        <thead>
          <tr className="label-caps border-b-[1.5px] border-ink text-[10px] text-muted">
            <th scope="col" className="py-1 pr-1">Party</th>
            <th scope="col" className="py-1 pr-1">Candidate</th>
            <th scope="col" className="py-1 pr-1 text-right">{C.votes}</th>
            <th scope="col" className="py-1 pr-1 text-right">{C.republic}</th>
            <th scope="col" className="py-1 pr-1 text-right">{C.backers}</th>
            <th scope="col" className="py-1 pr-1 text-right">{C.score}</th>
            <th scope="col" className="py-1 text-right">{C.seats}</th>
          </tr>
        </thead>
        <tbody>
          {order.map((s) => {
            const won = s.factionId === result.president.factionId;
            return (
              <tr
                key={s.factionId}
                className={cx('border-b border-dotted border-faint align-top', won && 'border-b-[1.5px] border-solid border-ink')}
                data-testid="score-row"
                data-faction={s.factionId}
              >
                <td className="py-1.5 pr-1">
                  <span className="inline-flex items-center gap-1 font-label text-[11px] uppercase">
                    <FactionCrest factionId={s.factionId} size={10} />
                    <span className={FACTION_STYLE[s.factionId].text}>{nameOf(names, s.factionId)}</span>
                  </span>
                </td>
                <td className="py-1.5 pr-1 font-body text-[12px] leading-tight">
                  {who(s.factionId)}
                  {won && <span className="label-caps ml-1 text-[10px] text-petrol">{E.presidentTag}</span>}
                </td>
                <td className="py-1.5 pr-1 text-right font-label text-[11px]">{formatShare(s.ballotShare * 100)}</td>
                <td className="py-1.5 pr-1 text-right font-label text-[11px]">{formatShare(s.controlShare)}</td>
                <td className="py-1.5 pr-1 text-right font-label text-[11px]">{s.backers}</td>
                <td className="py-1.5 pr-1 text-right font-label text-[12px] font-bold">{formatShare(s.score)}</td>
                <td className="py-1.5 text-right font-label text-[12px] font-bold">{s.seats}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A requirement as a tick or a dash (the stand cards). */
export function Tick({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="font-mono text-[12px]" data-ok={ok ? 'true' : 'false'}>
      {children} {ok ? '✓' : '—'}
    </li>
  );
}
