'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { DossierEntry } from '../../../types';

interface DossierListResponse {
  entries: DossierEntry[];
  capacity: { used: number; max: number };
}

function FreshnessLabel({ isStale, expiresAt }: { isStale: boolean; expiresAt: string }) {
  if (isStale) return <span className="badge badge-gray">STALE</span>;
  const hoursLeft = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  const cls = hoursLeft < 6 ? 'badge-red' : hoursLeft < 24 ? 'badge-gold' : 'badge-green';
  return <span className={`badge ${cls}`}>{hoursLeft}h left</span>;
}

export default function DossierPage() {
  const qc = useQueryClient();
  const [selling, setSelling] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dossier'],
    queryFn:  () => api.get<DossierListResponse>('/dossier'),
  });

  const surveil = useMutation({
    mutationFn: () => api.post('/dossier/surveillance'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dossier'] }),
  });

  const discard = useMutation({
    mutationFn: (id: string) => api.delete(`/dossier/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dossier'] }),
  });

  const sell = useMutation({
    mutationFn: (id: string) => api.post<{ ironGained: number }>(`/dossier/${id}/sell`),
    onSuccess: (data) => {
      setSelling(null);
      qc.invalidateQueries({ queryKey: ['dossier'] });
      qc.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });

  const { entries = [], capacity = { used: 0, max: 5 } } = data ?? {};
  const capPct = Math.round((capacity.used / capacity.max) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iron-100">Dossier</h1>
          <p className="text-iron-400 text-sm mt-1">Surveillance records on city actors. Sell for Iron.</p>
        </div>
        <button
          onClick={() => surveil.mutate()}
          disabled={surveil.isPending || capacity.used >= capacity.max}
          className="btn-primary"
        >
          {surveil.isPending ? 'Surveilling...' : '+ Surveillance'}
        </button>
      </div>

      {/* Capacity bar */}
      <div className="card">
        <div className="flex justify-between text-xs font-mono text-iron-400 mb-2">
          <span>File Capacity</span>
          <span>{capacity.used} / {capacity.max}</span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${capPct >= 80 ? 'bg-red-500' : 'bg-gold'}`}
            style={{ width: `${capPct}%` }}
          />
        </div>
        {capacity.used >= capacity.max && (
          <p className="text-red-400 text-xs font-mono mt-2">Capacity full — sell or discard entries to proceed.</p>
        )}
      </div>

      {surveil.isError && (
        <div className="text-red-400 text-xs font-mono">{(surveil.error as Error).message}</div>
      )}

      {isLoading && <div className="text-iron-400 font-mono animate-pulse text-sm">Loading files...</div>}

      <div className="space-y-3">
        {entries.length === 0 && !isLoading && (
          <div className="card text-center text-iron-500 py-12">
            No intelligence files. Run surveillance to gather information.
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className={`card space-y-3 ${entry.isStale ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-iron-100">{entry.targetName}</span>
                  {entry.targetFaction && (
                    <span className={`badge badge-${entry.targetFaction.toLowerCase()}`}>{entry.targetFaction}</span>
                  )}
                  <FreshnessLabel isStale={entry.isStale} expiresAt={entry.expiresAt} />
                </div>
                <p className="text-iron-500 text-xs font-mono">
                  Filed: {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => sell.mutate(entry.id)}
                  disabled={sell.isPending && selling === entry.id}
                  className="btn-ghost text-xs"
                  title={entry.isStale ? 'Stale intel sells for less' : 'Sell intelligence'}
                >
                  {entry.isStale ? 'Sell (stale)' : 'Sell'}
                </button>
                <button
                  onClick={() => discard.mutate(entry.id)}
                  disabled={discard.isPending}
                  className="btn-danger text-xs"
                >
                  Discard
                </button>
              </div>
            </div>
            <ul className="space-y-1">
              {entry.intel.map((item, i) => (
                <li key={i} className="text-iron-300 text-xs font-mono border-l-2 border-iron-600 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
