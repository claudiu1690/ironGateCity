import { copy } from '@irongate/content/copy';
import { TERM_DAYS, dayKey, dayStart, termOf } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import {
  BallotChoice,
  BottomSheet,
  Button,
  HelpButton,
  NationHeader,
  NationalBallot,
  PledgeChips,
  PowerCard,
  ResultModal,
  ScoreTable,
  SectionKicker,
  StickyBar,
  Tick,
  clockNow,
  dayWeekday,
  formatAt,
  formatUntil,
  helpMark,
  nameOf,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useCharacter } from '../features/game/hooks';
import { LoadError, Loading, NationFrame, Notice, gateWords, useFactionNames, useNationArt } from '../features/nation/frame';
import { useNationAct } from '../features/nation/useNationAct';
import { trpc, trpcClient } from '../lib/trpc';

const E = copy.nation.election;
const linkClass = 'inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2';

/** The boundary into a day (the window closes at its midnight, in the player's clock). */
const untilDay = (d: number) => formatUntil(dayStart(d));

// ---------------------------------------------------------------------------------------------
// The party's pick (screens §7.2): `/election/pick` and `/election/pick/vote`.
// ---------------------------------------------------------------------------------------------

export function PickPage({ vote = false }: { vote?: boolean }) {
  const q = useQuery(trpc.nation.pick.queryOptions());
  const art = useNationArt();
  const names = useFactionNames();
  const act = useNationAct();
  const [pick, setPick] = useState<string | null>(null);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the party's pick…" />;
  const p = q.data;
  const faction = nameOf(names, p.factionId);
  const ballot = p.ballot ?? [];
  const players = ballot.filter((b) => b.kind === 'player');
  const figure = ballot.find((b) => b.kind === 'npc');
  // `voted`: the pick is a vote (a player stands); the caller's own vote is `yourVote`.
  const canVote = p.canVote.ok && !p.yourVote;
  const chosen = ballot.find((b) => b.key === pick) ?? null;
  const row = (b: (typeof ballot)[number]) => (
    <BallotChoice
      key={b.key}
      choiceKey={b.key}
      testId="pick-row"
      name={b.name}
      selected={pick === b.key}
      onSelect={canVote && vote ? () => setPick(b.key) : undefined}
      yours={p.yourVote?.name === b.name}
      lines={
        <>
          <span className="font-mono text-[11px] text-muted">{b.kind === 'npc' ? E.ownCandidateTag(faction) : E.rank6}</span>
          <PledgeChips pledges={b.pledges} />
        </>
      }
    />
  );
  return (
    <NationFrame
      header={
        <NationHeader
          asset={art?.ballot}
          kicker={E.pickKicker(faction, p.pickName)}
          title={E.thePick}
          line={E.pickNote(untilDay(termOf(dayKey(clockNow())).fromDay + TERM_DAYS.nation.votesFrom))}
          testId="pick-header"
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="pick-page" data-status={p.status ?? 'none'}>
        <HelpButton notes={[copy.nation.help.pick(), copy.nation.help.ownCandidate()]} label={E.thePick} className="self-start">
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>How this election works</span>
        </HelpButton>
        {p.result && (
          <PowerCard kicker={E.thePick} testId="pick-result">
            <p className="font-body text-[15px] font-semibold">{E.carries(p.result.winner, faction)}</p>
            <ul>
              {p.result.rows.map((r) => (
                <li key={r.key} className="font-mono text-[12px]">
                  {r.place}. {r.name} · {r.votes} {r.votes === 1 ? 'vote' : 'votes'}
                </li>
              ))}
            </ul>
          </PowerCard>
        )}
        {ballot.length > 0 && (
          <ul className="flex flex-col" role={vote && canVote ? 'radiogroup' : undefined} aria-label={E.thePick}>
            {players.length > 0 && <SectionKicker>Players standing</SectionKicker>}
            {players.map(row)}
            {figure && (
              <>
                <SectionKicker>{E.ownCandidate}</SectionKicker>
                {row(figure)}
                <li className="py-1 font-mono text-[11.5px] text-muted">{E.figureNote}</li>
              </>
            )}
          </ul>
        )}
        <Notice error={act.error} />
        {!vote && canVote && (
          <Link to="/election/pick/vote" className="label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper" data-testid="pick-vote-now">
            {copy.election.voteNow}
          </Link>
        )}
        {!canVote && !p.yourVote && p.canVote.why && (
          <p className="font-mono text-[12px] text-muted">{gateWords(p.canVote.why)}</p>
        )}
        <Link to="/election/national" className={linkClass}>
          {E.whoStands}
        </Link>
        {vote && canVote && (
          <StickyBar testId="pick-cta">
            <Button
              variant="primary"
              disabled={!chosen}
              pending={act.pending === 'pick'}
              onClick={() => chosen && void act.run('pick', (k) => trpcClient.nation.pickVote.mutate({ key: chosen.key, idempotencyKey: k }))}
              data-testid="pick-choose"
            >
              {chosen ? E.choose(chosen.name) : E.thePick}
            </Button>
          </StickyBar>
        )}
      </div>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// The republic's candidates and the party's list (screens §7.3): `/election/national`.
// ---------------------------------------------------------------------------------------------

export function NationalPage({ vote = false }: { vote?: boolean }) {
  const q = useQuery(trpc.nation.election.queryOptions());
  const art = useNationArt();
  const names = useFactionNames();
  const { character } = useCharacter();
  const act = useNationAct();
  const [pick, setPick] = useState<FactionId | null>(null);
  const [pledging, setPledging] = useState(false);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the candidates…" />;
  const e = q.data;
  const mine = character?.factionId;
  const faction = mine ? nameOf(names, mine) : '';
  const canVote = e.canVote.ok && !e.yourVote;
  const chosen = e.candidates?.find((c) => c.factionId === pick) ?? null;
  const voteAt = formatAt(dayStart(e.days.countDay)).replace(/^at /, '');
  return (
    <NationFrame
      header={
        <NationHeader
          asset={art?.ballot}
          kicker={E.republicKicker}
          title={E.whoStands}
          line={E.threeCandidates(dayWeekday(e.days.votesFrom), untilDay(e.days.countDay))}
          testId="national-header"
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="national-page" data-phase={e.phase} data-status={e.status ?? 'none'}>
        <HelpButton notes={[copy.nation.help.whoHolds(), copy.nation.help.ownCandidate(), copy.nation.help.term()]} label={E.whoStands} className="self-start">
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>How this election works</span>
        </HelpButton>
        {e.candidates ? (
          <NationalBallot
            candidates={e.candidates}
            names={names}
            selected={vote && canVote ? pick : null}
            onSelect={vote && canVote ? setPick : undefined}
            yourVote={e.yourVote?.factionId ?? null}
            onBack={vote ? undefined : () => void act.run('backP', (k) => trpcClient.nation.back.mutate({ target: { kind: 'president' }, idempotencyKey: k }))}
            backPending={act.pending === 'backP'}
            backedName={e.yourBacking?.name ?? null}
          />
        ) : e.presidentCandidates.length > 0 ? (
          <ul className="flex flex-col" data-testid="president-candidates">
            {e.presidentCandidates.map((c) => (
              <BallotChoice
                key={c.candidacyId}
                name={c.name}
                selected={false}
                testId="president-candidate"
                lines={<PledgeChips pledges={c.pledges} />}
              />
            ))}
          </ul>
        ) : (
          <p className="font-mono text-[12px] text-muted">{copy.nation.empty.noPlayerStands}</p>
        )}
        {e.yourVote && <p className="font-mono text-[12px] text-petrol" data-testid="vote-cast">{E.voteCast(dayWeekday(e.days.countDay))}</p>}
        <p className="font-mono text-[11.5px] text-muted" data-testid="how-decided">
          {E.scoreNote}
        </p>
        {!vote && canVote && (
          <Link to="/election/national/vote" className="label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper" data-testid="national-vote-now">
            {copy.election.voteNow}
          </Link>
        )}
        {e.status === 'pick' && (
          <Link to="/election/pick" className={linkClass} data-testid="to-pick">
            {E.thePick}
          </Link>
        )}
        <Notice error={act.error} />
        {!vote && (
          <>
            <section aria-labelledby="the-list" className="flex flex-col gap-1" data-testid="list-panel">
              <SectionKicker id="the-list">{E.list(faction)}</SectionKicker>
              {e.list.length === 0 ? (
                <p className="font-mono text-[12px] text-muted">{copy.nation.empty.nobodyOnList}</p>
              ) : (
                <ul>
                  {e.list.map((l) => (
                    <BallotChoice
                      key={l.candidacyId}
                      name={`${l.place}. ${l.name}`}
                      selected={false}
                      testId="list-row"
                      lines={<span className="font-mono text-[11px] text-muted">{l.place === 1 ? copy.nation.parliament.firstOnList : `${l.backers} backers`}</span>}
                      aside={
                        l.canBack ? (
                          <Button
                            variant="outline"
                            className="px-2 text-[11px]"
                            pending={act.pending === `backL:${l.candidacyId}`}
                            onClick={() =>
                              void act.run(`backL:${l.candidacyId}`, (k) =>
                                trpcClient.nation.back.mutate({ target: { kind: 'list', candidacyId: l.candidacyId }, idempotencyKey: k }),
                              )
                            }
                            data-testid="back-list"
                          >
                            {E.back}
                          </Button>
                        ) : e.yourBacking?.name === l.name ? (
                          <span className="font-mono text-[11px] text-petrol">{E.backed}</span>
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              <p className="font-mono text-[11px] text-muted">{E.thenLocals}</p>
              <p className="font-mono text-[11.5px] text-muted">{E.listNote}</p>
            </section>
            {e.stand && !e.stand.president.standing && (
              <PowerCard kicker="Stand" testId="national-stand">
                <ul>
                  <Tick ok={e.stand.list.ok || e.stand.list.standing}>{E.listRung}</Tick>
                </ul>
                {e.stand.list.standing ? (
                  <span className="font-mono text-[12px] text-petrol" data-testid="standing-list">On the list</span>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!e.stand.list.ok}
                    pending={act.pending === 'standList'}
                    onClick={() => void act.run('standList', (k) => trpcClient.nation.standList.mutate({ idempotencyKey: k }))}
                    data-testid="stand-list"
                  >
                    {E.standList}
                  </Button>
                )}
                {!e.stand.list.ok && !e.stand.list.standing && <span className="font-mono text-[11px] text-muted">{gateWords(e.stand.list.why)}</span>}
                {e.stand.president.standing ? null : (
                  <Button
                    variant="outline"
                    disabled={!e.stand.president.ok}
                    onClick={() => setPledging(true)}
                    data-testid="stand-president"
                  >
                    {E.standPresident}
                  </Button>
                )}
                {!e.stand.president.ok && !e.stand.president.standing && (
                  <span className="font-mono text-[11px] text-muted">{gateWords(e.stand.president.why)}</span>
                )}
              </PowerCard>
            )}
          </>
        )}
        {e.stand?.president.standing && (
          <p className="font-mono text-[12px] text-petrol" data-testid="standing-president">
            Standing for President
          </p>
        )}
        <Link to="/parliament" className={linkClass}>
          {copy.nation.bar.parliament}
        </Link>
        {vote && canVote && (
          <StickyBar testId="national-cta">
            <span className="font-mono text-[11px] text-muted">{E.oneVote(voteAt)}</span>
            <Button
              variant="primary"
              disabled={!chosen}
              pending={act.pending === 'vote'}
              onClick={() => chosen && void act.run('vote', (k) => trpcClient.nation.vote.mutate({ factionId: chosen.factionId, idempotencyKey: k }))}
              data-testid="national-vote"
            >
              {chosen ? `Vote for ${chosen.name}` : copy.election.voteNow}
            </Button>
          </StickyBar>
        )}
      </div>
      <PledgeSheet
        open={pledging}
        onOpenChange={setPledging}
        platforms={e.stand?.president.platforms ?? []}
        pending={act.pending === 'standPresident'}
        onStand={(pledges, platformId) =>
          void act
            .run('standPresident', (k) => trpcClient.nation.standPresident.mutate({ pledges, platformId, idempotencyKey: k }))
            .then(() => setPledging(false))
        }
      />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

/** Two pledges of thirteen and the platform line (screens §7.3: a sheet of law rows with ticks). */
function PledgeSheet({
  open,
  onOpenChange,
  platforms,
  onStand,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  platforms: Array<{ id: string; line: string }>;
  onStand: (pledges: [string, string], platformId: string) => void;
  pending: boolean;
}) {
  const laws = useQuery({ ...trpc.parliament.laws.queryOptions(), enabled: open });
  const [picked, setPicked] = useState<string[]>([]);
  const [platform, setPlatform] = useState<string | null>(null);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1]!, id]));
  const platformId = platform ?? platforms[0]?.id ?? null;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={E.twoPledges}>
      <div className="flex flex-col gap-2" data-testid="pledge-sheet">
        <ul>
          {(laws.data?.catalogue ?? []).map((l) => {
            const on = picked.includes(l.lawId);
            return (
              <li key={l.lawId}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(l.lawId)}
                  className="flex min-h-11 w-full cursor-pointer items-start gap-2 border-b border-dotted border-faint py-1.5 text-left"
                  data-testid="pledge-option"
                  data-law-id={l.lawId}
                >
                  <span aria-hidden className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border-[1.5px] border-ink">
                    {on ? '✓' : ''}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-body text-[14px] font-semibold">{l.name}</span>
                    <span className="font-body text-[12.5px] text-text-2 italic">{l.line}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {platforms.length > 0 && (
          <fieldset className="flex flex-col gap-1">
            <legend className="label-caps text-[11px]">Your line</legend>
            {platforms.map((p) => (
              <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2 font-body text-[13px]">
                <input type="radio" name="platform" className="size-5 accent-ink" checked={platformId === p.id} onChange={() => setPlatform(p.id)} />
                {p.line}
              </label>
            ))}
          </fieldset>
        )}
        <Button
          variant="primary"
          disabled={picked.length !== 2 || !platformId}
          pending={pending}
          onClick={() => platformId && picked.length === 2 && onStand([picked[0]!, picked[1]!], platformId)}
          data-testid="pledge-stand"
        >
          {E.standPresident}
        </Button>
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------------------------
// The republic's result (screens §7.4): `/election/national/result`.
// ---------------------------------------------------------------------------------------------

export function NationalResultPage() {
  const q = useQuery(trpc.nation.result.queryOptions());
  const art = useNationArt();
  const names = useFactionNames();
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (q.isPending) return <Loading what="Fetching the result…" />;
  const r = q.data;
  return (
    <NationFrame
      header={
        <NationHeader
          asset={art?.result}
          kicker={E.resultKicker}
          title={r ? r.president.name : E.resultKicker}
          line={r ? (r.stamp === 'toBeConfirmed' ? E.finalTomorrow : E.turnout(r.turnout.voters, r.turnout.eligible)) : undefined}
          stamp={r ? (r.stamp === 'toBeConfirmed' ? { label: E.toBeConfirmed, tone: 'partial' } : { label: E.final, tone: 'success' }) : null}
          testId="result-header"
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="national-result" data-stamp={r?.stamp ?? 'none'}>
        {!r ? (
          <p className="font-mono text-[12px] text-muted">No result yet this term. The republic votes from day 23.</p>
        ) : (
          <>
            <ScoreTable result={r} names={names} />
            <p className="font-mono text-[11.5px] text-muted">{E.resultNote}</p>
            <p className="font-mono text-[12px]" data-testid="result-turnout">
              {E.turnout(r.turnout.voters, r.turnout.eligible)}
            </p>
            {(['vanguard', 'collective', 'alliance'] as const).map((f) => (
              <section key={f} className="flex flex-col" data-testid="result-list">
                <SectionKicker>{E.list(nameOf(names, f))}</SectionKicker>
                <p className="font-mono text-[12px]">
                  {(r.lists[f] ?? [])
                    .filter((l) => l.seated)
                    .map((l) => l.name)
                    .join(' · ') || E.thenLocals}
                </p>
              </section>
            ))}
          </>
        )}
        <div className="flex gap-2">
          <Link to="/parliament" className="label-caps inline-flex min-h-11 flex-1 items-center justify-center bg-ink px-3 text-[12px] text-paper">
            {copy.nation.bar.parliament}
          </Link>
          <Link to="/office/president" className="label-caps inline-flex min-h-11 flex-1 items-center justify-center border-[1.5px] border-ink px-3 text-[12px]">
            {E.presidentsPage}
          </Link>
        </div>
      </div>
    </NationFrame>
  );
}
