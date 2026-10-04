import { copy } from '@irongate/content/copy';
import { formatClock, formatWeekday, weekdayOf } from '@irongate/ui';
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
    // Slice 4: travel, where you live, the capital.
    case 'LEVEL_TOO_LOW':
      return copy.travel.fromLevel(Number(game.need ?? 10));
    case 'IN_TRANSIT':
      return copy.errors.inTransit;
    case 'ALREADY_THERE':
      return copy.errors.alreadyThere;
    case 'DESTINATION_LOCKED':
      return game.lock === 'later' ? copy.travel.noServiceYetCard : copy.travel.rivalGroundLater;
    case 'NOT_ENOUGH_IRON':
      return copy.residence.needsIron(Number(game.cost));
    case 'CARD_CLOSED':
      return copy.errors.cardClosed;
    case 'ALREADY_CHOSEN':
      return copy.errors.alreadyChosen;
    case 'NOT_IN_CITY':
      return copy.errors.notInCity;
    case 'MOVE_COOLDOWN':
      return copy.errors.moveCooldown;
    case 'ALREADY_RESIDENT':
      return copy.errors.alreadyResident;
    // Slice-4 fixes §1, §6 (QA M2, m5).
    case 'ON_BALLOT':
      return copy.errors.onBallot;
    case 'ROOM_PAID_AHEAD':
      return copy.errors.roomPaidAhead(weekdayOf(Number(game.renewFromDay)));
    case 'MEMBERS_ONLY':
      return copy.capital.membersOnly;
    case 'NOT_YET_VOTER':
      return copy.errors.notYetVoter;
    case 'NOT_YET_CANDIDATE':
      return copy.errors.notYetCandidate;
    case 'WRONG_FACTION':
      return copy.errors.wrongFaction;
    // Slice 5: missions, run-ins, the cells and the infirmary, the record, rival ground.
    case 'HELD':
      return game.kind === 'infirmary' ? copy.risk.errors.heldWard : copy.risk.errors.heldCells;
    case 'RUN_IN_PENDING':
      return copy.risk.errors.runInPending;
    case 'NO_RUN_IN':
      return copy.risk.errors.noRunIn;
    case 'MISSION_LOCKED':
      return game.lock === 'LEVEL'
        ? copy.risk.locked.level(Number(game.need))
        : game.lock === 'RANK'
          ? `Needs Rank ${String(game.need)}.`
          : copy.needsReputation(Number(game.need));
    case 'RECORD_BARRED':
      return copy.risk.locked.record;
    case 'ONCE_ON_RIVAL_GROUND':
      return copy.risk.errors.onceOnRivalGround;
    case 'OWN_FACTION_TARGET':
      return copy.risk.errors.ownFaction;
    case 'UNKNOWN_MISSION':
    case 'UNKNOWN_WAY':
      return copy.risk.errors.moved;
    case 'BARRED':
      return copy.risk.rival.barred(
        typeof game.until === 'number' ? `${formatWeekday(game.until)} ${formatClock(game.until)}` : '',
      );
    case 'NOT_HELD':
    case 'NOT_IN_CELLS':
    case 'NOT_IN_INFIRMARY':
      return copy.risk.errors.notHeld;
    case 'NO_MARKS':
      return copy.risk.errors.noMarks;
    case 'CANNOT_PAY':
      return game.why === 'NOT_BRIBABLE' ? copy.risk.wontBeBought : copy.risk.needsIron(Number(game.cost ?? 0));
    default:
      return 'That did not go through. Check your connection and tap again.';
  }
}
