import { copy } from '@irongate/content/copy';
import type { HeldView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock } from '../format';
import { Button } from './Button';
import { GroundSash } from './GroundSash';
import type { Ground } from './GroundSash';
import { ArtPanel } from './HallHeader';
import { HelpButton, helpMark } from './Help';
import { Picture } from './Picture';
import { Stamp } from './Stamp';
import { Ticket } from './Ticket';

export type HeldPending = 'bail' | 'walkOut' | 'discharge' | null;

export interface HeldScreenProps {
  held: HeldView;
  /** The server's clock now (the client ticks it once a second). */
  now: number;
  /** Health now (it rises on the ward while you wait). */
  health: { value: number; max: number };
  /** Energy projected to now (the ward's ways out and the one tap cost Energy). */
  energy: { value: number; nextTickAt: number | null };
  onBail: () => void;
  onWalkOut: () => void;
  onDischarge: () => void;
  pending: HeldPending;
  /** The cell's or the ward's one tap (`held.act`). */
  onTap: () => void;
  tapPending?: boolean;
  tapNotice?: string;
  notice?: string | null;
  /** Whose ground the held place is (the sash on its picture). */
  ground?: Ground | null;
  /** *While you wait*: the Paper and the Election rows. */
  children?: ReactNode;
}

/** Whole minutes left, rounded up (*38 minutes*), never below 0. */
export function minutesLeft(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 60_000));
}

/** The voice's one line (screens §6.2, §7.2), by case. */
export function heldVoiceLine(h: Pick<HeldView, 'kind' | 'rivalGround' | 'again'>): string {
  if (h.kind === 'infirmary') return h.again ? copy.risk.matron.again : copy.risk.matron.first;
  if (h.rivalGround) return copy.risk.dutyOfficer.rival;
  return h.again ? copy.risk.dutyOfficer.again : copy.risk.dutyOfficer.home;
}

/**
 * Screens §6–§7: the cells and the infirmary share this screen, in place of the map while you are held.
 * The place's picture with the stamp; the header (the kicker, the minutes, *out at 15:12 · or pay bail*
 * and a track that empties); the voice (the duty officer or the matron) and one line; the sentence
 * (*You can close the game…*); the ways out (*Pay bail*, or *Walk out well* and *Discharge yourself*);
 * the one tap; and *While you wait*. The header, the voice, the sentence and the first button sit above
 * the fold on a 375 × 667 phone. On a desktop it is a 640 px column over the place's picture, dimmed.
 */
export function HeldScreen({
  held: h,
  now,
  health,
  energy,
  onBail,
  onWalkOut,
  onDischarge,
  pending,
  onTap,
  tapPending,
  tapNotice,
  notice,
  ground,
  children,
}: HeldScreenProps) {
  const cells = h.kind === 'cells';
  const left = minutesLeft(h.until, now);
  const total = Math.max(1, h.until - h.since);
  const share = Math.max(0, Math.min(1, (h.until - now) / total));
  const out = formatClock(h.until);
  const busy = pending !== null;
  return (
    <div className="relative min-h-full bg-ink" data-testid="held" data-kind={h.kind} data-state={h.state}>
      {/* Desktop: the column over the place's own picture, dimmed (scene art, never a plain ground). */}
      {h.art && (
        <div
          className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block"
          aria-hidden="true"
        >
          <ArtPanel art={h.art} className="absolute inset-0 h-full opacity-60" />
          <div className="absolute inset-0 bg-ink/55" />
        </div>
      )}
      <article className="paper-grain relative mx-auto flex min-h-full max-w-[640px] flex-col bg-paper text-ink sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]">
        {h.art && (
          <ArtPanel art={h.art} className="h-[112px] sm:h-[150px]">
            <div
              className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.9)_0%,rgb(21_24_26/0)_60%)]"
              aria-hidden="true"
            />
            <div
              className={cx(
                'absolute inset-0 flex items-center',
                ground ? 'justify-start pl-[7%] sm:justify-center sm:pr-[18%] sm:pl-0' : 'justify-center',
              )}
            >
              <Stamp tone="failure" label={cells ? copy.risk.takenIn : copy.risk.carriedOff} />
            </div>
            <span
              className="label-caps absolute bottom-2 left-3 text-[10px] text-dim"
              data-testid="held-place"
            >
              {h.placeName} · {h.cityName}
            </span>
            {ground && <GroundSash ground={ground} />}
          </ArtPanel>
        )}
        <div className="flex flex-col gap-3 px-4 pt-3 pb-8 lg:pb-28">
          <header className="flex flex-col gap-1">
            <HelpButton
              notes={[cells ? copy.risk.help.cells() : copy.risk.help.infirmary()]}
              label={cells ? 'What the cells mean' : 'What the infirmary means'}
              className="-my-2 self-start"
            >
              <span
                className={cx('label-caps text-[10px] font-semibold text-muted', helpMark)}
                data-testid="held-kicker"
              >
                {cells ? copy.risk.cells.kicker(h.placeName) : copy.risk.infirmary.kicker}
              </span>
            </HelpButton>
            <h1 className="font-display text-[22px] leading-none font-black" data-testid="held-minutes">
              {copy.risk.minutes(left)}
            </h1>
            <span className="font-mono text-[12px] text-text-2" data-testid="held-out-at">
              {cells ? copy.risk.cells.outAt(out) : copy.risk.infirmary.outAt(out, health.value, health.max)}
            </span>
            <div
              role="progressbar"
              aria-label={copy.risk.minutes(left)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              className="mt-1 h-0.5 w-full bg-track"
              data-testid="held-track"
            >
              <div
                className="h-0.5 bg-ink transition-[width] duration-1000 ease-linear"
                style={{ width: `${share * 100}%` }}
              />
            </div>
          </header>

          <div className="flex items-start gap-3" data-testid="held-voice">
            {h.voice && (
              <div className="aspect-[4/5] w-12 shrink-0 overflow-hidden border border-ink">
                <Picture asset={h.voice} sizes="48px" className="size-full object-cover object-top" />
              </div>
            )}
            <p className="font-body text-[14.5px] leading-snug italic">{heldVoiceLine(h)}</p>
          </div>

          <p
            className="border-y border-ink py-2 font-body text-[15px] leading-snug"
            data-testid="held-sentence"
          >
            {cells ? copy.risk.cells.youCanClose(out) : copy.risk.infirmary.youCanClose(out)}
          </p>

          {cells && h.bail && (
            <div className="flex flex-col gap-1">
              <Button
                className="w-full"
                onClick={onBail}
                pending={pending === 'bail'}
                disabled={busy || !h.bail.affordable}
                data-testid="held-bail"
              >
                {h.bail.affordable
                  ? copy.risk.cells.payBail(h.bail.total)
                  : copy.risk.needsIron(h.bail.total)}
              </Button>
              {h.rivalGround && (
                <span className="font-mono text-[11px] text-muted" data-testid="held-bail-double">
                  {copy.risk.cells.bailDouble}
                </span>
              )}
              {h.bail.legalAid && (
                <span className="font-mono text-[11px] text-muted" data-testid="held-legal-aid">
                  {copy.risk.cells.legalAid}
                </span>
              )}
            </div>
          )}
          {!cells && h.walkOut && h.discharge && (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={onWalkOut}
                pending={pending === 'walkOut'}
                disabled={busy || !h.walkOut.affordable}
                data-testid="held-walk-out"
              >
                {h.walkOut.affordable
                  ? copy.risk.infirmary.walkOut(h.walkOut.energy, h.walkOut.iron)
                  : energy.value < h.walkOut.energy
                    ? copy.risk.needsEnergy(h.walkOut.energy)
                    : copy.risk.needsIron(h.walkOut.iron)}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={onDischarge}
                pending={pending === 'discharge'}
                disabled={busy || !h.discharge.affordable}
                data-testid="held-discharge"
              >
                {h.discharge.affordable
                  ? copy.risk.infirmary.discharge(h.discharge.energy)
                  : copy.risk.needsEnergy(h.discharge.energy)}
              </Button>
            </div>
          )}
          {notice && (
            <p role="status" className="font-body text-[13px] text-collective" data-testid="held-notice">
              {notice}
            </p>
          )}

          <Ticket
            action={h.tap}
            energy={energy}
            onPerform={() => onTap()}
            pending={tapPending ? 1 : null}
            notice={tapNotice}
          />

          {children && (
            <section aria-label={copy.risk.whileYouWait} className="flex flex-col">
              <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
                {copy.risk.whileYouWait}
              </div>
              {children}
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
