import { copy } from '@irongate/content/copy';
import type { CouncilView, ElectionView } from '@irongate/rules';
import {
  Button,
  CountTable,
  OrderPaper,
  OrdinanceMenu,
  Plate,
  ProgressBar,
  ResultModal,
  SeatGrid,
  Slate,
  formatAt,
  formatUntil,
  formatWeekday,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { noticeFor } from '../features/game/errors';
import { useCharacter } from '../features/game/hooks';
import { trpcClient, trpc } from '../lib/trpc';

/**
 * Slice 3's council screens (docs/design/slice-3-screens.md §3–§6, in review 2's plain words): who's
 * standing, the vote, the result and the council, in the paper's 640 px column. Every act is one tap
 * and one modal that ends with what comes next. The routes keep their slice-3 paths.
 */

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="paper-grain min-h-full text-ink">
      <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-4 pt-4 pb-8 lg:pb-[132px]">{children}</div>
    </div>
  );
}

function Sticky({ children }: { children: ReactNode }) {
  return (
    <div
      className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-1 border-t border-track bg-paper px-4 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:bottom-[124px] lg:mx-0 lg:border lg:border-ink lg:p-2 lg:shadow-[0_8px_24px_rgb(0_0_0/0.35)]"
      data-testid="council-cta"
    >
      {children}
    </div>
  );
}

function Loading({ what }: { what: string }) {
  return (
    <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
      {what}
    </p>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="p-4 text-paper">
      <p role="alert">This could not be loaded.</p>
      <Button variant="outline-light" className="mt-3" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

function Notice({ error }: { error: unknown }) {
  const text = noticeFor(error);
  return text ? (
    <p role="status" className="font-body text-[13px] text-collective" data-testid="council-notice">
      {text}
    </p>
  ) : null;
}

/**
 * Review 2 (answers §4.6.6): the last result stays one tap away all cycle, from who's standing and
 * the vote as from the council; nothing when there has been no count yet.
 */
function LastResultLink() {
  const count = useQuery(trpc.council.count.queryOptions());
  if (!count.data) return null;
  return (
    <Link
      to="/council/count"
      className="-my-2 inline-flex min-h-11 items-center self-start font-mono text-[12px] text-muted underline underline-offset-2"
      data-testid="last-result"
    >
      {copy.lastResult} · {count.data.weekday}
    </Link>
  );
}

// ---------------------------------------------------------------------------------------------
// The slate (screens §3).
// ---------------------------------------------------------------------------------------------

function DeclareCard({
  e,
  onDeclare,
  pending,
}: {
  e: ElectionView;
  onDeclare: (platformId: string) => void;
  pending: boolean;
}) {
  const d = e.declare!;
  const [platform, setPlatform] = useState(d.platforms[0]?.id ?? '');
  const rank = d.requirements.find((r) => r.id === 'rank')!;
  const known = d.requirements.find((r) => r.id === 'known')!;
  const tick = (met: boolean) => (met ? '✓' : '✗');
  const eligible = rank.met && known.met;
  return (
    <section
      aria-label="Stand for the council"
      className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3"
      data-testid="declare-card"
    >
      <h2 className="label-caps text-[11px] font-semibold">Stand for the council</h2>
      <ul className="flex flex-col gap-0.5 font-mono text-[12px]">
        <li>
          {tick(rank.met)} Rank 3, {rank.rankTitle}
          {!rank.met && rank.fxpToGo ? ` · ${rank.fxpToGo.toLocaleString('en-GB')} Party XP to go` : ''}
        </li>
        <li>
          {tick(known.met)} Known in {e.cityName} ({known.successes} wins)
        </li>
        <li>2 backers by {formatUntil(e.nominationsCloseAt)}</li>
      </ul>
      {eligible && (
        <>
          <fieldset className="flex flex-col gap-1">
            <legend className="label-caps pb-1 text-[10px] text-muted">Your line</legend>
            {d.platforms.map((p) => (
              <label
                key={p.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 border-b border-dotted border-faint font-body text-[14px] italic"
              >
                <input
                  type="radio"
                  name="platform"
                  value={p.id}
                  checked={platform === p.id}
                  onChange={() => setPlatform(p.id)}
                  className="size-5 accent-ink"
                />
                {p.line}
              </label>
            ))}
          </fieldset>
          <Button
            onClick={() => onDeclare(platform)}
            pending={pending}
            disabled={!d.canDeclare}
            className="w-full"
          >
            {d.reason === 'NOT_ENOUGH_PC' ? copy.needsPc(d.cost) : copy.declare(d.cost)}
          </Button>
          <p className="font-mono text-[11px] text-muted">{copy.depositRule}</p>
        </>
      )}
    </section>
  );
}

function CandidacyCard({
  e,
  onWithdraw,
  pending,
}: {
  e: ElectionView;
  onWithdraw: () => void;
  pending: boolean;
}) {
  const c = e.candidacy!;
  const n = c.endorsements?.n ?? 0;
  const needed = c.endorsements?.needed ?? 2;
  return (
    <section
      aria-label="You're standing"
      className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3"
      data-testid="candidacy-card"
    >
      <h2 className="label-caps text-[11px] font-semibold">You're standing</h2>
      {c.status === 'filed' ? (
        <>
          <p className="font-body text-[15px]" data-testid="candidacy-endorsements">
            {copy.onTheSlate(n, needed)}
          </p>
          <ProgressBar label="Backers" value={n} max={needed} tone="ink" />
          {c.branchLine && <p className="font-mono text-[12px] text-petrol">{copy.branchEndorsesYou}</p>}
          {c.endorsements?.branchCounts === 2 && (
            <p className="font-mono text-[12px] text-muted">{copy.branchMakesUpTheNumber}</p>
          )}
          {c.canWithdraw && (
            <div className="flex items-center justify-end gap-2">
              <span className="font-mono text-[11px] text-muted">{copy.depositStays}</span>
              <Button variant="outline" onClick={onWithdraw} pending={pending}>
                {copy.withdraw}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="font-body text-[15px]">
          {c.status === 'withdrawn'
            ? copy.withdrawnLine
            : c.status === 'struck'
              ? copy.struckLine
              : copy.onTheBallotLine}
        </p>
      )}
    </section>
  );
}

export function SlatePage() {
  const q = useQuery(trpc.council.election.queryOptions());
  const act = usePoliticalAct();
  const [endorsedName, setEndorsedName] = useState<string | null>(null);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the candidates…" />;
  const e = q.data;
  if (e.phase === 'polling') {
    return (
      <Page>
        <Plate kicker={`${e.cityName} Council · Voting`} title="Who's standing">
          <span className="font-mono text-[12px] text-dim">{copy.tooLateToStand}</span>
        </Plate>
        <LastResultLink />
        {/* Review 2 #6: a candidate struck at the close (or printed on the ballot) saw nothing here
            about it; the view carries the candidacy's status, so say it. */}
        {e.candidacy && <CandidacyCard e={e} pending={false} onWithdraw={() => undefined} />}
        <Link
          to="/council/ballot"
          className="label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper"
        >
          {copy.castYourBallot}
        </Link>
      </Page>
    );
  }
  return (
    <Page>
      <Plate kicker={`${e.cityName} Council · Candidates`} title="Who's standing">
        <span className="font-mono text-[12px] text-dim">
          {copy.namesGoIn(formatUntil(e.nominationsCloseAt), formatWeekday(e.pollsOpenAt))}
        </span>
      </Plate>
      <p className="font-mono text-[11.5px] text-muted" data-testid="how-decided">
        {copy.howDecided}
      </p>
      <LastResultLink />
      {e.candidacy ? (
        <CandidacyCard
          e={e}
          pending={act.pending === 'withdraw'}
          onWithdraw={() =>
            void act.run('withdraw', (k) => trpcClient.council.withdraw.mutate({ idempotencyKey: k }))
          }
        />
      ) : e.declare ? (
        <DeclareCard
          e={e}
          pending={act.pending === 'declare'}
          onDeclare={(platformId) =>
            void act.run('declare', (k) =>
              trpcClient.council.declare.mutate({ platformId, idempotencyKey: k }),
            )
          }
        />
      ) : null}
      <Notice error={act.error} />
      <Slate
        candidates={e.candidates}
        mode="slate"
        endorsingId={act.pending?.startsWith('endorse:') ? act.pending.slice(8) : null}
        onEndorse={(candidacyId) => {
          const name = e.candidates.find((c) => c.candidacyId === candidacyId)?.name ?? '';
          void act
            .run(`endorse:${candidacyId}`, (k) =>
              trpcClient.council.endorse.mutate({ candidacyId, idempotencyKey: k }),
            )
            .then(() => setEndorsedName(name));
        }}
      />
      {endorsedName && e.endorsed && (
        <p className="font-mono text-[12px] text-petrol" role="status">
          {copy.youEndorsed(e.endorsed.name, 10)}
        </p>
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The ballot (screens §4).
// ---------------------------------------------------------------------------------------------

export function BallotPage() {
  const q = useQuery(trpc.council.election.queryOptions());
  const act = usePoliticalAct();
  const [selected, setSelected] = useState<string | null>(null);
  const closed = !!q.data && (q.data.phase !== 'polling' || !q.data.ballot);
  // Review 2 #6: a voter coming back to the ballot after the polls found no word of the result.
  const count = useQuery({ ...trpc.council.count.queryOptions(), enabled: closed });
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the ballot…" />;
  const e = q.data;
  if (closed || !e.ballot) {
    return (
      <Page>
        <Plate kicker={`${e.cityName} Council`} title="Your vote">
          <span className="font-mono text-[12px] text-dim">
            {e.cityName} votes from {formatWeekday(e.pollsOpenAt)}
          </span>
        </Plate>
        {count.data && (
          <Link
            to="/council/count"
            className="label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper"
            data-testid="ballot-see-count"
          >
            {copy.seeTheResult} · {count.data.weekday}
          </Link>
        )}
        <Link
          to="/council/slate"
          className="label-caps inline-flex min-h-11 items-center justify-center border-[1.5px] border-ink px-4 text-[13px]"
        >
          {copy.seeWhosStanding}
        </Link>
      </Page>
    );
  }
  const cast = e.ballot.cast;
  const chosen = e.candidates.find((c) => c.key === selected);
  return (
    <Page>
      <Plate kicker={`${e.cityName} Council · Voting`} title="Your vote">
        <span className="font-mono text-[12px] text-dim">
          Seven seats · one vote · secret and final · closes {formatUntil(e.countAt)}
        </span>
      </Plate>
      <LastResultLink />
      <Slate
        candidates={e.candidates}
        mode="ballot"
        selectedKey={selected}
        castKey={cast?.key ?? null}
        onSelect={setSelected}
      />
      <Notice error={act.error} />
      <Sticky>
        {cast ? (
          <p className="py-2 text-center font-mono text-[12px]" data-testid="ballot-cast-line">
            {copy.ballotCastLine(formatWeekday(e.countAt))}
          </p>
        ) : (
          <>
            <Button
              className="w-full"
              disabled={!chosen || !e.ballot.canVote}
              pending={act.pending === 'vote'}
              onClick={() =>
                chosen &&
                void act.run('vote', (k) =>
                  trpcClient.council.vote.mutate({ candidateKey: chosen.key, idempotencyKey: k }),
                )
              }
            >
              {chosen ? copy.castYourBallotFor(chosen.name) : copy.chooseAName}
            </Button>
            <p className="text-center font-mono text-[11px] text-muted">
              {copy.ballotCaption(formatAt(e.countAt))}
            </p>
          </>
        )}
      </Sticky>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The count (screens §5).
// ---------------------------------------------------------------------------------------------

export function CountPage() {
  const q = useQuery(trpc.council.count.queryOptions());
  const { character } = useCharacter();
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (q.isPending) return <Loading what="Fetching the result…" />;
  const c = q.data;
  if (!c) {
    return (
      <Page>
        <Plate kicker="THE RESULT" title="No result yet">
          <span className="font-mono text-[12px] text-dim">
            The first result is in the paper the morning after voting closes.
          </span>
        </Plate>
      </Page>
    );
  }
  return (
    <Page>
      <Plate kicker={`${c.cityName} Council · The result`} title={`${c.weekday}'s result`}>
        <span className="font-mono text-[12px] text-dim">
          {copy.turnout(c.turnout.voters, c.turnout.eligible)} · {copy.npcSeats(c.npcSeats, c.seats)} · final
        </span>
      </Plate>
      <CountTable rows={c.rows} factionId={character?.factionId ?? 'collective'} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The chamber (screens §6).
// ---------------------------------------------------------------------------------------------

function CouncilHeader({ c }: { c: CouncilView }) {
  return (
    <Plate kicker={`${c.cityName} Council · Sitting`} title="The council">
      <span className="font-mono text-[12px] text-dim" data-testid="council-header">
        Term ends {formatWeekday(c.termEndsAt - 1)} · {copy.npcSeats(c.npcSeats, 7)}
        {c.inForce ? ` · council rule in force: ${c.inForce.name} · ${c.inForce.daysLeft} days left` : ''}
      </span>
      {/* Review 2 (screens §6.1): the names never disappear: the last result, every day. */}
      <Link
        to="/council/count"
        className="-my-2 inline-flex min-h-11 items-center self-start font-mono text-[12px] text-dim underline underline-offset-2"
        data-testid="council-last-result"
      >
        {copy.lastResult}
      </Link>
    </Plate>
  );
}

export function CouncilPage() {
  const q = useQuery(trpc.council.chamber.queryOptions());
  const { character } = useCharacter();
  const act = usePoliticalAct();
  const [selected, setSelected] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (act.open) setMenuOpen(false);
  }, [act.open]);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data || !character) return <Loading what="Opening the chamber…" />;
  const c = q.data;
  const secretary = c.paper.items.find((i) => i.movedBy.kind === 'branch')?.movedBy.name ?? '';
  const voting = c.window.voting && c.you.councillor;
  const chosen =
    selected === 'against' ? copy.againstAll : c.paper.items.find((i) => i.ordinanceId === selected)?.name;
  const proposed = c.you.proposed ? c.paper.items.find((i) => i.ordinanceId === c.you.proposed)?.name : null;
  const full = c.paper.items.filter((i) => i.movedBy.kind === 'player').length >= 3;
  return (
    <Page>
      <CouncilHeader c={c} />
      <SeatGrid seats={c.seats} factionId={character.factionId} />
      <OrderPaper
        council={c}
        secretary={secretary}
        selected={selected}
        onSelect={voting ? setSelected : undefined}
        disabled={!!act.pending}
      />
      {voting && c.menu && (
        <div className="flex flex-col gap-1">
          {c.you.proposed ? (
            <p className="font-mono text-[12px] text-muted">{copy.youMoved(proposed ?? '')}</p>
          ) : full ? (
            <p className="font-mono text-[12px] text-muted">{copy.paperFull}</p>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setMenuOpen(true)}>
              {copy.propose(20)}
            </Button>
          )}
          <OrdinanceMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            items={c.menu}
            canAfford={c.you.pc >= 20}
            pending={act.pending === 'propose'}
            onPropose={(ordinanceId) =>
              void act.run('propose', (k) =>
                trpcClient.council.propose.mutate({ ordinanceId, idempotencyKey: k }),
              )
            }
          />
        </div>
      )}
      <Notice error={act.error} />
      {c.you.councillor && (
        <Sticky>
          {c.you.voted !== null ? (
            <p className="py-2 text-center font-mono text-[12px]" data-testid="council-voted-line">
              {copy.voteRecorded(formatWeekday(c.window.divideAt))}
            </p>
          ) : voting ? (
            <>
              <Button
                className="w-full"
                disabled={!selected}
                pending={act.pending === 'councilVote'}
                onClick={() =>
                  selected &&
                  void act.run('councilVote', (k) =>
                    trpcClient.council.councilVote.mutate({ choice: selected, idempotencyKey: k }),
                  )
                }
              >
                {chosen ? copy.voteFor(chosen) : copy.chooseAMotion}
              </Button>
              <p className="text-center font-mono text-[11px] text-muted">
                {copy.councilCaption(formatAt(c.window.divideAt))}
              </p>
            </>
          ) : null}
        </Sticky>
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}
