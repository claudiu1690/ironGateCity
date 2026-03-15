'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { HospitalStatus } from '../../../types';

interface TreatmentOption {
  serviceKey: 'BASIC_TREATMENT' | 'FULL_RECOVERY' | 'NEGLECT_TREATMENT';
  label: string;
  description: string;
  cost: number;
  energyCost: number;
  hpRestored: number | 'FULL';
}

const TREATMENTS: TreatmentOption[] = [
  {
    serviceKey:  'BASIC_TREATMENT',
    label:       'Basic Treatment',
    description: 'Patch up wounds. Restores 30 HP.',
    cost:        50,
    energyCost:  2,
    hpRestored:  30,
  },
  {
    serviceKey:  'FULL_RECOVERY',
    label:       'Full Recovery',
    description: 'Complete medical care. Restores to full HP and discharges you.',
    cost:        200,
    energyCost:  0,
    hpRestored:  'FULL',
  },
  {
    serviceKey:  'NEGLECT_TREATMENT',
    label:       'Neglect Treatment',
    description: 'Clears Hunger and Fatigue debuffs. Restores 20 HP.',
    cost:        100,
    energyCost:  0,
    hpRestored:  20,
  },
];

export default function HospitalPage() {
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['hospital'],
    queryFn:  () => api.get<HospitalStatus>('/city/hospital'),
  });

  const treat = useMutation({
    mutationFn: (serviceKey: string) => api.post(`/city/hospital/treat/${serviceKey}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['hospital'] });
      qc.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });

  const hpPct = status
    ? Math.round((status.currentHealth / status.maxHealth) * 100)
    : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">City Hospital</h1>
        <p className="text-iron-400 text-sm mt-1">
          {status?.isHospitalised ? 'You are currently receiving care.' : 'Medical services available.'}
        </p>
      </div>

      {isLoading && <div className="text-iron-400 font-mono animate-pulse text-sm">Loading...</div>}

      {status && (
        <>
          {/* Status card */}
          <div className={`card space-y-3 ${status.isHospitalised ? 'border-red-700/50' : ''}`}>
            <p className="section-heading">Health Status</p>
            {status.isHospitalised && (
              <div className="text-red-400 text-sm font-mono">
                ✚ HOSPITALISED — You are under medical care.
              </div>
            )}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-iron-400">
                <span>HP</span>
                <span>{status.currentHealth} / {status.maxHealth}</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${hpPct < 30 ? 'bg-red-500' : 'bg-rose-500'}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>
            {status.hasNeglectDebuff && (
              <div className="flex gap-2">
                <span className="badge badge-red">HUNGER</span>
                <span className="badge badge-red">FATIGUE</span>
                <span className="text-iron-400 text-xs ml-2">Neglect debuffs active — HP draining over time.</span>
              </div>
            )}
          </div>

          {/* Treatment options */}
          <div>
            <p className="section-heading">Available Services</p>
            <div className="space-y-3">
              {TREATMENTS.map((t) => (
                <div key={t.serviceKey} className="card flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-iron-100">{t.label}</div>
                    <div className="text-iron-400 text-xs mt-1">{t.description}</div>
                    <div className="flex gap-4 mt-2 text-xs font-mono text-iron-300">
                      <span>⚙ {t.cost} Iron</span>
                      {t.energyCost > 0 && <span>⚡ {t.energyCost} Energy</span>}
                      <span>+{t.hpRestored} HP</span>
                    </div>
                  </div>
                  <button
                    onClick={() => treat.mutate(t.serviceKey)}
                    disabled={treat.isPending}
                    className="btn-primary text-sm"
                  >
                    {treat.isPending ? '...' : 'Treat'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {treat.isError && (
            <div className="text-red-400 text-xs font-mono">{(treat.error as Error).message}</div>
          )}
        </>
      )}
    </div>
  );
}
