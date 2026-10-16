import type { GameContent } from '@irongate/content';
import { ActionLog } from '@irongate/db';
import type { CharacterDoc, PaperEntryDoc } from '@irongate/db';
import { dayStart, fillTemplate, fitDeck } from '@irongate/rules';
import type { DayKey, ExposeOutcome, PaperView } from '@irongate/rules';
import { exposeVars } from './lifeSettlement';

/**
 * Slice 8 phase B, lane 2 (T16; tech design §11.1; §22.1 Q28): the paper's life part at read. The
 * desk's rows and the Letters' Requests, reports and gossip were stored at the settlement; the public
 * exposé line is live: yesterday's most recent printed exposé, in the reader's paper's voice
 * (`hl.*.expose-front`), *By {name}*. The author's own paper carries it as its stored front page,
 * so it is not printed twice there.
 */
export async function lifePaper(
  content: GameContent,
  c: Pick<CharacterDoc, '_id'>,
  entry: Pick<PaperEntryDoc, 'desk' | 'cityId' | 'headlines'>,
  today: DayKey,
): Promise<NonNullable<PaperView['life']>> {
  const stored = entry.desk.life ?? null;
  return {
    desk: stored?.desk ?? null,
    letters: stored?.letters ?? [],
    publicExpose: await publicExpose(content, c, entry, today),
  };
}

async function publicExpose(
  content: GameContent,
  c: Pick<CharacterDoc, '_id'>,
  entry: Pick<PaperEntryDoc, 'cityId' | 'headlines'>,
  today: DayKey,
): Promise<{ headline: string; deck: string } | null> {
  const log = await ActionLog.findOne(
    {
      kind: 'expose',
      outcome: 'success',
      // The act's own clock (`performedAt`), not the insert's (the test clock moves the game's).
      'result.performedAt': { $gte: new Date(dayStart(today - 1)).toISOString(), $lt: new Date(dayStart(today)).toISOString() },
    },
    { characterId: 1, result: 1 },
  )
    .sort({ 'result.performedAt': -1 })
    .lean();
  if (!log) return null;
  const out = (log.result as { effects?: { expose?: ExposeOutcome } } | undefined)?.effects?.expose;
  if (!out) return null;
  const template = content.headlinesOf(entry.cityId).find((t) => t.when.some((w) => w.kind === 'exposePrinted'));
  if (!template) return null;
  // The author's own paper already carries it as the stored front page.
  if (log.characterId.equals(c._id) && entry.headlines.some((h) => h.templateId === template.id)) return null;
  const vars = exposeVars(content, out);
  return {
    headline: fillTemplate(template.headline, vars),
    deck: fitDeck(fillTemplate(template.deck ?? '', vars)),
  };
}
