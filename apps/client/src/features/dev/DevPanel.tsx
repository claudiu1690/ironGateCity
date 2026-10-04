import { MONTH_NAMES, WEEKDAY_NAMES, dayKey, weekday } from '@irongate/rules';
import type { DevAction, DevRisk, DevStatus } from '@irongate/server/dev';
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
  // Slice 5: *Next run-in* and *Take me to…* read their choices from the status.
  const [runInTarget, setRunInTarget] = useState('random');
  const [gotoTarget, setGotoTarget] = useState('');
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

  const busy = (action: DevAction, target?: string) =>
    act.isPending &&
    (typeof act.variables === 'object'
      ? act.variables.action === action && (target === undefined || act.variables.target === target)
      : act.variables === action);

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
  // Slice 5 (tech design §8.6): Heat, Health, the record, held, the run-in, flags, bars, pressure.
  const risk = status.risk;
  if (risk) {
    rows.push([
      'Heat',
      `${risk.heat.value} · ${risk.heat.state}${risk.heat.coolByUtc ? ` · cool by ${risk.heat.coolByUtc}` : ''}`,
      'dev-heat',
    ]);
    rows.push(['Health', `${risk.health.value} / ${risk.health.max}`, 'dev-health']);
    rows.push([
      'Record',
      `${risk.record.level} · ${risk.record.marks} mark${risk.record.marks === 1 ? '' : 's'}${risk.record.fadesOnUtc ? ` · fade ${risk.record.fadesOnUtc.replace(' 00:00 UTC', '')}` : ''}`,
      'dev-record',
    ]);
    if (risk.held)
      rows.push([
        'Held',
        `${risk.held.kind} · ${risk.held.placeName} · ${risk.held.state === 'in' ? `${risk.held.minutesLeft} min left` : 'released'}${risk.held.bail !== null ? ` · bail ${risk.held.bail} Iron` : ''}`,
        'dev-held',
      ]);
    if (risk.runIn)
      rows.push([
        'Run-in',
        `${risk.runIn.state} · ${risk.runIn.opponent} · decides ${risk.runIn.decidesAtUtc}`,
        'dev-run-in',
      ]);
    if (risk.flags.length > 0) rows.push(['Flags today', risk.flags.join(', '), 'dev-flags']);
    if (risk.barred.length > 0)
      rows.push([
        'Barred',
        risk.barred.map((b) => `${b.cityName} until ${b.untilUtc}`).join(' · '),
        'dev-barred',
      ]);
    if (risk.pressure)
      rows.push([
        'Pressure',
        `${risk.pressure.cityName} · ${risk.pressure.homeFaction} lost ${risk.pressure.lostToday} of ${risk.pressure.cap} today${risk.pressure.rivalGround ? ' · rival ground' : ''}`,
        'dev-pressure',
      ]);
    const street = risk.street;
    if (street)
      rows.push([
        'Next act',
        [
          street.runIn === 'never' ? 'no run-in' : street.runIn === 'next' ? 'a run-in' : null,
          street.opponentId
            ? (risk.opponents.find((o) => o.id === street.opponentId)?.label ?? street.opponentId)
            : null,
          street.checkRoll !== undefined ? `check roll ${street.checkRoll}` : null,
          street.choiceRoll !== undefined ? `choice roll ${street.choiceRoll}` : null,
          street.caught ? `caught ${street.caught}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        'dev-street',
      ]);
  }
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
                pending={
                  act.isPending && typeof act.variables === 'object' && act.variables.action === 'live'
                }
                onClick={() => act.mutate({ action: 'live', target: liveIn })}
                data-testid="dev-live"
              >
                Live there
              </Button>
            </label>
          </div>

          {status.risk && (
            <RiskControls
              risk={status.risk}
              disabled={act.isPending || !status.character}
              busy={busy}
              run={(action, target) => act.mutate(target === undefined ? action : { action, target })}
              runInTarget={runInTarget}
              setRunInTarget={setRunInTarget}
              gotoTarget={gotoTarget || (status.risk.rivalHomes[0]?.cityId ?? '')}
              setGotoTarget={setGotoTarget}
            />
          )}

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

/** A row of small buttons under a caps label (one per value). */
function ChoiceRow({
  label,
  choices,
  disabled,
  busy,
  onPick,
  testId,
}: {
  label: string;
  choices: Array<{ value: string; label: string }>;
  disabled: boolean;
  busy: (value: string) => boolean;
  onPick: (value: string) => void;
  testId: string;
}) {
  return (
    <div className="col-span-2 flex items-center gap-1.5">
      <span className="label-caps w-14 shrink-0 text-[10px] text-muted">{label}</span>
      <div className="grid flex-1 grid-flow-col gap-1">
        {choices.map((c) => (
          <Button
            key={c.value}
            variant="outline"
            className="px-1 text-[12px]"
            disabled={disabled}
            pending={busy(c.value)}
            onClick={() => onPick(c.value)}
            data-testid={`${testId}-${c.value}`}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Slice 5 (tech design §8.6): the risk buttons. Each is one dev action (a test hook's write, then the
 * server's settle); the panel holds no game rule, and the choices come from the status.
 */
function RiskControls({
  risk,
  disabled,
  busy,
  run,
  runInTarget,
  setRunInTarget,
  gotoTarget,
  setGotoTarget,
}: {
  risk: DevRisk;
  disabled: boolean;
  busy: (action: DevAction, target?: string) => boolean;
  run: (action: DevAction, target?: string) => void;
  runInTarget: string;
  setRunInTarget: (v: string) => void;
  gotoTarget: string;
  setGotoTarget: (v: string) => void;
}) {
  const heldIn = risk.held?.state === 'in';
  const pending = risk.runIn?.state === 'pending';
  const small = 'px-2 text-[12px]';
  const select = 'min-h-11 min-w-0 flex-1 border-[1.5px] border-ink bg-paper px-2 font-body text-[13px]';
  return (
    <div className="grid grid-cols-2 gap-1.5 border-t border-paper-2 px-3 pt-2.5 pb-2" data-testid="dev-risk">
      <h3 className="label-caps col-span-2 text-[10px] text-muted">Risk</h3>
      <ChoiceRow
        label="Heat"
        testId="dev-heat"
        choices={['0', '30', '60', '80'].map((v) => ({ value: v, label: v }))}
        disabled={disabled}
        busy={(v) => busy('heat', v)}
        onPick={(v) => run('heat', v)}
      />
      <ChoiceRow
        label="Health"
        testId="dev-health"
        choices={[
          { value: 'full', label: 'Full' },
          { value: 'half', label: 'Half' },
          { value: '10', label: '10' },
        ]}
        disabled={disabled}
        busy={(v) => busy('health', v)}
        onPick={(v) => run('health', v)}
      />
      <ChoiceRow
        label="Record"
        testId="dev-record"
        choices={[
          { value: '0', label: 'Clean' },
          { value: '2', label: '2' },
          { value: '4', label: '4' },
          { value: '7', label: '7' },
        ]}
        disabled={disabled}
        busy={(v) => busy('record', v)}
        onPick={(v) => run('record', v)}
      />
      <label className="col-span-2 flex items-center gap-2">
        <span className="label-caps shrink-0 text-[10px] text-muted">Next run-in</span>
        <select
          value={runInTarget}
          onChange={(e) => setRunInTarget(e.target.value)}
          className={select}
          data-testid="dev-run-in-target"
        >
          <option value="off">Off (no run-in)</option>
          <option value="random">Random</option>
          {risk.opponents.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="px-3 text-[12px]"
          disabled={disabled}
          pending={busy('runIn')}
          onClick={() => run('runIn', runInTarget)}
          data-testid="dev-run-in-set"
        >
          Set
        </Button>
      </label>
      <Button
        variant="outline"
        className={small}
        disabled={disabled}
        pending={busy('caught')}
        onClick={() => run('caught')}
        data-testid="dev-btn-caught"
      >
        Next caught: on
      </Button>
      {pending ? (
        <Button
          className={small}
          disabled={disabled}
          pending={busy('decide')}
          onClick={() => run('decide')}
          data-testid="dev-btn-decide"
        >
          Decide now
        </Button>
      ) : (
        <span />
      )}
      {heldIn ? (
        <Button
          className={cx(small, 'col-span-2')}
          disabled={disabled}
          pending={busy('release')}
          onClick={() => run('release')}
          data-testid="dev-btn-release"
        >
          Release now
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            className={small}
            disabled={disabled}
            pending={busy('cells')}
            onClick={() => run('cells')}
            data-testid="dev-btn-cells"
          >
            Cells now
          </Button>
          <Button
            variant="outline"
            className={small}
            disabled={disabled}
            pending={busy('infirmary')}
            onClick={() => run('infirmary')}
            data-testid="dev-btn-infirmary"
          >
            Infirmary now
          </Button>
        </>
      )}
      <Button
        variant="outline"
        className={small}
        disabled={disabled}
        pending={busy('level6')}
        onClick={() => run('level6')}
        data-testid="dev-btn-level6"
      >
        Level 6
      </Button>
      <Button
        variant="outline"
        className={small}
        disabled={disabled}
        pending={busy('rank3')}
        onClick={() => run('rank3')}
        data-testid="dev-btn-rank3"
      >
        Rank 3
      </Button>
      <label className="col-span-2 flex items-center gap-2">
        <span className="label-caps shrink-0 text-[10px] text-muted">Take me to</span>
        <select
          value={gotoTarget}
          onChange={(e) => setGotoTarget(e.target.value)}
          className={select}
          data-testid="dev-goto-target"
        >
          {risk.rivalHomes.map((c) => (
            <option key={c.cityId} value={c.cityId}>
              {c.cityName}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="px-3 text-[12px]"
          disabled={disabled || heldIn || !gotoTarget}
          pending={busy('goto')}
          onClick={() => run('goto', gotoTarget)}
          data-testid="dev-goto"
        >
          Go
        </Button>
      </label>
      <Button
        variant="outline"
        className={cx(small, 'col-span-2')}
        disabled={disabled || risk.barred.length === 0}
        pending={busy('unbar')}
        onClick={() => run('unbar')}
        data-testid="dev-btn-unbar"
      >
        Lift the bar
      </Button>
    </div>
  );
}
