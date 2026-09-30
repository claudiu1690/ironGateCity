import type { ContentInput } from '../schemas';

type OrdinanceInput = ContentInput['ordinances'][number];

/**
 * The ten home-city ordinances (docs/design/slice-3-politics.md §10.1, GDD §15.3; ADR 0021). Each
 * lasts five City Days, one in force per city. `effectLine` is the caps line on the order paper
 * and the menu (the UI adds "· 5 days"); the bold effect of the design's table, shortened.
 */
export const ordinances: OrdinanceInput[] = [
  {
    id: 'ord.public-works',
    name: 'Public Works Order',
    line: 'The council puts the town to work: every wage in the city goes up.',
    effectLine: 'Job pay +10 %',
    effects: [{ kind: 'jobPayPct', value: 10 }],
  },
  {
    // Review 1 (answers §1.2): was the Shift Hours Order; still the Collective's motion.
    id: 'ord.long-service',
    name: 'Long Service Order',
    line: 'The council backs long service: every day at the job counts double towards the rate.',
    effectLine: 'Seniority ×2',
    effects: [{ kind: 'seniorityDays', value: 2 }],
  },
  {
    id: 'ord.street-permits',
    name: 'Street Permits',
    line: 'Flyers and posters go up without a permit for the week.',
    effectLine: 'Posters and flyers: opinion +15 %',
    effects: [{ kind: 'swingPct', actionType: 'propaganda', value: 15 }],
  },
  {
    id: 'ord.rally-permits',
    name: 'Rally Permits',
    line: 'Speeches licensed on every corner; no one moves you on.',
    effectLine: 'Speeches −2 Energy',
    effects: [{ kind: 'energyDelta', actionType: 'speech', value: -2 }],
  },
  {
    id: 'ord.reading-room',
    name: 'Reading Room Grant',
    line: 'The reading rooms open late and free.',
    effectLine: 'Training Energy −20 %',
    effects: [{ kind: 'trainingEnergyPct', value: -20 }],
  },
  {
    id: 'ord.rest-day',
    name: 'Rest Day Order',
    line: 'A day of rest by council rule: the town sleeps in.',
    effectLine: 'Rested cap +50',
    effects: [{ kind: 'restedCapDelta', value: 50 }],
  },
  {
    id: 'ord.open-doors',
    name: 'Open Doors',
    line: 'The council asks every household to open the door to party callers.',
    effectLine: 'Talking to voters: better odds',
    effects: [{ kind: 'chancePct', actionType: 'canvass', value: 4 }],
  },
  {
    id: 'ord.street-register',
    name: 'Street Register',
    line: 'Every street keeps a register: a name once known stays known.',
    effectLine: 'Reputation: every win counts twice',
    effects: [{ kind: 'standingMultiplier', value: 2 }],
  },
  {
    id: 'ord.street-fund',
    name: 'Street Fund',
    line: 'A street fund pays party callers by the door, raised from the wage packet.',
    effectLine: 'Iron from actions +25 % · job pay −25 %',
    effects: [
      { kind: 'ironPct', scope: 'checked', value: 25 },
      { kind: 'jobPayPct', value: -25 },
    ],
  },
  {
    id: 'ord.public-meetings',
    name: 'Public Meetings Order',
    line: "A week of public meetings: the party's work counts for more.",
    effectLine: 'Party XP +25 % on actions',
    effects: [{ kind: 'fxpPct', scope: 'actions', value: 25 }],
  },
];
