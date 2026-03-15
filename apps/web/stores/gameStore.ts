'use client';

import { create } from 'zustand';

interface EnergyState {
  current: number;
  max: number;
  lastTickAt: string;
}

interface GameState {
  energy: EnergyState | null;
  currentCitySlug: string | null;
  faction: 'FASCIST' | 'COMMUNIST' | 'DEMOCRAT' | null;

  setEnergy: (energy: EnergyState) => void;
  setCurrentCity: (slug: string) => void;
  setFaction: (faction: GameState['faction']) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  energy: null,
  currentCitySlug: null,
  faction: null,

  setEnergy: (energy) => set({ energy }),
  setCurrentCity: (slug) => set({ currentCitySlug: slug }),
  setFaction: (faction) => set({ faction }),
  reset: () => set({ energy: null, currentCitySlug: null, faction: null }),
}));
