import { copy } from '@irongate/content/copy';
import { Link } from '@tanstack/react-router';
import { gameErrorOf } from '../../lib/trpc';

/**
 * Review 5 (ADR 0081, §21.1 Q11): under a refusal `PATROL_PENDING`, the way to the card: the city it
 * waits in (the Map tab shows it over the map). Nothing for any other refusal.
 */
export function PatrolLink({ error }: { error: unknown }) {
  const game = gameErrorOf(error);
  if (game?.reason !== 'PATROL_PENDING' || typeof game.cityId !== 'string') return null;
  return (
    <Link
      to="/city/$cityId"
      params={{ cityId: game.cityId }}
      className="label-caps inline-flex min-h-11 items-center text-[11px] underline underline-offset-2"
      data-testid="patrol-link"
    >
      {copy.patrol.toTheCard}
    </Link>
  );
}
