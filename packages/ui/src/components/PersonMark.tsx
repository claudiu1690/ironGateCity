import type { AssetView, FactionId } from '@irongate/rules';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { Picture } from './Picture';

/**
 * Marks (slice-3 screens §1): a player's avatar in a ring; an NPC's small faction mark in the same
 * ring. Its own module so the council's components (`Politics`, `RuleCard`, `TownHall`) share it.
 */
export function PersonMark({
  avatar,
  factionId,
  size = 32,
}: {
  avatar: AssetView | null;
  factionId: FactionId;
  size?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-paper-2"
      style={{ width: size, height: size, borderColor: FACTION_STYLE[factionId].color }}
      aria-hidden="true"
      data-mark={avatar ? 'avatar' : 'ward'}
    >
      {avatar ? (
        <Picture asset={avatar} sizes={`${size}px`} decorative className="size-full object-cover object-top" />
      ) : (
        <FactionCrest factionId={factionId} size={12} />
      )}
    </span>
  );
}
