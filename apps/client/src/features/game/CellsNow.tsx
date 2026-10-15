import type { FactionId } from '@irongate/rules';
import { CellsNowCard } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { noteServerNow, useNow } from '../../lib/useNow';
import { FavourFlow } from '../faction/FavourFlow';
import type { FavourTarget } from '../faction/FavourFlow';

/**
 * Review 4 #19 (answers §19, tech design §11.5): *In the cells now* in a police station's card slot.
 * It asks the server when the sheet opens and every 60 s while it stays open (`held.inCells`, read
 * through the partial index); the *out in n min* lines tick on the server's clock.
 */
export function CellsNow({
  locationId,
  open,
  factionNames,
}: {
  locationId: string;
  open: boolean;
  factionNames: Partial<Record<FactionId, string>>;
}) {
  const q = useQuery({
    ...trpc.held.inCells.queryOptions({ locationId }),
    enabled: open,
    refetchOnMount: 'always',
    refetchInterval: open ? 60_000 : false,
  });
  const serverNow = q.data?.serverNow;
  useEffect(() => {
    if (serverNow !== undefined) noteServerNow(serverNow);
  }, [serverNow]);
  const now = useNow(15_000);
  // Slice 6 (screens §7.1, review 4 addendum): *Post bail* on a faction mate's row, the same sheet.
  const [bail, setBail] = useState<FavourTarget | null>(null);
  const [posted, setPosted] = useState<Set<string>>(() => new Set());
  return (
    <>
      <CellsNowCard
        rows={q.data?.rows}
        now={now}
        factionNames={factionNames}
        onPostBail={(r) => setBail({ characterId: r.mate.characterId, kind: 'bail' })}
        posted={posted}
      />
      <FavourFlow
        target={bail}
        onClose={() => setBail(null)}
        onDone={(t) => setPosted((s) => new Set(s).add(t.characterId))}
      />
    </>
  );
}
