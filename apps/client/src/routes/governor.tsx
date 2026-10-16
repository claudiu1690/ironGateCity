import { copy } from '@irongate/content/copy';
import {
  Button,
  HelpButton,
  OfficeHeader,
  PowerCard,
  ResultModal,
  RulePicker,
  formatUntil,
  helpMark,
  nameOf,
  officeWeekday,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { LoadError, Loading, NationFrame, Notice, useFactionNames } from '../features/nation/frame';
import { useNationAct } from '../features/nation/useNationAct';
import { trpc, trpcClient } from '../lib/trpc';

const G = copy.nation.governor;
const linkClass =
  'inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2';

/**
 * Slice 7 (screens §4.1, the 10 Oct addendum; tech design §12.1): the Governor's (home) or the
 * Mayor's (the capital, Clearwater) page, `/office/governor/$cityId`. The hall's crop, the holder, the
 * party's card (card 1 on the town's ballot, chosen on the council's days 0–1), the Address once a
 * term, the pay. Anyone may read it; the buttons are the holder's.
 */
export function GovernorPage() {
  const { cityId } = useParams({ strict: false }) as { cityId: string };
  const q = useQuery(trpc.office.governor.queryOptions({ cityId }));
  const names = useFactionNames();
  const act = useNationAct();
  const [picker, setPicker] = useState(false);
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the Governor's page…" />;
  const p = q.data;
  const h = p.holder;
  const hall = p.city.hall;
  const crop = hall
    ? { asset: hall.night.night ? hall.asset.night : hall.asset.day, x: hall.x, y: hall.y }
    : null;
  const kicker =
    p.city.title === 'Mayor'
      ? p.city.id === 'irongate'
        ? G.mayorHeader
        : G.mayorOf(p.city.name, hall?.name ?? '')
      : G.header(p.city.name, hall?.name ?? '');
  const line = !h
    ? copy.nation.empty.localHolder('—')
    : h.local
      ? G.local(h.name)
      : G.since(officeWeekday(h.since), officeWeekday(h.until - 1));
  const faction = h ? nameOf(names, h.factionId) : '';
  const busy = act.pending !== null;
  const rule = p.rule;
  return (
    <NationFrame
      header={
        <OfficeHeader
          crop={crop}
          kicker={kicker}
          name={h?.name ?? null}
          line={line}
          holder={h ? { avatar: null, factionId: h.factionId } : null}
          testId="governor-header"
        />
      }
    >
      <div className="flex flex-col gap-3" data-testid="governor-page" data-you={p.you ? 'true' : 'false'}>
        <HelpButton
          notes={[copy.nation.help.governor(), copy.nation.help.partyCard()]}
          label={kicker}
          className="self-start"
        >
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>
            {G.whatDoes(p.city.title)}
          </span>
        </HelpButton>
        {/* The party's card (the 10 Oct addendum): card 1 on the town's ballot, at no cost. */}
        <PowerCard kicker={G.cardKicker} testId="governor-rule">
          {rule.set ? (
            <p className="font-body text-[14px] font-semibold" data-testid="governor-rule-set">
              {G.cardKicker} · {rule.set.name}
            </p>
          ) : (
            <p className="font-body text-[14px]">{copy.nation.help.partyCard()[1]}</p>
          )}
          {rule.card?.onBallot && rule.until === null && (
            <span className="font-mono text-[12px]" data-testid="governor-card1">
              {G.card1}
            </span>
          )}
          {rule.until !== null && (
            <span className="font-mono text-[12px] text-text-2" data-testid="governor-card-note">
              {G.cardNote(formatUntil(rule.until))}
            </span>
          )}
          {rule.decided && (
            <span className="font-mono text-[12px]" data-testid="governor-decided">
              {G.voted(officeWeekday(rule.decided.day), rule.decided.name, rule.decided.won)}
            </span>
          )}
          {p.you && rule.menu && (
            <Button
              variant={rule.set ? 'outline' : 'primary'}
              onClick={() => setPicker(true)}
              disabled={busy}
              pending={act.pending === 'governorRule'}
              data-testid="governor-choose"
            >
              {rule.set ? `${G.change} ›` : G.chooseRule}
            </Button>
          )}
        </PowerCard>
        {/* The Address: fifty points on one of the town's Issues, once a term. */}
        <PowerCard kicker={G.address} testId="governor-address">
          <p className="font-body text-[14px]">{G.addressNote(faction)}</p>
          {p.address.used ? (
            <span className="font-mono text-[12px]" data-testid="address-spent">
              {G.addressSpent(p.address.used.issueShort, officeWeekday(p.address.used.day))}
            </span>
          ) : p.you ? (
            <ul className="flex flex-col gap-1.5">
              {p.address.issues.map((i) => (
                <li key={i.docId}>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    pending={act.pending === 'address'}
                    onClick={() =>
                      void act.run('address', (k) =>
                        trpcClient.governor.address.mutate({ issueDocId: i.docId, idempotencyKey: k }),
                      )
                    }
                    data-testid="governor-speak"
                  >
                    {G.speakOn(i.short)}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </PowerCard>
        <Notice error={act.error} />
        <p className="font-mono text-[11.5px] text-muted" data-testid="governor-pay">
          {copy.nation.me.pay(p.pay.pc, p.pay.fxp)}
        </p>
        <div className="flex flex-wrap gap-x-4">
          <Link to="/council" className={linkClass}>
            {copy.hall.council}
          </Link>
        </div>
      </div>
      {rule.menu && (
        <RulePicker
          open={picker}
          onOpenChange={setPicker}
          menu={rule.menu}
          current={rule.set?.ordinanceId ?? ''}
          own={rule.set?.ordinanceId ?? null}
          title={G.atNoCost}
          disabled={busy}
          onPick={(ordinanceId) =>
            void act.run('governorRule', (k) =>
              trpcClient.governor.setRule.mutate({ ordinanceId, idempotencyKey: k }),
            )
          }
        />
      )}
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}
