import { copy } from '@irongate/content/copy';
import { formatClock, weekdayOf } from '@irongate/ui';
import { gameErrorOf } from '../../lib/trpc';
import { noticeFor } from '../game/errors';

/**
 * Slice 8 phase C, lane P: a refused Wardrobe, shop, hire or bar act, worded (copy.life.errors and
 * its siblings). The server decides; anything else falls back to the game's own wording.
 */
export function lifeNotice(error: unknown): string | undefined {
  if (!error) return undefined;
  const game = gameErrorOf(error);
  const e = copy.life.errors;
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0));
  switch (game?.reason) {
    case 'CHANGE_LOCKED':
      return e.changeLocked;
    case 'NOT_OWNED':
      return e.notOwned;
    case 'NOT_WEARABLE':
      return e.notWearable;
    case 'COAT_REQUIRED':
      return e.coatRequired;
    case 'OUTFIT_LOCKED':
      return e.outfitLocked;
    case 'NO_SHOP':
      return e.noShop;
    case 'NOT_SOLD_HERE':
      return e.notSoldHere;
    case 'MEMBERS_ONLY':
      return e.membersOnly;
    case 'LEVEL':
      return e.level(num(game.need));
    case 'RANK':
      return copy.life.minder.fromRank3;
    case 'ALREADY_OWNED':
      return e.alreadyOwned;
    case 'NOT_ENOUGH_IRON':
      return e.notEnoughIron;
    case 'NOT_SELLABLE': {
      const why = String(game.why ?? 'noPrice') as keyof typeof e.notSellable;
      return e.notSellable[why] ?? e.notSellable.noPrice;
    }
    case 'IN_STORY':
      return e.inStory;
    case 'BRIBED_TODAY':
      return e.bribedToday;
    case 'NO_MARKS':
      return e.noMarks;
    case 'WITH_YOU':
      return copy.life.minder.errors.hasOne(String(game.name ?? ''), weekdayOf(num(game.until)));
    case 'PAID_AHEAD':
      return copy.life.minder.errors.paidAhead;
    case 'NOT_AGAINST_POLICE':
      return copy.life.minder.errors.notAgainstPolice;
    case 'ROUNDS_TODAY':
      return copy.life.bar.errors.threeADay;
    case 'SPIRITS_FULL':
      return copy.life.bar.errors.nineInHand;
    case 'WELL_FED':
      return copy.life.bar.errors.wellFed(typeof game.until === 'number' ? formatClock(game.until) : '');
    case 'NOT_DRESSED':
      return copy.life.bar.errors.notDressed;
    case 'NO_BAR':
      return copy.life.bar.errors.notABar;
    case 'NO_DINING':
      return copy.life.bar.errors.noDining;
    default:
      return noticeFor(error);
  }
}
