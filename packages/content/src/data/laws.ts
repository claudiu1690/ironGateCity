import type { ContentInput } from '../schemas';

type LawInput = NonNullable<ContentInput['laws']>[number];

/**
 * Slice 7: the law catalogue, thirteen (docs/design/slice-7-nation.md §7.2, GDD §15.8; ADR 0044).
 * Every law is a bounded modifier on numbers that exist; the bound is the value (the catalogue is
 * closed, as the council rules). `appliesTo` other than `all` makes a law factional (36 of 60; the
 * loader computes it). `secretaryLines` is each party's default vote (design §4.3, §7.3): what the
 * local deputies do when neither a player majority nor the Chair's line leads them. No law touches
 * Party XP or the odds of a check (design §5.4). `effectLine` is the caps line on the ticket and in
 * the law book, as a council rule's. Written cold (content policy §7): the Vanguard's laws say what
 * they do and nothing says they are right.
 */
export const laws: LawInput[] = [
  // ----- The Collective's ---------------------------------------------------------------------
  {
    id: 'law.peoples-education',
    name: "People's Education Act",
    factionId: 'collective',
    line: 'Night schools and reading rooms paid for by the republic: every lesson learned on a mission counts for more.',
    effectLine: 'XP from missions +15 %',
    effects: [{ kind: 'xpPct', scope: 'missions', value: 15 }],
    days: 14,
    secretaryLines: { vanguard: 'against', collective: 'for', alliance: 'for' },
  },
  {
    id: 'law.eight-hour-day',
    name: 'Eight-Hour Day Act',
    factionId: 'collective',
    line: 'Eight hours by law, and long service counted double, in every works in the republic.',
    effectLine: 'Job pay +10 % · seniority ×2',
    effects: [
      { kind: 'jobPayPct', value: 10 },
      { kind: 'seniorityDays', value: 2 },
    ],
    days: 14,
    secretaryLines: { vanguard: 'against', collective: 'for', alliance: 'free' },
  },
  {
    id: 'law.universal-care',
    name: 'Universal Care Act',
    factionId: 'collective',
    line: 'The infirmaries treat first and bill after: walking out well costs half.',
    effectLine: 'Walk out well: half price',
    effects: [{ kind: 'infirmaryCostPct', value: -50 }],
    days: 21,
    secretaryLines: { vanguard: 'against', collective: 'for', alliance: 'for' },
  },
  {
    id: 'law.workers-charter',
    name: "Workers' Charter",
    factionId: 'collective',
    line: 'A charter for the organised: Collective members draw more at every wage packet in the republic.',
    effectLine: 'Job pay +15 % for Collective members',
    effects: [{ kind: 'jobPayPct', value: 15, appliesTo: 'members' }],
    days: 14,
    secretaryLines: { vanguard: 'against', collective: 'for', alliance: 'against' },
  },
  // ----- The Alliance's -----------------------------------------------------------------------
  {
    id: 'law.free-market',
    name: 'Free Market Charter',
    factionId: 'alliance',
    line: 'Licences by rule and prices by the market: every Iron earned on the street is worth a tenth more.',
    effectLine: 'Iron from actions and missions +10 %',
    effects: [{ kind: 'ironPct', scope: 'checked', value: 10 }],
    days: 28,
    secretaryLines: { vanguard: 'free', collective: 'against', alliance: 'for' },
  },
  {
    id: 'law.open-borders',
    name: 'Open Borders Act',
    factionId: 'alliance',
    line: 'The lines run through and the barriers stand up: every journey a quarter shorter.',
    effectLine: 'Journeys a quarter shorter',
    effects: [{ kind: 'journeyTimePct', value: -25 }],
    days: 14,
    secretaryLines: { vanguard: 'against', collective: 'free', alliance: 'for' },
  },
  {
    id: 'law.press-licensing',
    name: 'Press Licensing Act',
    factionId: 'alliance',
    line: 'Posters and flyers need a licence from the courts: unlicensed paper moves opinion a quarter less.',
    effectLine: 'Posters and flyers: opinion −25 %',
    effects: [{ kind: 'swingPct', actionType: 'propaganda', value: -25 }],
    days: 7,
    secretaryLines: { vanguard: 'free', collective: 'against', alliance: 'for' },
  },
  {
    id: 'law.rehabilitation',
    name: 'Rehabilitation Act',
    factionId: 'alliance',
    line: 'A record is not a life: minor marks fade in a week, and bail is a quarter less.',
    effectLine: 'Minor marks fade in 7 days · bail −25 %',
    effects: [
      { kind: 'markFadeDays', value: 7 },
      { kind: 'bailPct', value: -25 },
    ],
    days: 21,
    secretaryLines: { vanguard: 'against', collective: 'for', alliance: 'for' },
  },
  {
    id: 'law.civic-education',
    name: 'Civic Education Act',
    factionId: 'alliance',
    line: "The Alliance's reading rooms open to its members at the republic's expense: training costs them a fifth less.",
    effectLine: 'Training Energy −20 % for Alliance members',
    effects: [{ kind: 'trainingEnergyPct', value: -20, appliesTo: 'members' }],
    days: 14,
    secretaryLines: { vanguard: 'against', collective: 'against', alliance: 'for' },
  },
  // ----- The Vanguard's (written cold) --------------------------------------------------------
  {
    id: 'law.emergency-permits',
    name: 'Emergency Permits Act',
    factionId: 'vanguard',
    line: 'Anyone not of the Vanguard needs a permit for party work: every mission costs them two Energy more.',
    effectLine: 'Missions +2 Energy for everyone not of the Vanguard',
    effects: [{ kind: 'missionEnergyDelta', value: 2, appliesTo: 'others' }],
    days: 14,
    secretaryLines: { vanguard: 'for', collective: 'against', alliance: 'against' },
  },
  {
    id: 'law.curfew',
    name: 'Curfew Order',
    factionId: 'vanguard',
    line: 'The streets clear at dusk: a run-in after dark is twice as likely, for everyone.',
    effectLine: 'Run-ins ×2 at night',
    effects: [{ kind: 'runInPct', window: 'night', value: 100 }],
    days: 7,
    secretaryLines: { vanguard: 'for', collective: 'against', alliance: 'against' },
  },
  {
    id: 'law.special-powers',
    name: 'Special Powers Act',
    factionId: 'vanguard',
    // Design §7.2's line ran to 146 and its effect line to 62; trimmed to the schema's 120 and 60.
    line: "The police look away for the Vanguard: members' Heat cools half again as fast, and anyone caught against it is held.",
    effectLine: 'Heat cools +50 % for members · caught +10 against it',
    effects: [
      { kind: 'heatCoolPct', value: 50, appliesTo: 'members' },
      { kind: 'caughtDelta', scope: 'againstFaction', value: 10, appliesTo: 'others' },
    ],
    days: 7,
    secretaryLines: { vanguard: 'for', collective: 'against', alliance: 'against' },
  },
  {
    id: 'law.public-assembly',
    name: 'Public Assembly Act',
    factionId: 'vanguard',
    line: 'A permit for every corner, issued to all: speeches cost two Energy less in every city.',
    effectLine: 'Speeches −2 Energy',
    effects: [{ kind: 'energyDelta', actionType: 'speech', value: -2 }],
    days: 14,
    secretaryLines: { vanguard: 'for', collective: 'for', alliance: 'free' },
  },
];
