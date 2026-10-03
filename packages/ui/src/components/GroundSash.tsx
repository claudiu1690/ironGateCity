import { copy } from '@irongate/content/copy';
import { FACTION_IDS } from '@irongate/rules';
import type { FactionId, OpinionShares } from '@irongate/rules';
import { cx, formatShare } from '../format';
import { FactionCrest } from './FactionCrest';
import { HelpButton } from './Help';

/**
 * The ground sash (slice-4 screens, added 3 Oct 2026, the user's ask): whose ground a place is, as a
 * printed band across the top-right corner of the big scene art. In a home city the party with the
 * largest share; in the capital the party leading that district; *Contested* (grey) in a close race
 * or when no party leads; a party's headquarters always its own party. Drawn from the faction colour
 * tokens and the crest shapes; no new art. It says whose ground it is, never the player's own party.
 */
export interface Ground {
  /** null: *Contested*, the grey band. */
  factionId: FactionId | null;
  /** The band's word: the party's short name, or *Contested*. */
  word: string;
  /** The one-line note behind a tap. Opinion shares are not odds (screens §11), so it may say "70 %". */
  note: string;
}

/**
 * Whose ground a place is, from what the server already sent (the place's shares, the district's
 * close race, the headquarters' party). The shares are the district's in the capital and the city's
 * at home; this words them and decides nothing in the game.
 */
export function groundOf(i: {
  shares: OpinionShares | null;
  names: Partial<Record<FactionId, string>>;
  /** The district is a close race today (the capital): Contested whatever the lead. */
  closeRace?: boolean;
  /** A party's headquarters: always its own party (members only act there). */
  hq?: FactionId | null;
}): Ground {
  const name = (f: FactionId) => i.names[f] ?? f;
  if (i.hq) return { factionId: i.hq, word: name(i.hq), note: copy.sash.hq(name(i.hq)) };
  const contested: Ground = { factionId: null, word: copy.sash.contested, note: copy.sash.contestedNote };
  if (!i.shares || i.closeRace) return contested;
  const shares = i.shares;
  const sorted = [...FACTION_IDS].sort((a, b) => shares[b] - shares[a]);
  const top = sorted[0]!;
  if (shares[top] <= shares[sorted[1]!]) return contested;
  return { factionId: top, word: name(top), note: copy.sash.holds(name(top), formatShare(shares[top])) };
}

/** Text on the band at 4.5:1: ink on the ochre and the grey, paper on the oxblood and the slate. */
const INK_ON: ReadonlySet<FactionId | null> = new Set<FactionId | null>(['vanguard', null]);

export interface GroundSashProps {
  ground: Ground;
  className?: string;
}

/**
 * The band (tokens.css `.ground-sash`): about 26 % of the art's width along each edge on a phone, a
 * little less from 640 px; it slides in with the art (150 ms) and stands still with reduced motion. The
 * whole corner is the tap target (at least 44 px): a tap opens the one-line note.
 */
export function GroundSash({ ground, className }: GroundSashProps) {
  const ink = INK_ON.has(ground.factionId);
  const color = ink ? 'var(--color-ink)' : 'var(--color-paper)';
  return (
    <HelpButton
      notes={[[ground.word, ground.note]]}
      label={copy.sash.label(ground.word)}
      testId="ground-sash"
      className={cx('ground-sash', className)}
    >
      <span
        className={cx('ground-sash-band label-caps', ink ? 'text-ink' : 'text-paper')}
        style={{
          backgroundColor: ground.factionId ? `var(--color-${ground.factionId})` : 'var(--color-neutral)',
        }}
        data-faction={ground.factionId ?? 'contested'}
        aria-hidden="true"
      >
        {ground.factionId && <FactionCrest factionId={ground.factionId} size={9} color={color} />}
        <span>{ground.word}</span>
      </span>
    </HelpButton>
  );
}
