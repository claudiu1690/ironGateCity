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
    id: 'ord.shift-hours',
    name: 'Shift Hours Order',
    line: 'Shifts end an hour early, by order of the council, and count double towards the streak.',
    effectLine: 'Job shifts −1 Energy · streak days ×2',
    effects: [
      { kind: 'shiftEnergyDelta', value: -1, floor: 2 },
      { kind: 'shiftStreakDays', value: 2 },
    ],
  },
  {
    id: 'ord.street-permits',
    name: 'Street Permits',
    line: 'Leaflets and posters go up without a permit for the week.',
    effectLine: 'Propaganda opinion swing +15 %',
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
    line: 'A day of rest by ordinance: the town sleeps in.',
    effectLine: 'Rested cap +50',
    effects: [{ kind: 'restedCapDelta', value: 50 }],
  },
  {
    id: 'ord.open-doors',
    name: 'Open Doors',
    line: 'The council asks every household to receive canvassers.',
    effectLine: 'Canvass +4 % success chance',
    effects: [{ kind: 'chancePct', actionType: 'canvass', value: 4 }],
  },
  {
    id: 'ord.ward-register',
    name: 'Ward Register',
    line: 'The wards keep a register: a name once known stays known.',
    effectLine: 'Local Standing: every Success counts two',
    effects: [{ kind: 'standingMultiplier', value: 2 }],
  },
  {
    id: 'ord.ward-fund',
    name: 'Ward Fund',
    line: 'A ward fund pays canvassers by the door, raised from the wage packet.',
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
    effectLine: 'Faction XP +25 % on actions',
    effects: [{ kind: 'fxpPct', scope: 'actions', value: 25 }],
  },
];
