import type { ContentInput } from '../schemas';

/**
 * Slice 4: the nation map (docs/design/slice-4-battleground.md §2.1–§2.3, §6.7, §19 Q14). The
 * positions are the survey pins of `mapPins.nation` and every `arrival` is the city's survey station
 * pin (content tests). Journey times are third class from the capital (§2.2, decided 2 Oct 2026);
 * an outer city to another is the two legs added. The frame is the five pins' box grown by 0.06.
 */
export const nation: ContentInput['nation'] = {
  map: { day: 'map.nation.day', night: 'map.nation.night' },
  capitalId: 'irongate',
  frame: { x0: 0.06, y0: 0.11, x1: 0.94, y1: 0.91 },
  clouds: true,
  cities: [
    {
      cityId: 'irongate',
      name: 'Irongate',
      x: 0.52,
      y: 0.53,
      minutes: 0,
      service: 'open',
      // The server appends the live tail: "· two close races today" / "· one close race today" / "· contested".
      line: 'Capital · 5 districts',
      arrival: { x: 0.35, y: 0.555 },
    },
    {
      cityId: 'ashford',
      name: 'Ashford',
      x: 0.12,
      y: 0.17,
      minutes: 12,
      service: 'open',
      line: 'Home city of the Alliance',
      arrival: { x: 0.82, y: 0.08 },
    },
    {
      cityId: 'duskwall',
      name: 'Duskwall',
      x: 0.88,
      y: 0.25,
      minutes: 15,
      service: 'open',
      line: 'Home city of the Vanguard',
      arrival: { x: 0.2, y: 0.73 },
    },
    {
      cityId: 'coalport',
      name: 'Coalport',
      x: 0.18,
      y: 0.8,
      minutes: 12,
      service: 'open',
      line: 'Home city of the Collective',
      arrival: { x: 0.46, y: 0.62 },
    },
    {
      cityId: 'clearwater',
      name: 'Clearwater',
      x: 0.88,
      y: 0.85,
      minutes: 25,
      service: 'later',
      line: 'Contested · no service yet',
      arrival: { x: 0.8, y: 0.5 },
      // §14.11, design §6.7: shown on its card; no city document until slice 7.
      baselineOpinion: { vanguard: 20, collective: 24, alliance: 24, neutral: 32 },
    },
  ],
};
