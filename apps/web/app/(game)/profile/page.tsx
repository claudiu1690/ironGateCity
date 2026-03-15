'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useCharacterStore } from '../../../store/characterStore';
import type { Character, Bodyguard } from '../../../types';

const FACTION_COLOR: Record<string, string> = {
  FASCIST: 'text-fascist', COMMUNIST: 'text-communist', DEMOCRAT: 'text-democrat',
};

const CRIMINAL_TIERS = ['CLEAN', 'KNOWN', 'REPEAT', 'NOTORIOUS'];
const CRIMINAL_BADGE = ['badge-green', 'badge-gold', 'badge-red', 'badge-red'];

const BODYGUARD_TIERS = [
  { tier: 1, label: 'Street Tough',   cost: 50,  dailyCost: 10, str: 15, hp: 80 },
  { tier: 2, label: 'Veteran',        cost: 150, dailyCost: 25, str: 25, hp: 120 },
  { tier: 3, label: 'Elite Enforcer', cost: 400, dailyCost: 60, str: 40, hp: 180 },
];

function StatRadar({ str, int, agi, charisma }: { str: number; int: number; agi: number; charisma: number }) {
  const max   = 100;
  const cx    = 80;
  const cy    = 80;
  const r     = 60;
  const stats = [
    { label: 'STR', value: str,      angle: -90 },
    { label: 'INT', value: int,      angle: 0 },
    { label: 'AGI', value: agi,      angle: 90 },
    { label: 'CHA', value: charisma, angle: 180 },
  ];

  const toXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  });

  const points = stats.map((s) => {
    const norm = (s.value / max) * r;
    return toXY(s.angle, norm);
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const gridPoints = stats.map((s) => toXY(s.angle, r)).map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 160 160" className="w-40 h-40">
      {/* Grid */}
      <polygon points={gridPoints} fill="none" stroke="#35353d" strokeWidth="1" />
      {stats.map((s) => {
        const outer = toXY(s.angle, r);
        return <line key={s.label} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#35353d" strokeWidth="1" />;
      })}
      {/* Values */}
      <polygon points={polyPoints} fill="rgba(212,175,55,0.2)" stroke="#d4af37" strokeWidth="2" />
      {/* Labels */}
      {stats.map((s) => {
        const pos = toXY(s.angle, r + 14);
        return (
          <text key={s.label} x={pos.x} y={pos.y} textAnchor="middle" fill="#9898a8" fontSize="10" fontFamily="monospace">
            {s.label} {s.value}
          </text>
        );
      })}
    </svg>
  );
}

export default function ProfilePage() {
  const qc        = useQueryClient();
  const character = useCharacterStore((s) => s.character);

  const { data: fullChar } = useQuery({
    queryKey: ['character', 'me', 'full'],
    queryFn:  () => api.get<Character>('/character/me'),
  });

  const hire = useMutation({
    mutationFn: (tier: number) => api.post(`/bodyguards/hire/${tier}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['character', 'me', 'full'] }),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/bodyguards/${id}/dismiss`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['character', 'me', 'full'] }),
  });

  const char = fullChar ?? character;
  if (!char) return null;

  const criminalLevel = Math.min(char.criminalPoints, 3);
  const activeGuards  = (char.bodyguards ?? []).filter((bg: Bodyguard) => bg.active);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-iron-100">My Profile</h1>

      {/* Main character card */}
      <div className="card space-y-4">
        <div className="flex items-start gap-6">
          {/* Radar chart */}
          <div className="shrink-0">
            <StatRadar str={char.str} int={char.int} agi={char.agi} charisma={char.charisma} />
          </div>
          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-iron-100">{char.name}</h2>
              <span className={`badge badge-${char.faction?.toLowerCase() ?? 'gray'}`}>{char.faction ?? 'No faction'}</span>
              {criminalLevel > 0 && (
                <span className={`badge ${CRIMINAL_BADGE[criminalLevel]}`}>{CRIMINAL_TIERS[criminalLevel]}</span>
              )}
            </div>
            <div className="flex gap-4 text-sm font-mono text-iron-300">
              <span>Level {char.level}</span>
              <span>·</span>
              <span>Rank {char.factionRank}</span>
              <span>·</span>
              <span>{char.xp} XP</span>
            </div>
            <div className="divider" />
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="stat-row">
                <span className="text-iron-400">Iron Marks</span>
                <span className="text-gold font-bold">⚙ {char.ironMarks}</span>
              </div>
              <div className="stat-row">
                <span className="text-iron-400">Faction XP</span>
                <span className="text-iron-200">{char.fxp}</span>
              </div>
              <div className="stat-row">
                <span className="text-iron-400">HP</span>
                <span className={char.currentHealth < 30 ? 'text-red-400' : 'text-iron-200'}>
                  {char.currentHealth} / {char.maxHealth}
                </span>
              </div>
              <div className="stat-row">
                <span className="text-iron-400">Criminal pts</span>
                <span className={char.criminalPoints > 0 ? 'text-red-400' : 'text-green-400'}>
                  {char.criminalPoints}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipped items */}
      {char.equipment && (
        <div className="card space-y-3">
          <p className="section-heading">Equipped Gear</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['weapon', 'armour', 'utility', 'accessory', 'document'] as const).map((slot) => {
              const item = (char.equipment as Record<string, { name: string } | undefined>)?.[slot];
              return (
                <div key={slot} className="flex items-center gap-2 text-xs">
                  <span className="text-iron-500 w-20 shrink-0 font-mono capitalize">{slot}</span>
                  <span className="text-iron-200">{item?.name ?? <span className="text-iron-700 italic">empty</span>}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bodyguards */}
      <div className="card space-y-4">
        <p className="section-heading">Bodyguards</p>
        {activeGuards.length === 0 ? (
          <p className="text-iron-500 text-sm">No active bodyguards.</p>
        ) : (
          <div className="space-y-2">
            {activeGuards.map((bg: Bodyguard) => (
              <div key={bg.id} className="flex items-center justify-between card bg-iron-800">
                <div>
                  <div className="text-sm font-semibold text-iron-100">{bg.name}</div>
                  <div className="text-xs font-mono text-iron-400">STR {bg.str} · HP {bg.hp} · ⚙ {bg.dailyCost}/day</div>
                </div>
                <button
                  onClick={() => dismiss.mutate(bg.id)}
                  disabled={dismiss.isPending}
                  className="btn-danger text-xs"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="divider" />

        <p className="section-heading !mb-2">Hire a Bodyguard</p>
        <div className="space-y-2">
          {BODYGUARD_TIERS.map((tier) => (
            <div key={tier.tier} className="card bg-iron-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-iron-100 text-sm">{tier.label}</div>
                <div className="text-xs font-mono text-iron-400">
                  STR {tier.str} · HP {tier.hp} · ⚙ {tier.dailyCost}/day upkeep
                </div>
              </div>
              <button
                onClick={() => hire.mutate(tier.tier)}
                disabled={hire.isPending || activeGuards.length >= 3}
                className="btn-primary text-xs shrink-0"
              >
                Hire ⚙{tier.cost}
              </button>
            </div>
          ))}
          {activeGuards.length >= 3 && (
            <p className="text-iron-500 text-xs font-mono">Maximum 3 active bodyguards.</p>
          )}
        </div>
        {hire.isError && (
          <p className="text-red-400 text-xs font-mono">{(hire.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
