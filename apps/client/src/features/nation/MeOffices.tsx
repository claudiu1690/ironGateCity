import { LadderCard, OfficeCard } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../lib/trpc';

/**
 * Slice 7 (screens §3): the Me tab's offices and the ladder. An `OfficeCard` per office held (a tap
 * opens its page), then the `LadderCard` (alone when nothing is held: screens §13).
 */
export function MeOffices() {
  const navigate = useNavigate();
  const q = useQuery(trpc.office.mine.queryOptions());
  if (!q.data) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="me-offices">
      {q.data.offices.map((o) => (
        <OfficeCard
          key={`${o.office}:${o.route}`}
          office={o}
          onOpen={(route) => void navigate({ to: route })}
        />
      ))}
      <LadderCard ladder={q.data.ladder} />
    </div>
  );
}
