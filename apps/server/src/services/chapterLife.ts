import type { Chapter, GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character } from '@irongate/db';
import type { CharacterDoc, StoredPatron } from '@irongate/db';
import { NO_PERKS, addFavour, ambitionLegacy, protegeLegacy } from '@irongate/rules';
import type { DayKey, DossierKnock, LegacyRow } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { landEntry } from './dossierService';
import { addLegacyInTx, legacyKnock } from './legacyService';

/**
 * Slice 8 phase B, lane 2 (T14; design §8, §16.2): what a chapter of *Finish His Work* 4–12, *Clear
 * His Name* 2 or *Settle His Debts* 3 adds beyond slice 2's check, in the chapter's transaction: an
 * entry by hand (certain; Brandauer is a dossier-only name), Favour with a patron on every outcome
 * (ch 7: Crane +5; a tier crossed is dated, Protégé's Legacy row with it), and the Ambition's last
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
  }
  const rows: LegacyRow[] = [];
  if (story.favour) {
    const { patronId, value } = story.favour;
    const patrons: StoredPatron[] = [...(c.patrons ?? [])];
    const k = patrons.findIndex((p) => p.id === patronId);
    const p: StoredPatron =
      k >= 0
        ? patrons[k]!
        : { id: patronId, favour: 0, firstVisitDay: null, requests: [], next: 0, tierDays: {}, favourDay: null, discretionUntil: null, thanks: [] };
    const add = addFavour(p.favour, value, { ...NO_PERKS, ...(c.legacy?.perks ?? {}) });
    const tierDays = { ...(p.tierDays ?? {}) };
    for (const t of add.crossed) {
      tierDays[t] ??= i.today;
      if (t === 'protege') rows.push(protegeLegacy(patronId, i.today));
    }
    const next = { ...p, favour: add.favour, tierDays };
    if (k >= 0) patrons[k] = next;
    else patrons.push(next);
    await Character.updateOne({ _id: c._id }, { $set: { patrons } }, { session });
    lines.push(copy.life.patron.favourKnock(content.patron(patronId)?.name ?? patronId, p.favour, add.favour));
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
