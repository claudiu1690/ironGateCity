import type { Chapter, GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { ambitionLegacy } from '@irongate/rules';
import type { DayKey, DossierKnock, LegacyRow } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { landEntry } from './dossierService';
import { addLegacyInTx, legacyKnock } from './legacyService';
import { addFavourInTx, advanceRequestsInTx } from './patronService';

/**
 * Slice 8 phase B, lane 2 (T14; design §8, §16.2): what a chapter of *Finish His Work* 4–12, *Clear
 * His Name* 2 or *Settle His Debts* 3 adds beyond slice 2's check, in the chapter's transaction: an
 * entry by hand (certain; Brandauer is a dossier-only name), Favour with a patron on every outcome
 * (ch 7: Crane +5, through lane 1's `addFavourInTx`: a tier crossed is dated, Protégé's piece and Legacy), and the Ambition's last
 * chapter (Legacy +30, `ambition:{id}`). The choice's Iron is paid by the caller's own write.
 */
export async function chapterLifeInTx(
  session: ClientSession,
  content: GameContent,
  c: CharacterDoc,
  story: NonNullable<Chapter['story']>,
  i: { seed: string; now: number; today: DayKey; ambitionId: string },
): Promise<{ dossier: DossierKnock | null; lines: string[]; after: CharacterDoc | null }> {
  const lines: string[] = [];
  let dossier: DossierKnock | null = null;
  let touched = false;
  if (story.dossier) {
    const r = await landEntry(session, content, c, {
      source: 'chapter',
      category: story.dossier.category,
      cityId: content.name(story.dossier.subjectId)?.cityId ?? c.cityId,
      subjectId: story.dossier.subjectId,
      chancePct: 100,
      seed: i.seed,
      row: 'chapter',
      now: i.now,
    });
    dossier = r.knock;
    touched = true;
    // T13: an entry counts toward a Request that asks for entries (from any source).
    if (r.descriptor) {
      const requests = await advanceRequestsInTx(session, content, c._id, [{ a: r.descriptor, outcome: 'success' }], i.now);
      lines.push(...requests.map((q) => q.line));
    }
  }
  const rows: LegacyRow[] = [];
  if (story.favour) {
    // T13: through the patrons' helper, so a crossing dates its tier and Protégé grants the piece.
    const { patronId, value } = story.favour;
    const knock = await addFavourInTx(session, content, c._id, patronId, value, i.now);
    if (knock) lines.push(knock.line);
    touched = true;
  }
  if (story.completes) rows.push(ambitionLegacy(i.ambitionId, i.today));
  if (rows.length > 0) {
    const added = await addLegacyInTx(session, c._id, rows);
    let total = c.legacy?.total ?? 0;
    for (const r of added) {
      total += r.points;
      lines.push(legacyKnock(content, r, total).line);
    }
    touched = touched || added.length > 0;
  }
  const after = touched ? await Character.findById(c._id).session(session).lean<CharacterDoc>() : null;
  return { dossier, lines, after };
}
