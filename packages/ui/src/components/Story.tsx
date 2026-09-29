import { copy } from '@irongate/content/copy';
import type { AssetView, FactionCardView, LetterView, StoryScreenView } from '@irongate/rules';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { cx, statLabel } from '../format';
import { CheckBreakdownList } from './CheckBreakdownList';
import { FACTION_STYLE } from './FactionCrest';
import { Picture } from './Picture';

/** Where a cropping panel centres the image (ADR 0015 `focus`). */
const objectPosition = (focus: { x: number; y: number } | null) =>
  focus ? `${Math.round(focus.x * 100)}% ${Math.round(focus.y * 100)}%` : '50% 50%';

function StoryArt({ view }: { view: StoryScreenView }) {
  const art = view.art;
  if (art.kind === 'scene') {
    return (
      <Picture
        asset={art.asset}
        sizes="(min-width: 1024px) 420px, 100vw"
        decorative
        loading="eager"
        className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: objectPosition(art.focus) }}
      />
    );
  }
  // §13.5 rung 3: the home map, shown wide and centred on the place.
  const W = 1400;
  const h = (W * art.asset.height) / art.asset.width;
  return (
    <Picture
      asset={art.asset}
      sizes={`${W}px`}
      decorative
      loading="eager"
      className="absolute max-w-none opacity-90"
      // Centred on the place, but never past an edge of the map (no black band).
      style={{
        width: W,
        height: h,
        left: `clamp(calc(100% - ${W}px), calc(50% - ${art.x * W}px), 0px)`,
        top: `clamp(calc(100% - ${h}px), calc(50% - ${art.y * h}px), 0px)`,
      }}
    />
  );
}

export interface StoryScreenProps {
  view: StoryScreenView;
  /** One tap commits a choice (the origin, chapter step 1). */
  onChoose?: (id: string) => void;
  /** The choice being sent: every choice is disabled meanwhile. */
  pendingChoice?: string | null;
  /** Chapter step 2: the picked approach (client state until the CTA). */
  selectedApproach?: string | null;
  onSelectApproach?: (id: string) => void;
  onCta?: () => void;
  ctaPending?: boolean;
  /** "Needs 10 Energy · ready at 14:20" under a disabled CTA. */
  ctaNote?: string;
  /** A refusal, worded for the player. */
  error?: string;
  /** Extra content under the text (the street's faction cards). */
  children?: ReactNode;
  /** A sticky footer in place of the CTA (the street's confirm). */
  footer?: ReactNode;
  /** A small control in the corner (Sign out, Close). */
  corner?: ReactNode;
  /** Full screen (the arrival) or inside the app shell (chapters). */
  layout?: 'fullscreen' | 'shell';
}

/**
 * A tier-3 story screen (ADR 0013, mockup Story): the art (a top band on phones, a 420 px panel on
 * desktop) with the kicker and title, a short paragraph, the echo of the last answer, the prompt
 * beside the speaker's portrait, the choices as full-width buttons with their hint line, or the
 * approaches with their odds, and one dark CTA with "Close the game now and this waits for you".
 */
export function StoryScreen({
  view,
  onChoose,
  pendingChoice = null,
  selectedApproach = null,
  onSelectApproach,
  onCta,
  ctaPending,
  ctaNote,
  error,
  children,
  footer,
  corner,
  layout = 'fullscreen',
}: StoryScreenProps) {
  const titleId = useId();
  const full = layout === 'fullscreen';
  const cta = view.cta;
  const short = cta !== null && cta.readyAt !== null;
  return (
    <div
      className={cx(
        'bg-ink text-ink',
        full
          ? 'min-h-dvh lg:flex lg:items-center lg:justify-center lg:p-8'
          : 'flex min-h-full flex-col lg:p-6',
      )}
    >
      <section
        aria-labelledby={titleId}
        className={cx(
          'relative mx-auto flex flex-col bg-paper lg:flex-row lg:shadow-[0_0_0_1px_var(--color-ink),0_30px_80px_rgb(0_0_0/0.6)]',
          full
            ? 'min-h-dvh lg:h-[min(776px,calc(100dvh-64px))] lg:min-h-0 lg:w-full lg:max-w-[1220px]'
            : 'w-full flex-1 lg:max-w-[1100px] lg:flex-none lg:min-h-[560px]',
        )}
        data-testid="story-screen"
      >
        {/* The art: a 16:9 top band on phones (at most 40 dvh), a 420 px panel on desktop. */}
        <div className="relative aspect-video max-h-[34dvh] w-full shrink-0 overflow-hidden bg-ink lg:aspect-auto lg:h-auto lg:max-h-none lg:w-[420px]">
          <StoryArt view={view} />
          <div
            className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.92)_0%,rgb(21_24_26/0.15)_60%)] lg:bg-none"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 pb-2.5 text-paper lg:bg-ink lg:px-5 lg:py-4">
            <span className="label-caps text-[10px] text-dim lg:text-[11px]">{view.kicker}</span>
            <h1 id={titleId} className="font-display text-[24px] leading-[1.05] font-black lg:text-[28px]">
              {view.title}
            </h1>
          </div>
          {corner && <div className="absolute top-2 right-2">{corner}</div>}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
          <div className="flex flex-1 flex-col gap-2.5 px-4 pt-3 pb-3 lg:gap-4 lg:px-8 lg:pt-7">
            <p className="font-body text-[14.5px] leading-snug text-text-2 lg:text-[16px] lg:leading-normal">
              {view.narrative}
            </p>
            {view.echo && (
              <p className="font-mono text-[12.5px] text-muted" data-testid="story-echo">
                {view.echo}
              </p>
            )}
            {view.prompt && (
              <div className="flex items-center gap-3">
                {view.portrait && (
                  <Picture
                    asset={view.portrait}
                    sizes="48px"
                    decorative
                    className="size-12 shrink-0 rounded-full border-2 border-ink object-cover object-top"
                  />
                )}
                <p
                  className="font-display text-[18px] leading-tight font-bold lg:text-[21px]"
                  data-testid="story-prompt"
                >
                  “{view.prompt}”
                </p>
              </div>
            )}
            {view.choices.length > 0 && (
              <div className="flex flex-col gap-2" role="group" aria-label={view.prompt ?? view.title}>
                {view.choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pendingChoice !== null}
                    aria-busy={pendingChoice === c.id || undefined}
                    onClick={() => onChoose?.(c.id)}
                    className={cx(
                      'flex min-h-14 w-full cursor-pointer flex-col items-start justify-center gap-0.5 border-[1.5px] border-ink bg-paper-card px-3.5 py-2 text-left',
                      'hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
                      'disabled:cursor-default disabled:opacity-70 disabled:hover:bg-paper-card disabled:hover:text-ink',
                      pendingChoice === c.id && 'bg-ink! text-paper! opacity-100!',
                    )}
                    data-testid="story-choice"
                  >
                    <span className="font-body text-[15px] leading-snug">{c.text}</span>
                    {c.hint && <span className="font-mono text-[11.5px] opacity-80">{c.hint}</span>}
                  </button>
                ))}
              </div>
            )}
            {view.approaches.length > 0 && (
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Choose your approach">
                <span className="label-caps text-[10px] text-muted">Choose your approach</span>
                {view.approaches.map((a) => {
                  const on = selectedApproach === a.id;
                  return (
                    <div key={a.id} className="flex flex-col">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onSelectApproach?.(a.id)}
                        className={cx(
                          'flex min-h-14 w-full cursor-pointer flex-col gap-1.5 border-[1.5px] border-ink px-3.5 py-2.5 text-left',
                          on ? 'bg-ink text-paper' : 'bg-paper-card hover:bg-paper',
                        )}
                        data-testid="story-approach"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-display text-[16px] leading-snug font-bold">{a.text}</span>
                          <span className="font-label text-[20px] font-semibold whitespace-nowrap">
                            {a.check.chance} %
                          </span>
                        </span>
                        <span className="font-mono text-[11.5px] opacity-85">
                          {statLabel(a.check.stats)} {a.check.statValue} vs {a.check.difficulty}
                        </span>
                        <span className={cx('block h-1.5', on ? 'bg-ink-2' : 'bg-track')} aria-hidden="true">
                          <span
                            className={cx('block h-1.5', on ? 'bg-energy' : 'bg-success-fill')}
                            style={{ width: `${a.check.chance}%` }}
                          />
                        </span>
                      </button>
                      {on && (
                        <div className="border-x-[1.5px] border-b-[1.5px] border-ink bg-paper-card px-3 py-1.5">
                          <CheckBreakdownList check={a.check} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {children}
            {error && (
              <p role="alert" className="font-body text-[14px] text-failure">
                {error}
              </p>
            )}
          </div>

          <div
            className="sticky bottom-0 z-10 flex flex-col gap-1 border-t border-track bg-paper px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] lg:px-8"
            data-testid="story-footer"
          >
            {footer ??
              (cta && (
                <button
                  type="button"
                  onClick={onCta}
                  disabled={short || !selectedApproach || ctaPending}
                  aria-busy={ctaPending || undefined}
                  className="label-caps flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 bg-ink px-4 text-[15px] text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:bg-faint"
                  data-testid="story-cta"
                >
                  <span>{cta.label}</span>
                  <span className="text-energy-light normal-case">{cta.energy} Energy</span>
                </button>
              ))}
            {ctaNote && (
              <p className="font-mono text-[11.5px] text-muted" data-testid="story-cta-note">
                {ctaNote}
              </p>
            )}
            <p className="font-mono text-[11.5px] text-muted" data-testid="story-waits">
              {copy.storyWaits} · {copy.storyProgress(view.progress.step, view.progress.of)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export interface FactionCardProps {
  card: FactionCardView;
  selected: boolean;
  onSelect: () => void;
}

/** §7.3: a street card. Collapsed: crest, name, first line, the wish tag; selected: blurb and facts. */
export function FactionCard({ card, selected, onSelect }: FactionCardProps) {
  const first = card.blurb.split(/(?<=\.)\s/)[0];
  const color = FACTION_STYLE[card.factionId].color;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'flex w-full cursor-pointer gap-3 border-[1.5px] border-ink p-3 text-left',
        selected ? 'bg-paper-card shadow-[inset_4px_0_0_var(--faction)]' : 'bg-paper hover:bg-paper-card',
      )}
      style={{ ['--faction' as string]: color }}
      data-testid="faction-card"
    >
      <Picture asset={card.crest} decorative className="size-11 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-[19px] leading-tight font-black">{card.name}</span>
          {card.wishLabel && (
            <span
              className="label-caps border border-petrol px-1.5 py-0.5 text-[10px] text-petrol"
              data-testid="wish-tag"
            >
              {card.wishLabel}
            </span>
          )}
        </span>
        <span className="font-body text-[14px] leading-snug text-text-2">
          {selected ? card.blurb : first}
        </span>
        {selected && (
          <span className="flex flex-col gap-0.5 pt-1 font-mono text-[12px]" data-testid="faction-facts">
            {card.facts.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

export interface AvatarPickerProps {
  faces: AssetView[];
  value: string | null;
  onChange: (id: string) => void;
  /** "Choose your face" when the form was sent without one. */
  error?: string;
  legend?: string;
  name?: string;
}

/** §7.3: the six faces as a radio group (3 × 2 on phones, 6 in a row from 640 px). */
export function AvatarPicker({
  faces,
  value,
  onChange,
  error,
  legend = copy.yourFace,
  name = 'avatar',
}: AvatarPickerProps) {
  const errorId = useId();
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? errorId : undefined}>
      <legend className="label-caps pb-1.5 text-[11px] font-semibold text-muted">{legend}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {faces.map((f) => {
          const on = value === f.id;
          return (
            <label
              key={f.id}
              className={cx(
                'relative block min-h-24 cursor-pointer overflow-hidden border-2 bg-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-petrol',
                on ? 'border-petrol' : 'border-transparent',
              )}
              data-testid="avatar-tile"
            >
              <input
                type="radio"
                name={name}
                value={f.id}
                checked={on}
                onChange={() => onChange(f.id)}
                className="sr-only"
                aria-label={f.alt}
              />
              <Picture
                asset={f}
                sizes="(min-width: 640px) 64px, 30vw"
                decorative
                className="aspect-[4/5] w-full object-cover"
              />
              {on && (
                <span
                  className="absolute right-1 bottom-1 bg-petrol px-1 text-[11px] text-paper"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="font-body text-[14px] text-failure">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** §3.3 v2: the Letters row, "From your father's things · His ward book · Chapter 1 is ready · 10 Energy". */
export function LettersRow({ letter, onOpen }: { letter: LetterView; onOpen: () => void }) {
  return (
    <section aria-label="Letters" className="flex flex-col">
      <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        Letters
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 border-b border-dotted border-faint py-2 text-left hover:bg-paper-card"
        data-testid="letters-row"
      >
        <span className="flex flex-col">
          <span className="label-caps text-[10px] text-muted">{letter.from}</span>
          <span className="font-display text-[18px] leading-tight font-bold">{letter.title}</span>
        </span>
        <span className="font-mono text-[12px] text-petrol">
          {letter.status === 'ready' ? copy.letterReady(letter.chapter, letter.energy) : copy.letterMidway}
        </span>
      </button>
    </section>
  );
}

/** "Wearing: Your father's coat · CHA 5" (§8.2), optionally with the item's picture. */
export function ItemLine({ name, cha, art }: { name: string; cha: number; art?: AssetView }) {
  return (
    <span className="flex items-center gap-2 font-body text-[14px]" data-testid="item-line">
      {art && <Picture asset={art} sizes="32px" decorative className="size-8 shrink-0 object-cover" />}
      {copy.wearing(name, cha)}
    </span>
  );
}
