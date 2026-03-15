'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { CityInfluence, Law, Election, NationalControl } from '../../../types';

interface PoliticsResponse {
  cities: { id: string; name: string; slug: string; influence: CityInfluence }[];
  national: NationalControl;
  activeLaws: Law[];
  activeElection: Election | null;
  activePresident: { name: string; faction: string; termEnds: string } | null;
}

function NationalBar({ national }: { national: NationalControl }) {
  return (
    <div className="space-y-2">
      <div className="flex h-5 rounded-full overflow-hidden w-full">
        <div style={{ width: `${national.FASCIST}%` }}   className="bg-fascist flex items-center justify-center text-[10px] text-white font-mono">{national.FASCIST.toFixed(0)}%</div>
        <div style={{ width: `${national.COMMUNIST}%` }} className="bg-communist flex items-center justify-center text-[10px] text-white font-mono">{national.COMMUNIST.toFixed(0)}%</div>
        <div style={{ width: `${national.DEMOCRAT}%` }}  className="bg-democrat flex items-center justify-center text-[10px] text-white font-mono">{national.DEMOCRAT.toFixed(0)}%</div>
      </div>
      <div className="flex justify-between text-xs font-mono">
        <span className="text-fascist">Fascist {national.FASCIST.toFixed(1)}%</span>
        <span className="text-communist">Communist {national.COMMUNIST.toFixed(1)}%</span>
        <span className="text-democrat">Democrat {national.DEMOCRAT.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function PoliticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['politics'],
    queryFn:  () => api.get<PoliticsResponse>('/politics/influence'),
  });

  const { data: lawsData } = useQuery({
    queryKey: ['politics', 'laws'],
    queryFn:  () => api.get<{ laws: Law[] }>('/politics/laws'),
  });

  const { data: electionData } = useQuery({
    queryKey: ['politics', 'election'],
    queryFn:  () => api.get<{ election: Election | null }>('/politics/election'),
  });

  const national  = data?.national ?? { FASCIST: 33.33, COMMUNIST: 33.33, DEMOCRAT: 33.34 };
  const cities    = data?.cities   ?? [];
  const activeLaws = lawsData?.laws?.filter((l) => l.status === 'ACTIVE') ?? [];
  const election  = electionData?.election;
  const president = data?.activePresident;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">Politics</h1>
        <p className="text-iron-400 text-sm mt-1">National power, active laws, and elections.</p>
      </div>

      {isLoading && <div className="text-iron-400 font-mono animate-pulse text-sm">Loading...</div>}

      {/* National control */}
      <div className="card space-y-4">
        <p className="section-heading">National Control</p>
        <NationalBar national={national} />
        {Object.values(national).some((v) => v >= 55) && (
          <div className="text-yellow-400 text-xs font-mono">
            ⚠ A faction has reached 55% — election threshold crossed.
          </div>
        )}
      </div>

      {/* Active president */}
      {president && (
        <div className="card border-gold/30 space-y-2">
          <p className="section-heading">Current President</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <div>
              <div className="font-bold text-iron-100">{president.name}</div>
              <div className={`text-xs font-mono ${
                president.faction === 'FASCIST' ? 'text-fascist'
                : president.faction === 'COMMUNIST' ? 'text-communist'
                : 'text-democrat'
              }`}>
                {president.faction}
              </div>
              <div className="text-xs text-iron-500 font-mono">
                Term ends: {new Date(president.termEnds).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Election status */}
      {election && (
        <div className={`card border-2 border-${election.faction.toLowerCase()}/50 space-y-3`}>
          <div className="flex items-center justify-between">
            <p className="section-heading !mb-0">Active Election</p>
            <Link href="/politics/election" className="text-xs text-gold hover:text-gold-light font-mono">
              View candidates →
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge badge-${election.faction.toLowerCase()}`}>{election.faction}</span>
            <span className="badge badge-gray">{election.status}</span>
          </div>
          <div className="text-xs font-mono text-iron-400">
            <div>Nominations end: {new Date(election.nominationEnds).toLocaleString()}</div>
            <div>Voting ends: {new Date(election.votingEnds).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* City influence breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-heading !mb-0">City Influence</p>
            <Link href="/map" className="text-xs text-gold font-mono">Map view →</Link>
          </div>
          {cities.map((city) => (
            <div key={city.id} className="card space-y-2">
              <div className="font-semibold text-iron-100 text-sm">{city.name}</div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div style={{ width: `${city.influence.fascistPct}%` }}   className="bg-fascist" />
                <div style={{ width: `${city.influence.communistPct}%` }} className="bg-communist" />
                <div style={{ width: `${city.influence.democratPct}%` }}  className="bg-democrat" />
              </div>
              <div className="flex justify-between text-xs font-mono text-iron-500">
                <span className="text-fascist">{city.influence.fascistPct.toFixed(0)}%</span>
                <span className="text-communist">{city.influence.communistPct.toFixed(0)}%</span>
                <span className="text-democrat">{city.influence.democratPct.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Active laws */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-heading !mb-0">Active Laws</p>
            <Link href="/politics/laws" className="text-xs text-gold font-mono">All laws →</Link>
          </div>
          {activeLaws.length === 0 ? (
            <div className="card text-center text-iron-500 text-sm py-8">No active laws.</div>
          ) : (
            activeLaws.map((law) => (
              <div key={law.id} className="card space-y-1">
                <div className="font-semibold text-iron-100 text-sm">{law.title}</div>
                <p className="text-iron-400 text-xs">{law.description}</p>
                <div className="text-xs font-mono text-gold">Effect: {law.effect}</div>
                {law.expiresAt && (
                  <div className="text-xs text-iron-500 font-mono">
                    Expires: {new Date(law.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
