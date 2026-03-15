'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useCharacterStore } from '../../../store/characterStore';
import type { Character, Mission } from '../../../types';

const FACTION_COLOR: Record<string, string> = {
  FASCIST:   'text-fascist',
  COMMUNIST: 'text-communist',
  DEMOCRAT:  'text-democrat',
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card bg-iron-800 text-center py-3">
      <div className="text-[10px] font-mono font-bold tracking-widest text-iron-500 uppercase">{label}</div>
      <div className="text-2xl font-bold text-iron-100 mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const xpForNext = level * 500;
  const progress  = Math.min(100, Math.round((xp / xpForNext) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono text-iron-400">
        <span>XP to Lv{level + 1}</span>
        <span>{xp} / {xpForNext}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill bg-gold" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const character = useCharacterStore((s) => s.character);

  const { data: missions } = useQuery({
    queryKey: ['missions'],
    queryFn:  () => api.get<Mission[]>('/missions'),
  });

  if (!character) return null;

  const eligible = (missions ?? []).filter((m) => m.eligible).slice(0, 3);
  const criminalLabel = ['CLEAN', 'KNOWN', 'REPEAT', 'NOTORIOUS'][Math.min(character.criminalPoints, 3)];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iron-100">{character.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-sm font-mono font-bold ${FACTION_COLOR[character.faction ?? ''] ?? 'text-iron-400'}`}>
              {character.faction ?? 'No faction'}
            </span>
            <span className="text-iron-600">·</span>
            <span className="text-iron-400 text-sm">Rank {character.factionRank}</span>
            <span className="text-iron-600">·</span>
            <span className="text-iron-400 text-sm">Lv{character.level}</span>
            {character.criminalPoints > 0 && (
              <span className="badge badge-red">{criminalLabel}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono text-gold">{character.ironMarks.toLocaleString()}</div>
          <div className="text-xs text-iron-500 font-mono">Iron Marks</div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <p className="section-heading">Statistics</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'STR', value: character.str },
            { label: 'INT', value: character.int },
            { label: 'AGI', value: character.agi },
            { label: 'CHA', value: character.charisma },
          ].map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
        <div className="mt-4">
          <XpBar xp={character.xp} level={character.level} />
        </div>
      </div>

      {/* Location */}
      <div className="card flex items-center justify-between">
        <div>
          <div className="text-xs text-iron-500 font-mono">Current Location</div>
          <div className="text-iron-100 font-semibold mt-1">{character.currentCity?.name ?? '—'}</div>
        </div>
        <Link href="/map" className="btn-ghost text-sm">View Map →</Link>
      </div>

      {/* Quick missions */}
      {eligible.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-heading !mb-0">Available Missions</p>
            <Link href="/missions" className="text-xs text-gold hover:text-gold-light font-mono">
              All missions →
            </Link>
          </div>
          <div className="space-y-2">
            {eligible.map((m) => (
              <div key={m.id} className="card flex items-center justify-between hover:border-iron-500 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-iron-100">{m.title}</div>
                  <div className="text-xs text-iron-400 font-mono mt-0.5">
                    E:{m.energyCost} · {m.xpReward} XP · {m.ironReward} Iron
                  </div>
                </div>
                <Link href="/missions" className="btn-ghost text-xs">Start</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <p className="section-heading">Quick Actions</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/jobs',    label: 'Work Shift',   abbr: 'JOB', desc: 'Earn Iron Marks'   },
            { href: '/bar',     label: 'Visit Bar',    abbr: 'BAR', desc: 'Buffs & Contacts'  },
            { href: '/dossier', label: 'Surveillance', abbr: 'INT', desc: 'Track city actors' },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="card hover:border-iron-500 transition-colors text-center group py-4 space-y-1">
              <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase"
                style={{ color: 'var(--faction-text)' }}>{a.abbr}</div>
              <div className="text-sm font-semibold text-iron-200 group-hover:text-iron-100">{a.label}</div>
              <div className="text-xs text-iron-500">{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
