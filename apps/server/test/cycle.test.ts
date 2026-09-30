/**
 * Slice 3 integration (tech design §14): a full council cycle on the test clock in Coalport, the
 * same cycle for a Vanguard and an Alliance player (the Sentinel's and the Gazette's headlines), the
 * struck candidate's deposit, the stipend, and the ordinance changing a number in play.
 */
import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { Candidacy, City, Election, OfficeTerm, OrderPaper } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, doTodaysOrders, key, nextCycleDay, player } from './politics.helpers';

const content = getContent();

beforeAll(async () => {
  await setupDb('cycle-test');
});
afterAll(teardownDb);

describe('a full cycle in Coalport', () => {
  it('declare → endorse + the branch → close → ballot → count → front page → propose → divide → in play → stipend', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 20730); // Tue 6 Oct 2026, cycle 4146
    const clock = testClock(at(D0));
    const A = await player(clock, { name: 'Mara Lenk', fxp: 2_000, successes: 200, pc: 45 });
    const B = await player(clock, { name: 'Anton Weiss', fxp: 400, pc: 45 });
    const C = await player(clock, { name: 'Jan Novak', fxp: 2_000, successes: 40, pc: 45 });
    const D = await player(clock, { name: 'Eva Kral', fxp: 400, pc: 0 });

    // Nominations: the slate, the declare card.
    const slate = await A.caller.council.election();
    expect(slate.phase).toBe('nominations');
    expect(slate.declare).toMatchObject({ canDeclare: true, cost: 10, reason: null });
    expect(slate.candidates).toHaveLength(9);
    expect(slate.candidates.every((c) => c.kind === 'npc' && c.rankTitle === null && c.avatar === null)).toBe(
      true,
    );
    const filed = await A.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() });
    expect(filed).toMatchObject({
      kind: 'political',
      act: 'declare',
      stamp: { label: 'Filed', tone: 'success' },
      headline: 'Your name is on the slate',
      knockOns: { pc: { before: 45, after: 35 } },
      paper: { name: 'The Coalport Clarion', shortName: 'Clarion' },
    });
    expect(filed.body).toContain('{until}');
    expect(filed.until).toBe(at(D0 + 2, 0));
    expect(filed.view.kind === 'election' && filed.view.election.candidacy).toMatchObject({
      status: 'filed',
      endorsements: { n: 0, needed: 2, branch: false },
      canWithdraw: true,
    });
    await C.caller.council.declare({ platformId: 'plat.c.bread', idempotencyKey: key() });

    // A colleague endorses; the branch endorses when A's three orders are done.
    const view = await B.caller.council.election();
    const aLine = view.candidates.find((c) => c.name === 'Mara Lenk')!;
    expect(aLine.canEndorse).toEqual({ ok: true });
    const endorsed = await B.caller.council.endorse({
      candidacyId: aLine.candidacyId!,
      idempotencyKey: key(),
    });
    expect(endorsed).toMatchObject({
      act: 'endorse',
      headline: 'Mara Lenk has your name',
      knockOns: { pc: { before: 45, after: 35 }, endorsements: { name: 'Mara Lenk', n: 1, needed: 2 } },
    });
    await doTodaysOrders(A.caller);
    const cand = await Candidacy.findOne({ characterId: A.id }).lean();
    expect(cand!.branch).not.toBeNull();
    const summary = (await A.caller.paper.today()).pollingDay!;
    expect(summary).toMatchObject({ state: 'filed', branchLine: true, endorsements: { n: 2, needed: 2 } });

    // The close (into cycle day 2): A stands, C is struck; the ballot is A + 8 NPCs.
    clock.set(at(D0 + 2));
    const ballot = await D.caller.council.election();
    expect(ballot.phase).toBe('polling');
    expect(ballot.candidates.map((c) => c.kind)).toEqual(['player', ...Array(8).fill('npc')]);
    expect(ballot.ballot).toEqual({ cast: null, canVote: true, reason: null });
    expect(JSON.stringify(ballot)).not.toMatch(/"ballots"|"votes"|"total"/);
    const struck = await Candidacy.findOne({ characterId: C.id }).lean();
    expect(struck).toMatchObject({ status: 'struck', deposit: 'due' });
    const cPaper = await C.caller.paper.today();
    expect(struck && (await Candidacy.findById(struck._id).lean())!.deposit).toBe('returned');
    expect(cPaper.desk.deposits).toEqual({ count: 1, pc: 10 });
    expect((await C.caller.character.me()).pc).toBe(45);
    expect(cPaper.headlines.map((h) => h.headline)).toContain('Jan Novak Comes Off the Ballot');
    const aPaper = await A.caller.paper.today();
    expect(aPaper.headlines.map((h) => h.headline)).toContain('Mara Lenk Is on the Ballot');
    expect(aPaper.pollingDay).toMatchObject({ state: 'ballot', dot: true, route: '/council/ballot' });
    expect((await A.caller.character.me()).politicsWaiting).toBe(1);

    // Three ballots: +1.5 morale.
    const before = (await City.findById('coalport').lean())!.opinion.collective;
    const me = `p:${A.id}`;
    const cast = await A.caller.council.vote({ candidateKey: me, idempotencyKey: key() });
    expect(cast).toMatchObject({
      act: 'ballot',
      stamp: { label: 'Ballot cast' },
      body: 'One vote for Mara Lenk. Nobody sees who you voted for. The count is in the Clarion on Sunday morning.',
    });
    expect(cast.knockOns.morale).toMatchObject({ before, after: before + 0.5 });
    await B.caller.council.vote({ candidateKey: me, idempotencyKey: key() });
    await D.caller.council.vote({ candidateKey: 'n:npc.c.weiss', idempotencyKey: key() });
    expect((await City.findById('coalport').lean())!.opinion.collective).toBeCloseTo(before + 1.5, 3);
    expect((await A.caller.character.me()).politicsWaiting).toBe(0);
    expect(
      await A.caller.council.count({ electionId: `coalport:${ballot.electionId.split(':')[1]}` }),
    ).toBeNull();

    // The count (into cycle day 0), lazily on A's first touch.
    clock.set(at(D0 + 5));
    const paper = await A.caller.paper.today();
    expect(paper.frontPage).toMatchObject({
      animate: true,
      headline: 'Mara Lenk Tops the Poll in Coalport',
      caption: { name: 'Mara Lenk', rankTitle: 'Organiser', cityName: 'Coalport' },
    });
    const row = paper.frontPage!.count.rows[0]!;
    // The ward vote is read at the count (design §17 Q1): the orders' Successes count too.
    const successes = (await A.caller.character.me()).standing.successes;
    expect(row).toMatchObject({
      name: 'Mara Lenk',
      wardVote: Math.floor(successes / 5),
      endorsementsCounted: 2,
    });
    expect(row).toMatchObject({ votes: 2, total: Math.floor(successes / 5) + 6 + 2 });
    expect(row).toMatchObject({ place: 1, seated: true, you: true, yourVote: true });
    expect(paper.frontPage!.count.turnout).toEqual({ voters: 3, eligible: 4 });
    expect(paper.headlines.map((h) => h.headline)).not.toContain('Mara Lenk Tops the Poll in Coalport');
    expect(paper.headlines.map((h) => h.headline)).toContain('Polls Close in Coalport: Lenk Tops the Poll');
    await A.caller.paper.markRead({ day: paper.day });
    expect((await A.caller.paper.today()).frontPage).toMatchObject({ animate: false });
    const dPaper = await D.caller.paper.today();
    expect(dPaper.frontPage).toBeNull();
    expect(dPaper.headlines.map((h) => h.headline)).toContain('Your Vote Counted: Anna Weiss Takes a Seat');
    const count = (await D.caller.council.count())!;
    expect(count.rows.find((r) => r.yourVote)?.name).toBe('Anna Weiss');
    expect(count.npcSeats).toBe(6);
    const mine = await A.caller.character.me();
    expect(mine.office).toMatchObject({ cityId: 'coalport', cityName: 'Coalport', seat: 1 });
    expect(mine.politicsWaiting).toBe(1);

    // The chamber: propose Open Doors, vote for it.
    const chamber = await A.caller.council.chamber();
    expect(chamber).toMatchObject({ npcSeats: 6, you: { councillor: true, canPropose: true } });
    expect(chamber.paper.items.map((i) => [i.name, i.movedBy.kind])).toEqual([
      // Review 1: the Collective's branch motion is the Long Service Order (was ord.shift-hours).
      ['Long Service Order', 'branch'],
    ]);
    expect(chamber.menu).toHaveLength(10);
    const moved = await A.caller.council.propose({ ordinanceId: 'ord.open-doors', idempotencyKey: key() });
    expect(moved).toMatchObject({
      act: 'propose',
      headline: 'Open Doors is on the order paper',
      // 45 − 10 + 5 (the orders) + 5: review 1 (§13.4), One of Us (200 Successes) pays 1 PC a boundary.
      knockOns: { pc: { before: 45, after: 25 } },
    });
    const voted = await A.caller.council.councilVote({ choice: 'ord.open-doors', idempotencyKey: key() });
    expect(voted).toMatchObject({ act: 'councilVote', headline: 'Your vote is recorded' });
    expect(voted.body).toBe(
      'For Open Doors. Public in the chamber, final. The council divides at {at}; the Clarion prints the result.',
    );

    // The division (into cycle day 2): the NPCs follow the player; Open Doors is in force.
    clock.set(at(D0 + 7));
    const city = await A.caller.city.get({ cityId: 'coalport' });
    expect(city.ordinance).toMatchObject({ ordinanceId: 'ord.open-doors', daysLeft: 5 });
    const canvass = city.locations[0]!.actions[0]!;
    expect(canvass.tags).toEqual([
      { ordinanceId: 'ord.open-doors', name: 'Open Doors', kind: 'chance', value: 4 },
    ]);
    expect(canvass.preview!.bonuses).toContainEqual({ id: 'ord.open-doors', label: 'Open Doors', value: 4 });
    const r = await A.caller.action.perform({
      actionId: canvass.id,
      locationId: 'coalport.mill-gate',
      idempotencyKey: randomUUID(),
      times: 1,
    });
    expect(r.attempts[0]!.check.bonuses).toContainEqual({
      id: 'ord.open-doors',
      label: 'Open Doors',
      value: 4,
    });
    expect(r.bonusTags).toContainEqual({ id: 'ord.open-doors', label: 'Open Doors', note: '+4 %' });
    const divided = (await OrderPaper.findOne({
      cityId: 'coalport',
      status: 'divided',
      'votes.0': { $exists: true },
    }).lean())!;
    expect(divided.division).toMatchObject({ passed: 'ord.open-doors', npcChoice: 'ord.open-doors' });
    const aPaper2 = await A.caller.paper.today();
    expect(aPaper2.headlines.map((h) => h.headline)).toContain('Council Passes Open Doors');

    // The term ends at the next count: 5 stipend boundaries, 50 PC and 100 FXP; completed.
    clock.set(at(D0 + 10));
    const back = await A.caller.paper.today();
    expect(back.desk.stipend).toEqual({ boundaries: 3, pc: 30, fxp: 60, cityName: 'Coalport' });
    const term = await OfficeTerm.findOne({ 'holder.characterId': A.id }).lean();
    expect(term).toMatchObject({ completed: true, fromDay: D0 + 5, toDay: D0 + 10 });
    expect(back.headlines.map((h) => h.headline)).toContain('Councillor Mara Lenk Rises');
    expect((await A.caller.character.me()).office).toBeNull();
    // The ordinance expires by the calendar at the next division: the branch's motion again.
    clock.set(at(D0 + 12));
    const later = await A.caller.city.get({ cityId: 'coalport' });
    expect(later.ordinance?.ordinanceId).toBe('ord.long-service');
    expect(await Election.countDocuments({ cityId: 'coalport', status: 'counted' })).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('an away councillor: NPCs vote the branch, and the whole stipend waits on return', async () => {
    await resetCity('coalport');
    const D0 = nextCycleDay('coalport', 0, 20760);
    const clock = testClock(at(D0));
    const A = await player(clock, { fxp: 2_000, successes: 200, pc: 20 });
    await A.caller.council.declare({ platformId: 'plat.c.mill', idempotencyKey: key() });
    await doTodaysOrders(A.caller); // alone: the branch counts two
    clock.set(at(D0 + 2));
    await A.caller.council.vote({ candidateKey: `p:${A.id}`, idempotencyKey: key() });
    const pc = (await A.caller.character.me()).pc;
    const fxp = (await A.caller.character.me()).fxp;
    // Away from the count to after the term: 11 days.
    clock.set(at(D0 + 13));
    const back = await A.caller.paper.today();
    expect(back.desk.stipend).toEqual({ boundaries: 5, pc: 50, fxp: 100, cityName: 'Coalport' });
    const me = await A.caller.character.me();
    // Review 1 (§13.4): One of Us (200 Successes) also pays 1 PC for each of the 11 boundaries away.
    expect(me.pc).toBe(pc + 50 + 11);
    expect(me.fxp).toBe(fxp + 100);
    const term = (await OfficeTerm.findOne({ 'holder.characterId': A.id }).lean())!;
    expect(term.completed).toBe(true);
    const p = (await OrderPaper.findById(term.councilKey).lean())!;
    expect(p.division).toMatchObject({ passed: 'ord.long-service', npcChoice: 'ord.long-service' });
    // Late front page: the term is over, so the count view and the Me tab only (design §17 Q14).
    expect(back.frontPage).toBeNull();
  });
});

describe.each([
  ['vanguard', 'duskwall', 'Duskwall', 'Sentinel', '{name} Heads the Poll in Duskwall'],
  ['alliance', 'ashford', 'Ashford', 'Gazette', '{name} Tops the Poll in Ashford'],
] as const)('the %s cycle', (factionId, cityId, cityName, paperShort, seatTop) => {
  it(`files alone, is carried by the branch, tops the poll: the ${paperShort}'s front page`, async () => {
    await resetCity(cityId);
    const D0 = nextCycleDay(cityId, 0, 20740);
    const clock = testClock(at(D0));
    const A = await player(clock, { factionId, fxp: 2_000, successes: 200, pc: 45, name: 'Ida Brandt' });
    const platform = content.faction(factionId).platforms[0]!.id;
    const filed = await A.caller.council.declare({ platformId: platform, idempotencyKey: key() });
    expect(filed.paper.shortName).toBe(paperShort);
    await doTodaysOrders(A.caller);
    clock.set(at(D0 + 1));
    expect((await A.caller.paper.today()).headlines.map((h) => h.headline)).toContain(
      factionId === 'vanguard'
        ? 'Ida Brandt Files for Duskwall Council'
        : 'Ida Brandt Files for Ashford Council',
    );
    clock.set(at(D0 + 2));
    await A.caller.council.vote({ candidateKey: `p:${A.id}`, idempotencyKey: key() });
    clock.set(at(D0 + 5));
    const paper = await A.caller.paper.today();
    expect(paper.paper.shortName).toBe(paperShort);
    expect(paper.frontPage?.headline).toBe(seatTop.replace('{name}', 'Ida Brandt'));
    expect(paper.frontPage?.caption.cityName).toBe(cityName);
    expect(paper.frontPage!.count.rows[0]).toMatchObject({ name: 'Ida Brandt', endorsementsCounted: 2 });
  });
});
