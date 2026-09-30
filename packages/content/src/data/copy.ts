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
  // The HUD's gauges in words (review 1 #3, #4, #14; answers §5, §8).
  hud: {
    energy: 'Energy',
    xp: 'XP',
    /** The XP value text by default: "{xp} XP · {n} to Level {next}" (answers §5). */
    xpLine: (xp: string, toNext: string, next: number) => `${xp} XP · ${toNext} to Level ${next}`,
    /** The FXP bar's label on narrow phones (answers §8). */
    rankN: (n: number) => `Rank ${n}`,
  },
  x3Needs: (cost: number) => `×3 needs ${cost} Energy`,
  /** Me tab, no job: the home city's places with a Jobs card, in pin order (content §13.7, n4). */
  meNoJob: (places: string[]) => `No job yet · take one at ${listOr(places)}`,
  takeJob: 'Take the job',
  // Review 1 (answers §1.2, §10.6): a job is a wage.
  jobPayLine: (pay: number) => `${pay} a day · paid at midnight`,
  switchJob: 'Switch · seniority resets',
  yourJob: (days: number, pct: number) =>
    `Your job · seniority ${days} ${days === 1 ? 'day' : 'days'} · +${pct} %`,
  /** The desk row: "Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)". */
  deskPaid: (iron: number, job: string, days: number, pct: number) =>
    `Paid: ${iron} Iron · ${job} · seniority ${days} ${days === 1 ? 'day' : 'days'} (+${pct} %)`,
  /** The desk row with no job: "No job yet · take one at the Fortress Gate, the Customs Market or the Goods Yard". */
  deskNoJob: (places: string[]) => `No job yet · take one at ${listOr(places)}`,
  /** A seniority line on the desk: "Seniority 4 days: +17". */
  seniorityLine: (days: number, amount: number) =>
    `Seniority ${days} ${days === 1 ? 'day' : 'days'}: +${amount}`,
  /** Review 1 (§13.4): the desk row for One of Us's PC. TODO(game-designer): confirm the wording. */
  oneOfUsPaid: (pc: number) => `One of Us · +${pc} Political Capital from the town`,
  /** "Needs Level 3, AGI 10": only the unmet requirements, level first. */
  jobNeeds: (parts: string[]) => `Needs ${parts.join(', ')}`,
  jobTaken: (firstPayAt: string) => `Taken · paid at ${firstPayAt}`,
  jobTakenOrder: (fxp: number) => `Taken · party order complete: +${fxp} FXP`,
  jobSwitched: (firstPayAt: string) => `Switched · seniority reset · paid at ${firstPayAt}`,
  orderTag: (progress: number, target: number, pct: number) =>
    `Party order ${progress} / ${target} · +${pct} % FXP`,
  orderDone: 'Order done',
  allOrdersDone: (pc: number) => `All orders carried out · +${pc} PC`,
  /**
   * Review 1 (answers §6): a single order done is a signed line in the result modal. `left` is the
   * number still open; 0 is the third, and the orders-complete note follows.
   */
  orderSigned: {
    vanguard: (fxp: number, left: number) =>
      left === 0
        ? `Order carried out · +${fxp} FXP. That's all three: see the note.`
        : `Order carried out · +${fxp} FXP. ${left === 1 ? 'One remains' : 'Two remain'}. — V.S.`,
    collective: (fxp: number, left: number) =>
      left === 0
        ? `Order carried out · +${fxp} FXP. That's all three: see the note.`
        : `Done, that one · +${fxp} FXP. ${left === 1 ? 'One to go' : 'Two to go'}. — P.H.`,
    alliance: (fxp: number, left: number) =>
      left === 0
        ? `Order carried out · +${fxp} FXP. That's all three: see the note.`
        : `Ticked · +${fxp} FXP. ${left === 1 ? 'One left' : 'Two left'}. — T.G.`,
  },
  /** Review 1 (answers §6): the orders-complete note, in the secretary's voice. */
  ordersComplete: {
    vanguard: {
      headline: 'Orders carried out',
      body: (name: string) =>
        `Three of three, ${name}. Entered in the day book, in order. The committee will hear of it. — V.S.`,
    },
    collective: {
      headline: 'All three done',
      body: (name: string) =>
        `That's a day's work for the branch, ${name}. Get some tea; the wards will still be there tomorrow. — P.H.`,
    },
    alliance: {
      headline: 'Three for three',
      body: (name: string) =>
        `Three for three, ${name}. I've written it down, which around here is praise. — T.G.`,
    },
    pcTile: 'Political Capital',
    fxpTile: 'Faction XP from orders today',
    tomorrow: "Tomorrow's orders are in the morning paper",
    carryOn: 'Carry on',
  },
  /** Review 1 (answers §7): the stat-point choice screen. */
  statChoice: {
    lead: (city: string, stat: string, n: number, m: number, best: string, v: number, same: boolean) =>
      same
        ? `Most of the work in ${city} uses ${stat}: ${n} of ${m} actions, and it is your best, at ${v}.`
        : `Most of the work in ${city} uses ${stat}: ${n} of ${m} actions. Your best is ${best} ${v}.`,
    str: (n: number, m: number) =>
      `Strength. Shift changes, loaders, posters, the gate steps: ${n} of ${m} actions here. Later, security work, marches and holding your own.`,
    int: (n: number, m: number) =>
      `Intelligence. Queues, clerks, committees, the registers: ${n} of ${m} actions here. Later, espionage, exposés and the better-paid desks.`,
    agi: (n: number, m: number) =>
      `Agility. Leaflets, chalk, the evening run: ${n} of ${m} actions here. Later, stealth work and getting away clean.`,
    footer: "Charisma isn't trained. It's worn: your coat, your suit, your party outfit.",
  },
  /** Review 1 (answers §4, GDD §8.4): the odds as a sentence, the roll line and the ledger. */
  odds: {
    above: (stat: string, v: string, d: number, diff: string, pct: number) =>
      `Your ${stat} ${v} is ${diff} above the ${d} this needs: ${pct} %.`,
    below: (stat: string, v: string, d: number, diff: string, pct: number) =>
      `Your ${stat} ${v} is ${diff} below the ${d} this needs: ${pct} %.`,
    equal: (stat: string, v: string, d: number, pct: number) =>
      `Your ${stat} ${v} matches the ${d} this needs: ${pct} %.`,
    /** rel: "2 below" | "4 above" | "level with". */
    two: (a: string, va: number, b: string, vb: number, avg: string, d: number, rel: string, pct: number) =>
      `${a} ${va} and ${b} ${vb} average ${avg}, ${rel} the ${d} this needs: ${pct} %.`,
    best: (stat: string, v: number, d: number, rel: string, pct: number) =>
      `Your best, ${stat} ${v}, is ${rel} the ${d} this needs: ${pct} %.`,
    /** The sentence's ending with one bonus, in place of its final ": {pct} %.". */
    bonusOne: (pct: number, label: string, b: number, total: number) =>
      `${pct} %, and +${b} % for ${label}: ${total} %.`,
    bonusMany: (pct: number, b: number, total: number) =>
      `${pct} %, and bonuses ${b >= 0 ? '+' : ''}${b} %: ${total} %.`,
    capped: (raw: number, cap: number) => `${raw} %, capped at ${cap} %.`,
    rollSuccess: (roll: number, chance: number) => `Rolled ${roll}: Success (${chance} or under).`,
    rollPartial: (roll: number, lo: number, hi: number) => `Rolled ${roll}: Partial (${lo} to ${hi}).`,
    rollPartialNoFail: (roll: number, what: string) => `Rolled ${roll}: Partial (a ${what} never fails).`,
    rollFailure: (roll: number) => `Rolled ${roll}: Failure (more than 20 over).`,
    ledgerEven: 'Even odds',
    ledgerStat: (stat: string, v: string, rel: string, d: number) =>
      `${stat} ${v}, ${rel} the ${d} needed, 4 % a point`,
    ledgerTwo: (a: string, va: number, b: string, vb: number, avg: string, rel: string, d: number) =>
      `${a} ${va} and ${b} ${vb}, average ${avg}: ${rel} the ${d} needed`,
    ledgerBest: (stat: string, v: number, rel: string, d: number) =>
      `Your best stat, ${stat} ${v}: ${rel} the ${d} needed`,
    ledgerChance: 'Chance',
    ledgerCapped: (raw: number) => `${raw} before the cap`,
    ledgerNote:
      'Every check starts at even odds and moves 4 % for each point your stat is above or below what the job needs, plus bonuses; never under 5 % or over 95 %. A roll at or under the chance is a Success.',
    /** The ticket before the tap: "62 % · STR 11", "44 % · CHA 2 + INT 11", "70 % · your best, STR 13". */
    ticket: (pct: number, statLine: string) => `${pct} % · ${statLine}`,
    ticketBest: (stat: string, v: number) => `your best, ${stat} ${v}`,
  },
  /**
   * Review 1 (answers §5, GDD §3.7): the notes behind the dotted-underlined labels, [kicker, note].
   * `{n}` values are filled by the caller.
   */
  help: {
    energy: (fullAt: string | null) => [
      'Energy',
      `Every action costs Energy. It refills by itself, five points every ten minutes, up to 100. Nothing is lost by waiting${fullAt ? `: full at ${fullAt}` : ''}.`,
    ],
    rested: () => [
      'Rested',
      'When Energy is full the refill banks here instead, up to 200. Each Rested point spent alongside an Energy point pays half again in XP and Iron.',
    ],
    xp: (n: string, next: number) => [
      'Experience',
      `Every action pays Experience. Levels open places, kit and the train, and each one gives a stat point. ${n} more to Level ${next}.`,
    ],
    fxp: (rank2: string, rank3: string, n: string | null, nextTitle: string | null) => [
      'Faction XP',
      `Your standing in the party, earned by party work and orders. Ranks give rights: the vote at ${rank2}, a council candidacy at ${rank3}.${n !== null && nextTitle ? ` ${n} more to ${nextTitle}.` : ''}`,
    ],
    pc: () => [
      'Political Capital',
      'Spent on politics: filing for the council (10), endorsing a name (10), moving an ordinance (20). Earned by carrying out all three orders (+5 a day) and by holding office.',
    ],
    standing: (city: string) => [
      'Local standing',
      `How well ${city} knows your face. Every Success here counts: Familiar at 10 gives +3 % on every check in the city, Known at 30 +6 %, Trusted at 70 +9 %, One of Us at 150 +12 % and 1 PC a day.`,
    ],
    share: (city: string) => [
      `Who holds ${city}`,
      "Each party's share of the town, and in grey the undecided: Neutral is nobody's, and every canvass draws from it first. A home city never falls below half for its own party; the rest is the fight.",
    ],
    shareCaption: (city: string) => `Who holds ${city}`,
    morale: () => [
      'Morale',
      "The home party's share is its morale. Fired up, 80 and over: party work here pays +10 % Faction XP. Steady: nothing special. Unrest, under 60: the branch is in trouble and the orders change.",
    ],
    ordinance: () => [
      'Ordinance',
      "The council's standing order for the town, in force for five days and for everyone here whatever their party. Passed at the council by four votes of seven.",
    ],
    today: (at: string) => [
      'Today',
      `What you have done since midnight. The day turns at ${at}, and this becomes Yesterday in the morning paper.`,
    ],
    todayEnergy: () => ['Energy spent', "Energy spent today. A ×3 is three actions' worth."],
    todayAttempts: () => ['Attempts', 'Actions taken today, a ×3 counting three.'],
    todayWins: () => ['Wins', 'Successes today. Each one counts towards your standing here.'],
    todayXp: () => ['Experience today', 'Experience earned today, Rested included.'],
    todayFxp: () => ['Faction XP today', "Faction XP earned today, the orders' bonuses included."],
    todayIron: () => [
      'Iron today',
      'Iron earned by actions today. Your wage lands at midnight and shows on the desk.',
    ],
    todayOpinion: (city: string) => [
      'Opinion moved',
      `How far your work moved ${city}'s meter today, in points of the town. A canvass is +0.05.`,
    ],
    todayOrders: () => [
      'Orders',
      'Party orders carried out today, of three. All three: +5 Political Capital.',
    ],
    todayTrained: () => ['Trained', 'Stat points trained today.'],
    /** The one first-time hint, on the plate on the welcome day. */
    firstHint: 'Anything underlined can be tapped for what it means.',
    close: 'Close',
  },
  /** The waiting badge (answers §7): "1 point to place · nothing is lost by choosing later". */
  pointsToPlace: (n: number) =>
    `${n} ${n === 1 ? 'point' : 'points'} to place · nothing is lost by choosing later`,
  levelPointsToPlace: (level: number, n: number) =>
    `Level ${level} · ${n} stat ${n === 1 ? 'point' : 'points'} to place`,
  statButton: (stat: string, from: number) => `${stat} ${from} → ${from + 1}`,
  levelUpLine: (from: number, to: number, points: number) =>
    to - from > 1 ? `Levels ${from + 1}–${to} · ${points} points to place` : `Level ${to} · place your point`,
  standingUp: (city: string, name: string, bonus: number) => `${city}: ${name} · actions here +${bonus} %`,
  /**
   * Review 1 (answers §9, GDD §13.4): the Standing card in the result modal on a level crossing.
   * [heading, what changed, what the next level brings].
   */
  standingCard: {
    kicker: 'Local standing',
    1: (city: string, rank3: string) => [
      `Familiar in ${city}`,
      `Faces nod. Every check in ${city} is now +3 %.`,
      `Known at 30 Successes: +6 %, and your name will do for a council candidacy at ${rank3}.`,
    ],
    2: (city: string, rank3: string) => [
      `Known in ${city}`,
      `+6 % on every check here, and the town knows your name well enough to stand for its council once you are a ${rank3}.`,
      'Trusted at 70: +9 %.',
    ],
    3: (city: string) => [
      `Trusted in ${city}`,
      '+9 % on every check here. Doors open before you knock.',
      'One of Us at 150: +12 % and 1 Political Capital a day.',
    ],
    4: (city: string) => [
      `One of Us in ${city}`,
      '+12 % on every check here, the most standing gives, and 1 Political Capital a day from the town.',
      'Nothing above this; it never decays.',
    ],
  } as Record<'kicker', string> &
    Record<1 | 2 | 3 | 4, (city: string, rank3: string) => [string, string, string]>,
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
