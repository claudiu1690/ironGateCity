import { copy } from '@irongate/content/copy';
import { formatClock } from '@irongate/ui';
import { gameErrorOf } from '../../lib/trpc';

/** A refused request, worded for the player. The server's reason decides; the client only words it. */
export function noticeFor(error: unknown): string | undefined {
  if (!error) return undefined;
  const game = gameErrorOf(error);
  switch (game?.reason) {
    case 'NOT_ENOUGH_ENERGY': {
      const at = typeof game.nextTickAt === 'number' ? game.nextTickAt : null;
      return copy.needsEnergy(Number(game.cost), at === null ? '—' : formatClock(at));
    }
    case 'SHIFT_ALREADY_WORKED':
      return copy.shiftWorked(typeof game.nextAt === 'number' ? formatClock(game.nextAt) : '—');
    case 'NOT_YOUR_JOB':
      return game.jobId ? copy.shiftNotYourJob : copy.shiftNoJob;
    case 'JOB_LOCKED':
      return copy.jobNeeds([
        game.stat ? `${String(game.stat).toUpperCase()} ${String(game.need)}` : `Level ${String(game.need)}`,
      ]);
    case 'WRONG_CITY':
      return 'You are not in this city.';
    case 'ACTION_CONFLICT':
      return 'Too many things at once. Tap again.';
    case 'NO_STAT_POINTS':
      return 'No points to place.';
    // Slice 2: the arrival and the Ambition chapters.
    case 'NO_FACE':
      return copy.chooseYourFace;
    case 'OUT_OF_ORDER':
    case 'ORIGIN_INCOMPLETE':
    case 'ALREADY_ARRIVED':
      return 'This story moved on in another window. Reload to carry on.';
    case 'BAD_NAME':
      return game.problem === 'long'
        ? copy.nameTooLong
        : game.problem === 'short'
          ? copy.nameTooShort
          : copy.nameBlank;
    case 'CHAPTER_NOT_READY':
      return 'This chapter is not open yet.';
    case 'CHOOSE_FIRST':
      return 'Make your choice first.';
    default:
      return 'That did not go through. Check your connection and tap again.';
  }
}
