import { copy } from '@irongate/content/copy';
import { CHAT } from '@irongate/rules';
import type { ChatChannelsView, ChatLineButton, ChatLineView, FactionId } from '@irongate/rules';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './Button';
import { Chip } from './Chip';
import { HelpButton, helpMark } from './Help';
import type { HelpNote } from './Help';
import { MemberFace } from './Members';
import { cx, formatClock } from '../format';

/**
 * Slice 6 (screens §2.5; design §8; tech design §12.2–§12.3): the faction chat. `ChatPanel` is the
 * channel strip, the header line, the lines (member lines, system lines with their buttons, muted
 * lines collapsed), *New lines ↓*, and the composer with its limit line. Plain props: the client owns
 * the socket, the history and the taps.
 */

const t = copy.together;

/** A channel's chip: *Party*, *{city} branch* or (slice 7, Rank 4+) *Officers*. */
const channelLabel = (c: { kind: 'party' | 'city' | 'officers'; name: string }): string =>
  c.kind === 'party' ? t.chat.party : c.kind === 'officers' ? copy.nation.chair.officers : t.chat.branch(c.name);

/** Screens §2.5: the counter shows from 240 of 280. */
const CHAT_COUNTER_FROM = 240;

/** Code points, as the server counts them (an emoji is one). */
export const chatLength = (text: string) => [...text].length;

/** `+0.95` / `−0.40`: a swing signed to two decimals (design §10). */
const swing2 = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}`;

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);

/** A system line's words from its stored kind and payload (`copy.together.system`), in the reader's clock. */
export function systemLineText(line: Pick<ChatLineView, 'system'>): string {
  const s = line.system;
  if (!s) return '';
  const p = s.payload;
  const time = (v: unknown) => (typeof v === 'number' ? formatClock(v) : str(v));
  switch (s.kind) {
    case 'eventCalled':
      return t.system.eventCalled(str(p.name), str(p.event), str(p.venue), time(p.time), num(p.filled), num(p.roles));
    case 'eventResult': {
      const band = str(p.outcome);
      const outcome =
        band === 'calledOff' ? t.calledOffWord : (t.band[band as keyof typeof t.band] ?? band);
      return t.system.eventResult(str(p.event), str(p.venue), outcome, swing2(num(p.swing)));
    }
    case 'takenIn':
      return t.system.takenIn(str(p.name), str(p.place), num(p.iron));
    case 'admitted':
      return t.system.admitted(str(p.name), copy.count(num(p.n)));
    case 'bailPosted':
      return t.system.bailPosted(str(p.name), str(p.prisoner));
    case 'seatWon':
      return p.top ? t.system.seatTop(str(p.name), str(p.place)) : t.system.seatWon(str(p.name), str(p.place));
    case 'heroNamed':
      return t.system.heroNamed(str(p.name), str(p.title), str(p.place));
    case 'nudge':
      // The invite (design §23.2): the venue is what makes "which rally" obvious.
      return p.role
        ? t.system.nudgeRole(str(p.caller), str(p.name), str(p.role), str(p.event), str(p.venue), time(p.time))
        : t.system.nudgeHands(str(p.caller), str(p.name), str(p.event), str(p.venue), time(p.time));
    default:
      return '';
  }
}

/** A system line's button words. */
export function systemButtonLabel(b: ChatLineButton): string {
  switch (b.kind) {
    case 'postBail':
      return t.system.buttons.postBail(b.iron);
    case 'visit':
      return t.system.buttons.visit;
    case 'join':
      return t.system.buttons.join;
    default:
      return t.system.buttons.seeResult;
  }
}

export interface ChatPanelProps {
  channels: ChatChannelsView['channels'];
  channel: string;
  onChannel: (id: string) => void;
  hereNow: number;
  lines: ChatLineView[];
  /** Members this viewer has muted (ids). */
  muted: string[];
  meId: string;
  factionId: FactionId;
  /** The faction's rank titles, Rank 1 first. */
  rankTitles: readonly string[];
  draft: string;
  onDraft: (text: string) => void;
  onSend: () => void;
  sendPending?: boolean;
  /** The limit line under the composer, only when hit. */
  limitLine?: string | null;
  onButton: (line: ChatLineView, button: ChatLineButton) => void;
  /** The line whose button is busy. */
  buttonPending?: string | null;
  onName: (characterId: string) => void;
  onReport: (line: ChatLineView) => void;
  reported: ReadonlySet<string>;
  more: boolean;
  onOlder: () => void;
  olderPending?: boolean;
  /** Desktop: the persistent right-hand column. */
  column?: boolean;
  /** Enter sends (desktop). */
  enterSends?: boolean;
  empty?: boolean;
}

/**
 * `ChatPanel` (screens §2.5): Party · the home branch · the Irongate branch; *{n} here · {channel}*;
 * the lines (fifty at a time, older on scroll); *New lines ↓* while scrolled up; the composer pinned
 * at the bottom, 280 characters with the counter from 240.
 */
export function ChatPanel(props: ChatPanelProps) {
  const {
    channels,
    channel,
    onChannel,
    hereNow,
    lines,
    muted,
    meId,
    factionId,
    rankTitles,
    draft,
    onDraft,
    onSend,
    sendPending,
    limitLine,
    onButton,
    buttonPending,
    onName,
    onReport,
    reported,
    more,
    onOlder,
    olderPending,
    column = false,
    enterSends = false,
  } = props;
  const current = channels.find((c) => c.id === channel);
  const here = t.chat.header(hereNow, current ? channelLabel(current) : '');
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [fresh, setFresh] = useState(false);
  const lastId = lines.at(-1)?.id ?? null;
  const firstId = lines[0]?.id ?? null;
  const prevFirst = useRef<string | null>(null);
  const prevHeight = useRef(0);
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState<string | null>(null);
  const [asking, setAsking] = useState<ChatLineView | null>(null);

  // A channel change opens at the newest line.
  useEffect(() => {
    atBottom.current = true;
    setFresh(false);
  }, [channel]);

  // New lines at the bottom: follow them when at the bottom, else the pill. Older lines at the top:
  // keep the reader's place.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevFirst.current !== null && firstId !== prevFirst.current && prevHeight.current > 0) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    } else if (lastId) {
      setFresh(true);
    }
    prevFirst.current = firstId;
    prevHeight.current = el.scrollHeight;
  }, [lastId, firstId]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (atBottom.current) setFresh(false);
    if (el.scrollTop < 40 && more && !olderPending) {
      prevHeight.current = el.scrollHeight;
      onOlder();
    }
  };
  const toBottom = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottom.current = true;
    setFresh(false);
  };

  const n = chatLength(draft);
  const tooLong = n > CHAT.maxLength;
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (enterSends && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!tooLong && draft.trim()) onSend();
    }
  };

  return (
    <section
      className={cx('flex min-h-0 flex-col bg-paper text-ink', column ? 'h-full' : 'h-full')}
      aria-label={t.tabs.chat}
      data-testid="chat-panel"
    >
      {/* Review 7 #1 (the Branch Office): the desktop column's paper-2 head band, *THE ROOM*. */}
      {column && (
        <div className="flex min-h-11 shrink-0 items-center gap-3 border-b border-ink bg-paper-2 px-3" data-testid="chat-room-head">
          <h2 className="label-caps text-[11px] font-semibold">{t.room}</h2>
          <p className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted" data-testid="chat-header">
            {here}
          </p>
        </div>
      )}
      {/* The channels as the game's paper chips (not a second ink strip). */}
      <div
        className={cx('flex shrink-0 gap-2 overflow-x-auto', column ? 'border-b border-ink px-3 py-2' : 'px-4 pt-2.5 pb-1')}
        role="tablist"
        aria-label={t.tabs.chat}
      >
        {channels.map((c) => (
          <Chip key={c.id} tab on={c.id === channel} onClick={() => onChannel(c.id)} testId="chat-channel" small>
            {channelLabel(c)}
          </Chip>
        ))}
      </div>
      {!column && (
        <p className="shrink-0 border-b border-ink px-4 pb-1 font-mono text-[11px] text-muted" data-testid="chat-header">
          {here}
        </p>
      )}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
          data-testid="chat-lines"
          aria-live="polite"
        >
          {more && (
            <div className="flex justify-center py-1">
              <button
                type="button"
                className="label-caps min-h-11 cursor-pointer px-3 text-[11px] text-muted underline"
                onClick={onOlder}
                disabled={olderPending}
              >
                {t.members.showMore}
              </button>
            </div>
          )}
          {lines.length === 0 ? (
            <p className="px-3 py-4 font-body text-[14px] text-text-2 italic" data-testid="chat-empty">
              {t.chat.empty}
            </p>
          ) : (
            <ol className="flex flex-col">
              {lines.map((l) =>
                l.kind === 'system' ? (
                  <SystemLine
                    key={l.id}
                    line={l}
                    forYou={l.system?.to === meId}
                    pending={buttonPending === l.id}
                    onButton={onButton}
                  />
                ) : l.author && muted.includes(l.author.characterId) && !shown.has(l.id) ? (
                  <li key={l.id} className="border-b border-dotted border-faint px-3">
                    <button
                      type="button"
                      className="min-h-11 w-full cursor-pointer text-left font-mono text-[11.5px] text-muted"
                      onClick={() => setShown((s) => new Set(s).add(l.id))}
                      data-testid="chat-muted"
                    >
                      {t.profile.muted(l.author.name)}
                    </button>
                  </li>
                ) : (
                  <ChatLine
                    key={l.id}
                    line={l}
                    mine={l.author?.characterId === meId}
                    factionId={factionId}
                    rankTitle={l.author ? (rankTitles[l.author.rank - 1] ?? '') : ''}
                    onName={onName}
                    reported={reported.has(l.id)}
                    revealed={revealed === l.id}
                    onReveal={() => setRevealed(l.id)}
                    onReport={() => setAsking(l)}
                  />
                ),
              )}
            </ol>
          )}
        </div>
        {fresh && (
          <button
            type="button"
            onClick={toBottom}
            className="label-caps absolute bottom-2 left-1/2 min-h-11 -translate-x-1/2 cursor-pointer bg-ink px-4 text-[11px] text-paper shadow-[0_4px_12px_rgb(0_0_0/0.35)]"
            data-testid="chat-new-lines"
          >
            {t.chat.newLines}
          </button>
        )}
      </div>
      <form
        className="shrink-0 border-t-[1.5px] border-ink bg-paper px-3 pt-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!tooLong && draft.trim()) onSend();
        }}
        data-testid="chat-composer"
      >
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="chat-text">
            {t.chat.placeholder}
          </label>
          <textarea
            id="chat-text"
            rows={1}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={t.chat.placeholder}
            className="field-sizing-content max-h-[4.6em] min-h-11 flex-1 resize-none border-[1.5px] border-ink bg-paper-card px-2 py-2.5 font-body text-[15px] leading-snug focus-visible:outline-2 focus-visible:outline-petrol"
            data-testid="chat-input"
          />
          <Button type="submit" pending={sendPending} disabled={tooLong || !draft.trim()} data-testid="chat-send">
            {t.chat.send}
          </Button>
        </div>
        <div className="flex min-h-4 items-center justify-between gap-2 pt-0.5">
          <span className="font-mono text-[11px] text-failure" role="status" data-testid="chat-limit">
            {tooLong ? t.chat.limits.tooLong : (limitLine ?? '')}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {n >= CHAT_COUNTER_FROM && (
              <span className={cx('font-mono text-[11px]', tooLong ? 'text-failure' : 'text-muted')} data-testid="chat-counter">
                {t.chat.counter(n, CHAT.maxLength)}
              </span>
            )}
            {/* Review 7 #2 (design §23.1): the editor's rule, behind its label. */}
            <HelpButton
              notes={[t.help.editor() as HelpNote, t.help.chat() as HelpNote]}
              label={`What ${t.help.editor()[0] ?? ''} lets through`}
              testId="chat-editor-help"
              className="-my-3.5 px-1"
            >
              <span className={cx('font-mono text-[11px] text-muted', helpMark)}>{t.help.editor()[0]}</span>
            </HelpButton>
          </span>
        </div>
      </form>
      <Dialog.Root open={!!asking} onOpenChange={(o) => !o && setAsking(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="ease-sheet fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 bg-paper p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-ink sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2"
            data-testid="chat-report-sheet"
          >
            <Dialog.Title className="font-body text-[15px]">{t.chat.reportAsk}</Dialog.Title>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (asking) onReport(asking);
                  setAsking(null);
                  setRevealed(null);
                }}
                data-testid="chat-report-confirm"
              >
                {t.chat.report}
              </Button>
              <Dialog.Close asChild>
                <Button variant="outline" className="flex-1">
                  {t.chat.cancel}
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

/** A member's line (screens §2.5): avatar, name and rank, the time at the right, the text as text. */
export function ChatLine({
  line,
  mine,
  factionId,
  rankTitle,
  onName,
  reported,
  revealed,
  onReveal,
  onReport,
}: {
  line: ChatLineView;
  mine: boolean;
  factionId: FactionId;
  rankTitle: string;
  onName: (characterId: string) => void;
  reported: boolean;
  revealed: boolean;
  onReveal: () => void;
  onReport: () => void;
}) {
  const a = line.author;
  const press = useRef<number | null>(null);
  const start = () => {
    if (mine) return;
    press.current = window.setTimeout(onReveal, 500);
  };
  const stop = () => {
    if (press.current !== null) window.clearTimeout(press.current);
    press.current = null;
  };
  return (
    <li
      className={cx('group relative flex gap-2 border-b border-dotted border-faint px-3 py-2', mine && 'bg-paper-2')}
      data-testid="chat-line"
      data-mine={mine || undefined}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => {
        if (mine) return;
        e.preventDefault();
        onReveal();
      }}
    >
      <MemberFace avatarId={a?.avatarId ?? null} size={28} factionId={factionId} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          {a && (
            <button
              type="button"
              onClick={() => onName(a.characterId)}
              className="cursor-pointer truncate font-body text-[14px] font-semibold hover:underline"
              data-testid="chat-name"
            >
              {a.name}
            </button>
          )}
          <span className="truncate font-mono text-[10.5px] text-muted">{rankTitle}</span>
          <span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted">{formatClock(line.at)}</span>
        </div>
        <p className="font-body text-[15px] leading-snug break-words whitespace-pre-wrap" data-testid="chat-text">
          {line.text}
        </p>
        {reported ? (
          <span className="font-mono text-[10.5px] text-muted" data-testid="chat-reported">
            {t.chat.reported}
          </span>
        ) : (
          !mine && (
            <button
              type="button"
              onClick={onReport}
              className={cx(
                'label-caps min-h-11 cursor-pointer self-end px-2 text-[10.5px] text-muted underline',
                revealed ? 'flex items-center' : 'sr-only focus:not-sr-only [@media(hover:hover)]:group-hover:not-sr-only',
              )}
              data-testid="chat-report"
            >
              {t.chat.report}
            </button>
          )
        )}
      </div>
    </li>
  );
}

/** A system line (screens §2.5): ink rules, Courier, the button at the right; *for you* when addressed. */
export function SystemLine({
  line,
  forYou,
  pending,
  onButton,
}: {
  line: ChatLineView;
  forYou: boolean;
  pending?: boolean;
  onButton: (line: ChatLineView, button: ChatLineButton) => void;
}): ReactNode {
  const b = line.system?.button ?? null;
  return (
    <li
      className={cx('flex items-center gap-2 border-y border-ink px-3 py-1.5', forYou && 'bg-paper-2')}
      data-testid="chat-system"
      data-kind={line.system?.kind}
      data-for-you={forYou || undefined}
    >
      {forYou && <span className="label-caps shrink-0 text-[10px] text-petrol">{t.chat.forYou}</span>}
      <p className="min-w-0 flex-1 font-mono text-[12px] leading-snug">{systemLineText(line)}</p>
      <span className="shrink-0 font-mono text-[10.5px] text-muted">{formatClock(line.at)}</span>
      {b && (
        <Button
          variant="outline"
          className="shrink-0 px-2 text-[12px] whitespace-nowrap"
          pending={pending}
          onClick={() => onButton(line, b)}
          data-testid="chat-system-button"
        >
          {systemButtonLabel(b)}
        </Button>
      )}
    </li>
  );
}
