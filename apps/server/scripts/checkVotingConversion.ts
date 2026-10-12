/**
 * The voting rework (docs/tech/voting-rework.md §6, ADR 0086), checked by a script, not a unit test
 * (the user's 8 Oct rule): `pnpm --filter @irongate/server check:voting-conversion`.
 *
 * On an in-memory replica set, for each home city and the capital at each cycle day 0–4, it writes
 * what a database played before the rework holds as of the city's settled day S (an old order paper
 * k − 1 and k with a player councillor's proposal, a filed candidacy, a person ballot on the polling
 * days, the old rule window), runs the conversion twice, asserts the table of tech design §6.3, then
 * settles to the next count and asserts the first rule count. Migration 009 is run twice over two due
 * deposits and must credit each once. Exits non-zero on any failure.
 */
import { getContent } from '@irongate/content';
import {
  Candidacy,
  Character,
  City,
  Election,
  OfficeTerm,
  RuleBallot,
  Vote,
  connectDb,
  disconnectDb,
  ensureIndexes,
  migrateVotingRework,
  mongoose,
  seed,
} from '@irongate/db';
import type { CityDoc, RuleBallotDoc } from '@irongate/db';
import { COUNCIL, PC, councilDay, councilKey, dayStart, electionKey } from '@irongate/rules';
import { startMemoryReplSet, withDbName } from '@irongate/db/testing';
import { settleCityDay } from '../src/services/cityDay';
import { AlreadySettled } from '../src/services/cityDayCore';
import { ordinanceIdOn } from '../src/services/modifiers';
import { inTransaction } from '../src/services/txn';
import { convertCityVoting } from '../src/services/votingConversion';

const content = getContent();
const failures: string[] = [];
let checks = 0;
function check(ok: boolean, what: string): void {
  checks += 1;
  if (!ok) failures.push(what);
}
const noon = (day: number) => dayStart(day) + 12 * 3_600_000;
const raw = <T>(id: string) => ({ _id: id }) as unknown as T;

/** Turn the bootstrapped (new-model) city as of S back into what an old database held at S. */
async function makeOld(cityId: string, S: number, withRule: boolean): Promise<{ player: mongoose.Types.ObjectId }> {
  const spec = content.city(cityId)!;
  const capital = content.isDistricted(cityId);
  const cal = councilDay(S, spec.council!.offset);
  const k = cal.cycle;
  const c0 = cal.council.fromDay;
  const divided = cal.cycleDay >= 2;
  const home = spec.homeFactionId ?? null;
  const branch = (f: string) => content.faction(f as never).branchMotion;

  // A player councillor in seat 1 of council k, with a proposal on paper k.
  const player = new mongoose.Types.ObjectId();
  const seat1 = (await OfficeTerm.findOne({ councilKey: councilKey(cityId, k), seat: 1 }).lean())!;
  await OfficeTerm.updateOne(
    { _id: seat1._id },
    { $set: { holder: { kind: 'player', characterId: player, name: 'Old Councillor' } } },
  );
  await OfficeTerm.collection.updateMany({ councilKey: councilKey(cityId, k) }, { $unset: { rule: '', ruleSetAt: '' } });
  const f1 = (seat1.factionId ?? home)!;
  const item = (ordinanceId: string, kind: 'branch' | 'player', f: string, day: number) => ({
    ordinanceId,
    movedBy:
      kind === 'branch'
        ? { kind, npcId: content.faction(f as never).secretary.npcId, name: 'Secretary', factionId: f }
        : { kind, characterId: player, name: 'Old Councillor', factionId: f },
    at: new Date(dayStart(day)),
    day,
  });
  const factions = capital ? ['vanguard', 'collective', 'alliance'] : [home!];
  const passed = withRule ? branch(factions[0]!) : null;
  await RuleBallot.collection.deleteMany({ cityId });
  await RuleBallot.collection.insertMany([
    {
      ...raw<object>(councilKey(cityId, k - 1)),
      cityId,
      cycle: k - 1,
      fromDay: c0 - 5,
      divideDay: c0 - 3,
      status: 'divided',
      items: factions.map((f) => item(branch(f), 'branch', f, c0 - 5)),
      votes: [],
      division: { tallies: [], npcChoice: passed, npcAbstained: false, passed, inForce: passed ? { fromDay: c0 - 3, toDay: c0 + 2 } : null },
    },
    {
      ...raw<object>(councilKey(cityId, k)),
      cityId,
      cycle: k,
      fromDay: c0,
      divideDay: c0 + 2,
      status: divided ? 'divided' : 'open',
      items: [...factions.map((f) => item(branch(f), 'branch', f, c0)), item('ord.street-fund', 'player', f1, c0)],
      votes: [{ characterId: player, name: 'Old Councillor', seat: 1, choice: 'ord.street-fund', at: new Date(dayStart(c0)) }],
      division: divided
        ? { tallies: [], npcChoice: passed, npcAbstained: false, passed, inForce: passed ? { fromDay: c0 + 2, toDay: c0 + 7 } : null }
        : null,
    },
  ] as never);

  // The old rule window (ADR 0021's history as the old model wrote it).
  const window = divided ? { fromDay: c0 + 2, toDay: c0 + 7 } : { fromDay: c0 - 3, toDay: c0 + 2 };
  const prevWindow = divided ? { fromDay: c0 - 3, toDay: c0 + 2 } : { fromDay: c0 - 8, toDay: c0 - 3 };
  const ordinance = passed ? { id: passed, ...window, paperId: councilKey(cityId, divided ? k : k - 1) } : null;
  const history = passed ? [{ id: passed, ...prevWindow }, { id: passed, ...window }] : [];
  await City.collection.updateOne(raw(cityId), {
    $unset: { 'world.voting': '' },
    $set: { ordinance, ordinanceHistory: history },
  });

  // Election k: a filed candidacy (days 0–1); a person ballot and a standing one without a rule (2–4).
  const place = capital ? content.districtsOf(cityId)[0]!.id : cityId;
  const eid = electionKey(place, k);
  const base = {
    electionId: eid,
    cityId,
    placeId: place,
    factionId: f1,
    cycle: k,
    name: 'Old Candidate',
    platformId: 'plat.old',
    filedAt: new Date(dayStart(c0)),
    filedDay: c0,
    endorsements: [],
    branch: null,
    effective: null,
    smallBranch: null,
    place: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await Candidacy.collection.insertOne({
    ...base,
    characterId: new mongoose.Types.ObjectId(),
    status: divided ? 'standing' : 'filed',
    deposit: divided ? 'spent' : 'held',
  });
  if (divided) {
    await Vote.collection.insertOne({
      electionId: eid,
      voterId: new mongoose.Types.ObjectId(),
      candidateKey: 'n:old',
      day: c0 + 2,
      createdAt: new Date(),
    });
    await Election.collection.updateOne(raw(eid), { $set: { ballots: 1 } });
  }
  return { player };
}

async function caseOf(cityId: string, cd: number, withRule: boolean): Promise<void> {
  const tag = `${cityId} day ${cd}${withRule ? '' : ' (no rule ran)'}`;
  await mongoose.connection.dropDatabase();
  await ensureIndexes(content);
  await seed(content);
  const offset = content.city(cityId)!.council!.offset;
  let S = 20_740;
  while (councilDay(S, offset).cycleDay !== cd) S += 1;
  const cal = councilDay(S, offset);
  const k = cal.cycle;
  const start = cal.council.fromDay;
  const end = start + COUNCIL.ordinanceDays;
  const capital = content.isDistricted(cityId);

  await settleCityDay(content, cityId, noon(S)); // bootstrap as of S (new model)
  await makeOld(cityId, S, withRule);
  const before = (await City.findById(cityId).lean<CityDoc>())!;
  const settledRules = Array.from({ length: 7 }, (_, i) => ordinanceIdOn(before, S - i));

  // The conversion, twice (the second is a no-op), and a direct call that must refuse.
  await settleCityDay(content, cityId, noon(S));
  await settleCityDay(content, cityId, noon(S));
  let refused = false;
  try {
    await inTransaction((session) => convertCityVoting(content, cityId, S, session));
  } catch (err) {
    refused = err instanceof AlreadySettled;
  }
  check(refused, `${tag}: a second conversion refuses with AlreadySettled`);

  const city = (await City.findById(cityId).lean<CityDoc>())!;
  check(city.world?.voting === 2, `${tag}: world.voting is 2`);
  check(city.world?.settledDay === S, `${tag}: settledDay stays S`);
  for (let i = 0; i < 7; i++)
    check(ordinanceIdOn(city, S - i) === settledRules[i], `${tag}: the rule on settled day S−${i} is unchanged`);
  if (withRule) {
    check(city.ordinance?.toDay === end, `${tag}: the rule in force runs to start + 5`);
    check(city.ordinance?.id === before.ordinance?.id, `${tag}: the same rule stays in force`);
    check(city.ordinance?.fromDay === before.ordinance?.fromDay, `${tag}: its first day is unchanged`);
  } else {
    check(city.ordinance?.fromDay === S + 1 && city.ordinance?.toDay === end, `${tag}: card 1 from S + 1 to start + 5`);
  }
  check(city.ordinance?.paperId === councilKey(cityId, k - 1), `${tag}: paperId is ballot k − 1`);

  const prev = (await RuleBallot.findById(councilKey(cityId, k - 1)).lean<RuleBallotDoc>())!;
  check(prev.status === 'counted' && prev.result?.how === 'carried', `${tag}: ballot k − 1 counted, carried`);
  check(prev.legacy !== undefined && !('items' in prev), `${tag}: paper k − 1's fields are under legacy`);
  const b = (await RuleBallot.findById(councilKey(cityId, k)).lean<RuleBallotDoc>())!;
  check(b.legacy?.items?.length !== undefined && !('items' in b), `${tag}: paper k's fields are under legacy`);
  if (cd <= 1) {
    check(b.status === 'open' && b.cards === null && b.changes === 0, `${tag}: ballot k is open`);
  } else {
    check(b.status === 'set' && (b.cards?.length ?? 0) >= (capital ? 1 : 3), `${tag}: ballot k is set with its cards`);
    check(new Set(b.cards!.map((c) => c.ordinanceId)).size === b.cards!.length, `${tag}: the cards are distinct`);
    check(
      b.cards!.some((c) => c.ordinanceId === 'ord.street-fund'),
      `${tag}: the proposer's rule is a card (a top player councillor)`,
    );
  }
  const term = (await OfficeTerm.findOne({ councilKey: councilKey(cityId, k), seat: 1 }).lean())!;
  check(term.rule === 'ord.street-fund', `${tag}: the councillor's rule is their old proposal`);
  const locals = await OfficeTerm.find({ councilKey: councilKey(cityId, k), 'holder.kind': 'npc' }).lean();
  check(
    locals.every((t) => (capital ? t.rule === null : typeof t.rule === 'string')),
    `${tag}: locals' rules (home: content; capital: none)`,
  );
  const place = capital ? content.districtsOf(cityId)[0]!.id : cityId;
  const cands = await Candidacy.find({ electionId: electionKey(place, k) }).lean();
  check(
    cands.length > 0 && cands.every((c) => c.status === 'standing' && !!c.rule && c.deposit === 'spent'),
    `${tag}: candidacies are standing with a rule`,
  );
  if (cd >= 2) {
    check((await Vote.countDocuments({ electionId: electionKey(place, k) })) === 0, `${tag}: person ballots deleted`);
    check((await Election.findById(electionKey(place, k)).lean())!.ballots === 0, `${tag}: ballots reset to 0`);
  }

  // The next count: the first rule count.
  await settleCityDay(content, cityId, noon(end));
  const after = (await City.findById(cityId).lean<CityDoc>())!;
  const counted = (await RuleBallot.findById(councilKey(cityId, k)).lean<RuleBallotDoc>())!;
  check(after.world?.settledDay === end, `${tag}: settled to the next count`);
  check(counted.status === 'counted' && !!counted.result, `${tag}: ballot k counted at the next count`);
  check(
    after.ordinance?.id === counted.result?.winner &&
      after.ordinance?.fromDay === end &&
      after.ordinance?.toDay === end + COUNCIL.ordinanceDays,
    `${tag}: the winner in force [count, count + 5)`,
  );
  check(
    capital ? counted.result?.how === 'seats' || counted.result?.how === 'draw' : counted.result?.how === 'fallback',
    `${tag}: no votes → the fallback (home) / the largest bloc (capital)`,
  );
  const next = await RuleBallot.findById(councilKey(cityId, k + 1)).lean<RuleBallotDoc>();
  check(next?.status === 'open', `${tag}: ballot k + 1 is open`);
  const nextTerms = await OfficeTerm.find({ councilKey: councilKey(cityId, k + 1) }).lean();
  check(
    nextTerms.length === (capital ? 10 : 7) && nextTerms.every((t) => t.rule !== undefined),
    `${tag}: council k + 1 sits with rules`,
  );
}

async function migration009(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await ensureIndexes(content);
  const id = new mongoose.Types.ObjectId();
  await Character.collection.insertOne({ _id: id, pc: 5, version: 1 });
  const due = (n: number) => ({
    electionId: `coalport:${n}`,
    cityId: 'coalport',
    cycle: n,
    characterId: id,
    name: 'Struck Candidate',
    filedAt: new Date(),
    filedDay: 1,
    status: 'struck',
    endorsements: [],
    branch: null,
    deposit: 'due',
    place: null,
  });
  await Candidacy.collection.insertMany([due(1), due(2)]);
  const first = await migrateVotingRework();
  const second = await migrateVotingRework();
  const c = await Character.collection.findOne({ _id: id });
  check(first.refunds.modified === 2, 'migration 009: the first run credits the two due deposits');
  check(second.refunds.matched === 0 && second.refunds.modified === 0, 'migration 009: a second run matches nothing');
  check(c?.pc === Math.min(PC.cap, 25) && c?.version === 3, 'migration 009: +10 PC each, once (5 → 25)');
  check((await Candidacy.countDocuments({ deposit: 'returned' })) === 2, 'migration 009: both flipped to returned');
}

const rs = await startMemoryReplSet();
try {
  await connectDb(withDbName(rs.uri, 'voting-conversion'));
  for (const cityId of ['coalport', 'duskwall', 'ashford', 'irongate']) {
    for (let cd = 0; cd <= 4; cd++) {
      // Duskwall and the capital: no rule ran on S (the old council could not agree).
      await caseOf(cityId, cd, cityId !== 'duskwall' && cityId !== 'irongate');
    }
  }
  await caseOf('coalport', 2, false);
  await migration009();
} finally {
  await disconnectDb();
  await rs.stop();
}
console.log(`check:voting-conversion: ${checks - failures.length} of ${checks} checks passed`);
for (const f of failures) console.error(`  FAILED ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
