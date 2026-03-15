'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TopBar }             from '../../components/layout/TopBar';
import { NavigationSidebar } from '../../components/layout/NavigationSidebar';
import { useWorldSocket, usePlayerSocket } from '../../hooks/useSocket';
import { useCharacterStore } from '../../store/characterStore';
import { getToken }          from '../../lib/token';
import { api }               from '../../lib/api';
import type { Character }    from '../../types';

function GameShell({ children }: { children: React.ReactNode }) {
  useWorldSocket();
  usePlayerSocket();

  const setCharacter = useCharacterStore((s) => s.setCharacter);
  const setEnergy    = useCharacterStore((s) => s.setEnergy);
  const setHealth    = useCharacterStore((s) => s.setHealth);
  const character    = useCharacterStore((s) => s.character);

  const { data: charData, isLoading, isError } = useQuery({
    queryKey: ['character', 'me'],
    queryFn:  () => api.get<Character>('/character/me'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: energyData } = useQuery({
    queryKey: ['character', 'energy'],
    queryFn:  () => api.get<{ current: number; max: number }>('/character/me/energy'),
    staleTime: 55_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (charData) {
      setCharacter(charData);
      setHealth(charData.currentHealth, charData.maxHealth);
    }
  }, [charData, setCharacter, setHealth]);

  useEffect(() => {
    if (energyData) setEnergy(energyData.current, energyData.max);
  }, [energyData, setEnergy]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-iron-950">
        <div className="text-center space-y-2">
          <div className="text-iron-600 font-mono text-xs tracking-[0.4em] uppercase">Irongate City</div>
          <div className="text-iron-500 font-mono text-sm animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-iron-950">
        <div className="text-red-400 font-mono text-sm">Failed to load. Please refresh.</div>
      </div>
    );
  }

  const faction = character?.faction ?? undefined;

  return (
    <div className="min-h-screen bg-iron-950" data-faction={faction}>
      {/* Fixed top bar — h-14 */}
      <TopBar />

      {/* Sidebar — fixed, starts below TopBar (top-14), width w-56 */}
      <NavigationSidebar />

      {/* Main content — offset left by sidebar (ml-56) and below TopBar (pt-14) */}
      <main className="ml-56 pt-14 min-h-screen">
        <div className="px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/auth/login');
  }, [router]);

  if (typeof window !== 'undefined' && !getToken()) return null;

  return <GameShell>{children}</GameShell>;
}
