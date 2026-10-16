import { copy } from '@irongate/content/copy';
import { CHAIR } from '@irongate/rules';
import type { ChairElectionView, ConfidenceView } from '@irongate/rules';
import {
  BallotChoice,
  Button,
  HelpButton,
  NationHeader,
  PowerCard,
  ResultModal,
  SectionKicker,
  SignatureBar,
  StickyBar,
  Tick,
  dayDate,
  dayWeekday,
  formatAt,
  formatUntil,
  helpMark,
} from '@irongate/ui';
import { dayStart } from '@irongate/rules';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { trpc, trpcClient } from '../../lib/trpc';
import { useCharacter } from '../game/hooks';
import { LoadError, Loading, NationFrame, Notice, gateWords } from '../nation/frame';
import { useNationAct } from '../nation/useNationAct';

const CE = copy.nation.chairElection;
const C = copy.nation.chair;
const PE = copy.nation.petition;
const linkClass = 'inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2';
const ctaClass = 'label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper';

const untilDay = (d: number) => formatUntil(dayStart(d));

/** The card's two lines and its link, from the view (screens §7.1's table, the 10 Oct addendum). */
function cardState(e: ChairElectionView, faction: string): { line1: string; line2: string; to: string; cta: string; strong: boolean } {
  const mine = e.candidates.find((c) => c.you);
  if (e.phase === 'names') {
    if (mine) return { line1: CE.standing(mine.backers), line2: CE.closes(untilDay(e.days.votesFrom)), to: '/faction/election', cta: 'See the candidates', strong: false };
    if (e.stand?.ok) return { line1: CE.namesIn, line2: CE.closes(untilDay(e.days.votesFrom)), to: '/faction/election', cta: CE.stand, strong: true };
    return { line1: CE.namesIn, line2: CE.needs(untilDay(e.days.votesFrom)), to: '/faction/election', cta: "See who's standing", strong: false };
  }
  if (e.phase === 'voting') {
    if (e.yourVote) return { line1: CE.youVotedFor(e.yourVote.name), line2: `Result ${dayWeekday(e.days.countDay)} morning`, to: '/faction/election', cta: 'See the candidates', strong: false };
    return { line1: CE.votingOpen, line2: `Closes ${untilDay(e.days.countDay)} · your vote is secret`, to: '/faction/election/vote', cta: copy.election.voteNow, strong: e.canVote.ok };
  }
  if (e.result) {
    return {
      line1: C.isChair(e.result.winner.name),
      line2: e.chair.until ? `Until ${dayDate(e.chair.until - 1)}` : '',
      to: '/faction/election/result',
      cta: copy.seeTheResult,
      strong: false,
    };
  }
  return {
    line1: e.chair.kind === 'player' ? C.factionsChairIs(faction, e.chair.name) : C.secretaryRuns,
    line2: copy.nation.me.namesFrom(dayDate(e.days.namesFrom)),
    to: '/faction?tab=chair',
    cta: C.theChairsPage,
    strong: false,
  };
}

/** The Faction tab's Election card for Chair (screens §7.1). */
export function ChairElectionCard() {
  const q = useQuery(trpc.chairElection.get.queryOptions());
  const { character } = useCharacter();
  if (!q.data || !character) return null;
  const e = q.data;
  const s = cardState(e, character.factionName);
  return (
    <PowerCard kicker={CE.kicker(character.factionName)} testId="chair-election-card">
      <span className="font-body text-[15px] font-semibold" data-testid="chair-card-line1">
        {s.line1}
      </span>
      {s.line2 && <span className="font-mono text-[11.5px] text-muted">{s.line2}</span>}
      <Link
        to={s.to}
        className={s.strong ? ctaClass : 'inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2'}
        data-testid="chair-card-cta"
      >
        {s.cta}
      </Link>
    </PowerCard>
  );
}

/** The vote on the Chair, on the Faction tab while it is open (screens §9.3). */
export function ConfidenceCard() {
  const q = useQuery(trpc.confidence.get.queryOptions());
  const v = q.data?.vote;
  const p = q.data?.petition;
  if (!q.data || (!v && !(p && p.status === 'open'))) return null;
  return (
    <PowerCard kicker={C.voteOnChair} testId="confidence-card">
      {v ? (
        <>
          <span className="font-body text-[15px] font-semibold">{PE.chairVote(PE.reasons[v.trigger])}</span>
          {v.yourVote ? (
            <span className="font-mono text-[12px] text-petrol">Vote cast</span>
          ) : (
            <Link to="/faction/confidence" className={ctaClass} data-testid="confidence-vote-now">
              {copy.election.voteNow}
            </Link>
          )}
        </>
      ) : (
        p && (
          <>
            <span className="font-mono text-[12px]">{PE.chairCount(p.count, p.needed, formatUntil(p.until))}</span>
            <Link to="/faction/confidence" className={linkClass}>
              {C.voteOnChair}
            </Link>
          </>
        )
      )}
    </PowerCard>
  );
}

function ChairHeader({ e, title }: { e: ChairElectionView; title: string }) {
  const { character } = useCharacter();
  const hq = useQuery(trpc.faction.hq.queryOptions());
  return (
    <NationHeader
      asset={hq.data?.plate ?? null}
      kicker={CE.kicker(character?.factionName ?? '')}
      title={title}
      line={CE.howCounted}
      testId="chair-election-header"
    >
      <span className="sr-only">{e.secretary.name}</span>
    </NationHeader>
  );
}

// ---------------------------------------------------------------------------------------------
// Who's standing and the stand card (`/faction/election`).
// ---------------------------------------------------------------------------------------------

export function ChairElectionPage() {
  const q = useQuery(trpc.chairElection.get.queryOptions());
  const act = useNationAct();
  const [platform, setPlatform] = useState<string | null>(null);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the candidates…" />;
  const e = q.data;
  const stand = e.stand;
  const platformId = platform ?? stand?.platforms[0]?.id ?? null;
  return (
    <NationFrame header={<ChairHeader e={e} title="Who's standing for Chair" />}>
      <div className="flex flex-col gap-3" data-testid="chair-election-page" data-phase={e.phase}>
        <HelpButton notes={[copy.nation.help.chair()]} label={C.tab} className="self-start">
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>How this election works</span>
        </HelpButton>
        {stand && !stand.standing && (
          <PowerCard kicker={CE.namesIn} testId="chair-stand-card">
            <ul>
              <Tick ok={stand.why !== 'RANK'}>Rank {CHAIR.rank}</Tick>
              <Tick ok={stand.why !== 'LADDER'}>{CE.councilTermDone}</Tick>
              <Tick ok={stand.why !== 'TENURE'}>{CE.tenure}</Tick>
            </ul>
            {stand.platforms.length > 0 && (
              <fieldset className="flex flex-col">
                <legend className="label-caps text-[11px]">Your line</legend>
                {stand.platforms.map((p) => (
                  <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2 font-body text-[13px]">
                    <input type="radio" name="chair-platform" className="size-5 accent-ink" checked={platformId === p.id} onChange={() => setPlatform(p.id)} />
                    {p.line}
                  </label>
                ))}
              </fieldset>
            )}
            <Button
              variant="primary"
              disabled={!stand.ok || !platformId}
              pending={act.pending === 'stand'}
              onClick={() => platformId && void act.run('stand', (k) => trpcClient.chairElection.stand.mutate({ platformId, idempotencyKey: k }))}
              data-testid="chair-stand"
            >
              {CE.stand}
            </Button>
            <span className="font-mono text-[11px] text-muted">{stand.ok ? CE.cost : gateWords(stand.why)}</span>
          </PowerCard>
        )}
        <Notice error={act.error} />
        <SectionKicker>Players standing</SectionKicker>
        {e.candidates.length === 0 ? (
          <p className="font-mono text-[12px] text-muted">{copy.nation.empty.noChairCandidate(e.secretary.name, dayDate(e.days.namesFrom))}</p>
        ) : (
          <ul>
            {e.candidates.map((c) => (
              <BallotChoice
                key={c.candidacyId}
                choiceKey={c.candidacyId}
                name={c.name}
                selected={false}
                testId="chair-candidate"
                lines={
                  <>
                    <span className="font-mono text-[11px] text-muted">
                      Rank {c.rank} · Level {c.level} · {c.backers} {c.backers === 1 ? 'backer' : 'backers'}
                    </span>
                    {c.platform && <span className="font-body text-[13px] text-text-2 italic">{c.platform}</span>}
                    {c.you && <span className="font-mono text-[11px] text-petrol">{CE.standing(c.backers)}</span>}
                  </>
                }
                aside={
                  c.canBack ? (
                    <Button
                      variant="outline"
                      className="px-2 text-[11px]"
                      pending={act.pending === `back:${c.candidacyId}`}
                      onClick={() => void act.run(`back:${c.candidacyId}`, (k) => trpcClient.chairElection.back.mutate({ candidacyId: c.candidacyId, idempotencyKey: k }))}
                      data-testid="chair-back"
                    >
                      {copy.nation.election.back}
                    </Button>
                  ) : e.yourBacking?.name === c.name ? (
                    <span className="font-mono text-[11px] text-petrol">{copy.nation.election.backed}</span>
                  ) : undefined
                }
              />
            ))}
          </ul>
        )}
        <SectionKicker>{CE.secretary}</SectionKicker>
        <ul>
          <BallotChoice name={e.secretary.name} selected={false} testId="chair-secretary" lines={<span className="font-mono text-[11px] text-muted">{CE.secretaryRow(e.secretary.addressedAs)}</span>} />
        </ul>
        <p className="font-mono text-[11.5px] text-muted">{CE.secretaryNote}</p>
        {e.phase === 'voting' && e.canVote.ok && (
          <Link to="/faction/election/vote" className={ctaClass} data-testid="chair-vote-now">
            {copy.election.voteNow}
          </Link>
        )}
        {e.result && (
          <Link to="/faction/election/result" className={linkClass}>
            {copy.seeTheResult}
          </Link>
        )}
        <Link to="/faction" search={{ tab: 'chair' }} className={linkClass}>
          {C.theChairsPage}
        </Link>
      </div>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// The vote (`/faction/election/vote`).
// ---------------------------------------------------------------------------------------------

export function ChairVotePage() {
  const q = useQuery(trpc.chairElection.get.queryOptions());
  const act = useNationAct();
  const [pick, setPick] = useState<{ key: string; name: string } | null>(null);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the ballot…" />;
  const e = q.data;
  const canVote = e.canVote.ok && !e.yourVote;
  const rows = [
    ...e.candidates.map((c) => ({ key: c.key, name: c.name, line: c.platform ?? '' })),
    { key: 'n:secretary', name: e.secretary.name, line: CE.secretaryRow(e.secretary.addressedAs) },
  ];
  return (
    <NationFrame header={<ChairHeader e={e} title={CE.votingOpen} />}>
      <div className="flex flex-col gap-3" data-testid="chair-vote-page">
        <ul role="radiogroup" aria-label={CE.votingOpen}>
          {rows.map((r) => (
            <BallotChoice
              key={r.key}
              choiceKey={r.key}
              name={r.name}
              testId="chair-vote-row"
              selected={pick?.key === r.key}
              onSelect={canVote ? () => setPick(r) : undefined}
              yours={e.yourVote?.name === r.name}
              lines={r.line ? <span className="font-mono text-[11px] text-muted">{r.line}</span> : undefined}
            />
          ))}
        </ul>
        {!canVote && <p className="font-mono text-[12px] text-muted">{e.yourVote ? CE.youVotedFor(e.yourVote.name) : gateWords(e.canVote.why)}</p>}
        <Notice error={act.error} />
        <Link to="/faction/election" className={linkClass}>
          Who's standing
        </Link>
        {canVote && (
          <StickyBar testId="chair-vote-cta">
            <span className="font-mono text-[11px] text-muted">{CE.oneVote(formatAt(dayStart(e.days.countDay)).replace(/^at /, ''))}</span>
            <Button
              variant="primary"
              disabled={!pick}
              pending={act.pending === 'vote'}
              onClick={() => pick && void act.run('vote', (k) => trpcClient.chairElection.vote.mutate({ key: pick.key, idempotencyKey: k }))}
              data-testid="chair-vote"
            >
              {pick ? `Vote for ${pick.name}` : copy.election.voteNow}
            </Button>
          </StickyBar>
        )}
      </div>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// The result (`/faction/election/result`).
// ---------------------------------------------------------------------------------------------

export function ChairResultPage() {
  const e = useQuery(trpc.chairElection.get.queryOptions());
  const q = useQuery(trpc.chairElection.result.queryOptions());
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (q.isPending || !e.data) return <Loading what="Fetching the result…" />;
  const r = q.data;
  return (
    <NationFrame header={<ChairHeader e={e.data} title={r ? C.isChair(r.winner.name) : 'The result'} />}>
      <div className="flex flex-col gap-3" data-testid="chair-result-page">
        {!r ? (
          <p className="font-mono text-[12px] text-muted">No count yet this term.</p>
        ) : (
          <>
            <p className="font-mono text-[12px]" data-testid="chair-turnout">
              {CE.turnout(r.turnout.voters)}
            </p>
            <table className="w-full border-collapse text-left" data-testid="chair-result-table">
              <thead>
                <tr className="label-caps border-b-[1.5px] border-ink text-[10px] text-muted">
                  <th className="py-1">#</th>
                  <th className="py-1">Name</th>
                  <th className="py-1 text-right">Backers</th>
                  <th className="py-1 text-right">Votes</th>
                  <th className="py-1 text-right">Support</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row) => (
                  <tr key={row.key} className="border-b border-dotted border-faint font-body text-[13px]" data-testid="chair-result-row" data-kind={row.kind}>
                    <td className="py-1.5 font-label">{row.place}</td>
                    <td className="py-1.5">{row.name}</td>
                    <td className="py-1.5 text-right font-label">{row.backersCounted}</td>
                    <td className="py-1.5 text-right font-label">{row.votes}</td>
                    <td className="py-1.5 text-right font-label font-bold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-mono text-[11.5px] text-muted">{CE.resultNote}</p>
          </>
        )}
        <Link to="/faction" search={{ tab: 'chair' }} className={linkClass}>
          {C.theChairsPage}
        </Link>
      </div>
    </NationFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// The petition on the Chair and the vote (`/faction/confidence`; screens §9.3).
// ---------------------------------------------------------------------------------------------

export function ConfidencePage() {
  const q = useQuery(trpc.confidence.get.queryOptions());
  const act = useNationAct();
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the vote on the Chair…" />;
  return (
    <NationFrame header={<NationHeader kicker={C.voteOnChair} title={q.data.chair?.name ?? C.secretaryRuns} testId="confidence-header" />}>
      <ConfidenceBody v={q.data} act={act} />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

/** `ConfidenceBallot` and the petition (screens §9.3). */
function ConfidenceBody({ v, act }: { v: ConfidenceView; act: ReturnType<typeof useNationAct> }) {
  const [pick, setPick] = useState<'confidence' | 'noConfidence' | null>(null);
  const vote = v.vote;
  const p = v.petition;
  return (
    <div className="flex flex-col gap-3" data-testid="confidence-page">
      {vote ? (
        <>
          <p className="font-body text-[15px] font-semibold">{PE.chairVote(PE.reasons[vote.trigger])}</p>
          <ul role="radiogroup" aria-label={C.voteOnChair} data-testid="confidence-ballot">
            {(['confidence', 'noConfidence'] as const).map((c) => (
              <BallotChoice
                key={c}
                choiceKey={c}
                testId="confidence-row"
                name={c === 'confidence' ? PE.confidence(v.chair?.name ?? '') : PE.noConfidence}
                selected={pick === c}
                yours={vote.yourVote === c}
                onSelect={vote.canVote.ok && !vote.yourVote ? () => setPick(c) : undefined}
              />
            ))}
          </ul>
          {vote.canVote.ok && !vote.yourVote ? (
            <StickyBar testId="confidence-cta">
              <span className="font-mono text-[11px] text-muted">{PE.chairVoteNote(formatAt(dayStart(vote.countDay)).replace(/^at /, ''))}</span>
              <Button
                variant="primary"
                disabled={!pick}
                pending={act.pending === 'vote'}
                onClick={() => pick && void act.run('vote', (k) => trpcClient.confidence.vote.mutate({ voteId: vote.voteId, choice: pick, idempotencyKey: k }))}
                data-testid="confidence-cast"
              >
                {PE.cast}
              </Button>
            </StickyBar>
          ) : (
            <span className="font-mono text-[12px] text-muted">{vote.yourVote ? 'Vote cast' : gateWords(vote.canVote.why)}</span>
          )}
        </>
      ) : p && p.status === 'open' ? (
        <>
          <SignatureBar count={p.count} needed={p.needed} text={PE.chairCount(p.count, p.needed, formatUntil(p.until))} />
          <p className="font-mono text-[12px]">{PE.chairNote}</p>
          <ul>
            {p.signers.map((s) => (
              <li key={s.name} className="font-body text-[14px]">
                {s.name}
              </li>
            ))}
          </ul>
          {p.you === 'sign' ? (
            <Button variant="primary" pending={act.pending === 'sign'} onClick={() => void act.run('sign', (k) => trpcClient.confidence.sign.mutate({ idempotencyKey: k }))} data-testid="confidence-sign">
              {PE.sign}
            </Button>
          ) : p.you === 'signed' ? (
            <span className="font-mono text-[12px] text-petrol">{PE.signed}</span>
          ) : null}
        </>
      ) : (
        <>
          {v.last && (
            <p className="font-mono text-[12px]" data-testid="confidence-last">
              {v.last.removed ? 'The Chair was removed' : 'The Chair kept the branch'} · {v.last.confidence}–{v.last.noConfidence}
            </p>
          )}
          <p className="font-mono text-[12px]">{PE.chairNote}</p>
          {v.canOpen.ok ? (
            <Button variant="outline" pending={act.pending === 'open'} onClick={() => void act.run('open', (k) => trpcClient.confidence.openPetition.mutate({ idempotencyKey: k }))} data-testid="confidence-open">
              {PE.chairPetition}
            </Button>
          ) : (
            v.canOpen.why && <span className="font-mono text-[12px] text-muted">{gateWords(v.canOpen.why)}</span>
          )}
        </>
      )}
      <Notice error={act.error} />
      <Link to="/faction" search={{ tab: 'chair' }} className={linkClass}>
        {C.theChairsPage}
      </Link>
    </div>
  );
}
