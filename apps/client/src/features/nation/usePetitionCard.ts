import { copy } from '@irongate/content/copy';
import { formatUntil } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../lib/trpc';

/**
 * Slice 7 (screens §9.1): the Election card's petition line and button, for the residence city's
 * council. Absent unless a petition is open, or one can be opened now (the server's gate).
 */
export function usePetitionCard(cityId: string | null): { line: string | null; label: string; onOpen: () => void } | null {
  const navigate = useNavigate();
  const q = useQuery({ ...trpc.petition.get.queryOptions(), enabled: !!cityId });
  const p = q.data;
  // Only on the council's own city (the petition is the residence city's).
  if (!cityId || !p || p.city.id !== cityId) return null;
  const onOpen = () => void navigate({ to: '/council/petition' });
  const PE = copy.nation.petition;
  if (p.open) {
    const o = p.open;
    const label = o.you === 'signed' ? PE.signed : o.you === 'councillor' ? PE.councillorsCant : PE.sign;
    return { line: PE.line(o.count, o.needed, formatUntil(o.until)), label, onOpen };
  }
  if (p.canOpen.ok) return { line: null, label: PE.open, onOpen };
  return null;
}
