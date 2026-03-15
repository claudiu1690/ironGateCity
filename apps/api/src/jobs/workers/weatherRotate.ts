/**
 * weather:rotate — runs every 24 hours (2am UTC)
 *
 * 1. Determine current season (cycles every 30 game-days based on WeatherState count)
 * 2. Roll new weather based on season probability table
 * 3. Create WeatherState record
 * 4. Emit weather:change to /world namespace
 */

import { Season, Weather } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { broadcastWeather } from '../../socket/index.js';

const SEASONS: Season[] = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
const GAME_DAYS_PER_SEASON = 30;

/** Weighted probability table — weights are relative (sum need not be 100) */
const WEATHER_TABLE: Record<Season, { weather: Weather; weight: number }[]> = {
  [Season.SPRING]: [
    { weather: Weather.CLEAR,      weight: 40 },
    { weather: Weather.RAIN,       weight: 35 },
    { weather: Weather.FOG,        weight: 15 },
    { weather: Weather.FROST,      weight: 10 },
  ],
  [Season.SUMMER]: [
    { weather: Weather.CLEAR,      weight: 50 },
    { weather: Weather.RAIN,       weight: 20 },
    { weather: Weather.FOG,        weight: 5  },
    { weather: Weather.HEAT_WAVE,  weight: 20 },
    { weather: Weather.FROST,      weight: 5  },
  ],
  [Season.AUTUMN]: [
    { weather: Weather.CLEAR,      weight: 30 },
    { weather: Weather.RAIN,       weight: 40 },
    { weather: Weather.FOG,        weight: 20 },
    { weather: Weather.SNOW,       weight: 5  },
    { weather: Weather.FROST,      weight: 5  },
  ],
  [Season.WINTER]: [
    { weather: Weather.CLEAR,      weight: 20 },
    { weather: Weather.RAIN,       weight: 15 },
    { weather: Weather.FOG,        weight: 15 },
    { weather: Weather.SNOW,       weight: 35 },
    { weather: Weather.FROST,      weight: 15 },
  ],
};

const EFFECT_DESCRIPTIONS: Record<Weather, string> = {
  [Weather.CLEAR]:     'Clear skies across Irongate — ideal conditions for outdoor operations.',
  [Weather.RAIN]:      'Heavy rain disrupts street activities. Propaganda campaigns less effective.',
  [Weather.FOG]:       'Dense fog limits visibility — surveillance is more difficult.',
  [Weather.SNOW]:      'Snow blankets the city — travel costs are doubled.',
  [Weather.HEAT_WAVE]: 'Oppressive heat slows movement — energy regeneration reduced.',
  [Weather.FROST]:     'Freezing frost closes civic buildings. Democrat venues limited.',
};

function pickWeather(season: Season): Weather {
  const options = WEATHER_TABLE[season];
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option.weather;
  }
  return options[0].weather;
}

export async function runWeatherRotate(): Promise<void> {
  // Season advances every GAME_DAYS_PER_SEASON records
  const dayCount = await prisma.weatherState.count();
  const seasonIndex = Math.floor(dayCount / GAME_DAYS_PER_SEASON) % SEASONS.length;
  const season = SEASONS[seasonIndex];

  const weather = pickWeather(season);
  const effectDescription = EFFECT_DESCRIPTIONS[weather];

  await prisma.weatherState.create({ data: { season, weather } });

  broadcastWeather({ season, weather, effectDescription });

  console.log(`[weather:rotate] New weather: ${weather} (${season}) — ${effectDescription}`);
}
