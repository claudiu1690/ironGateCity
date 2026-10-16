import type { QueryClient } from '@tanstack/react-query';
import type { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../lib/trpc';

/**
 * Slice 8 phase C, lane Q (screens §6.1, §8.2): a place by its id. In the city you stand in, its
 * sheet on the city map (the capital: in its district); elsewhere, the nation map at the place's
 * city card when it is known, else the nation map.
 */
export async function goToPlace(
  queryClient: QueryClient,
  navigate: ReturnType<typeof useNavigate>,
  locationId: string,
  cityHint?: string | null,
): Promise<void> {
  const me = await queryClient.fetchQuery(trpc.character.me.queryOptions());
  if (!me.journey && !me.held) {
    const city = await queryClient.fetchQuery(trpc.city.get.queryOptions({ cityId: me.cityId }));
    const loc = city.locations.find((l) => l.id === locationId);
    if (loc) {
      if (loc.quarterId)
        await navigate({
          to: '/city/$cityId/$quarterId',
          params: { cityId: me.cityId, quarterId: loc.quarterId },
          search: { loc: locationId },
        });
      else await navigate({ to: '/city/$cityId', params: { cityId: me.cityId }, search: { loc: locationId } });
      return;
    }
  }
  await navigate({ to: '/nation', search: cityHint ? { city: cityHint } : {} });
}
