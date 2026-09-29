import type { ActionPreview } from '@irongate/rules';
import { Ticket, formatCountdown } from '@irongate/ui';
import { gameErrorOf } from '../../lib/trpc';

const TYPE_LABEL: Record<string, string> = {
  canvass: 'Canvassing',
  speech: 'Speech',
  propaganda: 'Propaganda',
  training: 'Training',
  intelligence: 'Intelligence',
  job: 'Job',
};

export interface ActionTicketProps {
  action: ActionPreview;
  onPerform: () => void;
  pending: boolean;
  error: unknown;
  now: number;
}

/** A content action as a ticket; turns a refused action into a readable notice. */
export function ActionTicket({ action, onPerform, pending, error, now }: ActionTicketProps) {
  return (
    <Ticket
      name={action.name}
      typeLabel={TYPE_LABEL[action.type] ?? action.type}
      energy={action.energy}
      preview={action.preview}
      onPerform={onPerform}
      pending={pending}
      notice={noticeFor(error, now)}
    />
  );
}

function noticeFor(error: unknown, now: number): string | undefined {
  if (!error) return undefined;
  const game = gameErrorOf(error);
  if (game?.reason === 'NOT_ENOUGH_ENERGY') {
    const nextTickAt = typeof game.nextTickAt === 'number' ? game.nextTickAt : null;
    const wait = nextTickAt ? ` Next +5 Energy in ${formatCountdown(nextTickAt - now)}.` : '';
    return `Not enough Energy: ${String(game.energy)} of ${String(game.cost)}.${wait}`;
  }
  if (game?.reason === 'WRONG_CITY') return 'You are not in this city.';
  if (game?.reason === 'ACTION_CONFLICT') return 'Too many things at once. Tap again.';
  return 'That did not go through. Check your connection and tap again.';
}
