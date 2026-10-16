import type { ItemSlot, OutfitId, WardrobeView } from '@irongate/rules';
import { BuffLine, MinderRow, ResultModal, SlotChooser, WardrobeBlock, WardrobeSheet } from '@irongate/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { usePoliticalAct } from '../council/usePoliticalAct';
import { trpc, trpcClient } from '../../lib/trpc';
import { lifeNotice } from './lifeErrors';

/**
 * Slice 8 phase C, lane P (screens §2, §18.2, §18.5; tech design §12.1): the Me tab's life blocks
 * that lane 1's views feed: the Wardrobe (its chips, four slot cards, the chooser and the full
 * sheet), *Walking with you* and the buff line. Patrons, Where you sleep and Legacy are lane 2's.
 */

/** The Wardrobe block: one tap changes, no modal; the view comes back from every change. */
export function MeWardrobe() {
  const queryClient = useQueryClient();
  const wardrobe = useQuery({ ...trpc.wardrobe.get.queryOptions(), refetchOnMount: 'always' });
  const [slot, setSlot] = useState<ItemSlot | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const busy = useRef(false);

  async function change(label: string, call: () => Promise<WardrobeView>, after?: () => void) {
    if (busy.current) return;
    busy.current = true;
    setPending(label);
    setError(null);
    try {
      const view = await call();
      queryClient.setQueryData(trpc.wardrobe.get.queryKey(), view);
      // Worn Charisma moves the stats block and the Me tab's life line.
      void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.life.pathKey() });
      after?.();
    } catch (e) {
      setError(e);
      void queryClient.invalidateQueries({ queryKey: trpc.wardrobe.get.queryKey() });
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  const view = wardrobe.data;
  if (!view) return null;
  const onOutfit = (id: OutfitId) => void change(id, () => trpcClient.wardrobe.outfit.mutate({ outfit: id }));
  const onKeep = (id: OutfitId) => void change('keep', () => trpcClient.wardrobe.keep.mutate({ outfit: id }));
  const onWear = (uid: string, close?: () => void) =>
    void change(uid, () => trpcClient.wardrobe.wear.mutate({ uid }), close);
  const open = view.slots.find((s) => s.slot === slot) ?? null;
  const notice = error ? (lifeNotice(error) ?? null) : null;
  return (
    <>
      <WardrobeBlock
        view={view}
        onOutfit={onOutfit}
        onKeep={onKeep}
        onSlot={(s) => {
          setError(null);
          setSlot(s);
        }}
        onAll={() => setAllOpen(true)}
        pending={pending}
        notice={slot === null && !allOpen ? notice : null}
      />
      <SlotChooser
        open={slot !== null}
        onOpenChange={(o) => !o && setSlot(null)}
        slot={open}
        cha={view.cha}
        locked={view.locked !== null}
        onWear={(uid) => onWear(uid, () => setSlot(null))}
        onTakeOff={(s) => void change('off', () => trpcClient.wardrobe.takeOff.mutate({ slot: s }), () => setSlot(null))}
        pending={pending}
        notice={slot !== null ? notice : null}
      />
      <WardrobeSheet
        open={allOpen}
        onOpenChange={setAllOpen}
        view={view}
        onOutfit={onOutfit}
        onKeep={onKeep}
        onWear={(uid) => onWear(uid)}
        pending={pending}
      />
    </>
  );
}

/** *Walking with you* (screens §18.2): his row, *Another week* from anywhere, or *Nobody*. */
export function MeMinder() {
  const life = useQuery({ ...trpc.life.me.queryOptions(), refetchOnMount: 'always' });
  const act = usePoliticalAct();
  if (!life.data) return null;
  return (
    <>
      <MinderRow
        minder={life.data.minder}
        onRenew={(weeks) =>
          void act.run(`renew-${weeks}`, (k) => trpcClient.bodyguard.renew.mutate({ weeks, idempotencyKey: k }))
        }
        pending={act.pending}
        notice={act.error ? (lifeNotice(act.error) ?? null) : null}
      />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </>
  );
}

/** Screens §18.5: *Well fed until 19:40 · In good spirits, 2 missions* (absent when neither runs). */
export function MeBuffs({ now }: { now: number }) {
  const life = useQuery({ ...trpc.life.me.queryOptions(), refetchOnMount: 'always' });
  return <BuffLine buffs={life.data?.buffs ?? null} now={now} />;
}
