import { copy } from '@irongate/content/copy';
import { PUSH } from '@irongate/rules';
import type { FamilyView, TargetBarView } from '@irongate/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { ProgressBar } from './ProgressBar';
import { BottomSheet } from './Sheets';

const C = copy.nation.chair;
export const SLOT_LABELS = { A: C.slotA, B: C.slotB, C: C.slotC } as const;

// ---------------------------------------------------------------------------------------------
// The desk's order picker (screens §5.1): the slot's label, the current pick, a chevron; the sheet.
// ---------------------------------------------------------------------------------------------

export interface OrderPickerProps {
  slot: 'A' | 'B' | 'C';
  /** The pick (null: the secretary's rotation). */
  value: FamilyView | null;
  menu: FamilyView[];
  onPick: (family: string | null) => void;
}

export function OrderPicker({ slot, value, menu, onPick }: OrderPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-2 border-b border-dotted border-faint py-2 text-left hover:bg-paper-card"
        data-testid={`order-picker-${slot}`}
        aria-haspopup="dialog"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="label-caps text-[10.5px] text-muted">{SLOT_LABELS[slot]}</span>
          <span className="font-body text-[15px] font-semibold" data-testid="order-picker-value">
            {value?.label ?? C.rotation}
          </span>
        </span>
        <span aria-hidden className="font-label text-[20px]">
          ›
        </span>
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title={SLOT_LABELS[slot]}>
        <ul className="flex flex-col" role="radiogroup" aria-label={SLOT_LABELS[slot]} data-testid={`order-menu-${slot}`}>
          {[{ family: null as string | null, label: C.rotation }, ...menu].map((m) => {
            const on = (value?.family ?? null) === m.family;
            return (
              <li key={m.family ?? 'rotation'}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    onPick(m.family);
                    setOpen(false);
                  }}
                  className={cx(
                    'flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 border-b border-dotted border-faint px-1 py-2 text-left',
                    on && 'bg-paper-card font-semibold',
                  )}
                  data-testid="order-option"
                  data-family={m.family ?? 'rotation'}
                >
                  <span className="font-body text-[14px]">{m.label}</span>
                  {on && <span className="font-label text-[14px]">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The party's target (screens §5.1): *The party's target today · 31 of 50 doors in Eastside*.
// ---------------------------------------------------------------------------------------------

export function TargetBar({ target }: { target: TargetBarView }) {
  const text = C.targetToday(target.count, target.target, target.unit, target.place);
  return (
    <div className="flex flex-col gap-1" data-testid="target-bar" data-met={target.met ? 'true' : 'false'}>
      <span className="font-mono text-[12px]">{text}</span>
      <ProgressBar label={text} value={Math.min(target.count, target.target)} max={target.target} tone="petrol" className="motion-reduce:transition-none" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The push (screens §5.1): a toggle, the place chips, the slot chips, the target chips.
// ---------------------------------------------------------------------------------------------

export interface PushValue {
  slot: 'A' | 'B';
  cityId: string;
  districtId: string | null;
  target: 25 | 50 | 100;
}

export function ToggleChip({
  on,
  onClick,
  children,
  testId,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-3 text-[11px]',
        on ? 'bg-ink text-paper' : 'bg-paper-card text-ink hover:bg-paper-2',
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

export interface PushRowProps {
  value: PushValue | null;
  places: Array<{ cityId: string; districtId: string | null; name: string }>;
  onChange: (v: PushValue | null) => void;
}

export function PushRow({ value, places, onChange }: PushRowProps) {
  const first = places[0];
  return (
    <div className="flex flex-col gap-2 border-y border-dotted border-faint py-2" data-testid="push-row">
      <label className="flex min-h-11 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="size-5 accent-ink"
          checked={!!value}
          disabled={!first}
          onChange={(e) =>
            onChange(e.target.checked && first ? { slot: 'A', cityId: first.cityId, districtId: first.districtId, target: 25 } : null)
          }
          data-testid="push-toggle"
        />
        <span className="font-body text-[14px] font-semibold">{C.push}</span>
      </label>
      {value && (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Where" data-testid="push-places">
            {places.map((p) => (
              <ToggleChip
                key={`${p.cityId}:${p.districtId ?? ''}`}
                on={value.cityId === p.cityId && value.districtId === p.districtId}
                onClick={() => onChange({ ...value, cityId: p.cityId, districtId: p.districtId })}
                testId="push-place"
              >
                {p.districtId ? C.pushIrongate(p.name.replace(/, Irongate$/, '')) : p.name}
              </ToggleChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which order">
            {(['A', 'B'] as const).map((s) => (
              <ToggleChip key={s} on={value.slot === s} onClick={() => onChange({ ...value, slot: s })} testId={`push-slot-${s}`}>
                {s}
              </ToggleChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="The party's target">
            {PUSH.targets.map((t) => (
              <ToggleChip key={t} on={value.target === t} onClick={() => onChange({ ...value, target: t })} testId={`push-target-${t}`}>
                {t}
              </ToggleChip>
            ))}
          </div>
          <p className="font-mono text-[11.5px] text-muted">{C.targetNote}</p>
        </>
      )}
    </div>
  );
}
