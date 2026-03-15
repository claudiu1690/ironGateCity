'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { EnergyPack } from '../../../types';

interface StoreResponse {
  energyPacks: EnergyPack[];
  premium: { priceId: string; price: number; label: string; description: string };
  isPremium: boolean;
}

const PACK_ICONS = ['⚡', '⚡⚡', '⚡⚡⚡'];

export default function StorePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['store'],
    queryFn:  () => api.get<StoreResponse>('/payments/packs'),
  });

  const checkout = useMutation({
    mutationFn: (priceId: string) =>
      api.post<{ url: string }>('/payments/create-checkout', { priceId }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const packs   = data?.energyPacks ?? [];
  const premium = data?.premium;
  const isPremium = data?.isPremium ?? false;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">Energy Store</h1>
        <p className="text-iron-400 text-sm mt-1">
          Recharge your energy or upgrade to Premium. Payments processed securely via Stripe.
        </p>
      </div>

      {isLoading && <div className="text-iron-400 font-mono animate-pulse text-sm">Loading...</div>}

      {/* Energy packs */}
      <div>
        <p className="section-heading">Energy Packs</p>
        <div className="grid grid-cols-3 gap-4">
          {packs.map((pack, i) => (
            <div key={pack.priceId} className="card text-center space-y-3 hover:border-iron-500 transition-colors">
              <div className="text-3xl">{PACK_ICONS[i] ?? '⚡'}</div>
              <div className="font-bold text-iron-100">{pack.label}</div>
              <div className="text-gold text-xl font-mono font-bold">+{pack.amount}</div>
              <div className="text-iron-400 text-xs">{pack.description}</div>
              <div className="text-iron-200 font-mono font-semibold">
                ${(pack.price / 100).toFixed(2)}
              </div>
              <button
                onClick={() => checkout.mutate(pack.priceId)}
                disabled={checkout.isPending}
                className="btn-primary w-full text-sm"
              >
                {checkout.isPending ? '...' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Premium subscription */}
      {premium && (
        <div>
          <p className="section-heading">Premium Membership</p>
          <div className="card border-gold/30 space-y-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">★</div>
              <div className="flex-1 space-y-2">
                <div className="font-bold text-gold text-lg">{premium.label}</div>
                <p className="text-iron-300 text-sm">{premium.description}</p>
                <ul className="text-xs text-iron-400 space-y-1 font-mono">
                  <li>✓ Max energy increased to 150</li>
                  <li>✓ 20% bonus Iron on all missions</li>
                  <li>✓ Access to premium equipment tier</li>
                  <li>✓ Priority in elections</li>
                </ul>
              </div>
            </div>
            {isPremium ? (
              <div className="text-center text-green-400 font-mono text-sm">
                ★ You are a Premium member
              </div>
            ) : (
              <button
                onClick={() => checkout.mutate(premium.priceId)}
                disabled={checkout.isPending}
                className="btn-primary w-full"
              >
                {checkout.isPending ? '...' : `Subscribe — $${(premium.price / 100).toFixed(2)}/month`}
              </button>
            )}
          </div>
        </div>
      )}

      {checkout.isError && (
        <div className="text-red-400 text-xs font-mono">{(checkout.error as Error).message}</div>
      )}

      <div className="card bg-iron-800/50 text-center">
        <p className="text-iron-500 text-xs font-mono">
          Payments secured by Stripe. No card data stored on our servers.
          All purchases are non-refundable per our terms of service.
        </p>
      </div>
    </div>
  );
}
