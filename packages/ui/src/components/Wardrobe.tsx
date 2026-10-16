import { copy } from '@irongate/content/copy';
import type { ItemCardView, ItemSlot, OutfitId, WardrobeView } from '@irongate/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import { Picture } from './Picture';
import { BottomSheet } from './Sheets';

/**
 * Slice 8 (screens §2–§5; tech design §12.2): the Wardrobe. Plain props, no tRPC: the Me tab's block
 * (`WardrobeBlock`) with the outfit chips and four slot cards, the item card used everywhere, the
 * slot chooser and the full wardrobe sheet. The server words every item line (`ItemCardView.words`,
 * `kindLine`, the chips' lines); the client never shows a chance or a recognition figure.
 */

const w = copy.life.wardrobe;

/** The four slots, in the block's order. */
export const WARDROBE_SLOTS: readonly ItemSlot[] = ['clothing', 'accessory', 'document', 'utility'];

/** *Charisma 12 · +5 % Party XP · holds up in a run-in* (Charisma first, then the effects in words). */
export function itemEffectLine(item: Pick<ItemCardView, 'cha' | 'words'>): string {
  return [item.cha > 0 ? w.charisma(item.cha) : null, ...item.words].filter(Boolean).join(' · ');
}

/** The small *Keepsake* stamp over a picture's corner. */
function KeepsakeStamp({ small = false }: { small?: boolean }) {
  return (
    <span
      className={cx(
        'label-caps absolute top-1 right-1 -rotate-6 border border-failure bg-paper/90 px-1 leading-tight text-failure',
        small ? 'text-[8px]' : 'text-[10px]',
      )}
      data-testid="keepsake-stamp"
    >
      {w.keepsake}
    </span>
  );
}

export interface ItemCardAction {
  label: string;
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  testId?: string;
}

export interface ItemCardProps {
  item: ItemCardView;
  /** The Courier lines under the effect line: a shop's price, its record surcharge, a lock. */
  lines?: ReadonlyArray<string | null>;
  /** *Charisma 5 → 12* (the chooser only; in ink, never the failure colour: lower is not worse). */
  delta?: string | null;
  /** The one button; or `state`, a Courier word in its place (*Wearing*, *Owned*, *Needs 800 Iron*). */
  action?: ItemCardAction | null;
  state?: string | null;
  /** The sheet's foot line (*Sells for 80 Iron at a market*), never a button. */
  sells?: string | null;
  /** Dimmed (a shop's locked item). */
  dimmed?: boolean;
  /** 200 px in a shop's horizontal scroll; else the grid's half width. */
  fixedWidth?: boolean;
  children?: ReactNode;
  testId?: string;
}

/** Screens §3: the item card (picture, name, kind line, effect line, then the one button or state). */
export function ItemCard({
  item,
  lines = [],
  delta,
  action,
  state,
  sells,
  dimmed,
  fixedWidth,
  children,
  testId = 'item-card',
}: ItemCardProps) {
  const effect = itemEffectLine(item);
  return (
    <article
      className={cx(
        'flex flex-col gap-1.5 border border-ink bg-paper-card p-2',
        fixedWidth ? 'w-[200px] shrink-0 snap-start' : 'min-w-0',
        dimmed && 'opacity-60',
      )}
      aria-label={item.name}
      data-testid={testId}
      data-item={item.itemId}
    >
      <div className="relative aspect-square w-full overflow-hidden border border-ink bg-paper">
        <Picture asset={item.art} sizes="(min-width: 640px) 200px, 164px" decorative className="size-full object-contain" />
        {item.keepsake && <KeepsakeStamp />}
      </div>
      <h4 className="line-clamp-2 font-display text-[16px] leading-tight font-bold" data-testid="item-name">
        {item.name}
      </h4>
      <span className="label-caps text-[10px] text-muted" data-testid="item-kind">
        {item.kindLine}
      </span>
      {effect && (
        <p className="line-clamp-3 font-mono text-[11px] leading-snug" data-testid="item-effect">
          {effect}
        </p>
      )}
      {lines.filter(Boolean).map((l) => (
        <p key={l} className="font-mono text-[11px] leading-snug text-text-2" data-testid="item-price-line">
          {l}
        </p>
      ))}
      {delta && (
        <p className="font-mono text-[11px] leading-snug" data-testid="item-delta">
          {delta}
        </p>
      )}
      {children}
      <div className="mt-auto flex flex-col gap-1">
        {action ? (
          <Button
            className="w-full px-2 text-[12px]"
            onClick={action.onClick}
            pending={action.pending}
            disabled={action.disabled}
            data-testid={action.testId ?? 'item-action'}
          >
            {action.pending ? '…' : action.label}
          </Button>
        ) : state ? (
          <span className="flex min-h-11 items-center font-mono text-[12px] text-muted" data-testid="item-state">
            {state}
          </span>
        ) : null}
        {sells && (
          <span className="font-mono text-[10px] text-muted" data-testid="item-sells">
            {sells}
          </span>
        )}
      </div>
    </article>
  );
}

export interface OutfitChipsProps {
  view: Pick<WardrobeView, 'chips' | 'keep' | 'locked' | 'cha'>;
  onOutfit: (id: OutfitId) => void;
  onKeep: (id: OutfitId) => void;
  /** The outfit (or `keep`) waiting for the server. */
  pending: string | null;
}

/** Screens §2 item 2: Town · Plain clothes · Evening; the worn one inverted; *Keep this as …*. */
export function OutfitChips({ view, onOutfit, onKeep, pending }: OutfitChipsProps) {
  const on = view.chips.find((c) => c.inverted) ?? null;
  const busy = pending !== null;
  const line = view.locked
    ? view.locked === 'out'
      ? w.changeWhenOut
      : w.changeWhenArrive
    : (on?.line ?? w.charisma(view.cha));
  return (
    <div className="flex flex-col gap-1" data-testid="outfit-chips">
      <div className="flex items-center gap-1.5 overflow-x-auto" role="group" aria-label={w.kicker}>
        {view.chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.inverted}
            disabled={!c.enabled || view.locked !== null || busy}
            onClick={() => !c.inverted && onOutfit(c.id)}
            className={cx(
              'label-caps flex min-h-11 shrink-0 flex-col items-center justify-center border-[1.5px] border-ink px-3 text-[11px] whitespace-nowrap',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
              c.inverted ? 'bg-ink text-paper' : 'cursor-pointer bg-transparent text-ink hover:bg-paper-card',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            data-testid={`outfit-${c.id}`}
          >
            <span>{pending === c.id ? '…' : w.outfits[c.id]}</span>
            {c.why === 'payRent' && <span className="font-mono text-[9px] normal-case">{w.payTheRent}</span>}
          </button>
        ))}
        {view.keep && view.locked === null && (
          <button
            type="button"
            onClick={() => onKeep(view.keep!)}
            disabled={busy}
            className="label-caps ml-auto min-h-11 shrink-0 cursor-pointer px-2 text-[11px] font-semibold text-petrol underline decoration-dotted underline-offset-2 disabled:opacity-60"
            data-testid="outfit-keep"
          >
            {pending === 'keep' ? '…' : w.keepAs(w.outfits[view.keep])}
          </button>
        )}
      </div>
      <p className="font-mono text-[11px] text-text-2" data-testid="outfit-line">
        {line}
      </p>
    </div>
  );
}

type SlotView = WardrobeView['slots'][number];

/** Screens §2 item 3: one slot, 72 px; a tap opens the chooser. */
export function SlotCard({ slot, onOpen, disabled }: { slot: SlotView; onOpen: () => void; disabled?: boolean }) {
  const item = slot.item;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-haspopup="dialog"
      className="flex min-h-[72px] w-full cursor-pointer items-center gap-3 border border-ink bg-paper-2 px-2 py-1.5 text-left hover:bg-paper-card disabled:cursor-not-allowed"
      data-testid={`slot-${slot.slot}`}
    >
      <span className="relative size-14 shrink-0 overflow-hidden border border-ink bg-paper">
        {item ? (
          <>
            <Picture asset={item.art} sizes="56px" decorative className="size-full object-contain" />
            {item.keepsake && <KeepsakeStamp small />}
          </>
        ) : (
          <span className="absolute inset-1.5 border border-dashed border-faint" aria-hidden="true" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="label-caps text-[10px] text-muted">{slot.label}</span>
        {item ? (
          <>
            <span className="truncate font-body text-[15px] leading-tight font-semibold" data-testid="slot-item">
              {item.name}
            </span>
            <span className="line-clamp-2 font-mono text-[11px] leading-snug text-text-2">{itemEffectLine(item)}</span>
          </>
        ) : (
          <span className="font-mono text-[12px] text-faint" data-testid="slot-empty">
            {w.nothingTap}
          </span>
        )}
      </span>
      {item && <span className="shrink-0 font-mono text-[11px] text-muted">{w.wearing}</span>}
    </button>
  );
}

export interface WardrobeBlockProps {
  view: WardrobeView;
  onOutfit: (id: OutfitId) => void;
  onKeep: (id: OutfitId) => void;
  onSlot: (slot: ItemSlot) => void;
  onAll: () => void;
  pending: string | null;
  notice?: string | null;
}

/** Screens §2: the Me tab's Wardrobe block (it replaces slice 2's *Wearing* row). */
export function WardrobeBlock({ view, onOutfit, onKeep, onSlot, onAll, pending, notice }: WardrobeBlockProps) {
  return (
    <section
      aria-label={w.kicker}
      className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3"
      data-testid="wardrobe"
    >
      <div className="flex items-center justify-between gap-2">
        <HelpButton notes={[copy.life.help.wardrobe(), copy.life.help.charisma()]} label={`${w.kicker}: what it is`}>
          <h2 className={cx('label-caps text-[11px] font-semibold text-muted', helpMark)}>{w.kicker}</h2>
        </HelpButton>
        <HelpButton notes={[copy.life.help.charisma(), copy.life.help.plainClothes()]} label="What Charisma means">
          <span className={cx('font-mono text-[12px]', helpMark)} data-testid="wardrobe-cha">
            {w.charisma(view.cha)}
          </span>
        </HelpButton>
      </div>
      <OutfitChips view={view} onOutfit={onOutfit} onKeep={onKeep} pending={pending} />
      {notice && (
        <p role="status" className="font-body text-[13px] text-failure" data-testid="wardrobe-notice">
          {notice}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {WARDROBE_SLOTS.map((s) => {
          const slot = view.slots.find((x) => x.slot === s);
          return slot ? <SlotCard key={s} slot={slot} onOpen={() => onSlot(s)} /> : null;
        })}
      </div>
      <button
        type="button"
        onClick={onAll}
        aria-haspopup="dialog"
        className="label-caps min-h-11 cursor-pointer self-start text-[12px] font-semibold text-petrol underline decoration-dotted underline-offset-2"
        data-testid="wardrobe-all"
      >
        {w.everythingYouOwn(view.owned)}
      </button>
    </section>
  );
}

export interface SlotChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: SlotView | null;
  cha: number;
  onWear: (uid: string) => void;
  onTakeOff: (slot: Exclude<ItemSlot, 'clothing'>) => void;
  /** The uid (or `off`) waiting for the server. */
  pending: string | null;
  locked: boolean;
  notice?: string | null;
}

const hintFor = (slot: ItemSlot): string | null =>
  slot === 'clothing' ? null : w.hints[slot as 'accessory' | 'document' | 'utility'];

/** Screens §2.1: the owned items for a slot; one tap wears, the sheet closes, no modal. */
export function SlotChooser({ open, onOpenChange, slot, cha, onWear, onTakeOff, pending, locked, notice }: SlotChooserProps) {
  const busy = pending !== null;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={slot?.label ?? w.kicker}>
      {slot && (
        <div className="flex flex-col gap-3" data-testid="slot-chooser">
          <p className="font-mono text-[12px]" data-testid="chooser-wearing">
            {slot.item ? w.wearingLine(slot.item.name, cha) : w.nothingOn}
          </p>
          {notice && (
            <p role="status" className="font-body text-[13px] text-failure">
              {notice}
            </p>
          )}
          {!slot.item && slot.choices.length === 0 ? (
            <p className="font-body text-[14px] text-text-2" data-testid="chooser-empty">
              {w.nothingYet(hintFor(slot.slot) ?? '')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slot.item && <ItemCard item={slot.item} state={w.wearing} />}
              {slot.choices.map((c) => (
                <ItemCard
                  key={c.uid ?? c.itemId}
                  item={c}
                  delta={w.charismaChange(cha, c.chaAfter)}
                  action={{
                    label: w.wear,
                    onClick: () => c.uid && onWear(c.uid),
                    pending: pending === c.uid,
                    disabled: busy || locked,
                    testId: 'item-wear',
                  }}
                />
              ))}
            </div>
          )}
          {slot.slot !== 'clothing' && slot.item && (
            <button
              type="button"
              onClick={() => onTakeOff(slot.slot as Exclude<ItemSlot, 'clothing'>)}
              disabled={busy || locked}
              className="label-caps min-h-11 cursor-pointer self-start text-[12px] font-semibold text-petrol underline decoration-dotted underline-offset-2 disabled:opacity-60"
              data-testid="chooser-take-off"
            >
              {pending === 'off' ? '…' : w.takeOff}
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

export interface WardrobeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: WardrobeView;
  onOutfit: (id: OutfitId) => void;
  onKeep: (id: OutfitId) => void;
  onWear: (uid: string) => void;
  pending: string | null;
}

const GROUPS: ReadonlyArray<{ id: ItemSlot | 'keepsakes'; label: string }> = [
  { id: 'clothing', label: w.coats },
  { id: 'accessory', label: w.slots.accessory },
  { id: 'document', label: w.slots.document },
  { id: 'utility', label: w.slots.utility },
  { id: 'keepsakes', label: w.keepsakes },
];

/** Screens §5: *Everything you own*: the chips, then the items grouped under thin rules. */
export function WardrobeSheet({ open, onOpenChange, view, onOutfit, onKeep, onWear, pending }: WardrobeSheetProps) {
  const [reading, setReading] = useState<string | null>(null);
  const busy = pending !== null;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={w.everything}>
      <div className="flex flex-col gap-3" data-testid="wardrobe-sheet">
        <OutfitChips view={view} onOutfit={onOutfit} onKeep={onKeep} pending={pending} />
        {GROUPS.map((g) => {
          const items = [...(view.groups[g.id] ?? [])].sort((a, b) => Number(b.worn) - Number(a.worn));
          const hint = g.id === 'keepsakes' ? w.hints.keepsakes : hintFor(g.id);
          return (
            <section key={g.id} aria-label={g.label} className="flex flex-col gap-2" data-testid={`group-${g.id}`}>
              <h3 className="label-caps border-t border-ink pt-1 text-[11px] font-semibold">{g.label}</h3>
              {items.length === 0 ? (
                <p className="font-mono text-[12px] text-muted">
                  {g.id === 'keepsakes' ? hint : w.nothingYet(hint ?? '')}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {items.map((it) => {
                    const key = it.uid ?? it.itemId;
                    const inKeepsakes = g.id === 'keepsakes';
                    const action =
                      inKeepsakes || it.worn
                        ? it.read
                          ? { label: w.read, onClick: () => setReading(reading === key ? null : key), testId: 'item-read' }
                          : null
                        : {
                            label: w.wear,
                            onClick: () => it.uid && onWear(it.uid),
                            pending: pending === it.uid,
                            disabled: busy || view.locked !== null,
                            testId: 'item-wear',
                          };
                    return (
                      <ItemCard
                        key={key}
                        item={it}
                        action={action}
                        state={it.worn ? w.wearing : null}
                        sells={it.sells !== null ? copy.life.shop.sellsFor(it.sells) : null}
                      >
                        {reading === key && it.read && (
                          <p className="font-body text-[13px] leading-snug italic" data-testid="item-read-text">
                            {it.read}
                          </p>
                        )}
                      </ItemCard>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        <p className="font-mono text-[11px] text-muted" data-testid="wardrobe-sellable">
          {w.sellsAtMarket(view.sellable)}
        </p>
      </div>
    </BottomSheet>
  );
}
