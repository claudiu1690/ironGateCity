import { MONTH_NAMES, WEEKDAY_NAMES, dayKey, weekday } from '@irongate/rules';
import type { DevAction, DevStatus } from '@irongate/server/dev';
import { Button, cx, formatShare } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { noteServerNow, useNow } from '../../lib/useNow';
import { devStatusQuery, postDevAction } from './devApi';

/**
 * The dev time-skip panel (README "Reviewing with the dev panel"): a small floating button that
 * opens a compact sheet to move the shared test clock, run the city day and lift the player, so a
 * reviewer sees a five-day council cycle in minutes. Rendered only when the server says its test
 * hooks are on (memory mode); in any other build or server it renders nothing, and its routes do
 * not exist. It adds no game rule: every number it shows comes from the server.
 */
export function DevPanel() {
  const status = useQuery(devStatusQuery);
  if (!status.data) return null;
  return <DevPanelOn status={status.data} />;
}

const two = (n: number) => String(n).padStart(2, '0');

/** "Thursday 1 Oct 00:01 UTC". */
function utcLine(ms: number): string {
  const d = new Date(ms);
  return `${WEEKDAY_NAMES[weekday(dayKey(ms))]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]!.slice(0, 3)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;
}

/** The same instant in the player's own clock: "Thursday 1 Oct 02:01 (Europe/Bucharest)". */
function localLine(ms: number): string {
  const d = new Date(ms);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  return `${day.replace(',', '')} ${two(d.getHours())}:${two(d.getMinutes())}${zone ? ` (${zone})` : ''}`;
}

/** "1 d 14 h", "3 h 20 min", "5 min". */
function inWords(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

const BUTTONS: Array<{ action: DevAction; label: string; needsCharacter: boolean }> = [
  { action: 'hour', label: '+1 hour', needsCharacter: false },
  { action: 'day', label: 'Next day', needsCharacter: false },
  { action: 'phase', label: 'Skip to next phase', needsCharacter: true },
  { action: 'boost', label: 'Boost me', needsCharacter: true },
  { action: 'energy', label: 'Refill Energy', needsCharacter: true },
  // Slice 4 (tech design §8.7).
  { action: 'monday', label: 'Next Monday', needsCharacter: false },
  { action: 'level10', label: 'Level 10', needsCharacter: true },
  { action: 'irongate', label: 'Take me to Irongate', needsCharacter: true },
];



function DevPanelOn({ status }: { status: DevStatus }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<{ text: string; error: boolean } | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    noteServerNow(status.now);
  }, [status.now]);
  // The clock only moves forward: right after a skip the status is ahead of the last tick.
  const now = Math.max(useNow(15_000), status.now);

  // *Live in…*: the capital's districts the status lists (the server checks the ids), and home.
  const liveTargets = [
    ...(status.capital ?? []).map((d) => ({ target: d.id, label: d.name })),
    { target: 'home', label: 'Home' },
  ];
  const [liveIn, setLiveIn] = useState(liveTargets[0]!.target);
  const act = useMutation({
    mutationFn: postDevAction,
    onSuccess: async (r) => {
      setLine({ text: r.line, error: false });
      noteServerNow(r.status.now);
      queryClient.setQueryData(devStatusQuery.queryKey, r.status);
      // Everything the clock moved: the HUD, the paper, the plate, the council screens.
      await queryClient.invalidateQueries();
    },
    onError: (e) => setLine({ text: e.message, error: true }),
  });

  // Opening refreshes the status; Escape closes and gives focus back to the button.
  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: devStatusQuery.queryKey });
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, queryClient]);

  const home = status.home;
  const council = home?.council ?? null;
  const rows: Array<[string, string, string]> = [
    ['UTC', utcLine(now), 'dev-utc'],
    ['Your clock', localLine(now), 'dev-local'],
    ['City Day', String(status.cityDay), 'dev-city-day'],
  ];
  // Slice 4 (tech design §8.7): where the character is, where they live, the capital and the Issues.
  const where = status.where;
  const onTrain = !!where && 'train' in where;
  if (where)
    rows.push([
      'Where',
      'train' in where
        ? `On the train to ${where.train.toName} · ${where.train.minutesLeft} min left`
        : where.cityName,
      'dev-where',
    ]);
  if (status.residence)
    rows.push([
      'Lives in',
      `${status.residence.districtName ? `${status.residence.districtName}, ` : ''}${status.residence.cityName} · votes from ${status.residence.votesFrom} · stands from ${status.residence.standsFrom} · moves from ${status.residence.canMoveFrom}`,
      'dev-residence',
    ]);
  for (const d of status.capital ?? [])
    rows.push([
      d.name,
      `V ${formatShare(d.shares.vanguard)} · C ${formatShare(d.shares.collective)} · A ${formatShare(d.shares.alliance)}${d.closeRace ? ' · close race' : ''}${d.comeback ? ` · comeback ${d.comeback}` : ''}`,
      `dev-district-${d.id}`,
    ]);
  for (const i of status.issues ?? [])
    rows.push([
      'Issue',
      `${i.name} (${i.placeName}) · V ${i.momentum.vanguard} · C ${i.momentum.collective} · A ${i.momentum.alliance}`,
      `dev-issue-${i.name}`,
    ]);
  if (home) {
    if (council) {
      rows.push([home.cityName, `${council.phaseLabel} · cycle day ${council.cycleDay}`, 'dev-phase']);
      rows.push([
        council.next.phase === 'polls' ? 'Polls open' : 'The count',
        `in ${inWords(council.next.at - now)} · ${council.next.atUtc}`,
        'dev-next',
      ]);
    }
    rows.push([
      'Morale',
      home.morale ? `${home.morale.word} · ${formatShare(home.morale.share)} %` : '—',
      'dev-morale',
    ]);
    rows.push([
      'Ordinance',
      home.ordinance
        ? `${home.ordinance.name}${home.ordinance.daysLeft !== null ? ` · ${home.ordinance.daysLeft} days left` : ''}`
        : 'None in force',
      'dev-ordinance',
    ]);
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        // Kept clear by the city map's first view, like the plate and the dock (CityMap).
        data-map-overlay="dev"
        data-testid="dev-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Dev tools: test clock"
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'fixed top-1/2 right-0 z-20 flex min-h-12 min-w-11 -translate-y-1/2 cursor-pointer flex-col items-center justify-center gap-0.5',
          'border-2 border-r-0 border-dashed border-xp bg-ink px-1.5 text-xp shadow-[0_6px_16px_rgb(0_0_0/0.45)]',
          'hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xp',
          open && 'bg-ink-2',
        )}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5" />
        </svg>
        <span className="label-caps text-[10px] leading-none font-semibold">Dev</span>
      </button>

      {open && (
        <section
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-testid="dev-panel"
          className={cx(
            // Between the HUD and the tab bar, left of the button, so both stay visible (phones);
            // a narrow card on the right on wide screens, clear of the dock.
            'fixed top-[84px] right-[52px] left-2 z-30 flex max-h-[calc(100dvh-164px)] flex-col overflow-y-auto',
            'border-2 border-dashed border-xp bg-paper text-ink shadow-[0_0_0_1px_var(--color-ink),0_12px_30px_rgb(0_0_0/0.5)] outline-none',
            'sm:left-auto sm:w-[360px] lg:top-[76px] lg:max-h-[calc(100dvh-220px)]',
          )}
        >
          <div className="flex items-start gap-2 border-b-2 border-ink bg-ink px-3 py-2 text-paper">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 id={titleId} className="label-caps text-[12px] font-semibold text-xp">
                DEV · test clock
              </h2>
              <p className="font-body text-[12px] leading-snug text-dim">
                The clock is shared by everyone on this local server. Memory mode only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                toggleRef.current?.focus();
              }}
              className="label-caps min-h-11 min-w-11 cursor-pointer border-[1.5px] border-dim px-2 text-[11px] text-dim hover:border-paper hover:text-paper"
            >
              Close
            </button>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 pt-2.5 pb-2">
            {rows.map(([k, v, id]) => (
              <div key={id} className="contents">
                <dt className="label-caps pt-0.5 text-[10px] text-muted">{k}</dt>
                <dd className="font-mono text-[12.5px] leading-snug" data-testid={id}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {!status.character && (
            <p className="px-3 pb-2 font-body text-[12px] text-muted">
              Finish the arrival to skip phases, boost or refill.
            </p>
          )}

          <div className="grid grid-cols-2 gap-1.5 border-t border-paper-2 px-3 pt-2.5 pb-2">
            {/* Slice 4: on a train, Arrive now first. */}
            {onTrain && (
              <Button
                className="col-span-2 px-2 text-[12px]"
                disabled={act.isPending}
                pending={act.isPending && act.variables === 'arrive'}
                onClick={() => act.mutate('arrive')}
                data-testid="dev-arrive"
              >
                Arrive now
              </Button>
            )}
            {BUTTONS.map((b) => (
              <Button
                key={b.action}
                variant={b.action === 'phase' ? 'primary' : 'outline'}
                className={cx('px-2 text-[12px]', b.action === 'phase' && 'col-span-2')}
                disabled={act.isPending || (b.needsCharacter && !status.character)}
                pending={act.isPending && act.variables === b.action}
                onClick={() => act.mutate(b.action)}
                data-testid={`dev-btn-${b.action}`}
              >
                {b.label}
              </Button>
            ))}
            <label className="col-span-2 flex items-center gap-2">
              <span className="label-caps shrink-0 text-[10px] text-muted">Live in</span>
              <select
                value={liveIn}
                onChange={(e) => setLiveIn(e.target.value)}
                className="min-h-11 min-w-0 flex-1 border-[1.5px] border-ink bg-paper px-2 font-body text-[13px]"
                data-testid="dev-live-target"
              >
                {liveTargets.map((o) => (
                  <option key={o.target} value={o.target}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                className="px-3 text-[12px]"
                disabled={act.isPending || !status.character}
                pending={act.isPending && typeof act.variables === 'object' && act.variables.action === 'live'}
                onClick={() => act.mutate({ action: 'live', target: liveIn })}
                data-testid="dev-live"
              >
                Live there
              </Button>
            </label>
          </div>

          <p
            role="status"
            aria-live="polite"
            data-testid="dev-line"
            className={cx(
              'min-h-11 border-t border-paper-2 px-3 py-2 font-mono text-[12px] leading-snug',
              line?.error ? 'text-failure' : 'text-text-2',
            )}
          >
            {act.isPending
              ? 'Working…'
              : (line?.text ?? 'Each action refreshes the HUD, the paper and the map.')}
          </p>
        </section>
      )}
    </>
  );
}
