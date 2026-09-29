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
    `Chapter ${n}, "${title}": from ${from}${needs ? `, at ${needs}` : ''}`,
  chapterNeeds: (needs: { rank?: number; level?: number }) =>
    [
      needs.rank !== undefined ? `Rank ${needs.rank}` : null,
      needs.level !== undefined ? `Level ${needs.level}` : null,
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
  chapterWaitsUntil: (from: string, needs: string | null) => `From ${from}${needs ? `, at ${needs}` : ''}`,
  backToThePaper: 'Back to the paper',
} as const;

export type Copy = typeof copy;
