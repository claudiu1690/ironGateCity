import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import {
  Bill,
  Candidacy,
  City,
  FactionElection,
  IssueModel,
  NationalElection,
  Petition,
} from '@irongate/db';
import type {
  BillDoc,
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  FactionElectionDoc,
  IssueDoc,
  NationalElectionDoc,
  OfficeTermDoc,
  PetitionDoc,
} from '@irongate/db';
import { backersOf, dayStart, signaturesNeeded, termOf } from '@irongate/rules';
import type { DayKey, FactionId, NationalCondition } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { ordinalWord } from './nationEdition';
import { eligibleResidents } from './petitionService';
import { weekdayName } from './politicsService';

/**
 * Slice 7 T20 (docs/tech/slice-7.md §11.2; design §11.2, §23.9): the personal national lines' facts,
 * read in the settlement's transaction and stored on the edition. Each line gets its own fills
 * (`varsByKind`: two lines may both name `{votes}` or `{law}`), and a line whose deck keeps `{until}`
 * stores the epoch beside it (`until`), rendered in the reader's clock by the client.
 *
 * *Yesterday* is the boundary day, as slices 3–6: an act of the member's (filed, tabled, opened or
 * signed) is yesterday's (`today − 1`); a count, a seating or a close is the boundary's (`today`), or
 * any boundary since the last settlement for a member coming back after days away. A line whose
 * fact cannot be named is not stored, so no edition prints a `{token}`.
 */

export type NationalKind = NationalCondition['kind'];

export interface PersonalLines {
  kinds: NationalKind[];
  /** The fills every national line shares: the member's name and party (its full name). */
  vars: Record<string, string>;
  varsByKind: Partial<Record<NationalKind, Record<string, string>>>;
  /** Epoch ms for a line whose deck keeps `{until}`. */
  until: Partial<Record<NationalKind, number>>;
}

/** *The home city is in Unrest*: a reason at the head of a sentence. */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A score as the result page prints it (one decimal). */
const score1 = (n: number | undefined) => (Math.round((n ?? 0) * 10) / 10).toFixed(1);
/** *Congress* for *the Congress*: the templates say *the {pickName}* themselves. */
const pickNameOf = (content: GameContent, f: FactionId) => (content.faction(f).pickName ?? 'party').replace(/^the\s+/i, '');

interface ChairRow {
  key: string;
  kind?: string;
  name?: string;
  votes?: number;
  total?: number;
  place?: number;
}
interface StoredNational {
  scores?: Array<{ factionId: FactionId; score: number }>;
  president?: { key: string; name: string; factionId: FactionId };
  seats?: Record<FactionId, number>;
  lists?: Partial<Record<FactionId, Array<{ key: string; name: string; seated: boolean; place: number }>>>;
}

export async function readPersonalLines(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  terms: readonly OfficeTermDoc[],
  session: ClientSession,
  now: number,
): Promise<PersonalLines> {
  const out: PersonalLines = {
    kinds: [],
    vars: { name: c.name, faction: content.faction(c.factionId).name },
    varsByKind: {},
    until: {},
  };
  const settled = c.day.settled;
  if (settled === null) return out;
  const add = (kind: NationalKind, vars: Record<string, string> = {}, until?: number) => {
    if (!out.kinds.includes(kind)) out.kinds.push(kind);
    out.varsByKind[kind] = { ...out.varsByKind[kind], ...vars };
    if (until !== undefined) out.until[kind] = until;
  };
  const me = `p:${c._id.toHexString()}`;
  const f = c.factionId;
  const yesterday = today - 1;
  /** A boundary since the last settlement (the count, the seating or the close the member missed). */
  const since = (d: DayKey | null | undefined): boolean => d !== null && d !== undefined && d > settled && d <= today;
  const s = <T>(q: { session(x: ClientSession): T }): T => q.session(session);
  const cityName = (id: string) => content.city(id)?.name ?? id;

  // ----- The offices taken, the Address, a pledge, a local in the Governor's chair -------------
  const began = (t: OfficeTermDoc) => t.fromDay > settled && t.fromDay <= today && (t.vacatedDay ?? null) === null;
  for (const t of terms) {
    const office = t.office ?? 'council';
    if (office === 'governor' && began(t)) add('governorTookOffice', { city: cityName(t.cityId) });
    if (office === 'chair' && began(t)) {
      // `{votes}` of the Chair's count: the member's row, else the line is not printed.
      const e = await s(FactionElection.findById(t.electionId)).lean<FactionElectionDoc>();
      const rows = ((e?.result as { rows?: ChairRow[] } | null)?.rows ?? []) as ChairRow[];
      const row = rows.find((r) => r.key === me);
      if (row?.votes !== undefined) add('chairElected', { votes: String(row.votes) });
    }
    // A list place (≤ 60); the test hook stores the seat number (100 × the party's index + place).
    if (office === 'deputy' && began(t)) add('deputySeated', { ordinal: ordinalWord(((t.place - 1) % 100) + 1) });
    if (office === 'president' && began(t)) add('presidentSeated');
    if ((office === 'governor' || office === 'president') && t.powers?.address?.day === yesterday) {
      const { cityId, issueDocId } = t.powers.address;
      const hallId = content.city(cityId)?.council?.hall.locationId;
      const issue = await s(IssueModel.findById(issueDocId)).lean<IssueDoc>();
      const issueShort = issue ? content.issue(issue.issueId)?.short : undefined;
      if (issueShort)
        add('addressGiven', {
          issueShort,
          hall: (hallId ? content.location(hallId)?.location.name : undefined) ?? cityName(cityId),
        });
    }
    if (office === 'president') {
      const kept = (t.pledges ?? []).find((p) => p.keptDay === today);
      if (kept) add('pledgeKept', { law: content.law(kept.lawId)?.name ?? kept.lawId });
    }
    // A local holds the chair of the council the member was seated on today (`hl.*.governor-local`).
    if (office === 'council' && t.fromDay === today) {
      const city = await s(City.findById(t.cityId, { council: 1 })).lean<CityDoc>();
      const gov = city?.council?.governor;
      if (gov?.local && gov.factionId === f) add('governorLocal', { local: gov.name });
    }
    // The member's council dissolved by petition (`hl.*.dissolved-councillor`): the seat vacated at
    // the boundary the city's petition closed.
    if (office === 'council' && since(t.vacatedDay)) {
      const city = await s(City.findById(t.cityId, { council: 1 })).lean<CityDoc>();
      const dissolved = city?.council?.dissolved;
      if (dissolved && dissolved.day === t.vacatedDay) {
        const p = await s(Petition.findById(dissolved.petitionId)).lean<PetitionDoc>();
        if (p)
          add('dissolvedCouncillor', {
            city: cityName(t.cityId),
            signatures: String(p.count),
            // As the national line (`nl.council-dissolved`): the weekday the council's term ran to.
            weekday: weekdayName(city!.council!.toDay ?? today),
          });
      }
    }
  }

  // ----- The Chair: filed yesterday, lost at the count, a vote on the Chair opened ----------------
  const filed = await s(
    Candidacy.findOne({ characterId: c._id, kind: 'chair', filedDay: yesterday, status: 'standing' }),
  ).lean<CandidacyDoc>();
  if (filed) add('chairFiled', { backers: String(backersOf({ members: filed.endorsements.length, branch: filed.branch !== null })) });

  const chairE = await s(FactionElection.findById(`chair:${f}:${termOf(today).index}`)).lean<FactionElectionDoc>();
  if (chairE?.status === 'counted' && since(chairE.countDay)) {
    const r = chairE.result as { rows?: ChairRow[]; winner?: { name: string }; secretaryKept?: boolean } | null;
    const rows = r?.rows ?? [];
    const mine = rows.find((x) => x.key === me);
    const top = rows[0];
    // Lost: on the ballot, and the winner (another member or the secretary) is not the member.
    // `{votes}` / `{yourVotes}` are the count's totals (votes + 3 per backer), the figure that decided.
    if (mine && top && top.key !== me && r?.winner?.name)
      add('chairLost', { winner: r.winner.name, votes: String(top.total ?? top.votes ?? 0), yourVotes: String(mine.total ?? mine.votes ?? 0) });
  }

  const vote = await s(
    FactionElection.findOne({ kind: 'confidence', factionId: f, status: 'voting', votesFrom: { $gt: settled, $lte: today } }).sort({
      votesFrom: -1,
    }),
  ).lean<FactionElectionDoc>();
  if (vote) {
    const reasons = copy.nation.petition.reasons;
    add('chairVoteOpened', { reason: sentence(reasons[vote.trigger ?? 'petition']) }, dayStart(vote.countDay));
  }

  // ----- The national election: the pick (day 23), the count (27), the seats (day 0) ---------------
  const n = termOf(today).index;
  const nat = await s(NationalElection.findById(`nation:${n}`)).lean<NationalElectionDoc>();
  const pick = nat?.picks?.[f];
  if (nat && pick?.voted && pick.result && pick.ballot && since(nat.votesFrom)) {
    const mineRow = pick.result.rows.find((x) => String(x.key) === me);
    if (mineRow) {
      const nameOf = (key: string) => pick.ballot!.find((l) => l.key === key)?.name ?? key;
      const votesOf = (key: string) => String(Number(pick.result!.rows.find((x) => String(x.key) === key)?.votes ?? 0));
      const pickName = pickNameOf(content, f);
      if (pick.result.winnerKey === me)
        add('pickWon', { votes: votesOf(me), pickName, weekday: weekdayName(nat.votesFrom) });
      else
        add('pickLost', { pickName, winner: nameOf(pick.result.winnerKey), votes: votesOf(pick.result.winnerKey), yourVotes: votesOf(me) });
    }
  }
  const counted = nat && (nat.status === 'counted' || nat.status === 'seated') ? (nat.result as StoredNational | null) : null;
  if (nat && counted?.president && since(nat.countDay)) {
    const mineCand = (nat.candidates ?? []).find((k) => k.key === me);
    if (mineCand && counted.president.key !== me) {
      const sc = (x: FactionId) => counted.scores?.find((y) => y.factionId === x)?.score;
      add('presidentLost', { winner: counted.president.name, score: score1(sc(counted.president.factionId)), yourScore: score1(sc(f)) });
    }
  }
  // Day 0: the previous term's count seated its lists; on the list and not seated.
  const prev = await s(NationalElection.findById(`nation:${n - 1}`)).lean<NationalElectionDoc>();
  const seatedResult = prev?.status === 'seated' ? (prev.result as StoredNational | null) : null;
  if (prev && seatedResult?.lists && since(prev.officeDay) && seatedResult.president?.key !== me) {
    const list = seatedResult.lists[f] ?? [];
    const idx = list.findIndex((l) => l.key === me);
    if (idx >= 0 && !list[idx]!.seated) {
      const seats = seatedResult.seats?.[f] ?? list.filter((l) => l.seated).length;
      add('listMissed', { margin: String(idx + 1 - seats), seats: String(seats), ordinal: ordinalWord(idx + 1) });
    }
  }

  // ----- Bills: tabled yesterday as a deputy; divided at this boundary ------------------------------
  const tabled = await s(
    Bill.find({ 'tabledBy.characterId': c._id, tabledDay: yesterday, kind: { $in: ['law', 'strike'] } }).sort({ tabledAt: 1 }),
  ).lean<BillDoc[]>();
  // The headline says *Deputy {name}*: a bill the member put as a deputy (a Chair's or the
  // President's is not a deputy's; their lines are open with the designer).
  const asDeputy = tabled.find((b) => b.tabledBy.as === 'deputy' && b.lawId && content.law(b.lawId));
  if (asDeputy) {
    const law = content.law(asDeputy.lawId!)!;
    add(
      'billTabled',
      { law: asDeputy.kind === 'strike' ? `Striking out the ${law.name}` : law.name, lawLine: law.line, needed: String(asDeputy.needed) },
      dayStart(asDeputy.divideDay),
    );
  }
  const divided = await s(Bill.find({ 'tabledBy.characterId': c._id, divideDay: today })).lean<BillDoc[]>();
  for (const b of divided) {
    const law = b.lawId ? content.law(b.lawId) : undefined;
    if (!law || !b.division) continue;
    const vars = { law: law.name, forVotes: String(b.division.for), needed: String(b.needed), days: String(law.days) };
    if (b.status === 'failed') add('billFailed', vars);
    else if (['awaitingSignature', 'passed', 'inForce', 'vetoed'].includes(b.status)) add('billPassed', vars);
  }

  // ----- Petitions to dissolve a council: opened or signed yesterday; fell short -------------------
  const signedBy = { $or: [{ 'openedBy.characterId': c._id }, { 'signatures.characterId': c._id }] };
  const opened = await s(
    Petition.findOne({
      kind: 'dissolve',
      status: 'open',
      $or: [
        { 'openedBy.characterId': c._id, openedDay: yesterday },
        { signatures: { $elemMatch: { characterId: c._id, day: yesterday } } },
      ],
    }),
  ).lean<PetitionDoc>();
  if (opened?.cityId) {
    // `{needed}` as the petition card reads it while open (the turnout roll now); fixed at the close.
    const needed = signaturesNeeded(await eligibleResidents(opened.cityId, now, session));
    add(
      'petitionOpened',
      { city: cityName(opened.cityId), signatures: String(opened.count), needed: String(needed) },
      dayStart(opened.closesDay),
    );
  }
  const failed = await s(
    Petition.findOne({ kind: 'dissolve', status: 'failed', closesDay: { $gt: settled, $lte: today }, ...signedBy }).sort({ closesDay: -1 }),
  ).lean<PetitionDoc>();
  if (failed?.cityId && failed.needed !== null) {
    const city = await s(City.findById(failed.cityId, { council: 1 })).lean<CityDoc>();
    // *The council sits to {weekday}'s result*: the sitting council's count.
    const toDay = city?.council?.toDay;
    if (toDay !== undefined)
      add('petitionFailed', { signatures: String(failed.count), needed: String(failed.needed), weekday: weekdayName(toDay) });
  }
  return out;
}
