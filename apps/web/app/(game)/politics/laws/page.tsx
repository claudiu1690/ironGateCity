'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { useCharacterStore } from '../../../../store/characterStore';
import { Modal } from '../../../../components/ui/Modal';
import type { Law } from '../../../../types';

interface LawsResponse { laws: Law[] }

const STATUS_BADGE: Record<string, string> = {
  PROPOSED: 'badge-gold',
  ACTIVE:   'badge-green',
  EXPIRED:  'badge-gray',
};

export default function LawsPage() {
  const qc        = useQueryClient();
  const character = useCharacterStore((s) => s.character);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [newLaw, setNewLaw]  = useState({ title: '', description: '', effect: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['politics', 'laws'],
    queryFn:  () => api.get<LawsResponse>('/politics/laws'),
  });

  const propose = useMutation({
    mutationFn: (body: typeof newLaw) => api.post('/politics/laws/propose', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['politics', 'laws'] });
      setProposeOpen(false);
      setNewLaw({ title: '', description: '', effect: '' });
    },
  });

  const voteLaw = useMutation({
    mutationFn: ({ lawId, vote }: { lawId: string; vote: 'YES' | 'NO' }) =>
      api.post(`/politics/laws/${lawId}/vote`, { vote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['politics', 'laws'] }),
  });

  const isPresident  = !!(character && data); // simplified — real check is in the API
  const canVote      = (character?.rank ?? 0) >= 4;
  const laws         = data?.laws ?? [];
  const proposed     = laws.filter((l) => l.status === 'PROPOSED');
  const active       = laws.filter((l) => l.status === 'ACTIVE');
  const expired      = laws.filter((l) => l.status === 'EXPIRED');

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iron-100">Laws</h1>
          <p className="text-iron-400 text-sm mt-1">Proposed, active, and expired legislation.</p>
        </div>
        {isPresident && (
          <button onClick={() => setProposeOpen(true)} className="btn-primary text-sm">
            Propose Law
          </button>
        )}
      </div>

      {isLoading && <div className="text-iron-400 font-mono animate-pulse text-sm">Loading laws...</div>}

      {/* Proposed laws — voteable by rank 4+ */}
      {proposed.length > 0 && (
        <div>
          <p className="section-heading">Proposed — Under Vote</p>
          <div className="space-y-3">
            {proposed.map((law) => (
              <div key={law.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-iron-100">{law.title}</span>
                      <span className={`badge ${STATUS_BADGE[law.status]}`}>{law.status}</span>
                      {law.proposedBy && <span className={`badge badge-${law.proposedBy.toLowerCase()}`}>{law.proposedBy}</span>}
                    </div>
                    <p className="text-iron-400 text-xs">{law.description}</p>
                    <div className="text-xs font-mono text-gold">Effect: {law.effect}</div>
                    <div className="text-xs font-mono text-iron-400">
                      Votes: <span className="text-green-400">Yes {law.yesVotes}</span>
                      {' · '}
                      <span className="text-red-400">No {law.noVotes}</span>
                    </div>
                  </div>
                </div>
                {canVote && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => voteLaw.mutate({ lawId: law.id, vote: 'YES' })}
                      disabled={voteLaw.isPending}
                      className="btn-primary flex-1 text-sm"
                    >
                      ✓ Yes
                    </button>
                    <button
                      onClick={() => voteLaw.mutate({ lawId: law.id, vote: 'NO' })}
                      disabled={voteLaw.isPending}
                      className="btn-danger flex-1 text-sm"
                    >
                      ✕ No
                    </button>
                  </div>
                )}
                {!canVote && (
                  <p className="text-iron-500 text-xs font-mono">Rank 4 required to vote on laws.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active laws */}
      {active.length > 0 && (
        <div>
          <p className="section-heading">Active Laws</p>
          <div className="space-y-3">
            {active.map((law) => (
              <div key={law.id} className="card space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-iron-100 text-sm">{law.title}</span>
                  <span className={`badge ${STATUS_BADGE[law.status]}`}>{law.status}</span>
                </div>
                <p className="text-iron-400 text-xs">{law.description}</p>
                <div className="text-xs font-mono text-gold">Effect: {law.effect}</div>
                {law.expiresAt && (
                  <div className="text-xs text-iron-500 font-mono">
                    Expires: {new Date(law.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired laws */}
      {expired.length > 0 && (
        <div>
          <p className="section-heading">Expired</p>
          <div className="space-y-2">
            {expired.map((law) => (
              <div key={law.id} className="card opacity-50 flex items-center justify-between">
                <div>
                  <span className="text-sm text-iron-300">{law.title}</span>
                  <div className="text-xs text-iron-500 font-mono">{law.effect}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[law.status]}`}>{law.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Propose law modal */}
      <Modal open={proposeOpen} onClose={() => setProposeOpen(false)} title="Propose New Law">
        <div className="space-y-4">
          <p className="text-iron-400 text-sm">As President, you may propose one law per week.</p>
          <div className="space-y-3">
            <div>
              <label className="section-heading">Title</label>
              <input
                type="text"
                placeholder="Name of the law..."
                value={newLaw.title}
                onChange={(e) => setNewLaw((s) => ({ ...s, title: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="section-heading">Description</label>
              <textarea
                placeholder="What does this law declare?"
                value={newLaw.description}
                onChange={(e) => setNewLaw((s) => ({ ...s, description: e.target.value }))}
                className="input min-h-[80px]"
              />
            </div>
            <div>
              <label className="section-heading">Effect (game mechanic)</label>
              <input
                type="text"
                placeholder="e.g. +10% Iron rewards on ASSAULT missions"
                value={newLaw.effect}
                onChange={(e) => setNewLaw((s) => ({ ...s, effect: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          {propose.isError && (
            <p className="text-red-400 text-xs font-mono">{(propose.error as Error).message}</p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setProposeOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={() => propose.mutate(newLaw)}
              disabled={propose.isPending || !newLaw.title}
              className="btn-primary flex-1"
            >
              {propose.isPending ? 'Proposing...' : 'Propose'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
