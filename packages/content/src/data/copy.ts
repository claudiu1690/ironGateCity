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

const STAT_NAMES = { str: 'Strength', int: 'Intelligence', agi: 'Agility', cha: 'Charisma' } as const;

/** "3 of 4", or "nil" when no member was eligible (a quiet city, counted with nobody active). */
export const turnoutOf = (voters: number, eligible: number) =>
  eligible === 0 ? 'nil' : `${voters} of ${eligible}`;

/** ", at Rank 2" / ", after your first vote" (the hook format, design §17.7). */
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
    /** Review 2 (answers §1.9): the Party XP bar's name. */
    fxp: 'Party XP',
    /** The Party XP bar's label on narrow phones (answers §8). */
    rankN: (n: number) => `Rank ${n}`,
    /** Review 2 #7: the Party XP bar's label, "To Steward", and its numbers after the bar. */
    toRank: (title: string) => `To ${title}`,
    fxpLine: (fxp: string, next: string) => `${fxp} / ${next} Party XP`,
    /** At the top rank there is no next one: the total alone. */
    fxpTop: (fxp: string) => `${fxp} Party XP`,
  },
  x3Needs: (cost: number) => `×3 needs ${cost} Energy`,
  /** Review 2 (answers §1.11): a ticket locked on reputation, "Needs a Known reputation here". */
  needsReputation: (level: number) =>
    `Needs a ${['Stranger', 'Familiar', 'Known', 'Trusted', 'One of Us'][level] ?? 'better'} reputation here`,
  /** The type labels on a ticket (answers §1.11). */
  typeLabel: {
    canvass: 'Talk to voters',
    speech: 'Speech',
    propaganda: 'Spread the word',
    intelligence: 'Watch and listen',
    council: 'Party meeting',
    training: 'Training',
  } as Record<string, string>,
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
  jobTakenOrder: (fxp: number) => `Taken · party order complete: +${fxp} Party XP`,
  jobSwitched: (firstPayAt: string) => `Switched · seniority reset · paid at ${firstPayAt}`,
  orderTag: (progress: number, target: number, pct: number) =>
    `Party order ${progress} / ${target} · +${pct} % Party XP`,
  orderDone: 'Order done',
  allOrdersDone: (pc: number) => `All orders carried out · +${pc} Political Capital`,
  /**
   * Review 1 (answers §6): a single order done is a signed line in the result modal. `left` is the
   * number still open; 0 is the third, and the orders-complete note follows.
   */
  orderSigned: {
    vanguard: (fxp: number, left: number) =>
      left === 0
        ? `Order carried out · +${fxp} Party XP. That's all three: see the note.`
        : `Order carried out · +${fxp} Party XP. ${left === 1 ? 'One remains' : 'Two remain'}. — V.S.`,
    collective: (fxp: number, left: number) =>
      left === 0
        ? `Order carried out · +${fxp} Party XP. That's all three: see the note.`
        : `Done, that one · +${fxp} Party XP. ${left === 1 ? 'One to go' : 'Two to go'}. — P.H.`,
    alliance: (fxp: number, left: number) =>
      left === 0
        ? `Order carried out · +${fxp} Party XP. That's all three: see the note.`
        : `Ticked · +${fxp} Party XP. ${left === 1 ? 'One left' : 'Two left'}. — T.G.`,
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
        `That's a day's work for the branch, ${name}. Get some tea; the streets will still be there tomorrow. — P.H.`,
    },
    alliance: {
      headline: 'Three for three',
      body: (name: string) =>
        `Three for three, ${name}. I've written it down, which around here is praise. — T.G.`,
    },
    pcTile: 'Political Capital',
    fxpTile: 'Party XP from orders today',
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
      `Intelligence. Queues, clerks, meetings, the records: ${n} of ${m} actions here. Later, espionage, exposés and the better-paid desks.`,
    agi: (n: number, m: number) =>
      `Agility. Flyers, chalk, the paper round: ${n} of ${m} actions here. Later, stealth work and getting away clean.`,
    footer: "Charisma isn't trained. It's worn: your coat, your suit, your party outfit.",
  },
  /**
   * Review 2 (answers §2, GDD §8.4): the odds are a word, never a number; a result that isn't a
   * Success says why in one plain line. No string here prints a digit.
   */
  odds: {
    band: (chance: number) => (chance >= 70 ? 'Good odds' : chance >= 50 ? 'Fair odds' : 'Long shot'),
    /** "Good odds · Intelligence", "Fair odds · Charisma and Intelligence". */
    ticket: (band: string, statLine: string) => `${band} · ${statLine}`,
    statLine: (names: string[]) => names.join(' and '),
    statBest: (name: string) => `your best, ${name}`,
    /** "Intelligence 12 → 13 · always works" (training). */
    alwaysWorks: 'always works',
    note: {
      good: (stat: string) => ['Good odds', `About three tries in four come off here. It uses your ${stat}.`],
      fair: (stat: string) => ['Fair odds', `About one try in two comes off here. It uses your ${stat}.`],
      long: (stat: string) => [
        'Long shot',
        `Fewer than one try in two come off here. It uses your ${stat}; training it would help.`,
      ],
    },
    /** A tag's suffix: "Open Doors · better odds", "First day in Duskwall · better odds". */
    betterOdds: 'better odds',
    worseOdds: 'worse odds',
  },
  /** Review 2 (answers §2.4): the one reason under a row that isn't a Success. */
  reason: {
    statLow: (stat: string, place: string | null) =>
      `Your ${stat} is low for this.${place ? ` Train it at ${place}.` : ''}`,
    statLowCha: 'Your Charisma is low for this. It comes from what you wear; a better coat helps.',
    statLowTwo: (a: string, b: string, weak: string, place: string | null) =>
      `This needs ${a} and ${b}, and your ${weak} is the low one.${weak === 'Charisma' ? ' It comes from what you wear.' : place ? ` Train it at ${place}.` : ''}`,
    statLowBest: (stat: string) => `Even your best, ${stat}, is low for this. Training anything would help.`,
    penalty: {
      weather: 'The rain was against you.',
      inspector: 'The Branch Inspector was watching.',
      'rival-ground': 'This is rival ground; everything is harder here.',
    } as Record<string, string>,
    luckGood: "Bad luck. The odds were good; it just didn't come off. Try again.",
    luckFair:
      'The odds were only fair. Every win here builds your reputation, and reputation lifts the odds.',
    failure: (cause: string) => `It went badly. ${cause}`,
    /** ×3 with a shared cause: "2 of 3 didn't come off. …" (the counts are the attempt rows'). */
    batch: (n: string, of: string, cause: string) => `${n} of ${of} didn't come off. ${cause}`,
  },
  /** Stat names in full, in a sentence or on a ticket (answers §1.2). */
  statNames: STAT_NAMES as Record<'str' | 'int' | 'agi' | 'cha', string>,
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
      'Party XP',
      `What the party thinks of you, earned by party work and orders. Ranks give rights: the vote at ${rank2}, standing for the council at ${rank3}.${n !== null && nextTitle ? ` ${n} more to ${nextTitle}.` : ''}`,
    ],
    pc: () => [
      'Political Capital',
      'Your pull in the party. You earn it by doing all three Party orders (+5 a day) and by holding a council seat. You spend it to stand for the council (10), to back a candidate (10) or to put a rule to the council (20).',
    ],
    standing: (city: string) => [
      'Reputation',
      `How well ${city} knows your face. Every win here counts: Familiar at 10, Known at 30, Trusted at 70, One of Us at 150. Each step makes everything you do here go a little better; One of Us pays 1 Political Capital a day.`,
    ],
    share: (city: string) => [
      `Who holds ${city}`,
      "Each party's share of the town, and in grey the undecided. Everything you do to win voters draws from the undecided first. A home city never falls below half for its own party; the rest is the fight.",
    ],
    shareCaption: (city: string) => `Who holds ${city}`,
    morale: () => [
      'Morale',
      "The home party's share is its morale. Fired up, 80 and over: party work here pays +10 % Party XP. Steady: nothing special. Unrest, under 60: the branch is in trouble and the orders change.",
    ],
    ordinance: () => [
      'Council rule',
      "The council's rule for the town, in force for five days and for everyone here whatever their party. Passed by four councillors of seven.",
    ],
    today: (at: string) => [
      'Today',
      `What you have done since midnight. The day turns at ${at}, and this becomes Yesterday in the morning paper.`,
    ],
    todayEnergy: () => ['Energy spent', "Energy spent today. A ×3 is three actions' worth."],
    todayAttempts: () => ['Attempts', 'Actions taken today, a ×3 counting three.'],
    todayWins: () => ['Wins', 'Successes today. Each one builds your reputation here.'],
    todayXp: () => ['Experience today', 'Experience earned today, Rested included.'],
    todayFxp: () => ['Party XP today', "Party XP earned today, the orders' bonuses included."],
    todayIron: () => [
      'Iron today',
      'Iron earned by actions today. Your wage lands at midnight and shows on the desk.',
    ],
    todayOpinion: (city: string) => [
      'Opinion moved',
      `How far your work moved ${city}'s meter today, in points of the town. One round of talking to voters is +0.05.`,
    ],
    todayOrders: () => [
      'Orders',
      'Party orders carried out today, of three. All three: +5 Political Capital.',
    ],
    todayTrained: () => ['Trained', 'Stat points trained today.'],
    seniority: () => [
      'Seniority',
      'Every day you keep the same job adds 2 % to its pay, up to 20 % after ten days. Switching jobs starts it again from nothing.',
    ],
    election: (city: string, rank2: string, rank3: string) => [
      'Election',
      `${city} elects its council every five days: two days for candidates to put their names in, three days of voting, the result the next morning. ${rank2}s vote; ${rank3}s who are Known here can stand.`,
    ],
    rule: (city: string) => [
      'Council rule',
      `The seven councillors pick one rule for the town each term. It changes a real number for everyone in ${city} for five days.`,
    ],
    backers: () => [
      'Backers',
      "A candidate needs two backers to stay on the list. Backing costs 10 Political Capital, is public, and can't be taken back. Do all three Party orders while you're standing and the branch backs you.",
    ],
    localSupport: () => [
      'Local support',
      "The town's own vote for a candidate: your reputation here, counted as wins ÷ 5. Every round of talking to voters raises it.",
    ],
    orders: () => [
      'Party orders',
      'Three jobs from the branch every day. Each one done pays +20 Party XP; all three pay +5 Political Capital. Actions that match an order pay +25 % Party XP while it is open.',
    ],
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
  standingUp: (city: string, name: string) => `${city}: ${name} · everything here goes a little better`,
  /**
   * Review 1 (answers §9, GDD §13.4): the Standing card in the result modal on a level crossing.
   * [heading, what changed, what the next level brings].
   */
  standingCard: {
    kicker: 'Reputation',
    1: (city: string, rank3: string) => [
      `Familiar in ${city}`,
      `Faces nod. Everything you do in ${city} goes a little better now.`,
      `Known at 30 wins: better again, and your name will do to stand for the council once you are a ${rank3}.`,
    ],
    2: (city: string, rank3: string) => [
      `Known in ${city}`,
      `Doors open a little faster, and the town knows your name well enough to stand for its council once you are a ${rank3}.`,
      'Trusted at 70 wins: better again.',
    ],
    3: (city: string) => [
      `Trusted in ${city}`,
      'Doors open before you knock. Everything here goes better still.',
      'One of Us at 150 wins: the best it gets, and 1 Political Capital a day.',
    ],
    4: (city: string) => [
      `One of Us in ${city}`,
      'The best reputation the town gives, and 1 Political Capital a day from it.',
      'Nothing above this; it never fades.',
    ],
  } as Record<'kicker', string> &
    Record<1 | 2 | 3 | 4, (city: string, rank3: string) => [string, string, string]>,
  orderComplete: (fxp: number) => `Party order complete: +${fxp} Party XP`,
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
  hisWish: (fxp: number) => `His wish · +${fxp} Party XP`,
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
  wearing: (name: string, cha: number) => `Wearing: ${name} · Charisma ${cha}`,
  /** "Iron Vanguard · Initiate · member since 29 September". */
  partyCard: (faction: string, rank: string, date: string) => `${faction} · ${rank} · member since ${date}`,
  keepsakeLine: (name: string) => `Keepsake: ${name}`,
  chapterKicker: (title: string, n: number, of: number) => `Ambition · ${title} · Chapter ${n} of ${of}`,
  /** `Chapter {n}, "{title}": from {Weekday D Month}, at {Rank n | Level n}` (onboarding §13 Q2). */
  chapterHook: (n: number, title: string, from: string, needs: string | null) =>
    `Chapter ${n}, "${title}": from ${from}${needsPhrase(needs)}`,
  /** "Rank 2", "Level 6", or (slice 3, design §17.7) "after your first vote". */
  chapterNeeds: (needs: { rank?: number; level?: number; ballotCast?: boolean }) =>
    [
      needs.rank !== undefined ? `Rank ${needs.rank}` : null,
      needs.level !== undefined ? `Level ${needs.level}` : null,
      needs.ballotCast ? 'after your first vote' : null,
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
  /** Me tab (§14.1): "Political Capital 5"; review 2 #5: the HUD spells it out too. */
  politicalCapital: (pc: number) => `Political Capital ${pc}`,
  /** The location sheet's kicker (§14.3 n9). */
  kindLabel: (kind: string) => KIND_LABELS[kind as LocationKind] ?? String(kind).replace(/-/g, ' '),
  /**
   * The chapter screen while the next chapter waits (§14.3 n13): "From Tuesday 6 October, at Rank 2",
   * or "From Tuesday 6 October" with no requirement.
   */
  chapterWaitsUntil: (from: string, needs: string | null) => `From ${from}${needsPhrase(needs)}`,
  backToThePaper: 'Back to the paper',
  // Slice 3, in plain words (review 2: docs/design/slice-3-screens.md §11, review-2-answers §1.2).
  // Times are rendered by the caller in the player's clock (`until`: "Tuesday midnight"; `at`:
  // "01:00 on Sunday"; `weekday`: "Sunday").
  pollingDay: 'Election',
  castYourBallot: 'Vote now',
  castYourBallotFor: (name: string) => `Vote for ${name}`,
  chooseAName: 'Choose a name',
  ballotCaption: (at: string) => `One vote, final. The result is at ${at}.`,
  ballotCastLine: (weekday: string) =>
    `Vote cast · the result is in ${weekday}'s paper and on the Election card`,
  youVotedFor: (name: string) => `You voted for ${name}`,
  standForTheCouncil: (pc: number) => `Stand for the council · ${pc} Political Capital`,
  declare: (pc: number) => `Stand · ${pc} Political Capital`,
  needsPc: (pc: number) => `Needs ${pc} Political Capital`,
  endorse: (pc: number) => `Back · ${pc} Political Capital`,
  endorsed: 'Backed',
  youEndorsed: (name: string, pc: number) => `You're backing ${name} · −${pc} Political Capital`,
  onTheSlate: (n: number, needed: number) => `You're standing · backers ${n} of ${needed}`,
  backersOf: (n: number, needed: number) => `backers ${n} of ${needed}`,
  backedBy: (names: string) => `Backed by ${names}`,
  localSupport: (n: number) => `Local support ${n} · from your reputation here`,
  branchEndorsesYou: 'All orders carried out · the branch backs you',
  branchMakesUpTheNumber: 'The branch will make up the number',
  withdraw: 'Withdraw',
  depositStays: 'The 10 Political Capital stays with the branch',
  depositRule: "Costs 10 Political Capital. You get it back only if you don't find two backers.",
  withdrawnLine: 'Withdrawn · the 10 Political Capital stayed with the branch',
  struckLine: 'Not enough backers · your 10 Political Capital is returned',
  onTheBallotLine: "You're a candidate",
  tooLateToStand: "Voting is open; it's too late to stand this time.",
  howDecided:
    'Seven seats. The seven with most support win. Support = local support (your reputation) + 3 per backer + votes.',
  namesGoIn: (until: string, weekday: string) => `Names go in until ${until} · voting opens ${weekday}`,
  seeWhosStanding: "See who's standing",
  seeTheSlate: 'See the candidates',
  seeTheResult: 'See the result',
  lastResult: 'Last result',
  wardCandidates: 'Local candidates',
  ward: 'local',
  npcSeats: (n: number, of: number) => `Local seats ${n} / ${of}`,
  turnout: (n: number, m: number) => (m === 0 ? 'Turnout nil' : `Turnout ${n} of ${m} members`),
  theLine: 'the line',
  electedMark: 'Elected',
  yourVote: 'your vote',
  you: 'you',
  toTheCouncil: 'To the council',
  theCouncilSits: "You're on the council · vote on the rule",
  theOrderPaper: 'Up for a vote',
  branchMotionBy: (secretary: string) => `the party's proposal · ${secretary}`,
  movedBy: (name: string) => `put forward by ${name}`,
  againstAll: 'None of these',
  propose: (pc: number) => `Put forward a rule · ${pc} Political Capital`,
  onThePaper: 'already up for a vote',
  paperFull: 'No room for more proposals this term',
  youMoved: (name: string) => `You put forward ${name}`,
  voteFor: (name: string) => `Vote for ${name}`,
  chooseAMotion: 'Choose a rule',
  councilCaption: (at: string) => `One vote, final; the whole council sees it. The council votes at ${at}.`,
  voteRecorded: (weekday: string) =>
    `Vote recorded · the result is in ${weekday}'s paper and on the Election card`,
  passed: 'Passed',
  roseWithoutMotion: "The council couldn't agree · no rule this term",
  ordinanceLine: (name: string, days: number) =>
    `Council rule: ${name} · ${days} ${days === 1 ? 'day' : 'days'} left`,
  ordinanceInForce: (name: string, days: number) =>
    `Council rule: ${name} · ${days} ${days === 1 ? 'day' : 'days'} left`,
  councillorLine: (city: string, weekday: string) => `Councillor, ${city} · term ends ${weekday}`,
  noOffice: (rank3Title: string) => `No seat · ${rank3Title}s may stand for the council`,
  pcSinks: (pc: number) => `Political Capital ${pc} · stand 10 · back a candidate 10 · put forward a rule 20`,
  moraleWord: { fired: 'Fired up', steady: 'Steady', unrest: 'Unrest' } as Record<string, string>,
  moraleCrossed: (city: string, state: string) =>
    state === 'fired'
      ? `${city}: Fired up · +10 % Party XP at home`
      : `${city}: ${state === 'unrest' ? 'Unrest' : 'Steady'}`,
  electedCaption: (name: string, rank: string, city: string) =>
    `${name}, ${rank}, elected to ${city} Council`,
  elected: 'ELECTED',
  formula:
    'Support = local support + 3 per backer + votes. Ties: votes, backers, reputation, who stood first.',
  ballotSecretNote: 'Nobody can see who you chose',
  pcLeft: (spent: number, left: number) => `−${spent} Political Capital · ${left} left`,
  moraleKnockOn: (city: string, delta: string, after: string) => `${city} morale ${delta} → ${after} %`,
  /** The result table's columns (screens §5.2). */
  resultColumns: ['#', 'Name', 'Local support', 'Backers', 'Votes', 'Support'] as const,
  resultColumnsShort: ['#', 'Name', 'Local', 'Back.', 'Votes', 'Support'] as const,
  /**
   * Review 2 (screens §1a, §2.1): the Election card on the city screen, the paper's row and the HQ
   * sheet. Line 1, line 2 and the buttons of each state; the caller renders the times.
   */
  election: {
    kicker: (city: string) => `Election · ${city} Council`,
    rowKicker: 'Election',
    firstTime: (city: string, rank3: string) =>
      `${city} elects its council every five days. You can vote now; ${rank3}s who are Known here can stand.`,
    days: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
    belowRank: (city: string, countWeekday: string, rank2: string, fxp: number, have: number) => [
      `${city} elects its council on ${countWeekday}`,
      `${rank2}s vote · ${fxp} Party XP makes ${/^[aeiou]/i.test(rank2) ? 'an' : 'a'} ${rank2} · you have ${have}`,
    ],
    candidates: (pollsWeekday: string, days: string) => [
      'Candidates are putting their names in',
      `Voting opens ${pollsWeekday} · ${days} to stand or back someone`,
    ],
    standing: (n: number, needed: number, until: string) => [
      `You're standing · backers ${n} of ${needed}`,
      `Two backers by ${until} or your name comes off · do today's orders and the branch backs you`,
    ],
    backing: (name: string, pollsWeekday: string, days: string) => [
      `You're backing ${name}`,
      `Voting opens ${pollsWeekday} · ${days}`,
    ],
    /** "{n} days left" to the closing boundary, rounded up; the last day "closes tonight at midnight". */
    voting: (until: string, days: number) => [
      'Voting is open',
      `${days <= 1 && until.endsWith('midnight') ? 'Closes tonight at midnight' : `Closes ${until} · ${days} ${days === 1 ? 'day' : 'days'} left`} · your vote is secret`,
    ],
    voted: (name: string, countWeekday: string, paper: string) => [
      `You voted for ${name}`,
      `Result ${countWeekday} morning, here and in the ${paper}`,
    ],
    candidateVoting: (until: string) => [
      "You're a candidate · voting is open",
      `Closes ${until} · you can vote for yourself`,
    ],
    result: (winner: string, yourLine: string | null, councilWeekday: string, namesUntil: string) => [
      `Result: ${winner} topped the poll${yourLine ? ` · ${yourLine}` : ''}`,
      `Seven seats · the new council sits until ${councilWeekday} · next election: names in until ${namesUntil}`,
    ],
    yourLine: {
      elected: (ordinal: string) => `you: elected, ${ordinal} of 7`,
      missed: (margin: number) => `you: missed the last seat by ${margin}`,
      voteWon: (name: string) => `your vote: ${name} was elected`,
      voteLost: (name: string) => `your vote: ${name} fell short`,
    },
    councilSits: (until: string, days: string) => [
      "You're on the council · vote on the rule",
      `The council votes ${until} · ${days}`,
    ],
    councilVoted: (rule: string, weekday: string) => [`You voted for ${rule}`, `Result ${weekday} morning`],
    ruleLine: (name: string, days: number) =>
      `Council rule: ${name} · ${days} ${days === 1 ? 'day' : 'days'} left`,
    seeWhosStanding: "See who's standing",
    seeTheCandidates: 'See the candidates',
    seeTheResult: 'See the result',
    seeTheCouncil: 'See the council',
    voteNow: 'Vote now',
    voteOnTheRule: 'Vote on the rule',
    noneOfThese: 'None of these',
  },
} as const;

export type Copy = typeof copy;
