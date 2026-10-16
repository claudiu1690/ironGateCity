import { copy } from '@irongate/content/copy';
import { DOSSIER } from '@irongate/rules';
import type {
  DossierEntryView,
  DossierFileView,
  DossierInformantView,
  DossierNameView,
  DossierView,
  ExposeView,
  StationCardView,
} from '@irongate/rules';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { Button } from './Button';
import { Chip } from './Chip';
import { FactionCrest } from './FactionCrest';
import { ArtPanel } from './HallHeader';
import { HelpButton, helpMark } from './Help';
import { weekdayOf } from './Capital';
import { BottomSheet } from './Sheets';

/**
 * Slice 8 phase C, lane Q (screens §6, §6.3, §7): the Dossier tab, its name cards, Case Files and
 * informants, the station's card and sheet, and the exposé's two steps. Plain props, no tRPC; the
 * server words every line and decides every gate (the client never shows a chance).
 */

export type DossierTabId = 'names' | 'files' | 'informants';

/** The three-segment clock (the Citizen Sleeper borrowing): ink for fresh, half for stale. */
export function ClockGlyph({
  clock,
  size = 14,
  label,
}: {
  clock: ReadonlyArray<'fresh' | 'stale' | 'empty'>;
  size?: number;
  label?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-[2px]"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="clock"
      data-clock={clock.join(',')}
    >
      {clock.map((s, i) => (
        <span
          key={i}
          className={cx(
            'block border border-ink',
            s === 'fresh' ? 'bg-ink' : s === 'stale' ? 'bg-[linear-gradient(90deg,var(--color-ink)_50%,transparent_50%)]' : 'bg-transparent',
          )}
          style={{ width: Math.round(size * 0.7), height: size }}
        />
      ))}
    </span>
  );
}

/** The tab's header band (screens §6.1): the newsroom's crop, the kicker and the count line. */
export function DossierHeader({ view }: { view: DossierView }) {
  return (
    <header className="relative flex h-[120px] shrink-0 flex-col justify-end overflow-hidden bg-ink text-paper">
      {view.art && (
        <div className="absolute inset-0">
          <ArtPanel art={{ rung: 'scene', asset: view.art }} className="size-full" />
        </div>
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.92)_0%,rgb(21_24_26/0.25)_70%)]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-0.5 px-4 pb-2.5">
        <HelpButton notes={[copy.life.help.dossier()]} label="What the Dossier is" className="self-start">
          <h1 className={cx('label-caps text-[12px] font-semibold text-paper', helpMark)}>{copy.life.dossier.title}</h1>
        </HelpButton>
        <p className="font-mono text-[12px] text-dim" data-testid="dossier-header">
          {view.header}
        </p>
        {view.full && (
          <p className="font-mono text-[12px] text-failure" data-testid="dossier-full">
            {copy.life.dossier.full}
          </p>
        )}
      </div>
    </header>
  );
}

/** The strip of three chips (the Faction tab's pattern). */
export function DossierChips({ tab, onTab }: { tab: DossierTabId; onTab: (t: DossierTabId) => void }) {
  const ids: DossierTabId[] = ['names', 'files', 'informants'];
  return (
    <div role="tablist" aria-label={copy.life.dossier.title} className="flex gap-2 overflow-x-auto" data-testid="dossier-chips">
      {ids.map((id) => (
        <Chip key={id} tab on={tab === id} onClick={() => onTab(id)} testId={`dossier-chip-${id}`}>
          {copy.life.dossier.chips[id]}
        </Chip>
      ))}
    </div>
  );
}

const categoryWord = (c: string) =>
  (copy.life.dossier.category as Record<string, string>)[c] ?? copy.life.dossier.category.neutral;
const sourceWord = (s: string) => copy.life.dossier.sources[s] ?? s;
const weightWord = (w: number) => (Number.isInteger(w) ? String(w) : w.toFixed(1));

/** One entry under a name (screens §6.1): the category, the line, the source and the day. */
export function EntryRow({ entry }: { entry: DossierEntryView }) {
  const weekday = weekdayOf(entry.day);
  return (
    <li className="flex flex-col gap-0.5 border-t border-dotted border-faint py-1.5" data-testid="entry-row" data-fresh={entry.fresh}>
      <span className="label-caps text-[10px] text-muted">{categoryWord(entry.category)}</span>
      <span className="font-body text-[14px] leading-snug">{entry.line}</span>
      <span className="font-mono text-[11px] text-muted">
        {entry.fresh
          ? copy.life.dossier.entryLine(sourceWord(entry.source), weekday)
          : copy.life.dossier.entryStale(sourceWord(entry.source), weekday)}
      </span>
    </li>
  );
}

/** A name with at least one entry (screens §6.1): the crest, the count and the clock, the entries. */
export function NameCard({
  name,
  factionName,
  onBind,
  pending,
  notice,
}: {
  name: DossierNameView;
  factionName: string | null;
  onBind?: () => void;
  pending?: boolean;
  notice?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? name.entries : name.entries.slice(0, 2);
  const more = name.entries.length - shown.length;
  const full = name.clock.every((s) => s !== 'empty');
  return (
    <article
      className="flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper-card px-3 py-2.5"
      aria-label={name.name}
      data-testid="name-card"
      data-subject={name.subjectId}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
          {name.factionId ? <FactionCrest factionId={name.factionId} size={20} label={factionName ?? undefined} /> : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-body text-[15px] font-semibold">{name.name}</span>
          <span className="font-mono text-[11.5px] text-muted">
            {[factionName, name.city, name.district].filter(Boolean).join(' · ')}
          </span>
        </div>
        <ClockGlyph clock={name.clock} label={copy.life.dossier.nameLine(name.entries.length, weightWord(name.weight))} />
      </div>
      <span className="font-mono text-[12px]" data-testid="name-count">
        {copy.life.dossier.nameLine(name.entries.length, weightWord(name.weight))}
      </span>
      {name.burned && (
        <span className="font-mono text-[12px] text-petrol" data-testid="name-burned">
          {copy.life.dossier.burned(weekdayOf(name.burned.until - DOSSIER.burnDays), DOSSIER.burnDays)}
        </span>
      )}
      <ul className="flex flex-col">
        {shown.map((e) => (
          <EntryRow key={e.id} entry={e} />
        ))}
      </ul>
      {more > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label-caps min-h-11 cursor-pointer self-start text-[11px] text-petrol underline decoration-dotted underline-offset-2"
          data-testid="name-more"
        >
          {copy.life.dossier.andMore(more)}
        </button>
      )}
      {full && name.canBind && onBind ? (
        <Button className="w-full whitespace-nowrap" onClick={onBind} pending={pending} data-testid="make-case-file">
          {copy.life.dossier.makeCaseFile}
        </Button>
      ) : full && name.why ? (
        <span className="font-mono text-[11.5px] text-muted" data-testid="name-why">
          {name.why}
        </span>
      ) : null}
      {notice && (
        <p role="status" className="font-mono text-[12px] text-collective">
          {notice}
        </p>
      )}
    </article>
  );
}

function TextAction({
  label,
  onClick,
  disabled,
  pending,
  under,
  testId,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  pending?: boolean;
  under?: ReactNode;
  testId: string;
}) {
  return (
    <div className="flex flex-col border-t border-dotted border-faint pt-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending || !onClick}
        aria-busy={pending || undefined}
        className="label-caps min-h-11 cursor-pointer self-start text-left text-[12px] text-ink underline decoration-dotted underline-offset-2 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        data-testid={testId}
      >
        {label}
      </button>
      {under && <span className="font-mono text-[11.5px] text-muted">{under}</span>}
    </div>
  );
}

/** A Case File (screens §6.1): the kinds as chips, all the lines, the three uses the rules allow. */
export function CaseFileCard({
  file,
  factionName,
  onPrint,
  onSell,
  onTurn,
  pending,
  notice,
}: {
  file: DossierFileView;
  factionName: string | null;
  onPrint?: () => void;
  onSell?: () => void;
  onTurn?: () => void;
  pending?: 'turn' | null;
  notice?: string | null;
}) {
  return (
    <article
      className="flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper-card px-3 py-2.5"
      aria-label={copy.life.dossier.fileRow(file.name)}
      data-testid="case-file"
      data-file={file.id}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
          {file.factionId ? <FactionCrest factionId={file.factionId} size={20} label={factionName ?? undefined} /> : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-body text-[15px] font-semibold">{file.name}</span>
          <span className="font-mono text-[11.5px] text-muted">{[factionName, file.city].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" data-testid="case-file-kinds">
        {file.kinds.map((k) => (
          <span key={k} className="label-caps border border-ink px-1.5 py-0.5 text-[10px]">
            {categoryWord(k)}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {file.lines.map((l, i) => (
          <li key={i} className="font-body text-[14px] leading-snug">
            {l}
          </li>
        ))}
      </ul>
      {file.status === 'attached' ? (
        <span className="font-mono text-[12px] text-petrol" data-testid="case-file-in-use">
          {copy.life.dossier.inUse}
        </span>
      ) : (
        <>
          <TextAction
            label={copy.life.dossier.takeToPaper}
            onClick={file.print.ok ? onPrint : undefined}
            disabled={!file.print.ok}
            under={
              file.print.ok
                ? file.print.nearest
                  ? copy.life.dossier.atPlace(file.print.nearest.name)
                  : copy.life.dossier.whereToPrint
                : file.print.why
            }
            testId="case-file-print"
          />
          <TextAction
            label={copy.life.dossier.sellFile}
            onClick={onSell}
            under={file.sell.nearest ? copy.life.dossier.atPlace(file.sell.nearest.name) : copy.life.dossier.atAStation}
            testId="case-file-sell"
          />
          <TextAction
            label={copy.life.dossier.recruit}
            onClick={file.turn.ok ? onTurn : undefined}
            disabled={!file.turn.ok}
            pending={pending === 'turn'}
            under={file.turn.ok ? null : file.turn.why}
            testId="case-file-turn"
          />
        </>
      )}
      {notice && (
        <p role="status" className="font-mono text-[12px] text-collective">
          {notice}
        </p>
      )}
    </article>
  );
}

/** An informant (screens §6.1): the name, the city, the days left and the next report. */
export function InformantRow({ informant }: { informant: DossierInformantView }) {
  return (
    <li className="flex flex-col gap-0.5 border-b border-dotted border-faint py-2" data-testid="informant-row">
      <span className="font-body text-[15px] font-semibold">
        {informant.name} · {informant.city}
      </span>
      <span className="font-mono text-[12px]">
        {copy.life.dossier.informantLine(informant.daysLeft, informant.next !== null ? weekdayOf(informant.next) : '—')}
      </span>
      {informant.last && <span className="font-body text-[13px] text-text-2">{informant.last}</span>}
    </li>
  );
}

/** The tab's body under the chips (screens §6.1, §15's empty states). */
export function DossierList({
  view,
  tab,
  level,
  factionNames,
  onBind,
  bindPending,
  onPrint,
  onSell,
  onTurn,
  turnPending,
  notice,
}: {
  view: DossierView;
  tab: DossierTabId;
  level: number;
  factionNames: Partial<Record<string, string>>;
  onBind: (subjectId: string) => void;
  bindPending: string | null;
  onPrint: (file: DossierFileView) => void;
  onSell: (file: DossierFileView) => void;
  onTurn: (file: DossierFileView) => void;
  turnPending: string | null;
  notice: { id: string; text: string } | null;
}) {
  const empty = (text: string, testId: string) => (
    <p className="py-6 text-center font-body text-[14px] text-text-2" data-testid={testId}>
      {text}
    </p>
  );
  if (tab === 'names') {
    if (view.names.length === 0) return empty(copy.life.dossier.empty.names, 'dossier-empty');
    return (
      <div className="flex flex-col gap-2.5" data-testid="dossier-names">
        {view.names.map((n) => (
          <NameCard
            key={n.subjectId}
            name={n}
            factionName={n.factionId ? (factionNames[n.factionId] ?? null) : null}
            onBind={() => onBind(n.subjectId)}
            pending={bindPending === n.subjectId}
            notice={notice?.id === n.subjectId ? notice.text : null}
          />
        ))}
      </div>
    );
  }
  if (tab === 'files') {
    if (view.caseFiles.length === 0)
      return empty(level < 16 ? copy.life.dossier.empty.filesEarly : copy.life.dossier.empty.files, 'dossier-empty');
    return (
      <div className="flex flex-col gap-2.5" data-testid="dossier-files">
        {view.caseFiles.map((f) => (
          <CaseFileCard
            key={f.id}
            file={f}
            factionName={f.factionId ? (factionNames[f.factionId] ?? null) : null}
            onPrint={() => onPrint(f)}
            onSell={() => onSell(f)}
            onTurn={() => onTurn(f)}
            pending={turnPending === f.id ? 'turn' : null}
            notice={notice?.id === f.id ? notice.text : null}
          />
        ))}
      </div>
    );
  }
  if (view.informants.length === 0) return empty(copy.life.dossier.empty.informants, 'dossier-empty');
  return (
    <div className="flex flex-col">
      <ul data-testid="dossier-informants">
        {view.informants.map((i) => (
          <InformantRow key={i.id} informant={i} />
        ))}
      </ul>
      <span className="pt-1 font-mono text-[11.5px] text-muted">{copy.life.dossier.twoAtMost}</span>
    </div>
  );
}

/** The station's card (screens §6.3): *The man by the left-luggage*, a JobsCard-style block. */
export function StationSellCard({ station, onOpen }: { station: StationCardView; onOpen: () => void }) {
  return (
    <section aria-label={station.kicker} className="mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card" data-testid="station-card">
      <h3 className="label-caps border-b border-ink px-3 py-1.5 text-[11px] font-semibold">{station.kicker}</h3>
      <div className="flex flex-col gap-2 px-3 py-2">
        <p className="font-mono text-[12px] text-text-2">{station.line}</p>
        {station.rows.length > 0 ? (
          <Button variant="outline" className="w-full" onClick={onOpen} data-testid="station-sell-open">
            {copy.life.dossier.station.sell}
          </Button>
        ) : (
          <p className="font-mono text-[12px] text-muted" data-testid="station-nothing">
            {copy.life.dossier.station.nothing}
          </p>
        )}
      </div>
    </section>
  );
}

/** The station's sheet (screens §6.3): every file and entry with its price, a one-line confirm each. */
export function StationSellSheet({
  open,
  onOpenChange,
  station,
  onSell,
  pendingId,
  notice,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  station: StationCardView;
  onSell: (id: string) => void;
  pendingId: string | null;
  notice?: string | null;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <BottomSheet open={open} onOpenChange={(o) => (setConfirm(null), onOpenChange(o))} title={copy.life.dossier.station.kicker}>
      {station.rows.length === 0 ? (
        <p className="font-body text-[14px]">{copy.life.dossier.station.nothing}</p>
      ) : (
        <ul className="flex flex-col" data-testid="station-rows">
          {station.rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 border-b border-dotted border-faint py-2" data-testid="station-row" data-kind={r.kind}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-body text-[14px] font-semibold">{r.name}</span>
                  <span className="truncate font-mono text-[11.5px] text-muted">{r.line}</span>
                </span>
                {confirm !== r.id && (
                  <Button variant="outline" onClick={() => setConfirm(r.id)} data-testid="station-row-sell">
                    {copy.life.dossier.station.sellRow(r.price)}
                  </Button>
                )}
              </div>
              {confirm === r.id && (
                <div className="flex flex-col gap-2" data-testid="station-confirm">
                  <span className="font-body text-[14px]">
                    {copy.life.dossier.sellConfirm(r.kind === 'file' ? copy.life.dossier.fileRow(r.name) : r.line, r.price)}
                  </span>
                  <div className="flex gap-2">
                    <Button className="flex-1" pending={pendingId === r.id} onClick={() => onSell(r.id)} data-testid="station-confirm-sell">
                      {copy.life.shop.sell}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>
                      {copy.life.dossier.keepIt}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <p role="status" className="font-mono text-[12px] text-collective">
          {notice}
        </p>
      )}
    </BottomSheet>
  );
}

/** The press place's ticket (screens §7): *Take a Case File to the paper · 20 Energy*. */
export function ExposeTicket({ refusal, onOpen }: { refusal: string | null; onOpen: () => void }) {
  return (
    <section
      aria-label={copy.life.expose.ticket}
      className={cx('flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper-card px-3 py-2.5', refusal && 'opacity-70')}
      data-testid="expose-ticket"
    >
      <span className="label-caps text-[10px] text-muted">{copy.life.expose.tag}</span>
      <Button className="w-full" disabled={!!refusal} onClick={onOpen} data-testid="expose-open">
        {copy.life.expose.ticket}
      </Button>
      {refusal && (
        <span className="font-mono text-[12px] text-muted" data-testid="expose-refusal">
          {refusal}
        </span>
      )}
    </section>
  );
}

/**
 * The exposé (screens §7; ADR 0013's shape): step 1, the file as radio rows and the two angles (one
 * tap on an angle commits both); step 2, the editor's desk with the three ways and the CTA. The
 * result is the action modal (`kind: 'expose'`).
 */
export function ExposeStory({
  view,
  onChoose,
  onAttempt,
  pending,
  error,
  onBack,
}: {
  view: ExposeView;
  onChoose: (fileId: string, angle: 'plain' | 'headline') => void;
  onAttempt: (wayId: 'write' | 'talk' | 'legwork') => void;
  pending: boolean;
  error?: string | null;
  onBack?: () => void;
}) {
  const [file, setFile] = useState<string | null>(null);
  const [way, setWay] = useState<'write' | 'talk' | 'legwork' | null>(null);
  const fileId = file ?? view.files[0]?.id ?? null;
  return (
    <section
      aria-label={view.title}
      className="mx-auto flex w-full max-w-[640px] flex-col bg-paper lg:my-6 lg:shadow-[0_0_0_1px_var(--color-ink)]"
      data-testid="expose-screen"
      data-step={view.step}
    >
      <div className="relative h-[132px] shrink-0 overflow-hidden bg-ink [@media(max-height:700px)]:h-[104px]">
        {view.art && (
        <div className="absolute inset-0">
          <ArtPanel art={{ rung: 'scene', asset: view.art }} className="size-full" />
        </div>
      )}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.92)_0%,rgb(21_24_26/0.15)_65%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 pb-2.5 text-paper">
          <span className="label-caps text-[10px] text-dim" data-testid="expose-kicker">
            {view.kicker}
          </span>
          <h1 className="font-display text-[24px] leading-[1.05] font-black">{view.title}</h1>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
        {view.narrative && <p className="font-body text-[14.5px] leading-snug text-text-2">{view.narrative}</p>}
        {view.refusal && (
          <p className="font-mono text-[12.5px] text-failure" role="status" data-testid="expose-screen-refusal">
            {view.refusal}
          </p>
        )}
        {view.step === 1 && view.files.length > 0 && !view.refusal && (
          <>
            <div role="radiogroup" aria-label={copy.life.dossier.chips.files} className="flex flex-col gap-1.5">
              {view.files.map((f) => {
                const on = f.id === fileId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFile(f.id)}
                    className={cx(
                      'flex min-h-14 cursor-pointer items-center justify-between gap-3 border-[1.5px] px-3 py-2 text-left',
                      on ? 'border-ink bg-paper-card' : 'border-faint',
                    )}
                    data-testid="expose-file"
                  >
                    <span className="flex flex-col">
                      <span className="font-body text-[15px] font-semibold">{f.name}</span>
                      <span className="font-mono text-[11.5px] text-muted">
                        {f.party} · {copy.life.expose.lines(f.lines)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cx('size-4 shrink-0 rounded-full border-[1.5px] border-ink', on && 'bg-ink')}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              {view.angles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={pending || !fileId}
                  onClick={() => fileId && onChoose(fileId, a.id)}
                  className="flex min-h-14 cursor-pointer flex-col items-start gap-0.5 border-[1.5px] border-ink px-3 py-2 text-left hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="expose-angle"
                  data-angle={a.id}
                >
                  <span className="font-display text-[17px] font-bold">{a.text}</span>
                  <span className="font-body text-[13px] italic">{a.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {view.step === 2 && view.chosen && (
          <>
            <p className="font-mono text-[12px] text-muted" data-testid="expose-chosen">
              {view.chosen.name} · {view.angles.find((a) => a.id === view.chosen!.angle)?.text}
            </p>
            <div role="radiogroup" aria-label={view.title} className="flex flex-col gap-1.5">
              {view.ways.map((w) => {
                const on = way === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setWay(w.id)}
                    className={cx(
                      'flex min-h-14 cursor-pointer flex-col items-start gap-0.5 border-[1.5px] px-3 py-2 text-left',
                      on ? 'border-ink bg-ink text-paper' : 'border-ink',
                    )}
                    data-testid="expose-way"
                    data-way={w.id}
                  >
                    <span className="font-display text-[16px] font-bold">{w.text}</span>
                    <span className="font-mono text-[11.5px]">{w.odds}</span>
                  </button>
                );
              })}
            </div>
            {view.cta && (
              <div className="sticky bottom-0 -mx-4 border-t border-track bg-paper px-4 pt-2 pb-2">
                <Button
                  className="w-full"
                  disabled={!way || !view.cta.ok}
                  pending={pending}
                  onClick={() => way && onAttempt(way)}
                  data-testid="expose-cta"
                >
                  {view.cta.label}
                </Button>
                {!view.cta.ok && view.cta.why && (
                  <p className="pt-1 font-mono text-[12px] text-muted">{view.cta.why}</p>
                )}
              </div>
            )}
          </>
        )}
        {error && (
          <p role="status" className="font-mono text-[12px] text-collective" data-testid="expose-error">
            {error}
          </p>
        )}
        {onBack && (
          <Button variant="outline" className="self-start" onClick={onBack} data-testid="expose-back">
            {copy.life.dossier.title}
          </Button>
        )}
      </div>
    </section>
  );
}
