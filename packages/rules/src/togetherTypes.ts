/**
 * Slice 6 views and results (docs/tech/slice-6.md §8.3, §10.1). Built by the server; the client and
 * `@irongate/ui` render them. The additions to older views are separate interfaces here, merged into
 * those views by phase B as the server fills them (as slice 5's `CharacterViewV6`).
 */
import type { EventBand } from './events';
import type { MemberStatus, PresenceBand } from './presence';
import type { HeatState } from './heat';
import type {
  AssetView,
  CharacterView,
  CheckStatSpec,
  CheckStats,
  FactionId,
  OpinionShares,
  OrdersView,
  Outcome,
  PlaceTagView,
  PoliticalResult,
  ResultArt,
  RewardLine,
} from './types';

/** The system lines of chat (ADR 0039). */
export type SystemLineKind =
  | 'eventCalled'
  | 'eventResult'
  | 'takenIn'
  | 'admitted'
  | 'bailPosted'
  | 'seatWon'
  | 'heroNamed'
  | 'nudge';
export const SYSTEM_LINE_KINDS = [
  'eventCalled',
  'eventResult',
  'takenIn',
  'admitted',
  'bailPosted',
  'seatWon',
  'heroNamed',
  'nudge',
] as const;

/** Slice 6 additions to the character view (tech §8.3; merged into `CharacterView` by phase B). */
export interface CharacterViewV7 {
  events: {
    open: Array<{
      eventId: string;
      signupId: string;
      name: string;
      venueName: string;
      cityId: string;
      startsAt: number;
      roleName: string;
      energy: number;
      withdrawUntil: number;
    }>;
    unseen: number;
  };
  /** `forYou`: character.me only (an indexed exists). */
  chat: { hidden: boolean; forYou: boolean };
  /** unseen > 0 || forYou. */
  factionDot: boolean;
}

export interface EventPlaceView {
  cityId: string;
  cityName: string;
  districtId: string | null;
  districtName: string | null;
  venueId: string;
  venueName: string;
}

export type EventState = 'open' | 'settling' | 'resolved' | 'calledOff';
export type EventCaller = { kind: 'member'; name: string } | { kind: 'secretary'; name: string };

export interface EventCardView {
  id: string;
  kind: 'member' | 'fixture';
  typeId: string;
  name: string;
  art: AssetView;
  place: EventPlaceView;
  startsAt: number;
  state: EventState;
  filled: number;
  roles: number;
  hands: { k: number; max: 4 };
  calledBy: EventCaller;
  /** Issue +50 %, close race +25 %. */
  tags: PlaceTagView[];
  you: { roleName: string } | null;
  action: 'join' | 'joinHand' | 'yours' | 'full' | 'settling' | 'elsewhere';
}

export type EventCallGateReason =
  | 'RANK'
  | 'HANDS_FULL'
  | 'ONE_AT_A_TIME'
  | 'WHERE'
  | 'HELD'
  | 'IN_TRANSIT'
  | 'RIVAL_GROUND'
  | 'RUN_IN_PENDING'
  | 'PATROL_PENDING';

export type EventCallGateView =
  | { ok: true }
  | {
      ok: false;
      reason: EventCallGateReason;
      rank3Title: string;
      open?: { eventId: string; name: string; startsAt: number };
    };

export interface EventBoardView {
  /** The capital: every district, yours first. */
  here: { cityId: string; cityName: string; districtName: string | null; events: EventCardView[] };
  /** The faction's other cities, action 'elsewhere'. */
  elsewhere: EventCardView[];
  mine: Array<EventCardView & { withdrawUntil: number; canWithdraw: boolean }>;
  results: Array<{
    id: string;
    startsAt: number;
    name: string;
    venueName: string;
    band: EventBand | 'calledOff';
    swing: number;
    members: number;
  }>;
  call: EventCallGateView;
}

export type EventRoleGateReason =
  | 'RANK'
  | 'NOT_ENOUGH_ENERGY'
  | 'ALREADY_ON_EVENT'
  | 'WRONG_CITY'
  | 'TOO_MANY_SIGNUPS'
  | 'HELD'
  | 'IN_TRANSIT'
  | 'PATROL_PENDING';

export interface EventRoleView {
  roleId: string;
  name: string;
  stats: CheckStatSpec;
  energy: number;
  hint: string;
  holder: { characterId: string; name: string; avatarId: string | null; rankTitle: string; you: boolean } | null;
  /** Open roles only; the client words the chance (`oddsBand`), no digit reaches the screen. */
  forYou: { chance: number; stats: CheckStats } | null;
  gate: { reason: EventRoleGateReason; need?: number } | null;
  result: { outcome: Outcome | 'volunteer' } | null;
}

/** Whose ground the venue is, for the client's `groundOf` (slice 4's sash). */
export interface EventGroundView {
  homeFactionId: FactionId | null;
  shares: OpinionShares;
}

export interface EventPageView {
  id: string;
  kind: 'member' | 'fixture';
  typeId: string;
  name: string;
  blurb: string;
  art: ResultArt;
  ground: EventGroundView;
  place: EventPlaceView;
  startsAt: number;
  withdrawUntil: number;
  serverNow: number;
  state: EventState;
  calledBy: EventCaller;
  pays: { opinionUpTo: number; againstFactionId: FactionId | null; pc: [3, 15] };
  tags: PlaceTagView[];
  /** *Fired up · better volunteers* (home only). */
  firedUp: boolean;
  roles: EventRoleView[];
  hands: {
    holders: Array<{ characterId: string; name: string; avatarId: string | null; you: boolean }>;
    max: 4;
    energy: 5;
    gate: { reason: EventRoleGateReason | 'HANDS_FULL'; need?: number } | null;
  };
  mine: {
    signupId: string;
    slot: string;
    roleName: string;
    energy: number;
    canWithdraw: boolean;
    committedFrom: number;
  } | null;
  result: { band: EventBand; swing: number; members: number; volunteers: number } | null;
  /** *See your result*. */
  yourResult: { signupId: string } | null;
  /** You may invite mates (you are on it, an open place exists): *Invite someone*. */
  nudge: boolean;
}

export interface CallSheetView {
  where: { cityId: string; cityName: string; districtId: string | null; districtName: string | null };
  gate: EventCallGateView;
  options: Array<{
    typeId: string;
    name: string;
    blurb: string;
    venueId: string;
    venueName: string;
    roles: EventRoleView[];
    energyOfRoles: number;
    opinionUpTo: number;
    here: boolean;
    goTo: { districtName: string; venueName: string } | null;
    /** Slice 8 (tech design §3.5, §12.1): the Headline Story takes a Case File (*Attach a Case File*). */
    caseFile?: boolean;
  }>;
  times: Array<{ hours: 1 | 3 | 6 | 12; startsAt: number }>;
}

export type FavourView =
  | { kind: 'bail'; iron: number; affordable: boolean }
  | { kind: 'visit'; energy: 3; affordable: boolean; visited: boolean };

export interface MemberRowView {
  characterId: string;
  name: string;
  avatarId: string | null;
  rankTitle: string;
  level: number;
  residence: { cityName: string; districtName: string | null };
  band: PresenceBand;
  status: MemberStatus;
  heroes: string[];
  movedThisWeek: number;
  favour: FavourView | null;
  /**
   * The invite (design §23.2): the soonest of your open events with a place this mate can take; null
   * (the control hidden) when there is none, or they are held. `eventName` is the running name
   * (*rally*), `startsAt` gives the card's time phrase; `asked`: already invited to it.
   */
  ask: { eventId: string; eventName: string; startsAt: number; roleName: string; asked: boolean } | null;
  you: boolean;
}

export interface ProfileView extends MemberRowView {
  memberSince: number;
  standingHere: { level: string } | null;
  muted: boolean;
}

export interface FactionHqView {
  faction: { id: FactionId; name: string };
  rankTitle: string;
  members: number;
  hereNow: number;
  /** With review 4's `off`, shown as on the city plate. */
  orders: OrdersView;
  fixture: EventCardView | null;
}

export interface FactionScoreboardView {
  period: 'week' | 'all';
  cityId: string | null;
  cities: Array<{ id: string; name: string }>;
  brackets: Array<{
    bracket: 1 | 2 | 3;
    rows: Array<{
      characterId: string;
      name: string;
      level: number;
      moved: number;
      events: number;
      heroes: number;
      rosette: boolean;
      you: boolean;
    }>;
  }>;
  you: { bracket: 1 | 2 | 3; rank: number; moved: number; events: number } | null;
}

export interface HereNowView {
  names: Array<{ characterId: string; name: string }>;
  more: number;
  others: number;
  nobody: boolean;
}

export type ChatLineButton =
  | { kind: 'postBail'; iron: number; characterId: string }
  | { kind: 'visit'; characterId: string }
  | { kind: 'join'; eventId: string }
  | { kind: 'seeResult'; eventId: string };

export interface ChatLineView {
  id: string;
  channel: string;
  at: number;
  kind: 'member' | 'system';
  author: { characterId: string; name: string; avatarId: string | null; rank: number } | null;
  text: string | null;
  system: {
    kind: SystemLineKind;
    payload: Record<string, unknown>;
    to: string | null;
    button: ChatLineButton | null;
  } | null;
}

export interface ChatPageView {
  channel: string;
  lines: ChatLineView[];
  more: boolean;
  muted: string[];
  hereNow: number;
}

export interface ChatChannelsView {
  channels: Array<{ id: string; kind: 'party' | 'city' | 'officers'; cityId: string | null; name: string; hereNow: number }>;
  current: string;
}

/** The paper's *Events* row (tech §11.1). */
export interface EventRowView {
  eventId: string;
  name: string;
  /** The event's name in running text (*canvass drive*), the fixture flag, and the roles filled (screens §8). */
  event: string;
  fixture: boolean;
  filled: number;
  roles: number;
  venueName: string;
  startsAt: number;
  calledBy: EventCaller;
  you: { roleName: string } | null;
  /** The welcome edition: *join as a hand · 5 Energy*. */
  joinAsHand: boolean;
}

/** Slice 6 additions to older views (tech §8.3), merged into them by phase B. */
export interface CityViewV6 {
  /** *{n} of the {faction} in town now*. */
  factionHere: number;
}
export interface EventTicketView {
  eventId: string;
  name: string;
  startsAt: number;
  filled: number;
  roles: number;
  you: { roleName: string } | null;
}
export interface LocationViewV6 {
  /** Open events of your faction at this venue. */
  events: EventTicketView[];
}
export interface JourneyViewV6 {
  fellows: number | null;
}
export interface HeldViewV6 {
  visits: Array<{ name: string; at: number }>;
  postedBy: { name: string } | null;
  /** `event`: the running name (*rally*), for *You're the {role} at the {event}, {time}*. */
  signups: Array<{ roleName: string; eventName: string; event: string; startsAt: number }>;
}
export interface OrderViewV6 {
  link?: { kind: 'event'; eventId: string } | { kind: 'board' };
}
export interface PaperViewV6 {
  events: EventRowView[];
  signedUp: Array<{ eventName: string; event: string; venueName: string; startsAt: number; roleName: string }>;
}

/** The event result modal (tech §10.1; `ResultModal kind="event"`), stored as the sign-up's receipt. */
export interface EventResult {
  kind: 'event';
  eventId: string;
  signupId: string;
  typeId: string;
  name: string;
  art: ResultArt;
  ground: EventGroundView;
  stamp: EventBand;
  place: { cityName: string; districtName: string | null; venueName: string };
  startsAt: number;
  headline: string;
  body: string;
  roles: Array<{
    roleId: string;
    name: string;
    holder: { name: string; you: boolean } | null;
    outcome: Outcome | 'volunteer';
    /** Dev and QA only. */
    chance?: number;
    roll?: number;
  }>;
  /** Under your row when not a Success (`stat` names the stat), or the roster's cause on a Fiasco. */
  reason: { kind: 'stat'; stat: string } | { kind: 'volunteers'; k: number } | null;
  hands: string[];
  summary: { cameOff: number; roles: number; volunteers: number };
  rewards: { xp: RewardLine; fxp: RewardLine };
  pc: { amount: number; rate: 'full' | 'half' };
  opinion: {
    factionId: FactionId;
    placeName: string;
    total: number;
    share: number;
    before: number;
    after: number;
    mode: 'persuade' | 'against';
    targetFactionId?: FactionId;
  };
  issues: Array<{ issueId: string; name: string; added: number }>;
  effects: {
    standing: { cityName: string; before: number; after: number; level: string } | null;
    standingUp: boolean;
    heat: { before: number; after: number; stateBefore: HeatState; stateAfter: HeatState } | null;
    levelUp: { from: number; to: number; statPoints: number } | null;
    rankUp: { from: number; to: number; title: string } | null;
    pc: { before: number; after: number } | null;
  };
  next: string | null;
  character: CharacterView;
}

/** `events.current`: the next modal on the gate. */
export type EventCurrentView =
  | { kind: 'result'; result: EventResult }
  | { kind: 'calledOff'; result: PoliticalResult }
  | null;
