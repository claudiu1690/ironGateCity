import type { HereNowView } from '@irongate/rules';
import { HereNowLine } from '@irongate/ui';
import { useEffect, useState } from 'react';
import { trpcClient } from '../../lib/trpc';

/**
 * Slice 6 (screens §6.1, tech design §12.1): *Here now* on a place's sheet. `presence.at` (a mutation:
 * it also marks the member here) is sent when the sheet opens on a place; own-faction names open the
 * profile sheet.
 */
export function PlacePresence({
  locationId,
  open,
  onName,
}: {
  locationId: string;
  open: boolean;
  /** An own-faction name: the profile sheet (lane B's `ProfileFlow`). */
  onName?: (characterId: string) => void;
}) {
  const [view, setView] = useState<{ id: string; v: HereNowView } | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    trpcClient.presence.at
      .mutate({ locationId })
      .then((v) => {
        if (live) setView({ id: locationId, v });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [locationId, open]);
  return <HereNowLine view={view?.id === locationId ? view.v : null} onName={onName} />;
}
