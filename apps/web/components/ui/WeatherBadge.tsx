'use client';

import { useWorldStore } from '../../store/worldStore';
import type { Weather, Season } from '../../types';

const WEATHER_ICON: Record<Weather, string> = {
  CLEAR:     '☀',
  RAIN:      '🌧',
  FOG:       '🌫',
  SNOW:      '❄',
  HEAT_WAVE: '🔥',
  FROST:     '🧊',
};

const SEASON_ICON: Record<Season, string> = {
  SPRING: '🌱',
  SUMMER: '☀',
  AUTUMN: '🍂',
  WINTER: '❄',
};

export function WeatherBadge() {
  const weather = useWorldStore((s) => s.weather);

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1 text-xs font-mono text-iron-400 bg-iron-800 border border-iron-700 rounded px-2 py-1">
      <span>{SEASON_ICON[weather.season]}</span>
      <span>{WEATHER_ICON[weather.weather]}</span>
      <span className="hidden sm:inline text-iron-500">{weather.weather}</span>
    </div>
  );
}
