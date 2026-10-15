import type { GameContent } from '@irongate/content';
import { Bill, IssueModel, Nation, OfficeTerm } from '@irongate/db';
import type { BillDoc, IssueDoc, NationDoc, OfficeTermDoc } from '@irongate/db';
import { PRESIDENT, dayKey, termOf, weekKey } from '@irongate/rules';
import type { FactionId, PoliticalResult, PresidentPageView } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { addPoints } from './ledger';
import { currentTerm, nationResult, runNationAct } from './nationAct';
import type { NationActDeps } from './nationAct';

/**
 * Slice 7 T18 (docs/tech/slice-7.md §8.1, §8.2; design §3, §5.5, §6.1): the President's page and the
 * Address (100 momentum on a live Issue of any open city, once a national term, in the President's
 * name). The veto is `parliamentService.veto`. Every power re-reads the `president` term in its
 * transaction (ADR 0020); the Address is set once on `powers.address`.
 */

/** `president.address` (§7.2): the term (`powers.address` absent) and a live Issue of any open city. */
export function address(deps: NationActDeps<{ issueDocId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'president.address', async (x) => {
    const { c, session, today } = x;
    const term = await currentTerm(session, c._id, 'president', today);
    if (!term) throw new GameError('NOT_PRESIDENT');
    if (term.powers?.address) throw new GameError('ADDRESS_USED', { day: term.powers.address.day });
    const issue = await IssueModel.findById(deps.input.issueDocId).session(session).lean<IssueDoc>();
    if (!issue || issue.status !== 'live' || !content.city(issue.cityId)?.council)
      throw new GameError('NOT_AN_ISSUE', { issueDocId: deps.input.issueDocId }, 'BAD_REQUEST');
    const f = c.factionId;
    const before = { ...issue.momentum };
    const inc = await IssueModel.updateOne(
      { _id: issue._id, status: 'live' },
      { $inc: { [`momentum.${f}`]: PRESIDENT.address } },
      { session },
    );
    if (inc.matchedCount === 0) throw new GameError('NOT_AN_ISSUE', {});
    const used = await OfficeTerm.updateOne(
      { _id: term._id, 'powers.address': { $exists: false } },
      { $set: { 'powers.address': { day: today, cityId: issue.cityId, issueDocId: issue._id } } },
      { session },
    );
    if (used.matchedCount === 0) throw new GameError('ADDRESS_USED');
    await addPoints(session, {
      c,
      cityId: issue.cityId,
      placeId: issue.districtId ?? issue.cityId,
      docId: issue._id,
      points: PRESIDENT.address,
      at: new Date(x.now),
    });
    const spec = content.issue(issue.issueId);
    const after = { ...before, [f]: (before[f] ?? 0) + PRESIDENT.address } as Record<FactionId, number>;
    return nationResult(content, x, {
      act: 'address',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { issueShort: spec?.short ?? issue.issueId },
      // Phase C, lane Y: the Address's knock-on, as the Governor's (before → after on the Issue).
      knockOns: {
        issue: { name: spec?.name ?? issue.issueId, added: PRESIDENT.address, before, after },
      },
      view: { kind: 'president', president: await presidentView(content, c._id, x.now, session) },
    });
  });
}

/** `office.president` (§8.3): the holder, the pledges, the week's bill, the veto card, the Address. */
export async function presidentView(
  content: GameContent,
  me: { equals(o: unknown): boolean } | null,
  now: number,
  session: ClientSession | null = null,
): Promise<PresidentPageView> {
  const today = dayKey(now);
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const nation = await s(Nation.findById('republic')).lean<NationDoc>();
  if (!nation) throw new GameError('NATION_NOT_READY', {}, 'CONFLICT');
  const p = nation.government.president;
  const term = p.termId ? await s(OfficeTerm.findById(p.termId)).lean<OfficeTermDoc>() : null;
  const n = termOf(today).index;
  const week = await s(Bill.findOne({ slotKey: `president:${n}:${weekKey(today)}` })).lean<BillDoc>();
  const signable = await s(Bill.find({ status: 'awaitingSignature', signatureDay: today, vetoable: true })).lean<BillDoc[]>();
  const vetoBill = term?.powers?.veto ? await s(Bill.findById(term.powers.veto.billId)).lean<BillDoc>() : null;
  const live = await s(IssueModel.find({ status: 'live' }).sort({ cityId: 1, order: 1 })).lean<IssueDoc[]>();
  const lawName = (id: string | null) => (id ? (content.law(id)?.name ?? id) : '');
  const used = term?.powers?.address;
  return {
    holder: { name: p.holder.name, factionId: p.holder.factionId, figure: p.holder.kind === 'npc', since: p.since, via: p.via },
    you: !!(me && p.holder.kind === 'player' && me.equals(p.holder.characterId)),
    until: termOf(today).toDay,
    pledges: (term?.pledges ?? []).map((pl) => ({ lawId: pl.lawId, name: lawName(pl.lawId), kept: pl.keptDay !== null })),
    week: { tabled: week ? { lawName: lawName(week.lawId), day: week.tabledDay } : null, canTable: !week },
    veto: {
      used: vetoBill ? { lawName: lawName(vetoBill.lawId), day: term!.powers!.veto!.day } : null,
      signable: signable.map((b) => ({ billId: b._id.toHexString(), law: lawName(b.lawId), forVotes: b.division?.for ?? 0 })),
    },
    address: {
      used: used ? { issueShort: content.issue(live.find((i) => i._id === used.issueDocId)?.issueId ?? '')?.short ?? '', day: used.day } : null,
      issues: live
        .filter((i) => !!content.city(i.cityId)?.council)
        .map((i) => ({ docId: i._id, cityId: i.cityId, name: content.issue(i.issueId)?.name ?? i.issueId, short: content.issue(i.issueId)?.short ?? i.issueId })),
    },
    pay: { ...PRESIDENT.stipend },
  };
}

export async function getPresident(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<PresidentPageView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  return presidentView(deps.content, doc._id, now);
}
