import { create } from 'zustand';
import type { Character } from '../types';

interface Buff {
  id: string;
  label: string;
  expiresAt: number;
}

interface CharacterStore {
  character: Character | null;
  energy: number;
  maxEnergy: number;
  health: number;
  maxHealth: number;
  activeBuffs: Buff[];
  setCharacter: (c: Character) => void;
  setEnergy: (current: number, max?: number) => void;
  setHealth: (current: number, max?: number) => void;
  addBuff: (buff: Buff) => void;
  removeBuff: (id: string) => void;
  reset: () => void;
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  character:  null,
  energy:     0,
  maxEnergy:  100,
  health:     100,
  maxHealth:  100,
  activeBuffs: [],

  setCharacter: (c) =>
    set({
      // Normalise factionRank → rank for convenience (API returns factionRank)
      character: { ...c, rank: c.factionRank },
      health:    c.currentHealth,
      maxHealth: c.maxHealth,
    }),

  setEnergy: (current, max) =>
    set((s) => ({ energy: current, maxEnergy: max ?? s.maxEnergy })),

  setHealth: (current, max) =>
    set((s) => ({ health: current, maxHealth: max ?? s.maxHealth })),

  addBuff: (buff) =>
    set((s) => ({ activeBuffs: [...s.activeBuffs.filter((b) => b.id !== buff.id), buff] })),

  removeBuff: (id) =>
    set((s) => ({ activeBuffs: s.activeBuffs.filter((b) => b.id !== id) })),

  reset: () => set({ character: null, energy: 0, health: 100, activeBuffs: [] }),
}));
