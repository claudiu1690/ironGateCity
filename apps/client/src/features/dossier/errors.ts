import { copy } from '@irongate/content/copy';
import { DOSSIER } from '@irongate/rules';
import { weekdayOf } from '@irongate/ui';
import { gameErrorOf } from '../../lib/trpc';
import { lifeNotice } from '../life/lifeErrors';

/**
 * Slice 8 phase C, lane Q: a refused Dossier, exposé, home, Legacy or patron act, worded
 * (`copy.life.errors`). The server decides; anything else falls back to lane P's and the game's wording.
 */
export function qNotice(error: unknown, where: 'dossier' | 'home' | 'legacy' | 'patron' = 'dossier'): string | undefined {
  if (!error) return undefined;
  const game = gameErrorOf(error);
  const e = copy.life.errors;
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0));
  switch (game?.reason) {
    case 'FILE_HELD':
      return e.fileHeld;
    case 'NOT_ENOUGH_ENTRIES':
      return e.tooFew;
    case 'CASE_FILES_LEVEL':
      return e.level(DOSSIER.caseFileLevel);
    case 'FILE_NOT_FOUND':
      return e.noFile;
    case 'NOT_A_STATION':
      return e.notAtStation;
    case 'NEEDS_PATTERN':
      return e.noPattern;
    case 'NEEDS_ASSOCIATE':
      return copy.life.dossier.needsAssociate(String(game.patron ?? game.patronId ?? ''));
    case 'INFORMANTS_FULL':
      return e.twoInformants;
    case 'BURNED':
      return e.burned(DOSSIER.burnDays);
    case 'OWN_PARTY':
      return e.ownParty;
    case 'NO_PARTY':
      return e.noParty;
    case 'PRINTED_TODAY':
      return e.printedToday;
    case 'NOT_A_PRESS':
      return e.notAtPress;
    case 'NO_PRINTABLE_FILE':
    case 'NO_STORY':
      return copy.life.expose.noFile;
    case 'STORY_ELSEWHERE':
      return e.inStory;
    case 'WRONG_PARTY':
      return copy.life.expose.attachNone;
    case 'NOT_IN_RESIDENCE_CITY':
      return e.notResidence;
    case 'FLAT_OWNED':
      return e.hasFlat;
    case 'FLAT_LEVEL':
      return e.level(10);
    case 'PAID_AHEAD':
      return where === 'home' ? e.rentAhead : lifeNotice(error);
    case 'PERK_MAX':
      return e.perkFull;
    case 'NOT_ENOUGH_LEGACY':
      return e.notEnoughLegacy(num(game.need));
    case 'NO_PATRON_HERE':
      return e.noPatronHere;
    case 'NOT_CONFIDANT':
      return e.notConfidant;
    // Lane 1b's patron refusals (T13).
    case 'GIVEN_TODAY':
      return e.giftGiven;
    case 'PATRON_LEVEL':
      return copy.life.patron.meEmpty;
    case 'NOT_A_PATRON_PLACE':
      return e.noPatronHere;
    case 'FAVOUR_USED':
      return e.favourNotReady(typeof game.from === 'number' ? weekdayOf(game.from) : '');
    case 'NOT_AN_ISSUE':
      return e.notAnIssue;
    case 'SUBJECT_REQUIRED':
      return copy.life.society.pickName;
    default:
      return lifeNotice(error);
  }
}
