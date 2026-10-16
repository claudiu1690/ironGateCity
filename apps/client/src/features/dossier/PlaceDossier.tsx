import type { PatronCardView, PoliticalResult } from '@irongate/rules';
import { ExposeTicket, PatronCard, StationSellCard, StationSellSheet } from '@irongate/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { trpc, trpcClient } from '../../lib/trpc';
import { qNotice } from './errors';

/** The city page's political act (`usePoliticalAct`): its modal is the page's own. */
interface PlaceAct {
  run: (label: string, call: (idempotencyKey: string) => Promise<PoliticalResult>) => Promise<void>;
  pending: string | null;
  error: unknown;
}

/**
 * Slice 8 phase C, lane Q (screens §6.3, §7, §8.1; tech design §12.1): a place's Dossier and patron
 * cards, first in the sheet's card slot (the patron above the shop above Jobs): the patron who
 * receives here (Herald House, the Pier Hotel), the press's exposé ticket, the station's man by the
 * left-luggage. Every act is one tap through the page's political act (one key per tap).
 */
export function PlaceDossierCards({
  locationId,
  kind,
  open,
  act,
}: {
  locationId: string;
  kind: string;
  open: boolean;
  act: PlaceAct;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const life = useQuery({ ...trpc.life.place.queryOptions({ locationId }), enabled: open });
  const patron = (life.data as { patron?: PatronCardView | null } | undefined)?.patron ?? null;
  const station = useQuery({
    ...trpc.dossier.station.queryOptions({ locationId }),
    enabled: open && kind === 'station',
    refetchOnMount: 'always',
  });
  const press = useQuery({
    ...trpc.expose.get.queryOptions({ locationId }),
    enabled: open && kind === 'press',
    refetchOnMount: 'always',
  });
  const [selling, setSelling] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  // Screens §8.1: the first tap on the card's place is the visit (set-once; the letters' clock).
  const visited = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !patron || patron.visited || !patron.level || visited.current === patron.id) return;
    visited.current = patron.id;
    void trpcClient.patron.visit
      .mutate({ patronId: patron.id })
      .then(() => queryClient.invalidateQueries({ queryKey: trpc.life.place.queryKey({ locationId }) }))
      .catch(() => undefined);
  }, [open, patron, locationId, queryClient]);

  const notice = (card: string) => (act.pending === null && act.error && last === card ? (qNotice(act.error, 'patron') ?? null) : null);
  const go = (card: string, label: string, call: (k: string) => Promise<PoliticalResult>) => {
    setLast(card);
    void act.run(label, call);
  };

  return (
    <div className="flex flex-col gap-2" data-testid="place-dossier">
      {patron && (
        <PatronCard
          card={patron}
          onGift={() =>
            go('patron', 'gift', (k) => trpcClient.patron.gift.mutate({ patronId: patron.id, idempotencyKey: k }))
          }
          giftPending={act.pending === 'gift'}
          onFavour={(issueDocId) =>
            go('patron', 'favour', (k) =>
              trpcClient.patron.favour.mutate({ patronId: patron.id, ...(issueDocId ? { issueDocId } : {}), idempotencyKey: k }),
            )
          }
          favourPending={act.pending === 'favour'}
          notice={notice('patron')}
        />
      )}
      {kind === 'press' && press.data && (
        <ExposeTicket
          refusal={press.data.step === 2 ? null : press.data.refusal}
          onOpen={() => void navigate({ to: '/dossier/expose', search: { loc: locationId } })}
        />
      )}
      {kind === 'station' && station.data && (
        <>
          <StationSellCard station={station.data} onOpen={() => setSelling(true)} />
          {notice('station') && (
            <p role="status" className="font-mono text-[12px] text-collective">
              {notice('station')}
            </p>
          )}
          <StationSellSheet
            open={selling}
            onOpenChange={setSelling}
            station={station.data}
            pendingId={act.pending?.startsWith('sell-') ? act.pending.slice(5) : null}
            notice={notice('station')}
            onSell={(id) => {
              setSelling(false);
              go('station', `sell-${id}`, (k) => trpcClient.dossier.sell.mutate({ locationId, id, idempotencyKey: k }));
            }}
          />
        </>
      )}
    </div>
  );
}
