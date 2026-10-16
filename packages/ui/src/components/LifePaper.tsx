import { copy } from '@irongate/content/copy';
import type { AssetView, LifeDesk, LifeLetter } from '@irongate/rules';
import { Picture } from './Picture';
import { Stamp } from './Stamp';
import { ClockGlyph } from './Dossier';

/**
 * Slice 8 phase C, lane Q (screens §8.3, §12; tech design §11.1): the paper's life rows. The desk's
 * Dossier, Patrons, Where you sleep, Legacy and *Ahead* rows; the Letters' Requests, informants'
 * reports and Monday gossip; the exposé's front page and the public exposé line. All worded by the
 * server at the settlement (the desk and the Letters) or at read (the public line).
 */

/** *Ahead* (design §10.3): up to three clocks in Courier, each with the three-segment glyph. */
export function ClockRow({ clocks }: { clocks: string[] }) {
  if (clocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 border-b border-dotted border-faint py-1.5" data-testid="desk-ahead">
      <span className="font-body text-[14px]">{copy.life.ahead.kicker}</span>
      <ul className="flex flex-col gap-0.5">
        {clocks.slice(0, 3).map((c) => (
          <li key={c} className="flex items-center gap-2 font-mono text-[12px]" data-testid="ahead-clock">
            <ClockGlyph clock={['fresh', 'stale', 'empty']} size={10} />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeskRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2.5 border-b border-dotted border-faint py-1.5 text-[14px]">
      <span className="font-body">{label}</span>
      <span className="text-right font-label" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

/** The desk's life rows, after *Your record* (design §10.3). */
export function LifeDeskRows({ desk }: { desk: LifeDesk }) {
  return (
    <div className="flex flex-col" data-testid="desk-life">
      {desk.dossier && <DeskRow label={copy.life.desk.dossier} value={desk.dossier} testId="desk-dossier" />}
      {desk.patrons && <DeskRow label={copy.life.desk.patrons} value={desk.patrons} testId="desk-patrons" />}
      {desk.sleep && <DeskRow label={copy.life.desk.sleep} value={desk.sleep} testId="desk-sleep" />}
      {desk.legacy && <DeskRow label={copy.life.desk.legacy} value={desk.legacy} testId="desk-legacy" />}
      <ClockRow clocks={desk.ahead} />
    </div>
  );
}

/** The Letters' life rows (screens §8.3, §12): a Request opens what to do; reports and gossip read. */
export function LifeLetters({
  letters,
  showKicker,
  onOpen,
}: {
  letters: LifeLetter[];
  /** False when a chapter's Letters row already printed the section's kicker. */
  showKicker: boolean;
  onOpen: (l: LifeLetter) => void;
}) {
  if (letters.length === 0) return null;
  return (
    <section aria-label="Letters" className="flex flex-col" data-testid="life-letters">
      {showKicker && (
        <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
          Letters
        </div>
      )}
      {letters.map((l, i) => {
        const body = (
          <>
            <span className="label-caps text-[10px] text-muted">{l.from}</span>
            <span className="font-display text-[17px] leading-tight font-bold">{l.title}</span>
            {l.line && <span className="font-mono text-[12px] text-petrol">{l.line}</span>}
          </>
        );
        return l.kind === 'request' ? (
          <button
            key={`${l.kind}-${i}`}
            type="button"
            onClick={() => onOpen(l)}
            className="flex min-h-14 w-full cursor-pointer flex-col items-start gap-0.5 border-b border-dotted border-faint py-2 text-left hover:bg-paper-card"
            data-testid="letter-life"
            data-kind={l.kind}
          >
            {body}
          </button>
        ) : (
          <div
            key={`${l.kind}-${i}`}
            className="flex min-h-14 flex-col gap-0.5 border-b border-dotted border-faint py-2"
            data-testid="letter-life"
            data-kind={l.kind}
          >
            {body}
          </div>
        );
      })}
    </section>
  );
}

/** The exposé's front page (tech design §11.1): the slice-3 front page's shape with `scene.front-page`. */
export function ExposeFrontPage({ headline, deck, art }: { headline: string; deck?: string; art?: AssetView }) {
  return (
    <section className="flex flex-col gap-3 border-b border-ink pb-3" data-testid="expose-front" aria-label={copy.life.expose.frontKicker}>
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-5">
        {art && (
          <figure className="relative w-[200px] shrink-0">
            <div className="relative aspect-[4/3] w-full overflow-hidden border border-ink bg-paper-2">
              <Picture asset={art} sizes="256px" decorative className="size-full object-cover [filter:grayscale(1)_contrast(1.15)]" />
              <div className="halftone pointer-events-none absolute inset-0 text-ink opacity-30" aria-hidden="true" />
            </div>
            <div className="absolute -top-3 -right-6">
              <Stamp tone="success" label={copy.life.expose.stamps.success} className="text-[18px]" />
            </div>
          </figure>
        )}
        <div className="flex flex-col gap-2">
          <span className="label-caps text-center text-[10px] font-semibold text-muted lg:text-left">{copy.life.expose.frontKicker}</span>
          <h2 className="text-center font-display text-[30px] leading-[1.04] font-black lg:text-left">{headline}</h2>
          {deck && (
            <p className="text-center font-display text-[16px] leading-snug font-bold text-text-2 italic lg:text-left">{deck}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** The public exposé line (§22.1 Q28): yesterday's printed exposé, in every reader's paper. */
export function PublicExposeLine({ headline, deck }: { headline: string; deck: string }) {
  return (
    <section className="flex flex-col gap-1 border-b border-dotted border-faint pb-2" data-testid="public-expose">
      <span className="label-caps text-[10px] font-semibold text-muted">{copy.scoreboard.inPrint}</span>
      <h3 className="font-display text-[19px] leading-tight font-bold">{headline}</h3>
      {deck && <p className="font-body text-[14px] leading-snug text-text-2">{deck}</p>}
    </section>
  );
}
