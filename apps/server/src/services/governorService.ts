import type { GameContent } from '@irongate/content';
import { OfficeTerm } from '@irongate/db';
import type { CityDoc, OfficeTermDoc } from '@irongate/db';
import { COUNCIL, governorOf } from '@irongate/rules';
import type { DayKey, FactionId, SeatedForGovernor } from '@irongate/rules';
import type { ClientSession } from 'mongoose';

/**
 * Slice 7 (docs/tech/slice-7.md §3.1, §8.2; ADR 0048; the designer's ruling of 15 Oct 2026): the
 * Governor (a home city) or the Mayor (the capital, Clearwater), chosen at every count. The pure
 * choice is `governorOf`; this file builds its pool from the count and writes the `governor` term
 * (a player only: a local is marked Local, draws no pay and sets nothing) and the city's projection.
 */

export type GovernorProjection = NonNullable<NonNullable<CityDoc['council']>['governor']>;

export const governorKey = (cityId: string, k: number): string => `governor:${cityId}:${k}`;

const keyOf = (h: OfficeTermDoc['holder']): string =>
  h.kind === 'player' ? `p:${h.characterId.toHexString()}` : `n:${h.npcId}`;

/**
 * At the count that seats council `k` from day `d`: the bloc's (null: the whole council's) seated
 * players with a completed council term, else its top seated local, else its top unseated local
 * (`unseated`, the count's order). A player's `governor` term (`governor:{city}:{k}`, seat 1, the
 * council's five days) is inserted under the unique `{councilKey, seat, fromDay}`; the projection is
 * returned for `city.council.governor`. Null when the pool is empty.
 */
export async function governorAtCount(
  content: GameContent,
  i: {
    cityId: string;
    k: number;
    d: DayKey;
    bloc: FactionId | null;
    seated: readonly OfficeTermDoc[];
    /** The count's rows (seated and not); the unseated locals become the last fallback. */
    rows: ReadonlyArray<{ key: string; kind: 'player' | 'npc'; name: string; total: number; place: number; seated: boolean; factionId?: FactionId }>;
    /** At home every row is the home faction's. */
    homeFactionId?: FactionId;
    session: ClientSession;
  },
): Promise<GovernorProjection | null> {
  const players = i.seated.flatMap((t) => (t.holder.kind === 'player' ? [t.holder.characterId] : []));
  const done = players.length
    ? await OfficeTerm.find(
        {
          'holder.characterId': { $in: players },
          completed: true,
          $or: [{ office: { $exists: false } }, { office: 'council' }],
        },
        { 'holder.characterId': 1 },
      )
        .session(i.session)
        .lean<Array<Pick<OfficeTermDoc, 'holder'>>>()
    : [];
  const completed = new Set(done.map((x) => (x.holder.kind === 'player' ? x.holder.characterId.toHexString() : '')));
  const factionOf = (t: { factionId?: FactionId }) => t.factionId ?? i.homeFactionId!;
  const seated: SeatedForGovernor[] = i.seated.map((t) => ({
    key: keyOf(t.holder),
    kind: t.holder.kind,
    factionId: factionOf(t),
    total: t.total,
    order: t.place,
    completedCouncil: t.holder.kind === 'player' && completed.has(t.holder.characterId.toHexString()),
  }));
  const unseated: SeatedForGovernor[] = i.rows
    .filter((r) => !r.seated && r.kind === 'npc')
    .map((r) => ({
      key: r.key,
      kind: 'npc',
      factionId: factionOf(r),
      total: r.total,
      order: r.place,
      completedCouncil: false,
    }));
  const pick = governorOf({ seated, bloc: i.bloc, unseated });
  if (!pick) return null;
  const term = i.seated.find((t) => keyOf(t.holder) === pick.key);
  const row = i.rows.find((r) => r.key === pick.key);
  const factionId = term ? factionOf(term) : row ? factionOf(row) : (i.bloc ?? i.homeFactionId!);
  if (term?.holder.kind === 'player') {
    const [gov] = await OfficeTerm.insertMany(
      [
        {
          cityId: i.cityId,
          councilKey: governorKey(i.cityId, i.k),
          electionId: term.electionId,
          office: 'governor',
          seat: 1,
          factionId,
          districtId: null,
          vacatedDay: null,
          fromDay: i.d,
          toDay: i.d + COUNCIL.termDays,
          holder: term.holder,
          place: 1,
          total: term.total,
          completed: false,
          rule: null,
        },
      ],
      { session: i.session },
    );
    return {
      kind: 'player',
      characterId: term.holder.characterId.toHexString(),
      name: term.holder.name,
      factionId,
      termId: gov!._id.toHexString(),
      local: false,
    };
  }
  const npcId = pick.key.slice(2);
  return {
    kind: 'npc',
    npcId,
    name: term?.holder.name ?? row?.name ?? content.candidate(npcId)?.name ?? npcId,
    factionId,
    termId: null,
    local: true,
  };
}

/** The current Governor's term of a city held by `characterId` (re-read in a transaction, ADR 0020). */
export async function governorTermOf(
  cityId: string,
  characterId: string,
  today: DayKey,
  session: ClientSession | null = null,
): Promise<OfficeTermDoc | null> {
  const q = OfficeTerm.findOne({
    cityId,
    office: 'governor',
    'holder.characterId': characterId,
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
  });
  return (session ? q.session(session) : q).lean<OfficeTermDoc>();
}
