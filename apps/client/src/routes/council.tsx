import { copy } from '@irongate/content/copy';
import type { CapitalCountView, ElectionView, FactionId, HallView } from '@irongate/rules';
import {
  Button,
  CouncilRowList,
  DistrictResultTable,
  DistrictSwitcher,
  HallHeader,
  HowElectionsWork,
  OrdinanceRow,
  PaperSheet,
  Plate,
  ResultModal,
  RuleResultList,
  Slate,
  cx,
  formatAt,
  formatUntil,
  formatWeekday,
  weekdayOf,
  whoseLine,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { noticeFor } from '../features/game/errors';
import { useCharacter } from '../features/game/hooks';
import { TownHall } from '../features/council/TownHall';
import { trpcClient, trpc } from '../lib/trpc';
import { useNightTurn } from '../lib/useNightTurn';

/** Every council screen's query (the hall header rides on each): read again at dusk and dawn. */
const COUNCIL_KEYS = [trpc.council.pathKey()];

/**
 * Slice 4: the capital's election views name the district after the city ("Irongate · Eastside"):
 * the council is the city's, the place is the district.
 */
function placeOf(cityName: string): { city: string; district: string | null } {
  const [city, district] = cityName.split(' · ');
  return { city: city ?? cityName, district: district ?? null };
}

/** "Irongate Council · Eastside · Voting", "Coalport Council · Voting". */
function kickerOf(cityName: string, what?: string): string {
  const { city, district } = placeOf(cityName);
  return [`${city} Council`, ...(district ? [district] : []), ...(what ? [what] : [])].join(' · ');
}

/**
 * Slice 3's council screens (docs/design/slice-3-screens.md §3–§6, in review 2's plain words): who's
 * standing, the vote, the result and the council, in the paper's 640 px column. Every act is one tap
 * and one modal that ends with what comes next. The routes keep their slice-3 paths.
 */

/**
 * Review 3 (GDD §15.3, answers §6.1): an election screen stands on the council's hall, a crop of the
 * city picture by day or night (the map's rule, on the server's clock), edge to edge on a phone.
 */
function Page({
  children,
  hall,
  shortHall = false,
}: {
  children: ReactNode;
  hall?: { hall: HallView | null; cityName: string };
  /** QA slice 4 m6: the ballot keeps the hall to a thin band on a short screen, so a name shows above the CTA. */
  shortHall?: boolean;
}) {
  // Review 5 (ADR 0079): the hall's art is the server's night; at dusk and dawn the screens read again.
  useNightTurn(hall?.hall?.night, COUNCIL_KEYS);
  return (
    <PaperSheet>
    <div className="paper-grain min-h-full text-ink">
      <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-4 pt-4 pb-8 sm:pt-4 lg:pb-[132px]">
        {hall?.hall && (
          <HallHeader
            hall={hall.hall}
            cityName={placeOf(hall.cityName).city}
            night={hall.hall.night.night}
            className={cx(
              '-mx-4 -mt-4 -mb-3 sm:mx-0 sm:mt-0',
              shortHall &&
                '[@media(max-height:700px)]:h-[64px] [@media(max-height:660px)]:hidden [@media(max-height:960px)]:sm:h-[96px]',
            )}
          />
        )}
        {children}
      </div>
    </div>
    </PaperSheet>
  );
}

/** Review 3 (answers §6.4): the visible *How elections work* link, with the faction's rank titles. */
function ElectionsLink({ cityName }: { cityName: string }) {
  const { character } = useCharacter();
  const ladder = character?.rank.ladder ?? [];
  return (
    <HowElectionsWork
      cityName={placeOf(cityName).city}
      rank2={ladder[1] ?? ''}
      rank3={ladder[2] ?? ''}
      capital={!!character?.residence?.districtId}
    />
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
// The slate (screens §3; the voting rework, tech design §9.6).
// ---------------------------------------------------------------------------------------------

/**
 * The voting rework, phase 2: the stand card from `ElectionView.stand`, standing with the branch's
 * default rule. TODO(phase 3): `StandCard` with *Your rule · Change ›* and the rule picker (§9.6).
 */
function DeclareCard({
  e,
  onDeclare,
  pending,
}: {
  e: ElectionView;
  onDeclare: (ordinanceId: string) => void;
  pending: boolean;
}) {
  const d = e.stand!;
  const rank = d.requirements.find((r) => r.id === 'rank')!;
  const known = d.requirements.find((r) => r.id === 'known')!;
  const tick = (met: boolean) => (met ? '✓' : '✗');
  const eligible = rank.met && known.met;
  const rule = d.menu.find((o) => o.ordinanceId === d.defaultRule);
  return (
    <section
      aria-label={copy.stand.kicker}
      className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3"
      data-testid="declare-card"
    >
      <h2 className="label-caps text-[11px] font-semibold">{copy.stand.kicker}</h2>
      <ul className="flex flex-col gap-0.5 font-mono text-[12px]">
        <li>
          {tick(rank.met)} Rank 3, {rank.rankTitle}
          {!rank.met && rank.fxpToGo ? ` · ${rank.fxpToGo.toLocaleString('en-GB')} Party XP to go` : ''}
        </li>
        <li>
          {tick(known.met)} Known in {e.cityName} ({known.successes} wins)
        </li>
      </ul>
      <p className="font-mono text-[12px] text-text-2" data-testid="seat-gives">
        {copy.stand.gives}
      </p>
      {eligible && (
        <>
          {rule && (
            <p className="font-body text-[14px]" data-testid="stand-rule">
              {copy.stand.yourRule}: <strong className="font-semibold">{rule.name}</strong>
            </p>
          )}
          <Button
            onClick={() => onDeclare(d.defaultRule)}
            pending={pending}
            disabled={!d.canStand}
            className="w-full"
          >
            {d.reason === 'NOT_ENOUGH_PC' ? copy.needsPc(d.cost) : copy.declare(d.cost)}
          </Button>
          <p className="font-mono text-[11px] text-muted">{copy.stand.costs}</p>
        </>
      )}
    </section>
  );
}

/** After standing: *You're standing · your rule: … · 1 backer*, and the branch's line. */
function CandidacyCard({ e }: { e: ElectionView }) {
  const c = e.candidacy!;
  return (
    <section
      aria-label="You're standing"
      className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3"
      data-testid="candidacy-card"
    >
      <p className="font-body text-[15px]" data-testid="candidacy-endorsements">
        {copy.stand.standing(c.rule.name, c.backers.n)}
      </p>
      {c.branchLine && <p className="font-mono text-[12px] text-petrol">{copy.branchEndorsesYou}</p>}
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
      <Page hall={{ hall: e.hall, cityName: e.cityName }}>
        <Plate kicker={kickerOf(e.cityName, 'Voting')} title="Who's standing">
          <span className="font-mono text-[12px] text-dim">{copy.tooLateToStand}</span>
        </Plate>
        <ElectionsLink cityName={e.cityName} />
        <LastResultLink />
        {e.candidacy && <CandidacyCard e={e} />}
        <Slate candidates={e.candidates} mode="slate" />
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
    <Page hall={{ hall: e.hall, cityName: e.cityName }}>
      <Plate kicker={copy.stand.plateKicker(placeOf(e.cityName).city)} title={copy.stand.title}>
        <span className="font-mono text-[12px] text-dim">
          {copy.stand.plateLine(e.seats, formatWeekday(e.countAt), formatUntil(e.nominationsCloseAt))}
        </span>
      </Plate>
      <p className="font-mono text-[11.5px] text-muted" data-testid="how-decided">
        {placeOf(e.cityName).district
          ? copy.capitalElection.howSeatsAreWon
          : copy.seats.sentence(placeOf(e.cityName).city, e.seats)}
      </p>
      <ElectionsLink cityName={e.cityName} />
      <LastResultLink />
      {e.candidacy ? (
        <CandidacyCard e={e} />
      ) : e.stand ? (
        <DeclareCard
          e={e}
          pending={act.pending === 'declare'}
          onDeclare={(ordinanceId) =>
            void act.run('declare', (k) => trpcClient.council.declare.mutate({ ordinanceId, idempotencyKey: k }))
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
      {endorsedName && e.backed && (
        <p className="font-mono text-[12px] text-petrol" role="status">
          {copy.youEndorsed(e.backed.name, 10)}
        </p>
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The ballot (the voting rework, tech design §9.3): which rule for next week.
// ---------------------------------------------------------------------------------------------

/**
 * The voting rework, phase 2: the rule ballot's cards as plain radio rows, then *Vote for {rule}*.
 * TODO(phase 3): `BallotPage` with `RuleCards`, *Who's standing ›*, *How the vote works* and the
 * above-the-fold layout (tech design §9.3). TODO(phase 4): the capital's line and order (§9.8).
 */
export function BallotPage() {
  const q = useQuery(trpc.council.ballot.queryOptions());
  // The hall header rides on the election view (the ballot view carries no hall).
  const eq = useQuery(trpc.council.election.queryOptions());
  const act = usePoliticalAct();
  const [selected, setSelected] = useState<string | null>(null);
  const closed = !!q.data && q.data.status !== 'set';
  // Review 2 #6: a voter coming back to the ballot after the polls found no word of the result.
  const count = useQuery({ ...trpc.council.count.queryOptions(), enabled: closed });
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the ballot…" />;
  const b = q.data;
  const hall = { hall: eq.data?.hall ?? null, cityName: b.cityName };
  const names: Partial<Record<FactionId, string>> = {};
  if (closed) {
    return (
      <Page hall={hall}>
        <Plate kicker={copy.ballot.kicker(b.cityName)} title={copy.ballot.title}>
          <span className="font-mono text-[12px] text-dim">
            {copy.ballot.votesFrom(b.placeName, formatWeekday(b.pollsOpenAt))}
          </span>
        </Plate>
        <div className="flex flex-col" data-testid="ballot-cards">
          {b.cards.map((c) => (
            <OrdinanceRow
              key={c.ordinanceId}
              name={c.name}
              line={c.plainLine}
              effectLine={c.effectLine}
              note={whoseLine(c, names)}
            />
          ))}
        </div>
        <p className="font-mono text-[12px] text-muted">{copy.hall.ballotSetAt(formatUntil(b.setAt))}</p>
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
  const cast = b.myVote;
  const choosing = !cast && b.canVote;
  const chosen = b.cards.find((c) => c.ordinanceId === selected);
  return (
    <Page hall={hall} shortHall>
      <Plate kicker={copy.ballot.kicker(b.cityName)} title={copy.ballot.title}>
        <span className="font-mono text-[12px] text-dim" data-testid="ballot-line">
          {copy.ballot.line(formatUntil(b.countAt), formatWeekday(b.countAt))}
        </span>
      </Plate>
      <div className="flex flex-col" role={choosing ? 'radiogroup' : undefined} data-testid="ballot-cards">
        {b.cards.map((c) => (
          <OrdinanceRow
            key={c.ordinanceId}
            name={c.name}
            line={c.plainLine}
            effectLine={c.effectLine}
            note={whoseLine(c, names)}
            right={choosing ? 'radio' : c.yourVote ? 'mine' : null}
            dimmed={!!cast && !c.yourVote}
            selected={selected === c.ordinanceId}
            onSelect={choosing ? () => setSelected(c.ordinanceId) : undefined}
            disabled={!!act.pending}
          />
        ))}
      </div>
      <Notice error={act.error} />
      <Link
        to="/council/slate"
        className="-my-2 inline-flex min-h-11 items-center self-start font-mono text-[12px] text-muted underline underline-offset-2"
        data-testid="ballot-whos-standing"
      >
        {copy.ballot.whoIsStanding(b.standing.players, b.standing.locals, b.standing.seats)} ›
      </Link>
      <LastResultLink />
      <Sticky>
        {cast ? (
          <p className="py-2 text-center font-mono text-[12px]" data-testid="ballot-cast-line">
            {copy.ballot.cast(formatWeekday(b.countAt))}
          </p>
        ) : (
          <>
            <Button
              className="w-full"
              disabled={!chosen || !b.canVote}
              pending={act.pending === 'vote'}
              onClick={() =>
                chosen &&
                void act.run('vote', (k) =>
                  trpcClient.council.vote.mutate({ ordinanceId: chosen.ordinanceId, idempotencyKey: k }),
                )
              }
            >
              {chosen ? copy.ballot.voteFor(chosen.name) : copy.ballot.chooseARule}
            </Button>
            <p className="text-center font-mono text-[11px] text-muted">{copy.ballot.caption(formatAt(b.countAt))}</p>
          </>
        )}
      </Sticky>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The count (the voting rework, tech design §9.4): the rule decided, then the council.
// ---------------------------------------------------------------------------------------------

export function CountPage() {
  const { character } = useCharacter();
  // Slice 4 (screens §8): a capital resident's result is the capital's five districts.
  const capital = !!character?.residence?.districtId;
  const q = useQuery({ ...trpc.council.count.queryOptions(), enabled: !!character && !capital });
  const cq = useQuery({ ...trpc.council.capitalCount.queryOptions(), enabled: capital });
  if (capital) return cq.isError ? <LoadError retry={() => void cq.refetch()} /> : <CapitalCount view={cq.data} pending={cq.isPending} />;
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
    <Page hall={{ hall: c.hall, cityName: c.cityName }}>
      <Plate kicker={copy.ruleResult.kicker(c.cityName)} title={copy.ruleResult.title(c.weekday)}>
        <span className="font-mono text-[12px] text-dim" data-testid="count-header">
          {copy.ruleResult.turnout(c.turnout.voters, c.turnout.eligible)}
        </span>
      </Plate>
      {/* TODO(phase 3): `RuleCards` in result mode and `CouncilRows` with the popover (tech design §9.4). */}
      <RuleResultList rule={c.rule} />
      <CouncilRowList rows={c.council} factionId={character?.factionId ?? 'collective'} />
      <ElectionsLink cityName={c.cityName} />
    </Page>
  );
}

/**
 * Slice 4 (screens §8): the capital's result at `/council/count?d=`: the plate with the ten seats by
 * party, the district switcher (your district first), and the selected district's two tables.
 */
function CapitalCount({ view, pending }: { view: CapitalCountView | null | undefined; pending: boolean }) {
  const { d } = useSearch({ from: '/app/council/count' });
  const navigate = useNavigate();
  const { character } = useCharacter();
  if (pending) return <Loading what="Fetching the result…" />;
  if (!view) {
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
  const names: Partial<Record<FactionId, string>> =
    character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {});
  const selected = view.districts.find((x) => x.districtId === d) ?? view.districts[0]!;
  const parts = (Object.entries(view.seatsByFaction) as Array<[FactionId, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `${names[f] ?? f} ${n}`);
  return (
    <Page hall={{ hall: view.hall ?? null, cityName: 'Irongate' }}>
      <Plate kicker={copy.capitalElection.resultKicker} title={copy.capitalElection.resultSundays(weekdayOf(view.countDay))}>
        <span className="font-mono text-[12px] text-dim" data-testid="capital-count-header">
          {copy.capitalElection.resultLine(parts, view.npcSeats)}
        </span>
      </Plate>
      <DistrictSwitcher
        districts={view.districts.map((x) => ({ districtId: x.districtId, name: x.name }))}
        selected={selected.districtId}
        onSelect={(id) => void navigate({ to: '/council/count', search: { d: id }, replace: true })}
      />
      {/* TODO(phase 4): the cards with seats and the district's party rows (tech design §9.8). */}
      <RuleResultList rule={view.rule} names={names} />
      <DistrictResultTable district={selected} names={names} />
      <ElectionsLink cityName="Irongate" />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The chamber (screens §6).
// ---------------------------------------------------------------------------------------------

/**
 * Review 4 (answers §11.2, ADR 0077): `/council` opens the Town Hall's blocks for the residence's city
 * on the paper ground, the same state as the hall's place sheet: *What now* once, the rule in force,
 * next week's rule (the vote; a councillor's rule), the seats as rows, the stand block and the
 * week's Issues (the voting rework, tech design §9.5).
 */
export function CouncilPage() {
  const { character } = useCharacter();
  const navigate = useNavigate();
  const cityId = character?.residence?.cityId ?? character?.homeCityId ?? '';
  const q = useQuery({ ...trpc.council.hall.queryOptions({ cityId }), enabled: !!cityId });
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data || !character) return <Loading what="Opening the chamber…" />;
  const h = q.data;
  const names: Partial<Record<FactionId, string>> =
    character.factionNames ?? { [character.factionId]: character.factionName };
  const npcSeats = h.seats.filter((s) => s.kind === 'npc').length;
  return (
    <Page hall={{ hall: h.hall, cityName: h.cityName }}>
      <Plate kicker={copy.councilSittingAt(h.cityName, h.hall.ref)} title="The council">
        <span className="font-mono text-[12px] text-dim" data-testid="council-header">
          {copy.npcSeats(npcSeats, h.seatCount)}
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
      <TownHall
        cityId={cityId}
        names={names}
        factionId={character.factionId}
        onWhereToAct={() => void navigate({ to: '/city/$cityId', params: { cityId }, search: { places: true } })}
      />
    </Page>
  );
}
