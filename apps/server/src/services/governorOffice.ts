import type { GameContent } from '@irongate/content';
import { Character, City, IssueModel, OfficeTerm, RuleBallot } from '@irongate/db';
import type { CharacterDoc, CityDoc, IssueDoc, OfficeTermDoc } from '@irongate/db';
import { GOVERNOR, councilDay, councilKey, dayKey, dayStart } from '@irongate/rules';
import type { FactionId, GovernorPageView, PoliticalResult } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureCityDay } from './cityDay';
import { loadCharacter } from './dayService';
import { addPoints } from './ledger';
import { currentTerm, nationResult, runNationAct } from './nationAct';
import type { NationActDeps, NationCtx } from './nationAct';
import { hallView, ruleMenu, weekdayName } from './politicsService';
import { isContested, residenceOf } from './residence';
import { ballotCards } from './ruleBallot';

/**
 * Slice 7 T13 (docs/tech/slice-7.md §7.2, §8.1–§8.3, §10.1; ADR 0048; design §3): the Governor's
 * (home) or the Mayor's (the capital, Clearwater) powers and page. The rule heads the party's card
 * at the set (`ruleBallot.cardHeads`), changeable on cycle days 0–1 and serialised with the set by
 * `$inc changes` on the open ballot, as `council.setRule` (ADR 0084 §5); the Address is 50 momentum
 * on a live Issue of the city, once a term. Every power re-reads the `governor` term in its
 * transaction (ADR 0020); `city.council.governor` is for display only. Kept apart from
 * `governorService.ts` (the count's writer), which the city days import.
 */

const titleOf = (content: GameContent, cityId: string): 'Governor' | 'Mayor' =>
  isContested(content, cityId) ? 'Mayor' : 'Governor';

const menuOf = (content: GameContent, cityId: string) =>
  content.isDistricted(cityId) ? content.irongateMenu() : content.ordinancesMenu();

/** The Governor's term, else the refusal: a local holds the residence city's chair, or not the Governor. */
async function asGovernor(x: NationCtx): Promise<OfficeTermDoc> {
  const term = await currentTerm(x.session, x.c._id, 'governor', x.today);
  if (term) return term;
  const city = await City.findById(residenceOf(x.c).cityId, { council: 1 }).session(x.session).lean<CityDoc>();
  if (city?.council?.governor?.local) throw new GameError('LOCAL_HOLDS', { name: city.council.governor.name });
  throw new GameError('NOT_GOVERNOR');
}

/** `governor.setRule` (§7.2): the party's card 1 on the town's ballot, free, on cycle days 0–1. */
export function setRule(deps: NationActDeps<{ ordinanceId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'governor.rule', async (x) => {
    const { c, session, today } = x;
    const term = await asGovernor(x);
    const cityId = term.cityId;
    const city = content.city(cityId)!;
    const cal = councilDay(today, city.council!.offset);
    const o = content.ordinance(deps.input.ordinanceId);
    if (!o || !menuOf(content, cityId).some((m) => m.id === o.id))
      throw new GameError('UNKNOWN_ORDINANCE', { ordinanceId: deps.input.ordinanceId }, 'BAD_REQUEST');
    const closed = () => new GameError('RULE_WINDOW_CLOSED', { opensAt: dayStart(cal.council.toDay) });
    // The term is council k's (seated at the count that opened ballot k); the window is its days 0–1.
    if (!cal.council.ruleOpen || term.councilKey !== `governor:${cityId}:${cal.cycle}`) throw closed();
    const set = await OfficeTerm.updateOne(
      { _id: term._id, 'holder.characterId': c._id, vacatedDay: null },
      { $set: { rule: o.id, ruleSetAt: new Date(x.now) } },
      { session },
    );
    if (set.matchedCount === 0) throw new GameError('NOT_GOVERNOR');
    const open = await RuleBallot.updateOne(
      { _id: councilKey(cityId, cal.cycle), status: 'open' },
      { $inc: { changes: 1 } },
      { session },
    );
    if (open.matchedCount === 0) throw closed();
    return nationResult(content, x, {
      act: 'governorRule',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        ordinance: o.name,
        city: city.name,
        pollsWeekday: weekdayName(cal.election.pollsFrom),
        weekday: weekdayName(cal.election.countDay - 1),
      },
      until: dayStart(cal.council.setDay),
      at: dayStart(cal.election.pollsFrom),
      view: { kind: 'office', office: await governorPage(content, c, cityId, x.now, session) },
    });
  });
}

/** `governor.address` (§7.2): 50 momentum to the party on a live Issue of the Governor's city, once a term. */
export function address(deps: NationActDeps<{ issueDocId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'governor.address', async (x) => {
    const { c, session, today } = x;
    const term = await asGovernor(x);
    if (term.powers?.address) throw new GameError('ADDRESS_USED', { day: term.powers.address.day });
    const issue = await IssueModel.findById(deps.input.issueDocId).session(session).lean<IssueDoc>();
    if (!issue || issue.status !== 'live' || issue.cityId !== term.cityId)
      throw new GameError('NOT_AN_ISSUE', { issueDocId: deps.input.issueDocId }, 'BAD_REQUEST');
    const f = c.factionId;
    const before = { ...issue.momentum };
    const inc = await IssueModel.updateOne(
      { _id: issue._id, status: 'live' },
      { $inc: { [`momentum.${f}`]: GOVERNOR.address } },
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
      points: GOVERNOR.address,
      at: new Date(x.now),
    });
    const spec = content.issue(issue.issueId);
    const after = { ...before, [f]: (before[f] ?? 0) + GOVERNOR.address } as Record<FactionId, number>;
    return nationResult(content, x, {
      act: 'address',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { issueShort: spec?.short ?? issue.issueId },
      knockOns: {
        issue: { name: spec?.name ?? issue.issueId, added: GOVERNOR.address, before, after },
      },
      view: { kind: 'office', office: await governorPage(content, c, term.cityId, x.now, session) },
    });
  });
}

/** `office.governor` (§8.3): the city's Governor or Mayor, their rule, the Address and the pay. */
export async function governorPage(
  content: GameContent,
  c: Pick<CharacterDoc, '_id' | 'factionId'>,
  cityId: string,
  now: number,
  session: ClientSession | null = null,
): Promise<GovernorPageView> {
  const city = content.city(cityId);
  if (!city) throw gameError('NOT_FOUND', 'UNKNOWN_CITY', { cityId });
  if (!city.council) throw gameError('PRECONDITION_FAILED', 'NO_COUNCIL', { cityId });
  const today = dayKey(now);
  const doc = session
    ? await City.findById(cityId).session(session).lean<CityDoc>()
    : await ensureCityDay(content, cityId, now);
  const s = <T extends { session: (x: ClientSession | null) => T }>(q: T): T => q.session(session);
  const gov = doc?.council?.governor ?? null;
  const term = gov?.termId ? await s(OfficeTerm.findById(gov.termId)).lean<OfficeTermDoc>() : null;
  const cal = councilDay(today, city.council.offset);
  const you = !!gov && gov.kind === 'player' && gov.characterId === c._id.toHexString();
  const holderChar =
    gov?.kind === 'player' && gov.characterId
      ? await Character.findById(gov.characterId, { avatarId: 1 }).lean<Pick<CharacterDoc, 'avatarId'>>()
      : null;
  const ruleOpen = cal.council.ruleOpen && term?.councilKey === `governor:${cityId}:${cal.cycle}`;
  const { cards, doc: ballot } = await ballotCards(content, cityId, cal.cycle, doc, session);
  const myCard = term?.rule
    ? cards.findIndex((x) =>
        x.by.some(
          (b) =>
            b.kind === 'party' &&
            (b.via === 'governor' || b.via === 'mayor') &&
            b.characterId === (term.holder.kind === 'player' ? term.holder.characterId.toHexString() : ''),
        ),
      )
    : -1;
  const counted = ballot?.status === 'counted' && ballot.result ? ballot : null;
  const decided = counted?.result
    ? {
        ordinanceId: counted.result.winner,
        name: content.ordinance(counted.result.winner)?.name ?? counted.result.winner,
        won: !!term?.rule && counted.result.winner === term.rule,
        how: counted.result.how,
        day: counted.countDay,
      }
    : null;
  const live = await s(IssueModel.find({ cityId, status: 'live' }).sort({ order: 1 })).lean<IssueDoc[]>();
  const used = term?.powers?.address;
  const usedIssue = used ? await s(IssueModel.findById(used.issueDocId)).lean<IssueDoc>() : null;
  const faction = content.faction(gov?.factionId ?? city.homeFactionId ?? c.factionId);
  return {
    city: { id: cityId, name: city.name, hall: hallView(content, cityId, now), title: titleOf(content, cityId) },
    holder: gov
      ? {
          kind: gov.kind,
          name: gov.name,
          factionId: gov.factionId,
          avatarId: holderChar?.avatarId ?? null,
          local: gov.local,
          since: term?.fromDay ?? doc?.council?.fromDay ?? cal.council.fromDay,
          until: term?.toDay ?? doc?.council?.toDay ?? cal.council.toDay,
        }
      : null,
    you,
    rule: {
      set: term?.rule
        ? {
            ordinanceId: term.rule,
            name: content.ordinance(term.rule)?.name ?? term.rule,
            at: (term as OfficeTermDoc & { ruleSetAt?: Date }).ruleSetAt?.getTime() ?? 0,
          }
        : null,
      until: ruleOpen ? dayStart(cal.council.setDay) : null,
      menu: you && ruleOpen ? ruleMenu(content, cityId, faction.branchMotion, cards) : null,
      card: term?.rule ? { onBallot: myCard === 0, position: 1 } : null,
      decided,
    },
    address: {
      used: used ? { issueShort: content.issue(usedIssue?.issueId ?? '')?.short ?? '', day: used.day } : null,
      issues: live.map((i) => ({
        docId: i._id,
        name: content.issue(i.issueId)?.name ?? i.issueId,
        short: content.issue(i.issueId)?.short ?? i.issueId,
        momentum: { ...i.momentum },
      })),
    },
    pay: { ...GOVERNOR.stipend },
  };
}

export async function getGovernorPage(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { cityId: string };
}): Promise<GovernorPageView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  return governorPage(deps.content, doc, deps.input.cityId, now);
}
