import type { ContentInput } from '../schemas';

type OrdinanceInput = ContentInput['ordinances'][number];

/**
 * The ten home-city ordinances (docs/design/slice-3-politics.md §10.1, GDD §15.3; ADR 0021). Each
 * lasts five City Days, one in force per city. `effectLine` is the caps line on the order paper
 * and the menu (the UI adds "· 5 days"); the bold effect of the design's table, shortened. Review 4
 * (answers §11.3): `plainLine`, the effect in plain words on the city plate and at the Town Hall.
 */
export const ordinances: OrdinanceInput[] = [
  {
    id: 'ord.public-works',
    name: 'Public Works Order',
    line: 'The council puts the town to work: every wage in the city goes up.',
    effectLine: 'Job pay +10 %',
    plainLine: 'jobs pay a tenth more',
    effects: [{ kind: 'jobPayPct', value: 10 }],
  },
  {
    // Review 1 (answers §1.2): was the Shift Hours Order; still the Collective's motion.
    id: 'ord.long-service',
    name: 'Long Service Order',
    line: 'The council backs long service: every day at the job counts double towards the rate.',
    effectLine: 'Seniority ×2',
    plainLine: 'every day at the job counts double',
    effects: [{ kind: 'seniorityDays', value: 2 }],
  },
  {
    id: 'ord.street-permits',
    name: 'Street Permits',
    line: 'Flyers and posters go up without a permit for the week.',
    effectLine: 'Posters and flyers: opinion +15 %',
    plainLine: 'posters move opinion more',
    effects: [{ kind: 'swingPct', actionType: 'propaganda', value: 15 }],
  },
  {
    id: 'ord.rally-permits',
    name: 'Rally Permits',
    line: 'Speeches licensed on every corner; no one moves you on.',
    effectLine: 'Speeches −2 Energy',
    plainLine: 'speeches cost 2 Energy less',
    effects: [{ kind: 'energyDelta', actionType: 'speech', value: -2 }],
  },
  {
    id: 'ord.reading-room',
    name: 'Reading Room Grant',
    line: 'The reading rooms open late and free.',
    effectLine: 'Training Energy −20 %',
    plainLine: 'studying costs a fifth less',
    effects: [{ kind: 'trainingEnergyPct', value: -20 }],
  },
  {
    id: 'ord.rest-day',
    name: 'Rest Day Order',
    line: 'A day of rest by council rule: the town sleeps in.',
    effectLine: 'Rested cap +50',
    plainLine: 'Rested banks to 250',
    effects: [{ kind: 'restedCapDelta', value: 50 }],
  },
  {
    id: 'ord.open-doors',
    name: 'Open Doors',
    line: 'The council asks every household to open the door to party callers.',
    effectLine: 'Talking to voters: better odds',
    plainLine: 'talking to voters comes off more often',
    effects: [{ kind: 'chancePct', actionType: 'canvass', value: 4 }],
  },
  {
    id: 'ord.street-register',
    name: 'Street Register',
    line: 'Every street keeps a register: a name once known stays known.',
    effectLine: 'Reputation: every win counts twice',
    plainLine: 'every win counts twice for your reputation',
    effects: [{ kind: 'standingMultiplier', value: 2 }],
  },
  {
    id: 'ord.street-fund',
    name: 'Street Fund',
    line: 'A street fund pays party callers by the door, raised from the wage packet.',
    effectLine: 'Iron from actions +25 % · job pay −25 %',
    plainLine: 'actions pay a quarter more Iron, jobs a quarter less',
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
    plainLine: 'party work pays a quarter more Party XP',
    effects: [{ kind: 'fxpPct', scope: 'actions', value: 25 }],
  },
  {
    // Slice 4 (docs/design/slice-4-battleground.md §8.5): the eleventh rule, on every menu, the
    // capital's included (tickets from every city exist from slice 4). Never below 5 Iron.
    id: 'ord.tram-subsidy',
    name: 'Tram Subsidy',
    // On every city's menu, so the line and the effect line name no city (design §8.5, 3 Oct 2026).
    line: 'The council pays half of every fare out of town: trains from this city at half price.',
    effectLine: 'Train tickets from this city: half price',
    plainLine: 'trains from here at half price',
    effects: [{ kind: 'ticketPct', value: -50 }],
  },
];
