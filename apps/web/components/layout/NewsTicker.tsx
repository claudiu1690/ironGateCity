'use client';

import { useWorldStore } from '../../store/worldStore';

const TYPE_COLOR: Record<string, string> = {
  election:  'text-yellow-400',
  law:       'text-democrat',
  influence: 'text-green-400',
  president: 'text-gold',
  weather:   'text-iron-300',
};

export function NewsTicker() {
  const news = useWorldStore((s) => s.news);

  const displayItems = news.length > 0
    ? news
    : [{ message: 'Welcome to Irongate City. The struggle begins.', type: 'influence' as const, timestamp: 0 }];

  const tickerText = displayItems
    .map((n) => `◆  ${n.message}`)
    .join('     ');

  return (
    <div className="w-full overflow-hidden bg-iron-900/50 border-b border-iron-800 h-6 flex items-center">
      <span className="text-xs font-mono text-iron-500 px-2 shrink-0 border-r border-iron-700 mr-2">
        WIRE
      </span>
      <div className="overflow-hidden flex-1 h-full flex items-center">
        <span
          key={news.length}
          className="animate-ticker text-xs font-mono text-iron-300"
        >
          {displayItems.map((n, i) => (
            <span key={i}>
              <span className={`${TYPE_COLOR[n.type] ?? 'text-iron-300'} mr-1`}>◆</span>
              <span className="mr-8">{n.message}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
