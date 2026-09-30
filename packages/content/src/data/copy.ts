/**
 * Short UI copy for states the action text doesn't cover (designer answer, slice-1 content §12.1).
 * British English, no exclamation marks. Times are formatted by the caller in the player's local
 * clock ("UTC" never appears on a button). Plain data: safe to import in the client.
 */
import type { LocationKind } from '../schemas';

/**
 * The kicker on a location's sheet, "1 · Public office" (onboarding §14.3 n9): one per §13.5 kind,
 * so a new kind needs content, never client code.
 */
const KIND_LABELS: Record<LocationKind, string> = {
  'factory-gate': 'Factory gate',
  docks: 'Docks',
  market: 'Market',
  station: 'Station',
  street: 'Street',
  square: 'Square',
  bar: 'Bar',
  hotel: 'Hotel',
  press: 'Press',
  'faction-hq': 'Party hall',
  hospital: 'Hospital',
  jail: 'Jail',
  court: 'Courts',
  university: 'University',
  library: 'Library',
  gym: 'Club',
  barracks: 'Landmark',
  parliament: 'Parliament',
  ministry: 'Public office',
};

/** "Mill Gate, Market Row or Harbour Quays": commas, then a final "or". */
function listOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;
}

const STAT_NAMES = { str: 'Strength', int: 'Intelligence', agi: 'Agility' } as const;

/** "3 of 4", or "nil" when no member was eligible (a quiet city, counted with nobody active). */
export const turnoutOf = (voters: number, eligible: number) =>
  eligible === 0 ? 'nil' : `${voters} of ${eligible}`;

/** ", at Rank 2" / ", after your first ballot" (the hook format, design §17.7). */
const needsPhrase = (needs: string | null) =>
  needs ? (needs.startsWith('after ') ? `, ${needs}` : `, at ${needs}`) : '';

export const copy = {
  needsEnergy: (cost: number, readyAt: string) => `Needs ${cost} Energy · ready at ${readyAt}`,
  energyFull: (rested: number) => `Rested ${rested}`,
  energyFullAt: (at: string) => `full at ${at}`,
  x3Needs: (cost: number) => `×3 needs ${cost} Energy`,
  shiftWorked: (nextAt: string) => `Shift worked · next at ${nextAt}`,
  shiftNotYourJob: 'Not your job · see the Jobs card',
  shiftNoJob: 'No job yet · take one below',
  /** Me tab, no job: the home city's places with a Jobs card, in pin order (content §13.7, n4). */
  meNoJob: (places: string[]) => `No job yet · take one at ${listOr(places)}`,
  takeJob: 'Take the job',
  jobPayLine: (pay: number) => `${pay} a day · half at midnight, half for the shift`,
  switchJob: (energy: number) => `Switch · ${energy} Energy · streak resets`,
  yourJob: (streak: number, sickDaysLeft: number) =>
    `Your job · streak ${streak} ${streak === 1 ? 'day' : 'days'} · ${sickDaysLeft} sick ${sickDaysLeft === 1 ? 'day' : 'days'} left`,
  /** "Needs Level 3, AGI 10": only the unmet requirements, level first. */
  jobNeeds: (parts: string[]) => `Needs ${parts.join(', ')}`,
  jobTaken: (firstPayAt: string) => `Taken · first half pay at ${firstPayAt}`,
  jobTakenOrder: (fxp: number) => `Taken · party order complete: +${fxp} FXP`,
  jobSwitched: (firstPayAt: string) => `Switched · streak reset · first half pay at ${firstPayAt}`,
  orderTag: (progress: number, target: number, pct: number) =>
    `Party order ${progress} / ${target} · +${pct} % FXP`,
  orderDone: 'Order done',
  allOrdersDone: (pc: number) => `All orders carried out · +${pc} PC`,
  pointsToPlace: (n: number) => `${n} ${n === 1 ? 'point' : 'points'} to place`,
  levelPointsToPlace: (level: number, n: number) =>
    `Level ${level} · ${n} stat ${n === 1 ? 'point' : 'points'} to place`,
  statButton: (stat: string, from: number) => `${stat} ${from} → ${from + 1}`,
  levelUpLine: (from: number, to: number, points: number) =>
    to - from > 1 ? `Levels ${from + 1}–${to} · ${points} points to place` : `Level ${to} · place your point`,
  standingUp: (city: string, name: string, bonus: number) => `${city}: ${name} · actions here +${bonus} %`,
  orderComplete: (fxp: number) => `Party order complete: +${fxp} FXP`,
  later: 'Later',
  // Not in the §12.1 table: the out-of-Energy card and the Today strip (tech design §12.2).
  outOfEnergy: 'Out of Energy',
  outOfEnergyRegen: (fullAt: string) => `+5 every 10 min · full at ${fullAt}`,
  outOfEnergyRested: "Rested banks once you're full",
  waitingForYou: 'Waiting for you',
  toTheCity: 'To the city',
  /** App shell banner: the city paper's short name ("The Clarion is in", content §13.7, n3). */
  paperIsIn: (shortName: string) => `The ${shortName} is in`,
  // Auth pages (content §13.4).
  signupTitle: 'Join the campaign',
  loginTitle: 'Sign in',
  // Slice 2 (tech design §12.4; approved in onboarding §13.1).
  /** The sign-up field label. */
  yourFace: 'Your face',
  /** The sign-up form without a face, and the Me tab's heading when changing it. */
  chooseYourFace: 'Choose your face',
  /** Me tab, a migrated character with no face yet (onboarding §13 Q7). */
  noFaceYet: 'No face yet',
  storyWaits: 'Close the game now and this waits for you',
  storyProgress: (step: number, of: number) => `Step ${step} of ${of}`,
  hisWish: (fxp: number) => `His wish · +${fxp} Faction XP`,
  joinFaction: (name: string, city: string) => `Join the ${name} · take the train to ${city}`,
  /** "+2 Strength, +1 Intelligence". */
  statBonus: (bonus: Partial<Record<'str' | 'int' | 'agi', number>>) =>
    (Object.entries(bonus) as Array<['str' | 'int' | 'agi', number]>)
      .map(([stat, n]) => `+${n} ${STAT_NAMES[stat]}`)
      .join(', '),
  startsIn: (city: string) => `Starts in ${city}`,
  /** The article travels with the content string: "Their event: the General Strike". */
  theirEvent: (name: string) => `Their event: ${name}`,
  letterReady: (chapter: number, energy: number) => `Chapter ${chapter} is ready · ${energy} Energy`,
  letterMidway: 'waiting for you',
  wearing: (name: string, cha: number) => `Wearing: ${name} · CHA ${cha}`,
  /** "Iron Vanguard · Initiate · member since 29 September". */
  partyCard: (faction: string, rank: string, date: string) => `${faction} · ${rank} · member since ${date}`,
  keepsakeLine: (name: string) => `Keepsake: ${name}`,
  chapterKicker: (title: string, n: number, of: number) => `Ambition · ${title} · Chapter ${n} of ${of}`,
  /** `Chapter {n}, "{title}": from {Weekday D Month}, at {Rank n | Level n}` (onboarding §13 Q2). */
  chapterHook: (n: number, title: string, from: string, needs: string | null) =>
    `Chapter ${n}, "${title}": from ${from}${needsPhrase(needs)}`,
  /** "Rank 2", "Level 6", or (slice 3, design §17.7) "after your first ballot". */
  chapterNeeds: (needs: { rank?: number; level?: number; ballotCast?: boolean }) =>
    [
      needs.rank !== undefined ? `Rank ${needs.rank}` : null,
      needs.level !== undefined ? `Level ${needs.level}` : null,
      needs.ballotCast ? 'after your first ballot' : null,
    ]
      .filter(Boolean)
      .join(', '),
  // Slice-2 QA design answers (onboarding §14).
  /** The sign-up name, under the field on submit (§14.2; GDD §7.3): 2–40 characters once trimmed. */
  nameBlank: "Your name can't be blank",
  nameTooShort: 'Your name needs at least 2 characters',
  nameTooLong: 'Your name can have at most 40 characters',
  /** The name of an account made before the name rule with none (§14.2): neutral in every faction. */
  unnamed: 'A Newcomer',
  /** Me tab (§14.1): "Political Capital 5"; the HUD says "PC". */
  politicalCapital: (pc: number) => `Political Capital ${pc}`,
  /** The location sheet's kicker (§14.3 n9). */
  kindLabel: (kind: string) => KIND_LABELS[kind as LocationKind] ?? String(kind).replace(/-/g, ' '),
  /**
   * The chapter screen while the next chapter waits (§14.3 n13): "From Tuesday 6 October, at Rank 2",
   * or "From Tuesday 6 October" with no requirement.
   */
  chapterWaitsUntil: (from: string, needs: string | null) => `From ${from}${needsPhrase(needs)}`,
  backToThePaper: 'Back to the paper',
  // Slice 3 (docs/design/slice-3-screens.md §2.1, §11). Times are rendered by the caller in the
  // player's clock (`until`: "Tuesday midnight"; `at`: "01:00 on Sunday"; `weekday`: "Sunday").
  pollingDay: 'Polling Day',
  castYourBallot: 'Cast your ballot',
  castYourBallotFor: (name: string) => `Cast your ballot for ${name}`,
  chooseAName: 'Choose a name',
  ballotCaption: (at: string) => `One ballot, final. The count is at ${at}.`,
  ballotCastLine: (weekday: string) => `Ballot cast · the count is in ${weekday}'s paper`,
  standForTheCouncil: (pc: number) => `Stand for the council · ${pc} PC`,
  declare: (pc: number) => `Declare · ${pc} PC`,
  needsPc: (pc: number) => `Needs ${pc} PC`,
  endorse: (pc: number) => `Endorse · ${pc} PC`,
  endorsed: 'Endorsed',
  youEndorsed: (name: string, pc: number) => `You endorsed ${name} · −${pc} PC`,
  onTheSlate: (n: number, needed: number) => `On the slate · endorsements ${n} / ${needed}`,
  branchEndorsesYou: 'All orders carried out · the branch endorses you',
  branchMakesUpTheNumber: 'The branch will make up the number',
  withdraw: 'Withdraw',
  depositStays: 'The deposit stays with the branch',
  depositRule:
    'The deposit is spent when your name is printed on the ballot. Struck for want of endorsements: returned.',
  seeWhosStanding: "See who's standing",
  seeTheSlate: 'See the slate',
  wardCandidates: 'Ward candidates',
  ward: 'ward',
  npcSeats: (n: number, of: number) => `NPC seats ${n} / ${of}`,
  turnout: (n: number, m: number) => (m === 0 ? 'Turnout nil' : `Turnout ${n} of ${m} members`),
  theLine: 'the line',
  yourVote: 'your vote',
  you: 'you',
  toTheCouncil: 'To the council',
  theCouncilSits: 'The council sits · vote on the ordinance',
  theOrderPaper: 'The order paper',
  branchMotionBy: (secretary: string) => `the branch's motion · ${secretary}`,
  movedBy: (name: string) => `moved by ${name}`,
  againstAll: 'Against all',
  propose: (pc: number) => `Propose · ${pc} PC`,
  onThePaper: 'on the paper',
  paperFull: 'The order paper is full',
  youMoved: (name: string) => `You moved ${name}`,
  voteFor: (name: string) => `Vote for ${name}`,
  chooseAMotion: 'Choose a motion',
  councilCaption: (at: string) => `One vote, public in the chamber, final. The council divides at ${at}.`,
  voteRecorded: (weekday: string) => `Vote recorded · the division is in ${weekday}'s paper`,
  passed: 'Passed',
  roseWithoutMotion: 'Council rose without a motion',
  ordinanceLine: (name: string, days: number) =>
    `Ordinance: ${name} · ${days} ${days === 1 ? 'day' : 'days'} left`,
  ordinanceInForce: (name: string, days: number) =>
    `Ordinance in force: ${name} · ${days} ${days === 1 ? 'day' : 'days'} left`,
  councillorLine: (city: string, weekday: string) => `Councillor, ${city} · term ends ${weekday}`,
  noOffice: (rank3Title: string) => `No office · ${rank3Title}s may stand for the council`,
  pcSinks: (pc: number) => `Political Capital ${pc} · declare 10 · endorse 10 · propose 20`,
  moraleWord: { fired: 'Fired up', steady: 'Steady', unrest: 'Unrest' } as Record<string, string>,
  moraleCrossed: (city: string, state: string) =>
    state === 'fired'
      ? `${city}: Fired up · +10 % Faction XP at home`
      : `${city}: ${state === 'unrest' ? 'Unrest' : 'Steady'}`,
  electedCaption: (name: string, rank: string, city: string) =>
    `${name}, ${rank}, elected to ${city} Council`,
  elected: 'ELECTED',
  formula:
    "Total = ward vote + 3 × endorsements + members' votes. Ties: votes, endorsements, standing, filing.",
  ballotSecretNote: 'Turnout so far is not shown; the ballot is secret',
  pcLeft: (spent: number, left: number) => `−${spent} PC · ${left} left`,
  moraleKnockOn: (city: string, delta: string, after: string) => `${city} morale ${delta} → ${after} %`,
  // The Polling Day row (screens §2.1): line 1 and line 2 of each state.
  pd: {
    nominations: (city: string, weekday: string) => [
      `Nominations open in ${city}`,
      `${city} votes from ${weekday} · see who's standing`,
    ],
    stand: (pc: number, until: string) => [`Stand for the council · ${pc} PC`, `Nominations close ${until}`],
    filed: (n: number, needed: number, line: string) => [
      `On the slate · endorsements ${n} / ${needed}`,
      line,
    ],
    ballot: (until: string) => ['Cast your ballot', `Polls open until ${until} · the ballot is secret`],
    voted: (name: string, weekday: string) => [
      `Ballot cast for ${name}`,
      `The count is in ${weekday}'s paper`,
    ],
    count: (winner: string, npcSeats: number, voters: number, eligible: number) => [
      `Polls closed: ${winner} tops the poll`,
      `Seven seats, ${npcSeats} by ward members · turnout ${turnoutOf(voters, eligible)}`,
    ],
    councilSits: (until: string) => ['The council sits · vote on the ordinance', `Divides ${until}`],
    belowRank: (city: string, weekday: string, rank2: string, fxp: number) => [
      `${city} votes from ${weekday}`,
      `${rank2}s vote. ${fxp} Faction XP makes ${/^[aeiou]/i.test(rank2) ? 'an' : 'a'} ${rank2}.`,
    ],
    doOrders: "Do today's orders and the branch backs you",
  },
  // The HQ council card (screens §7).
  cc: {
    nominations: (until: string) => `Nominations open · closes ${until}`,
    polling: (until: string) => `Polls open · closes ${until}`,
    sits: (until: string) => `The council sits · divides ${until}`,
    castYourBallot: 'Cast your ballot',
    ballotCast: 'Ballot cast',
    voteOnTheOrdinance: 'Vote on the ordinance',
    seeTheCouncil: 'See the council',
    seeTheCount: 'See the count',
  },
} as const;

export type Copy = typeof copy;
