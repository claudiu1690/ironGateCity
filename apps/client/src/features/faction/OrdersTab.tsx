import { copy } from '@irongate/content/copy';
import { EventCard, OrdersList } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCharacter } from '../game/hooks';
import { trpc } from '../../lib/trpc';

/**
 * Slice 6 (screens §2.1): the Faction tab's Orders. The city screen's orders as they are (the
 * secretary, the three orders with progress, each pin a link to its place), and under them today's
 * fixture as an `EventCard` under *The branch's event today* (design §4).
 */
export function OrdersTab() {
  const navigate = useNavigate();
  const { character } = useCharacter();
  const hq = useQuery(trpc.faction.hq.queryOptions());
  if (!character) return null;
  const orders = hq.data?.orders ?? character.orders;
  const fixture = hq.data?.fixture ?? null;
  const openEvent = (eventId: string) =>
    void navigate({ to: '/faction/events/$eventId', params: { eventId } });
  // An event order links to its event or to the board (tech §8.3, `OrderView.link`).
  const eventOrder = orders.items.find((o) => !o.done && o.link);
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-4 text-ink" data-testid="faction-orders">
      {orders.off ? (
        <p className="font-mono text-[12px] text-failure" data-testid="orders-off">
          {copy.together.ordersOffCells}
        </p>
      ) : (
        <OrdersList
          orders={orders}
          variant="paper"
          onPin={(locationId, orderId) =>
            void navigate({
              to: '/city/$cityId',
              params: { cityId: character.cityId },
              search: { loc: locationId, order: orderId },
            })
          }
        />
      )}
      {eventOrder?.link && (
        <button
          type="button"
          onClick={() =>
            eventOrder.link!.kind === 'event'
              ? openEvent(eventOrder.link!.eventId)
              : void navigate({ to: '/faction', search: { tab: 'events' } })
          }
          className="label-caps -mt-2 min-h-11 cursor-pointer self-start text-[12px] text-petrol underline-offset-2 hover:underline"
          data-testid="order-event-link"
        >
          {eventOrder.title} ›
        </button>
      )}
      {fixture && (
        <section className="flex flex-col gap-2" data-testid="orders-fixture">
          <h2 className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
            {copy.together.fixtureKicker}
          </h2>
          <EventCard event={fixture} onOpen={() => openEvent(fixture.id)} />
        </section>
      )}
    </section>
  );
}
