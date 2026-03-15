'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { BarStatus } from '../../../types';

interface BarAction {
  key: 'drink' | 'meet_contact' | 'gamble';
  label: string;
  description: string;
  cost: number;
  effect: string;
  icon: string;
}

const BAR_ACTIONS: BarAction[] = [
  {
    key:         'drink',
    label:       'Have a Drink',
    description: 'A stiff drink clears the mind. Grants XP buff for 2 hours.',
    cost:        20,
    effect:      '+10% XP on next mission',
    icon:        '🍺',
  },
  {
    key:         'meet_contact',
    label:       'Meet a Contact',
    description: 'Someone in this bar knows something. Pay for an intelligence snippet.',
    cost:        50,
    effect:      'Random dossier intel reveal',
    icon:        '🤝',
  },
  {
    key:         'gamble',
    label:       'Gamble',
    description: 'A game of cards. High risk, high reward.',
    cost:        30,
    effect:      'Win or lose Iron — 50/50',
    icon:        '🎲',
  },
];

const DAILY_LIMITS: Record<string, number> = {
  drink:        3,
  meet_contact: 2,
  gamble:       5,
};

export default function BarPage() {
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['bar'],
    queryFn:  () => api.get<BarStatus>('/city/bar'),
  });

  const doAction = useMutation({
    mutationFn: (action: string) => api.post<{ result: string; message: string }>(`/city/bar/action/${action}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['bar'] });
      qc.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });

  const used: Record<string, number> = {
    drink:        status?.drinksToday       ?? 0,
    meet_contact: status?.contactsMet       ?? 0,
    gamble:       status?.gamblesWon        ?? 0,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">The Iron Tavern</h1>
        <p className="text-iron-400 text-sm mt-1">The bar never closes. Neither do the debts.</p>
      </div>

      {doAction.isSuccess && (
        <div className="card border-green-700/40 bg-green-900/10 text-green-400 text-sm font-mono animate-fade-up">
          {doAction.data?.message ?? 'Action completed.'}
        </div>
      )}

      {doAction.isError && (
        <div className="text-red-400 text-xs font-mono">{(doAction.error as Error).message}</div>
      )}

      <div className="space-y-4">
        {BAR_ACTIONS.map((action) => {
          const count    = used[action.key] ?? 0;
          const limit    = DAILY_LIMITS[action.key] ?? 3;
          const maxedOut = count >= limit;
          return (
            <div key={action.key} className={`card space-y-3 ${maxedOut ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{action.icon}</span>
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-iron-100">{action.label}</div>
                    <p className="text-iron-400 text-xs">{action.description}</p>
                    <div className="flex gap-4 text-xs font-mono text-iron-300">
                      <span>⚙ {action.cost} Iron</span>
                      <span className="text-gold">{action.effect}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => doAction.mutate(action.key)}
                  disabled={maxedOut || doAction.isPending}
                  className="btn-primary text-sm shrink-0"
                >
                  {doAction.isPending ? '...' : maxedOut ? 'Done' : 'Do it'}
                </button>
              </div>

              {/* Daily limit counter */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: limit }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm ${i < count ? 'bg-gold' : 'bg-iron-700'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono text-iron-500">{count}/{limit} today</span>
                {action.key === 'drink' && count >= 2 && (
                  <span className="text-yellow-400 text-xs font-mono">⚠ Overdose risk</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
