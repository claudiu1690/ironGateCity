import { copy } from '@irongate/content/copy';
import { COUNCIL, dayStart } from '@irongate/rules';
import type { CapitalCountView, FactionId, HallView } from '@irongate/rules';
import {
  Button,
  CouncilRows,
  DistrictResultTable,
  DistrictSwitcher,
  HallHeader,
  HowTheVoteWorks,
  PaperSheet,
  Plate,
  ResultModal,
  RuleCards,
  Slate,
  StandCard,
  cx,
  formatAt,
  formatUntil,
  formatWeekday,
  ruleWinnerLines,
  weekdayOf,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { useRuleVote } from '../features/council/useRuleVote';
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
  wide = false,
}: {
  children: ReactNode;
  hall?: { hall: HallView | null; cityName: string };
  /** QA slice 4 m6: the ballot keeps the hall to a thin band on a short screen, so a name shows above the CTA. */
  shortHall?: boolean;
  /** The ballot (design §4.2): a 720 px sheet from 960 px, the three cards in one row. */
  wide?: boolean;
}) {
  // Review 5 (ADR 0079): the hall's art is the server's night; at dusk and dawn the screens read again.
  useNightTurn(hall?.hall?.night, COUNCIL_KEYS);
  return (
    <PaperSheet>
    <div className="paper-grain min-h-full text-ink">
      <div
        className={cx(
          'mx-auto flex max-w-[640px] flex-col gap-3 px-4 pt-4 pb-8 sm:pt-4 lg:pb-[132px]',
          wide && 'min-[960px]:max-w-[720px]',
        )}
      >
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

/**
 * The voting rework (design §4.9): the visible *How the vote works* link, with the faction's rank
 * titles and the city's voting days.
 */
function VoteLink({ cityName, from, to }: { cityName: string; from: string; to: string }) {
  const { character } = useCharacter();
  const ladder = character?.rank.ladder ?? [];
  return (
    <HowTheVoteWorks
      cityName={placeOf(cityName).city}
      rank2={ladder[1] ?? ''}
      rank3={ladder[2] ?? ''}
      fromWeekday={from}
      toWeekday={to}
      capital={!!character?.residence?.districtId}
    />
  );
}

/** The vote's days from a count day: cycle days 2–4 of the cycle the count opens. */
const HALF_DAY = 12 * 3_600_000;
const voteDaysAfter = (countDay: number) => ({
  from: formatWeekday(dayStart(countDay + 2) + HALF_DAY),
  to: formatWeekday(dayStart(countDay + 4) + HALF_DAY),
});

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
      {copy.ballot.lastResult(count.data.weekday)}
    </Link>
  );
}

// ---------------------------------------------------------------------------------------------
// Who's standing and the stand card (the voting rework, tech design §9.6; design §4.5).
// ---------------------------------------------------------------------------------------------

export function SlatePage() {
  const q = useQuery(trpc.council.election.queryOptions());
  const act = usePoliticalAct();
  const [endorsedName, setEndorsedName] = useState<string | null>(null);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the candidates…" />;
  const e = q.data;
  const { city, district } = placeOf(e.cityName);
  const polling = e.phase === 'polling';
  return (
    <Page hall={{ hall: e.hall, cityName: e.cityName }}>
      <Plate kicker={copy.stand.plateKicker(city)} title={copy.stand.title}>
        <span className="font-mono text-[12px] text-dim" data-testid="slate-line">
          {polling
            ? copy.tooLateToStand
            : copy.stand.plateLine(e.seats === 2 ? 2 : COUNCIL.seats, formatWeekday(e.countAt), formatUntil(e.nominationsCloseAt))}
        </span>
      </Plate>
      <p className="font-mono text-[11.5px] text-muted" data-testid="how-decided">
        {/* TODO(phase 4): the capital's sentence (design §4.5, §9.8). */}
        {district ? copy.capitalElection.howSeatsAreWon : copy.seats.sentence(city, COUNCIL.seats)}
      </p>
      <VoteLink cityName={e.cityName} from={formatWeekday(e.pollsOpenAt)} to={formatWeekday(e.countAt - 1)} />
      <LastResultLink />
      <StandCard
        stand={e.stand}
        cityName={city}
        candidacy={
          e.candidacy
            ? { rule: e.candidacy.rule.name, backers: e.candidacy.backers.n, branchLine: e.candidacy.branchLine }
            : null
        }
        pending={act.pending === 'declare'}
        onStand={(ordinanceId) =>
          void act.run('declare', (k) => trpcClient.council.declare.mutate({ ordinanceId, idempotencyKey: k }))
        }
      />
      <Notice error={act.error} />
      <Slate
        candidates={e.candidates}
        endorsingId={act.pending?.startsWith('endorse:') ? act.pending.slice(8) : null}
        onEndorse={(candidacyId) => {
          const name = e.candidates.find((c) => c.candidacyId === candidacyId)?.name ?? '';
          void act
            .run(`endorse:${candidacyId}`, (k) => trpcClient.council.endorse.mutate({ candidacyId, idempotencyKey: k }))
            .then(() => setEndorsedName(name));
        }}
      />
      {endorsedName && e.backed && (
        <p className="font-mono text-[12px] text-petrol" role="status">
          {copy.youEndorsed(e.backed.name, COUNCIL.cost.endorse)}
        </p>
      )}
      {polling && (
        <Link
          to="/council/ballot"
          className="label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper"
          data-testid="slate-to-ballot"
        >
          {copy.election.voteNow}
        </Link>
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The ballot (the voting rework, tech design §9.3; design §4.2): which rule for next week.
// ---------------------------------------------------------------------------------------------

/**
 * The three cards, one tap to choose and *Vote for {rule}* in the sticky bar; *Who's standing ›*,
 * *How the vote works* and the last result scroll under the cards. Days 0–1: the cards as they
 * stand, with when the ballot is set. TODO(phase 4): the capital's line and order (§9.8).
 */
export function BallotPage() {
  const q = useQuery(trpc.council.ballot.queryOptions());
  // The hall header rides on the election view (the ballot view carries no hall).
  const eq = useQuery(trpc.council.election.queryOptions());
  const act = usePoliticalAct();
  const vote = useRuleVote(act);
  const { character } = useCharacter();
  const closed = !!q.data && q.data.status !== 'set';
  // Review 2 #6: a voter coming back to the ballot after the polls found no word of the result.
  const count = useQuery({ ...trpc.council.count.queryOptions(), enabled: closed });
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the ballot…" />;
  const b = q.data;
  const hall = { hall: eq.data?.hall ?? null, cityName: b.cityName };
  const names: Partial<Record<FactionId, string>> =
    character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {});
  const city = placeOf(b.cityName).city;
  const link = <VoteLink cityName={b.cityName} from={formatWeekday(b.pollsOpenAt)} to={formatWeekday(b.countAt - 1)} />;
  const whosStanding = (
    <Link
      to="/council/slate"
      className="flex min-h-11 items-center justify-between gap-2 border-y border-dotted border-faint font-mono text-[12px]"
      data-testid="ballot-whos-standing"
    >
      <span>{copy.ballot.whoIsStanding(b.standing.players, b.standing.locals, b.standing.seats)}</span>
      <span className="font-label text-[18px]" aria-hidden="true">
        ›
      </span>
    </Link>
  );
  if (closed) {
    return (
      <Page hall={hall}>
        <Plate kicker={copy.ballot.kicker(city)} title={copy.ballot.title}>
          <span className="font-mono text-[12px] text-dim" data-testid="ballot-line">
            {copy.ballot.votesFrom(b.placeName, formatWeekday(b.pollsOpenAt))}
          </span>
        </Plate>
        <RuleCards cards={b.cards} mode="show" label={copy.ballot.title} names={names} layout="auto" />
        <p className="font-mono text-[12px] text-muted" data-testid="ballot-set-at">
          {copy.hall.ballotSetAt(formatUntil(b.setAt))}
        </p>
        {count.data && (
          <Link
            to="/council/count"
            className="label-caps inline-flex min-h-11 items-center justify-center bg-ink px-4 text-[13px] text-paper"
            data-testid="ballot-see-count"
          >
            {copy.seeTheResult}
          </Link>
        )}
        <Link
          to="/council/slate"
          className="label-caps inline-flex min-h-11 items-center justify-center border-[1.5px] border-ink px-4 text-[13px]"
        >
          {copy.seeWhosStanding}
        </Link>
        {link}
      </Page>
    );
  }
  const cast = b.myVote;
  const choosing = !cast && b.canVote;
  const chosen = b.cards.find((c) => c.ordinanceId === vote.selected);
  return (
    <Page hall={hall} shortHall wide>
      <Plate kicker={copy.ballot.kicker(city)} title={copy.ballot.title}>
        {/* A phone under 700 px tall keeps the third card's top edge above the CTA (design §4.2): the
            line folds away there, as the header does; the sticky caption says the same (secret,
            final, the result's time). */}
        <span
          className="font-mono text-[12px] leading-snug text-dim [@media(max-height:700px)]:hidden"
          data-testid="ballot-line"
        >
          {copy.ballot.line(formatUntil(b.countAt), formatWeekday(b.countAt))}
        </span>
      </Plate>
      <RuleCards
        cards={b.cards}
        mode={choosing || cast ? 'vote' : 'show'}
        label={copy.ballot.title}
        names={names}
        selected={vote.selected}
        onSelect={vote.select}
        disabled={!!act.pending}
        layout="auto"
      />
      <Notice error={act.error} />
      {whosStanding}
      {link}
      <LastResultLink />
      {(cast || choosing) && (
        <Sticky>
          {cast ? (
            <p className="py-2 text-center font-mono text-[12px]" data-testid="ballot-cast-line">
              {copy.ballot.cast(formatWeekday(b.countAt))}
            </p>
          ) : (
            <>
              <Button className="w-full" disabled={!chosen} pending={vote.pending} onClick={vote.vote}>
                {chosen ? copy.ballot.voteFor(chosen.name) : copy.ballot.chooseARule}
              </Button>
              <p className="text-center font-mono text-[11px] text-muted">{copy.ballot.caption(formatAt(b.countAt))}</p>
            </>
          )}
        </Sticky>
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </Page>
  );
}

// ---------------------------------------------------------------------------------------------
// The count (the voting rework, tech design §9.4; design §4.3): the rule decided, then the council.
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
  const names: Partial<Record<FactionId, string>> =
    character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {});
  const city = placeOf(c.cityName).city;
  const r = c.rule;
  const days = voteDaysAfter(c.countDay);
  return (
    <Page hall={{ hall: c.hall, cityName: c.cityName }}>
      <Plate kicker={copy.ruleResult.kicker(city)} title={copy.ruleResult.title(c.weekday)}>
        <span className="font-mono text-[12px] text-dim" data-testid="count-header">
          {copy.ruleResult.turnout(c.turnout.voters, c.turnout.eligible)}
        </span>
      </Plate>
      {r && (
        <RuleCards
          cards={r.cards}
          mode="result"
          label={copy.ruleResult.title(c.weekday)}
          names={names}
          winnerLines={ruleWinnerLines(r, names)}
        />
      )}
      <CouncilRows
        rows={c.council}
        factionId={character?.factionId ?? 'collective'}
        sentence={copy.seats.sentence(city, c.seats)}
      />
      <div className="flex flex-wrap items-center gap-x-5">
        <VoteLink cityName={c.cityName} from={days.from} to={days.to} />
        {c.hall && (
          <Link
            to="/council"
            className="inline-flex min-h-11 items-center font-mono text-[12px] underline underline-offset-2"
            data-testid="count-town-hall"
          >
            {c.hall.name}
          </Link>
        )}
      </div>
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
      {view.rule && (
        <RuleCards
          cards={view.rule.cards}
          mode="result"
          label={copy.ruleResult.title(view.rule.weekday)}
          names={names}
          winnerLines={ruleWinnerLines(view.rule, names)}
        />
      )}
      <DistrictResultTable district={selected} names={names} />
      <VoteLink cityName="Irongate" {...voteDaysAfter(view.countDay)} />
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
      <Plate kicker={copy.councilSittingAt(h.cityName, h.hall.ref)} title={copy.hall.council}>
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
