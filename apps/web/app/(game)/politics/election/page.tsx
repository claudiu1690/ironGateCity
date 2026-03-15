'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { useCharacterStore } from '../../../../store/characterStore';
import type { Election, ElectionCandidate } from '../../../../types';

interface ElectionResponse { election: Election | null }

function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [target]);

  return <span className="font-mono text-gold">{remaining}</span>;
}

export default function ElectionPage() {
  const qc        = useQueryClient();
  const character = useCharacterStore((s) => s.character);

  const { data, isLoading } = useQuery({
    queryKey: ['politics', 'election'],
    queryFn:  () => api.get<ElectionResponse>('/politics/election'),
  });

  const nominate = useMutation({
    mutationFn: () => api.post('/politics/election/nominate'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['politics', 'election'] }),
  });

  const vote = useMutation({
    mutationFn: (candidateId: string) => api.post(`/politics/election/vote/${candidateId}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['politics', 'election'] }),
  });

  const election = data?.election;
  const canVote     = (character?.rank ?? 0) >= 2;
  const canNominate = (character?.rank ?? 0) >= 6;
  const isNomination = election?.status === 'NOMINATION';
  const isVoting     = election?.status === 'VOTING';

  if (isLoading) return <div className="text-iron-400 font-mono animate-pulse text-sm">Loading election data...</div>;

  if (!election) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-iron-100">Election</h1>
        <div className="card text-center py-16 text-iron-500">
          <div className="text-4xl mb-3">🗳</div>
          <p>No active election. Elections begin when a faction reaches 55% national control.</p>
        </div>
      </div>
    );
  }

  const factionColor = election.faction === 'FASCIST' ? 'text-fascist' : election.faction === 'COMMUNIST' ? 'text-communist' : 'text-democrat';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">Election</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={`badge badge-${election.faction.toLowerCase()}`}>{election.faction}</span>
          <span className="badge badge-gray">{election.status}</span>
        </div>
      </div>

      {/* Timers */}
      <div className="card grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-iron-500 text-xs font-mono mb-1">Nominations close</div>
          <Countdown target={election.nominationEnds} />
        </div>
        <div>
          <div className="text-iron-500 text-xs font-mono mb-1">Voting closes</div>
          <Countdown target={election.votingEnds} />
        </div>
      </div>

      {/* Nominate self */}
      {isNomination && canNominate && (
        <div className="card space-y-3">
          <p className="section-heading">Stand for Election</p>
          <p className="text-iron-400 text-sm">Rank 6+ required. You may nominate yourself as a candidate.</p>
          <button
            onClick={() => nominate.mutate()}
            disabled={nominate.isPending}
            className="btn-primary"
          >
            {nominate.isPending ? 'Nominating...' : 'Nominate Yourself'}
          </button>
          {nominate.isError && (
            <p className="text-red-400 text-xs font-mono">{(nominate.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Candidates */}
      <div className="space-y-3">
        <p className="section-heading">Candidates</p>
        {(election.candidates ?? []).length === 0 ? (
          <div className="card text-center text-iron-500 py-8">No candidates yet.</div>
        ) : (
          (election.candidates ?? [])
            .sort((a, b) => b.voteWeight - a.voteWeight)
            .map((candidate, i) => (
              <div key={candidate.id} className="card flex items-center gap-4">
                <div className={`text-2xl font-bold font-mono w-8 text-center ${i === 0 ? 'text-gold' : 'text-iron-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-iron-100">{candidate.name}</div>
                  <div className="text-xs font-mono text-iron-400">{candidate.voteWeight} votes</div>
                </div>
                {isVoting && canVote && (
                  <button
                    onClick={() => vote.mutate(candidate.characterId)}
                    disabled={vote.isPending}
                    className="btn-primary text-sm"
                  >
                    Vote
                  </button>
                )}
              </div>
            ))
        )}
        {isVoting && !canVote && (
          <p className="text-iron-500 text-xs font-mono">Rank 2 required to vote.</p>
        )}
        {vote.isError && (
          <p className="text-red-400 text-xs font-mono">{(vote.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
