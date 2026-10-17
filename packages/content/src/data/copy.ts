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
/** The fix round (design §8.12, QA m2): never *1 votes*. */
const votesN = (n: number) => `${n} ${n === 1 ? 'vote' : 'votes'}`;
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
      'The town whose rule you vote on and whose council you can stand for, whose paper comes first, and whose Party orders you get. Living somewhere else costs 500 Iron and a week between moves; everything you own comes with you.',
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
      vote: 'The vote on the rule every five days; a named role at campaign events; backing a candidate',
      stand: 'Standing for the council; calling campaign events; the harder missions',
      chair: 'Standing for Chair after a council term; the party strikes a mark off your record once a month',
      list: "The party's list for Parliament after a term as Governor or Mayor, or three on a council",
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
  /** Review 7 #2 (slice 6 design §23.1): the word filter refuses a name; no echo of the word. */
  nameNotAllowed: "That name can't be used here. Try another.",
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
      `${rule} won · ${votesN(each)} each, the first card takes a tie`,
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
    /** A seat tie settled on votes (design §8.12): "Rally Permits won · the Vanguard's, level at 5 seats of 10, more votes". */
    resultSeatsTie: (
      rule: string,
      party: string,
      seats: number,
      district: string,
      parties: string[],
      untilWeekday: string,
      nextVoteWeekday: string,
    ) => [
      `${rule} won · the ${party}'s, level at ${seats} seats of 10, more votes`,
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
    /**
     * The voting rework (design §4.7): the rule chip, "Street Fund · 3 days" (caps in CSS). On the
     * folded plate (an upright phone under 700 px tall; design §8.11 Q2) the chip prints the name
     * alone, "Street Fund", so the kicker row beside it keeps one line: pass no `days`. The place
     * sheet's chip and the chip's aria-label keep the days.
     */
    ruleChip: (name: string, days?: number | null) => (days == null ? name : `${name} · ${daysN(days)}`),
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
    /**
     * The fix round (design §8.12, QA m7): the ballot page for a Rank 1 member, in place of the
     * vote line: "Recruits can't vote yet: 400 Party XP makes an Activist, and Activists vote."
     */
    belowRank: (rank1: string, rank2: string, fxp: number) =>
      `${rank1}s can't vote yet: ${fxp} Party XP makes ${anA(rank2)} ${rank2}, and ${rank2}s vote.`,
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
      /**
       * The capital's three forms (design §8.11 Q1) are the party's name and who set the card, with
       * no "'s rule": every card on the capital's ballot is a party's, the crest is on the line, and
       * the line must hold a councillor's full name in one Courier row at 390 px (42 characters).
       * The secretary's card: "Vanguard · Organiser Stahl" (`addressedAs`, as `branch`).
       */
      party: (faction: string, who: string) => `${faction} · ${who}`,
      /**
       * The capital, a councillor's card (design §8.9 Q2, §8.11 Q1): "Collective · Councillor Jana
       * Varga". `name` is the character's name as stored; nothing splits it (a councillor is a player
       * the reader may not know, so the full name, as `councillor` above). The view's `whose.via`
       * says which of the two to print.
       */
      partyCouncillor: (faction: string, name: string) => `${faction} · Councillor ${name}`,
      /** A shared card, two crests: "Collective and Alliance". */
      shared: (a: string, b: string) => `${a} and ${b}`,
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
      tie: (weekday: string, each: number) => `won ${weekday} on a tie · ${votesN(each)} each`,
      fallback: "the branch's · no votes cast",
      fallbackUnrest: (councillor: string) => `Councillor ${councillor}'s · no votes cast · the branch had no card`,
      seats: (party: string, seats: number) => `the ${party}'s · ${seats} seats of 10`,
      /** A seat tie settled on votes (design §8.12; the server's `seatTie`): "the Vanguard's · level at 5 seats of 10 · more votes". */
      seatsTie: (party: string, seats: number) => `the ${party}'s · level at ${seats} seats of 10 · more votes`,
      sharedSeatsTie: (a: string, b: string, seats: number) =>
        `the ${a}'s and the ${b}'s · level at ${seats} seats of 10 · more votes`,
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
    notYetVoter: 'You vote here from the next vote that opens.',
    notYetCandidate: 'You can stand here when names next go in for the council.',
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
    /**
     * The fix round (design §8.12, QA m5 and m6): the backing, standing and `NOT_POLLING` refusals,
     * in the new model's words. `voteOpens` is `NOT_POLLING` on cycle days 0–1 (`when` the day and
     * time the vote opens, in the player's clock); `votingClosed` is the same reason after the count.
     */
    alreadyBacking: (name: string) => `You're already backing ${name} for this council.`,
    alreadyStanding: "You're already standing for this council.",
    voteOpens: (when: string) => `The vote opens ${when}.`,
    votingClosed: 'Voting has closed.',
    /** The result's stamp (content: `politics.results.register.stamp`). */
    movedIn: 'Moved in',
    newVoter: (district: string) => `${district} has a new voter`,
    /** A knock-on line: "Coalport seat given up". */
    seatGivenUp: (city: string) => `${city} seat given up`,
    nextVote: (district: string, weekday: string) => `Next: vote in ${district} from ${weekday}.`,
    /** The sheet's five lines (screens §6.2), built on the server with the player's places. */
    sheet: {
      vote: (place: string, weekday: string) =>
        `You vote and stand in ${place} from the next vote that opens (${weekday}).`,
      giveUp: (old: string) =>
        `You stop being a ${old} candidate; your ${old} seat, if any, passes to the branch.`,
      orders: (capital: boolean, lake = false) =>
        lake
          ? 'Party orders come from the lake branch from tomorrow. The Courier is your paper.'
          : capital
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
        `The goal: Unrest. Under 60 % the ${home}'s branch drops everything to win the town back, its deputies stop taking the Chair's line, and your work here pays three quarters more. ${toGo} points to go · your party has pushed ${week} this week.`,
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
        `A home town under 60 % is in Unrest: its branch's orders become "restore the base", the town counts half for its party in the republic, its local deputies vote the party office's line in Parliament whatever the Chair says, and visitors' party work there pays three quarters more. It ends when the home party is back at 60.`,
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
  /**
   * Slice 6, "together" (docs/design/slice-6-screens.md §11 and its help notes §12; the modal texts
   * of docs/design/slice-6-together.md §11; the system lines of design §8; tech design §12.5).
   * Times are formatted by the caller in the player's clock (`time`: "19:40", or *midnight* for the
   * branch's fixture; `out`, `arrives`: `when` phrases). Odds are words (`copy.odds`); no string here
   * prints a chance, a roll or a percentage for odds. Rank titles are the faction's (`rank2`, `rank3`).
   * Amounts come from the rules' constants (`EVENTS`, `CHAT`, `FAVOURS`).
   */
  together: {
    /** The tab bar's word and the Faction tab's five parts. */
    tabs: {
      faction: 'Faction',
      orders: 'Orders',
      events: 'Events',
      members: 'Members',
      scoreboard: 'Scoreboard',
      chat: 'Chat',
    },
    /** The header's Courier line: *Organiser · 12 members · 3 here now*. */
    header: (rank: string, members: number, here: number) =>
      `${rank} · ${members} ${members === 1 ? 'member' : 'members'} · ${here} here now`,
    /** Review 7 #1 (the Branch Office): the plate's caps line, *Coalport branch · 9 here now*. */
    plateLine: (city: string, here: number) => `${city} branch · ${here} here now`,
    /** The letterhead's Courier line under the name: *Organiser · 9 members*. */
    letterhead: (rank: string, members: number) => `${rank} · ${members} ${members === 1 ? 'member' : 'members'}`,
    /** The desktop chat column's head band (the Chat cell keeps *Chat*). */
    room: 'The room',
    /** The Orders tab's kicker over the fixture's card (screens §2.1). */
    fixtureKicker: "The branch's event today",
    /** Review 4 addendum (design §21): the orders block while the member is in the cells. */
    ordersOffCells: 'Orders off today · the branch heard about the cells',
    /** The outcome stamps (design §2.6); the faction colour on Triumph, the failure colour on Fiasco. */
    band: { triumph: 'Triumph', success: 'Success', mixed: 'Mixed', fiasco: 'Fiasco' } as Record<
      'triumph' | 'success' | 'mixed' | 'fiasco',
      string
    >,
    calledOffWord: 'Called off',

    // The board (screens §2.2).
    board: {
      here: (city: string) => `Here · ${city}`,
      /** The capital: *Eastside, Irongate*. */
      hereDistrict: (district: string, city: string) => `${district}, ${city}`,
      elsewhere: (n: number) => `Also open elsewhere · ${n}`,
      joinFromThere: 'join from there',
      mine: 'Your sign-ups',
      results: (city: string) => `Results · ${city}`,
      callAnEvent: 'Call an event',
      whoCanCall: (rank3: string) => `${rank3}s and above can call events; anyone can join one.`,
      handsFull: (city: string) => `The branch has its hands full in ${city} today`,
      /** A result row: *Thursday 19:40 · rally at Market Row · Success · opinion +0.95 · 4 members*. */
      resultRow: (weekday: string, time: string, event: string, venue: string, outcome: string, swing: string, n: number) =>
        `${weekday} ${time} · ${event} at ${venue} · ${outcome} · opinion ${swing} · ${n} ${n === 1 ? 'member' : 'members'}`,
      resultRowCalledOff: (weekday: string, time: string, event: string, venue: string) =>
        `${weekday} ${time} · ${event} at ${venue} · Called off`,
      /** Empty states (screens §9). */
      empty: (city: string) => `No event in ${city} today.`,
      emptyOthers: (rank3: string) => `${rank3}s and above can call one. The branch's event is posted every morning.`,
      noResults: 'No results here yet. The first is tomorrow morning.',
    },
    /** `EventCard` (screens §2.2) and the venue's ticket (§6.2). */
    card: {
      /** *Market Row · settles at 19:40 · 2 of 4 roles · hands 1 of 4* (the hands part when any). */
      line: (venue: string, time: string, filled: number, roles: number, hands: number | null = null) =>
        `${venue} · settles at ${time} · ${filled} of ${roles} roles${hands !== null ? ` · hands ${hands} of 4` : ''}`,
      /** The part of the line with the *settles* note behind it (QA slice 6, clarity). */
      settlesAt: (time: string) => `settles at ${time}`,
      calledBy: (name: string) => `called by ${name}`,
      calledBySecretary: (name: string) => `called by ${name} · the branch's event`,
      join: 'Join',
      joinAsHand: 'Join as a hand',
      yours: (role: string) => `You're the ${role}`,
      full: 'Full',
      settling: 'Settling…',
      /** The ticket's kicker and title: *Campaign event*, *The rally · settles at 19:40*. */
      kicker: 'Campaign event',
      ticketTitle: (event: string, time: string) => `The ${event} · settles at ${time}`,
      ticketTags: (filled: number, roles: number, name: string) => `${filled} of ${roles} roles · called by ${name}`,
      tags: {
        issue: (issue: string) => `Issue: ${issue} · opinion +50 %`,
        closeRace: 'Close race · +25 %',
        firedUp: 'Fired up · better volunteers',
      },
    },

    // The event page (screens §3.1).
    event: {
      kicker: (city: string, venue: string) => `Campaign event · ${city} · ${venue}`,
      /** *Thursday 19:40 · starts in 5 h 12 m · called by Jan Sorel*. */
      whenLine: (weekday: string, time: string, h: number, m: number, name: string) =>
        `${weekday} ${time} · starts in ${h} h ${m} m · called by ${name}`,
      fixtureLine: "settles at midnight · the branch's event",
      settling: 'started · settling',
      pays: 'What it can pay',
      tiles: { opinion: 'Opinion', fxp: 'Party XP', pc: 'Political Capital', paper: 'In the paper' },
      /** The ceiling at a full roster: base × 1.5 × the day's lines, one decimal (design §2.5, 15 Oct 2026). */
      opinionUpTo: (n: string) => `up to about +${n} here`,
      opinionAgainst: (n: string, faction: string) => `up to about +${n} here · against the ${faction}`,
      fxpTile: 'by the outcome',
      pcTile: '3 to 15, by the outcome',
      paperTile: 'your name, tomorrow morning',
      rolesKicker: (filled: number, n: number) => `Roles · ${filled} of ${n} filled`,
      everyRoleMatters: 'every role matters',
      open: 'open',
      /** A holder's line: *P. Holm · Charisma and Intelligence*. */
      holderLine: (name: string, stats: string) => `${name} · ${stats}`,
      /** The gates on an open role the member cannot take. */
      rankGate: (rank2: string) => `${rank2}s and above`,
      needsEnergy: (n: number) => `Needs ${n} Energy`,
      hands: (k: number) => `Hands · ${k} of 4`,
      handsLine: 'any Rank · 5 Energy · no check; your Energy counts toward the swing',
      volunteersLine:
        "Roles still empty at the start go to the branch's volunteers: townspeople run by the game, at half strength. You need not be here when it starts: the result waits for you in a modal and in the paper.",
      /** The sticky button with a role selected: *Organiser · 10 Energy*. */
      takeRole: (role: string, n: number) => `${role} · ${n} Energy`,
      joinAsHand: 'Join as a hand · 5 Energy',
      withdraw: (n: number) => `Withdraw · ${n} Energy back`,
      committed: (time: string) => `Committed from ${time}: the branch is counting on you`,
      /** The event screen's link to the Members tab (review 7 #3: the same word as the invite). */
      askSomeone: 'Invite someone',
      /** The resolved page's header line (screens §3.3). */
      resolvedLine: (outcome: string, swing: string, n: number) =>
        `${outcome} · opinion ${swing} · ${n} ${n === 1 ? 'member' : 'members'}`,
      seeYourResult: 'See your result',
      volunteer: 'Volunteer · townspeople run by the game',
      volunteerHalf: 'Volunteer · townspeople run by the game · half strength',
      calledOffLine: 'Nobody signed up by the start. Nothing happened and nothing was spent.',
      /** The result's *Next* line (the server reads `event.next`). */
      next: "Next: the branch's event tomorrow is on the Faction tab.",
    },
    /**
     * The political modals the server builds (tech design §10.2; design §11; screens §3.2, §4):
     * string templates on the paths the server reads (`modal.{act}.{stamp|headline|body|next}`),
     * filled server-side with `{event}` (the running name), `{venue}`, `{role}` and `{name}`; `{at}`
     * (the start) and `{until}` (the last moment to withdraw) are left for the client's clock, as
     * every PoliticalResult does. `hand` is a hand's "role name" in these lines.
     */
    modal: {
      hand: 'a pair of hands',
      call: {
        stamp: 'Called',
        headline: 'The branch has a {event} at {at}',
        body: "{venue}, {at}. You're the {role}. The branch's chat has the line; three more names and it's a {event}.",
        next: 'Next: ask the branch. Roles still open at the start go to volunteers.',
      },
      signUp: {
        stamp: 'Signed up',
        headline: "You're the {role}",
        body: "{venue}, {at}. The Energy is spent; the rest is the branch's. You need not be here when it starts: the result waits for you.",
        next: 'Next: the result, {at}. Withdraw until {until} if you must.',
      },
      /** The caller's modal when nobody signed up (design §11). */
      calledOff: {
        stamp: 'Called off',
        headline: 'Nobody came',
        body: "No one signed up by the start, so the {event} at {venue} didn't happen. Nothing was spent. Ask in the chat before you call the next one.",
        next: 'Next: call another from the Faction tab.',
      },
      /** The payer's modal (design §11). */
      bailPosted: {
        stamp: 'Bail posted',
        headline: '{name} is out',
        body: 'The duty officer took the Iron, looked at you once and opened the door. The branch remembers these things.',
        next: "Next: they're at the station's pin; the chat knows.",
      },
      /** The visitor's modal (design §11); `bodyGrapes` when three visits have counted already (§9.2). */
      visit: {
        stamp: 'Visited',
        headline: 'Grapes and the paper',
        body: "Ten minutes on the ward, the matron pretending not to listen. {name} is sitting up. Five minutes off their stay and ten points of Health; the branch's runner took the parcel.",
        bodyGrapes:
          'Ten minutes on the ward, the matron pretending not to listen. {name} has had three visitors already, so this one is grapes and company; they are welcome all the same.',
        next: 'Next: the chat knows you went.',
      },
      /** The prisoner's release when a mate posted bail (slice 5's modal with one line changed). */
      releasedBail: {
        stamp: 'Released',
        headline: "Out, on the branch's Iron",
        body: '{name} posted your bail at the desk. Heat is down to 25 and the duty officer has both your names. Say thank you in the chat.',
      },
    },
    /** The knock-on lines the client words from the result's typed effects (tech design §10.2). */
    knock: {
      /** *Rested: 15 of 15 Energy, +50 % XP*. */
      rested: (covered: number, energy: number) => `Rested: ${covered} of ${energy} Energy, +50 % XP`,
      /** *−150 Iron · bail for Jan Sorel*. */
      bailFor: (iron: number, name: string) => `−${iron} Iron · bail for ${name}`,
      fxp: (n: number) => `+${n} Party XP`,
      /** *Jan Sorel: Health +10, out five minutes sooner*. */
      mate: (name: string) => `${name}: Health +10, out five minutes sooner`,
      /** *Bail 150 Iron · posted by Jan Sorel* (the prisoner's release). */
      postedBy: (iron: number, name: string) => `Bail ${iron} Iron · posted by ${name}`,
    },
    /** Withdrawing (design §2.4): one tap until an hour before. */
    withdraw: {
      stamp: 'Withdrawn',
      headline: (role: string) => `You're no longer the ${role}`,
      body: (n: number) => `${n} Energy back. The role is open again; the branch's chat still has the line.`,
      closed: (time: string) => `Committed from ${time}: no withdrawing in the last hour`,
    },
    /** Calling an event (screens §4). */
    call: {
      kicker: (city: string) => `Call an event · ${city}`,
      /** An option's Courier line: *Market Row · 4 roles · 45 Energy of roles · opinion up to about +2.3*. */
      option: (venue: string, roles: number, energy: number, max: string) =>
        `${venue} · ${roles} roles · ${energy} Energy of roles · opinion up to about +${max}`,
      /** A signature event in another district: *at the Esplanade, Garrison Hill · go there to call it*. */
      goThere: (venue: string, district: string) => `at ${venue}, ${district} · go there to call it`,
      stepKicker: (event: string, venue: string) => `The ${event} · ${venue}`,
      chips: { 1: 'In 1 hour', 3: 'In 3 hours', 6: 'In 6 hours', 12: 'In 12 hours' } as Record<1 | 3 | 6 | 12, string>,
      button: (role: string, n: number) => `Call it · ${role} · ${n} Energy`,
      /** Guards, in place of the button (screens §4). */
      guards: {
        oneAtATime: (event: string, time: string) => `One at a time: the branch's ${event} at ${time} is still open`,
        handsFull: (city: string) => `The branch has its hands full in ${city} today`,
        notFromTrain: 'Not from the train',
        notFromCells: 'Not from the cells',
        notOnRivalGround: 'Not on rival ground',
        rank: (rank3: string) => `${rank3}s and above can call events`,
        runIn: 'Answer the run-in first',
        /** A pending night stop on rival ground (review 5); *patrol* stays off the copy (the guards). */
        stop: 'Answer the stop first',
      },
    },
    /** The event result modal (screens §5). */
    result: {
      kicker: (venue: string, city: string) => `Campaign event · ${venue} · ${city}`,
      place: (venue: string, city: string, weekday: string, time: string) => `${venue} · ${city} · ${weekday} ${time}`,
      howItWent: 'How it went',
      you: 'you',
      outcome: { success: 'Success', partial: 'Partial', failure: 'Failure', volunteer: 'half strength' } as Record<
        'success' | 'partial' | 'failure' | 'volunteer',
        string
      >,
      hands: (names: string) => `Hands · ${names}`,
      /** *3 of 4 roles came off; 1 went to volunteers.* */
      summary: (cameOff: number, roles: number, volunteers: number) =>
        `${cameOff} of ${roles} roles came off${volunteers > 0 ? `; ${volunteers} went to volunteers` : ''}.`,
      /** A Party XP part: *Triumph +6*, *Party order +3*, *Close race +3*, *Fired up +1*. */
      part: (label: string, n: number) => `${label} +${n}`,
      partLabels: { band: (band: string) => band, order: 'Party order', closeRace: 'Close race', firedUp: 'Fired up' },
      pcFirst: 'first event today',
      /** The second and third events of the day pay half (design §2.7). */
      pcLater: (ordinal: 2 | 3) => `${ordinal === 2 ? 'second' : 'third'} event today, half`,
      /** *+1.20 for the Collective in Coalport · your share +0.30*. */
      opinion: (swing: string, faction: string, place: string, share: string) =>
        `${swing} for the ${faction} in ${place} · your share ${share}`,
      /** The Headline Story: *+1.20 against the Vanguard in Old Town · your share +0.30*. */
      opinionAgainst: (swing: string, faction: string, place: string, share: string) =>
        `${swing} against the ${faction} in ${place} · your share ${share}`,
      issuePoints: 'Issue points',
      issueLine: (n: number, issue: string) => `+${n} on ${issue}`,
      /** On a Fiasco, the roster's cause under your row (design §11; no *roster* for the player). */
      reasonVolunteers: (k: number) =>
        `${['One', 'Two', 'Three', 'Four', 'Five'][k - 1] ?? k} ${k === 1 ? 'role' : 'roles'} went to volunteers. More of the branch on it next time.`,
      standingWin: (city: string, n: number, next: number) => `Reputation in ${city} · a win · ${n} / ${next}`,
      next: "Next: the branch's event tomorrow is on the Faction tab.",
    },

    // Who's here (screens §6; design §7).
    hereNow: {
      label: 'Here now',
      /**
       * *you, Jan Sorel, Mira Hale and 2 more · 1 from another party* / *you and 1 from another party* /
       * *nobody else just now*. Own-faction names only; the other parties as a count.
       */
      line: (mine: string[], more: number, others: number): string => {
        const names = Array.isArray(mine) ? mine : [];
        const otherPart = others > 0 ? `${others} from ${others === 1 ? 'another party' : 'other parties'}` : '';
        if (names.length === 0) return otherPart ? `you and ${otherPart}` : 'nobody else just now';
        const own =
          more > 0
            ? `you, ${names.join(', ')} and ${more} more`
            : `you, ${names.slice(0, -1).join(', ')}${names.length > 1 ? ' and ' : ''}${names.at(-1)}`;
        return otherPart ? `${own} · ${otherPart}` : own;
      },
      nobody: 'nobody else just now',
      /** The city plate's line, own faction only (absent when it is only you). */
      plate: (n: number, faction: string) => `${n} of the ${faction} in town now`,
      /** The journey screen (screens §6.3). */
      train: (n: number) => `You and ${n} ${n === 1 ? 'other' : 'others'} on this train.`,
    },
    // Members (screens §2.3).
    members: {
      find: 'Find a member',
      showMore: 'Show more',
      rankLevel: (rank: string, level: number) => `${rank} · Level ${level}`,
      /** The presence bands (`presenceBand`, rules). */
      band: {
        hereNow: (city: string) => `here now · ${city}`,
        online: (place: string) => `online · ${place}`,
        today: 'today',
        thisWeek: 'this week',
        away: 'away',
      },
      /** The state that matters, in the failure colour (`out`, `arrives`: `when` phrases). */
      status: {
        cells: (place: string, out: string) => `in the cells at ${place} · out ${out}`,
        infirmary: (out: string) => `in the infirmary · out ${out}`,
        train: (city: string, arrives: string) => `on the train to ${city} · arrives ${arrives}`,
        rivalGround: (city: string) => `in ${city} · rival ground`,
      },
      movedThisWeek: (n: string) => `+${n} this week`,
      /**
       * The invite (was "Ask to join"; review 7 #3, design §23.2). Shown only while you are on an open
       * event with a place this mate can take; the soonest such event when there are several.
       * `time` is the card's time phrase: *Invite to the rally · 19:40*.
       */
      invite: (event: string, time: string) => `Invite to the ${event} · ${time}`,
      /** After the tap, plain text on the row until the event starts. */
      invited: (event: string) => `Invited to the ${event}`,
      /** The result line (a toast, no modal). */
      inviteDone: (name: string) => `Invited. ${name} will see it in the branch's chat.`,
      alone: "You're the branch for now. New members arrive at the station; the paper will say.",
    },
    /** The profile sheet (screens §2.3; design §7.3). */
    profile: {
      line: (faction: string, rank: string, level: number) => `${faction} · ${rank} · Level ${level}`,
      livesIn: (place: string) => `Lives in ${place}`,
      memberSince: (date: string) => `Member since ${date}`,
      heroes: (list: string) => `Heroes: ${list}`,
      noHeroes: 'Heroes: none yet',
      reputationHere: (level: string) => `Reputation here: ${level}`,
      message: 'Message',
      mute: 'Mute',
      unmute: 'Unmute',
      muted: (name: string) => `Muted · ${name}`,
    },
    /** The faction scoreboard (screens §2.4; design §6.4). */
    scoreboard: {
      thisWeek: 'This week',
      allTime: 'All time',
      allCities: 'All cities',
      kicker: (faction: string, period: string) => `Who moved the most for the ${faction} · ${period}`,
      columns: ['#', 'Name', 'Level', 'Moved', 'Events'] as const,
      note: 'Moved is opinion won in every city, added up. A District or City Hero is the top of a bracket in one place at the result.',
      empty: 'Nobody has moved anything this week yet. Opinion won in any city counts here.',
      you: 'you',
    },

    // Chat (screens §2.5; design §8).
    chat: {
      party: 'Party',
      branch: (city: string) => `${city} branch`,
      /** The header line: *3 here · Coalport branch*. */
      header: (n: number, channel: string) => `${n} here · ${channel}`,
      placeholder: 'Say something to the branch…',
      send: 'Send',
      /** The counter from 240 of 280. */
      counter: (n: number, max: number) => `${n} of ${max}`,
      forYou: 'for you',
      newLines: 'New lines ↓',
      reportAsk: "Report this message to the game's moderators?",
      report: 'Report',
      reported: 'Reported',
      cancel: 'Cancel',
      /** The limit lines under the composer, only when hit (`CHAT_RATE`, `CHAT_TEXT`). */
      limits: {
        tooFast: 'One message every three seconds',
        tooMany: (minutes: number) =>
          `Thirty messages in ten minutes is enough for anyone; back in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
        repeat: 'Said that already',
        tooLong: 'At most 280 characters',
        empty: 'Nothing to send',
        /** The word filter's refusal (design §23.1; GDD §16.2's slice-9 string): the line is not posted, the word never echoed. */
        refused: "That can't be said here.",
      },
      /**
       * A masked swear-word, as the period's papers printed one (design §23.1): its first letter and
       * a dash, *b—*. The server stores the line masked; the author sees the same.
       */
      mask: (first: string) => `${first}—`,
      empty: "Nothing said yet. The branch's lines land here: events called, results, who needs bail.",
      /** Me's *Chat* switch (design §8: the chat's one promise is that it can be switched off). */
      me: {
        label: 'Chat',
        on: 'Shown on the Faction tab',
        off: 'Hidden',
        hide: 'Hide chat',
        show: 'Show chat',
        note: 'Hidden chat is still the branch\'s: events, results and favours reach you in the paper and in modals either way.',
      },
    },
    /**
     * The system lines (design §8), in the paper's voice, filled by the client from `system.payload`
     * (times in the reader's clock). The buttons sit at the right of the line.
     */
    system: {
      eventCalled: (name: string, event: string, venue: string, time: string, filled: number, roles: number) =>
        `${name} has called a ${event} at ${venue} for ${time} · ${filled} of ${roles} roles`,
      eventResult: (event: string, venue: string, outcome: string, swing: string) =>
        `The branch's ${event} at ${venue}: ${outcome} · opinion ${swing}`,
      takenIn: (name: string, place: string, iron: number) => `${name} has been taken in at ${place} · bail ${iron} Iron`,
      /** `minutes`: a `count` phrase, *18 minutes*. */
      admitted: (name: string, minutes: string) => `${name} is in the infirmary · ${minutes}`,
      bailPosted: (name: string, prisoner: string) => `${name} posted ${prisoner}'s bail`,
      /** The city day's seats and heroes (design §8). */
      seatWon: (name: string, place: string) => `${name} has taken a seat on the ${place} council`,
      seatTop: (name: string, place: string) => `${name} has topped the poll in ${place}`,
      heroNamed: (name: string, title: string, place: string) => `${name} is named ${title} of ${place}`,
      /**
       * The invite (design §9.3, §23.2): the first open named role the mate may take, or a hand's place.
       * *Jan Sorel invites Mira Hale to the rally at Market Row, 19:40 · the Press is open*, with **Join**.
       */
      nudgeRole: (caller: string, name: string, role: string, event: string, venue: string, time: string) =>
        `${caller} invites ${name} to the ${event} at ${venue}, ${time} · the ${role} is open`,
      nudgeHands: (caller: string, name: string, event: string, venue: string, time: string) =>
        `${caller} invites ${name} to the ${event} at ${venue}, ${time} · a hand's place is open`,
      buttons: {
        postBail: (iron: number) => `Post bail · ${iron} Iron`,
        visit: 'Visit · 3 Energy',
        join: 'Join',
        seeResult: 'See result',
      },
    },

    // Favours (screens §7; design §9, §11).
    favours: {
      postBail: (iron: number) => `Post bail · ${iron} Iron`,
      visit: 'Visit · 3 Energy',
      bailKicker: 'Post bail',
      visitKicker: 'A visit',
      /** `toGo`: a `count` phrase, *24 minutes*. */
      bailBody: (name: string, place: string, toGo: string, iron: number) =>
        `${name} is in the cells at ${place}, ${toGo} to go. Bail is ${iron} Iron; they walk out now and the duty officer notes who paid. You get +10 Party XP.`,
      visitBody: (name: string, toGo: string) =>
        `${name} is in the infirmary, ${toGo} to go. A visit is 3 Energy: Health +10 for them and five minutes off the stay. You get +10 Party XP.`,
      /** The Courier guard on the sheet, when one applies. */
      guards: {
        bailDouble: 'Bail is double on rival ground',
        legalAid: 'Legal Aid · the Alliance pays half your bail',
        alreadyOut: 'Already out',
        notFromRivalGround: 'Not from rival ground',
        needsIron: (n: number) => `Needs ${n} Iron`,
        needsEnergy: 'Needs 3 Energy',
        visited: "You've visited this stay",
        self: "That's your own bail: pay it from the cells",
        notAMate: "That's not one of ours",
        held: 'Not from the cells',
        inTransit: 'Not from the train',
      },
      posted: 'Posted',
      visited: 'Visited',
    },
    /** The held screens' new lines (screens §7.2). */
    held: {
      bailFromTab: "A faction mate can post it from the Faction tab; the branch's chat has been told.",
      visitors: (names: string) => `Visitors: ${names}, Health +10 and five minutes off each`,
      signedUp: (role: string, event: string, time: string) =>
        `You're the ${role} at ${event}, ${time}. You were counted before you came in; the result waits for you.`,
    },
    /** The paper's *Events* row group and the desk's *Signed up* row (screens §8; tech §11.1). */
    paper: {
      kicker: 'Events',
      /** *Today: the branch's doorstep drive at Foundry Row · settles at midnight · 2 of 4 roles*. */
      row: (event: string, venue: string, time: string, filled: number, roles: number) =>
        `Today: the branch's ${event} at ${venue} · settles at ${time} · ${filled} of ${roles} roles`,
      yours: (role: string) => `you're the ${role}`,
      join: 'Join',
      /** The welcome edition's row ends with this instead of a button. */
      joinAsHand: 'join as a hand · 5 Energy',
      empty: (city: string, rank3: string) => `No event in ${city} today. ${rank3}s can call one on the Faction tab.`,
      signedUpLabel: 'Signed up',
      signedUp: (event: string, venue: string, time: string, role: string) =>
        `Signed up: the ${event} at ${venue}, ${time} · ${role}`,
      /** The fixture's `{time}`. */
      midnight: 'midnight',
    },
    /** Refusals, worded (tech design §6.8, §7.2; the server decides). */
    errors: {
      RANK: (rank: string) => `${rank}s and above`,
      NOT_ENOUGH_ENERGY: (n: number) => `Needs ${n} Energy`,
      WRONG_CITY: 'You have to be in the town to sign up.',
      WRONG_DISTRICT: 'Go to that district to call it.',
      HELD: 'Not from the cells or the ward.',
      IN_TRANSIT: 'Not from the train.',
      RIVAL_GROUND: 'Not on rival ground.',
      RUN_IN_PENDING: 'Answer the run-in first.',
      PATROL_PENDING: 'Answer the stop first.',
      ALREADY_ON_EVENT: "You're on this one already.",
      TOO_MANY_SIGNUPS: 'Three sign-ups at a time is the limit.',
      ROLE_TAKEN: 'Someone took that role just now.',
      HANDS_FULL: 'The hands are full.',
      EVENT_STARTED: "It's started; the result is on its way.",
      NOT_YOUR_EVENT: "That event is another party's.",
      ONE_AT_A_TIME: "One at a time: the branch's last event is still open.",
      WITHDRAW_CLOSED: 'Committed: no withdrawing in the last hour.',
      NOT_A_MATE: "That's not one of ours.",
      SELF: 'Pay your own bail from the cells.',
      ALREADY_OUT: 'Already out.',
      NOT_IN_CELLS: "They're not in the cells.",
      NOT_ON_WARD: "They're not on the ward.",
      NOT_ENOUGH_IRON: (n: number) => `Needs ${n} Iron`,
      VISITED: "You've visited this stay.",
      CHAT_RATE: 'Too fast; a moment.',
      CHAT_TEXT: 'Nothing to send, or too long.',
      CHAT_CHANNEL: "That's not your branch's room.",
      /** The word filter (design §23.1): the same words as `chat.limits.refused`, under the composer. */
      CHAT_REFUSED: "That can't be said here.",
      CANNOT_REPORT: "That line can't be reported.",
      NUDGE_NOT_ALLOWED: "They're on it already, or you've invited them.",
      NUDGE_NOTHING_OPEN: 'No place open for them on your events.',
      moved: 'This moved on in another window. Reload to carry on.',
    },
    /** Help notes (screens §12; the review-1 pattern: [kicker, note]). */
    help: {
      campaignEvent: () => [
        'Campaign event',
        'An event the branch does together: a few roles, each on someone\'s stats, and one result for all of you. Sign up ahead; you need not be there when it starts.',
      ],
      /** Slice 6 fix round (QA clarity): behind *settles at 19:40* on the board's card. */
      settles: () => [
        'Settles at',
        "The time the event happens and its result is decided, whether you're online or not. Your result waits for you in a modal and in the paper.",
      ],
      volunteers: () => [
        'Volunteers',
        'Townspeople run by the game. They fill any role still empty at the start, at half strength, so an event always happens; a member in the role does better.',
      ],
      hereNow: () => [
        'Here now',
        "Who's been at this place in the last ten minutes. Your own party by name; the others as a count. Tap a name for who they are.",
      ],
      hands: () => [
        'Hands',
        "A place on any event for anyone, 5 Energy, no check. Your Energy counts toward how far the event moves opinion, and you're paid like everyone else.",
      ],
      scoreboard: () => [
        'Scoreboard',
        'Opinion won in every city, added up, for this week or for good. The top three of each Level bracket are marked.',
      ],
      chat: () => [
        'Chat',
        "The branch's room. Party is everyone; the city branch is who's here. Mute anyone from their profile; report a line with a long press. Hide chat from the Me tab if you'd rather.",
      ],
      /** Review 7 #2 (design §23.1): the editor's rule, behind the composer's (i). */
      editor: () => [
        'The editor',
        "Swearing goes out with the editor's dash, b— and the like. Slurs and real-world hate don't go out at all; the line comes back to you and nobody sees it. The same goes for names.",
      ],
      /** Review 7 #3 (design §23.2): behind the Members tab's (i), next to the invite. */
      invite: () => [
        'Invite',
        "Shows when you're on an event with a place this mate could take. One tap puts a line in the branch's chat with a Join button; once per mate per event. No place is held for them.",
      ],
    },
  },
  /**
   * Slice 7 (docs/design/slice-7-screens.md §15, §12, §13, §16 and the 10 Oct addendum; design
   * §1.1's plain words): the nation. System terms never reach a screen: the player reads
   * *Parliament*, *the party line*, *who holds the republic*, *a petition to dissolve the council*,
   * *a vote to remove the President*. Times are rendered by the client in the player's clock.
   */
  nation: {
    // The nation map's bar and the republic sheet (screens §2).
    bar: {
      whoHolds: 'Who holds the republic',
      leads: (faction: string) => `the ${faction} leads`,
      heldBy: (faction: string) => `held by the ${faction}`,
      contested: 'contested',
      closeRace: 'close race today',
      governor: (name: string) => `Governor: ${name}`,
      mayor: (name: string) => `Mayor: ${name}`,
      localHolds: 'a local holds the chair',
      registerHere: 'Register here from Rank 2 · 500 Iron',
      weights:
        'Five cities, weighted: Irongate 40, Clearwater 30, the three home cities 10 each. Half of every party’s score at the election.',
      unrestHalf: 'Unrest · counts half',
      votesFrom: (weekday: string, days: number) => `The republic votes from ${weekday} · ${days} ${days === 1 ? 'day' : 'days'}`,
      namesIn: (until: string) => `Names in until ${until}`,
      partiesPick: (until: string) => `The parties pick until ${until}`,
      votingOpen: (until: string) => `Voting open until ${until}`,
      resultIn: 'The result is in: to be confirmed tomorrow',
      parliament: 'Parliament',
      office: 'Office',
      /** Phase C (screens §2): the law chips with none in force, and the sheet's act. */
      noLaw: 'No law in force · Parliament sits',
      seeCandidates: 'See the candidates',
      /** The republic sheet's title. */
      sheetTitle: 'The republic',
    },
    // The Me tab: offices and the ladder (screens §3).
    me: {
      governorLine: (city: string, weekday: string) =>
        `Governor of ${city} · term ends ${weekday} · 20 Political Capital and 30 Party XP a day`,
      mayorLine: (weekday: string) => `Mayor of Irongate · term ends ${weekday} · 20 Political Capital and 30 Party XP a day`,
      chairLine: (faction: string, date: string) => `Chair of the ${faction} · until ${date}`,
      deputyLine: (date: string) => `Deputy · Parliament · until ${date}`,
      presidentLine: (date: string, second: boolean) =>
        `President of the Republic · until ${date} · ${second ? 'second' : 'first'} term`,
      ladder: 'The ladder',
      councilDone: 'Council term completed',
      governorRung: 'Governor or Mayor · a completed council term first',
      standNextCount: 'stand at the next count',
      chairRung: 'Chair · Rank 4 and a council term',
      namesFrom: (date: string) => `names in from ${date}`,
      parliamentRung: "Parliament · Rank 5 and a Governor's or Mayor's term, or three council terms",
      presidentRung: 'President · Rank 6 and a term in Parliament',
      pay: (pc: number, fxp: number) => `Pay: ${pc} Political Capital and ${fxp} Party XP a day, present or not`,
    },
    // The Governor's and the Mayor's page (screens §4.1; the 10 Oct addendum: the party's card).
    governor: {
      header: (city: string, hall: string) => `Governor of ${city} · ${hall}`,
      mayorHeader: 'Mayor of Irongate · the City Hall',
      since: (fromWeekday: string, toWeekday: string) => `since ${fromWeekday}'s result · term ends ${toWeekday}`,
      local: (name: string) => `${name} · Local · holds the chair; no councillor has a completed term`,
      cardKicker: "The party's card",
      cardLine: (ordinance: string, fromWeekday: string, toWeekday: string) =>
        `The party's card · ${ordinance} · the town votes ${fromWeekday} to ${toWeekday}`,
      cardNote: (until: string) => `Card 1 on the town's ballot, at no cost. Set it by ${until}.`,
      change: 'Change',
      setAt: (weekday: string) => `set at ${weekday} midnight`,
      chooseRule: 'Choose the rule',
      atNoCost: "The Governor's rule · at no cost",
      voted: (weekday: string, ordinance: string, won: boolean) =>
        `The town voted ${weekday}: ${ordinance} ${won ? 'won' : 'fell short'}`,
      address: 'The Address',
      addressNote: (faction: string) => `Fifty points to the ${faction} on one of the town's Issues, once a term`,
      presidentAddressNote: 'A hundred points on one Issue in one city, once a term',
      speakOn: (issue: string) => `Speak on ${issue}`,
      speak: 'Speak',
      addressSpent: (issueShort: string, weekday: string) => `The Address is spent for the term · ${issueShort}, ${weekday}`,
      /** Phase C (governor.spec): the Governor's rule heads the party's card. */
      card1: "Card 1 on the town's ballot",
      whatDoes: (title: string) => `What the ${title} does`,
      mayorOf: (city: string, hall: string) => `Mayor of ${city} · ${hall}`,
    },
    // The Chair's page and desk (screens §4.2, §5; the route is /faction?tab=chair).
    chair: {
      tab: 'Chair',
      header: (faction: string, house: string) => `Chair of the ${faction} · ${house}`,
      setBy: (a: string, b: string, c: string) => `Set by the Chair: ${a} · ${b} · ${c}`,
      pushLine: (place: string, n: number) => `the push: ${place} · target ${n}`,
      voteOnChair: 'A vote on the Chair',
      theChairsPage: "The Chair's page",
      secretaryRuns: 'The secretary runs the branch',
      isChair: (name: string) => `${name} is Chair`,
      factionsChairIs: (faction: string, name: string) => `The ${faction}'s Chair is ${name}`,
      orders: 'Orders',
      lines: 'Lines',
      tomorrowsOrders: "Tomorrow's orders · standing until changed",
      ordersNote:
        'Three orders every member reads in the morning. The secretary writes the lines; your name goes under them. They repeat every day until you change them.',
      slotA: 'Talk to voters · slot A',
      slotB: 'Party work · slot B',
      slotC: 'The habit · slot C',
      rotation: "the secretary's rotation",
      /** Design §23.2: a family with no twin in a residence. */
      residenceRotation: (residence: string) => `${residence}: the rotation`,
      push: 'Push one order to a battleground',
      pushIrongate: (district: string) => `Irongate · ${district}`,
      pushClearwater: 'Clearwater',
      targetNote:
        "The party's target: when the whole party reaches it by midnight, everyone who did at least one gets +10 Party XP. Members below Level 10 read this order in their own town.",
      setOrders: 'Set the orders',
      setFromTomorrow: 'Set · from tomorrow',
      setByName: (name: string) => `Set by the Chair, ${name}`,
      targetToday: (n: number, target: number, unit: string, place: string) =>
        `The party's target today · ${n} of ${target} ${unit} in ${place}`,
      pushTag: (place: string) => `the Chair's push · ${place}`,
      partyLine: 'The party line · Parliament',
      for: 'For',
      against: 'Against',
      freeVote: 'Free vote',
      secretarysLine: (line: string) => `the secretary's line: ${line}`,
      localsAbstain: 'the locals abstain',
      /** Settled 16 Oct 2026 (phase C): in Unrest the locals take the secretary's line, whatever the Chair sets. */
      localsUnrest: (locals: number, line: string) =>
        `the home city is in Unrest: ${locals} local deputies follow the secretary's line (${line}) until the branch wins the town back`,
      followYourLine: (players: number, locals: number) =>
        `${players} player ${players === 1 ? 'deputy has' : 'deputies have'} voted; ${locals} local deputies follow your line`,
      followPlayers: (locals: number) => `${locals} local deputies follow the player deputies`,
      nothingUp: 'Nothing up for a vote in Parliament. The secretaries put a law up most Mondays.',
      partyCard: 'The party’s card · the councils',
      partyCardIn: (city: string) => `The party's card in ${city}`,
      partyCardNote: 'what the town votes on where no Governor of ours sits',
      fromCouncil: (weekday: string) => `from ${weekday}'s vote`,
      putLaw: 'Put a law to Parliament · once a term · 50 Political Capital',
      youPut: (law: string, date: string) => `You put ${law} to Parliament on ${date}`,
      calledByChair: 'called by the Chair',
      noRoleCalledByChair: 'no role · called by the Chair',
      tomorrowsFixtures: "Tomorrow's fixtures",
      fixtureRotation: 'the rotation',
      officers: 'Officers',
      clearwaterBranch: 'Clearwater branch',
    },
    // Parliament, a bill, the catalogue, the law book (screens §6, §8).
    parliament: {
      header: 'Parliament · the chamber',
      seats: (v: number, c: number, a: number, locals: number, president: string) =>
        `Sixty seats · ${v} Vanguard · ${c} Collective · ${a} Alliance · local deputies ${locals} of 60 · President ${president}`,
      termLine: (date: string, days: number, weekday: string) =>
        `This term ends ${date} · ${days} ${days === 1 ? 'day' : 'days'} · the republic votes from ${weekday}`,
      upForVote: 'Up for a vote',
      thePresidents: "the President's",
      billRow: (name: string, party: string, until: string, needed: number) =>
        `put to Parliament by ${name} · ${party} · votes until ${until} · ${needed} of 60 carry it`,
      factional: 'treats the parties differently · needs 36',
      strikes: (law: string) => `strikes out ${law}`,
      removal: 'a vote to remove the President · needs 40',
      override: 'vote it through anyway · needs 40',
      yourVoteFor: 'your vote: For',
      yourVoteAgainst: 'your vote: Against',
      forAgainst: (f: number, a: number) => `For ${f} · Against ${a}`,
      localsLine: (faction: string, line: string) => `${faction}'s locals: ${line}`,
      putLaw: 'Put a law to Parliament · 50 Political Capital',
      putLawFree: 'Put a law to Parliament · free · this week',
      whoPuts: 'Deputies and Chairs put laws to Parliament; you can vote from Rank 2 in the elections, and stand from Rank 5',
      decided: 'Decided this term',
      passed: (f: number, a: number, days: number) => `passed ${f}–${a} · in force ${days} days`,
      fell: (f: number, a: number) => `fell ${f}–${a}`,
      vetoed: 'vetoed by the President',
      struck: 'struck out',
      lawBook: 'The law book',
      republicsResult: "The republic's result",
      how: 'How Parliament works',
      whatItDoes: 'What it does',
      daysEveryCity: (days: number) => `${days} days · every city`,
      membersOnly: (faction: string) => `For members of the ${faction} only`,
      othersOnly: (faction: string) => `For everyone not of the ${faction}`,
      removes: (president: string, runnerUp: string) => `Removes ${president}; ${runnerUp} serves the rest of the term`,
      billLine: (name: string, date: string, at: string, needed: number) =>
        `Put to Parliament by ${name} on ${date} · Parliament votes at ${at} · ${needed} of 60 carry it`,
      blocLine: (faction: string, players: number, locals: number) =>
        `${faction}: ${players} players For, ${locals} locals For (the party line)`,
      voteFor: (law: string) => `Vote For ${law}`,
      voteAgainst: 'Vote Against',
      awaitingSignature: 'Awaiting your signature · in force from tomorrow unless vetoed',
      veto: 'Veto',
      vetoFinal: 'Veto · final: Parliament cannot vote it through before the term ends',
      stamps: {
        passed: 'Passed',
        fell: 'Fell',
        vetoed: 'Vetoed',
        struck: 'Struck out',
        removed: 'Removed',
        survived: 'Survived',
      },
      putLawCost: (cost: string) => `Put a law to Parliament · ${cost}`,
      whichReplaces: 'Which law does it replace?',
      needs36: 'needs 36 · treats the parties differently',
      partyLines: (v: string, c: string, a: string) => `${v} · ${c} · ${a}`,
      strikeOut: 'Strike out a law',
      needs50: 'Needs 50 Political Capital',
      blocSeats: (faction: string, n: number) => `${faction} · ${n} ${n === 1 ? 'seat' : 'seats'}`,
      players: 'Players',
      localDeputies: 'Local deputies',
      localsNote:
        "Townspeople run by the game. They vote the party line: the player deputies' majority, else the Chair's line, else the secretary's.",
      localDeputy: (who: string) => `Local deputy · ${who}`,
      andMore: (n: number, faction: string) => `and ${n} more ${faction} deputies`,
      firstOnList: 'first on the list',
      // The law book (screens §8).
      lawsInForce: 'Laws in force',
      lawsCount: (n: number) => `${n} of 5 · every city · the lines on your tickets`,
      daysLeft: (days: number) => `${days} ${days === 1 ? 'day' : 'days'} left`,
      lawRow: (name: string, weekday: string, f: number, a: number) => `put to Parliament by ${name} · passed ${weekday} ${f}–${a}`,
      strikeIt: 'Strike it out · 50 Political Capital',
      catalogue: 'Every law the republic can pass · 13',
      lawKicker: 'Law',
      lawLine: (name: string, effect: string) => `Law: ${name} ${effect}`,
    },
    // The Chair's election (screens §7.1; the 10 Oct addendum).
    chairElection: {
      kicker: (faction: string) => `Election · Chair of the ${faction}`,
      namesIn: 'Names in for Chair',
      needs: (until: string) => `Needs Rank 4 and a completed council term · closes ${until}`,
      closes: (until: string) => `Closes ${until} · the secretary is on the ballot too`,
      stand: 'Stand for Chair · 25 Political Capital',
      standing: (n: number) => `You're standing for Chair · ${n} ${n === 1 ? 'backer' : 'backers'}`,
      votingOpen: 'Voting for Chair is open',
      youVotedFor: (name: string) => `You voted for ${name}`,
      councilTermDone: 'A council term completed',
      tenure: '14 days in the party',
      cost: 'Costs 25 Political Capital. Your name is on the list until the result.',
      secretary: 'The secretary',
      secretaryRow: (secretary: string) => `${secretary} · keep the orders as they are · run by the game`,
      secretaryNote:
        "The branch's own administrator is always on the ballot. If the secretary wins, nothing changes. A player with more votes takes the Chair.",
      howCounted: "One Chair. The most support wins. Support is members' votes plus three per backer; the secretary has votes only.",
      oneVote: (at: string) => `One vote, secret and final. The result is at ${at}.`,
      turnout: (n: number) => `${n} ${n === 1 ? 'member' : 'members'} voted · final`,
      resultNote:
        "The most support took the Chair: members' votes plus three per backer. A tie goes to votes, then backers, then terms served, then who stood first.",
    },
    // The party's pick, the republic's vote and the result (screens §7.2–§7.4).
    election: {
      pickKicker: (faction: string, pickName: string) => `The ${faction} · ${pickName}`,
      thePick: "The party's pick",
      pickNote: (until: string) => `One candidate carries the party for President · one vote, secret and final · closes ${until}`,
      rank6: 'Rank 6 · a term in Parliament ✓',
      ownCandidate: "The party's own candidate",
      figureRow: (name: string, who: string) => `${name} · ${who} · run by the game`,
      figureNote:
        "The party's own figure is always on the ballot. If it wins, it carries the party and holds the office if the party wins. A player with more votes carries the party instead.",
      choose: (name: string) => `Choose ${name}`,
      carries: (name: string, faction: string) => `${name} carries the ${faction}`,
      republicKicker: 'The republic · Parliament',
      whoStands: "Who's standing for President",
      threeCandidates: (weekday: string, until: string) =>
        `Three candidates, one from each party · the republic votes from ${weekday} until ${until}`,
      ownCandidateTag: (faction: string) => `the ${faction}'s own candidate · run by the game`,
      pledges: (law1: string, law2: string) => `Pledges: ${law1} · ${law2}`,
      back: 'Back · 10 Political Capital',
      backed: 'Backed',
      scoreNote:
        "Each party's score mixes its share of the votes with its share of who holds the republic (the five cities, weighted), plus up to five from backers. The highest score is President; Parliament's sixty seats are shared out by the same scores.",
      list: (faction: string) => `The ${faction}'s list`,
      thenLocals: 'then local deputies',
      listNote: "Seats go down the list, as many as the party's score wins. Backing a name moves it up.",
      standList: 'Stand for Parliament · 25 Political Capital',
      listRung: "a Governor's or Mayor's term, or three council terms",
      standPresident: 'Stand for President · 100 Political Capital',
      twoPledges: 'Two pledges',
      oneVote: (at: string) =>
        `One vote for President, secret and final. Any candidate, any party. The result is at ${at}, to be confirmed the day after.`,
      voteCast: (countDay: string) => `Vote cast · the result is in ${countDay}'s paper and on the republic sheet`,
      resultKicker: 'The republic · the result',
      toBeConfirmed: 'To be confirmed',
      finalTomorrow: 'final tomorrow, once the returning officer has checked the box',
      final: 'Final',
      columns: { votes: 'Votes', republic: 'The republic', backers: 'Backers', score: 'Score', seats: 'Seats' },
      presidentTag: 'President',
      resultNote:
        "Each party's score is half its share of the votes and half its share of the republic's opinion, plus its backers. The highest score is President. Seats went out by the scores: the top score takes the first seat, and so on down.",
      turnout: (n: number, m: number) => `Turnout ${n} of ${m}`,
      presidentsPage: "The President's page",
      toParliament: 'To Parliament',
      toTheOffice: 'To the office',
    },
    // The President's page (screens §4.3).
    president: {
      header: 'President of the Republic · the Ministries',
      took: (date: string, ends: string, second: boolean) =>
        `took office ${date} · term ends ${ends} · ${second ? 'second' : 'first'} term`,
      figure: (name: string, faction: string) => `${name} · the ${faction}'s own figure · run by the game`,
      pledges: 'Pledges',
      kept: (date: string) => `kept ✓ ${date}`,
      notYet: 'not yet · put it to Parliament',
      lawAWeek: 'A law a week',
      lawAWeekNote: 'Free, in a slot of your own, first up for a vote',
      putLaw: 'Put a law to Parliament',
      thisWeeksLaw: (law: string, at: string) => `This week's law: ${law} · Parliament votes ${at}`,
      nextMonday: 'Next: from Monday',
      veto: 'The veto',
      vetoNote: 'Once a term: stop a law Parliament has passed, on its signature day',
      unused: 'Unused',
      usedOn: (law: string, date: string) => `Used on ${law}, ${date}`,
      awaiting: (law: string) => `${law} is awaiting your signature today`,
      seeBill: 'See the bill',
    },
    // Petitions and removals (screens §9).
    petition: {
      open: 'Petition to dissolve the council · 10 Political Capital',
      line: (n: number, needed: number, until: string) => `A petition to dissolve the council: ${n} of ${needed} names by ${until}`,
      sign: 'Sign · 10 Political Capital',
      signed: 'Signed',
      kicker: (city: string) => `${city} council · a petition`,
      count: (n: number, needed: number) => `${n} of ${needed} residents`,
      note: (needed: number, until: string, weekday: string) =>
        `If ${needed} residents of any party sign by ${until}, the council is dissolved: the rule in force runs its days out, the council's chair goes to a local, and the councillors' terms end uncompleted. Local candidates sit until ${weekday}'s result.`,
      openIt: 'Open it · 10 Political Capital',
      councillorsCant: "You're a councillor; councillors can't sign",
      townHall: "A Town Hall event in the town adds townspeople's names: Triumph 3, Success 2, Mixed 1",
      dissolved: 'Dissolved',
      fellShort: 'Fell short',
      removal: 'A vote to remove the President · 50 Political Capital',
      clerk: "put up by the clerk: the President's party holds under a quarter of the republic",
      chairPetition: 'A vote on the Chair · 10 Political Capital',
      chairCount: (n: number, needed: number, until: string) => `${n} of ${needed} members of Rank 3 and above by ${until}`,
      chairNote:
        'If the names come in, every member votes for two days: two thirds against removes the Chair and the secretary acts until the next election.',
      chairVote: (reason: string) => `A vote on the Chair · ${reason}`,
      confidence: (name: string) => `Confidence in ${name}`,
      noConfidence: 'No confidence',
      cast: 'Cast your vote',
      chairVoteNote: (at: string) => `Secret and final. Two thirds against, and at least three votes, remove the Chair. The result is at ${at}.`,
      reasons: { unrest: 'the home city is in Unrest', petition: 'members petitioned' },
    },
    // Clearwater (screens §10; review 4: one map).
    clearwater: {
      board: 'Board · 20 Iron · 25 min',
      onTheLake: "You're on the lake",
      name: 'Clearwater',
      frontLocked: 'Opens with a later edition · The promenade, the casino and the lido: the money side of town',
      quarters: { front: 'The Front', depot: 'The Depot', harbour: 'The Harbour' },
      electionKicker: 'Election · Clearwater council',
      sevenSeats: 'seven seats, any name on the list',
      register: 'Register in Clearwater · 500 Iron',
      hallKicker: 'Clearwater council · the Casino',
      howCounted:
        "Seven seats. Each party's score mixes its share of the votes with its share of opinion on the lake. The top score takes the first seat, the next the second, and so on; within a party, seats go by support.",
      governorLine: (name: string) => `Mayor: ${name} · the largest bloc's top councillor with a completed term`,
      registeredVotesFrom: (weekday: string) => `Registered in Clearwater · you vote from ${weekday}`,
      lakeBranch: 'the lake branch',
    },
    // The paper (screens §11).
    paper: {
      fromTheCapital: 'From the capital',
      theRepublic: 'The republic',
      voteNow: (until: string) => `The republic votes until ${until} · Vote now`,
      namesInChair: (until: string) => `Names in for Chair until ${until}`,
      stipend: (title: string, city: string) => `${title} of ${city} · 20 Political Capital and 30 Party XP paid`,
      /** Phase C: the desk's line per office (any office; the stipend's label from the server). */
      officePaid: (label: string, pc: number, fxp: number) => `${label} · ${pc} Political Capital and ${fxp} Party XP paid`,
      targetPaid: (label: string, fxp: number) => `${label} · +${fxp} Party XP`,
      electionKicker: 'Election',
      captions: {
        /**
         * D-S7I-3 (16 Oct 2026): `title` is *Governor* at home, *Mayor* in Irongate and Clearwater
         * (`governorTitle`), so the words stay in content: *Anna Roth, elected Governor of Coalport*.
         */
        governorOrMayor: (name: string, title: string, city: string) => `${name}, elected ${title} of ${city}`,
        chair: (name: string, faction: string) => `${name}, elected Chair of the ${faction}`,
        deputy: (name: string, faction: string) => `${name}, elected deputy for the ${faction}`,
        president: (name: string) => `${name}, President of the Republic`,
      },
    },
    // Empty states (screens §13).
    empty: {
      nothingUp: 'Nothing up for a vote. The secretaries put a law up most Mondays; deputies and Chairs can put one up any day.',
      nothingDecided: 'Nothing decided yet this term.',
      noLaw: 'No law in force. Parliament sits; the secretaries put a law up most Mondays.',
      noPlayerBloc: (faction: string) => `No player sits for the ${faction} this term. Stand at the next election from Rank 5.`,
      noChairCandidate: (secretary: string, date: string) => `No member stood. ${secretary} keeps the orders. Names in again from ${date}.`,
      noPlayerStands: "No player stands this term. The parties' own figures carry them; the republic votes anyway.",
      nobodyOnList: 'Nobody on the list yet. Seats the party wins go to local deputies.',
      noPetition: 'No petition. A resident of Rank 3 and above can open one in the council’s first three days.',
      localHolder: (name: string) => `${name} · Local · run by the game · sets nothing`,
    },
    /** Help notes (screens §12 and §10; the review-1 pattern: [kicker, note]; the 10 Oct addendum for the card). */
    help: {
      parliament: () => [
        'Parliament',
        "Sixty deputies, shared out between the parties by the republic's result every four weeks. Laws go up for a three-day vote; 31 carry one, 36 if it treats the parties differently.",
      ],
      president: () => [
        'President',
        "The republic's top office, elected every four weeks. A law a week, one veto a term, one Address a term, and every paper watching.",
      ],
      chair: () => [
        'Chair',
        "The party's elected head, every four weeks. Sets the Party orders every member reads, the party line in Parliament and the party's card in the councils, and the branch's events.",
      ],
      governor: () => [
        'Governor or Mayor',
        "The top councillor with a completed term, when the council is seated: the Governor at home, the Mayor in Irongate and Clearwater. Chooses the party's card on the town's ballot and makes one Address a term.",
      ],
      deputy: () => [
        'Deputy',
        'A seat in Parliament for a term: a vote on every law and one law of your own to put up.',
      ],
      term: () => ['Term', 'Twenty-eight days. The republic votes at its end; the Chair is elected in its middle.'],
      veto: () => [
        'Veto',
        'The President may stop one law a term on the day after it passes. Parliament can vote it through anyway with forty.',
      ],
      partyLine: () => [
        'The party line',
        "How the party's local deputies vote. The player deputies' majority first; else the Chair's line; else the secretary's. While the home city is in Unrest, the secretary's line, whatever the Chair says.",
      ],
      partyCard: () => [
        "The party's card",
        "The rule the party puts on a city's ballot: the Governor's or Mayor's choice where one of ours sits, else the Chair's, else the secretary's. The town votes on it.",
      ],
      lawBook: () => [
        'The law book',
        'Every law in force, at most five, with its days left. A law changes real numbers for everyone, within fixed bounds, and never your odds or Party XP.',
      ],
      whoHolds: () => [
        'Who holds the republic',
        "The five cities' opinion, weighted: the capital 40, Clearwater 30, the home cities 10 each. Half of every party's score at the election.",
      ],
      petition: () => [
        'A petition',
        "Residents of any party can dissolve a council in its first three days if a quarter of them sign. The rule in force runs its days out; the councillors' terms end uncompleted.",
      ],
      pick: () => [
        "The party's pick",
        "Each party's members choose who carries it for President. The party's own figure is always on the ballot; beat it to carry the party.",
      ],
      ownCandidate: () => [
        "The party's own candidate",
        'A figure run by the game. It stands when no player carries the party and holds the office when nobody wins it, so the republic always has a government.',
      ],
      ladder: () => [
        'The ladder',
        'Every office needs a completed term in the one below: a council seat, then Governor or Mayor, then Parliament, then the Presidency. The Chair needs a council term and Rank 4.',
      ],
      /** Screens §10: *How elections work* for Clearwater, in the capital note's pattern. */
      clearwaterElection: (rank2: string, rank3: string) => [
        'How elections work',
        [
          'Clearwater elects seven councillors every five days: the players who stand, and local candidates run by the game who fill each party’s list to three names.',
          `${rank2}s vote for any name on the list from the first election after they registered; ${rank3}s who are Known on the lake can stand for 10 Political Capital, naming a rule.`,
          "Each party's score mixes its share of the votes with its share of opinion. The top score takes the first seat, the next the second, and so on; within a party, seats go by support.",
          "A seat is five days at the Casino: the largest party's card is the town's rule, and 10 Political Capital and 20 Party XP a day. The top councillor of the largest party with a completed term is Mayor.",
        ].join('\n'),
      ],
    },
  },
  /**
   * Slice 8 (docs/design/slice-8-screens.md §17, §18.6; design §1.1, §11, §16.7, §24): a life in
   * the city. System terms never reach a screen: the player reads *the Wardrobe*, *Coat / On you /
   * Papers / Tools*, *work clothes / a good coat / a tailor's suit / a society wardrobe*, *the
   * Dossier*, *a Case File*, *an exposé*, *Favour*, *Legacy*, *the back room*, *a society call*,
   * *someone to walk with you*, *well fed*, *in good spirits*. No string prints a chance, a roll,
   * a recognition figure or a coat's weight as a number; the only numbers on an item card are its
   * Charisma and its price. Times and weekdays are rendered by the caller in the player's clock;
   * amounts come from the rules' constants where a caller passes them. The season's strings are
   * deferred with it (design §23).
   */
  life: {
    // ----- The Wardrobe (screens §2, §2.1, §3, §5) ------------------------------------------------
    wardrobe: {
      kicker: 'Wardrobe',
      charisma: (n: number) => `Charisma ${n}`,
      outfits: { town: 'Town', plain: 'Plain clothes', evening: 'Evening' } as Record<'town' | 'plain' | 'evening', string>,
      /**
       * The chip's second line by outfit: *Town · Charisma 17 · recognised on rival ground* from
       * Charisma 20 (design §3.6, `RECOGNITION.cha`'s lowest edge); below it, *nobody looks twice
       * at the coat* (phase C ruling, design §25 #2).
       */
      chipTown: (n: number) => `Town · Charisma ${n} · recognised on rival ground`,
      chipTownPlain: (n: number) => `Town · Charisma ${n} · nobody looks twice at the coat`,
      chipPlain: (n: number) => `Plain clothes · Charisma ${n} · unnoticed on rival ground`,
      chipEvening: (n: number) => `Evening · Charisma ${n} · dressed for the Casino`,
      /** The Evening chip while the rent is out. */
      eveningWaits: 'Evening · pay the rent to wear it as a set',
      payTheRent: 'pay the rent',
      keepAs: (outfit: string) => `Keep this as ${outfit}`,
      /** The chip row in the cells or the infirmary, and on a train. */
      changeWhenOut: "Change when you're out",
      changeWhenArrive: 'Change when you arrive',
      slots: { clothing: 'Coat', accessory: 'On you', document: 'Papers', utility: 'Tools' } as Record<
        'clothing' | 'accessory' | 'document' | 'utility',
        string
      >,
      wearing: 'Wearing',
      nothingTap: 'Nothing · tap to choose',
      keepsake: 'Keepsake',
      everythingYouOwn: (n: number) => `Everything you own · ${n}`,
      everything: 'Everything you own',
      wearingLine: (item: string, n: number) => `Wearing: ${item} · Charisma ${n}`,
      nothingOn: 'Nothing on',
      wear: 'Wear',
      takeOff: 'Take it off',
      charismaChange: (a: number, b: number) => `Charisma ${a} → ${b}`,
      /** The tier, said as what it is (never a numeral). */
      tierWord: { 1: 'work clothes', 2: 'a good coat', 3: "a tailor's suit", 4: 'a society wardrobe', 5: 'a society wardrobe' } as Record<
        1 | 2 | 3 | 4 | 5,
        string
      >,
      holdsUp: 'holds up in a run-in',
      recognisedOnRival: 'recognised on rival ground',
      /** The item words (`ItemCardView.words`), composed by the server from the effects. */
      words: {
        propaganda: 'better odds putting up posters',
        intelligence: 'better odds watching and listening',
        surveillance: 'better odds watching and listening',
        rough: 'better odds on the rough work',
        checkpoint: 'better odds at a checkpoint',
        checkpointRisk: 'a mark and +10 Heat if they look twice',
        bluff: 'better odds talking your way out',
        expose: 'better odds at the paper',
        fxp: '+5 % Party XP',
        dossier: 'a Dossier entry now and then',
        showsAtCheckpoint: 'Shows at a checkpoint',
      },
      fromChapter: (n: number, title: string) => `From chapter ${n}, "${title}"`,
      fromPatron: (patron: string) => `From ${patron}`,
      read: 'Read',
      owned: 'Owned',
      needsIron: (n: number) => `Needs ${n.toLocaleString('en-GB')} Iron`,
      fromLevel: (n: number) => `From Level ${n}`,
      membersOnly: 'Members only',
      fromRank3: 'From Rank 3',
      /** The wardrobe sheet's groups and empty states (screens §5, §15). */
      coats: 'Coats',
      keepsakes: 'Keepsakes',
      sellsAtMarket: (n: number) => `Sells at a market: ${n} ${n === 1 ? 'thing' : 'things'}`,
      nothingYet: (hint: string) => `Nothing yet · ${hint}`,
      hints: {
        accessory: 'The market sells a hat',
        utility: 'The party store sells paste and brush',
        document: 'The press sells a pass',
        keepsakes: 'The chapters leave things here.',
      },
      nothingNewHere: 'Nothing new here',
    },
    // ----- Shops, selling and the back room (screens §4) ------------------------------------------
    shop: {
      forSale: (shop: string) => `For sale · ${shop}`,
      names: {
        clothesStall: 'The clothes stall',
        partyStore: 'The party store',
        tailor: 'The tailor',
        press: 'The press',
        backRoom: 'The back room',
      } as Record<'clothesStall' | 'partyStore' | 'tailor' | 'press' | 'backRoom', string>,
      /** The Courier line under the kicker, by kind. */
      lines: {
        clothesStall: "The stall buys too: a coat you don't want, at a tenth",
        partyStore: "Members only; the party's prices",
        tailor: 'Three fittings and no questions about the bill',
        press: 'A pass and a camera, for the trade',
        backRoom: 'Cash, and no questions',
      } as Record<'clothesStall' | 'partyStore' | 'tailor' | 'press' | 'backRoom', string>,
      yourRecord: (pct: number) => `Your record: +${pct} %`,
      sellsFor: (n: number) => `Sells for ${n.toLocaleString('en-GB')} Iron at a market`,
      sellSomething: 'Sell something',
      buy: (n: number) => `Buy · ${n.toLocaleString('en-GB')} Iron`,
      buyConfirm: (item: string, n: number) => `Buy ${item} for ${n.toLocaleString('en-GB')} Iron?`,
      notNow: 'Not now',
      wearItNow: 'Wear it now',
      /** The back room's row (design §3.8). */
      strikeOff: (n: number) => `Have a mark struck off · ${n.toLocaleString('en-GB')} Iron`,
      strikeLine: (level: string, price: number) => `${level}: ${price.toLocaleString('en-GB')} a mark, the oldest first, one a day`,
      cleanNothing: 'Clean · nothing to strike',
      halfPrice: "Half price this week · Marr's discretion",
      struckToday: 'One a day · struck off today',
      /** The sell sheet (screens §4). */
      sellTo: (shop: string) => `Sell to ${shop}`,
      takeItOffFirst: 'Take it off first',
      sell: 'Sell',
      sellConfirm: (item: string, n: number) => `Sell ${item} for ${n.toLocaleString('en-GB')} Iron?`,
      keepIt: 'Keep it',
      nothingToSell: 'Nothing to sell here.',
      /** §21.1 Q2: an item saved in an outfit (two outfits: both named). */
      inOutfit: (outfit: string) => `It's in your ${outfit} outfit; selling takes it out.`,
      inOutfits: (a: string, b: string) => `It's in your ${a} and ${b} outfits; selling takes it out of both.`,
      takenOut: (outfit: string) => `Taken out of your ${outfit} outfit`,
      takenOutBoth: (a: string, b: string) => `Taken out of your ${a} and ${b} outfits`,
    },
    // ----- The Dossier (screens §6, §6.3) ---------------------------------------------------------
    dossier: {
      title: 'The Dossier',
      tab: 'Dossier',
      header: (used: number, cap: number, fresh: number, stale: number, files: number) =>
        `${used} of ${cap} · ${fresh} fresh · ${stale} stale · ${files} Case ${files === 1 ? 'File' : 'Files'}`,
      full: 'Full · sell or use something before the next entry',
      chips: { names: 'Names', files: 'Case Files', informants: 'Informants' },
      nameLine: (n: number, weight: string) => `${n} ${n === 1 ? 'entry' : 'entries'} · ${weight} toward a Case File`,
      category: {
        political: 'Political',
        criminal: 'Criminal',
        pattern: 'Pattern',
        asset: 'Asset',
        neutral: 'The small stuff',
      } as Record<'political' | 'criminal' | 'pattern' | 'asset' | 'neutral', string>,
      entryLine: (source: string, weekday: string) => `${source} · ${weekday} · fresh`,
      stale: 'stale',
      andMore: (n: number) => `and ${n} more`,
      makeCaseFile: 'Make a Case File',
      makeCaseFileN: (n: number) => `Make a Case File · ${n} ${n === 1 ? 'entry' : 'entries'}`,
      /** A burned name's line (§21.1 Q19): entries still land; no exposé for {n} days. */
      burned: (weekday: string, n: number) => `in the paper ${weekday} · nothing new for ${daysN(n)}`,
      takeToPaper: 'Take it to the paper',
      atPress: (press: string, street: string) => `at ${press}, ${street}`,
      atHeraldHouse: 'at Herald House, Old Town',
      whereToPrint: 'At a newspaper: Herald House in the capital, or Gazette House in Ashford',
      sellFile: 'Sell · 200 Iron',
      atAStation: 'at a station',
      recruit: 'Recruit as an informant',
      needsPattern: 'Needs a pattern line',
      needsAssociate: (patron: string) => `Needs Associate with ${patron}`,
      informantLine: (n: number, weekday: string) => `${daysN(n)} of reports left · next ${weekday}`,
      twoAtMost: 'Two at most',
      /** §21.1 Q17: a file that cannot be printed. */
      notOwnParty: 'Not against your own party',
      notOwnPartyLine: (paper: string, party: string) =>
        `The ${paper} prints nothing against the ${party}'s own. Sell the file at a station, or turn it.`,
      noParty: 'Nobody to print it against',
      noPartyLine: (name: string) => `${name} belongs to no party. Sell the file at a station, or turn it.`,
      /** The knock-on lines (design §4.2, §4.3). */
      knockEntry: (name: string, category: string, weekday: string) =>
        `Dossier: an entry on ${name} · ${category} · goes stale ${weekday}`,
      knockFull: 'Dossier full · an entry went begging',
      knockFile: (name: string, kinds: string) => `Dossier: Case File on ${name} · ${kinds}`,
      knockSlots: (used: number, cap: number) => `Dossier ${used} of ${cap}`,
      /** The station's card (screens §6.3). */
      station: {
        kicker: 'The man by the left-luggage',
        line: 'Buys what you know. A Case File 200, a fresh entry 50, a stale one 25. Nobody prints it.',
        sell: 'Sell something from the Dossier',
        nothing: 'Nothing in the Dossier to sell',
        sellRow: (n: number) => `Sell · ${n} Iron`,
      },
      /** The paper's rows. */
      paper: {
        fromInformant: 'From your informant',
        gossip: (patron: string, name: string) => `From ${patron}: a word about ${name}`,
        desk: (n: number, m: number, when: string) =>
          `${n} ${n === 1 ? 'entry' : 'entries'} · ${m} ${m === 1 ? 'goes' : 'go'} stale ${when}`,
        deskNone: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,
      },
      /** The tab's empty states (screens §15). */
      empty: {
        names: 'Nothing yet. Listen at a bar, read the notices, watch a platform: one time in ten, a name goes in here.',
        filesEarly: 'Three entries on one name make a Case File. From Level 16.',
        files: 'No Case File yet. Three fresh entries on one name make one.',
        informants: 'No informant yet. Turn a Case File with a pattern line, in a town whose patron counts you an Associate.',
      },
      /** A Case File chosen for a story or attached to an event (it waits there). */
      inUse: 'In a story or an event · it waits there',
      /** The station sheet's one-line confirm (screens §6.3). */
      sellConfirm: (what: string, n: number) => `Sell ${what} for ${n} Iron?`,
      fileRow: (name: string) => `Case File · ${name}`,
      /** Lane Q: an entry's source, in plain words (the EntryRow's Courier line; for the designer to tune). */
      sources: {
        intelligence: 'Listening',
        surveillance: 'Watching',
        theft: 'Lifted papers',
        informer: "A rival's informer",
        cells: 'In the cells',
        ward: 'On the ward',
        society: 'A society call',
        gossip: "A patron's word",
        informant: 'Your informant',
        chapter: 'A chapter',
        morgue: 'The morgue file',
        test: 'A test',
      } as Record<string, string>,
      entryStale: (source: string, weekday: string) => `${source} · ${weekday} · stale`,
      atPlace: (place: string) => `at ${place}`,
      keepIt: 'Keep it',
    },
    // ----- The exposé (screens §7; design §4.5, §16.6) --------------------------------------------
    expose: {
      ticket: 'Take a Case File to the paper · 20 Energy',
      tag: 'Exposé · one a day',
      noFile: 'No Case File with something to print',
      printedToday: 'Printed today; tomorrow',
      notWhileWanted: "Not while you're Wanted · the doorman has the list",
      kicker: (paper: string, n: number) => `Exposé · ${paper} · step ${n} of 3`,
      step1: 'The file and the angle',
      lines: (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`,
      /**
       * Phase C ruling (design §25 #4): the outcome decides the page (a Success is the front page
       * on either angle), the angle decides the split and the difficulty. Neither hint names a page.
       */
      plainly: 'The facts, plainly',
      plainlyHint: "Every line checked, nothing added. What they lose goes to the undecided; none to your party's name.",
      headline: 'The story, with a headline',
      headlineHint: "Your party's name under it: half of what they lose comes to you. A point harder.",
      step2: "The editor's desk",
      ways: {
        straight: 'Write it straight',
        talk: 'Talk the editor into it',
        legwork: 'Legwork: check every line twice',
      },
      cta: 'Take it to the editor · 20 Energy',
      stamps: { success: 'Printed', partial: 'Page three', failure: 'Spiked' } as Record<'success' | 'partial' | 'failure', string>,
      fileSpent: 'Case File spent',
      fileKept: 'Case File kept · the editor wants more',
      inTomorrows: (name: string) => `${name} is in tomorrow's paper`,
      opinion: (city: string, party: string, n: string) => `Opinion in ${city}: ${party} −${n}`,
      /** The outcome texts by angle (design §16.6). */
      text: {
        plainly: {
          success: (party: string) => ({
            headline: 'Page one, every line',
            body: `Every line checked, every line printed, no adjectives. The ${party}'s office rings the editor at nine. The editor says it's all true, which it is.`,
          }),
          partial: (party: string) => ({
            headline: 'Three of five lines',
            body: `Three lines survive the lawyer and run on page three. The ${party} calls it gossip. Two of the five are still true.`,
          }),
          failure: () => ({
            headline: 'Spiked',
            body: "The editor wants a second source on the second line and won't run the rest without it. The file goes back in your coat.",
          }),
        },
        headline: {
          success: (party: string, subject: string) => ({
            headline: 'Page one',
            body: `The front page, your name under the headline, ${subject}'s face from the morgue. By noon the ${party}'s office has issued a denial that repeats the story.`,
          }),
          partial: (party: string) => ({
            headline: 'Page three, with a headline',
            body: `A headline on page three and your name under it. The editor says page one wanted one more line. The ${party} says nothing at all.`,
          }),
          failure: () => ({
            headline: 'Spiked',
            body: 'The editor reads it twice and says the front page is for things that stand up. The file goes back in your coat; so does the headline.',
          }),
        },
      },
      /** The Headline Story's call sheet row (design §4.3). */
      attachFile: 'Attach a Case File',
      attached: (name: string) => `${name}'s file attached · the swing half again · the name in the headline`,
      /** Lane Q (screens §7): step 2's text, the editor unnamed (the paper is the place). */
      deskNarrative: `The editor reads the first line and the last. "Who's your second source?" You have the file, the morning, and three ways to answer.`,
      /** Step 1's text. */
      fileNarrative: 'A desk by the window, the morning edition still warm. Which file, and how loud?',
      attachNone: 'No file on the other party',
      attachClear: 'No file',
      /** The paper's public line (tech design §11.1) and the front page's kicker. */
      frontKicker: 'Exposé',
    },
    // ----- Patrons (screens §8) -------------------------------------------------------------------
    patron: {
      kicker: (name: string) => `Patron · ${name}`,
      line: (tier: string, n: number, nextTier: string, next: number) => `${tier} · Favour ${n} · ${nextTier} at ${next}`,
      lineTop: (tier: string, n: number) => `${tier} · Favour ${n}`,
      tiers: {
        none: 'A stranger',
        acquaintance: 'Acquaintance',
        associate: 'Associate',
        confidant: 'Confidant',
        protege: 'Protégé',
      } as Record<'none' | 'acquaintance' | 'associate' | 'confidant' | 'protege', string>,
      gift: 'Gift · 200 Iron',
      givenToday: 'Given today',
      by: (weekday: string) => `by ${weekday}`,
      progress: (a: number, b: number) => `${a} of ${b}`,
      plantHeadline: 'Plant a headline · 25 Political Capital',
      discretion: "The bank's discretion · 20 Political Capital",
      calledIn: (weekday: string) => `Called in · again from ${weekday}`,
      perks: {
        acquaintance: "Acquaintance: gossip in Monday's paper",
        associate: 'Associate: an introduction and informants',
        confidant: 'Confidant at 60: a favour once a week',
        protegeCrane: 'Protégé at 90: an endorsement and the pen',
        protegeMarr: 'Protégé at 90: an endorsement and the case',
      },
      firstVisit: 'A letter comes the morning after next.',
      meKicker: 'Patrons',
      meEmpty: 'Patrons · from Level 10, in the capital and on the lake',
      meLine: (patron: string, tier: string, n: number) => `${patron} · ${tier} · ${n}`,
      nextAt: (next: string, n: number) => `${next} at ${n}`,
      /** The paper (screens §8.3, §12). */
      from: (patron: string) => `From ${patron}`,
      requestTag: (weekday: string) => `by ${weekday} · Favour +6`,
      thanks: (patron: string) => `${patron}'s thanks`,
      deskLine: (crane: string, marr: string) => `Crane: ${crane} · Marr: ${marr}`,
      /** The society call's tag (§21.1 Q9). */
      callTag: (patron: string) => `no Party XP · +2 Favour with ${patron}`,
      favourKnock: (patron: string, a: number, b: number) => `Favour with ${patron} ${a} → ${b}`,
      /** Tech design §10.3: a Request advanced (*Crane's letter: 1 of 2*). */
      letterKnock: (surname: string, a: number, b: number) => `${surname}'s letter: ${a} of ${b}`,
    },
    // ----- Where you sleep (screens §9) ------------------------------------------------------------
    home: {
      kicker: 'Where you sleep',
      room: 'a rented room · +10 Rested a night',
      flatOffer: (city: string) => `A flat in ${city} · 2,500 Iron`,
      flatFromLevel: 'A flat from Level 10',
      flatGives: (city: string) => `+25 Rested a night · Rested cap +50 · a third outfit, Evening · +2 Charisma in ${city}`,
      flatTerms: '2,500 Iron, then 150 a week. If the rent runs out the flat waits; nothing is taken.',
      buy: 'Buy · 2,500 Iron',
      buyConfirm: (city: string) => `Buy the flat in ${city} for 2,500 Iron?`,
      flatLine: (city: string, weekday: string) => `a flat in ${city} · paid until ${weekday}`,
      payWeek: 'Pay a week · 150',
      payFour: 'Pay four weeks · 600',
      /** §21.1 Q4: at most eight weeks ahead. */
      paidAhead: 'Paid eight weeks ahead',
      waits: 'Your flat waits · pay a week to sleep there',
      elsewhere: (city: string, place: string) => `A flat in ${city} · you live in ${place} · its comforts wait for you there`,
      /** The paper's desk rows. */
      deskFlat: (city: string, weekday: string) => `A flat in ${city} · paid until ${weekday}`,
      deskRoom: 'A rented room',
      deskWaits: (city: string) => `A flat in ${city} · the rent is out`,
    },
    // ----- Legacy (screens §10) -------------------------------------------------------------------
    legacy: {
      kicker: 'Legacy · your record in the republic',
      legacy: (n: number) => `Legacy ${n}`,
      toSpend: (n: number) => `${n} to spend`,
      total: (n: number, toSpend: number) => `Legacy ${n} · ${toSpend} to spend`,
      perksKicker: 'Lasting perks',
      take: (n: number) => `Take it · ${n} Legacy`,
      needs: (n: number) => `Needs ${n} Legacy`,
      taken: 'Taken ✓',
      takenOf: (a: number, b: number) => `Taken ${a} of ${b}`,
      empty: "Nothing on the record yet. A council term, a hero's title or an exposé goes here, for good.",
      /** The entries' words (design §7.1), by kind. */
      entries: {
        hero: (place: string) => `Hero of ${place}`,
        councilTerm: (city: string) => `A council term completed in ${city}`,
        issueTop: (issue: string) => `${issue} resolved with you in its top five`,
        pledge: (law: string) => `A pledged law passed: ${law}`,
        governorTerm: (city: string) => `A term as Governor of ${city}`,
        mayorTerm: (city: string) => `A term as Mayor of ${city}`,
        deputyTerm: 'A term as a deputy',
        chairTerm: (faction: string) => `A term as Chair of the ${faction}`,
        presidentTerm: 'A term as President of the Republic',
        survivedChair: 'Survived a vote on the Chair',
        survivedRemoval: 'Survived a vote to remove the President',
        ambition: (title: string) => `${title}: completed`,
        expose: (subject: string) => `An exposé printed: ${subject}`,
        protege: (patron: string) => `Protégé of ${patron}`,
        unrestPrize: (city: string) => `${city} out of Unrest with you in the lead`,
      },
      /** The eight perks: the name and the line (design §7.2). */
      perks: {
        fxp: { name: 'A fifth more from the party', line: '+5 % Party XP on every action and mission' },
        dossier: { name: 'A bigger Dossier', line: 'One more entry in the Dossier · twice at most' },
        sleep: { name: "A better night's sleep", line: 'Rested banks 50 higher' },
        walk: { name: 'A shorter walk', line: 'Talking to voters costs one Energy less' },
        name: { name: 'A name they know', line: 'One more vote in every home count · three times at most' },
        bonus: { name: 'A bonus at the end of the week', line: "An extra day's pay every Monday" },
        friends: { name: 'A friend of friends', line: 'Every Favour you earn, a tenth more' },
        station: { name: 'A quiet word at the station', line: 'Heat cools a tenth faster' },
      } as Record<
        'fxp' | 'dossier' | 'sleep' | 'walk' | 'name' | 'bonus' | 'friends' | 'station',
        { name: string; line: string }
      >,
      /** The paper's desk row and the profile. */
      deskLine: (n: number, toSpend: number) => `Legacy ${n} · ${toSpend} to spend`,
      profile: (n: number) => `Legacy ${n}`,
    },
    // ----- The desk's clocks (design §10.3) --------------------------------------------------------
    ahead: {
      kicker: 'Ahead',
      chapter: (n: number, weekday: string) => `Chapter ${n} from ${weekday}`,
      patronTier: (patron: string, tier: string, n: number) => `${patron}: ${tier} at ${n}`,
      rent: (weekday: string) => `Rent due ${weekday}`,
      fileShort: (name: string) => `${name}: one entry short of a Case File`,
      minderLast: (name: string, weekday: string) => `${name}'s last day ${weekday}`,
    },
    /** Lane Q (design §10.3): the desk's life rows' labels. */
    desk: {
      dossier: 'Dossier',
      patrons: 'Patrons',
      sleep: 'Where you sleep',
      legacy: 'Legacy',
    },
    // ----- Rival ground, the journey and society calls (screens §13, §14) --------------------------
    recognition: {
      changeIntoPlain: 'Change into plain clothes',
      plainOnArrival: 'Plain clothes on arrival ✓',
      youAreInPlain: "You're in plain clothes",
      warning: (city: string) => `In this coat you'll be recognised in ${city}`,
      plateKicker: (city: string) => `${city} · rival ground · recognised here`,
      ticketRecognised: 'Recognised · run-ins likelier',
      ticketPlain: 'Plain clothes · unnoticed',
      showPapers: (papers: string) => `Show your papers · ${papers}`,
      showForged: 'Show your papers · forged papers',
      /** `{office}` reads *visitor* for a player with none (§21.4). */
      visitor: 'visitor',
    },
    society: {
      label: 'Mission · Society',
      needs: (n: number, door: number) => `needs Charisma ${n} · the door is at ${door}`,
      favourTag: (patron: string) => `+2 Favour with ${patron}`,
      call: 'Call · 15 Energy',
      notDressed: (door: number) => `Not dressed for it · needs Charisma ${door} at the door · a good coat would do it`,
      notWhileWanted: "Not while you're Wanted · the doorman has the list",
      theFront: 'The Front',
      frontOpen: 'The promenade, the casino and the lido: the money side of town',
      /** The morgue file's name picker (§21.1 Q12). */
      pickName: 'Whose envelope?',
    },
    // ----- The result modals (design §11; body ≤ 240) ---------------------------------------------
    stamps: {
      bought: 'Bought',
      sold: 'Sold',
      caseFile: 'Bound',
      informant: 'Turned',
      gift: 'Given',
      patronFavour: 'Called in',
      flatBought: 'Yours',
      rentPaid: 'Paid',
      markBought: 'Struck off',
      perk: 'Lasting',
      dossierSold: 'Sold',
    },
    modals: {
      bought: (item: string, flavour: string, effectLine: string) => ({
        headline: item,
        body: `${flavour}. ${effectLine}. It's in your wardrobe; wear it from the Me tab or now.`,
      }),
      sold: (item: string) => ({
        headline: item,
        body: 'The stallholder counts it out without looking up.',
      }),
      caseFile: (subject: string, n: number, kinds: string) => ({
        headline: `A Case File on ${subject}`,
        body: `${n} ${n === 1 ? 'entry' : 'entries'} bound into one file: ${kinds}. It won't go stale. Take it to a paper, sell it at a station, or turn it.`,
      }),
      dossierSold: () => ({
        headline: 'A word by the left-luggage',
        body: 'He reads it, folds it, pays. Nobody will ever know it was yours.',
      }),
      informant: (city: string, subject: string) => ({
        headline: `An informant in ${city}`,
        body: `${subject}'s file bought you a pair of ears. A report every second morning for fourteen days, in the Letters.`,
      }),
      gift: (patron: string, giftLine: string) => ({
        headline: `A gift for ${patron}`,
        body: giftLine,
      }),
      /** The gift's lines by patron (the body). */
      giftLines: {
        crane: 'A bottle for the proprietor and a word about the Rows. She takes the bottle and the word, and says nothing about either, which is how the Herald says thank you.',
        marr: "The bank's regards, returned with a box of the Pier Hotel's cigars. He opens it, takes one, and asks after your town's licence. The bank remembers.",
      },
      patronFavour: {
        plantHeadline: () => ({
          headline: 'A headline planted',
          body: "Crane takes the line and puts it on page one, above the fold, where the Issue is argued. Fifty points to the party's side of it, under your name.",
        }),
        discretion: () => ({
          headline: "The bank's discretion",
          body: 'Marr makes a telephone call and your name comes out of a book. Heat gone, and the back room at half price for a week. The bank does not say which book.',
        }),
      },
      flatBought: (city: string, flatLine: string, until: string) => ({
        headline: `A flat in ${city}`,
        body: `${flatLine}. Rent 150 a week, paid until ${until}. Evening is a third outfit now.`,
      }),
      /** The flat's line (`{flatLine}`), by city feel. */
      flatLine: 'One room, a wardrobe, a window over the tram wires and a gas ring that works',
      rentPaid: (until: string) => ({
        headline: `Rent until ${until}`,
        body: 'The landlady writes it in the book.',
      }),
      markBought: (n: number) => ({
        headline: 'One mark fewer',
        body: `The man in the back room has a friend at the station. The oldest mark on your record is gone. ${n} left.`,
      }),
      perk: (perk: string, perkLine: string) => ({
        headline: perk,
        body: `${perkLine}. It's yours for good.`,
      }),
    },
    knock: {
      iron: (n: number) => `−${n.toLocaleString('en-GB')} Iron`,
      ironGained: (n: number) => `+${n.toLocaleString('en-GB')} Iron`,
      favour: (a: number, b: number) => `Favour ${a} → ${b}`,
      pc: (n: number) => `−${n} Political Capital · once a week`,
      rested: 'Rested +25 a night · Rested cap +50',
      legacy: (cost: number, toSpend: number) => `−${cost} Legacy · ${toSpend} to spend`,
      legacyGained: (n: number) => `Legacy +${n}`,
      pcGained: (n: number) => `+${n} Political Capital`,
      fileSpent: 'Case File spent',
      twoInformants: '2 informants at most',
      untilWeekday: (weekday: string) => `until ${weekday}`,
    },
    // ----- Refusals, worded (the server decides) --------------------------------------------------
    errors: {
      changeLocked: "Change when you're out: not in the cells, the infirmary or on a train.",
      notOwned: "That isn't yours.",
      notWearable: "That isn't worn; it's kept.",
      coatRequired: 'A coat stays on. Choose another instead.',
      outfitLocked: 'Evening is a set while the rent is paid. Pay a week, or wear its things one by one.',
      noShop: 'Nothing is sold here.',
      notSoldHere: "This shop doesn't sell that.",
      membersOnly: "Members only: the party store sells to the party's own.",
      level: (n: number) => `From Level ${n}.`,
      rank: (rank3: string) => `${rank3}s and above.`,
      alreadyOwned: 'You own one already; the shop sells one of each.',
      notEnoughIron: 'Not enough Iron.',
      notSellable: {
        keepsake: 'A keepsake is never sold.',
        kit: "The party's kit is never sold.",
        worn: 'Take it off first.',
        noPrice: 'Nobody buys that.',
      },
      inStory: "It's in a story you haven't finished.",
      bribedToday: 'One a day; the back room has done its favour for today.',
      noMarks: 'Your record is clean.',
      noFile: 'No Case File on that name.',
      fileHeld: 'A name has one Case File at a time.',
      tooFew: "Not three entries' worth yet.",
      notFresh: 'That entry has gone already.',
      notAtStation: 'The man by the left-luggage is at a station: Central Station, the Goods Yard or Clearwater Station.',
      noPattern: 'An informant needs a pattern line in the file.',
      needsAssociate: (patron: string) => `Associate with ${patron} first.`,
      twoInformants: 'Two informants at most. Wait for one to run out.',
      burned: (n: number) => `That name is in the paper already; nothing new for ${daysN(n)}.`,
      ownParty: 'Not against your own party.',
      noParty: 'Nobody to print it against.',
      printedToday: 'Printed today; tomorrow.',
      notAtPress: 'An exposé is written at a newspaper: Herald House or Gazette House.',
      noPatronHere: 'No patron receives here.',
      giftGiven: 'Given today; again tomorrow.',
      favourNotReady: (weekday: string) => `Once a week: again from ${weekday}.`,
      notConfidant: 'A Confidant can ask that. Not yet.',
      notResidence: 'A flat is bought where you live: go home first.',
      hasFlat: 'One flat in the republic, for now.',
      rentAhead: 'Paid eight weeks ahead already.',
      perkTaken: 'Taken already.',
      perkFull: "That perk's levels are all taken.",
      notEnoughLegacy: (n: number) => `Needs ${n} Legacy.`,
      notDressed: (door: number) => `Not dressed for it: Charisma ${door} at the door.`,
      wanted: "Not while you're Wanted.",
      onceADay: 'Once a day here; tomorrow.',
      /** Lane Q: Crane's headline needs a live Issue. */
      notAnIssue: 'That Issue is settled; choose one still open.',
    },
    // ----- Someone to walk with you (design §24.2; screens §18.1–§18.3) ---------------------------
    minder: {
      kicker: 'Someone to walk with you',
      said: { doorman: 'a doorman', steward: 'a steward', minder: 'a minder' } as Record<'doorman' | 'steward' | 'minder', string>,
      saidCap: { doorman: 'A doorman', steward: 'A steward', minder: 'A minder' } as Record<'doorman' | 'steward' | 'minder', string>,
      aWeek: (n: number) => `${n.toLocaleString('en-GB')} a week`,
      row: (said: string, n: number) => `${said} · ${n.toLocaleString('en-GB')} a week`,
      stepsInFirst: 'Steps in first at a run-in · his strength',
      stepsInLine: (odds: string) => `Steps in first at a run-in · his strength: ${odds}`,
      /**
       * Phase C ruling (design §25 #1): the three odds words stand (GDD §8.4); a row whose chance
       * sits at the formula's ceiling (95, §20.1) adds this tag, so the minder's *Good odds* reads
       * apart from the steward's. *Steps in first at a run-in · his strength: Good odds · as good as odds get*.
       */
      asGoodAsTheyGet: 'as good as odds get',
      /** §24.8 #7: the card's figure is a mission's. */
      against: 'against a street enforcer, on a mission at home',
      hire: (n: number) => `Hire · ${n.toLocaleString('en-GB')} Iron`,
      hireConfirm: (name: string, n: number) => `Hire ${name} for a week, ${n.toLocaleString('en-GB')} Iron?`,
      hireButton: 'Hire',
      withYouUntil: (name: string, weekday: string) => `${name} is with you until ${weekday}`,
      fromLevel: (n: number) => `From Level ${n}`,
      fromRank3: 'From Rank 3',
      /** The Me tab's row (screens §18.2). */
      meKicker: 'Walking with you',
      meLine: (name: string, said: string, weekday: string) => `${name}, ${said} · until ${weekday}`,
      anotherWeek: (n: number) => `Another week · ${n.toLocaleString('en-GB')}`,
      fourWeeks: (n: number) => `Four weeks · ${n.toLocaleString('en-GB')}`,
      paidAhead: 'Paid four weeks ahead',
      nobody: 'Nobody · a doorman from the party store, 400 a week',
      /** The run-in sheet's row (screens §18.3). */
      stepsIn: (name: string) => `${name} steps in`,
      hisStrength: 'his strength',
      notAgainstPolice: 'Not against the police',
      pushedAside: (name: string) => `${name} was pushed aside`,
      lastDay: (name: string, weekday: string) => `${name}'s last day ${weekday}`,
      /** The modals (design §24.2). */
      stamps: { hired: 'Hired', renewed: 'Paid', gotAway: 'Got away' },
      hired: (name: string) => ({
        headline: `${name} walks with you`,
        body: "A week, paid. He meets you at the door and goes where you go. In a run-in he steps in first; if they push past him, it's you.",
      }),
      renewed: (name: string, weekday: string) => ({
        headline: `${name} · another week`,
        body: `He nods and says nothing. Until ${weekday}.`,
      }),
      gotAwayKnock: '+10 XP · got away',
      /** The desk's row. */
      deskLine: (name: string, said: string, weekday: string) => `${name}, ${said} · until ${weekday}`,
      deskLast: (name: string) => `${name} · last day · another week on the party store's card`,
      errors: {
        hasOne: (name: string, weekday: string) => `${name} is with you until ${weekday}. A different man when the week is up.`,
        notMember: "Members only: the party store's card.",
        paidAhead: 'Paid four weeks ahead already.',
        notAgainstPolice: 'He never argues with the police.',
      },
    },
    // ----- The bar and the dining room (design §24.3; screens §18.4–§18.5) -----------------------
    bar: {
      kicker: (place: string) => `The bar · ${place}`,
      diningKicker: (hotel: string) => `The dining room · ${hotel}`,
      round: 'Buy a round',
      roundLine: 'In good spirits: a tenth more XP on your next three missions',
      roundPrice: '30 Iron · 2 Energy',
      plate: 'A plate of something',
      plateLine: 'Well fed: a tenth more XP for four hours, and some Health back',
      platePrice: '100 Iron · 2 Energy',
      dinner: 'Dinner',
      dinnerLine: 'Well fed, properly: a tenth more XP and a tenth more Iron for six hours; Health back',
      dinnerPrice: '400 Iron · 2 Energy · needs Charisma 10',
      needsCharisma: 'needs Charisma 10',
      notDressed: 'Not dressed for the dining room · needs Charisma 10',
      buy: (n: number) => `Buy · ${n} Iron`,
      threeADay: 'Three rounds a day · more tomorrow',
      wellFedUntil: (time: string) => `Well fed until ${time}`,
      nineInHand: 'Nine missions in hand already',
      /** The Me tab's line under the stats (screens §18.5). */
      meLine: (time: string | null, missions: number | null) =>
        [time ? `Well fed until ${time}` : null, missions !== null ? `In good spirits, ${missions} ${missions === 1 ? 'mission' : 'missions'}` : null]
          .filter(Boolean)
          .join(' · '),
      /** The receipt's lines. */
      receipt: {
        wellFedXp: 'Well fed · +10 % XP',
        wellFedIron: 'Well fed · +10 % Iron',
        spirits: (n: number) => `In good spirits · +10 % XP · ${n} left`,
      },
      stamps: { round: 'Your round', meal: 'Fed', dinner: 'Fed' },
      modals: {
        round: () => ({
          headline: 'A round for the bar',
          body: "The barman lines them up and the bar remembers your name for an hour. You're in good spirits.",
        }),
        meal: () => ({
          headline: 'A plate of something hot',
          body: 'Dumplings, gravy, and bread to mop it. The day looks better from here.',
        }),
        dinner: (hotel: string) => ({
          headline: `Dinner at ${hotel}`,
          body: "A white tablecloth, a waiter who has seen everything, and the Front's prices. Worth it, tonight.",
        }),
      },
      knock: {
        spirits: 'In good spirits · your next 3 missions',
        wellFed: (time: string) => `Well fed until ${time}`,
        wellFedProperly: (time: string) => `Well fed, properly, until ${time}`,
        health: (n: number) => `Health +${n}`,
        energy: '−2 Energy',
      },
      errors: {
        threeADay: 'Three rounds a day; more tomorrow.',
        nineInHand: 'Nine missions in hand already.',
        wellFed: (time: string) => `Well fed until ${time}: one meal at a time, the better one.`,
        notDressed: 'Not dressed for the dining room: Charisma 10.',
        notABar: 'The bar is at a bar.',
        noDining: 'The dining room is at a hotel.',
      },
    },
    // ----- Help notes (design §16.7, §24; the review-1 pattern: [kicker, note]) -------------------
    help: {
      charisma: () => [
        'Charisma',
        "What you wear. Your coat, what's on you and a flat in town add up to it. It opens society doors and gets you recognised on rival ground.",
      ],
      wardrobe: () => [
        'The Wardrobe',
        'Four things you wear: Coat, On you, Papers, Tools. Two outfits, Town and Plain clothes, one tap to change. Shops are cards on the places that sell things.',
      ],
      plainClothes: () => [
        'Plain clothes',
        'Charisma under 10. On rival ground nobody looks twice at work clothes; an office or a famous name still carries, half as far.',
      ],
      dossier: () => [
        'The Dossier',
        "What you know about the republic's named people. Entries come from watching and listening; they go stale in a week and count half after. Three on one name make a Case File.",
      ],
      caseFile: () => [
        'A Case File',
        "Three entries' worth on one name, bound. Take it to a newspaper for an exposé, sell it at a station, or turn it into an informant with a patron's help.",
      ],
      favour: () => [
        'Favour',
        'How much a patron thinks of you, 0 to 100. Requests, gifts and society calls raise it; nothing lowers it. Acquaintance at 10, Associate 30, Confidant 60, Protégé 90.',
      ],
      legacy: () => [
        'Legacy',
        'Your record in the republic: terms, titles, exposés, a completed Ambition. Public and permanent. Points buy small lasting perks and are never lost.',
      ],
      home: () => [
        'Where you sleep',
        'A rented room gives +10 Rested a night. A flat gives +25, a bigger Rested cap, a third outfit and +2 Charisma in its town, for 150 a week. If the rent runs out the flat waits.',
      ],
      society: () => [
        'A society call',
        "A mission that needs Charisma: the door is ten under the figure, and the figure is the difficulty. It pays Favour with the town's patron and sometimes a Dossier entry.",
      ],
      bodyguard: () => [
        'Someone to walk with you',
        'A week at a time, paid in advance. In a run-in he steps in first, with his own odds; if they push past him the fight is yours. He never argues with the police. When the week is up he goes; nothing else changes.',
      ],
      wellFed: () => [
        'Well fed',
        'A plate at a bar or dinner at a hotel: a tenth more XP for a few hours, and some Health back, up to full. One meal counts at a time, the better one.',
      ],
      goodSpirits: () => [
        'In good spirits',
        'A round at the bar: a tenth more XP on your next three missions. Three rounds a day, nine missions in hand at most.',
      ],
    },
  },
} as const;

export type Copy = typeof copy;
