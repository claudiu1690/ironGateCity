import { dayKey } from '@irongate/rules';
import type { DayKey } from '@irongate/rules';
import { formatShare } from './funnel';
import { dayLabel } from './risk';

/**
 * The slice-6 playtest report (tech design §15.2, design §16 Q9): "does doing it together bring
 * players back?" Pure maths over rows read from `campaignEvents`, `eventSignups`, `stays`,
 * `chatMessages`, `chatReports`, `characters` and `actionLogs`. **Test members** (the hooks'
 * characters, `userId` starting `test:`) and **boosted testers** are left out of every count; an
 * event they filled still counts as an event, but their sign-ups do not.
 *
 * What the rows do not hold, and how the section handles it:
 * - **Activity** on a City Day is any action log, sign-up or chat line that day (the read path's
 *   presence keeps only the last time seen).
 * - **Chat** lines expire after seven days (TTL), so lines per member per day cover the last week.
 * - **Nudges** are the `nudge` system lines (also seven days); one *led to a sign-up* when the asked
 *   member signed up to that event after the line.
 */

export const TEST_MEMBER_PREFIX = 'test:';

export interface TogetherCharacterRow {
  id: string;
  userId: string;
  createdAt: Date;
  rank: number;
  boosted: boolean;
  chatSeenAt: Date | null;
  mutes: number;
}
export interface TogetherEventRow {
  id: string;
  kind: 'member' | 'fixture';
  typeId: string;
  day: DayKey;
  status: 'open' | 'resolved' | 'calledOff';
  roles: Array<{ roleId: string; filled: boolean }>;
  hands: number;
  band: string | null;
  calledBy: string | null;
}
export interface TogetherSignupRow {
  eventId: string;
  characterId: string;
  slot: string;
  caller: boolean;
  day: DayKey;
  signedAt: Date;
  status: 'committed' | 'withdrawn' | 'resolved';
  orderBonus: boolean;
  pc: number;
}
export interface TogetherStayRow {
  bailPostedBy: { characterId: string; iron: number } | null;
  visits: Array<{ characterId: string; counted: boolean }>;
}
export interface TogetherChatRow {
  kind: 'member' | 'system';
  characterId: string | null;
  at: Date;
  systemKind: string | null;
  to: string | null;
  eventId: string | null;
}
export interface TogetherInput {
  now: Date;
  characters: TogetherCharacterRow[];
  events: TogetherEventRow[];
  signups: TogetherSignupRow[];
  stays: TogetherStayRow[];
  chat: TogetherChatRow[];
  reports: number;
  /** Action logs: who acted on which City Day. */
  activity: Array<{ characterId: string; at: Date }>;
}

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const share = (a: number, b: number): number | null => (b > 0 ? round(a / b, 3) : null);
const count = <K>(m: Map<K, number>, k: K, n = 1) => m.set(k, (m.get(k) ?? 0) + n);

export function buildTogetherReport(i: TogetherInput) {
  const testers = new Set(
    i.characters.filter((c) => !c.userId.startsWith(TEST_MEMBER_PREFIX) && !c.boosted).map((c) => c.id),
  );
  const who = new Map(i.characters.map((c) => [c.id, c]));
  const signups = i.signups.filter((s) => testers.has(s.characterId));
  const today = dayKey(i.now.getTime());

  // Activity per City Day (action logs, sign-ups, chat lines).
  const active = new Map<DayKey, Set<string>>();
  const mark = (id: string, at: Date) => {
    if (!testers.has(id)) return;
    const d = dayKey(at.getTime());
    if (!active.has(d)) active.set(d, new Set());
    active.get(d)!.add(id);
  };
  for (const a of i.activity) mark(a.characterId, a.at);
  for (const s of signups) mark(s.characterId, s.signedAt);
  for (const l of i.chat) if (l.kind === 'member' && l.characterId) mark(l.characterId, l.at);

  // Events: called per day by members and by the secretary; outcomes; called off.
  const byDay = new Map<DayKey, { member: number; fixture: number; calledOff: number; bands: Map<string, number> }>();
  for (const e of i.events) {
    const d = byDay.get(e.day) ?? { member: 0, fixture: 0, calledOff: 0, bands: new Map() };
    if (e.kind === 'member') d.member += 1;
    else d.fixture += 1;
    if (e.status === 'calledOff') d.calledOff += 1;
    if (e.band) count(d.bands, e.band);
    byDay.set(e.day, d);
  }
  const done = i.events.filter((e) => e.status !== 'open');
  // The fill rate per role (of events that started), and of member-called events.
  const roleFill = new Map<string, { started: number; filled: number }>();
  for (const e of done)
    for (const r of e.roles) {
      const k = `${e.typeId.replace(/^event\./, '')} · ${r.roleId}`;
      const x = roleFill.get(k) ?? { started: 0, filled: 0 };
      x.started += 1;
      if (r.filled) x.filled += 1;
      roleFill.set(k, x);
    }
  const memberDone = done.filter((e) => e.kind === 'member');
  const memberRoles = memberDone.reduce((n, e) => n + e.roles.length, 0);
  const memberFilled = memberDone.reduce((n, e) => n + e.roles.filter((r) => r.filled).length, 0);

  // Hands: per event, by Rank, and from accounts under three days old (Appendix C #57).
  const hands = signups.filter((s) => s.slot === 'hand');
  const handsByRank = new Map<number, number>();
  let youngHands = 0;
  for (const h of hands) {
    const c = who.get(h.characterId);
    if (!c) continue;
    count(handsByRank, c.rank);
    if (h.signedAt.getTime() - c.createdAt.getTime() < 3 * 86_400_000) youngHands += 1;
  }

  // Sign-ups per member per day; withdrawals (and those whose tap completed the event order).
  const signupDays = new Map<string, Set<DayKey>>();
  for (const s of signups) {
    const set = signupDays.get(s.characterId) ?? new Set();
    set.add(s.day);
    signupDays.set(s.characterId, set);
  }
  const withdrawn = signups.filter((s) => s.status === 'withdrawn');
  const memberDays = [...active.values()].reduce((n, s) => n + s.size, 0);

  // D7 players who joined an event (GDD §27 ≥ 40 %): testers whose account is 7+ days old.
  const d7 = [...testers].filter((id) => i.now.getTime() - who.get(id)!.createdAt.getTime() >= 7 * 86_400_000);
  const joined = new Set(signups.map((s) => s.characterId));

  // The return rate (the slice's question): active the City Day after a day with a sign-up, against
  // active the day after a day without one.
  let withN = 0;
  let withBack = 0;
  let withoutN = 0;
  let withoutBack = 0;
  for (const [d, ids] of active) {
    if (d >= today) continue;
    const next = active.get((d + 1) as DayKey) ?? new Set<string>();
    for (const id of ids) {
      const signed = signupDays.get(id)?.has(d) ?? false;
      if (signed) {
        withN += 1;
        if (next.has(id)) withBack += 1;
      } else {
        withoutN += 1;
        if (next.has(id)) withoutBack += 1;
      }
    }
  }

  // Political Capital from events per member per day (Appendix C #59).
  const pc = signups.reduce((n, s) => n + s.pc, 0);

  // Chat.
  const lines = i.chat.filter((l) => l.kind === 'member' && l.characterId && testers.has(l.characterId));
  const chatDays = new Set(lines.map((l) => `${l.characterId}:${dayKey(l.at.getTime())}`)).size;
  const never = [...testers].filter((id) => !who.get(id)!.chatSeenAt).length;
  const mutes = [...testers].reduce((n, id) => n + (who.get(id)!.mutes ?? 0), 0);

  // Favours and nudges.
  const bails = i.stays.filter((s) => s.bailPostedBy && testers.has(s.bailPostedBy.characterId));
  const visits = i.stays.flatMap((s) => s.visits).filter((v) => testers.has(v.characterId));
  const nudges = i.chat.filter((l) => l.systemKind === 'nudge' && l.to);
  const nudgeLed = nudges.filter((n) =>
    i.signups.some((s) => s.eventId === n.eventId && s.characterId === n.to && s.signedAt >= n.at),
  ).length;

  return {
    testers: testers.size,
    events: {
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => a - b)
        .map(([d, x]) => ({
          day: dayLabel(d),
          'by members': x.member,
          'the branch': x.fixture,
          'called off': x.calledOff,
          triumph: x.bands.get('triumph') ?? 0,
          success: x.bands.get('success') ?? 0,
          mixed: x.bands.get('mixed') ?? 0,
          fiasco: x.bands.get('fiasco') ?? 0,
        })),
      roleFill: [...roleFill.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([role, x]) => ({ role, started: x.started, filled: x.filled, rate: share(x.filled, x.started) })),
      memberFill: share(memberFilled, memberRoles),
      handsPerEvent: share(hands.length, done.length),
      handsByRank: [...handsByRank.entries()].sort(([a], [b]) => a - b).map(([rank, n]) => ({ rank, hands: n })),
      handsYoungAccounts: share(youngHands, hands.length),
    },
    signups: {
      perMemberDay: share(signups.length, memberDays),
      withdrawals: withdrawn.length,
      withdrawnAfterOrder: withdrawn.filter((s) => s.orderBonus).length,
      d7Players: d7.length,
      d7Joined: share(d7.filter((id) => joined.has(id)).length, d7.length),
    },
    returnRate: {
      afterSignup: share(withBack, withN),
      afterSignupDays: withN,
      without: share(withoutBack, withoutN),
      withoutDays: withoutN,
    },
    pcPerMemberDay: share(pc, memberDays),
    chat: {
      linesPerMemberDay: share(lines.length, chatDays),
      neverOpened: share(never, testers.size),
      reports: i.reports,
      mutes,
    },
    favours: {
      bails: bails.length,
      bailIron: bails.reduce((n, s) => n + s.bailPostedBy!.iron, 0),
      visits: visits.filter((v) => v.counted).length,
      grapes: visits.filter((v) => !v.counted).length,
      nudges: nudges.length,
      nudgesLedToSignup: nudgeLed,
    },
  };
}

export type TogetherReport = ReturnType<typeof buildTogetherReport>;

/** The section's tables, for the console. */
export function togetherTables(r: TogetherReport): Array<{ title: string; rows: object[] }> {
  return [
    { title: 'Events called per day (members and the branch) and their outcomes', rows: r.events.byDay },
    {
      title: 'Fill rate per role (events that started; empty roles went to volunteers)',
      rows: r.events.roleFill.map((x) => ({ ...x, rate: formatShare(x.rate) })),
    },
    {
      title: 'Hands',
      rows: [
        {
          'member-called events filled': formatShare(r.events.memberFill),
          'hands per event': r.events.handsPerEvent,
          'hands from accounts under 3 days': formatShare(r.events.handsYoungAccounts),
        },
        ...r.events.handsByRank.map((h) => ({ rank: h.rank, hands: h.hands })),
      ],
    },
    {
      title: 'Sign-ups',
      rows: [
        {
          'per member per active day': r.signups.perMemberDay,
          withdrawals: r.signups.withdrawals,
          'withdrawn after the order counted': r.signups.withdrawnAfterOrder,
          'D7 players': r.signups.d7Players,
          'D7 who joined an event (target ≥ 40 %)': formatShare(r.signups.d7Joined),
        },
      ],
    },
    {
      title: 'Back the next City Day (the slice question)',
      rows: [
        { after: 'a day with a sign-up', back: formatShare(r.returnRate.afterSignup), days: r.returnRate.afterSignupDays },
        { after: 'a day without', back: formatShare(r.returnRate.without), days: r.returnRate.withoutDays },
      ],
    },
    { title: 'Political Capital from events', rows: [{ 'per member per active day': r.pcPerMemberDay }] },
    {
      title: 'Chat (lines kept seven days)',
      rows: [
        {
          'lines per member per chatting day': r.chat.linesPerMemberDay,
          'never opened chat': formatShare(r.chat.neverOpened),
          reports: r.chat.reports,
          mutes: r.chat.mutes,
        },
      ],
    },
    {
      title: 'Favours and asks',
      rows: [
        {
          'bails posted': r.favours.bails,
          'bail Iron': r.favours.bailIron,
          visits: r.favours.visits,
          'grapes only': r.favours.grapes,
          'asks to join': r.favours.nudges,
          'asks that led to a sign-up': r.favours.nudgesLedToSignup,
        },
      ],
    },
  ];
}
