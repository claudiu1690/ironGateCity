import { copy } from '@irongate/content/copy';
import {
  BottomSheet,
  Button,
  HelpButton,
  NationHeader,
  PowerCard,
  ResultModal,
  dayDate,
  helpMark,
  nameOf,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { LoadError, Loading, NationFrame, Notice, useFactionNames, useNationArt } from '../features/nation/frame';
import { useNationAct } from '../features/nation/useNationAct';
import { trpc, trpcClient } from '../lib/trpc';
import { TableBillSheet } from './parliament';

const PR = copy.nation.president;
const G = copy.nation.governor;
const linkClass = 'inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2';

/**
 * Slice 7 (screens §4.3, tech design §12.1): the President's page. The holder's pledges, a law a week,
 * the veto (its button lives on the bill's page on the signature day; this card links there) and the
 * Address. Anyone may read it; the buttons show only for the holder.
 */
export function PresidentPage() {
  const q = useQuery(trpc.office.president.queryOptions());
  const art = useNationArt();
  const names = useFactionNames();
  const act = useNationAct();
  const navigate = useNavigate();
  const [table, setTable] = useState(false);
  const [speak, setSpeak] = useState(false);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the President's page…" />;
  const p = q.data;
  const h = p.holder;
  const faction = nameOf(names, h.factionId);
  const line = h.figure ? PR.figure(h.name, faction) : PR.took(dayDate(h.since), dayDate(p.until - 1), false);
  return (
    <NationFrame
      header={<NationHeader asset={art?.president} kicker={PR.header} title={h.name} line={line} testId="president-header" />}
    >
      <div className="flex flex-col gap-3" data-testid="president-page" data-you={p.you ? 'true' : 'false'}>
        <HelpButton notes={[copy.nation.help.president(), copy.nation.help.veto()]} label={PR.header} className="self-start">
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>What the President does</span>
        </HelpButton>
        {p.pledges.length > 0 && (
          <PowerCard kicker={PR.pledges} testId="pledges-card">
            <ul>
              {p.pledges.map((pl) => (
                <li key={pl.lawId} className="flex min-h-11 flex-col justify-center border-b border-dotted border-faint" data-testid="pledge-row">
                  <span className="font-body text-[14px] font-semibold">{pl.name}</span>
                  <span className="font-mono text-[11px] text-muted">{pl.kept ? PR.kept('') : PR.notYet}</span>
                </li>
              ))}
            </ul>
          </PowerCard>
        )}
        <PowerCard kicker={PR.lawAWeek} testId="week-card">
          <p className="font-body text-[14px]">{PR.lawAWeekNote}</p>
          {p.week.tabled ? (
            <span className="font-mono text-[12px]" data-testid="week-tabled">
              {PR.thisWeeksLaw(p.week.tabled.lawName, dayDate(p.week.tabled.day))}
            </span>
          ) : p.you && p.week.canTable ? (
            <Button variant="primary" onClick={() => setTable(true)} data-testid="president-table">
              {PR.putLaw}
            </Button>
          ) : (
            <span className="font-mono text-[12px] text-muted">{PR.nextMonday}</span>
          )}
        </PowerCard>
        <PowerCard kicker={PR.veto} testId="veto-card">
          <p className="font-body text-[14px]">{PR.vetoNote}</p>
          <span className="font-mono text-[12px]" data-testid="veto-state">
            {p.veto.used ? PR.usedOn(p.veto.used.lawName, dayDate(p.veto.used.day)) : PR.unused}
          </span>
          {p.you &&
            p.veto.signable.map((b) => (
              <Link
                key={b.billId}
                to="/parliament/bill/$billId"
                params={{ billId: b.billId }}
                className="flex min-h-11 items-center justify-between gap-2 border-t border-dotted border-faint font-mono text-[12px]"
                data-testid="veto-signable"
              >
                <span>{PR.awaiting(b.law)}</span>
                <span className="underline underline-offset-2">{PR.seeBill} ›</span>
              </Link>
            ))}
        </PowerCard>
        <PowerCard kicker={G.address} testId="address-card">
          <p className="font-body text-[14px]">{G.presidentAddressNote}</p>
          {p.address.used ? (
            <span className="font-mono text-[12px]" data-testid="address-spent">
              {G.addressSpent(p.address.used.issueShort, dayDate(p.address.used.day))}
            </span>
          ) : p.you ? (
            <Button variant="primary" onClick={() => setSpeak(true)} data-testid="president-speak">
              {G.speak}
            </Button>
          ) : null}
        </PowerCard>
        <Notice error={act.error} />
        <p className="font-mono text-[11.5px] text-muted">{copy.nation.me.pay(p.pay.pc, p.pay.fxp)}</p>
        <div className="flex flex-wrap gap-x-4">
          <Link to="/parliament" className={linkClass}>
            {copy.nation.bar.parliament}
          </Link>
          <Link to="/election/national/result" className={linkClass}>
            {copy.nation.parliament.republicsResult}
          </Link>
        </div>
      </div>
      <BottomSheet open={speak} onOpenChange={setSpeak} title={G.address}>
        <ul data-testid="address-sheet">
          {p.address.issues.map((i) => (
            <li key={i.docId}>
              <button
                type="button"
                className="flex min-h-11 w-full cursor-pointer flex-col items-start border-b border-dotted border-faint py-1.5 text-left hover:bg-paper-card disabled:opacity-55"
                disabled={act.pending !== null}
                onClick={() =>
                  void act
                    .run('address', (k) => trpcClient.president.address.mutate({ issueDocId: i.docId, idempotencyKey: k }))
                    .then(() => setSpeak(false))
                }
                data-testid="address-issue"
              >
                <span className="font-body text-[14px] font-semibold">{G.speakOn(i.short)}</span>
                <span className="font-mono text-[11px] text-muted">{i.name}</span>
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
    </NationFrame>
  );
}
