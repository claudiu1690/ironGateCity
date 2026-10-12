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
  // QA slice 5 m1: the player reads *the infirmary* and *the police*, never *hospital* or *jail*.
  hospital: 'Infirmary',
  jail: 'Police',
  court: 'Courts',
  university: 'University',
  library: 'Library',
  gym: 'Club',
  barracks: 'Landmark',
  parliament: 'Parliament',
  ministry: 'Public office',
  theatre: 'Theatre',
  // Review 4 (answers §11.2): the hall's sheet kicker, *{n} · Town Hall*.
  'town-hall': 'Town Hall',
};

/** "Mill Gate, Market Row or Harbour Quays": commas, then a final "or". */
function listOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;
}

const STAT_NAMES = { str: 'Strength', int: 'Intelligence', agi: 'Agility', cha: 'Charisma' } as const;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
/** QA n5: a week or more ahead a weekday would read as this week's, so the date (*19 October*). */
const WEEK_DAYS = 7;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** One formatter per zone (`undefined`: the runtime's own, the player's clock). */
const zoneFormats = new Map<string, Intl.DateTimeFormat>();
function zoneFormat(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  let f = zoneFormats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      ...(timeZone ? { timeZone } : {}),
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    zoneFormats.set(key, f);
  }
  return f;
}

/** A moment in a zone: its local day as a count of days (for "today" / "tomorrow"), weekday and time. */
function localParts(
  ms: number,
  timeZone: string | undefined,
): { day: number; weekday: number; time: string; date: string } {
  const parts: Record<string, string> = {};
  for (const p of zoneFormat(timeZone).formatToParts(ms)) parts[p.type] = p.value;
  const utcDay = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  return {
    day: Math.round(utcDay / 86_400_000),
    weekday: new Date(utcDay).getUTCDay(),
    time: `${parts.hour}:${parts.minute}`,
    date: `${Number(parts.day)} ${MONTH_NAMES[Number(parts.month) - 1]}`,
  };
}

export interface WhenOptions {
  /** Two days or more ahead: the weekday and the time ("Saturday 01:00"), not the weekday alone. */
  withTime?: boolean;
  /** The zone to read the moment in; absent, the runtime's own (the player's clock). */
  timeZone?: string;
}

/**
 * Review 4 (answers §4.2, GDD §2.2): every moment a player reads, written one way by how far off it
 * is, in the player's own clock: *in 24 min* under an hour; *at 14:40* later today; *tomorrow 01:00*;
 * *Thursday* two to six days ahead (*Saturday 01:00* `withTime`); the date a week or more ahead
 * (*19 October*, QA n5); *now* once it has passed. The
 * phrase carries its own preposition, so a line reads *ready in 24 min*, *Cool at 20:40*.
 */
export function when(at: number, now: number, o: WhenOptions = {}): string {
  const ahead = at - now;
  if (ahead <= 0) return 'now';
  if (ahead < HOUR_MS) return `in ${Math.max(1, Math.ceil(ahead / MINUTE_MS))} min`;
  const a = localParts(at, o.timeZone);
  const n = localParts(now, o.timeZone);
  const days = a.day - n.day;
  if (days <= 0) return `at ${a.time}`;
  if (days === 1) return `tomorrow ${a.time}`;
  const day = days >= WEEK_DAYS ? a.date : WEEKDAY_NAMES[a.weekday]!;
  return o.withTime ? `${day} ${a.time}` : day;
}

/**
 * The end of a window (`{until}`, *Names go in until …*): a boundary always prints the time (§23 Q6,
 * GDD §2.2): *until 14:00*, *until tomorrow 01:00*, *until Saturday 01:00*. No preposition: the line
 * carries its own (*until*, *closes*).
 */
export function boundary(at: number, now: number, o: Omit<WhenOptions, 'withTime'> = {}): string {
  const a = localParts(at, o.timeZone);
  const n = localParts(now, o.timeZone);
  const days = a.day - n.day;
  if (days <= 0) return a.time;
  if (days === 1) return `tomorrow ${a.time}`;
  return `${days >= WEEK_DAYS ? a.date : WEEKDAY_NAMES[a.weekday]} ${a.time}`;
}

/** A length that is not a moment (a sentence, a wait): *38 minutes*, *1 minute*. */
export function count(minutes: number): string {
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/** "3 of 4", or "nil" when no member was eligible (a quiet city, counted with nobody active). */
export const turnoutOf = (voters: number, eligible: number) =>
  eligible === 0 ? 'nil' : `${voters} of ${eligible}`;

/** ", at Rank 2" / ", after your first vote" (the hook format, design §17.7). */
const needsPhrase = (needs: string | null) =>
  needs ? (needs.startsWith('after ') ? `, ${needs}` : `, at ${needs}`) : '';

/** Review 5 (answers §3.2): a small count in words (*one point*, *two points*), digits from 11. */
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
/** The voting rework: "1 backer" / "2 backers", "1 day" / "3 days", "a" / "an". */
const backersN = (n: number) => `${n} ${n === 1 ? 'backer' : 'backers'}`;
const daysN = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
const anA = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const capitalFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const copy = {
  /** Review 4 (answers §4.2): the one countdown style, `copy.when(at, now)`; see `when`. */
  when,
  /** The end of a window, always with its time; see `boundary`. */
  boundary,
  /** A length, not a moment: *38 minutes*. */
  count,
  /** `ready`: a `when` phrase, "Needs 10 Energy · ready in 24 min" / "· ready at 14:40". */
  needsEnergy: (cost: number, ready: string) => `Needs ${cost} Energy · ready ${ready}`,
  energyFull: (rested: number) => `Rested ${rested}`,
  /** `at`: a `when` phrase, "full in 40 min" / "full at 16:21". */
  energyFullAt: (at: string) => `full ${at}`,
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
    /** `ready`: a `when` phrase (review 4, answers §4.2): "· ready in 24 min", "· ready at 14:40". */
    onceNeeds: (cost: number, ready: string) => `Once more needs ${cost} Energy · ready ${ready}`,
    threeNeeds: (cost: number, ready: string) => `Three more needs ${cost} Energy · ready ${ready}`,
    trainNeeds: (verb: string, cost: number, ready: string) =>
      `${verb} again needs ${cost} Energy · ready ${ready}`,
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
  /**
   * Review 5 (answers §17.2): the compact result modal's folds. *Details ▾* at the receipt's foot (the
   * breakdown, the cut tags, a ×3's reasons); *+1 more* at the end of a cut tags line; *4 more ▾*
   * under the third knock-on line.
   */
  result: {
    details: 'Details',
    moreTags: (n: number) => `+${n} more`,
    more: (n: number) => `${n} more`,
    /** The Energy line's Rested part, *Rested 30 → 20*. */
    rested: (before: number, after: number) => `Rested ${before} → ${after}`,
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
  // Review 1 (answers §1.2, §10.6): a job is a wage. Review 4 (answers §4.2): the pay's moment is a
  // `when` phrase, "paid tomorrow 01:00" (the day's turn in the player's clock).
  jobPayLine: (pay: number, paid: string) => `${pay} a day · paid ${paid}`,
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
  /** "Needs Level 3, Agility 10": only the unmet requirements, level first. */
  jobNeeds: (parts: string[]) => `Needs ${parts.join(', ')}`,
  jobTaken: (paid: string) => `Taken · paid ${paid}`,
  jobTakenOrder: (fxp: number) => `Taken · party order complete: +${fxp} Party XP`,
  jobSwitched: (paid: string) => `Switched · seniority reset · paid ${paid}`,
  orderTag: (progress: number, target: number, pct: number) =>
    `Party order ${progress} / ${target} · +${pct} % Party XP`,
  orderDone: 'Order done',
  allOrdersDone: (pc: number) => `All orders carried out · +${pc} Political Capital`,
  /**
   * Review 4 #13 (answers §13): away from home (any city but the residence, and on a train), the
   * orders panel is this one quiet line, not tappable. It replaces slice 5's rival-ground line.
   */
  orders: {
    away: (city: string, done: number, of: number) => `Your orders are in ${city} · ${done} of ${of} done`,
    /** Review 4 #20 (answers §20.1, ADR 0078): the panel and the paper's row after an arrest today. */
    off: 'Orders off today · the branch heard about the cells',
  },
  /**
   * Review 4 #19 (answers §19): the card on every police station's sheet. `out` is a `when` phrase
   * (*in 24 min*).
   */
  cellsNow: {
    kicker: 'In the cells now',
    empty: 'Nobody. The duty officer is reading.',
    you: 'you',
    out: (when: string) => `out ${when}`,
  },
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
        ? `Order carried out · +${fxp} Party XP. That's all three; Stahl's note follows when you close this.`
        : `Order carried out · +${fxp} Party XP. ${left === 1 ? 'One remains' : 'Two remain'}. — V.S.`,
    collective: (fxp: number, left: number) =>
      left === 0
        ? `Done, that one · +${fxp} Party XP. That's the three; Holm has a word for you when you close this.`
        : `Done, that one · +${fxp} Party XP. ${left === 1 ? 'One to go' : 'Two to go'}. — P.H.`,
    alliance: (fxp: number, left: number) =>
      left === 0
        ? `Ticked · +${fxp} Party XP. Three for three; Grey has something to say when you close this.`
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
  /**
   * Review 1 (answers §7): the stat-point choice screen. Review 5 (answers §3.2): each stat is a paper
   * card; its line is the stat's own words under the name (the name is the card's title).
   */
  statChoice: {
    lead: (city: string, stat: string, n: number, m: number, best: string, v: number, same: boolean) =>
      same
        ? `Most of the work in ${city} uses ${stat}: ${n} of ${m} actions, and it is your best, at ${v}.`
        : `Most of the work in ${city} uses ${stat}: ${n} of ${m} actions. Your best is ${best} ${v}.`,
    str: (n: number, m: number) =>
      `Shift changes, loaders, posters, the gate steps: ${n} of ${m} actions here. Later, security work, marches and holding your own.`,
    int: (n: number, m: number) =>
      `Queues, clerks, meetings, the records: ${n} of ${m} actions here. Later, espionage, exposés and the better-paid desks.`,
    agi: (n: number, m: number) =>
      `Flyers, chalk, the paper round: ${n} of ${m} actions here. Later, stealth work and getting away clean.`,
    footer: "Charisma isn't trained. It's worn: your coat, your suit, your party outfit.",
    /** The cards' tags (answers §3.2): the city's lead stat, the player's highest. */
    tags: { mostUsed: 'Most used here', best: 'Your best' },
    /** The cards' group, for a screen reader. */
    cards: 'Where the point goes',
    /** The text button under the cards (answers §3.2). */
    later: 'Choose later · nothing is lost',
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
    /** A run-in row that didn't come off, by its band (design/slice-5-fixes.md §8 n12). */
    runIn: {
      luckGood: "Bad luck. The odds were good; it just didn't come off.",
      luckFair: 'The odds were only fair.',
    },
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
      `Every action costs Energy. It refills by itself, five points every ten minutes, up to 100. Nothing is lost by waiting${fullAt ? `: full ${fullAt}` : ''}.`,
    ],
    rested: () => [
      'Rested',
      'When Energy is full the refill banks here instead, up to 200. Each Rested point spent alongside an Energy point pays half again in XP and Iron.',
    ],
    xp: (n: string, next: number) => [
      'Experience',
      `Every action pays Experience. Levels open places, kit and the train, and each one gives a stat point. ${n} more to Level ${next}.`,
    ],
    /** Review 4 #25 (answers §25): shortened; the ladder says what each rank gives. */
    fxp: (n: string | null, nextTitle: string | null) => [
      'Party XP',
      `What the party thinks of you, earned by party work and orders. Ranks give rights: tap for the ladder.${n !== null && nextTitle ? ` ${n} more to ${nextTitle}.` : ''}`,
    ],
    /**
     * Review 4 (answers §4.1), review 5 (answers §11.3, ADR 0079): the HUD clock's note, and the plate's
     * dusk line's. `dayTurn` is 00:00 UTC in the player's clock (*01:00* at UTC+1).
     */
    clock: (dayTurn: string) => [
      'The clock',
      `The game runs on real time, shown in your own clock. The day turns at ${dayTurn}. The town's own day is six hours long: dusk comes round four times a day, and the map and the streets are dark for two hours each time. Every time you read in the game is in this clock.`,
    ],
    /** Review 5 (answers §16.1, GDD §14.12): the *Night · patrols out* tag's note. */
    patrols: () => [
      'Patrols',
      'After dark on rival ground the streets are watched: every tap is likelier to bring a run-in, and now and then a patrol stops you just for being out. A stop is papers, a word or a side street, never a fight; your name taken means more Heat. Nothing you own is at risk, and nothing happens while you are away.',
    ],
    /** The voting rework (design §3.8, §8.9): reworded in place; the 20 PC proposal is gone. */
    pc: () => [
      'Political Capital',
      'Your pull in the party. You earn it by doing all three Party orders (+5 a day) and by holding a council seat. You spend it to stand for the council (10) or to back a candidate (10).',
    ],
    /** Review 4 #18 (answers §18): the figure, said once; `steps` is the Reputation level here (0–4). */
    standing: (city: string, steps: number) => [
      'Reputation',
      `How well ${city} knows your face. Every win here counts: Familiar at 10, Known at 30, Trusted at 70, One of Us at 150. Each step makes everything you try here come off three times in a hundred more; you are ${steps} ${steps === 1 ? 'step' : 'steps'} up. One of Us pays 1 Political Capital a day.`,
    ],
    /** Review 4 #14 (answers §14): the Issue chip's note. */
    issue: () => [
      'Issue of the week',
      'Two things the town is arguing about this week, drawn Monday. Work tagged with one moves opinion half again and counts for your party on it; on Sunday night the party with the most work owns the Issue, gains three points here, and its effect runs for a week.',
    ],
    /** Review 4 #9 (answers §9.2): where you live, in plain words (the card's kicker). */
    residence: () => [
      'Where you live',
      'The town whose council you vote for and stand for, whose paper comes first, and whose Party orders you get. Living somewhere else costs 500 Iron and a week between moves; everything you own comes with you.',
    ],
    /** Review 4 #9 (answers §9.3): the Lodgings card's note. */
    lodgings: () => [
      'Lodgings',
      'A paid bed for a week. While you have one, Rested banks to 250 instead of 200. Nothing else; your vote and your orders have nothing to do with it.',
    ],
    /**
     * Review 5 (answers §8.2): the Treatment card's note, word for word; St Agnes's says *sister*,
     * Clearwater's Sanatorium *nurse* (§18 Q14).
     */
    treatment: (carer: 'matron' | 'sister' | 'nurse' = 'matron') => [
      'Treatment',
      `The ${carer} will make you whole now for one Iron a point. Health comes back on its own, ten every ten minutes; this is only for the impatient. Nothing else about you changes.`,
    ],
    /** Review 4 #23 (answers §23.3): the masthead's edition line. */
    edition: () => [
      'Local edition',
      "Your paper is the paper of where you live. Away from home it prints a local edition: the town's own news and Issues first, your party's voice throughout.",
    ],
    /**
     * Review 4 #20 (answers §20.3): the cells' note under the new rule (twenty minutes, orders off, a
     * mark), on the cells screen's kicker (it replaced slice 5's `risk.help.cells`).
     */
    cells: () => [
      'The cells',
      'A sentence of twenty to sixty minutes, by your Heat. Pay bail or wait; either way you walk out with Heat at 25, a mark on your record, and no Party orders until the day turns. Energy, the wage and the vote carry on without you.',
    ],
    /** Review 4 #17 (answers §17): Legal Aid, on the cells screen and (slice 6) the bail sheet. */
    legalAid: () => [
      'Legal Aid',
      'The Alliance runs a legal-aid desk in every town. Its members pay half of any bail, anywhere, as a matter of policy. The other parties have no such desk.',
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
    today: (at: string) => [
      'Today',
      `What you have done since the day turned. It turns again at ${at}, and this becomes Yesterday in the morning paper.`,
    ],
    todayEnergy: () => ['Energy spent', "Energy spent today. A ×3 is three actions' worth."],
    todayAttempts: () => ['Attempts', 'Actions taken today, a ×3 counting three.'],
    todayWins: () => ['Wins', 'Successes today. Each one builds your reputation here.'],
    todayXp: () => ['Experience today', 'Experience earned today, Rested included.'],
    todayFxp: () => ['Party XP today', "Party XP earned today, the orders' bonuses included."],
    todayIron: () => [
      'Iron today',
      'Iron earned by actions today. Your wage lands when the day turns and shows on the desk.',
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
     * The voting rework (design §4.9, §8.9.2 #11): *Council rule*, three lines (the capital's second
     * line when `capital`; the weekdays are the city's voting days, "Wednesday to Saturday"), opened
     * from the card's kicker, the hall's block, *How the vote works* and the city plate's rule note;
     * `ruleMore` is the line behind *More* (the capital). It replaced the old `election`,
     * `capitalElection`, `backers`, `localSupport`, `rule` and `ordinance` notes.
     */
    rule: (city: string, rank2: string, rank3: string, fromWeekday: string, toWeekday: string, capital = false) => [
      'Council rule',
      [
        `Every five days ${city} votes on one rule for the town. Three are on the ballot: the branch's and the councillors'. The one with the most votes runs for five days, for everyone here whatever their party; no votes, the branch's.`,
        capital
          ? 'Each party puts up its rule. Votes and opinion in your district together decide which party is ahead: it takes the most seats, and the party with the most seats across Irongate gets its rule.'
          : `${rank2}s vote once, in secret, from ${fromWeekday} to ${toWeekday}. ${rank3}s who are Known here can stand for the council for 10 Political Capital: the seven best known in ${city} take the seats, counting backers, and a councillor's rule goes on the ballot.`,
        'The rule in force is on the city plate, on your tickets and at the Town Hall.',
      ].join('\n'),
    ],
    ruleMore:
      'Until ten people have voted in a district, opinion carries most of the weight; from ten, votes and opinion count half each. Two parties that put up the same rule share one card and split its votes equally.',
    orders: () => [
      'Party orders',
      'Three jobs from the branch every day. Each one done pays +20 Party XP; all three pay +5 Political Capital. Actions that match an order pay +25 % Party XP while it is open.',
    ],
    /** The one first-time hint, on the plate on the welcome day. */
    firstHint: 'Anything underlined can be tapped for what it means.',
    close: 'Close',
    /** The voting rework (design §4.9): the button that opens a note's fourth line (the capital's `ruleMore`). */
    more: 'More',
  },
  /** The waiting badge (answers §7): "1 point to place · nothing is lost by choosing later". */
  pointsToPlace: (n: number) =>
    `${n} ${n === 1 ? 'point' : 'points'} to place · nothing is lost by choosing later`,
  /**
   * Review 5 (answers §3.2): the picker's heading, *Level 4 · one point to place* / *Level 5 · two
   * points to place*; after a point is placed with another waiting, *Level 5 · one more to place*.
   */
  levelPointsToPlace: (level: number, n: number, more = false) =>
    more && n === 1
      ? `Level ${level} · one more to place`
      : `Level ${level} · ${countWord(n)} ${n === 1 ? 'point' : 'points'} to place`,
  /**
   * Review 5 (answers §4.1, §3.2): the result modal's level-up line, *Level 4 · one point to place*;
   * with two waiting, *Level 5 · two points to place*. Beside it, *Place it* opens the picker.
   */
  levelUpLine: (to: number, points: number) =>
    `Level ${to} · ${countWord(points)} ${points === 1 ? 'point' : 'points'} to place`,
  placeIt: 'Place it',
  /**
   * Review 4 #5 (answers §5): the level-up line once its points are placed, with the stat in full:
   * *Level 2 · Intelligence 12 → 13*. `placed` is each stat that moved while the result was open; when
   * the point went in elsewhere (nothing seen to move), the plain *Level 2 · point placed*.
   */
  levelUpPlaced: (to: number, placed: { stat: string; from: number; to: number }[], points = 1) =>
    placed.length > 0
      ? `Level ${to} · ${placed.map((p) => `${p.stat} ${p.from} → ${p.to}`).join(' · ')}`
      : `Level ${to} · ${points > 1 ? 'points placed' : 'point placed'}`,
  standingUp: (city: string, name: string) => `${city}: ${name} · everything here goes a little better`,
  /**
   * Review 1 (answers §9, GDD §13.4): the Standing card in the result modal on a level crossing.
   * [heading, what changed, what the next level brings].
   */
  standingCard: {
    kicker: 'Reputation',
    1: (city: string, rank3: string) => [
      `Familiar in ${city}`,
      `Faces nod. Everything you try in ${city} comes off three in a hundred more often, from now on.`,
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
  /**
   * Review 4 #25 (answers §25): the rank ladder. Seven rows, *title · Party XP · what it opens*, the
   * player's row *you*, the next *next · {n} more*. `opens` is the same in every party.
   */
  ranks: {
    kicker: (faction: string) => `The ${faction}'s ranks`,
    opens: {
      hall: "The party's hall and its chat; a pair of hands at any campaign event",
      vote: 'The vote in every election; a named role at campaign events; backing a candidate',
      stand: 'Standing for the council; calling campaign events; the harder missions',
      chair: 'Standing for Chair after a council term; the party strikes a mark off your record once a month',
      list: "The party's list for Parliament after a term as Governor or three on a council",
      president: 'Standing for President after a term in Parliament',
      life: "The title for life, and a line in the party's history",
    } as Record<'hall' | 'vote' | 'stand' | 'chair' | 'list' | 'president' | 'life', string>,
    fxp: (fxp: string) => `${fxp} Party XP`,
    you: 'you',
    next: (n: string) => `next · ${n} more`,
    /** The Me tab's line: "Activist · 1,212 / 2,000 to Organiser"; at the top, "… · 61,000 Party XP". */
    meLine: (title: string, fxp: string, next: string | null, nextTitle: string | null) =>
      next !== null && nextTitle !== null
        ? `${title} · ${fxp} / ${next} to ${nextTitle}`
        : `${title} · ${fxp} Party XP`,
    /** The HUD's notes sheet: the button under Party XP's note. */
    seeTheLadder: 'See the ranks',
  },
  /** Review 4 #18 (answers §18): the ticket tag where the player is Familiar or better. */
  knownHere: 'Known here · better odds',
  /** Review 4 #14 (answers §14): the Places list's and the sheet's chip, *Issue · Harbour Rates*. */
  issueChip: (name: string) => `Issue · ${name}`,
  later: 'Later',
  // Not in the §12.1 table: the out-of-Energy card and the Today strip (tech design §12.2).
  outOfEnergy: 'Out of Energy',
  outOfEnergyRegen: (fullAt: string) => `+5 every 10 min · full ${fullAt}`,
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
  /** Review 4 #16: nothing invites the player to close the game. */
  storyWaits: 'This waits for you',
  storyProgress: (step: number, of: number) => `Step ${step} of ${of}`,
  /**
   * Review 4 (ADR 0073): the counter's confirm before a row is chosen (the row's own confirm, *Go for
   * the work · the six o'clock to Coalport*, is content), and the line while the join is sent. Review
   * 5 (answers §19.2): nobody is helped at the counter now; one of the three problems is chosen.
   */
  arrival: {
    chooseSomeone: 'Choose one of the three',
    boarding: "The six o'clock is boarding…",
  },
  /** "+2 Strength, +1 Intelligence". */
  statBonus: (bonus: Partial<Record<'str' | 'int' | 'agi', number>>) =>
    (Object.entries(bonus) as Array<['str' | 'int' | 'agi', number]>)
      .map(([stat, n]) => `+${n} ${STAT_NAMES[stat]}`)
      .join(', '),
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
  // Slice 3, in plain words (review 2: docs/design/slice-3-screens.md §11); the voting rework's own
  // blocks (`ballot`, `rule`, `seats`, `stand`) follow `election`. Times are rendered by the caller in
  // the player's clock.
  standForTheCouncil: (pc: number) => `Stand for the council · ${pc} Political Capital`,
  declare: (pc: number) => `Stand · ${pc} Political Capital`,
  needsPc: (pc: number) => `Needs ${pc} Political Capital`,
  endorse: (pc: number) => `Back · ${pc} Political Capital`,
  endorsed: 'Backed',
  youEndorsed: (name: string, pc: number) => `You're backing ${name} · −${pc} Political Capital`,
  backedBy: (names: string) => `Backed by ${names}`,
  branchEndorsesYou: 'All orders carried out · the branch backs you',
  /**
   * The voting rework (design §8.7 n2): the action modal's effect line the day a standing candidate
   * does all three orders (`effects.branch`): *The branch backs you · 2 backers*. The count includes
   * the branch (ADR 0084: members plus the branch's, once).
   */
  branchBacksYou: (backers: number) => `The branch backs you · ${backersN(backers)}`,
  noPlayersStanding: 'No player has put their name in yet. The local candidates below fill the list.',
  /** Over the election screens' map crop: "Coalport Council · the Town Hall" (set in caps). */
  hallKicker: (city: string, hallRef: string) => `${city} Council · ${hallRef}`,
  councilSittingAt: (city: string, hallRef: string) => `${city} Council · sitting at ${hallRef}`,
  seeWhosStanding: "See who's standing",
  seeTheResult: 'See the result',
  lastResult: 'Last result',
  npcSeats: (n: number, of: number) => `Local seats ${n} / ${of}`,
  you: 'you',
  toTheCouncil: 'To the council',
  councillorLine: (city: string, weekday: string) => `Councillor, ${city} · term ends ${weekday}`,
  noOffice: (rank3Title: string) => `No seat · ${rank3Title}s may stand for the council`,
  /** The Me tab's line (design §3.8, §8.9): two sinks; the 20 PC proposal is gone. */
  pcSinks: (pc: number) => `Political Capital ${pc} · stand 10 · back a candidate 10`,
  moraleWord: { fired: 'Fired up', steady: 'Steady', unrest: 'Unrest' } as Record<string, string>,
  moraleCrossed: (city: string, state: string) =>
    state === 'fired'
      ? `${city}: Fired up · +10 % Party XP at home`
      : `${city}: ${state === 'unrest' ? 'Unrest' : 'Steady'}`,
  electedCaption: (name: string, rank: string, city: string) =>
    `${name}, ${rank}, elected to ${city} Council`,
  elected: 'ELECTED',
  pcLeft: (spent: number, left: number) => `−${spent} Political Capital · ${left} left`,
  /** Slice 4 (ADR 0028): a desk line, "District Hero · +25 Political Capital". */
  deskAward: (label: string, pc: number) => `${label} · +${pc} Political Capital`,
  /** Review 5 (answers §10.3, ADR 0082): the Unrest prize's desk line. `pushed` is one decimal. */
  unrestPrize: (city: string, pushed: string, fxp: number) =>
    `${city} in Unrest · you pushed ${pushed} points this week · +${fxp} Party XP`,
  /** Slice 4 (screens §6.3): "−500 Iron · 3,910 left". */
  ironLeft: (spent: number, left: string) => `−${spent} Iron · ${left} left`,
  moraleKnockOn: (city: string, delta: string, after: string) => `${city} morale ${delta} → ${after} %`,
  /**
   * Review 2 (screens §1a, §2.1); the voting rework (design §4.1, §8.2): the Election card on the
   * city screen, the paper's row and the HQ sheet. Line 1, line 2 and the buttons of each state; the
   * caller renders the times (`until`: "Saturday midnight").
   */
  election: {
    /** Slice 4 (screens §7.2): living in a district, the first vote not yet open (review 4: *You live in*, as *Live here*). */
    registered: (place: string, votesWeekday: string) => [
      `You live in ${place}`,
      `You vote from ${votesWeekday} · the result every fifth morning`,
    ],
    seeWhosStanding: "See who's standing",
    seeTheResult: 'See the result',
    voteNow: 'Vote now',
    seeTheBallot: 'See the ballot',
    toYourDesk: 'To your desk',
    /** Line 3, the rule in force: "Now: Street Fund · actions pay a quarter more Iron, jobs a quarter less · 3 days left". */
    ruleNow: (name: string, plainLine: string, days: number) => `Now: ${name} · ${plainLine} · ${daysN(days)} left`,
    kicker: (city: string) => `Council rule · ${city}`,
    capitalKicker: (district: string) => `Council rule · Irongate · ${district}`,
    rowKicker: 'Council rule',
    firstTime: (city: string, rank3: string) =>
      `${city} picks a council rule every five days. You can vote on it now; ${rank3}s who are Known here can stand for the council.`,
    vote: (city: string, until: string, fromWeekday: string) => [
      `Which rule for ${city} next week?`,
      `Vote until ${until} · the winner runs from ${fromWeekday} for five days`,
    ],
    voted: (rule: string, countWeekday: string, paper: string) => [
      `You voted for ${rule}`,
      `Result ${countWeekday} morning, here and in the ${paper}`,
    ],
    /**
     * The `result` state's two lines by `how` (design §8.2, settled 10 Oct 2026): `votes`, `tie`,
     * `fallback`, `fallbackUnrest` (card 1 a councillor's), the capital's `seats`, `sharedSeats` and
     * `draw`, and `carried` (the switch cycle). `untilWeekday` the rule's last day; `nextVoteWeekday`
     * the day the next vote opens.
     */
    result: (rule: string, votes: number, cast: number, untilWeekday: string, nextVoteWeekday: string) => [
      `${rule} won · ${votes} of ${cast} votes`,
      `Runs until ${untilWeekday} · the next vote opens ${nextVoteWeekday}`,
    ],
    resultTie: (rule: string, each: number, untilWeekday: string, nextVoteWeekday: string) => [
      `${rule} won · ${each} votes each, the first card takes a tie`,
      `Runs until ${untilWeekday} · the next vote opens ${nextVoteWeekday}`,
    ],
    resultFallback: (rule: string, untilWeekday: string, nextVoteWeekday: string) => [
      `${rule} runs · the branch's rule`,
      `No votes were cast · runs until ${untilWeekday} · the next vote opens ${nextVoteWeekday}`,
    ],
    resultFallbackUnrest: (rule: string, councillor: string, city: string, untilWeekday: string) => [
      `${rule} runs · Councillor ${councillor}'s rule`,
      `No votes were cast · the branch had no card: ${city} is in Unrest · runs until ${untilWeekday}`,
    ],
    /** The capital: "Rally Permits won · the Vanguard's, 4 seats of 10" / "Eastside: Vanguard, Collective · runs until …". */
    resultSeats: (
      rule: string,
      party: string,
      seats: number,
      district: string,
      parties: string[],
      untilWeekday: string,
      nextVoteWeekday: string,
    ) => [
      `${rule} won · the ${party}'s, ${seats} seats of 10`,
      `${district}: ${parties.join(', ')} · runs until ${untilWeekday} · the next vote opens ${nextVoteWeekday}`,
    ],
    resultSharedSeats: (
      rule: string,
      a: string,
      b: string,
      seats: number,
      district: string,
      parties: string[],
      untilWeekday: string,
      nextVoteWeekday: string,
    ) => [
      `${rule} won · the ${a}'s and the ${b}'s, ${seats} seats of 10`,
      `${district}: ${parties.join(', ')} · runs until ${untilWeekday} · the next vote opens ${nextVoteWeekday}`,
    ],
    resultDraw: (rule: string, untilWeekday: string, nextVoteWeekday: string) => [
      `${rule} won · on the returning officer's draw`,
      `Level on seats, votes and opinion · runs until ${untilWeekday} · the next vote opens ${nextVoteWeekday}`,
    ],
    resultCarried: (rule: string, untilWeekday: string, firstVoteWeekday: string) => [
      `${rule} runs · carried over`,
      `Runs until ${untilWeekday} · the first vote on a rule opens ${firstVoteWeekday}`,
    ],
    belowRank: (city: string, rank2: string, fxp: number, have: number) => [
      `${city} votes on its rule every five days`,
      `${rank2}s vote · ${fxp} Party XP makes ${anA(rank2)} ${rank2} · you have ${have}`,
    ],
    /** `orders`: the branch has not backed yet, so the orders line shows. */
    standing: (rule: string, countWeekday: string, backers: number, orders: boolean) => [
      `You're standing · your rule: ${rule}`,
      `Seats are counted ${countWeekday} morning · ${backersN(backers)}${orders ? " · do today's orders and the branch backs you" : ''}`,
    ],
    councillor: (rule: string, changeUntil: string, pollsWeekday: string) => [
      `You're on the council · your rule is on the ballot: ${rule}`,
      `Change it until ${changeUntil} · the town votes from ${pollsWeekday}`,
    ],
    nextInLine: () => [
      "You're on the council · your rule is next in line",
      'The two seats above yours chose first · pay every morning',
    ],
    /** The capital (design §8.6 Q4): the party has one card and the bloc's top seat chose it. */
    partyCardSet: (name: string, rule: string) => [
      "You're on the council · your party's card is set",
      `Councillor ${name} chose it: ${rule} · pay every morning`,
    ],
  },
  // Review 4 (answers §8, §10–§11, §21; tech design §8.1, §9.1): one map for each home city, the
  // Town Hall's sheet, the councillor's desk, *What now*, and the plate's rule line.
  /** A home city's greyed pins and their short sheet (answers §21.4). */
  map: {
    lockedPlace: (lock: { kind: 'level'; level: number } | { kind: 'edition' }) =>
      lock.kind === 'level' ? `Opens at Level ${lock.level}` : 'Opens with a later edition',
    lockedKicker: (quarter: string, lock: { kind: 'level'; level: number } | { kind: 'edition' }) =>
      lock.kind === 'level' ? `${quarter} · opens at Level ${lock.level}` : `${quarter} · a later edition`,
    lockedSheet: (need: number, level: number) => `Level ${need} opens it; you are Level ${level}.`,
    /** The pin's accessible name: "Coal Yards, opens with a later edition". */
    lockedPinLabel: (name: string, line: string) => `${name}, ${line.charAt(0).toLowerCase()}${line.slice(1)}`,
  },
  /** The Places list grouped by quarter (answers §21.2). */
  /**
   * Review 5 (answers §9.2, GDD §14.13): *What's here*, the Places list's blocks above the places. The
   * plate's button and the sheet's title (*Coalport · what's here*).
   */
  whatsHere: {
    button: "What's here",
    title: (place: string) => `${place} · what's here`,
    issues: 'Issues this week',
    noIssues: 'No Issue this week',
    /** *the Collective leads · 48 momentum* / *nobody yet*. */
    issueLine: (leader: string | null, momentum: number) =>
      leader ? `the ${leader} leads · ${momentum} momentum` : 'nobody yet',
    missions: 'Missions you can start',
    /** *Watch and listen · Customs House · Fair odds · 12 Energy* (the risk word after the odds). */
    missionLine: (label: string, place: string, odds: string, risk: string | null, energy: number) =>
      [label, place, odds, ...(risk ? [risk] : []), `${energy} Energy`].join(' · '),
    /** *2 more from Level 8 · 3 from Rank 3* (two groups at most, the lowest needs). */
    more: (groups: ReadonlyArray<{ gate: 'level' | 'rank' | 'standing'; need: number; count: number }>) =>
      groups
        .map((g, i) => {
          // §18 Q4: Reputation as *from Known here*.
          const rep = ['Stranger', 'Familiar', 'Known', 'Trusted', 'One of Us'][g.need] ?? 'Known';
          const from = g.gate === 'level' ? `Level ${g.need}` : g.gate === 'rank' ? `Rank ${g.need}` : `${rep} here`;
          return `${g.count}${i === 0 ? ' more' : ''} from ${from}`;
        })
        .join(' · '),
    /** Empty: *None yet · the first opens at Level 6*. */
    none: (level: number | null) => (level === null ? 'None here' : `None yet · the first opens at Level ${level}`),
    orders: 'Your orders here',
    noOrders: 'No order points here today',
    /** An order's row: *1 of 3* under its title (away and off read `copy.orders`). */
    orderLine: (progress: number, target: number) => `${Math.min(progress, target)} of ${target}`,
    allDone: "All three done · tomorrow's are in the paper",
    places: 'Places',
  },
  places: {
    group: (quarter: string, lock: { kind: 'level'; level: number } | { kind: 'edition' } | null) =>
      lock === null
        ? quarter
        : lock.kind === 'level'
          ? `${quarter} · opens at Level ${lock.level}`
          : `${quarter} · a later edition`,
  },
  plate: {
    /** Answers §11.3: "Council rule: Reading Room Grant · studying costs a fifth less · 3 days left". */
    rule: (name: string, plainLine: string, days: number) =>
      `Council rule: ${name} · ${plainLine} · ${days} ${days === 1 ? 'day' : 'days'} left`,
    /** The voting rework (design §4.7): the folded plate's chip, "Street Fund · 3 days" (caps in CSS). */
    ruleChip: (name: string, days: number) => `${name} · ${daysN(days)}`,
  },
  /** The Town Hall's sheet (answers §11.2). */
  hall: {
    ruleInForce: 'The rule in force',
    council: 'The council',
    issues: "This week's Issues",
    /** "Studying costs a fifth less · 3 days left". */
    ruleLine: (plainLine: string, days: number) =>
      `${plainLine.charAt(0).toUpperCase()}${plainLine.slice(1)} · ${days} ${days === 1 ? 'day' : 'days'} left`,
    player: (rank: string) => `Player · ${rank}`,
    local: 'Local candidate · townspeople run by the game',
    termEnds: (weekday: string) => `Term ends ${weekday}`,
    // The voting rework (design §4.4, §5.3): the five blocks' new words, beside the old ones.
    nextWeeksRule: "Next week's rule",
    /** "the ballot is set at Tuesday midnight". */
    ballotSetAt: (until: string) => `the ballot is set at ${until}`,
    change: 'Change ›',
    yourRule: 'your rule',
    nextInLine: 'Your rule is next in line: the two seats above yours chose first.',
    /** The capital's form (design §8.6 Q4): "Your party's card is set: Councillor Varga chose the Collective's card, Public Works Order." */
    partyCardSet: (name: string, party: string, rule: string) =>
      `Your party's card is set: Councillor ${name} chose the ${party}'s card, ${rule}.`,
    // *How it won* under the rule in force: `rule.how.*` (design §8.2).
    standForTheCouncil: 'Stand for the council',
    /** A player councillor's row: "rule: Reading Room Grant". */
    ruleOf: (name: string) => `rule: ${name}`,
    /** The rule picker sheet (design §4.4); a row already on the ballot is dimmed, not disabled (§8.1 Q10). */
    pickerTitle: 'Your rule · choose one',
    onTheBallot: 'already on the ballot · yours would be skipped',
  },
  council: {
    /** Answers §10.1: once per term, on the front page and the first hall visit. */
    whatNow: {
      kicker: 'What now · your five days',
      button: (hall: string) => `To your desk at the ${hall}`,
      /**
       * The voting rework (design §4.6): line 1 by case, then `pay`; each a [bold, rest] pair as in
       * `lines`. Phase 3 replaces `lines` with these.
       */
      rule: {
        onBallot: (rule: string, fromWeekday: string, toWeekday: string, until: string): [string, string] => [
          'Your rule is on the ballot',
          `${rule}. The town votes ${fromWeekday} to ${toWeekday}. Change it until ${until} at your desk.`,
        ],
        nextInLine: (): [string, string] => [
          'Your rule is next in line',
          'the two seats above yours chose first. Stand again when the term ends.',
        ],
        /** The capital, leading the party's bloc: "the Collective's card is yours: Reading Room Grant." */
        capitalLeads: (party: string, rule: string): [string, string] => [
          'Your rule is on the ballot',
          `the ${party}'s card is yours: ${rule}.`,
        ],
        /** The capital, another councillor leads: "Councillor Varga chose the Collective's card: Public Works Order." */
        capitalChosen: (name: string, party: string, rule: string): [string, string] => [
          // Design §8.6 Q4: the capital has no line to be next in; the party has one card and the bloc's top seat chose it.
          "Your party's card is set",
          `Councillor ${name} chose the ${party}'s card: ${rule}. The bloc's top seat chooses first.`,
        ],
        pay: (): [string, string] => [
          'Draw your pay',
          '10 Political Capital and 20 Party XP every morning you hold the seat, present or not.',
        ],
      },
    },
    /** Answers §10.2: the desk's *Next* line by cycle day. */
    deskNext: {
      // The voting rework (design §4.4): the *Next week's rule* block's Courier line, by cycle day.
      townVotes: (fromWeekday: string, toWeekday: string, resultWeekday: string) =>
        `Next: the town votes ${fromWeekday} to ${toWeekday}; the result ${resultWeekday} morning.`,
      theResult: (resultWeekday: string) => `Next: the result, ${resultWeekday} morning.`,
      pay: 'Your pay: 10 Political Capital and 20 Party XP every morning, present or not.',
    },
  },
  // The voting rework (docs/design/voting-simplified.md §4, §5.3; tech design §11): the ballot, the
  // cards, the result, the seats, the stand card and the Me line. New blocks beside the old keys;
  // phases 3–5 move the screens onto them and remove what §5.3 lists. Times and weekdays are rendered
  // by the caller in the player's clock.
  /** The ballot (`/council/ballot`, design §4.2). */
  ballot: {
    /** The plate kicker: "Coalport Council · The vote". */
    kicker: (city: string) => `${city} Council · The vote`,
    title: 'Which rule for next week?',
    /** "One vote, secret and final · until Saturday midnight · the winner runs from Sunday for five days". */
    line: (until: string, fromWeekday: string) =>
      `One vote, secret and final · until ${until} · the winner runs from ${fromWeekday} for five days`,
    voteFor: (rule: string) => `Vote for ${rule}`,
    chooseARule: 'Choose a rule',
    /** `at`: "01:00 on Sunday". */
    caption: (at: string) => `Secret and final. The result is at ${at}.`,
    yourVote: 'your vote',
    cast: (weekday: string) => `Vote cast · the result is in ${weekday}'s paper and on the card`,
    whoIsStanding: (players: number, locals: number, seats: number) =>
      `Who's standing · ${players} ${players === 1 ? 'player' : 'players'} and ${locals} local ${locals === 1 ? 'candidate' : 'candidates'} for ${seats} seats`,
    howTheVoteWorks: 'How the vote works',
    lastResult: (weekday: string) => `Last result · ${weekday}`,
    /** Closed (days 0–1): "Coalport votes from Wednesday". */
    votesFrom: (city: string, weekday: string) => `${city} votes from ${weekday}`,
  },
  /** Whose a card is (design §4.2), the Courier line under it. */
  rule: {
    whose: {
      /**
       * `secretary` is the faction's `secretary.addressedAs` (design §8.8 Q4), never the full name:
       * "the branch's rule · Secretary Holm" · "… · Organiser Stahl" · "… · Mr Grey".
       */
      branch: (secretary: string) => `the branch's rule · ${secretary}`,
      councillor: (name: string) => `Councillor ${name}'s rule`,
      you: 'your rule',
      /** The capital, the secretary's card: "the Vanguard's rule · Organiser Stahl" (`addressedAs`, as `branch`). */
      party: (faction: string, who: string) => `the ${faction}'s rule · ${who}`,
      /**
       * The capital, a councillor's card (design §8.9 Q2): "the Collective's rule · Councillor Jana
       * Varga". `name` is the character's name as stored; nothing splits it (a councillor is a player
       * the reader may not know, so the full name, as `councillor` above). The view's `whose.via`
       * says which of the two to print.
       */
      partyCouncillor: (faction: string, name: string) => `the ${faction}'s rule · Councillor ${name}`,
      /** A shared card: "the Collective's and the Alliance's rule". */
      shared: (a: string, b: string) => `the ${a}'s and the ${b}'s rule`,
    },
    /** The card's effect line: "IRON FROM ACTIONS +25 % · JOB PAY −25 % · 5 DAYS" (caps in CSS). */
    effect: (effectLine: string, days: number) => `${effectLine} · ${daysN(days)}`,
    /**
     * How the rule in force won (design §8.2): the hall's *The rule in force* block under the days
     * left, and the result's winner card under *PASSED*. One key per `how`, plus `fallbackUnrest` and
     * `sharedSeats`.
     */
    how: {
      votes: (weekday: string, votes: number, cast: number) => `won ${weekday} with ${votes} of ${cast} votes`,
      tie: (weekday: string, each: number) => `won ${weekday} on a tie · ${each} votes each`,
      fallback: "the branch's · no votes cast",
      fallbackUnrest: (councillor: string) => `Councillor ${councillor}'s · no votes cast · the branch had no card`,
      seats: (party: string, seats: number) => `the ${party}'s · ${seats} seats of 10`,
      sharedSeats: (a: string, b: string, seats: number) => `the ${a}'s and the ${b}'s · ${seats} seats of 10`,
      draw: (party: string) => `the ${party}'s · on the returning officer's draw`,
      carried: 'carried over from the old council',
    },
  },
  /** The result (`/council/count`, design §4.3). */
  ruleResult: {
    kicker: (city: string) => `${city} Council · The result`,
    title: (weekday: string) => `${weekday}'s result`,
    /** "6 of 9 members voted · final". */
    turnout: (voters: number, eligible: number) => `${voters} of ${eligible} members voted · final`,
    passed: 'Passed',
    runsUntil: (weekday: string) => `runs until ${weekday}`,
    fallback: "the branch's · no votes cast",
    council: 'The council',
    theLine: 'the line',
  },
  /** The seats, in one sentence and the council rows (design §3.5, §4.3, §4.5). */
  seats: {
    /** "Seats go to the seven best known in Coalport, counting their backers. Local candidates fill the rest." */
    sentence: (city: string, seats: number) =>
      `Seats go to the ${countWord(seats)} best known in ${city}, counting their backers. Local candidates fill the rest.`,
    /**
     * The capital's form (design §8.9 Q1), under *Who's standing*'s title and the district's rows at
     * the count: "Two seats in Eastside: votes and opinion decide how many each party takes; a party's
     * seats go to its best known in Irongate, counting their backers. Local candidates fill the rest."
     */
    capitalSentence: (district: string) =>
      `Two seats in ${district}: votes and opinion decide how many each party takes; a party's seats go to its best known in Irongate, counting their backers. Local candidates fill the rest.`,
    /** "8th · 4 short". */
    short: (place: string, by: number) => `${place} · ${by} short`,
    /** "Player · Organiser · One of Us · 3 backers". */
    row: (rank: string, standing: string, backers: number) => `Player · ${rank} · ${standing} · ${backersN(backers)}`,
    /** "Local candidate · Trusted". */
    localRow: (standing: string) => `Local candidate · ${standing}`,
    /** "· the rule you named: Reading Room Grant". */
    rule: (name: string) => `the rule you named: ${name}`,
    /** The row's popover: "local support 40 · backers 2". */
    popover: (local: number, backers: number) => `local support ${local} · backers ${backers}`,
  },
  /** The stand card and *Who's standing* (`/council/slate`, design §4.5). */
  stand: {
    kicker: 'Stand for the council',
    plateKicker: (city: string) => `${city} Council · Candidates`,
    title: "Who's standing",
    /** "Seven seats · counted Sunday morning · stand until Monday midnight". */
    plateLine: (seats: number, countWeekday: string, until: string) =>
      `${capitalFirst(countWord(seats))} seats · counted ${countWeekday} morning · stand until ${until}`,
    /**
     * The plate line on days 2–4 (design §8.8 Q3; replaces `tooLateToStand`): the names are in and the
     * town is voting; the next window to stand opens on the count morning. "Seven seats · the vote is
     * on · counted Sunday morning · names go in again from Sunday".
     */
    plateLineVoting: (seats: number, countWeekday: string) =>
      `${capitalFirst(countWord(seats))} seats · the vote is on · counted ${countWeekday} morning · names go in again from ${countWeekday}`,
    /** "✓ Rank 3, Organiser". */
    tickRank: (rank: number, title: string) => `✓ Rank ${rank}, ${title}`,
    /** "✓ Known in Coalport (74 wins)". */
    tickKnown: (city: string, wins: number) => `✓ Known in ${city} (${wins} wins)`,
    /** "Needs Rank 3 · 1,240 Party XP to go". */
    needsRank: (rank: number, fxp: number) => `Needs Rank ${rank} · ${fxp.toLocaleString('en-GB')} Party XP to go`,
    /**
     * The cross's line when the player is not yet Known here (design §8.8 Q1): the same shape as the
     * rank's cross, a target and the gap. "Needs to be Known in Coalport · 18 wins to go".
     */
    needsKnown: (city: string, wins: number, need: number) => {
      const toGo = Math.max(0, need - wins);
      return `Needs to be Known in ${city} · ${toGo} ${toGo === 1 ? 'win' : 'wins'} to go`;
    },
    gives: "A seat is five days on the council: your rule on the town's ballot, and 10 Political Capital and 20 Party XP a morning.",
    yourRule: 'Your rule',
    costs: 'Costs 10 Political Capital. Your name is on the list until the count.',
    /** After standing: "You're standing · your rule: Reading Room Grant · 1 backer". */
    standing: (rule: string, backers: number) => `You're standing · your rule: ${rule} · ${backersN(backers)}`,
    playersStanding: 'Players standing',
    /** A player's row: "Organiser · Trusted in Coalport · 2 backers". */
    playerRow: (rank: string, standing: string, city: string, backers: number) =>
      `${rank} · ${standing} in ${city} · ${backersN(backers)}`,
    /** "rule: Public Works Order". */
    ruleOf: (name: string) => `rule: ${name}`,
    /**
     * The *Backed* modal's knock-on line (design §8.7 n1; `knockOns.backers`): the candidate's count
     * after your backing, *Anna Weiss · 3 backers*.
     */
    backersKnock: (name: string, backers: number) => `${name} · ${backersN(backers)}`,
    localCandidates: 'Local candidates',
    localsLine:
      'Townspeople run by the game. They fill the list so there is always a council; a player who is better known here beats them.',
    you: 'You',
  },
  /** The Me tab's rule line (design §4.7): "Coalport · Street Fund · 3 days left". */
  me: {
    rule: (city: string, name: string, days: number) => `${city} · ${name} · ${daysN(days)} left`,
  },
  /**
   * The dev time-skip panel's council words (design §8.7 n4; README "Reviewing with the dev panel").
   * Not player-facing, but kept here so the panel says what the cards say: *the vote*, *the count*.
   * `phase` is the panel's phase line by cycle day (§3.2's calendar); `next` the boundary it is
   * counting down to.
   */
  dev: {
    phase: (cycleDay: number) =>
      cycleDay === 0
        ? 'Result day · stand and set rules (day 1 of 2)'
        : cycleDay === 1
          ? 'Stand and set rules (day 2 of 2)'
          : `The vote (day ${cycleDay - 1} of 3)`,
    next: { vote: 'The vote opens', count: 'The count' } as Record<'vote' | 'count', string>,
    /** The panel's two council actions (tech design §12; design §8.9.2 #15): the buttons and their refusals. */
    seatMe: 'Seat me',
    townVotes: 'Votes for card 2 × 3',
    alreadySeated: 'Already on the council here',
    notTheVote: 'Only while the vote is on (days 2–4)',
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
    /** Review 4 (answers §4.2, §7.3): "arrives in 7 min · 14:22" (`when`, then the clock). */
    arrives: (when: string, clock: string) => `arrives ${when} · ${clock}`,
    /** Review 4 #16: nothing invites the player to close the game. */
    eitherWay: "You'll arrive either way, and Energy keeps refilling on the way.",
    onTheWay: 'On the way',
    optional: 'Optional',
    oneChoice: 'one choice',
    /**
     * Review 5 #7 (answers §7): the card stays until a row is tapped; its put-aside row replaces the
     * old *Ignore it* line. The ordinary deck's row and its detail; the hostile deck's row, its detail
     * the consequence (*your name gets written down · Heat +10 · Watched today*, *Watched today*, or
     * *nothing*).
     */
    sleepThrough: 'Sleep through it',
    nothingHappens: 'Nothing happens.',
    letItPass: 'Let it pass',
    letItPassLine: (fx: { heat?: number; flag?: 'watched' | 'warned' } | undefined) => {
      const parts = [
        ...(fx?.heat ? ['your name gets written down', `Heat +${fx.heat}`] : []),
        ...(fx?.flag === 'watched' ? ['Watched today'] : fx?.flag === 'warned' ? ['Warned today'] : []),
      ];
      return parts.length > 0 ? parts.join(' · ') : 'nothing';
    },
    arrived: 'Arrived',
    inTheCapital: "You're in the capital",
    nothingHappened: 'The train was on time. Nothing happened, which is rare.',
    /** Slice-4 fixes §8 (QA n2): the arrival's body above a card still to answer. */
    cardBelow:
      "The train was on time. One thing happened on the way: it's below, and you can still answer it.",
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
    /**
     * Review 4 (answers §7.1, §7.3; the user, 7 Oct: a plain moving pin): the traveller's label on the
     * nation map, *To Coalport · in 12 min*, its accessible name, and the chip that recentres the map.
     */
    pinTo: (city: string, when: string) => `To ${city} · ${when}`,
    pinName: (city: string, when: string) => `Your pin: to ${city}, arriving ${when}`,
    /** QA review 4 §7.5: once the train is in, the label is where you are (was *To Coalport · now*). */
    pinIn: (city: string) => `In ${city}`,
    pinInName: (city: string) => `Your pin: in ${city}`,
    followYourPin: 'Follow your pin',
    /** Review 4: the plate's row back to an unanswered card after its sheet was closed. */
    backToTheCard: (title: string) => `On the way · ${title}`,
  },
  /** Review 5 (answers §12.2, §18.1; ADR 0081): the night patrol's card on rival ground. */
  patrol: {
    /** *A patrol · Rampart Row* (printed in caps). */
    kicker: (street: string) => `A patrol · ${street}`,
    sheetTitle: (city: string) => `Stopped in ${city}`,
    continue: 'Continue',
    /** The link under a refusal (`PATROL_PENDING`) to the city the card waits in. */
    toTheCard: 'To the map',
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
    /** Review 4 (tech design §3.3): the new refusals, worded. */
    notOffered: "That errand was for your first day, and it's done.",
    onceOnly: 'Once only',
    /** `when`: the card's moment as a `when` phrase. */
    cardNotYet: (when: string) => `Not yet: that moment on the train comes ${when}.`,
    noLodgings: 'There is no bed to be had here.',
    notHere: 'A bed is taken where you stand: take the train there first.',
    noCouncil: 'This town has no council.',
    /** Review 5 (tech design §3.5): the new refusals, worded. */
    patrolPending: 'A patrol has stopped you · answer it on the map',
    noPatrol: 'The patrol has moved on.',
    fullHealth: "You're in full health: there's nothing to patch up.",
    /** The voting rework (tech design §4.4): the new refusals, worded. */
    notOnBallot: "That rule isn't on this ballot.",
    /** `when`: a `when` phrase for the next term's first day (design §8.6 Q3). */
    ruleWindowClosed: (when: string) =>
      `Your rule is set for this term · councillors change it on a term's first two days · the next term starts ${when}`,
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
  /**
   * Where you live: the residence card, the sheet and the result (screens §6). Review 4 #9 (answers
   * §9.2): one button, *Live here · 500 Iron*, and the plain reason why; the room left the card for
   * `copy.lodgings`.
   */
  residence: {
    whereYouLive: 'Where you live',
    youLiveIn: (place: string) => `You live in ${place}.`,
    /** The button (and the sheet's): *Live here · 500 Iron*. */
    liveHere: (iron: number) => `Live here · ${iron} Iron`,
    /** The sheet's title: *Live in Eastside · 500 Iron*. */
    liveIn: (place: string, iron: number) => `Live in ${place} · ${iron} Iron`,
    needsIron: (iron: number) => `Needs ${iron} Iron`,
    /** Visiting, may move (answers §9.2, row 1). */
    liveHereLine: (place: string) =>
      `Live in ${place} instead: vote and stand here, and your orders come from here. A week between moves.`,
    /** Short of Iron (row 5). */
    liveHereShort: (place: string) =>
      `Live in ${place} instead: vote and stand here, and your orders come from here.`,
    canMoveAgainFrom: (weekday: string) => `You can move again from ${weekday}.`,
    /** Slice-4 fixes §1 (QA M2): a candidate on the ballot where they live stays until the result. */
    onBallotLine: (place: string, weekday: string) =>
      `You're a candidate in ${place} until the result · you can move from ${weekday}.`,
    /** Resident here: *Since Monday · you vote from Thursday · move again from Monday.* */
    sinceLine: (weekday: string, votesFrom: string, moveFrom: string) =>
      `Since ${weekday} · you vote from ${votesFrom} · move again from ${moveFrom}.`,
    belowRank: (rank2: string, fxp: number) =>
      `${rank2}s can live in the capital. ${fxp} Party XP makes ${/^[aeiou]/i.test(rank2) ? 'an' : 'a'} ${rank2}.`,
    /** At home, resident elsewhere (row 7). */
    liveHereAgain: (city: string) => `Live in ${city} again: vote and stand at home.`,
    /** The result's stamp (content: `politics.results.register.stamp`). */
    movedIn: 'Moved in',
    newVoter: (district: string) => `${district} has a new voter`,
    /** A knock-on line: "Coalport seat given up". */
    seatGivenUp: (city: string) => `${city} seat given up`,
    nextVote: (district: string, weekday: string) => `Next: vote in ${district} from ${weekday}.`,
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
  },
  /**
   * Review 4 #9 (answers §9.3): the paid bed, a card at a place (Tram Junction), in the `JobsCard`
   * pattern. The rule is the room's (100 Iron, seven nights, Rested's cap +50, renewal at the end).
   */
  lodgings: {
    kicker: 'Lodgings',
    /** `cap` with a bed, `base` without: *up to 250 instead of 200*. */
    benefit: (cap: number, base: number) =>
      `Rested banks higher while you have it: up to ${cap} instead of ${base}.`,
    take: (iron: number) => `Take a bed · ${iron} Iron`,
    more: (iron: number) => `Seven more nights · ${iron} Iron`,
    running: (weekday: string, cap: number) => `Your bed until ${weekday} · Rested banks to ${cap}`,
    /** More than seven nights paid: no button, the day it comes back. */
    paidAhead: (weekday: string, cap: number, renewFrom: string) =>
      `Your bed until ${weekday} · Rested banks to ${cap} · renew from ${renewFrom}`,
    /** Under a rents Issue: *50 Iron · Eviction Notices*. */
    priced: (iron: number, label: string) => `${iron} Iron · ${label}`,
    /** The result's stamp and headline (content: `politics.results.room`). */
    stamp: 'Taken',
    headline: 'A bed in Irongate',
  },
  /**
   * Review 5 (answers §8.2, §18 Q14; tech design §6.2): *Get patched up* at any infirmary, the
   * `JobsCard` pattern on the place's sheet, and its modal. Word for word.
   */
  treatment: {
    kicker: 'Treatment',
    /** *See the matron · Health 64 / 125* (St Agnes: the sister; Clearwater: the nurse). */
    line: (carer: 'matron' | 'sister' | 'nurse', hp: number, max: number) => `See the ${carer} · Health ${hp} / ${max}`,
    /** The Courier line under it. */
    price: (iron: number) =>
      `One Iron a point: ${iron} Iron to be whole now. It comes back on its own, ten every ten minutes.`,
    button: (iron: number) => `Get patched up · ${iron} Iron`,
    needs: (iron: number) => `Needs ${iron} Iron`,
    well: "You're well · nothing to treat",
    stamp: 'Patched up',
    headline: 'Whole again',
    body: {
      matron: `"Politics," says the matron, and doesn't ask which. Ten minutes' work and she charges for twenty. Mind the step.`,
      sister: 'The sister does it without a word and the porter takes the money. Mind the step.',
      nurse: 'The nurse does it in ten minutes and the clerk charges for twenty. Mind the step.',
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
  /**
   * Review 4 (answers §23, tech design §5.1): the local edition. The masthead's line under the name
   * (*· Duskwall edition*, so the masthead reads *The Coalport Clarion · Duskwall edition*), its note's
   * accessible name, and the local election's Courier line under the reader's own Election row.
   */
  paper: {
    edition: (city: string) => `· ${city} edition`,
    editionLabel: (city: string) => `What the ${city} edition means`,
    /**
     * The voting rework (design §8.3): the rival edition's line, a notice (a visitor cannot vote there).
     * `until`: days 2–4 the close of the vote; days 0–1 the day voting opens (the set day).
     */
    localElection: (city: string, phase: 'nominations' | 'polling', until: string) =>
      phase === 'polling'
        ? `${city} votes on its rule until ${until}.`
        : `${city} chooses next week's ballot · voting opens ${until}.`,
  },
  /** The Election card in the capital and the result (screens §7.2, §8); `election.registered` is line 1 and 2 of its first state. */
  capitalElection: {
    resultSundays: (weekday: string) => `${weekday}'s result`,
    /** The result's plate line: "Ten seats · Vanguard 4 · Collective 3 · Alliance 3 · local candidates 7 of 10 · final". */
    resultLine: (parts: string[], npcSeats: number) =>
      `Ten seats · ${parts.join(' · ')} · local candidates ${npcSeats} of 10 · final`,
    resultKicker: 'Irongate Council · The result',
    // The voting rework (design §4.1–§4.3, capital): new keys beside the old ones (phase 4 swaps them).
    question: 'Which rule for Irongate next week?',
    /**
     * The capital ballot's plate line (design §8.9 Q3, shortened §8.10 Q1): the home line's shape (one
     * vote · until · the consequence), three Courier lines at most at 390 px so the hall header keeps
     * its 150 px. "One vote · until Saturday midnight · votes and opinion decide Eastside's seats · most
     * seats city-wide wins the rule". The budget is 43 Courier characters a line (316 px of text at 12
     * px); the longest case (*Government Quarter*, *Wednesday 02:00*) is 123 characters and wraps to
     * three lines with one to spare, so neither the sentence nor a district's name may grow. The
     * closed state (days 0–1) prints `ballot.votesFrom` as at home.
     */
    voteLine: (district: string, until: string) =>
      `One vote · until ${until} · votes and opinion decide ${district}'s seats · most seats city-wide wins the rule`,
    /** The result's plate line: "Rally Permits won · 4 seats of 10 behind it · local candidates 7 of 10 · final". */
    resultLineV2: (rule: string, seats: number, npcSeats: number) =>
      `${rule} won · ${seats} seats of 10 behind it · local candidates ${npcSeats} of 10 · final`,
    votesAndOpinion: 'Votes and opinion together · final',
    /**
     * A district's party row: "votes 4"; a shared card's votes marked *shared* ("votes 4 · shared",
     * tech design §20 Q1, design §8.6 Q5). The one key for both (design §8.7 n3): the row's `shared`
     * flag picks the form.
     */
    partyVotes: (n: number, shared: boolean) => `votes ${n}${shared ? ' · shared' : ''}`,
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
    /** A ticket's record tag (design/slice-5-fixes.md §7.1): *On file · −10 % Iron*, the level word. */
    recordTag: (level: string, pct: number) => `${level} · −${pct} % Iron`,
    /** The result's one button after the cells or the infirmary (screens §4.3). */
    toCells: 'To the cells',
    toInfirmary: 'To the infirmary',
    /** The held screens' *While you wait* rows (screens §6.5, §7.5). */
    whileYouWait: 'While you wait',
    /** Me tab (screens §2.4): "32 · Noticed · Cool at 20:40" (`when`; no time while Cool). */
    heatMe: (n: number, state: string, time: string | null) =>
      `${n} · ${state}${time ? ` · Cool ${time}` : ''}`,
    /** The desk (screens §2.5): "Noticed (32), cooling · Cool at 20:40". */
    heatDesk: (state: string, n: number, time: string | null) =>
      `${state} (${n}), cooling${time ? ` · Cool ${time}` : ''}`,
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
    /** "Heat +8 → 32 · Noticed · Cool at 20:40" (`when`); no time while Cool ("Heat +6 → 6 · Cool"). */
    heatMove: (gain: string, after: number | string, state: string, time: string | null) =>
      `Heat ${gain} → ${after} · ${state}${time ? ` · Cool ${time}` : ''}`,
    heatLine: (n: number | string, state: string) => `Heat ${n} · ${state}`,
    /** Review 4 (answers §12): what each state does, in the Heat note (`{stateLine}`). */
    heatStateLine: {
      cool: 'Cool: nothing follows you.',
      noticed:
        'Noticed (25 and over): run-ins are likelier and the police join them; a mission that goes wrong is likelier to cost a mark.',
      hot: 'Hot (50 and over): the same, more so, and your name taken means the cells.',
      wanted: 'Wanted (75 and over): any mission that fails is the cells, no roll.',
    } as Record<'cool' | 'noticed' | 'hot' | 'wanted', string>,
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
    /** Review 4 (answers §12): the Noticed card's last sentence, "Cool at 20:40." (`when`). */
    heatCardCool: (when: string) => `Cool ${when}.`,
    /** Design §13: the chapter's quiet way, the Heat line's tail the first time ("Heat +6 → 6 · Cool · …"). */
    heatFirstCool: 'the first mark of attention: it cools five an hour',
    /** "The police took your name · 1 mark · On file". */
    nameTaken: (n: number, level: string) =>
      `The police took your name · ${n} ${n === 1 ? 'mark' : 'marks'} · ${level}`,
    secondTime: 'Second time this week: three marks',
    /** *One mark*, *Two marks* … in words for the record cards (design/slice-5-fixes.md §4). */
    marksWords: (n: number) => {
      const w = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n - 1];
      return `${w ?? n} ${n === 1 ? 'mark' : 'marks'}`;
    },
    /** The record cards as the design writes them (screens §11; design/slice-5-fixes.md §4). */
    recordCards: {
      onFileMinor:
        "ON FILE · {marksLine}. {It fades|They fade} in a fortnight if there's no more; Iron from missions is down a tenth until then.",
      onFile:
        "ON FILE · {marksLine}, and they don't fade. Iron from missions is down a tenth; 30 Political Capital strikes one off.",
      repeatMinor:
        "REPEAT OFFENDER · {marksLine}. Iron from missions is down a fifth and the police look harder at you. They fade in a fortnight if there's no more.",
      repeat:
        "REPEAT OFFENDER · {marksLine}. Iron from missions is down a fifth and the police look harder at you. These don't fade; 30 Political Capital strikes one off.",
      notorious:
        "NOTORIOUS · {marksLine}. Iron from missions is down a third, bail is doubled, and the courts, the colleges and the Alliance's halls are shut to you. 30 Political Capital strikes one off.",
    },
    /**
     * The card on the first crossing into a record level (QA m5): the fade clause only when every
     * live mark is minor.
     */
    recordCard: (level: 'onFile' | 'repeat' | 'notorious', marks: number, allMinor: boolean): string => {
      const c = copy.risk.recordCards;
      const t =
        level === 'notorious'
          ? c.notorious
          : level === 'repeat'
            ? allMinor
              ? c.repeatMinor
              : c.repeat
            : allMinor
              ? c.onFileMinor
              : c.onFile;
      return t
        .replace('{marksLine}', copy.risk.marksWords(marks))
        .replace('{It fades|They fade}', marks === 1 ? 'It fades' : 'They fade');
    },

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
    healthMove: (a: number, b: number, time: string) => `Health ${a} → ${b} · full again ${time}`,
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
     * The run-in block's *did* line (design/slice-5-fixes.md §7.3; screens §11), as the design writes
     * it: `{he}` *he* / *they* (the opponent's pronoun, content) with its verbs, `{won|lost}` the fight.
     * One sentence for a straight row, two for a failed row and its fight, one merged sentence when luck
     * chose; an unanswered run-in prefixes *You didn't answer, so* to luck's line. Luck never pays.
     */
    did: {
      fightWon: 'You fought and won.',
      fightLost: 'You fought and lost.',
      ran: 'You ran.',
      runFailed: 'You tried to run; {he} {was} faster.',
      talked: 'You talked your way out.',
      talkFailed: "You tried to talk; {he} {wasn't} having it.",
      paid: 'You paid {him} off.',
      payFailed: 'You paid; {he} pocketed it and came at you anyway.',
      luckFight: 'Luck chose to fight, and you {won|lost}.',
      luckRan: 'Luck chose to run, and you got away.',
      luckRunFailed: 'Luck chose to run; {he} {was} faster, and you {won|lost} the fight.',
      luckTalked: 'Luck chose to talk, and {he} let you go.',
      luckTalkFailed: "Luck chose to talk; {he} {wasn't} having it, and you {won|lost} the fight.",
      auto: "You didn't answer, so luck chose …",
    },
    /** The did line from `StreetView.runIn`'s `by` and `steps` and the opponent's pronoun. */
    didLine: (
      by: 'player' | 'luck' | 'auto',
      steps: ReadonlyArray<{ row: 'fight' | 'run' | 'talk' | 'pay'; ok: boolean }>,
      pronoun: 'he' | 'they' = 'he',
    ): string => {
      const d = copy.risk.did;
      const first = steps[0];
      if (!first) return '';
      const fight = first.row === 'fight' ? first : steps.find((s, i) => i > 0 && s.row === 'fight');
      const they = pronoun === 'they';
      const fill = (t: string) =>
        t
          .replaceAll('{he}', they ? 'they' : 'he')
          .replaceAll('{him}', they ? 'them' : 'him')
          .replaceAll('{was}', they ? 'were' : 'was')
          .replaceAll("{wasn't}", they ? "weren't" : "wasn't")
          .replaceAll('{won|lost}', fight?.ok ? 'won' : 'lost');
      const fought = fight?.ok ? d.fightWon : d.fightLost;
      if (by === 'player' || first.row === 'pay') {
        const row =
          first.row === 'fight'
            ? null
            : first.row === 'run'
              ? first.ok
                ? d.ran
                : d.runFailed
              : first.row === 'talk'
                ? first.ok
                  ? d.talked
                  : d.talkFailed
                : first.ok
                  ? d.paid
                  : d.payFailed;
        return fill(row === null ? fought : first.ok ? row : `${row} ${fought}`);
      }
      const luck =
        first.row === 'fight'
          ? d.luckFight
          : first.row === 'run'
            ? first.ok
              ? d.luckRan
              : d.luckRunFailed
            : first.ok
              ? d.luckTalked
              : d.luckTalkFailed;
      const line = fill(luck);
      return by === 'auto' ? d.auto.replace('luck chose …', `l${line.slice(1)}`) : line;
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
      /** `time`: a `when` phrase, "out in 38 min · or pay bail". */
      outAt: (time: string) => `out ${time} · or pay bail`,
      /** Review 4 #16: the sentence, with nothing inviting the player to close the game. */
      eitherWay: (time: string) => `The door opens ${time} either way, and Energy keeps refilling in here.`,
      payBail: (n: number) => `Pay bail · ${n} Iron`,
      bailDouble: 'Bail is double on rival ground',
      /** Review 4 #17 (answers §17): dotted; its note is `help.legalAid`. */
      legalAid: 'Legal Aid · the Alliance pays half your bail',
      tap: 'Listen to the cells',
      /** Review 4 #20 (answers §20.3): the sentence's second line while today's orders are off. */
      ordersOff: "The branch has taken today's orders off the board.",
    },
    /**
     * Review 4 #20 (answers §20.3): the release modal's and the mission result's knock-ons:
     * *Your record: taken in · 1 mark · On file*, *Orders off until the day turns*.
     */
    takenInKnock: (n: number, level: string) => `Your record: taken in · ${n} ${n === 1 ? 'mark' : 'marks'} · ${level}`,
    ordersOffKnock: 'Orders off until the day turns',
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
      body: 'Heat is 25 and the duty officer has your page. He says mind how you go.',
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
      outAt: (time: string, hp: number, max: number) => `out ${time} · Health ${hp} / ${max}, rising`,
      eitherWay: (time: string) =>
        `You're discharged ${time} either way, and Health comes back ten every ten minutes.`,
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
      /** `out`: a `when` phrase, "In the cells at Harbour Police · out in 24 min · bail 150 Iron". */
      cells: (place: string, out: string, iron: number) =>
        `In the cells at ${place} · out ${out} · bail ${iron} Iron`,
      infirmary: (place: string, out: string) => `In the infirmary at ${place} · out ${out}`,
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
      drawsFrom: (faction: string, left: string) =>
        `Your work here draws from the ${faction}'s morale · ${left} of 2.0 points left today`,
      // Review 5 (answers §10.2, §16.1, ADR 0082): the rival header's three lines.
      /** The push bar's label. */
      pushedToday: 'Pushed today',
      /** *0.7 of 2 points · the Collective 0.5 · the Alliance 0.2* (points as `pointsWord`). */
      pushFigure: (total: string, parts: Array<{ party: string; points: string }>) =>
        [`${total} of 2 points`, ...parts.map((p) => `the ${p.party} ${p.points}`)].join(' · '),
      /** At the cap: *The town has had enough today · 2 of 2 · more from tomorrow 01:00*. */
      pushFull: (at: string) => `The town has had enough today · 2 of 2 · more from ${at}`,
      /** The danger line; at night with the patrols (answers §16.1). */
      danger: (word: string, night: boolean) =>
        `Risk here: ${word}${night ? ' · patrols out' : ''} · every tap can bring a run-in · Heat counts double · the cells put you on the train home`,
      /** Its head, all a narrow column prints (QA n1: held sideways, never cut inside the risk word). */
      dangerHead: (word: string, night: boolean) => `Risk here: ${word}${night ? ' · patrols out' : ''}`,
      /** The goal line, out of Unrest. */
      goal: (home: string, toGo: string, week: string) =>
        `The goal: Unrest. Under 60 % the ${home}'s branch drops everything to win the town back, its deputies go quiet, and your work here pays three quarters more. ${toGo} points to go · your party has pushed ${week} this week.`,
      /** The goal line in Unrest. */
      goalHold: (city: string, home: string, above: string) =>
        `${city} is in Unrest · hold it: your work here pays +75 % Party XP · the ${home} needs 60 to get out · ${above} points above the floor.`,
      /** On a phone the goal is one line (the whole sentence is in its note): *The goal: Unrest · 5.0 points to go · your party has pushed 4.2 this week*. */
      goalShort: (toGo: string, week: string) =>
        `The goal: Unrest · ${toGo} points to go · your party has pushed ${week} this week`,
      goalHoldShort: (city: string, above: string) =>
        `${city} is in Unrest · hold it · ${above} points above the floor`,
      /** The nation card's line (the goal line's first sentence). */
      cardGoal: (toGo: string) => `The goal: Unrest · ${toGo} points to go`,
      cardGoalHold: (city: string) => `${city} is in Unrest · hold it`,
      arrivalWarning:
        'Rival ground: Heat doubles here, every tap can bring a run-in, and nothing you own is at risk.',
    },
    /** A card's day flag on arrival. */
    flags: {
      /** `until`: the day's turn as a boundary, "until tomorrow 01:00". */
      watched: (city: string, until: string) => `Watched today: run-ins likelier in ${city} until ${until}`,
      warned: (city: string, until: string) => `Warned: run-ins less likely in ${city} until ${until}`,
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
      /**
       * Review 4 #12 (answers §12): the note by state, with *Cool at {time}* on its own line while not
       * Cool. `cool` is a `when` phrase (*at 20:40*), from the view's `coolsAt`.
       */
      heat: (state: 'cool' | 'noticed' | 'hot' | 'wanted' = 'cool', cool: string | null = null): string[] => [
        `Heat · ${copy.risk.heatState[state]}`,
        [
          `How much notice the police are taking of you. ${copy.risk.heatStateLine[state]} It cools five an hour on its own, faster under a Customs Strike; a quiet day clears it. Nothing you own is at risk from Heat.`,
          ...(state !== 'cool' && cool ? [`Cool ${cool}.`] : []),
        ].join('\n'),
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
      // Review 5 (answers §10.2): reworded to end on the worst and on what is never at risk.
      rivalGround: () => [
        'Rival ground',
        "The other side's home town. Everything is harder, Heat doubles, every tap can bring a run-in, and party work pays half again; the worst is the cells and the train home, and nothing you own is at risk.",
      ],
      /** Review 5 (answers §10.2): the push bar's note. */
      push: () => [
        'Pushed today',
        "What the town will take from outsiders in a day: two points off the home party's share, between the other two parties. After that your work here still pays XP, Party XP and Iron and moves nothing until the day turns.",
      ],
      /** Review 5 (answers §10.2): the goal line's note. */
      unrest: () => [
        'Unrest',
        `A home town under 60 % is in Unrest: its branch's orders become "restore the base", the town counts half for its party in the republic, its deputies abstain in Parliament, and visitors' party work there pays three quarters more. It ends when the home party is back at 60.`,
      ],
      infirmary: () => [
        'The infirmary',
        'Twenty minutes on the ward after a run-in lost. Walk out well for 100 Iron, or discharge yourself at half strength. Energy, the wage and the vote carry on without you.',
      ],
    },
  },
  /**
   * Review 5 (answers §11.3, §12, ADR 0079–0080): the town's six-hour day. `at` phrases come from
   * `when` (*in 40 min*, *at 16:00*), in the player's own clock.
   */
  night: {
    /** The plate's line: *Dusk in 40 min* / *Dusk at 16:00*; *Night · dawn in 25 min* / *Night · dawn at 18:00*. */
    plate: (n: { night: boolean; nextDusk: number; nextDawn: number }, now: number) =>
      n.night ? `Night · dawn ${when(n.nextDawn, now)}` : `Dusk ${when(n.nextDusk, now)}`,
    /** The same line in its two parts (QA m1: stacked beside the name on a short phone): *Dusk* · *in 40 min*. */
    plateParts: (n: { night: boolean; nextDusk: number; nextDawn: number }, now: number): [string, string] =>
      n.night ? ['Night · dawn', when(n.nextDawn, now)] : ['Dusk', when(n.nextDusk, now)],
    /** A night window's lock line (answers §12.1): *Opens at nightfall · dusk at 16:00*. */
    opensAt: (at: string) => `Opens at nightfall · dusk ${at}`,
    /** The ticket tag on rival ground at night (answers §12.2). */
    patrolsTag: 'Night · patrols out',
    /** A night mission's tag on its ticket (answers §12.1, §18 Q1): *Night rate · +25 % Iron*. */
    rateTag: (pct: number) => `Night rate · +${pct} % Iron`,
    /** Its part in the receipt's *Details*, in the risk parts' words: *night rate +15*. */
    ratePart: (n: number) => `night rate +${n}`,
  },
} as const;

export type Copy = typeof copy;
