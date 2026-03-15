'use client';

import { useCharacterStore } from '../../store/characterStore';

export function EnergyBar() {
  const { energy, maxEnergy } = useCharacterStore();
  const pct = maxEnergy > 0 ? Math.round((energy / maxEnergy) * 100) : 0;

  const fillColor =
    pct > 60 ? 'bg-green-500'
    : pct > 30 ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-xs text-iron-400 font-mono shrink-0">⚡</span>
      <div className="progress-track flex-1">
        <div
          className={`progress-fill ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-iron-300 shrink-0">
        {energy}/{maxEnergy}
      </span>
    </div>
  );
}
