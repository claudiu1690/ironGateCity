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
  theatre: 'Theatre',
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
  /**
   * Review 3 (answers §4, GDD §13.1): every button that spends Energy says what it does and what it
   * costs, in words, never a bare number. On a phone the repeat buttons print the label and the cost
   * on two lines (`…Label` over `cost`).
   */
  again: {
    once: (cost: number) => `Once more · ${cost} Energy`,
    three: (cost: number) => `Three more · ${cost} Energy`,
    /** The *Trained* result's repeat: "Study again · 46 Energy" (the action's verb, §5). */
    train: (verb: string, cost: number) => `${verb} again · ${cost} Energy`,
    onceLabel: 'Once more',
    threeLabel: 'Three more',
    trainLabel: (verb: string) => `${verb} again`,
    cost: (cost: number) => `${cost} Energy`,
    onceNeeds: (cost: number, readyAt: string) => `Once more needs ${cost} Energy · ready at ${readyAt}`,
    threeNeeds: (cost: number, readyAt: string) => `Three more needs ${cost} Energy · ready at ${readyAt}`,
    trainNeeds: (verb: string, cost: number, readyAt: string) =>
      `${verb} again needs ${cost} Energy · ready at ${readyAt}`,
  },
  /**
   * Review 3 (answers §4.3): the ticket's buttons, *Once* and *×3* with its cost under it. (Open
   * point §9.3: if *Once* / *×3* reads as a mismatch, the fallback is *1×* / *3×*, here.)
   */
  ticket: {
    once: 'Once',
    three: '×3',
    threeCost: (cost: number) => `${cost} Energy`,
  },
  /**
   * Review 3 (answers §3, GDD §13.1a): the result's rewards as a receipt, one line per reward. A zero
   * line is not printed.
   */
  reward: {
    xp: 'XP',
    fxp: 'Party XP',
    iron: 'Iron',
    opinion: (city: string) => `Opinion in ${city}`,
    /** Slice 4 (ADR 0030 §4): a named factor of the swing, "Close race +25 %". */
    factor: (label: string, pct: number) => `${label} ${pct >= 0 ? '+' : '−'}${Math.abs(pct)} %`,
    keepsake: 'Keepsake',
    item: 'Item',
    /** "+40 and Rested +5" (the base and its parts). */
    parts: (base: string, parts: string) => `${base} and ${parts}`,
    /** "120 to Level 3" (the HUD's distance to the next Level). */
    toLevel: (n: string, next: number) => `${n} to Level ${next}`,
    /** "212 / 400 to Activist" (the HUD's Party XP to the next Rank). */
    toRank: (fxp: string, next: string, title: string) => `${fxp} / ${next} to ${title}`,
    /** At the top Rank: the total alone (the HUD's `fxpTop`). */
    top: (fxp: string) => `${fxp} Party XP`,
    /** "Collective 84.0 → 84.1 %" (the town's meter, moved here from the knock-on block). */
    opinionMove: (faction: string, before: string, after: string) => `${faction} ${before} → ${after} %`,
  },
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
  /** Review 1 (§13.4): the desk row for One of Us's PC (wording confirmed 3 Oct 2026). */
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
  /** QA slice 4 m7: the capital's orders folded to one line on a short phone (a tap opens them). */
  ordersFold: {
    title: 'Party orders',
    progress: (done: number, of: number) => `${done} of ${of} done`,
  },
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
        `Fewer than one try in two come off here. It uses your ${stat}; raising it would help.`,
      ],
    },
    /** A tag's suffix: "Open Doors · better odds", "First day in Duskwall · better odds". */
    betterOdds: 'better odds',
    worseOdds: 'worse odds',
  },
  /** Review 2 (answers §2.4): the one reason under a row that isn't a Success. */
  reason: {
    statLow: (stat: string, place: string | null) =>
      `Your ${stat} is low for this.${place ? ` Raise it at ${place}.` : ''}`,
    statLowCha: 'Your Charisma is low for this. It comes from what you wear; a better coat helps.',
    statLowTwo: (a: string, b: string, weak: string, place: string | null) =>
      `This needs ${a} and ${b}, and your ${weak} is the low one.${weak === 'Charisma' ? ' It comes from what you wear.' : place ? ` Raise it at ${place}.` : ''}`,
    statLowBest: (stat: string) =>
      `Even your best, ${stat}, is low for this. Raising any of them would help.`,
    penalty: {
      weather: 'The rain was against you.',
      inspector: 'The Branch Inspector was watching.',
      'rival-ground': 'This is rival ground; everything is harder here.',
      // Slice 5: the rules' row id (`RIVAL_ROW`), tech design §10.2.
      rivalGround: 'This is rival ground; everything is harder here.',
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
    /**
     * Review 3 (answers §6.4): *How elections work*, five short lines in one note (the lines joined
     * by a newline and rendered as lines), opened from the Election card's kicker and from the link
     * on every election screen.
     */
    election: (city: string, rank2: string, rank3: string) => [
      'How elections work',
      [
        `${city} elects seven councillors every five days: two days for names to go in, three days of voting, the result the next morning.`,
        'The candidates are players who stand, and local candidates: townspeople run by the game, who fill the list so there is always an election.',
        `${rank2}s vote once, in secret. ${rank3}s who are Known in ${city} can stand; it costs 10 Political Capital and takes two backers.`,
        "The seven with the most support win. Support is the town's own vote for you (your reputation here), plus your backers, plus the votes.",
        "A seat is five days on the council: a vote on the town's rule, and 10 Political Capital and 20 Party XP a day.",
      ].join('\n'),
    ],
    /**
     * Slice 4: the note in the capital, five lines in the home note's tone (GDD §15.3: two seats a
     * district, players and local candidates, who votes and from when, who stands and what it takes,
     * the score in words, what a seat gives). Final text: docs/design/slice-4-fixes.md §7.
     */
    capitalElection: (rank2: string, rank3: string) => [
      'How elections work',
      [
        'Irongate elects ten councillors every five days, two in each of its five districts: two days for names to go in, three days of voting, the result the next morning.',
        "The candidates are players who stand, and local candidates: townspeople run by the game, who fill every party's list so there is always a choice.",
        `${rank2}s vote once, in secret, for any name on their district's list, from the first election that opens after they registered. ${rank3}s who are Known in Irongate can stand in their district; it costs 10 Political Capital and takes two backers of their party who live in the capital.`,
        "Each party's score mixes its share of the votes with its share of opinion in the district. The top score takes the first seat; a party takes both only with more than twice the next.",
        "A seat is five days on the council: a vote on the city's rule, which needs six votes of ten, and 10 Political Capital and 20 Party XP a day.",
      ].join('\n'),
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
  /** Review 3: the city map's + / − buttons (desktop). */
  mapZoomIn: 'Zoom in',
  mapZoomOut: 'Zoom out',
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
  // Review 3 (answers §6.3, §7): the system in words on the election screens, never a formula.
  howDecided:
    "Seven seats. The seven with the most support take them. Support is the town's own vote for a candidate (their reputation here), plus their backers, plus members' votes.",
  seatGives:
    "A seat is five days on the council: a vote on the town's rule, and 10 Political Capital and 20 Party XP a day.",
  voteAnyone: 'Vote for anyone on the list, a player or a local candidate.',
  playersStanding: 'Players standing',
  noPlayersStanding: 'No player has put their name in yet. The local candidates below fill the list.',
  localCandidatesLine:
    'Townspeople run by the game. They fill the list so there is always an election; you can vote for them, and a player with enough support beats them.',
  lastSeatClose: 'The last seat is usually close: a few votes decide it.',
  howElectionsWork: 'How elections work',
  /** Over the election screens' map crop: "Coalport Council · the Town Hall" (set in caps). */
  hallKicker: (city: string, hallRef: string) => `${city} Council · ${hallRef}`,
  councilSittingAt: (city: string, hallRef: string) => `${city} Council · sitting at ${hallRef}`,
  /** The result's header line: "6 of the 7 seats went to local candidates · 3 of 9 members voted · final". */
  resultHeader: (npcSeats: number, seats: number, voters: number, eligible: number) =>
    `${npcSeats} of the ${seats} seats went to local candidates · ${turnoutOf(voters, eligible)} members voted · final`,
  namesGoIn: (until: string, weekday: string) => `Names go in until ${until} · voting opens ${weekday}`,
  seeWhosStanding: "See who's standing",
  seeTheSlate: 'See the candidates',
  seeTheResult: 'See the result',
  lastResult: 'Last result',
  wardCandidates: 'Local candidates',
  /** Review 3 (§15.10): a local candidate's rank-title slot (was *local*, which could read as *from here*). */
  ward: 'Local candidate',
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
    "The seven with the most support took the seats: the town's own vote for each candidate (their reputation here), plus their backers, plus members' votes. A tie goes to votes, then backers, then reputation, then who stood first.",
  ballotSecretNote: 'Nobody can see who you chose',
  pcLeft: (spent: number, left: number) => `−${spent} Political Capital · ${left} left`,
  /** Slice 4 (ADR 0028): a desk line, "District Hero · +25 Political Capital". */
  deskAward: (label: string, pc: number) => `${label} · +${pc} Political Capital`,
  /** Slice 4 (screens §6.3): "−500 Iron · 3,910 left". */
  ironLeft: (spent: number, left: string) => `−${spent} Iron · ${left} left`,
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
    /** Slice 4 (screens §7.2): registered in a district, the first vote not yet open. */
    registered: (place: string, votesWeekday: string) => [
      `Registered in ${place}`,
      `You vote from ${votesWeekday} · the result every fifth morning`,
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
  // Slice 4, "the battleground" (docs/design/slice-4-screens.md §11 and its help notes). Times are
  // rendered by the caller in the player's clock (`until`: "Saturday midnight"; `time`: "14:32";
  // `weekday`: "Thursday"); amounts come from the rules' constants.
  /** The nation map, boarding, the journey and arrival (screens §2–§4). */
  travel: {
    nation: 'Nation',
    city: 'City',
    fromLevel: (level: number) => `From Level ${level}`,
    youAreHere: 'you are here',
    home: 'home',
    rivalGround: 'rival ground',
    noServiceYet: 'no service yet',
    cities: 'Cities',
    citiesOfTheRepublic: 'Cities of the republic',
    board: (fare: number, min: number) => `Board · ${fare} Iron · ${min} min`,
    needsFare: (fare: number) => `Needs ${fare} Iron`,
    seeTheFiveDistricts: 'See the five districts',
    rivalGroundLater: 'Rival ground · from a later edition',
    noServiceYetCard: 'No service yet',
    votesIn: (n: number) => `Votes in ${n} ${n === 1 ? 'day' : 'days'}`,
    votingOpenUntil: (until: string) => `Voting open until ${until}`,
    onTheTrainTo: (city: string) => `On the train to ${city}`,
    /** The journey's header: "The 14:20 to Irongate". */
    theTrainAt: (time: string, city: string) => `The ${time} to ${city}`,
    minToGo: (n: number, time: string) => `${n} min to go · arrives ${time}`,
    youCanClose: "You can close the game. You'll arrive either way, and Energy keeps refilling on the way.",
    onTheWay: 'On the way',
    optional: 'Optional',
    oneChoice: 'one choice',
    ignoreIt: 'Ignore it and you sleep through it. Nothing happens.',
    arrived: 'Arrived',
    inTheCapital: "You're in the capital",
    nothingHappened: 'The train was on time. Nothing happened, which is rare.',
    /** Slice-4 fixes §8 (QA n2): the arrival's body above a card still to answer. */
    cardBelow: "The train was on time. One thing happened on the way: it's below, and you can still answer it.",
    boardTheTrainTo: (city: string, fare: number, min: number) =>
      `Board the train to ${city} · ${fare} Iron · ${min} min`,
    seeTheNationMap: 'See the nation map',
    /** The journey's kicker (screens §3.1). */
    thirdClass: 'Third class · car 4',
    /** Screens §3.5: the one line on fellow travellers. */
    others: (n: number) => `You and ${n} ${n === 1 ? 'other' : 'others'} on this train`,
    whileYouRide: 'While you ride',
    readThePaper: 'Read the Paper',
    unread: (n: number) => `${n} unread`,
    /** The arrival's knock-ons (screens §4). */
    ticket: (fare: number) => `−${fare} Iron · ticket`,
    heraldYours: "The Herald is your paper while you're here",
    /** The nation map's pin labels: "Coalport · home · 12 min", "Irongate · 12 min". */
    pinLabel: (name: string, tags: string[]) => [name, ...tags].join(' · '),
    min: (n: number) => `${n} min`,
    /** The Cities row's second line: "12 min · 20 Iron". */
    minFare: (min: number, fare: number) => `${min} min · ${fare} Iron`,
    /** The fare's line under a halved ticket: "Tram Subsidy −50 %". */
    fareLine: (label: string, pct: number) => `${label} ${pct < 0 ? '−' : '+'}${Math.abs(pct)} %`,
    timetable: 'Timetable',
    /** Desktop timetable rows: "Irongate — Coalport · 12 min · 20 Iron". */
    timetableRow: (from: string, to: string, min: number, fare: number) =>
      `${from} — ${to} · ${min} min · ${fare} Iron`,
    citiesListName: 'Cities of the republic',
    /** The map's top bar: "Coalport · home". */
    hereHome: (city: string) => `${city} · home`,
    continue: 'Continue',
  },
  /** Slice 4: refusals, worded (the server's reason decides). */
  errors: {
    inTransit: "You're on the train. You can act again when you arrive.",
    alreadyThere: "You're already here.",
    cardClosed: 'The journey is over; that moment has passed.',
    alreadyChosen: 'You already chose.',
    notInCity: 'You register where you stand: take the train there first.',
    moveCooldown: 'Seven days between moves: not yet.',
    alreadyResident: 'You already live here.',
    notYetVoter: 'You vote here from the next election that opens.',
    notYetCandidate: 'You can stand here from the next election that opens.',
    wrongFaction: 'Members back their own party’s candidates.',
    /** Slice-4 fixes §1, §6 (QA M2, m5). */
    // The design's "on the ballot" reworded: ballot is a system word (review 2 §1.13).
    onBallot: "You're a candidate where you live until the result. You can move after it.",
    roomPaidAhead: (weekday: string) =>
      `The room is paid for a week ahead already. You can renew from ${weekday}.`,
  },
  /**
   * The ground sash (slice-4 screens, 3 Oct 2026): whose ground a place is, on the big scene art.
   * Opinion shares are not odds (screens §11), so the note may say "holds 70 %".
   */
  sash: {
    contested: 'Contested',
    holds: (faction: string, pct: string) => `${faction} ground: the ${faction} holds ${pct} % here.`,
    hq: (faction: string) => `${faction} ground: the ${faction}'s own headquarters.`,
    contestedNote: 'Contested: no party is clearly ahead here.',
    label: (word: string) => `Whose ground this is: ${word}`,
  },
  /** Irongate: the overview, the district card and the district view (screens §5). */
  capital: {
    irongate: 'Irongate',
    districtOf: (n: number, of: number) => `District · ${n} of ${of}`,
    districts: 'Districts',
    closeRace: 'Close race',
    /** Slice-4 fixes §5 (QA m4): the first-arrival deck's `{closeRaces}`, of the five districts. */
    closeRacesOfFive: (n: number) =>
      n <= 0
        ? 'none of them a close race today'
        : n === 1
          ? 'one of them a close race today'
          : n >= 5
            ? 'all five close races today'
            : `${['two', 'three', 'four'][n - 2]} of them close races today`,
    leans: (faction: string) => `Leans ${faction}`,
    heldBy: (faction: string, share: string) => `Held by the ${faction} ${share}`,
    comeback: (faction: string, pct: number) => `Comeback · ${faction} +${pct} %`,
    notACloseRace: 'Not a close race today',
    closeRaceToday: 'Close race today · +25 % Party XP · better odds',
    thisWeek: (issue: string) => `This week: ${issue}`,
    noIssue: 'No Issue this week',
    councilSeats: (a: string, b: string) => `Council seats: ${a} · ${b}`,
    goTo: (district: string) => `Go to ${district} · tram · instant`,
    showPlaces: 'Show places',
    heldLegend: 'Held (over 50) · Contested',
    youLiveHere: 'District · you live here',
    visiting: 'District · visiting',
    districtCloseRace: (district: string) => `${district} · close race today`,
    districtLeans: (district: string, faction: string) => `${district} · leans ${faction}`,
    membersOnly: 'Members only',
    /** A ticket's place tags (screens §5.2). */
    closeRaceTag: 'Close race · +25 % Party XP · better odds',
    issueTag: (issue: string, pct: number) => `Issue: ${issue} · opinion +${pct} %`,
    comebackTag: (pct: number) => `Comeback · +${pct} %`,
    councilRule: (rule: string, n: number) => `Council rule: ${rule} · ${n} ${n === 1 ? 'day' : 'days'} left`,
    issueLeads: (issue: string, faction: string, a: number, b: number) =>
      `Issue: ${issue} · ${faction} leads ${a} to ${b}`,
    /** The share bar's caption and kicker in the capital: "Who holds Eastside". */
    whoHolds: (place: string) => `Who holds ${place}`,
    /** The overview's city line: "Irongate: Vanguard 21.0 · Collective 21.2 · Alliance 21.0". */
    cityLine: (parts: string[]) => `Irongate: ${parts.join(' · ')}`,
    /** The tram bar's short names (screens §5.2). */
    tramShort: { 'Government Quarter': 'Gov. Quarter' } as Record<string, string>,
    tram: 'Tram',
    whoMovedFold: (district: string) => `Who moved ${district}`,
    /** The receipt's Issue knock-on: "Tram Fare Hike: Collective +10 points (leads 130 to 85)". */
    issuePoints: (issue: string, faction: string, added: number, lead: string) =>
      `${issue}: ${faction} +${added} points (${lead})`,
    /** "leads 130 to 85" (your party), "Vanguard leads 130 to 85", "level at 40" (nobody). */
    leadsBy: (who: string | null, a: number, b: number) =>
      who === null ? `level at ${a}` : `${who ? `${who} ` : ''}leads ${a} to ${b}`,
    help: {
      /** Review 2's share note (§1.9) with the home-city floor replaced, in the capital. */
      whoHolds: (place: string) => [
        `Who holds ${place}`,
        "Each party's share of the town, and in grey the undecided. Everything you do to win voters draws from the undecided first. Nobody holds a district until a party passes half; the rest is the fight.",
      ],
      closeRace: () => [
        'Close race',
        'The two parties in front are within ten points of each other here today. Party work in a close race pays +25 % Party XP, moves opinion +25 % and has better odds.',
      ],
      comeback: () => [
        'Comeback',
        'A party that has just lost a district gets +5 % opinion a day on its work there, up to +30 %, until it wins it back or two weeks pass.',
      ],
    },
  },
  /** Where you live: the residence card, the sheet, the result and the room (screens §6). */
  residence: {
    whereYouLive: 'Where you live',
    youLiveIn: (place: string) => `You live in ${place}`,
    registerIn: (district: string, iron: number) => `Register in ${district} · ${iron} Iron`,
    needsIron: (iron: number) => `Needs ${iron} Iron`,
    registerHere: (district: string) =>
      `Register here to vote and stand in ${district} · 7 days between moves`,
    /** The not-enough-Iron state's line 2 (screens §6.1). */
    registerHereShort: (district: string) => `Register here to vote and stand in ${district}`,
    canMoveAgainFrom: (weekday: string) => `You can move again from ${weekday}`,
    /** Slice-4 fixes §1 (QA M2): a candidate on the ballot where they live stays until the result. */
    onBallotLine: (place: string, weekday: string) =>
      `You're a candidate in ${place} until the result · you can move from ${weekday}`,
    /** "Registered Monday · you vote from Thursday · move again from Monday". */
    registeredLine: (weekday: string, votesFrom: string, moveFrom: string) =>
      `Registered ${weekday} · you vote from ${votesFrom} · move again from ${moveFrom}`,
    belowRank: (rank2: string, fxp: number) =>
      `${rank2}s can register in the capital. ${fxp} Party XP makes ${/^[aeiou]/i.test(rank2) ? 'an' : 'a'} ${rank2}.`,
    register: (iron: number) => `Register · ${iron} Iron`,
    /** The result's stamp. */
    registered: 'Registered',
    newVoter: (district: string) => `${district} has a new voter`,
    /** A knock-on line: "Coalport seat given up". */
    seatGivenUp: (city: string) => `${city} seat given up`,
    candidacyWithdrawn: 'Your name came off the list where you lived',
    nextVote: (district: string, weekday: string) => `Next: vote in ${district} from ${weekday}.`,
    room: 'A room in Irongate',
    roomLine: (iron: number, days: number, cap: number) => `${iron} Iron · ${days} days · Rested cap +${cap}`,
    takeARoom: (iron: number) => `Take a room · ${iron} Iron`,
    /** Slice-4 fixes §6 (QA m5): a renewal adds seven nights to the end of the room. */
    renew: (iron: number) => `Renew · ${iron} Iron · 7 more nights`,
    roomUntil: (weekday: string, cap: number) => `Room until ${weekday} · Rested cap ${cap}`,
    /** More than seven nights paid: no button, the day it comes back. */
    roomPaidAhead: (weekday: string, cap: number, renewFrom: string) =>
      `Room until ${weekday} · Rested cap ${cap} · renew from ${renewFrom}`,
    /** The room's stamp. */
    taken: 'Taken',
    /** The Me tab: "You live in Eastside, Irongate · move again from Monday". */
    /** The home city's card when living elsewhere (screens §6.1, last row). */
    registerBackHome: (city: string, iron: number) =>
      `Register in ${city} to vote at home again · ${iron} Iron`,
    /** The sheet's five lines (screens §6.2), built on the server with the player's places. */
    sheet: {
      vote: (place: string, weekday: string) =>
        `You vote and stand in ${place} from the next election that opens (${weekday}).`,
      giveUp: (old: string) =>
        `You stop being a ${old} candidate; your ${old} seat, if any, passes to the branch.`,
      orders: (capital: boolean) =>
        capital
          ? 'Party orders come from the capital from tomorrow. The Herald is your paper.'
          : 'Party orders come from home from tomorrow. The home paper is yours again.',
      untouched: 'Your job, reputation, Iron and rank are untouched.',
      moveAgain: (weekday: string) => `Moving again: from ${weekday}.`,
    },
    meLine: (district: string, weekday: string) =>
      `You live in ${district}, Irongate · move again from ${weekday}`,
    help: {
      whereYouLive: () => [
        'Where you live',
        'Where you live is where you vote and stand for the council, whose paper you read first and whose Party orders you get. Moving costs 500 Iron and seven days between moves.',
      ],
    },
  },
  /** The Issues section of the paper (screens §7.1). */
  issues: {
    theIssues: 'The Issues',
    leads: 'leads',
    open: 'open',
    /** Under the points bar: "settles Sunday midnight". */
    settles: (until: string) => `settles ${until}`,
    newThisWeek: 'New this week',
    ifSettled: (effect: string) => `If settled: ${effect}`,
    whereToAct: 'Where to act',
    help: {
      theIssues: () => [
        'The Issues',
        'Two things the town is arguing about this week. Work on them moves opinion half again and scores points for your party; on Sunday night the party with most points owns the Issue, and that changes a number for everyone for a week.',
      ],
    },
  },
  /** The Election card in the capital and the result (screens §7.2, §8); `election.registered` is line 1 and 2 of its first state. */
  capitalElection: {
    votingIsOpenIn: (district: string) => `Voting is open in ${district}`,
    twoSeats: (until: string) => `Two seats · any name · your vote is secret · until ${until}`,
    /** The kicker in the capital: "Election · Irongate Council · Eastside". */
    kicker: (district: string) => `Election · Irongate Council · ${district}`,
    /** The result state (days 0–1): "Eastside went Collective, Vanguard · your vote: Jana Varga was elected". */
    went: (district: string, parties: string[], yourLine: string | null) =>
      `${district} went ${parties.join(', ')}${yourLine ? ` · ${yourLine}` : ''}`,
    /** "Irongate: 4 Vanguard · 3 Collective · 3 Alliance · turnout 3 of 5 in Eastside". */
    capitalSeats: (parts: string[], turnout: string, district: string) =>
      `Irongate: ${parts.join(' · ')} · turnout ${turnout} in ${district}`,
    resultSundays: (weekday: string) => `${weekday}'s result`,
    /** The result's plate line: "Ten seats · Vanguard 4 · Collective 3 · Alliance 3 · local candidates 7 of 10 · final". */
    resultLine: (parts: string[], npcSeats: number) =>
      `Ten seats · ${parts.join(' · ')} · local candidates ${npcSeats} of 10 · final`,
    resultKicker: 'Irongate Council · The result',
    partiesColumns: ['Party', 'Votes', 'Opinion', 'Score', 'Seats'] as const,
    /** The ballot's line in a district. */
    ballotLine: (until: string) => `Two seats · one vote · secret and final · closes ${until}`,
    votesCast: (n: number, pct: number, pct2: number) =>
      `${n} ${n === 1 ? 'vote' : 'votes'} cast · votes count ${pct} % of the score, opinion ${pct2} % (votes count in full from 10 cast)`,
    howSeatsAreWon:
      "Each party's score mixes its share of the votes with its share of opinion. The top score takes the first seat; a party takes both only with more than twice the next. Ties: votes, then opinion, then the returning officer's draw.",
    factionProposal: (faction: string, secretary: string) => `the ${faction}'s proposal · ${secretary}`,
    sixVotes: (at: string) => `Six votes of ten to pass. The council votes at ${at}.`,
  },
  /** The scoreboard, the player's word for the ledger (screens §9), and In Print (§7.3). */
  scoreboard: {
    line: (place: string, swing: string, faction: string, rank: string, n: number) =>
      `This election you've moved ${place} ${swing} for the ${faction} (${rank} of ${n})`,
    noOneElse: '(no one else yet)',
    /** The line when the player is the only one who moved the place this election. */
    lineAlone: (place: string, swing: string, faction: string) =>
      `This election you've moved ${place} ${swing} for the ${faction} (no one else yet)`,
    columns: ['#', 'Name', 'Party', 'Level', 'Moved'] as const,
    /** The Me tab's Political Capital sources line. */
    pcSources: (hero: number, issue: number) => `District Hero ${hero} · Issue top five ${issue}`,
    whoMoved: (district: string) => `Who moved ${district} · this election`,
    /** The three level brackets, 1–15, 16–30, 31 and up. */
    brackets: ['Levels 1–15', 'Levels 16–30', 'Level 31 and up'] as const,
    heroNote:
      'District Hero: the top of each bracket at the result, at +0.5 or more. 25 Political Capital and your name in the Herald.',
    heroTitle: (district: string) => `District Hero, ${district} · this election`,
    heroes: (district: string, n: number) => `Heroes: ${district} ×${n}`,
    inPrint: 'In Print',
  },
  // Slice 5, "risk" (docs/design/slice-5-screens.md §11 and its help notes §2.3, the duty officer's
  // and the matron's lines §6.2 and §7.2; design §23). Times are formatted by the caller in the
  // player's clock (`time`: "15:12"; `weekday`: "Thursday"); amounts come from the rules' constants.
  // The odds are words (copy.odds); no string here prints a chance.
  risk: {
    takenIn: 'Taken in',
    carriedOff: 'Taken to the infirmary',
    rivalGroundTag: 'Rival ground · +50 % Party XP · worse odds',
    pressureCapped: 'The town has had enough today · no opinion',
    cantLiveHere: "You can't live or stand here",
    yourRecordPart: (n: number) => `your record −${n}`,
    /**
     * A ticket's record tag (`PlaceTagView` `record`): the design names none (phase A's placeholder,
     * tech design Deviations); the house form of a ticket's Iron tag, *Street Fund · +25 % Iron*.
     */
    recordTag: (pct: number) => `Your record · −${pct} % Iron`,
    /** The result's one button after the cells or the infirmary (screens §4.3). */
    toCells: 'To the cells',
    toInfirmary: 'To the infirmary',
    /** The held screens' *While you wait* rows (screens §6.5, §7.5). */
    whileYouWait: 'While you wait',
    /** Me tab (screens §2.4): "32 · Noticed · cool by 20:40" (no time while Cool). */
    heatMe: (n: number, state: string, time: string | null) =>
      `${n} · ${state}${time ? ` · cool by ${time}` : ''}`,
    /** The desk (screens §2.5): "Noticed (32), cooling · Cool by 20:40". */
    heatDesk: (state: string, n: number, time: string | null) =>
      `${state} (${n}), cooling${time ? ` · Cool by ${time}` : ''}`,
    needsPc: (n: number) => `Needs ${n} Political Capital`,
    /** The political modal's knock-ons (tech design §10.3). */
    heatKnock: (a: number, b: number, state: string) => `Heat ${a} → ${b} · ${state}`,
    healthKnock: (a: number, b: number) => `Health ${a} → ${b}`,
    energyKnock: (n: number) => `−${n} Energy`,
    recordKnock: (level: string, n: number) => `Your record · ${level} · ${n} ${n === 1 ? 'mark' : 'marks'}`,
    /** The quarter bar's lock mark, read aloud. */
    quarterLocked: (name: string) => `${name}, not open yet`,
    /** The Places pill and list on a home city's overview (screens §3.2). */
    quartersIn: (city: string) => `Quarters of ${city}`,
    /** The run-in block's Health line (screens §4.3): "Health 125 → 109". */
    healthLine: (a: number, b: number) => `Health ${a} → ${b}`,
    /** Refusals, worded (the server decides; phase C). */
    errors: {
      heldCells: "You're in the cells: the door opens when the time is up, or pay bail.",
      heldWard: "You're on the ward: out when the time is up, or walk out.",
      runInPending: 'Answer the run-in first.',
      noRunIn: 'That run-in is over.',
      onceOnRivalGround: 'Once at a time on rival ground.',
      ownFaction: "That's your own side.",
      moved: 'This moved on in another window. Reload to carry on.',
      notHeld: "You're out already.",
      noMarks: 'Your record is clean.',
    },
    /** The briefing's kicker (screens §4.2): "Mission · The Shipyard". */
    briefingKicker: (place: string) => `Mission · ${place}`,
    /** The pay row of an opponent who won't be bought (no price to print). */
    payNone: 'Pay them off',
    /** A hostile card's Heat on the card's receipt and the arrival (screens §8.2). */
    heatReward: (n: number) => `Heat ${n >= 0 ? '+' : '−'}${Math.abs(n)}`,

    // The mission ticket and the briefing (screens §4.1, §4.2).
    missions: 'Missions',
    /** The ticket's type label (`MissionView.label`). */
    label: {
      speech: 'Mission · Speech',
      watch: 'Mission · Watch and listen',
      against: (faction: string) => `Mission · Against the ${faction}`,
    },
    chooseAWay: 'Choose a way',
    again: 'Again',
    chooseAnotherWay: 'Choose another way',
    lastTime: 'Last time',
    /** The briefing's sticky button and *Again*'s cost line: "From the mole, with a flask · 12 Energy". */
    wayCost: (way: string, n: number) => `${way} · ${n} Energy`,
    needsEnergy: (n: number) => `Needs ${n} Energy`,
    /** A locked mission ticket's one reason (`MissionView.locked`). */
    locked: {
      level: (n: number) => `From Level ${n}`,
      /** "Organisers and above" (the faction's Rank 3 title). */
      rank: (rank3: string) => `${rank3}s and above`,
      record: 'Not with your record',
    },
    /** The risk line: "Heat +8 · Risky · if caught, a mark on your record". */
    heatPlus: (n: number) => `Heat +${n}`,
    /** By `riskBand` (rules); *Safe* never shows on a mission. */
    riskWord: {
      safe: 'Safe',
      littleRisk: 'A little risk',
      risky: 'Risky',
      dangerous: 'Dangerous',
    } as Record<'safe' | 'littleRisk' | 'risky' | 'dangerous', string>,
    ifCaught: (marks: number) =>
      `if caught, ${marks === 1 ? 'a mark' : `${['two', 'three'][marks - 2] ?? marks} marks`} on your record`,
    /** A way whose risk differs from the ticket's: "run-in: Dangerous". */
    runInWord: (word: string) => `run-in: ${word}`,

    // The result (screens §4.3).
    outcome: { success: 'Success', partial: 'Partial', failure: 'Failure' } as Record<
      'success' | 'partial' | 'failure',
      string
    >,
    dropped: { ran: 'dropped: you ran', lost: 'dropped: you lost' },
    /** A run-in's reason line when a fight was lost on power (`cause: 'power'`). */
    outmatched:
      'You were outmatched. Strength is what counts in a fight; a coat with some weight to it helps.',
    remembered: 'Missions remember: next time, one tap',
    agility: (n: number) => `Agility +¼ · ${n} more for a point`,
    /** "Heat +8 → 32 · Noticed · cools by 20:40"; no time while Cool ("Heat +6 → 6 · Cool"). */
    heatMove: (gain: string, after: number | string, state: string, time: string | null) =>
      `Heat ${gain} → ${after} · ${state}${time ? ` · cools by ${time}` : ''}`,
    heatLine: (n: number | string, state: string) => `Heat ${n} · ${state}`,
    heatState: { cool: 'Cool', noticed: 'Noticed', hot: 'Hot', wanted: 'Wanted' } as Record<
      'cool' | 'noticed' | 'hot' | 'wanted',
      string
    >,
    /** The one-line card on the first crossing into a state. */
    heatCard: {
      noticed:
        'NOTICED · The police have started to take an interest. Run-ins are likelier and a mark on your record is easier to earn. Heat cools five an hour.',
      hot: 'HOT · The police know your face. Your name taken now means the cells. A quiet day cools it.',
      wanted: 'WANTED · Any mission that goes wrong is the cells. Stay in, or stay legal, until it cools.',
    } as Record<'noticed' | 'hot' | 'wanted', string>,
    /** Design §13: the chapter's quiet way, the Heat line's tail the first time ("Heat +6 → 6 · Cool · …"). */
    heatFirstCool: 'the first mark of attention: it cools five an hour',
    /** "The police took your name · 1 mark · On file". */
    nameTaken: (n: number, level: string) =>
      `The police took your name · ${n} ${n === 1 ? 'mark' : 'marks'} · ${level}`,
    secondTime: 'Second time this week: three marks',
    recordCard:
      "ON FILE · One mark. It fades in a fortnight if there's no second; Iron from missions is down a tenth until then.",

    // The record (screens §2.4, the Me tab and the desk).
    yourRecord: 'Your record',
    recordLevel: {
      clean: 'Clean',
      onFile: 'On file',
      repeat: 'Repeat offender',
      notorious: 'Notorious',
    } as Record<'clean' | 'onFile' | 'repeat' | 'notorious', string>,
    /** "On file · 2 marks". */
    recordLine: (level: string, n: number) => `${level} · ${n} ${n === 1 ? 'mark' : 'marks'}`,
    fadesOn: (weekday: string) => `one fades on ${weekday}`,
    bailDoubled: 'bail doubled',
    strikeOff: (pc: number) => `Have a mark struck off · ${pc} Political Capital`,
    /** The strike-off's result (`ResultModal kind="political"`, tech design §10.3). */
    struck: {
      stamp: 'Struck off',
      headline: 'One mark fewer',
      body: (n: number) =>
        `The oldest mark on your record is gone. ${n} left. The branch's friend at the station says nothing.`,
    },

    // Health (screens §2.2) and the run-in (screens §5).
    health: 'Health',
    healthValue: (hp: number, max: number) => `${hp} / ${max}`,
    healthMove: (a: number, b: number, time: string) => `Health ${a} → ${b} · full again by ${time}`,
    /** The run-in modal's kicker: "A run-in · The Far Bank". */
    runInKicker: (place: string) => `A run-in · ${place}`,
    /** Your line under the opponent: "Health 125 / 125 · Heat 14 · Cool". */
    you: (hp: number, max: number, heat: number, state: string) =>
      `Health ${hp} / ${max} · Heat ${heat} · ${state}`,
    rows: {
      fight: 'Fight',
      run: 'Run',
      talk: 'Talk your way out',
      pay: (n: number) => `Pay them off · ${n} Iron`,
    },
    nearlyAlways: 'nearly always works',
    wontBeBought: "Won't be bought",
    needsIron: (n: number) => `Needs ${n} Iron`,
    bestFreeOdds: 'best free odds',
    leaveItToLuck: 'Leave it to luck',
    oneChoice: "One choice. If you close the game, it's left to luck.",
    /**
     * The run-in block's *did* line (tech design §10.1), worded from the steps in order: "You tried to
     * run; they were faster. You fought. You lost." DRAFT for the designer (the design gives only the
     * example); pronoun-free (*they*, as the row's *Pay them off*), since a picket is three men.
     */
    did: {
      fight: 'You fought.',
      won: 'You won.',
      lost: 'You lost.',
      ran: 'You ran.',
      runFailed: 'You tried to run; they were faster.',
      talked: 'You talked your way out.',
      talkFailed: "You tried to talk your way out; they weren't having it.",
      paid: 'You paid them off.',
      payFailed: 'You paid; they took it and came on anyway.',
      luck: 'You left it to luck.',
      auto: 'You left it, so luck chose.',
    },
    /** The did line from `StreetView.runIn`'s `by` and `steps` (a failed row is followed by the fight). */
    didLine: (
      by: 'player' | 'luck' | 'auto',
      steps: ReadonlyArray<{ row: 'fight' | 'run' | 'talk' | 'pay'; ok: boolean }>,
    ): string => {
      const d = copy.risk.did;
      const parts: string[] = by === 'luck' ? [d.luck] : by === 'auto' ? [d.auto] : [];
      for (const s of steps) {
        if (s.row === 'fight') parts.push(d.fight, s.ok ? d.won : d.lost);
        else if (s.row === 'run') parts.push(s.ok ? d.ran : d.runFailed);
        else if (s.row === 'talk') parts.push(s.ok ? d.talked : d.talkFailed);
        else parts.push(s.ok ? d.paid : d.payFailed);
      }
      return parts.join(' ');
    },
    /** The receipt's parts (screens §4.3). */
    parts: {
      fullStrength: (n: number) => `won at full strength +${n}`,
      paidOff: (n: number) => `paid off −${n}`,
      rivalGround: (n: number) => `rival ground +${n}`,
    },
    /** "Opinion against the Vanguard in Coalport" (the receipt's opinion row on a mission against). */
    opinionAgainst: (faction: string, city: string) => `Opinion against the ${faction} in ${city}`,

    // The cells (screens §6).
    cells: {
      kicker: (place: string) => `The cells · ${place}`,
      outAt: (time: string) => `out at ${time} · or pay bail`,
      youCanClose: (time: string) =>
        `You can close the game. The door opens at ${time} either way, and Energy keeps refilling in here.`,
      payBail: (n: number) => `Pay bail · ${n} Iron`,
      bailDouble: 'Bail is double on rival ground',
      legalAid: 'Legal Aid: half price',
      tap: 'Listen to the cells',
    },
    minutes: (n: number) => `${n} ${n === 1 ? 'minute' : 'minutes'}`,
    /** The duty officer's one line, by case (screens §6.2). */
    dutyOfficer: {
      home: '"Name." He has it already. "Address." He has that too. He writes slowly, because he can.',
      rival: '"Visiting, were we." He writes it down. The train home leaves when we say.',
      again: '"You again." The book is already open at your page.',
    },
    released: {
      stamp: 'Released',
      headline: "Out, with the duty officer's regards",
      body: 'Heat is down to 25 and the duty officer has your page. He says mind how you go.',
    },
    bailPaid: (n: number) => `−${n} Iron · bail`,
    deported: {
      stamp: 'Put on the train',
      headline: 'Escorted to the station',
      body: (city: string) =>
        `Two constables, one platform, and a ticket you didn't buy. ${city} is barred to you until tomorrow. The train home leaves when they say, which is now.`,
    },
    barredFrom: (city: string, time: string) => `Barred from ${city} until ${time}`,

    // The infirmary (screens §7).
    infirmary: {
      kicker: 'The infirmary · the ward',
      outAt: (time: string, hp: number, max: number) => `out at ${time} · Health ${hp} / ${max}, rising`,
      youCanClose: (time: string) =>
        `You can close the game. You're discharged at ${time} either way, and Health comes back ten every ten minutes.`,
      walkOut: (energy: number, iron: number) => `Walk out well · ${energy} Energy · ${iron} Iron`,
      discharge: (energy: number) => `Discharge yourself · ${energy} Energy`,
      tap: 'Talk to the ward',
    },
    /** The matron's one line (screens §7.2): the first stay, then after. */
    matron: {
      first:
        '"Politics," says the matron, and puts the thermometer in before you can answer. Twenty minutes. She has seen worse from the rolling mill.',
      again: '"You again," says the matron. The same bed.',
    },
    discharged: {
      stamp: 'Discharged',
      headline: 'Out, on your own feet',
      headlineWell: 'Out, well',
      body: (hp: number, max: number) =>
        `The matron signs you off without looking up. Health ${hp} / ${max}. Mind the step.`,
    },
    wardPaid: (n: number) => `−${n} Iron · the ward`,

    // The desk (screens §2.5).
    desk: {
      cells: (place: string, n: number, iron: number) =>
        `In the cells at ${place} · ${n} minutes to go · bail ${iron} Iron`,
      infirmary: (place: string, n: number) => `In the infirmary at ${place} · ${n} minutes to go`,
      whereYouAre: 'Where you are',
      rivalGround: (city: string) => `Rival ground · ${city} · everything is harder here`,
    },
    /**
     * The risk headlines' fills (docs/design/slice-5-risk.md §14): `{how}` by the stay's reason, and
     * `{recordLevel}` as the headline names it (*{name} Is a Repeat Offender with the Harbour Police*).
     */
    paper: {
      how: {
        caught: 'the police took the name while Hot.',
        wanted: 'a Failure while Wanted.',
        policeLoss: 'a run-in with the police lost.',
      } as Record<'caught' | 'wanted' | 'policeLoss', string>,
      /** Design §14 (4 Oct 2026): a stay with no act behind it (the dev panel's *Cells now*). */
      noAct: { how: 'no reason was given.', missionTitle: 'a word with the police' },
      /** `{marksLine}`: *One mark*, else *{n} marks* (was `{marks} marks`, which printed *1 marks*). */
      marksLine: (n: number) => (n === 1 ? 'One mark' : `${n} marks`),
      /** Title case inside a title-case headline: *{name} Is On File with the Harbour Police*. */
      recordLevel: {
        onFile: 'On File',
        repeat: 'a Repeat Offender',
        notorious: 'Notorious',
      } as Record<'onFile' | 'repeat' | 'notorious', string>,
    },

    // Rival ground (screens §8).
    rival: {
      /** The nation pin's tag: *Duskwall · rival ground · 15 min* (screens §8.1). */
      word: 'rival ground',
      cardLine: (faction: string) => `Rival ground · Home city of the ${faction}`,
      cardNote:
        'Everything is harder here. Heat doubles, every tap can bring a run-in, and party work pays half again. Nothing you own is at risk.',
      barred: (time: string) => `Barred · until ${time}`,
      placeLine: (city: string) => `${city} · rival ground`,
      ordersIn: (city: string) => `Your orders are in ${city} today`,
      drawsFrom: (faction: string, left: string) =>
        `Your work here draws from the ${faction}'s morale · ${left} of 2.0 points left today`,
      arrivalWarning:
        'Rival ground: Heat doubles here, every tap can bring a run-in, and nothing you own is at risk.',
    },
    /** A card's day flag on arrival. */
    flags: {
      watched: (city: string) => `Watched today: run-ins likelier in ${city} until midnight`,
      warned: (city: string) => `Warned: run-ins less likely in ${city} until midnight`,
    },
    /** The checkpoint card's rows as the journey screen prints them (screens §8.2). */
    cards: {
      papersDetail: 'your party card · it depends on your Heat and your record',
      payTheLamp: (n: number) => `Pay the lamp · ${n} Iron`,
    },

    // The quarters (screens §3).
    quarters: {
      title: 'Quarters',
      opensAt: (level: number) => `Opens at Level ${level}`,
      later: 'Opens with a later edition',
      kicker: (level: number) => `Quarter · opens at Level ${level}`,
      kickerLater: 'Quarter · a later edition',
      levelOpens: (level: number, n: number) => `Level ${level} opens it; you are Level ${n}.`,
      /** The plate's subtitle: "Coalport · The Harbour". */
      subtitle: (city: string, quarter: string) => `${city} · ${quarter}`,
    },

    // The chapter (screens §9): the AGI way's row.
    chapterHeat: (n: number) => `Heat +${n}, whatever happens`,

    /** Help notes (screens §2.3; the review-1 pattern: [kicker, note]). */
    help: {
      heat: () => [
        'Heat',
        'How much notice the police are taking of you. It rises with the harder work and cools five an hour on its own. From 25 the police start to turn up; from 50 a mark on your record can mean the cells.',
      ],
      health: () => [
        'Health',
        'What a run-in costs you. It comes back on its own, ten every ten minutes. At nothing you wake in the infirmary; twenty minutes, or pay to walk out.',
      ],
      record: () => [
        'Your record',
        'What the police have on you: a mark each time your name is taken. On file at one, a repeat offender at three, notorious at six. Marks fade in a fortnight if you stay quiet; 30 Political Capital strikes one off.',
      ],
      risk: () => [
        'Risk',
        'The chance of a run-in on the way out: someone at the door who wants a word. Heat, your record and rival ground all raise it. A run-in is one choice: fight, run, talk, or pay.',
      ],
      mission: () => [
        'Missions',
        'The harder work: a briefing, two or three ways to do it, one tap. It can fail, which pays a little XP. The game remembers your way, so the second time is one tap.',
      ],
      rivalGround: () => [
        'Rival ground',
        "The other side's home town. Everything is harder, Heat doubles, every tap can bring a run-in, and party work pays half again. Nothing you own is at risk; the worst is a night in the cells and the train home.",
      ],
      cells: () => [
        'The cells',
        'A sentence of ten to sixty minutes, by your Heat. Pay bail or wait; either way you walk out with Heat at 25. Energy, the wage and the vote carry on without you.',
      ],
      infirmary: () => [
        'The infirmary',
        'Twenty minutes on the ward after a run-in lost. Walk out well for 100 Iron, or discharge yourself at half strength. Energy, the wage and the vote carry on without you.',
      ],
    },
  },
} as const;

export type Copy = typeof copy;
