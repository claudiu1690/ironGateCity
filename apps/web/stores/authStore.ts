'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  characterId: string | null;

  setTokens: (accessToken: string) => void;
  setCharacterId: (id: string) => void;
  setUserId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      characterId: null,

      setTokens: (accessToken) => set({ accessToken }),
      setCharacterId: (id) => set({ characterId: id }),
      setUserId: (id) => set({ userId: id }),
      logout: () => set({ accessToken: null, userId: null, characterId: null }),
    }),
    {
      name: 'irongate-auth',
      // Only persist non-sensitive identifiers; access token lives only in memory in prod
      partialize: (state) => ({
        userId: state.userId,
        characterId: state.characterId,
      }),
    },
  ),
);
