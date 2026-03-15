import { create } from 'zustand';
import type { CityInfluence, Law, WeatherState, NewsItem } from '../types';

interface WorldStore {
  cityInfluence: Record<string, CityInfluence>;
  activeLaws: Law[];
  weather: WeatherState | null;
  news: NewsItem[];
  setInfluence: (cityId: string, data: CityInfluence) => void;
  setAllInfluence: (all: Record<string, CityInfluence>) => void;
  addNewsItem: (item: NewsItem) => void;
  setWeather: (w: WeatherState) => void;
  setActiveLaws: (laws: Law[]) => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  cityInfluence: {},
  activeLaws:    [],
  weather:       null,
  news:          [],

  setInfluence: (cityId, data) =>
    set((s) => ({ cityInfluence: { ...s.cityInfluence, [cityId]: data } })),

  setAllInfluence: (all) => set({ cityInfluence: all }),

  addNewsItem: (item) =>
    set((s) => ({
      news: [item, ...s.news].slice(0, 50), // keep last 50 items
    })),

  setWeather: (w) => set({ weather: w }),

  setActiveLaws: (laws) => set({ activeLaws: laws }),
}));
