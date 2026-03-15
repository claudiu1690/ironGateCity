'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Modal } from '../../../components/ui/Modal';
import type { Item, Equipment, ItemSlot } from '../../../types';

interface InventoryResponse { inventory: Item[]; equipped: Equipment }
interface ShopResponse { items: Item[] }

const SLOT_LABEL: Record<ItemSlot, string> = {
  WEAPON: '🗡 Weapon', ARMOUR: '🛡 Armour', UTILITY: '🔧 Utility',
  ACCESSORY: '💎 Accessory', DOCUMENT: '📄 Document',
};

const SLOTS: ItemSlot[] = ['WEAPON', 'ARMOUR', 'UTILITY', 'ACCESSORY', 'DOCUMENT'];

function ItemCard({ item, action, actionLabel, disabled, onClick }: {
  item: Item; action?: string; actionLabel?: string; disabled?: boolean; onClick?: () => void
}) {
  return (
    <div className="card hover:border-iron-500 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-iron-100 text-sm">{item.name}</span>
            <span className="badge badge-gray text-[10px]">T{item.tier}</span>
            {item.faction && <span className={`badge badge-${item.faction.toLowerCase()}`}>{item.faction}</span>}
          </div>
          <p className="text-iron-500 text-xs mt-1">{item.description}</p>
          <div className="flex flex-wrap gap-2 mt-1 text-xs font-mono">
            {item.strBonus  ? <span className="text-red-400">STR +{item.strBonus}</span>  : null}
            {item.intBonus  ? <span className="text-blue-400">INT +{item.intBonus}</span>  : null}
            {item.charBonus ? <span className="text-yellow-400">CHA +{item.charBonus}</span> : null}
            {item.endBonus  ? <span className="text-green-400">END +{item.endBonus}</span>  : null}
            {item.hpBonus   ? <span className="text-rose-400">HP +{item.hpBonus}</span>    : null}
          </div>
        </div>
        {actionLabel && onClick && (
          <button onClick={onClick} disabled={disabled} className="btn-ghost text-xs shrink-0">
            {actionLabel}
          </button>
        )}
      </div>
      {action === 'buy' && (
        <div className="text-xs font-mono text-gold">⚙ {item.price} Iron</div>
      )}
    </div>
  );
}

export default function EquipmentPage() {
  const qc  = useQueryClient();
  const [tab, setTab] = useState<'equipped' | 'inventory' | 'shop' | 'craft'>('equipped');
  const [craftSource, setCraftSource] = useState<string[]>([]);

  const { data: invData } = useQuery({
    queryKey: ['equipment', 'inventory'],
    queryFn:  () => api.get<InventoryResponse>('/equipment/inventory'),
  });

  const { data: shopData } = useQuery({
    queryKey: ['equipment', 'shop'],
    queryFn:  () => api.get<ShopResponse>('/equipment/shop'),
    enabled:  tab === 'shop',
  });

  const equip = useMutation({
    mutationFn: (itemId: string) => api.post(`/equipment/equip/${itemId}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });

  const buy = useMutation({
    mutationFn: (itemId: string) => api.post(`/equipment/buy/${itemId}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
      qc.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });

  const craft = useMutation({
    mutationFn: (sourceIds: string[]) => api.post('/equipment/craft', { sourceIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
      setCraftSource([]);
    },
  });

  const { inventory = [], equipped = {} } = invData ?? {};

  const equippedItems: Partial<Record<ItemSlot, Item>> = {
    WEAPON:    equipped.weapon,
    ARMOUR:    equipped.armour,
    UTILITY:   equipped.utility,
    ACCESSORY: equipped.accessory,
    DOCUMENT:  equipped.document,
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-iron-100">Equipment</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-iron-700">
        {(['equipped', 'inventory', 'shop', 'craft'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-mono capitalize border-b-2 transition-colors ${
              tab === t ? 'border-gold text-gold' : 'border-transparent text-iron-400 hover:text-iron-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Equipped view — 5 slots */}
      {tab === 'equipped' && (
        <div className="space-y-3">
          {SLOTS.map((slot) => {
            const item = equippedItems[slot];
            return (
              <div key={slot} className="card flex items-center gap-4">
                <div className="w-32 shrink-0">
                  <span className="text-xs font-mono text-iron-400">{SLOT_LABEL[slot]}</span>
                </div>
                {item ? (
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-iron-100">{item.name}</div>
                    <div className="flex gap-2 mt-1 text-xs font-mono">
                      {item.strBonus  ? <span className="text-red-400">STR+{item.strBonus}</span>  : null}
                      {item.intBonus  ? <span className="text-blue-400">INT+{item.intBonus}</span>  : null}
                      {item.charBonus ? <span className="text-yellow-400">CHA+{item.charBonus}</span> : null}
                      {item.endBonus  ? <span className="text-green-400">END+{item.endBonus}</span>  : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-iron-600 text-sm italic">Empty</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inventory */}
      {tab === 'inventory' && (
        <div className="space-y-3">
          {inventory.length === 0 && (
            <div className="card text-center text-iron-500 py-12">No items in inventory.</div>
          )}
          {inventory.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              actionLabel="Equip"
              disabled={equip.isPending}
              onClick={() => equip.mutate(item.id)}
            />
          ))}
        </div>
      )}

      {/* Shop */}
      {tab === 'shop' && (
        <div className="space-y-3">
          {(shopData?.items ?? []).map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              action="buy"
              actionLabel={`Buy ⚙${item.price}`}
              disabled={buy.isPending}
              onClick={() => buy.mutate(item.id)}
            />
          ))}
          {buy.isError && (
            <div className="text-red-400 text-xs font-mono">{(buy.error as Error).message}</div>
          )}
        </div>
      )}

      {/* Craft */}
      {tab === 'craft' && (
        <div className="space-y-4">
          <p className="text-iron-400 text-sm">Select 2 inventory items to craft a new item. 40% success rate.</p>
          <div className="space-y-2">
            {inventory.map((item) => {
              const selected = craftSource.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setCraftSource((s) =>
                      selected ? s.filter((x) => x !== item.id) : s.length < 2 ? [...s, item.id] : s,
                    )
                  }
                  className={`card cursor-pointer transition-all ${selected ? 'border-gold' : 'hover:border-iron-500'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border-2 shrink-0 ${selected ? 'border-gold bg-gold/20' : 'border-iron-600'}`} />
                    <div>
                      <div className="text-sm font-semibold text-iron-100">{item.name}</div>
                      <div className="text-iron-500 text-xs">{item.slot} · Tier {item.tier}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => craft.mutate(craftSource)}
            disabled={craftSource.length !== 2 || craft.isPending}
            className="btn-primary w-full"
          >
            {craft.isPending ? 'Crafting...' : `Craft (${craftSource.length}/2 selected)`}
          </button>
          {craft.isSuccess && (
            <div className="text-green-400 text-sm font-mono animate-fade-up">Craft result: check inventory!</div>
          )}
          {craft.isError && (
            <div className="text-red-400 text-xs font-mono">{(craft.error as Error).message}</div>
          )}
        </div>
      )}
    </div>
  );
}
