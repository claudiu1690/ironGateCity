import { projectEnergy } from '@irongate/rules';
import type { ActionResult, CharacterView } from '@irongate/rules';
import { Button, HudBar, Plate, ResultModal } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ActionTicket } from '../features/action/ActionTicket';
import { usePerformAction } from '../features/action/usePerformAction';
import { authClient, resetSession } from '../lib/auth';
import { trpc } from '../lib/trpc';
import { useNow } from '../lib/useNow';

const KIND_LABEL: Record<string, string> = { 'factory-gate': 'Factory gate' };
const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind.replace(/-/g, ' ');

/** Energy ticks locally with the same rules function the server uses; the server stays authoritative. */
function useProjectedCharacter(character: CharacterView | undefined, now: number) {
  return useMemo(() => {
    if (!character) return null;
    const p = projectEnergy(
      { value: character.energy.value, rested: character.rested, updatedAt: character.energy.updatedAt },
      now,
      character.energy.max,
    );
    const view: CharacterView = {
      ...character,
      rested: p.rested,
      energy: {
        value: p.value,
        max: p.max,
        updatedAt: p.updatedAt,
        nextTickAt: p.nextTickAt,
        fullAt: p.fullAt,
      },
    };
    return { view, nextTickIn: p.nextTickAt === null ? null : p.nextTickAt - now };
  }, [character, now]);
}

export function CityPage() {
  const { cityId } = useParams({ from: '/city/$cityId' });
  const navigate = useNavigate();
  const now = useNow(1_000);
  const me = useQuery(trpc.character.me.queryOptions());
  const city = useQuery(trpc.city.get.queryOptions({ cityId }));
  const hud = useProjectedCharacter(me.data, now);

  const [result, setResult] = useState<ActionResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const action = usePerformAction((r) => {
    setResult(r);
    setModalOpen(true);
  });

  async function signOut() {
    await authClient.signOut();
    await resetSession();
    await navigate({ to: '/login' });
  }

  if (me.isError || city.isError) {
    return (
      <main className="min-h-dvh bg-ink p-4 text-paper">
        <p role="alert" className="font-body">
          The city could not be loaded. Check your connection and try again.
        </p>
        <Button variant="outline-light" className="mt-3" onClick={() => void city.refetch()}>
          Try again
        </Button>
      </main>
    );
  }

  const lastAction = result ? { id: result.action.id, locationId: result.place.locationId } : null;
  const lastActionCost =
    city.data?.locations.flatMap((l) => l.actions).find((a) => a.id === lastAction?.id)?.energy ?? 0;

  return (
    <div className="min-h-dvh bg-ink">
      {hud ? <HudBar character={hud.view} nextTickIn={hud.nextTickIn} /> : <div className="h-14 bg-ink" />}

      <main className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-4 pb-10">
        {city.data ? (
          <>
            <Plate
              title={city.data.name}
              kicker={
                city.data.role === 'home' ? `Home city · ${hud?.view.factionName ?? ''}` : 'Battleground'
              }
            />
            {city.data.locations.map((location) => (
              <section
                key={location.id}
                aria-labelledby={`loc-${location.id}`}
                className="paper-grain flex flex-col gap-3 border border-ink p-3"
              >
                <div className="flex flex-col gap-1 border-b-2 border-ink pb-2">
                  <span className="label-caps text-[10px] text-muted">{kindLabel(location.kind)}</span>
                  <h2 id={`loc-${location.id}`} className="font-display text-[26px] leading-none font-black">
                    {location.name}
                  </h2>
                  <p className="font-body text-[14px] text-text-2">{location.blurb}</p>
                </div>
                {location.actions.map((a) => (
                  <ActionTicket
                    key={a.id}
                    action={a}
                    now={now}
                    pending={action.isPending && action.variables?.actionId === a.id}
                    error={action.variables?.actionId === a.id && !modalOpen ? action.error : null}
                    onPerform={() => action.perform(a.id, location.id)}
                  />
                ))}
              </section>
            ))}
          </>
        ) : (
          <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
            Loading the city…
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline-light" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </main>

      <ResultModal
        result={result}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAgain={lastAction ? () => action.perform(lastAction.id, lastAction.locationId) : undefined}
        againPending={action.isPending}
        againDisabled={!hud || hud.view.energy.value < lastActionCost}
      />
    </div>
  );
}
