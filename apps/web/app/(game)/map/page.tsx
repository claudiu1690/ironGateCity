'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useWorldStore } from '../../../store/worldStore';
import { useCharacterStore } from '../../../store/characterStore';
import type { City, CityInfluence, NationalControl } from '../../../types';

interface InfluenceResponse {
  cities: (City & { influence: CityInfluence })[];
  national: NationalControl;
}

// ─── SVG Map layout ───────────────────────────────────────────────────────────

const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  irongate:   { x: 300, y: 240 },
  northhaven: { x: 300, y:  90 },
  southport:  { x: 300, y: 390 },
  eastbridge: { x: 460, y: 200 },
  westmere:   { x: 140, y: 200 },
};

const ROADS = [
  ['irongate', 'northhaven'],
  ['irongate', 'southport'],
  ['irongate', 'eastbridge'],
  ['irongate', 'westmere'],
  ['northhaven', 'eastbridge'],
  ['northhaven', 'westmere'],
];

function factionColor(inf: CityInfluence | undefined): string {
  if (!inf) return '#35353d';
  const { fascistPct: f, communistPct: c, democratPct: d } = inf;
  if (f > 50) return '#922b21';
  if (c > 50) return '#7b241c';
  if (d > 50) return '#1a5276';
  return '#4a4a55'; // contested
}

function InfluenceBar({ inf }: { inf: CityInfluence }) {
  return (
    <div className="flex h-3 rounded-full overflow-hidden w-full">
      <div style={{ width: `${inf.fascistPct}%`, background: '#c0392b' }} title={`Fascist ${inf.fascistPct.toFixed(1)}%`} />
      <div style={{ width: `${inf.communistPct}%`, background: '#922b21' }} title={`Communist ${inf.communistPct.toFixed(1)}%`} />
      <div style={{ width: `${inf.democratPct}%`, background: '#2980b9' }} title={`Democrat ${inf.democratPct.toFixed(1)}%`} />
    </div>
  );
}

export default function MapPage() {
  const qc       = useQueryClient();
  const character = useCharacterStore((s) => s.character);
  const socketInfluence = useWorldStore((s) => s.cityInfluence);
  // Select raw array — never derive new arrays inside a Zustand selector (causes infinite re-renders)
  const allNews = useWorldStore((s) => s.news);
  const news = allNews.filter((n) => n.type === 'influence').slice(0, 10);

  const [selected, setSelected] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['influence'],
    queryFn:  () => api.get<InfluenceResponse>('/politics/influence'),
  });

  const travel = useMutation({
    mutationFn: (cityId: string) => api.post('/character/travel', { cityId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['character', 'me'] }),
  });

  const cities = data?.cities ?? [];
  const national = data?.national ?? { FASCIST: 33.33, COMMUNIST: 33.33, DEMOCRAT: 33.34 };

  const selectedCity = cities.find((c) => c.id === selected || c.slug === selected);

  function getInfluence(city: City): CityInfluence {
    return socketInfluence[city.id] ?? city.influence ?? { cityId: city.id, fascistPct: 33.33, communistPct: 33.33, democratPct: 33.34 };
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">World Map</h1>
        <p className="text-iron-400 text-sm mt-1">Click a city to view influence and travel options.</p>
      </div>

      {/* National control */}
      <div className="card">
        <p className="section-heading">National Control</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Fascist',   pct: national.FASCIST,   cls: 'text-fascist' },
            { label: 'Communist', pct: national.COMMUNIST, cls: 'text-communist' },
            { label: 'Democrat',  pct: national.DEMOCRAT,  cls: 'text-democrat' },
          ].map((f) => (
            <div key={f.label}>
              <div className={`text-2xl font-bold font-mono ${f.cls}`}>{f.pct.toFixed(1)}%</div>
              <div className="text-xs text-iron-400">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* SVG Map */}
        <div className="col-span-2 card p-2">
          <svg viewBox="0 0 600 480" className="w-full">
            {/* Road connections */}
            {ROADS.map(([a, b]) => {
              const pa = CITY_POSITIONS[a];
              const pb = CITY_POSITIONS[b];
              if (!pa || !pb) return null;
              return (
                <line key={`${a}-${b}`}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="#35353d" strokeWidth="2" strokeDasharray="6 4"
                />
              );
            })}

            {/* City nodes */}
            {cities.map((city) => {
              const pos  = CITY_POSITIONS[city.slug];
              if (!pos) return null;
              const inf  = getInfluence(city);
              const fill = factionColor(inf);
              const isCurrentCity  = city.id === character?.currentCityId;
              const isSelected = city.id === selected;

              return (
                <g key={city.id} onClick={() => setSelected(city.id)} style={{ cursor: 'pointer' }}>
                  {/* Glow for current city */}
                  {isCurrentCity && (
                    <circle cx={pos.x} cy={pos.y} r="26" fill="rgba(212,175,55,0.15)" />
                  )}
                  <circle
                    cx={pos.x} cy={pos.y} r="20"
                    fill={fill}
                    stroke={isSelected ? '#d4af37' : isCurrentCity ? '#d4af37' : '#4a4a55'}
                    strokeWidth={isSelected || isCurrentCity ? 3 : 1.5}
                  />
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="#e8e8ed" fontSize="9" fontFamily="monospace">
                    {city.slug.slice(0, 3).toUpperCase()}
                  </text>
                  <text x={pos.x} y={pos.y + 36} textAnchor="middle" fill="#9898a8" fontSize="10" fontFamily="monospace">
                    {city.name}
                  </text>
                  {isCurrentCity && (
                    <circle cx={pos.x + 16} cy={pos.y - 16} r="5" fill="#d4af37" />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* City panel + influence feed */}
        <div className="space-y-4">
          {selectedCity ? (
            <div className="card space-y-3 animate-fade-up">
              <h3 className="font-bold text-iron-100">{selectedCity.name}</h3>
              <InfluenceBar inf={getInfluence(selectedCity)} />
              <div className="space-y-1 text-xs font-mono">
                {[
                  { label: 'Fascist',   pct: getInfluence(selectedCity).fascistPct,   cls: 'text-fascist' },
                  { label: 'Communist', pct: getInfluence(selectedCity).communistPct, cls: 'text-communist' },
                  { label: 'Democrat',  pct: getInfluence(selectedCity).democratPct,  cls: 'text-democrat' },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between">
                    <span className={f.cls}>{f.label}</span>
                    <span className="text-iron-300">{f.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              {character?.currentCityId !== selectedCity.id ? (
                <button
                  onClick={() => travel.mutate(selectedCity.id)}
                  disabled={travel.isPending}
                  className="btn-primary w-full text-sm"
                >
                  {travel.isPending ? 'Travelling...' : `Travel here`}
                </button>
              ) : (
                <div className="text-center text-xs text-gold font-mono">★ You are here</div>
              )}
            </div>
          ) : (
            <div className="card text-center text-iron-500 text-sm py-8">
              Click a city node to view details
            </div>
          )}

          {/* Influence feed */}
          <div className="card">
            <p className="section-heading">Influence Feed</p>
            {news.length === 0 ? (
              <p className="text-iron-500 text-xs">No recent shifts.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {news.map((n, i) => (
                  <p key={i} className="text-xs text-iron-400 font-mono border-b border-iron-800 pb-1 last:border-0">
                    {n.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
