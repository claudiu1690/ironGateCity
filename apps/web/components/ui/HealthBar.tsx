'use client';

import { useCharacterStore } from '../../store/characterStore';

export function HealthBar() {
  const { health, maxHealth, character } = useCharacterStore();
  const pct = maxHealth > 0 ? Math.round((health / maxHealth) * 100) : 0;
  const isHospitalised = character?.isHospitalised ?? false;
  const isLow = pct < 30;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className={`text-xs font-mono shrink-0 ${isLow ? 'text-red-400' : 'text-iron-400'}`}>
        ❤
      </span>
      {isHospitalised ? (
        <span className="badge badge-red text-[10px]">HOSPITALISED</span>
      ) : (
        <>
          <div className="progress-track flex-1">
            <div
              className={`progress-fill ${isLow ? 'bg-red-500' : 'bg-rose-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-mono shrink-0 ${isLow ? 'text-red-400' : 'text-iron-300'}`}>
            {health}/{maxHealth}
          </span>
        </>
      )}
    </div>
  );
}
