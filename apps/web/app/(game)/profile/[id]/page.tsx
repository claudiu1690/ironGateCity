'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import type { Character } from '../../../../types';

const FACTION_COLOR: Record<string, string> = {
  FASCIST: 'text-fascist', COMMUNIST: 'text-communist', DEMOCRAT: 'text-democrat',
};

const CRIMINAL_LABEL = ['CLEAN', 'KNOWN', 'REPEAT', 'NOTORIOUS'];
const CRIMINAL_BADGE = ['badge-green', 'badge-gold', 'badge-red', 'badge-red'];

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: char, isLoading, isError } = useQuery({
    queryKey: ['character', id],
    queryFn:  () => api.get<Character>(`/character/${id}`),
  });

  if (isLoading) return <div className="text-iron-400 font-mono animate-pulse text-sm">Loading profile...</div>;
  if (isError || !char) return <div className="text-red-400 font-mono text-sm">Character not found.</div>;

  const criminalLevel = Math.min(char.criminalPoints, 3);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-iron-100">Public Profile</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-iron-100">{char.name}</h2>
          {char.faction && (
            <span className={`badge badge-${char.faction.toLowerCase()}`}>{char.faction}</span>
          )}
          {criminalLevel > 0 && (
            <span className={`badge ${CRIMINAL_BADGE[criminalLevel]}`}>{CRIMINAL_LABEL[criminalLevel]}</span>
          )}
          {char.isHospitalised && <span className="badge badge-red">HOSPITALISED</span>}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="stat-row">
            <span className="text-iron-400">Level</span>
            <span className="text-iron-200">{char.level}</span>
          </div>
          <div className="stat-row">
            <span className="text-iron-400">Rank</span>
            <span className="text-iron-200">{char.factionRank}</span>
          </div>
          <div className="stat-row">
            <span className="text-iron-400">Faction</span>
            <span className={FACTION_COLOR[char.faction ?? ''] ?? 'text-iron-400'}>{char.faction ?? '—'}</span>
          </div>
          <div className="stat-row">
            <span className="text-iron-400">Criminal record</span>
            <span className={criminalLevel > 0 ? 'text-red-400' : 'text-green-400'}>
              {CRIMINAL_LABEL[criminalLevel]}
            </span>
          </div>
          <div className="stat-row">
            <span className="text-iron-400">City</span>
            <span className="text-iron-200">{char.currentCity?.name ?? '—'}</span>
          </div>
        </div>

        <div className="divider" />

        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
          {[
            { label: 'STR', value: char.str },
            { label: 'INT', value: char.int },
            { label: 'AGI', value: char.agi },
            { label: 'CHA', value: char.charisma },
          ].map((s) => (
            <div key={s.label} className="card bg-iron-800">
              <div className="text-iron-500">{s.label}</div>
              <div className="text-lg font-bold text-iron-100">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
