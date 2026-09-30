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
    // Slice 3: the political acts. The screen refetches and shows the settled state.
    case 'NOT_ENOUGH_PC':
      return copy.needsPc(Number(game.cost));
    case 'NOT_NOMINATIONS':
      return 'Too late to stand this time: names went in before voting opened.';
    case 'NOT_POLLING':
      return 'Voting has closed.';
    case 'ALREADY_VOTED':
      return `You have already voted${game.name ? ` for ${String(game.name)}` : ''}.`;
    case 'ALREADY_ENDORSED':
      return `You're already backing ${String(game.name ?? 'a candidate')} this election.`;
    case 'ALREADY_FILED':
      return "You're already standing in this election.";
    case 'CANDIDACY_CLOSED':
      return 'That name is no longer on the list.';
    case 'COUNCIL_CLOSED':
      return 'The council is not voting now.';
    case 'ALREADY_COUNCIL_VOTED':
      return 'Your vote is already recorded.';
    case 'ALREADY_PROPOSED':
      return 'You have already put forward a rule this term.';
    case 'ALREADY_ON_PAPER':
      return 'That rule is already up for a vote.';
    case 'PAPER_FULL':
      return copy.paperFull;
    case 'RANK_TOO_LOW':
      return `Needs Rank ${String(game.need)}.`;
    case 'NOT_KNOWN':
      return 'Needs a Known reputation here (30 wins).';
    case 'SITTING_COUNCILLOR':
      return 'You hold a seat: you can stand again the day your term ends.';
    case 'ELECTION_NOT_READY':
      return 'The result is still being counted. Try again in a moment.';
    default:
      return 'That did not go through. Check your connection and tap again.';
  }
}
