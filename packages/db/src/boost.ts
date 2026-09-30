import { COUNCIL, RANK_FXP, STANDING, rankForFxp } from '@irongate/rules';
import { nativeDb } from './connect';
import { Character } from './models/character';
import type { CharacterDoc } from './models/character';

/**
 * The playtest boost (an operator script, not an API route; the user's decision for the slice-3
 * playtest, tech design §20.2 Q2): chosen testers are lifted to Rank 3 and Known Local Standing in
 * their home city, so they can stand in the next nominations window without two weeks of play.
 * Never lowers anything, idempotent, and marks the character (`playtest.boosted`) so the report
 * can tell boosted testers from natural ones.
 */

/** Rank 3 needs 2,000 FXP; Known needs 30 Successes; the deposit is 10 PC (GDD §5.4, §13.4, §15.3). */
export const BOOST = {
  fxp: RANK_FXP[COUNCIL.standRank - 1]!,
  successes: STANDING.thresholds[COUNCIL.knownLevel]!,
  pc: COUNCIL.cost.declare,
} as const;

export interface BoostPlan {
  set: Partial<Pick<CharacterDoc, 'fxp' | 'rank' | 'pc' | 'localStanding'>>;
  changes: string[];
}

/** What the boost changes for one character, or an empty plan when it is already there. */
export function boostPlan(
  c: Pick<CharacterDoc, 'fxp' | 'rank' | 'pc' | 'localStanding' | 'homeCityId'>,
): BoostPlan {
  const set: BoostPlan['set'] = {};
  const changes: string[] = [];
  if (c.fxp < BOOST.fxp) {
    set.fxp = BOOST.fxp;
    changes.push(`FXP ${c.fxp} → ${BOOST.fxp}`);
  }
  const rank = Math.max(c.rank, rankForFxp(Math.max(c.fxp, BOOST.fxp)));
  if (rank > c.rank) {
    set.rank = rank;
    changes.push(`Rank ${c.rank} → ${rank}`);
  }
  const successes = c.localStanding.find((s) => s.cityId === c.homeCityId)?.successes ?? 0;
  if (successes < BOOST.successes) {
    set.localStanding = [
      ...c.localStanding.filter((s) => s.cityId !== c.homeCityId),
      { cityId: c.homeCityId, successes: BOOST.successes },
    ];
    changes.push(`${c.homeCityId} Successes ${successes} → ${BOOST.successes} (Known)`);
  }
  // Standing needs the deposit too: a tester with less than 10 PC could not file.
  if (c.pc < BOOST.pc) {
    set.pc = BOOST.pc;
    changes.push(`PC ${c.pc} → ${BOOST.pc} (the deposit)`);
  }
  return { set, changes };
}

export interface BoostOutcome {
  email: string;
  status: 'boosted' | 'unchanged' | 'no-user' | 'no-character' | 'conflict';
  name?: string;
  changes: string[];
}

/** Boost the characters of these Better Auth accounts (their `user` collection, by email). */
export async function boostByEmails(emails: readonly string[], now = new Date()): Promise<BoostOutcome[]> {
  const out: BoostOutcome[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    const user = await nativeDb().collection('user').findOne({ email });
    if (!user) {
      out.push({ email, status: 'no-user', changes: [] });
      continue;
    }
    const userId = String(user._id);
    let done: BoostOutcome | null = null;
    for (let attempt = 0; attempt < 5 && !done; attempt++) {
      const c = await Character.findOne({ userId }).lean<CharacterDoc>();
      if (!c) {
        done = { email, status: 'no-character', changes: [] };
        break;
      }
      const plan = boostPlan(c);
      if (plan.changes.length === 0) {
        done = { email, status: 'unchanged', name: c.name, changes: [] };
        break;
      }
      const successes = c.localStanding.find((s) => s.cityId === c.homeCityId)?.successes ?? 0;
      // The version guard: a game write in between wins, and the boost re-reads and retries.
      const updated = await Character.updateOne(
        { _id: c._id, version: c.version },
        {
          $set: {
            ...plan.set,
            ...(c.playtest?.boosted
              ? {}
              : {
                  playtest: { boosted: true, boostedAt: now, from: { fxp: c.fxp, rank: c.rank, successes } },
                }),
          },
          $inc: { version: 1 },
        },
      );
      if (updated.matchedCount === 1)
        done = { email, status: 'boosted', name: c.name, changes: plan.changes };
    }
    out.push(done ?? { email, status: 'conflict', changes: [] });
  }
  return out;
}
