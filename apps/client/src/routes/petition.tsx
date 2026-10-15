import { copy } from '@irongate/content/copy';
import type { PetitionView } from '@irongate/rules';
import { Button, HallHeader, HelpButton, NationHeader, ResultModal, SignatureBar, dayWeekday, formatUntil, helpMark } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { LoadError, Loading, NationFrame, Notice, gateWords } from '../features/nation/frame';
import { useNationAct } from '../features/nation/useNationAct';
import { trpc, trpcClient } from '../lib/trpc';

const PE = copy.nation.petition;

/** The Election card's third line while a petition is open (screens §9.1). */
export function petitionLine(p: PetitionView | null | undefined): string | null {
  if (!p?.open) return null;
  return PE.line(p.open.count, p.open.needed, formatUntil(p.open.until));
}

/**
 * Slice 7 (screens §9.1, tech design §12.1): a petition to dissolve the residence city's council. The
 * hall's picture, the names as a bar, the rule in words, the signers (public), one button.
 */
export function PetitionPage() {
  const q = useQuery(trpc.petition.get.queryOptions());
  const hall = useQuery(trpc.council.election.queryOptions());
  const act = useNationAct();
  if (q.isError) return <LoadError retry={() => void q.refetch()} />;
  if (!q.data) return <Loading what="Fetching the petition…" />;
  const p = q.data;
  const o = p.open;
  const stamp = !o && p.last ? (p.last.outcome === 'dissolved' ? 'dissolved' : 'fellShort') : null;
  return (
    <NationFrame
      header={
        hall.data?.hall ? (
          <HallHeader hall={hall.data.hall} cityName={p.city.name} night={hall.data.hall.night.night} />
        ) : (
          <NationHeader kicker={PE.kicker(p.city.name)} title={p.city.name} testId="petition-header" />
        )
      }
    >
      <div className="flex flex-col gap-3" data-testid="petition-page" data-state={o ? 'open' : stamp ?? 'none'}>
        <h1 className="label-caps text-[13px]" data-testid="petition-kicker">
          {PE.kicker(p.city.name)}
        </h1>
        {o ? (
          <>
            <SignatureBar count={o.count} needed={o.needed} text={PE.count(o.count, o.needed)} />
            <p className="font-mono text-[12px]" data-testid="petition-note">
              {PE.note(o.needed, formatUntil(o.until), dayWeekday(o.closesDay))}
            </p>
            {o.townHall > 0 && <p className="font-mono text-[12px] text-petrol" data-testid="petition-town-hall">The Town Hall added {o.townHall}</p>}
            <section aria-label="Who signed">
              <h2 className="label-caps text-[11px]">Signed</h2>
              <ul data-testid="petition-signers">
                {o.signers.map((s) => (
                  <li key={s.name} className="flex min-h-9 items-center border-b border-dotted border-faint font-body text-[14px]">
                    {s.name}
                  </li>
                ))}
              </ul>
            </section>
            {o.you === 'sign' ? (
              <Button
                variant="primary"
                disabled={!p.canSign.ok}
                pending={act.pending === 'sign'}
                onClick={() => void act.run('sign', (k) => trpcClient.petition.sign.mutate({ petitionId: o.id, idempotencyKey: k }))}
                data-testid="petition-sign"
              >
                {PE.sign}
              </Button>
            ) : o.you === 'signed' ? (
              <span className="font-mono text-[12px] text-petrol" data-testid="petition-signed">
                {PE.signed}
              </span>
            ) : o.you === 'councillor' ? (
              <span className="font-mono text-[12px] text-muted" data-testid="petition-councillor">
                {PE.councillorsCant}
              </span>
            ) : (
              <span className="font-mono text-[12px] text-muted">{gateWords(p.canSign.why)}</span>
            )}
          </>
        ) : (
          <>
            {p.last && (
              <SignatureBar
                count={p.last.count}
                needed={p.last.needed}
                text={PE.count(p.last.count, p.last.needed)}
                stamp={stamp}
              />
            )}
            <p className="font-mono text-[12px] text-muted" data-testid="no-petition">
              {copy.nation.empty.noPetition}
            </p>
            {p.canOpen.ok ? (
              <Button
                variant="outline"
                pending={act.pending === 'open'}
                onClick={() => void act.run('open', (k) => trpcClient.petition.open.mutate({ idempotencyKey: k }))}
                data-testid="petition-open"
              >
                {PE.openIt}
              </Button>
            ) : (
              p.canOpen.why && <span className="font-mono text-[12px] text-muted">{gateWords(p.canOpen.why)}</span>
            )}
          </>
        )}
        <p className="font-mono text-[11.5px] text-muted">{PE.townHall}</p>
        <Notice error={act.error} />
        <HelpButton notes={[copy.nation.help.petition()]} label={PE.kicker(p.city.name)} className="self-start">
          <span className={`inline-flex min-h-11 items-center font-mono text-[12px] ${helpMark}`}>How a petition works</span>
        </HelpButton>
        <Link to="/council" className="inline-flex min-h-11 items-center self-start font-mono text-[12px] underline underline-offset-2">
          The council
        </Link>
      </div>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </NationFrame>
  );
}
