import { copy } from '@irongate/content/copy';
import type { ChairDeskView, LineVote } from '@irongate/rules';
import {
  BottomSheet,
  Button,
  HelpButton,
  LineChips,
  OrderPicker,
  PowerCard,
  PushRow,
  ResultModal,
  SectionKicker,
  StickyBar,
  TargetBar,
  ToggleChip,
  billTitle,
  dayDate,
  dayWeekday,
  helpMark,
  lineWord,
} from '@irongate/ui';
import type { PushValue } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { trpc, trpcClient } from '../../lib/trpc';
import { useCharacter } from '../game/hooks';
import { MembersTab } from '../faction/MembersTab';
import { LoadError, Loading, Notice } from '../nation/frame';
import { useNationAct } from '../nation/useNationAct';
import { TableBillSheet } from '../../routes/parliament';
import { ChairElectionCard, ConfidenceCard } from './ChairElection';

const C = copy.nation.chair;
type Part = 'orders' | 'lines' | 'events' | 'members';
const PARTS: Array<{ id: Part; label: string }> = [
  { id: 'orders', label: C.orders },
  { id: 'lines', label: C.lines },
  { id: 'events', label: copy.together.tabs.events },
  { id: 'members', label: copy.together.tabs.members },
];

/**
 * Slice 7 (screens §4.2, §5; tech design §12.1): the Faction tab's **Chair** part. For the Chair, the
 * desk in four parts (Orders · Lines · Events · Members); for a Rank 4+ member, the Chair's page read
 * only (the standing orders, the party's cards, the party line on each bill), the Election card for
 * Chair and the vote on the Chair.
 */
export function ChairTab() {
  const page = useQuery(trpc.office.chair.queryOptions());
  const you = !!page.data?.chair?.you;
  const desk = useQuery({ ...trpc.chair.desk.queryOptions(), enabled: you });
  if (page.isError) return <LoadError retry={() => void page.refetch()} />;
  if (!page.data) return <Loading what="Fetching the Chair's desk…" />;
  return you ? desk.data ? <Desk d={desk.data} /> : <Loading what="Fetching the desk…" /> : <ChairPage d={page.data} />;
}

function ChairLine({ d }: { d: ChairDeskView }) {
  const { character } = useCharacter();
  const faction = character?.factionName ?? '';
  return (
    <div className="flex flex-col gap-0.5" data-testid="chair-holder">
      <HelpButton notes={[copy.nation.help.chair(), copy.nation.help.partyLine(), copy.nation.help.partyCard()]} label={C.tab} className="self-start">
        <span className={`label-caps inline-flex min-h-11 items-center text-[11px] ${helpMark}`}>{C.tab}</span>
      </HelpButton>
      <span className="font-body text-[16px] font-semibold">
        {d.chair ? C.factionsChairIs(faction, d.chair.name) : C.secretaryRuns}
      </span>
      {d.chair && <span className="font-mono text-[11.5px] text-muted">{copy.nation.me.chairLine(faction, dayDate(d.chair.until - 1))}</span>}
    </div>
  );
}

/** The read-only page for members (screens §4.2). */
function ChairPage({ d }: { d: ChairDeskView }) {
  const slots = d.orders.slots;
  const label = (s: (typeof slots)[number]) => s.current?.label ?? C.rotation;
  const push = d.orders.push;
  const pushPlace = push ? (d.orders.places.find((p) => p.cityId === push.cityId && p.districtId === push.districtId)?.name ?? push.cityId) : null;
  return (
    <div className="flex flex-col gap-3 px-4 py-3" data-testid="chair-page">
      <ChairLine d={d} />
      <ChairElectionCard />
      <ConfidenceCard />
      <Link to="/faction/confidence" className="inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2" data-testid="to-confidence">
        {C.voteOnChair}
      </Link>
      <PowerCard kicker={C.tomorrowsOrders} testId="chair-orders-readonly">
        <span className="font-mono text-[12px]">
          {C.setBy(label(slots[0]!), label(slots[1]!), label(slots[2]!))}
          {push && pushPlace ? ` · ${C.pushLine(pushPlace, push.target)}` : ''}
        </span>
        {d.orders.target && <TargetBar target={d.orders.target} />}
      </PowerCard>
      <PowerCard kicker={C.partyCard}>
        <ul>
          {d.rules.map((r) => (
            <li key={r.cityId} className="font-mono text-[12px]">
              {r.cityName} · {r.name ?? C.rotation}
            </li>
          ))}
        </ul>
      </PowerCard>
      <PowerCard kicker={C.partyLine}>
        {d.lines.length === 0 ? (
          <span className="font-mono text-[12px] text-muted">{C.nothingUp}</span>
        ) : (
          <ul>
            {d.lines.map((l) => (
              <li key={l.billId} className="font-mono text-[12px]">
                {l.law} · {lineWord(l.line ?? l.secretaryLine)}
              </li>
            ))}
          </ul>
        )}
      </PowerCard>
    </div>
  );
}

/** The desk (screens §5): the four parts under the Faction header. */
function Desk({ d }: { d: ChairDeskView }) {
  const [part, setPart] = useState<Part>('orders');
  return (
    <div className="flex flex-col" data-testid="chair-desk">
      <nav className="grid min-h-11 grid-cols-4 border-b border-ink bg-paper" aria-label={C.tab} data-testid="desk-parts">
        {PARTS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-current={part === p.id ? 'page' : undefined}
            onClick={() => setPart(p.id)}
            className={
              part === p.id
                ? 'label-caps relative min-h-11 border-r border-muted bg-paper-card text-[11px] font-semibold text-ink last:border-r-0'
                : 'label-caps relative min-h-11 cursor-pointer border-r border-muted text-[11px] text-muted last:border-r-0 hover:text-ink'
            }
            data-testid={`desk-part-${p.id}`}
          >
            {p.label}
            {part === p.id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] bg-ink" />}
          </button>
        ))}
      </nav>
      {part === 'orders' && <OrdersPart d={d} />}
      {part === 'lines' && <LinesPart d={d} />}
      {part === 'events' && <EventsPart d={d} />}
      {part === 'members' && <MembersTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Orders (screens §5.1).
// ---------------------------------------------------------------------------------------------

function OrdersPart({ d }: { d: ChairDeskView }) {
  const act = useNationAct();
  const initial = () => ({
    A: d.orders.slots.find((s) => s.slot === 'A')?.current?.family ?? null,
    B: d.orders.slots.find((s) => s.slot === 'B')?.current?.family ?? null,
    C: d.orders.slots.find((s) => s.slot === 'C')?.current?.family ?? null,
  });
  const [picks, setPicks] = useState<Record<'A' | 'B' | 'C', string | null>>(initial);
  const [push, setPush] = useState<PushValue | null>(d.orders.push);
  useEffect(() => {
    setPicks(initial());
    setPush(d.orders.push);
    // The desk re-read after a set: the stored orders are the form's again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  const set = !!d.orders.fromDay;
  return (
    <div className="flex flex-col gap-2 px-4 pt-3" data-testid="desk-orders">
      <SectionKicker>{C.tomorrowsOrders}</SectionKicker>
      <p className="font-mono text-[11.5px] text-muted">{C.ordersNote}</p>
      {d.orders.slots.map((s) => {
        const value = picks[s.slot] ? (s.menu.find((m) => m.family === picks[s.slot]) ?? s.current) : null;
        return (
          <OrderPicker
            key={s.slot}
            slot={s.slot}
            value={value}
            menu={s.menu}
            onPick={(family) => setPicks((p) => ({ ...p, [s.slot]: family }))}
          />
        );
      })}
      <PushRow value={push} places={d.orders.places} onChange={setPush} />
      {set && d.orders.setBy && (
        <p className="font-mono text-[12px] text-petrol" data-testid="orders-set">
          {C.setFromTomorrow} · {C.setByName(d.orders.setBy.name)}
        </p>
      )}
      {d.orders.target && <TargetBar target={d.orders.target} />}
      <Notice error={act.error} />
      <StickyBar testId="desk-cta">
        <Button
          variant="primary"
          pending={act.pending === 'orders'}
          onClick={() =>
            void act.run('orders', (k) =>
              trpcClient.chair.setOrders.mutate({
                picks,
                push: push ? { slot: push.slot, cityId: push.cityId, districtId: push.districtId, target: push.target } : null,
                idempotencyKey: k,
              }),
            )
          }
          data-testid="set-orders"
        >
          {C.setOrders}
        </Button>
      </StickyBar>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Lines (screens §5.2): the party line on each bill, the party's cards, the Chair's bill.
// ---------------------------------------------------------------------------------------------

function LinesPart({ d }: { d: ChairDeskView }) {
  const act = useNationAct();
  const navigate = useNavigate();
  const [rule, setRule] = useState<ChairDeskView['rules'][number] | null>(null);
  const [table, setTable] = useState(false);
  const setLine = (billId: string, line: LineVote) =>
    void act.run(`line:${billId}`, (k) => trpcClient.chair.setLine.mutate({ billId, line, idempotencyKey: k }));
  return (
    <div className="flex flex-col gap-3 px-4 py-3" data-testid="desk-lines">
      <SectionKicker>{C.partyLine}</SectionKicker>
      {d.lines.length === 0 ? (
        <p className="font-mono text-[12px] text-muted">{C.nothingUp}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {d.lines.map((l) => (
            <li key={l.billId} className="flex flex-col gap-1 border-b border-dotted border-faint pb-2" data-testid="line-row" data-bill-id={l.billId}>
              <Link to="/parliament/bill/$billId" params={{ billId: l.billId }} className="flex min-h-11 items-center font-body text-[15px] font-semibold">
                {billTitle({ kind: l.kind, law: { id: '', name: l.law, line: '', effectLine: '' }, strikes: l.law })}
              </Link>
              <LineChips label={l.law} value={l.line} pending={act.pending === `line:${l.billId}`} onPick={(v) => setLine(l.billId, v)} />
              <span className="font-mono text-[11px] text-muted">
                {l.localsFollow === 'unrest'
                  ? C.localsUnrest(l.locals, lineWord(l.secretaryLine))
                  : l.line === null
                  ? C.secretarysLine(lineWord(l.secretaryLine))
                  : l.line === 'free'
                    ? C.localsAbstain
                    : l.localsFollow === 'players'
                      ? C.followPlayers(l.locals)
                      : C.followYourLine(l.players, l.locals)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <SectionKicker>{C.partyCard}</SectionKicker>
      <p className="font-mono text-[11.5px] text-muted">{C.partyCardNote}</p>
      <ul>
        {d.rules.map((r) => (
          <li key={r.cityId}>
            <button
              type="button"
              onClick={() => setRule(r)}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 border-b border-dotted border-faint text-left"
              data-testid="rule-row"
              data-city-id={r.cityId}
            >
              <span className="flex flex-col">
                <span className="font-body text-[14px] font-semibold">{C.partyCardIn(r.cityName)}</span>
                <span className="font-mono text-[11px] text-muted">
                  {r.name ?? C.rotation} · {C.fromCouncil(dayWeekday(r.fromSet))}
                </span>
              </span>
              <span aria-hidden className="font-label text-[18px]">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      <SectionKicker>{C.putLaw}</SectionKicker>
      {d.bill.used ? (
        <p className="font-mono text-[12px]" data-testid="chair-bill-used">
          {C.youPut(d.bill.used.lawName, dayDate(d.bill.used.day))}
        </p>
      ) : (
        <Button variant="primary" onClick={() => setTable(true)} data-testid="chair-table">
          {copy.nation.parliament.putLaw}
        </Button>
      )}
      <Notice error={act.error} />
      <BottomSheet open={!!rule} onOpenChange={(o) => !o && setRule(null)} title={rule ? C.partyCardIn(rule.cityName) : ''}>
        <ul data-testid="rule-menu">
          {(rule?.menu ?? []).map((m) => (
            <li key={m.ordinanceId}>
              <button
                type="button"
                aria-pressed={rule?.ordinanceId === m.ordinanceId}
                disabled={act.pending !== null}
                onClick={() =>
                  rule &&
                  void act
                    .run('rule', (k) => trpcClient.chair.setRule.mutate({ cityId: rule.cityId, ordinanceId: m.ordinanceId, idempotencyKey: k }))
                    .then(() => setRule(null))
                }
                className="flex min-h-11 w-full cursor-pointer items-center justify-between border-b border-dotted border-faint text-left font-body text-[14px] hover:bg-paper-card"
                data-testid="rule-option"
              >
                {m.name}
                {rule?.ordinanceId === m.ordinanceId && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
      <TableBillSheet
        open={table}
        onOpenChange={setTable}
        onTabled={(billId) => {
          setTable(false);
          void navigate({ to: '/parliament/bill/$billId', params: { billId } });
        }}
      />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Events (screens §5.3): a call from anywhere, tomorrow's fixtures.
// ---------------------------------------------------------------------------------------------

const HOURS = [1, 3, 6, 12] as const;

function EventsPart({ d }: { d: ChairDeskView }) {
  const act = useNationAct();
  const [call, setCall] = useState<ChairDeskView['callCities'][number] | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [hours, setHours] = useState<(typeof HOURS)[number]>(3);
  const [district, setDistrict] = useState<string | null>(null);
  const menuFor = (cityId: string) => d.fixtures.find((f) => f.cityId === cityId)?.menu ?? d.fixtures[0]?.menu ?? [];
  return (
    <div className="flex flex-col gap-3 px-4 py-3" data-testid="desk-events">
      <SectionKicker>{copy.together.tabs.events}</SectionKicker>
      <ul>
        {d.callCities.map((c) => (
          <li key={c.cityId} className="flex min-h-11 items-center justify-between gap-2 border-b border-dotted border-faint">
            <span className="font-body text-[14px] font-semibold">{c.name}</span>
            <Button
              variant="outline"
              className="px-3 text-[11px]"
              onClick={() => {
                setCall(c);
                setTypeId(null);
                setDistrict(c.districts[0]?.districtId ?? null);
              }}
              data-testid="chair-call"
              data-city-id={c.cityId}
            >
              Call an event
            </Button>
          </li>
        ))}
      </ul>
      <Link to="/faction" search={{ tab: 'events' }} className="inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2">
        The board
      </Link>
      <SectionKicker>{C.tomorrowsFixtures}</SectionKicker>
      <ul className="flex flex-col gap-2">
        {d.fixtures.map((f) => (
          <li key={f.cityId} className="flex flex-col gap-1" data-testid="fixture-row" data-city-id={f.cityId}>
            <span className="font-body text-[14px] font-semibold">
              {f.cityName} · {dayWeekday(f.day)}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {f.menu.map((m) => (
                <ToggleChip
                  key={m.typeId}
                  on={f.typeId === m.typeId}
                  onClick={() =>
                    void act.run(`fixture:${f.cityId}`, (k) =>
                      trpcClient.chair.setFixture.mutate({ cityId: f.cityId, typeId: m.typeId, districtId: f.districtId ?? f.districts[0]?.districtId ?? null, idempotencyKey: k }),
                    )
                  }
                  testId="fixture-chip"
                >
                  {m.name}
                  {f.rotation && f.typeId === m.typeId ? ` · ${C.fixtureRotation}` : ''}
                </ToggleChip>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <Notice error={act.error} />
      <BottomSheet open={!!call} onOpenChange={(o) => !o && setCall(null)} title={call ? `Call an event · ${call.name}` : ''}>
        <div className="flex flex-col gap-2" data-testid="chair-call-sheet">
          <span className="font-mono text-[11.5px] text-muted">{C.noRoleCalledByChair}</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which event">
            {(call ? menuFor(call.cityId) : []).map((m) => (
              <ToggleChip key={m.typeId} on={typeId === m.typeId} onClick={() => setTypeId(m.typeId)} testId="call-type">
                {m.name}
              </ToggleChip>
            ))}
          </div>
          {call && call.districts.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Where">
              {call.districts.map((x) => (
                <ToggleChip key={x.districtId} on={district === x.districtId} onClick={() => setDistrict(x.districtId)}>
                  {x.name}
                </ToggleChip>
              ))}
            </div>
          )}
          <div className="flex gap-1.5" role="group" aria-label="When">
            {HOURS.map((h) => (
              <ToggleChip key={h} on={hours === h} onClick={() => setHours(h)}>
                In {h} {h === 1 ? 'hour' : 'hours'}
              </ToggleChip>
            ))}
          </div>
          <Button
            variant="primary"
            disabled={!typeId}
            pending={act.pending === 'call'}
            onClick={() =>
              call &&
              typeId &&
              void act
                .run('call', (k) =>
                  trpcClient.chair.callEvent.mutate({ cityId: call.cityId, districtId: call.districts.length ? district : null, typeId, hours, idempotencyKey: k }),
                )
                .then((r) => r && setCall(null))
            }
            data-testid="chair-call-it"
          >
            Call it
          </Button>
        </div>
      </BottomSheet>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </div>
  );
}
