import { copy } from '@irongate/content/copy';
import { WEEKDAY_NAMES, weekday } from '@irongate/rules';
import type { AssetView, DayKey, FactionId, LadderView, Office, OfficeCardView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { HelpButton, helpMark } from './Help';
import { MapCrop } from './HallHeader';
import { PersonMark } from './PersonMark';
import { Picture } from './Picture';

/**
 * Slice 7 (docs/design/slice-7-screens.md §3, §4.1): the Me tab's `OfficeCard`s and `LadderCard`, and
 * the Governor's page header (`OfficeHeader`: the council's hall crop, the kicker, the holder). Plain
 * props; the server decides who holds what and what each rung needs.
 */

const M = copy.nation.me;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A day key as *Thursday*. */
export const officeWeekday = (d: DayKey): string => WEEKDAY_NAMES[weekday(d)];
/** A day key as *Thursday 22 October*. */
export function officeDate(d: DayKey): string {
  const t = new Date(d * 86_400_000);
  return `${officeWeekday(d)} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
}

/**
 * An office card's line under its title (screens §3): *term ends Thursday · 20 Political Capital and
 * 30 Party XP a day* / *until Thursday 12 November* / *until … · second term*.
 */
export function officeCardLine(o: OfficeCardView): string {
  const last = o.until - 1;
  const pay = `${o.pay.pc} Political Capital and ${o.pay.fxp} Party XP a day`;
  switch (o.office) {
    case 'governor':
    case 'council':
      return `term ends ${officeWeekday(last)} · ${pay}`;
    case 'chair':
    case 'deputy':
      return `until ${officeDate(last)} · ${pay}`;
    case 'president':
      return `until ${officeDate(last)} · ${o.consecutive === 2 ? 'second' : 'first'} term · ${pay}`;
  }
}

export interface OfficeCardProps {
  office: OfficeCardView;
  /** A tap: the office page (`office.route`). */
  onOpen: (route: string) => void;
}

/** Screens §3: one card per office held; kicker *OFFICE*; a tap opens the office page. */
export function OfficeCard({ office: o, onOpen }: OfficeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(o.route)}
      className="flex min-h-14 w-full cursor-pointer flex-col items-start gap-1 border-[1.5px] border-ink bg-paper-card px-3 py-2.5 text-left hover:bg-paper-2"
      data-testid="office-card"
      data-office={o.office}
    >
      <span className="label-caps text-[10px] text-muted">{copy.nation.bar.office}</span>
      <span className="font-body text-[15px] font-semibold">{o.title}</span>
      <span className="font-mono text-[11.5px] text-text-2">{officeCardLine(o)}</span>
    </button>
  );
}

const RUNG: Record<Office, string> = {
  council: M.councilDone,
  governor: M.governorRung,
  chair: M.chairRung,
  deputy: M.parliamentRung,
  president: M.presidentRung,
};

/** A ladder row's second line: what the rung still needs, or when its names go in. */
function rungNote(r: LadderView['rows'][number], councilDone: boolean): string | null {
  if (r.office === 'council') return null;
  if (r.office === 'governor') return councilDone ? `✓ · ${M.standNextCount}` : null;
  if (r.need) return r.need;
  return r.opensOn !== undefined ? `✓ · ${M.namesFrom(officeDate(r.opensOn))}` : '✓';
}

export interface LadderCardProps {
  ladder: LadderView;
}

/** Screens §3: *THE LADDER*, five rows with a tick or a dash; every row says what the next rung needs. */
export function LadderCard({ ladder }: LadderCardProps) {
  const councilDone = ladder.rows.find((r) => r.office === 'council')?.done ?? false;
  return (
    <section
      className="flex flex-col gap-1 border-[1.5px] border-ink bg-paper-card px-3 py-2.5"
      data-testid="ladder-card"
    >
      <HelpButton
        notes={[copy.nation.help.ladder()]}
        label={`What ${M.ladder} means`}
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] text-muted', helpMark)}>{M.ladder}</span>
      </HelpButton>
      <ul className="flex flex-col">
        {ladder.rows.map((r) => {
          const note = rungNote(r, councilDone);
          return (
            <li
              key={r.office}
              className="flex min-h-11 items-start justify-between gap-3 border-b border-dotted border-faint py-1.5 last:border-b-0"
              data-testid="ladder-row"
              data-office={r.office}
              data-done={r.done ? 'true' : 'false'}
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-body text-[13.5px]">{RUNG[r.office]}</span>
                {note && <span className="font-mono text-[11px] text-muted">{note}</span>}
              </span>
              <span
                className="shrink-0 font-mono text-[12px]"
                aria-label={r.done ? `completed ${r.count ?? 1}` : 'not yet'}
              >
                {r.done ? `✓${(r.count ?? 0) > 1 ? ` (${r.count})` : ''}` : '—'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export interface OfficeHeaderProps {
  /** The hall crop: the city picture at the hall (day or night, the server's). */
  crop: { asset: AssetView; x: number; y: number } | null;
  /** Slice 7 integration: the office's own scene (the Governor's parlour), shown in place of the crop. */
  scene?: AssetView | null;
  kicker: string;
  /** The holder's name (Playfair 22 px), or null with nobody holding it. */
  name: string | null;
  line: ReactNode;
  holder?: { avatar: AssetView | null; factionId: FactionId } | null;
  testId?: string;
}

/** Screens §4.1: the office page's header, the hall crop at 150 / 180 px with the holder over the gradient. */
export function OfficeHeader({
  crop,
  scene,
  kicker,
  name,
  line,
  holder,
  testId = 'office-header',
}: OfficeHeaderProps) {
  return (
    <header
      className="relative min-h-[150px] shrink-0 overflow-hidden bg-ink text-paper sm:min-h-[180px]"
      data-testid={testId}
      data-art={scene?.id}
    >
      {scene ? (
        <Picture
          asset={scene}
          sizes="640px"
          decorative
          loading="eager"
          className="absolute inset-0 size-full object-cover opacity-80"
        />
      ) : (
        crop && <MapCrop asset={crop.asset} x={crop.x} y={crop.y} at={0.45} className="opacity-80" />
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.95)_0%,rgb(21_24_26/0.55)_55%,rgb(21_24_26/0.1)_100%)]"
        aria-hidden="true"
      />
      <div className="relative flex min-h-[150px] items-end gap-3 px-4 pt-6 pb-3 sm:min-h-[180px]">
        {holder && <PersonMark avatar={holder.avatar} factionId={holder.factionId} size={48} />}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="label-caps text-[10px] text-dim" data-testid="office-kicker">
            {kicker}
          </span>
          {name && <h1 className="font-display text-[22px] leading-tight font-black">{name}</h1>}
          <p className="font-mono text-[11.5px] leading-snug text-dim" data-testid="office-line">
            {line}
          </p>
        </div>
      </div>
    </header>
  );
}
