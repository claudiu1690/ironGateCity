'use client';

import Link from 'next/link';
import { useCharacterStore } from '../../store/characterStore';
import { useWorldStore }     from '../../store/worldStore';
import { WeatherBadge }      from '../ui/WeatherBadge';

const WEATHER_ICON: Record<string, string> = {
  CLEAR: '○', RAIN: '~', FOG: '░', SNOW: '*', HEAT_WAVE: '▲', FROST: '◈',
};

export function TopBar() {
  const character = useCharacterStore((s) => s.character);
  const weather   = useWorldStore((s) => s.weather);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14 bg-iron-900 backdrop-blur-sm flex items-center border-b"
      style={{ borderColor: 'var(--faction-border, rgba(35,35,42,1))' }}
    >
      {/* Game wordmark */}
      <div className="w-56 shrink-0 px-4 flex items-center gap-2 border-r border-iron-800 h-full">
        <Link href="/dashboard" className="font-mono font-black tracking-[0.2em] text-sm"
          style={{ color: 'var(--faction-text, #d4af37)' }}>
          IRONGATE
        </Link>
        <span className="text-iron-700 font-mono text-xs tracking-widest hidden lg:block">CITY</span>
      </div>

      {/* News ticker — centre */}
      <div className="flex-1 overflow-hidden h-full flex items-center px-4">
        <NewsTicker />
      </div>

      {/* Right cluster: weather + season */}
      <div className="shrink-0 px-4 flex items-center gap-4 border-l border-iron-800 h-full">
        {weather ? (
          <div className="text-xs font-mono text-iron-400 flex items-center gap-1.5">
            <span className="text-iron-600">{WEATHER_ICON[weather.weather] ?? '○'}</span>
            <span className="text-iron-500 uppercase tracking-widest text-[10px]">{weather.season}</span>
            <span className="text-iron-400">{weather.weather.replace('_', ' ')}</span>
          </div>
        ) : (
          <WeatherBadge />
        )}
        {character && (
          <div className="text-xs font-mono text-iron-500 hidden lg:block">
            <span className="text-gold">⚙</span> {character.ironMarks.toLocaleString()}
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Inline news ticker (no extra component file needed here) ─────────────────

function NewsTicker() {
  const news = useWorldStore((s) => s.news);
  const items = news.length > 0
    ? news.slice(0, 10)
    : [{ message: 'Welcome to Irongate City. The city never sleeps.', type: 'influence' as const, timestamp: 0 }];

  return (
    <div className="overflow-hidden flex-1 h-full flex items-center">
      <span
        key={items.length}
        className="animate-ticker text-[11px] font-mono text-iron-600 whitespace-nowrap"
      >
        {items.map((n, i) => (
          <span key={i}>
            <span className="text-iron-700 mr-1">◆</span>
            <span className="mr-10">{n.message}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
