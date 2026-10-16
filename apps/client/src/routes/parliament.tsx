import { copy } from '@irongate/content/copy';
import { FACTION_IDS, TERM, TERM_DAYS, dayKey, termOf } from '@irongate/rules';
import type { BillPageView, CatalogueView, ChamberView, FactionId, LineVote } from '@irongate/rules';
import {
  BillCount,
  BillRow,
  BlocBar,
  BottomSheet,
  Button,
  FactionCrest,
  HelpButton,
  LawRow,
  LineChips,
  NationHeader,
  PowerCard,
  ResultModal,
  SectionKicker,
  StickyBar,
  billTag,
  billTitle,
  clockNow,
  dayDate,
  dayWeekday,
  formatAt,
  helpMark,
  lineWord,
  nameOf,
} from '@irongate/ui';
import type { FactionNames } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { LoadError, Loading, NationFrame, Notice, gateWords, useFactionNames, useNationArt } from '../features/nation/frame';
import { useNationAct } from '../features/nation/useNationAct';
import { trpc, trpcClient } from '../lib/trpc';

const P = copy.nation.parliament;

/** *This term ends {date} · {n} days · the republic votes from {weekday}* (screens §6.1). */
export function termLineText(today = dayKey(clockNow())): string {
  const t = termOf(today);
  const days = TERM.days - t.termDay;
  return P.termLine(dayDate(t.toDay - 1), days, dayWeekday(t.fromDay + TERM_DAYS.nation.votesFrom));
}

/** The law's effect in caps with its days: *WAGES +10 % · 14 DAYS · EVERY CITY*. */
const effectCaps = (effect: string, days: number) => `${effect} · ${P.daysEveryCity(days)}`;

const lineWords = (lines: Record<FactionId, LineVote>, names: FactionNames) =>
  FACTION_IDS.map((f) => `${nameOf(names, f)} ${lines[f] === 'free' ? 'free' : lines[f]}`).join(' · ');

// ---------------------------------------------------------------------------------------------
// The chamber (screens §6.1).
// ---------------------------------------------------------------------------------------------

export function ParliamentPage() {
  const q = useQuery(trpc.parliament.chamber.queryOptions());
  const art = useNationArt();
  const names = useFactionNames();
  const act = useNationAct();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Record<string, 'for' | 'against'>>({});
  const [bloc, setBloc] = useState<FactionId | null>(null);
  const [table, setTable] = useState(false);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the chamber…" />;
  const c: ChamberView = q.data;
  const seats = (f: FactionId) => c.seats[f]?.seats ?? 0;
  const presidentsBill = (name: string) => name === c.president.name;
  const bills = [...c.bills].sort((a, b) => Number(presidentsBill(b.tabledBy.name)) - Number(presidentsBill(a.tabledBy.name)));
  const picked = bills.find((b) => picks[b.billId] && b.you.canVote && !b.you.vote);
  const vote = picked ? picks[picked.billId]! : null;
  return (
    <NationFrame
      header={
        <NationHeader
          asset={art?.chamber}
          kicker={P.header}
          title={copy.nation.bar.parliament}
          line={P.seats(seats('vanguard'), seats('collective'), seats('alliance'), c.locals, c.president.name)}
          testId="chamber-header"
        />
      }
    >
      <div data-testid="parliament-page" className="flex flex-col gap-3">
        <BlocBar seats={c.seats} names={names} onBloc={setBloc} />
        <p className="font-mono text-[12px] text-muted" data-testid="term-line">
          {termLineText()}
        </p>
        <section aria-labelledby="up-for-vote" className="flex flex-col">
          <SectionKicker id="up-for-vote">{P.upForVote}</SectionKicker>
          {bills.length === 0 ? (
            <p className="py-3 font-mono text-[12px] text-muted" data-testid="nothing-up">
              {copy.nation.empty.nothingUp}
            </p>
          ) : (
            <ul className="flex flex-col">
              {bills.map((b) => (
                <BillRow
                  key={b.billId}
                  bill={b}
                  names={names}
                  presidents={presidentsBill(b.tabledBy.name)}
                  selected={picks[b.billId] ?? null}
                  onSelect={(v) => setPicks({ [b.billId]: v })}
                  link={(children) => (
                    <Link to="/parliament/bill/$billId" params={{ billId: b.billId }} className="block">
                      {children}
                    </Link>
                  )}
                />
              ))}
            </ul>
          )}
        </section>
        <Notice error={act.error} />
        {c.table ? (
          c.table.ok ? (
            <Button variant="primary" onClick={() => setTable(true)} data-testid="table-a-law">
              {c.table.as === 'president' ? P.putLawFree : P.putLaw}
            </Button>
          ) : (
            <p className="font-mono text-[12px] text-muted" data-testid="table-why">
              {gateWords(c.table.why) ?? P.whoPuts}
            </p>
          )
        ) : (
          <p className="font-mono text-[12px] text-muted" data-testid="table-why">
            {P.whoPuts}
          </p>
        )}
        <section aria-labelledby="decided" className="flex flex-col">
          <SectionKicker id="decided">{P.decided}</SectionKicker>
          {c.decided.length === 0 ? (
            <p className="py-3 font-mono text-[12px] text-muted">{copy.nation.empty.nothingDecided}</p>
          ) : (
            <ul className="flex flex-col">
              {c.decided.slice(0, 10).map((d) => (
                <li key={d.billId} className="border-b border-dotted border-faint" data-testid="decided-row">
                  <Link
                    to="/parliament/bill/$billId"
                    params={{ billId: d.billId }}
                    className="flex min-h-11 items-center gap-1 font-mono text-[12px]"
                  >
                    {dayWeekday(d.day)} · {d.law ?? billTitle({ kind: d.kind, law: null, strikes: null })} ·{' '}
                    {d.outcome === 'passed'
                      ? `passed ${d.for}–${d.against}`
                      : d.outcome === 'failed'
                        ? P.fell(d.for, d.against)
                        : d.outcome === 'vetoed'
                          ? P.vetoed
                          : d.outcome === 'struck'
                            ? P.struck
                            : d.outcome === 'removed'
                              ? P.stamps.removed
                              : d.outcome === 'survived'
                                ? P.stamps.survived
                                : 'lapsed'}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <nav className="flex flex-wrap gap-x-4" aria-label={copy.nation.bar.parliament}>
          <Link to="/parliament/laws" className="inline-flex min-h-11 items-center font-mono text-[12px] underline underline-offset-2" data-testid="to-law-book">
            {P.lawBook}
          </Link>
          <Link to="/election/national/result" className="inline-flex min-h-11 items-center font-mono text-[12px] underline underline-offset-2">
            {P.republicsResult}
          </Link>
          <HelpButton notes={[copy.nation.help.parliament(), copy.nation.help.partyLine(), copy.nation.help.veto()]} label={P.how}>
            <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>{P.how}</span>
          </HelpButton>
        </nav>
        {picked && vote && (
          <StickyBar testId="bill-vote-bar">
            <Button
              variant="primary"
              pending={act.pending === 'vote'}
              onClick={() =>
                void act
                  .run('vote', (k) => trpcClient.parliament.vote.mutate({ billId: picked.billId, vote, idempotencyKey: k }))
                  .then(() => setPicks({}))
              }
              data-testid="bill-vote"
            >
              {vote === 'for' ? P.voteFor(billTitle(picked)) : P.voteAgainst}
            </Button>
          </StickyBar>
        )}
      </div>
      <BlocSheet factionId={bloc} onClose={() => setBloc(null)} names={names} />
      <TableBillSheet
        open={table}
        onOpenChange={setTable}
        onTabled={(billId) => {
          setTable(false);
          void navigate({ to: '/parliament/bill/$billId', params: { billId } });
        }}
      />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// A bloc's list (screens §6.4).
// ---------------------------------------------------------------------------------------------

function BlocSheet({ factionId, onClose, names }: { factionId: FactionId | null; onClose: () => void; names: FactionNames }) {
  const q = useQuery({ ...trpc.parliament.bloc.queryOptions({ factionId: factionId ?? 'vanguard' }), enabled: !!factionId });
  const b = q.data;
  const faction = factionId ? nameOf(names, factionId) : '';
  return (
    <BottomSheet open={!!factionId} onOpenChange={(o) => !o && onClose()} title={b ? P.blocSeats(faction, b.seats) : faction}>
      {!b ? (
        <Loading what="Fetching the list…" />
      ) : (
        <div className="flex flex-col gap-2" data-testid="bloc-sheet">
          <h3 className="label-caps text-[11px]">{P.players}</h3>
          {b.players.length === 0 ? (
            <p className="font-mono text-[12px] text-muted">{copy.nation.empty.noPlayerBloc(faction)}</p>
          ) : (
            <ul>
              {b.players.map((p, i) => (
                <li key={p.name} className="flex min-h-11 flex-col justify-center border-b border-dotted border-faint" data-testid="bloc-player">
                  <span className="font-body text-[14px] font-semibold">{p.name}</span>
                  <span className="font-mono text-[11px] text-muted">Deputy{i === 0 ? ` · ${P.firstOnList}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="label-caps text-[11px]">{P.localDeputies}</h3>
          <p className="font-mono text-[11.5px] text-muted">{P.localsNote}</p>
          <ul>
            {b.locals.named.map((l) => (
              <li key={l.name} className="flex min-h-11 items-center gap-2 border-b border-dotted border-faint">
                {factionId && <FactionCrest factionId={factionId} size={10} />}
                <span className="flex flex-col">
                  <span className="font-body text-[14px]">{l.name}</span>
                  <span className="font-mono text-[11px] text-muted">{P.localDeputy(l.who)}</span>
                </span>
              </li>
            ))}
          </ul>
          {b.locals.more > 0 && <p className="font-mono text-[12px]">{P.andMore(b.locals.more, faction)}</p>}
        </div>
      )}
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------------------------
// Putting a law to Parliament (screens §6.3): the catalogue sheet; at the cap, which law it replaces.
// ---------------------------------------------------------------------------------------------

export function TableBillSheet({
  open,
  onOpenChange,
  onTabled,
  strike,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onTabled: (billId: string) => void;
  /** Opened from the law book's *Strike it out*: that law selected. */
  strike?: string | null;
}) {
  const q = useQuery({ ...trpc.parliament.catalogue.queryOptions(), enabled: open });
  const names = useFactionNames();
  const act = useNationAct();
  const [replaces, setReplaces] = useState<string | null>(null);
  const [tabled, setTabled] = useState<string | null>(null);
  const c: CatalogueView | undefined = q.data;
  const cost = c?.as === 'president' ? 'free · this week' : `${c?.cost ?? 50} Political Capital`;
  const put = (kind: 'law' | 'strike' | 'removal', lawId: string | null) =>
    void act
      .run(`table:${lawId ?? kind}`, (k) =>
        trpcClient.parliament.table.mutate({ kind, lawId, replacesLawId: kind === 'law' ? replaces : null, idempotencyKey: k }),
      )
      .then((r) => {
        // The sheet closes; the modal shows; Continue goes to the bill's page.
        if (r && r.view.kind === 'bill') {
          setReplaces(null);
          setTabled(r.view.bill.billId);
          onOpenChange(false);
        }
      });
  const needReplace = !!c?.atCap && !replaces;
  const dim = !!c && !c.affordable;
  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange} title={P.putLawCost(cost)}>
        {!c ? (
          <Loading what="Fetching the laws…" />
        ) : (
          <div className="flex flex-col gap-2" data-testid="table-sheet" data-step={needReplace ? 'replace' : 'catalogue'}>
            {dim && <p className="font-mono text-[12px] text-collective">{P.needs50}</p>}
            <Notice error={act.error} />
            {needReplace ? (
              <>
                <h3 className="label-caps text-[11px]">{P.whichReplaces}</h3>
                <ul>
                  {c.inForce.map((l) => (
                    <LawRow
                      key={l.lawId}
                      lawId={l.lawId}
                      name={l.name}
                      effect={`${l.effectLine} · ${P.daysLeft(l.daysLeft)}`}
                      line={l.line}
                      onPick={() => setReplaces(l.lawId)}
                      testId="replace-row"
                    />
                  ))}
                </ul>
              </>
            ) : (
              <>
                <ul data-testid="catalogue">
                  {(strike ? [] : c.laws).map((l) => (
                    <LawRow
                      key={l.lawId}
                      lawId={l.lawId}
                      name={l.name}
                      effect={effectCaps(l.effectLine, l.days)}
                      line={l.line}
                      tag={l.factional ? P.needs36 : null}
                      meta={l.available ? lineWords(l.lines, names) : (gateWords(l.why) ?? 'Not available this week')}
                      disabled={!l.available || dim || act.pending !== null}
                      onPick={() => put('law', l.lawId)}
                      testId="catalogue-row"
                    />
                  ))}
                </ul>
                {c.inForce.length > 0 && c.as !== 'president' && (
                  <>
                    <h3 className="label-caps text-[11px]">{P.strikeOut}</h3>
                    <ul>
                      {c.inForce
                        .filter((l) => !strike || l.lawId === strike)
                        .map((l) => (
                          <LawRow
                            key={l.lawId}
                            lawId={l.lawId}
                            name={l.name}
                            effect={`${l.effectLine} · ${P.daysLeft(l.daysLeft)}`}
                            line={l.line}
                            disabled={dim || act.pending !== null}
                            onPick={() => put('strike', l.lawId)}
                            testId="strike-row"
                          />
                        ))}
                    </ul>
                  </>
                )}
                {c.as !== 'president' && !strike && (
                  <Button variant="outline" disabled={dim} pending={act.pending === 'table:removal'} onClick={() => put('removal', null)} data-testid="table-removal">
                    {copy.nation.petition.removal}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </BottomSheet>
      <ResultModal
        result={act.result}
        open={act.open}
        onOpenChange={act.setOpen}
        onContinue={() => {
          act.setOpen(false);
          if (tabled) onTabled(tabled);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// A bill's page (screens §6.2).
// ---------------------------------------------------------------------------------------------

const STAMPS: Partial<Record<BillPageView['state'], { label: string; tone: 'success' | 'partial' | 'failure' }>> = {
  inForce: { label: P.stamps.passed, tone: 'success' },
  awaitingSignature: { label: P.stamps.passed, tone: 'success' },
  failed: { label: P.stamps.fell, tone: 'failure' },
  vetoed: { label: P.stamps.vetoed, tone: 'failure' },
  struck: { label: P.stamps.struck, tone: 'partial' },
  removed: { label: P.stamps.removed, tone: 'failure' },
  survived: { label: P.stamps.survived, tone: 'partial' },
};

export function BillPage() {
  const { billId } = useParams({ from: '/app/parliament/bill/$billId' });
  const q = useQuery(trpc.parliament.bill.queryOptions({ billId }));
  const art = useNationArt();
  const names = useFactionNames();
  const act = useNationAct();
  const [pick, setPick] = useState<'for' | 'against' | null>(null);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the bill…" />;
  const b = q.data;
  const title = billTitle(b);
  const tag = billTag(b);
  const stamp = STAMPS[b.state] ?? null;
  const canVote = b.you.canVote && !b.you.vote;
  return (
    <NationFrame header={<NationHeader asset={art?.chamber} kicker={P.header} stamp={stamp} testId="bill-header" />}>
      <div className="flex flex-col gap-3" data-testid="bill-page" data-state={b.state} data-kind={b.kind}>
        <h1 className="font-display text-[26px] leading-tight font-black" data-testid="bill-title">
          {title}
        </h1>
        <PowerCard kicker={P.whatItDoes} testId="what-it-does">
          {b.kind === 'removal' && b.removal ? (
            <p className="font-body text-[14px]">{P.removes(b.removal.president, b.removal.runnerUp ?? '—')}</p>
          ) : (
            <>
              {b.law?.line && <p className="font-body text-[14px] italic">{b.law.line}</p>}
              {b.law && <span className="label-caps text-[10.5px] text-petrol">{effectCaps(b.law.effectLine, b.days ?? 0)}</span>}
              {b.appliesTo && (
                <span className="font-mono text-[11.5px]">
                  {b.appliesTo.kind === 'members'
                    ? P.membersOnly(nameOf(names, b.appliesTo.factionId))
                    : P.othersOnly(nameOf(names, b.appliesTo.factionId))}
                </span>
              )}
              {b.replaces && <span className="font-mono text-[11.5px]">Replaces the {b.replaces}</span>}
            </>
          )}
          {tag && <span className="label-caps self-start border border-ink px-1 text-[10px]">{tag}</span>}
        </PowerCard>
        <p className="font-mono text-[11.5px] text-muted" data-testid="bill-line">
          {P.billLine(b.tabledBy.name, dayDate(b.tabledDay), formatAt(b.until).replace(/^at /, ''), b.needed)}
        </p>
        <BillCount bill={b} names={names} />
        {b.inForceFrom !== null && b.state === 'inForce' && (
          <p className="font-mono text-[12px] text-petrol" data-testid="in-force-from">
            In force from {dayWeekday(b.inForceFrom)}, {dayDate(b.inForceFrom)}
          </p>
        )}
        {b.chairLine && (
          <PowerCard kicker={copy.nation.chair.partyLine} testId="chair-line">
            <LineChips
              label={copy.nation.chair.partyLine}
              value={b.chairLine.line}
              pending={act.pending === 'line'}
              onPick={(line) => void act.run('line', (k) => trpcClient.chair.setLine.mutate({ billId: b.billId, line, idempotencyKey: k }))}
            />
            {!b.chairLine.line && (
              <span className="font-mono text-[11px] text-muted">{copy.nation.chair.secretarysLine(lineWord(b.chairLine.secretaryLine))}</span>
            )}
          </PowerCard>
        )}
        {b.signature?.today && (
          <PowerCard kicker={copy.nation.president.veto} testId="veto-card">
            <p className="font-body text-[14px]">{P.awaitingSignature}</p>
            {b.signature.canVeto ? (
              <Button
                variant="outline"
                className="border-failure text-failure hover:bg-failure"
                pending={act.pending === 'veto'}
                onClick={() => void act.run('veto', (k) => trpcClient.parliament.veto.mutate({ billId: b.billId, idempotencyKey: k }))}
                data-testid="veto"
              >
                {P.veto}
              </Button>
            ) : (
              <span className="font-mono text-[12px] text-muted">{b.signature.vetoUsed ? copy.nation.president.usedOn(title, '') : ''}</span>
            )}
          </PowerCard>
        )}
        <Notice error={act.error} />
        <Link to="/parliament" className="inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2">
          {copy.nation.bar.parliament}
        </Link>
        {canVote && (
          <StickyBar testId="bill-vote-bar">
            <div className="flex gap-2" role="radiogroup" aria-label={title}>
              {(['for', 'against'] as const).map((v) => (
                <Button
                  key={v}
                  role="radio"
                  aria-checked={pick === v}
                  variant={pick === v ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => setPick(v)}
                  data-testid={`bill-pick-${v}`}
                >
                  {v === 'for' ? copy.nation.chair.for : copy.nation.chair.against}
                </Button>
              ))}
            </div>
            <Button
              variant="primary"
              disabled={!pick}
              pending={act.pending === 'vote'}
              onClick={() => pick && void act.run('vote', (k) => trpcClient.parliament.vote.mutate({ billId: b.billId, vote: pick, idempotencyKey: k }))}
              data-testid="bill-vote"
            >
              {pick === 'against' ? P.voteAgainst : P.voteFor(title)}
            </Button>
          </StickyBar>
        )}
      </div>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}

// ---------------------------------------------------------------------------------------------
// The law book (screens §8).
// ---------------------------------------------------------------------------------------------

export function LawBookPage() {
  const q = useQuery(trpc.parliament.laws.queryOptions());
  const art = useNationArt();
  const navigate = useNavigate();
  const [strike, setStrike] = useState<string | null>(null);
  const [folded, setFolded] = useState(true);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the law book…" />;
  const book = q.data;
  return (
    <NationFrame
      header={
        <NationHeader
          asset={art?.chamber}
          kicker={P.lawBook}
          title={P.lawsInForce}
          line={P.lawsCount(book.inForce.length)}
          testId="law-book-header"
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="law-book">
        <HelpButton notes={[copy.nation.help.lawBook()]} label={P.lawBook} className="self-start">
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>{P.lawBook}</span>
        </HelpButton>
        {book.inForce.length === 0 ? (
          <p className="font-mono text-[12px] text-muted" data-testid="no-law">
            {copy.nation.empty.noLaw}
          </p>
        ) : (
          <ul>
            {book.inForce.map((l) => (
              <LawRow
                key={l.lawId}
                lawId={l.lawId}
                name={l.name}
                effect={P.daysLeft(l.daysLeft)}
                line={l.line}
                meta={P.lawRow(l.by, dayWeekday(l.passed.day), l.passed.for, l.passed.against)}
                testId="law-in-force"
                action={
                  book.strike?.ok ? (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2"
                      onClick={() => setStrike(l.lawId)}
                      data-testid="strike-it"
                    >
                      {P.strikeIt}
                    </button>
                  ) : undefined
                }
              />
            ))}
          </ul>
        )}
        <button
          type="button"
          aria-expanded={!folded}
          onClick={() => setFolded(!folded)}
          className="label-caps flex min-h-11 items-center justify-between border-y border-ink text-[11px]"
          data-testid="catalogue-fold"
        >
          {P.catalogue}
          <span aria-hidden>{folded ? '+' : '−'}</span>
        </button>
        {!folded && (
          <ul>
            {book.catalogue.map((l) => (
              <LawRow key={l.lawId} lawId={l.lawId} name={l.name} effect={`${l.days} days`} line={l.line} testId="law-catalogue" />
            ))}
          </ul>
        )}
        <Link to="/parliament" className="inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2">
          {copy.nation.bar.parliament}
        </Link>
      </div>
      <TableBillSheet
        open={!!strike}
        strike={strike}
        onOpenChange={(o) => !o && setStrike(null)}
        onTabled={(billId) => {
          setStrike(null);
          void navigate({ to: '/parliament/bill/$billId', params: { billId } });
        }}
      />
    </NationFrame>
  );
}
