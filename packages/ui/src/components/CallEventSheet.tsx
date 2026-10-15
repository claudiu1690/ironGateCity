import { copy } from '@irongate/content/copy';
import type { CallSheetView, EventCallGateView, EventHours, FactionId } from '@irongate/rules';
import { useEffect, useState } from 'react';
import { cx, formatClock } from '../format';
import { Button } from './Button';
import { RoleRow } from './EventPage';
import { BottomSheet } from './Sheets';

/** The call's guard in words, in place of the button (screens §4). */
export function callGuardText(gate: EventCallGateView, cityName: string): string | null {
  if (gate.ok) return null;
  const g = copy.together.call.guards;
  switch (gate.reason) {
    case 'RANK':
      return g.rank(gate.rank3Title);
    case 'HANDS_FULL':
      return g.handsFull(cityName);
    case 'ONE_AT_A_TIME':
      return gate.open ? g.oneAtATime(gate.open.name, formatClock(gate.open.startsAt)) : copy.together.errors.ONE_AT_A_TIME;
    case 'IN_TRANSIT':
      return g.notFromTrain;
    case 'HELD':
      return g.notFromCells;
    case 'RIVAL_GROUND':
      return g.notOnRivalGround;
    case 'RUN_IN_PENDING':
      return g.runIn;
    case 'PATROL_PENDING':
      return g.stop;
    case 'WHERE':
      return copy.together.errors.WRONG_DISTRICT;
  }
}

export interface TimeChipsProps {
  times: CallSheetView['times'];
  value: EventHours;
  onChange: (h: EventHours) => void;
}

/** `TimeChips` (screens §4 step 2): four chips, *In 1 hour* … *In 12 hours*, the local clock under. */
export function TimeChips({ times, value, onChange }: TimeChipsProps) {
  return (
    <div role="radiogroup" aria-label="When" className="grid grid-cols-4 gap-1.5" data-testid="time-chips">
      {times.map((t) => {
        const on = t.hours === value;
        return (
          <button
            key={t.hours}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.hours)}
            className={cx(
              'flex min-h-11 cursor-pointer flex-col items-center justify-center border-[1.5px] border-ink px-1 py-1 text-center',
              on ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-2',
            )}
            data-testid={`time-chip-${t.hours}`}
          >
            <span className="label-caps text-[11px] leading-tight">{copy.together.call.chips[t.hours]}</span>
            <span className="font-mono text-[11px]">{formatClock(t.startsAt)}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface CallEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: CallSheetView | null;
  factionId: FactionId;
  ladder: readonly string[];
  /** Live Energy (projected now). */
  energy: number;
  onCall: (input: { typeId: string; hours: EventHours; roleId: string }) => void;
  pending?: boolean;
  /** A refusal from the server, worded. */
  notice?: string | null;
}

/**
 * `CallEventSheet` (screens §4; Rank 3 and above): step 1, which event (one row per event the
 * faction may call here; a signature event elsewhere dimmed with *go there to call it*); step 2, when
 * and your role (`TimeChips`, the roles with the caller's odds words, *Call it · {Role} · {n} Energy*).
 * Step 3 is the tap: the caller shows the *Called* modal.
 */
export function CallEventSheet({
  open,
  onOpenChange,
  view,
  factionId,
  ladder,
  energy,
  onCall,
  pending = false,
  notice,
}: CallEventSheetProps) {
  const [typeId, setTypeId] = useState<string | null>(null);
  const [hours, setHours] = useState<EventHours>(1);
  const [roleId, setRoleId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) {
      setTypeId(null);
      setHours(1);
      setRoleId(null);
    }
  }, [open]);
  const where = view
    ? view.where.districtName
      ? `${view.where.districtName}, ${view.where.cityName}`
      : view.where.cityName
    : '';
  const option = view?.options.find((o) => o.typeId === typeId) ?? null;
  const role = option?.roles.find((r) => r.roleId === roleId) ?? null;
  const guard = view ? callGuardText(view.gate, view.where.cityName) : null;
  const title = option ? copy.together.call.stepKicker(option.name.toLowerCase(), option.venueName) : copy.together.call.kicker(where);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-3" data-testid="call-sheet" data-step={option ? 2 : 1}>
        {!view ? (
          <p className="font-mono text-[12px] text-muted">…</p>
        ) : !option ? (
          <ul className="flex flex-col" data-testid="call-options">
            {view.options.map((o) => {
              const here = o.here;
              const line = here
                ? copy.together.call.option(o.venueName, o.roles.length, o.energyOfRoles, o.opinionUpTo.toFixed(1))
                : o.goTo
                  ? copy.together.call.goThere(o.goTo.venueName, o.goTo.districtName)
                  : o.venueName;
              const content = (
                <>
                  <span className="font-display text-[16px] leading-tight font-bold">{o.name}</span>
                  <span className="font-mono text-[11px] text-text-2">{line}</span>
                  <span className="font-body text-[13px] leading-snug text-text-2">{o.blurb}</span>
                </>
              );
              return (
                <li key={o.typeId} className="border-b border-dotted border-faint">
                  {here ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTypeId(o.typeId);
                        // One role is required: the first the caller may take is selected.
                        setRoleId(o.roles.find((r) => !r.gate && !!r.forYou)?.roleId ?? null);
                      }}
                      className="flex min-h-14 w-full cursor-pointer flex-col gap-0.5 px-1 py-2 text-left hover:bg-paper-2"
                      data-testid="call-option"
                      data-type-id={o.typeId}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex min-h-14 flex-col gap-0.5 px-1 py-2 opacity-55" data-testid="call-option-elsewhere">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <TimeChips times={view.times} value={hours} onChange={setHours} />
            <div className="flex flex-col" data-testid="call-roles">
              {option.roles.map((r) => (
                <RoleRow
                  key={r.roleId}
                  role={r}
                  factionId={factionId}
                  ladder={ladder}
                  selected={r.roleId === roleId}
                  onSelect={() => setRoleId(r.roleId)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTypeId(null)}
              className="label-caps min-h-11 cursor-pointer self-start text-[12px] text-muted underline-offset-2 hover:underline"
              data-testid="call-back"
            >
              ← {copy.together.call.kicker(where)}
            </button>
          </>
        )}
        {notice && (
          <p className="font-mono text-[12px] text-failure" role="alert" data-testid="call-notice">
            {notice}
          </p>
        )}
        {guard ? (
          <p className="font-mono text-[12px] text-text-2" data-testid="call-guard">
            {guard}
          </p>
        ) : (
          option && (
            <div className="sticky bottom-0 -mx-4 border-t border-track bg-paper px-4 pt-2.5">
              {role && energy < role.energy ? (
                <Button className="w-full" disabled data-testid="call-it">
                  {copy.together.errors.NOT_ENOUGH_ENERGY(role.energy)}
                </Button>
              ) : (
                role && (
                  <Button
                    className="w-full"
                    pending={pending}
                    onClick={() => onCall({ typeId: option.typeId, hours, roleId: role.roleId })}
                    data-testid="call-it"
                  >
                    {copy.together.call.button(role.name, role.energy)}
                  </Button>
                )
              )}
            </div>
          )
        )}
      </div>
    </BottomSheet>
  );
}
