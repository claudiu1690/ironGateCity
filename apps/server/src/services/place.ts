import type { City, GameContent, Location } from '@irongate/content';
import { City as CityModel, Contribution, District, IssueModel, contributionId } from '@irongate/db';
import type { CharacterDoc, CityDoc, DistrictDoc, IssueDoc } from '@irongate/db';
import { FACTION_IDS, addPressure, applyAgainst, applyPersuasion, moraleState, rivalGroundIn } from '@irongate/rules';
import type {
  ActionResult,
  DayKey,
  FactionId,
  PlaceModifiers,
  RivalGroundState,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { addInfluence, addPoints, cycleKeyOf, toThousandths, writeLedger } from './ledger';
import { modifiersFor, restedCapToday } from './modifiers';
import { residenceCityId } from './residence';
import { DayChanged } from './txn';

/**
 * The place an act happens at, read inside the act's transaction (slices 3–5): the city's and the
 * district's documents, the modifiers in force for this actor (ADR 0030; slice 5's rival ground,
 * ADR 0034), the residence city's Rested cap, and the meter the act moves. Shared by tier-1 actions,
 * missions and the run-in's resolution, so each reads the place the same way.
 */
export interface PlaceCtx {
  today: DayKey;
  city: City;
  location: Location;
  cityState: CityDoc | null;
  districtId: string | null;
  district: DistrictDoc | null;
  modifiers: PlaceModifiers;
  residenceCity: CityDoc | null;
  restedCap: number;
  /** The meter an opinion move writes: the district in the capital, else the city. */
  placeId: string;
  placeName: string;
  rival: RivalGroundState | null;
}

export async function readPlace(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  at: { city: City; location: Location },
  today: DayKey,
): Promise<PlaceCtx> {
  const { city, location } = at;
  const cityState = await CityModel.findById(city.id).session(session).lean<CityDoc>();
  const districtId = content.isDistricted(city.id) ? (location.quarterId ?? null) : null;
  const district = districtId ? await District.findById(districtId).session(session).lean<DistrictDoc>() : null;
  const modifiers = modifiersFor(content, cityState, c.factionId, today, { cityId: city.id, district });
  // ADR 0030 §5: the Rested cap is the residence city's (and the room's), wherever the act is.
  const residenceId = residenceCityId(c);
  const residenceCity =
    residenceId === city.id ? cityState : await CityModel.findById(residenceId).session(session).lean<CityDoc>();
  return {
    today,
    city,
    location,
    cityState,
    districtId,
    district,
    modifiers,
    residenceCity,
    restedCap: restedCapToday(content, residenceCity, today, c.room),
    placeId: districtId ?? city.id,
    placeName: districtId ? (content.district(districtId)?.quarter.name ?? districtId) : city.name,
    rival: rivalGroundIn(modifiers),
  };
}

/** An opinion move, computed: the effect line, the meter's write, the ledger legs and the contribution. */
export interface OpinionMove {
  effect: Omit<NonNullable<ActionResult['effects']['opinion']>, 'cityId' | 'factionId' | 'delta'> | null;
  write: (() => Promise<unknown>) | null;
  morale: ActionResult['effects']['morale'];
  /** Signed points per faction, for the ledger (ADR 0034: two legs for an `against`). */
  legs: Array<{ factionId: FactionId; swing: number }>;
  /** The actor's points (heroes and the scoreboard; design §23.1 #7). */
  contribution: number;
}

const NO_MOVE: OpinionMove = { effect: null, write: null, morale: null, legs: [], contribution: 0 };

/**
 * Move the meter (ADR 0010, 0027, 0034): persuasion for the actor, or `against` a faction (half to the
 * actor, half to Neutral; on rival ground under the home faction's day cap, with `rivalPressure`
 * written on the same city document). A home city's morale crossing is recorded as in slice 3.
 */
export function moveOpinion(
  ctx: PlaceCtx,
  session: ClientSession,
  i: { actor: FactionId; swing: number; mode: 'persuade' | 'against'; target: FactionId | null },
): OpinionMove {
  if (i.swing <= 0 || (i.mode === 'against' && (!i.target || i.target === i.actor))) return NO_MOVE;
  const { city, district, cityState, today } = ctx;

  if (district) {
    // ADR 0027: the district's meter (no home floor in a battleground; no morale; no cap).
    const shares = district.opinion;
    if (i.mode === 'persuade') {
      const op = applyPersuasion(shares, { factionId: i.actor, swing: i.swing });
      return {
        effect: { applied: op.applied, shareBefore: shares[i.actor], shareAfter: op.shares[i.actor] },
        write: () => District.updateOne({ _id: district._id }, { $set: { opinion: op.shares } }, { session }),
        morale: null,
        legs: [{ factionId: i.actor, swing: op.applied }],
        contribution: op.applied,
      };
    }
    const target = i.target!;
    const op = applyAgainst(shares, { actor: i.actor, target, swing: i.swing });
    return {
      effect: {
        applied: op.taken,
        shareBefore: shares[target],
        shareAfter: op.shares[target],
        mode: 'against',
        targetFactionId: target,
        toActor: op.toActor,
        capped: false,
      },
      write: () => District.updateOne({ _id: district._id }, { $set: { opinion: op.shares } }, { session }),
      morale: null,
      legs: [
        { factionId: i.actor, swing: op.toActor },
        { factionId: target, swing: -op.taken },
      ],
      contribution: op.toActor,
    };
  }

  const shares = cityState?.opinion ?? city.baselineOpinion;
  const home = city.homeFactionId;
  let next: typeof shares;
  let effect: OpinionMove['effect'];
  let legs: OpinionMove['legs'];
  let contribution: number;
  let pressure: CityDoc['rivalPressure'] | undefined;
  if (i.mode === 'persuade') {
    const op = applyPersuasion(shares, { factionId: i.actor, swing: i.swing, homeFactionId: home });
    next = op.shares;
    effect = { applied: op.applied, shareBefore: shares[i.actor], shareAfter: op.shares[i.actor] };
    legs = [{ factionId: i.actor, swing: op.applied }];
    contribution = op.applied;
  } else {
    const target = i.target!;
    // ADR 0034: on rival ground the home faction loses at most two points a day to rivals.
    const capped = ctx.rival !== null && target === ctx.rival.homeFactionId;
    const cap = capped ? ctx.rival!.pressureLeft : null;
    const op = applyAgainst(shares, { actor: i.actor, target, swing: i.swing, homeFactionId: home, cap });
    next = op.shares;
    effect = {
      applied: op.taken,
      shareBefore: shares[target],
      shareAfter: op.shares[target],
      mode: 'against',
      targetFactionId: target,
      toActor: op.toActor,
      capped: cap !== null && toThousandths(i.swing) > toThousandths(cap),
    };
    legs = [
      { factionId: i.actor, swing: op.toActor },
      { factionId: target, swing: -op.taken },
    ];
    contribution = op.toActor;
    if (capped && op.taken > 0) pressure = addPressure(cityState?.rivalPressure ?? null, today, toThousandths(op.taken));
  }
  // ADR 0022: a threshold crossed by this act writes the morale record and a knock-on line.
  const before = home ? moraleState(shares[home]) : null;
  const after = home ? moraleState(next[home]) : null;
  const record =
    home && before !== after ? { state: after, since: today, previous: cityState?.morale?.state ?? before } : null;
  const morale = record && before && after ? { cityId: city.id, cityName: city.name, before, after } : null;
  return {
    effect,
    write: () =>
      CityModel.updateOne(
        { _id: city.id },
        {
          $set: {
            opinion: next,
            ...(record ? { morale: record } : {}),
            ...(pressure !== undefined ? { rivalPressure: pressure } : {}),
          },
        },
        { session, upsert: true },
      ),
    morale,
    legs,
    contribution,
  };
}

/** The faction with the most momentum (null on a tie at the top or with none), for the knock-on line. */
export function leaderOf(m: Record<FactionId, number>): FactionId | null {
  const best = Math.max(...FACTION_IDS.map((f) => m[f] ?? 0));
  if (best <= 0) return null;
  const top = FACTION_IDS.filter((f) => (m[f] ?? 0) === best);
  return top.length === 1 ? top[0]! : null;
}

/**
 * Slice 4: what an opinion-moving or Issue-tagged act writes besides the character and the meter, in
 * the same transaction: the ledger rows and the influence total (ADR 0028; slice 5: an `against`
 * writes two legs and counts the actor's), and each tagged Issue's momentum with the points total
 * (ADR 0029). The momentum `$inc` is guarded by `status: 'live'`: a miss means the week resolved
 * under the act, which retries on the new day.
 */
export async function placeWrites(
  content: GameContent,
  session: ClientSession,
  i: {
    c: CharacterDoc;
    cityId: string;
    placeId: string;
    placeName: string;
    move: Pick<OpinionMove, 'legs' | 'contribution'> | null;
    givesOpinion: boolean;
    issues: ReadonlyArray<{ docId: string; issueId: string; name: string; points: number }>;
    logId: string;
    today: number;
    at: Date;
    /** A run-in resolved after its week closed: an Issue no longer live is skipped, not retried. */
    lenientIssues?: boolean;
  },
): Promise<{
  issues: NonNullable<ActionResult['effects']['issues']>;
  scoreboard: ActionResult['effects']['scoreboard'];
}> {
  const who = { _id: i.c._id, name: i.c.name, factionId: i.c.factionId, level: i.c.level };
  if (i.move && i.move.legs.length > 0) {
    await writeLedger(
      content,
      i.move.legs.map((l) => ({
        cityId: i.cityId,
        placeId: i.placeId,
        factionId: l.factionId,
        swing: l.swing,
        kind: 'action' as const,
        characterId: i.c._id,
        ref: i.logId,
        day: i.today,
        at: i.at,
      })),
      session,
    );
    if (i.move.contribution > 0) {
      await addInfluence(content, session, {
        c: who,
        cityId: i.cityId,
        placeId: i.placeId,
        points: i.move.contribution,
        day: i.today,
        at: i.at,
      });
    }
  }
  const issues: NonNullable<ActionResult['effects']['issues']> = [];
  const f = i.c.factionId;
  for (const t of i.issues) {
    const doc =
      t.points > 0
        ? await IssueModel.findOneAndUpdate(
            { _id: t.docId, status: 'live' },
            { $inc: { [`momentum.${f}`]: t.points } },
            { session, returnDocument: 'after', lean: true },
          )
        : await IssueModel.findOne({ _id: t.docId, status: 'live' }).session(session).lean<IssueDoc>();
    if (!doc) {
      if (i.lenientIssues) continue;
      throw new DayChanged();
    }
    await addPoints(session, {
      c: who,
      cityId: i.cityId,
      placeId: doc.districtId ?? i.cityId,
      docId: t.docId,
      points: t.points,
      at: i.at,
    });
    issues.push({
      issueId: t.issueId,
      name: t.name,
      factionId: f,
      added: t.points,
      totals: { ...doc.momentum },
      leader: leaderOf(doc.momentum),
    });
  }
  let scoreboard: ActionResult['effects']['scoreboard'] = null;
  if (i.givesOpinion) {
    const scope = `influence|${cycleKeyOf(content, i.cityId, i.placeId, i.today)}`;
    const mine = await Contribution.findById(contributionId(scope, i.c._id)).session(session).lean();
    if (mine && mine.amount > 0) {
      const higher = await Contribution.countDocuments({
        scope,
        $or: [{ amount: { $gt: mine.amount } }, { amount: mine.amount, lastAt: { $lt: mine.lastAt } }],
      }).session(session);
      const of = await Contribution.countDocuments({ scope }).session(session);
      scoreboard = { placeName: i.placeName, swing: mine.amount / 1_000, rank: higher + 1, of };
    }
  }
  return { issues, scoreboard };
}
