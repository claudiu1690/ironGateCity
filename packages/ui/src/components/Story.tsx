import { copy } from '@irongate/content/copy';
import type { AssetView, FactionCardView, LetterView, StoryScreenView } from '@irongate/rules';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { cx } from '../format';
import { statLine } from '../odds';
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
  // §13.5 rung 3: the home map, shown wide and centred on the place (maps v3: the 2048 px still at
  // its native size).
  const W = 2048;
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

/**
 * QA M1: how long a new screen's choices and approaches ignore taps. The second tap of a double tap
 * lands 80–400 ms after the first; when the answer is back before it, the next question is already
 * on screen, in the same place. A tap that early cannot be meant for a question the player has not
 * read yet, so a screen's choices take taps only once they have been on screen this long.
 */
export const STORY_SETTLE_MS = 500;

/**
 * QA n4: the arrow keys of the ARIA radio group on a `role="radio"` button: Up/Left and Down/Right
 * move to the previous or next radio of its group and pick it, Home and End to the first and last.
 * Each radio stays its own Tab stop as well (players reach the cards with Tab).
 */
export function onRadioArrowKey(e: KeyboardEvent<HTMLElement>): void {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if (step === undefined && e.key !== 'Home' && e.key !== 'End') return;
  const group = e.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
  const at = radios.indexOf(e.currentTarget);
  const to =
    e.key === 'Home' ? 0 : e.key === 'End' ? radios.length - 1 : (at + step! + radios.length) % radios.length;
  const next = radios[to];
  if (!next) return;
  e.preventDefault();
  next.focus();
  next.click(); // a key press: `detail` 0, so a settling screen does not hold it back
}

/** A key for a screen when the caller gives none: what the player reads on it. */
const keyOf = (v: StoryScreenView) =>
  [v.kicker, v.title, v.prompt, ...v.choices.map((c) => c.id), ...v.approaches.map((a) => a.id)].join('|');

/**
 * True once the screen `key` has been shown for `settleMs` (QA M1). Until then a tap does nothing.
 * The first screen settles too when `settleOnMount` (it replaced a screen the player just tapped:
 * the face, the Letters row); a screen opened by a page load takes taps at once. A keyboard
 * activation (`detail === 0`) is not held back: the focus leaves the choices when the screen
 * changes (below), so a repeated Enter or Space cannot land on the next screen's choices.
 */
function useSettled(key: string, settleMs: number, settleOnMount: boolean): boolean {
  const [settledKey, setSettledKey] = useState<string | null>(settleOnMount && settleMs > 0 ? null : key);
  useEffect(() => {
    if (settleMs <= 0) return;
    const t = setTimeout(() => setSettledKey(key), settleMs);
    return () => clearTimeout(t);
  }, [key, settleMs]);
  return settleMs <= 0 || settledKey === key;
}

export interface StoryScreenProps {
  view: StoryScreenView;
  /**
   * What this screen is (the question id, the chapter step). Its choices are keyed by it, so the
   * next screen's choices are new buttons, and each tap carries the key of the screen its button
   * was rendered for (QA M1). Defaults to the view's texts.
   */
  screenKey?: string;
  /** Taps are ignored this long after the screen changes (QA M1). */
  settleMs?: number;
  /**
   * The first screen shown also ignores taps for `settleMs`: set it when the screen replaces one the
   * player has just tapped (the face's Continue, the Letters row), so a double tap there cannot
   * reach a choice. Off for a screen opened by a page load.
   */
  settleOnMount?: boolean;
  /**
   * One tap commits a choice (the origin, chapter step 1). `screenKey` is the screen the tapped
   * button was rendered for: the caller drops a tap for a screen that is no longer current.
   */
  onChoose?: (id: string, screenKey: string) => void;
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
  screenKey,
  settleMs = STORY_SETTLE_MS,
  settleOnMount = false,
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
  const key = screenKey ?? keyOf(view);
  const settled = useSettled(key, settleMs, settleOnMount);
  /** A tap (not a key press) on a screen that is still settling: ignored (QA M1). */
  const early = (e: MouseEvent) => !settled && e.detail !== 0;

  // When the screen changes its old buttons go, and the focus with them: put it on the new prompt
  // (or the title), so a screen reader reads the new question and Tab moves on to its choices.
  const sectionRef = useRef<HTMLElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownKey = useRef(key);
  useEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    const active = document.activeElement;
    // The player is elsewhere (another field, the corner button): leave the focus there.
    if (active && active !== document.body && !sectionRef.current?.contains(active)) return;
    (promptRef.current ?? headingRef.current)?.focus({ preventScroll: true });
  }, [key]);

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
        ref={sectionRef}
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
            <h1
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-[24px] leading-[1.05] font-black outline-none lg:text-[28px]"
            >
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
                  ref={promptRef}
                  tabIndex={-1}
                  className="font-display text-[18px] leading-tight font-bold outline-none lg:text-[21px]"
                  data-testid="story-prompt"
                >
                  “{view.prompt}”
                </p>
              </div>
            )}
            {view.choices.length > 0 && (
              <div
                className={cx(
                  'flex flex-col gap-2 transition-opacity duration-300',
                  !settled && 'opacity-60',
                )}
                role="group"
                aria-label={view.prompt ?? view.title}
              >
                {view.choices.map((c) => (
                  <button
                    // Keyed by the screen: the next question's choices are new buttons (QA M1).
                    key={`${key}:${c.id}`}
                    type="button"
                    disabled={pendingChoice !== null}
                    aria-disabled={!settled || undefined}
                    aria-busy={pendingChoice === c.id || undefined}
                    onClick={(e) => {
                      if (early(e)) return;
                      onChoose?.(c.id, key);
                    }}
                    className={cx(
                      'flex min-h-14 w-full flex-col items-start justify-center gap-0.5 border-[1.5px] border-ink bg-paper-card px-3.5 py-2 text-left',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
                      settled ? 'cursor-pointer hover:bg-ink hover:text-paper' : 'cursor-default',
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
              <div
                className={cx(
                  'flex flex-col gap-2 transition-opacity duration-300',
                  !settled && 'opacity-60',
                )}
                role="radiogroup"
                aria-label="Choose your approach"
              >
                <span className="label-caps text-[10px] text-muted">Choose your approach</span>
                {view.approaches.map((a) => {
                  const on = selectedApproach === a.id;
                  return (
                    <div key={`${key}:${a.id}`} className="flex flex-col">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-disabled={!settled || undefined}
                        onClick={(e) => {
                          if (early(e)) return;
                          onSelectApproach?.(a.id);
                        }}
                        onKeyDown={onRadioArrowKey}
                        className={cx(
                          'flex min-h-14 w-full cursor-pointer flex-col gap-1 border-[1.5px] border-ink px-3.5 py-2 text-left',
                          on ? 'bg-ink text-paper' : 'bg-paper-card hover:bg-paper',
                        )}
                        data-testid="story-approach"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-display text-[15px] leading-snug font-bold sm:text-[16px]">
                            {a.text}
                          </span>
                        </span>
                        {/* Review 2 (GDD §8.4): the odds as a word and the stat, never a number. */}
                        <span
                          className="font-mono text-[11.5px] opacity-85"
                          data-testid="story-approach-odds"
                        >
                          {copy.odds.ticket(copy.odds.band(a.check.chance), statLine(a.check))}
                        </span>
                      </button>
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
  // QA n3: a selected card grows by its blurb and facts; bring the whole card into view, above the
  // sticky confirm (scroll-margin), so the facts are not left under it on a small phone.
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={onRadioArrowKey}
      className={cx(
        'flex w-full scroll-mt-4 scroll-mb-36 cursor-pointer gap-3 border-[1.5px] border-ink p-3 text-left',
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
