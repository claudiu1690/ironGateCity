import { copy } from '@irongate/content/copy';
import type { CellsNowRow, FactionId, HeldView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock, formatWhen } from '../format';
import { Button } from './Button';
import { FactionCrest } from './FactionCrest';
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
 * The place's picture with the stamp; the header (the kicker, the minutes, *out in 38 min · or pay bail*
 * and a track that empties); the voice (the duty officer or the matron) and one line; the sentence
 * (*The door opens in 38 min either way…*); the ways out (*Pay bail*, or *Walk out well* and *Discharge yourself*);
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
  const out = formatWhen(h.until, now);
  const busy = pending !== null;
  return (
    <div
      className="relative min-h-full bg-ink min-[960px]:bg-transparent"
      data-testid="held"
      data-kind={h.kind}
      data-state={h.state}
    >
      {/* Tablet: the column over the place's own picture, dimmed (scene art, never a plain ground).
          From 960 px the page is a sheet on the desk (review 4 #3, PaperSheet) and fills it. */}
      {h.art && (
        <div
          className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block min-[960px]:hidden"
          aria-hidden="true"
        >
          <ArtPanel art={h.art} className="absolute inset-0 h-full opacity-60" />
          <div className="absolute inset-0 bg-ink/55" />
        </div>
      )}
      <article className="paper-grain relative mx-auto flex min-h-full max-w-[640px] flex-col bg-paper text-ink sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)] min-[960px]:max-w-none min-[960px]:shadow-none">
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
        {/* Review 4: from 1024 px the floating tab bar needs ~130 px under the last line. */}
        <div className="flex flex-col gap-3 px-4 pt-3 pb-8 lg:pb-[132px]">
          <header className="flex flex-col gap-1">
            <HelpButton
              notes={[cells ? copy.help.cells() : copy.risk.help.infirmary()]}
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
            {cells ? copy.risk.cells.eitherWay(out) : copy.risk.infirmary.eitherWay(out)}
            {/* Review 4 #20 (answers §20.3): the arrest took the day's orders off. */}
            {cells && h.ordersOff && (
              <span className="mt-1 block" data-testid="held-orders-off">
                {copy.risk.cells.ordersOff}
              </span>
            )}
          </p>
          {/* Slice 6 (screens §7.2): an open sign-up is counted before you came in. */}
          {(h.signups ?? []).map((s) => (
            <p key={`${s.eventName}-${s.startsAt}`} className="-mt-1 font-mono text-[11.5px] text-text-2" data-testid="held-signup">
              {copy.together.held.signedUp(s.roleName, `the ${s.event ?? s.eventName.toLowerCase()}`, formatClock(s.startsAt))}
            </p>
          ))}

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
                // Review 4 #17 (answers §17): the line says what it means, and its note says why.
                <HelpButton
                  notes={[copy.help.legalAid()]}
                  label={`${copy.risk.cells.legalAid}: what Legal Aid is`}
                  className="-my-2 self-start"
                >
                  <span
                    className={cx('font-mono text-[11px] text-muted', helpMark)}
                    data-testid="held-legal-aid"
                  >
                    {copy.risk.cells.legalAid}
                  </span>
                </HelpButton>
              )}
              {/* Slice 6 (screens §7.2): a faction mate can post it. */}
              <span className="font-mono text-[11px] text-muted" data-testid="held-bail-mates">
                {copy.together.held.bailFromTab}
              </span>
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
              {/* Slice 6 (screens §7.2): the ward's visitors, each Health +10 and five minutes off. */}
              {(h.visits ?? []).length > 0 && (
                <span className="font-mono text-[11.5px] text-text-2" data-testid="held-visitors">
                  {copy.together.held.visitors((h.visits ?? []).map((v) => v.name).join(', '))}
                </span>
              )}
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

export interface CellsNowCardProps {
  /** The players held here now, soonest out first; undefined while loading. */
  rows: CellsNowRow[] | undefined;
  /** The server's clock now (the caller ticks it). */
  now: number;
  factionNames: Partial<Record<FactionId, string>>;
  className?: string;
  /** Slice 6 (ADR 0078, 0041): *Post bail · {n} Iron* on a faction mate's row opens the favour sheet. */
  onPostBail?: (row: CellsNowRow & { mate: { characterId: string; iron: number } }) => void;
  /** Mates whose bail this session posted (*Posted*). */
  posted?: ReadonlySet<string>;
}

/**
 * Review 4 #19 (answers §19, ADR 0078): *In the cells now* on a police station's sheet, the
 * `JobsCard` pattern. One row per player held here, any party: the avatar, the name, the party's small
 * mark and *out in 24 min*; the viewer's own row reads *you*. Empty: *Nobody. The duty officer is
 * reading.* Read-only until slice 6 (*Post bail* on a faction mate's row).
 */
export function CellsNowCard({ rows, now, factionNames, className, onPostBail, posted }: CellsNowCardProps) {
  const live = (rows ?? []).filter((r) => r.until > now);
  return (
    <section
      aria-label={copy.cellsNow.kicker}
      className={cx('mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card', className)}
      data-testid="cells-now"
    >
      <h3 className="label-caps border-b border-ink px-3 py-1.5 text-[11px] font-semibold">{copy.cellsNow.kicker}</h3>
      {rows === undefined ? (
        <p className="px-3 py-2 font-mono text-[12px] text-muted" role="status">
          …
        </p>
      ) : live.length === 0 ? (
        <p className="px-3 py-2 font-body text-[13.5px] text-text-2 italic" data-testid="cells-now-empty">
          {copy.cellsNow.empty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {live.map((r) => {
            const party = factionNames[r.factionId] ?? r.factionId;
            const out = copy.cellsNow.out(formatWhen(r.until, now));
            return (
              <li
                key={`${r.name}-${r.until}`}
                className="flex min-h-11 items-center gap-2.5 border-b border-dotted border-faint px-3 py-1.5 last:border-b-0"
                data-testid="cells-now-row"
                data-you={r.you || undefined}
              >
                <span className="size-8 shrink-0 overflow-hidden rounded-full border border-ink bg-paper-2" aria-hidden="true">
                  {r.avatar && (
                    <Picture asset={r.avatar} sizes="32px" decorative className="size-full object-cover object-top" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate font-body text-[14px] font-semibold">{r.name}</span>
                  <FactionCrest factionId={r.factionId} size={11} label={party} />
                  {r.you && (
                    <span className="label-caps shrink-0 text-[10px] text-petrol" data-testid="cells-now-you">
                      {copy.cellsNow.you}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="font-mono text-[11.5px] text-text-2">{out}</span>
                  {r.mate && onPostBail && (
                    <button
                      type="button"
                      disabled={posted?.has(r.mate.characterId)}
                      onClick={() => onPostBail({ ...r, mate: r.mate! })}
                      className="label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-2 text-[12px] whitespace-nowrap hover:bg-ink hover:text-paper disabled:cursor-default disabled:border-faint disabled:text-muted disabled:hover:bg-transparent"
                      data-testid="cells-now-bail"
                    >
                      {posted?.has(r.mate.characterId)
                        ? copy.together.favours.posted
                        : copy.together.favours.postBail(r.mate.iron)}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
