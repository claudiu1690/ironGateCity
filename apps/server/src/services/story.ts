import type { GameContent } from '@irongate/content';
import { fillTemplate } from '@irongate/rules';
import type { FactionId, StoryPlaceholder, StoryScreenView } from '@irongate/rules';
import { assetView } from './views';

export type StoryVars = Partial<Record<StoryPlaceholder, string>>;

/**
 * Tech design §4.4: the story placeholders, resolved on the server before any text leaves it:
 * `{name}`, `{secretary}` (the secretary's form of address), `{hq}` and `{city}` (the home city).
 * Before a faction is chosen only `{name}` is known.
 */
export function storyVars(
  content: GameContent,
  c: { name: string; factionId?: FactionId | null },
): StoryVars {
  if (!c.factionId) return { name: c.name };
  const f = content.faction(c.factionId);
  return {
    name: c.name,
    secretary: f.secretary.addressedAs,
    hq: f.hqRef,
    city: content.city(f.homeCityId)?.name ?? f.homeCityId,
  };
}

export const fill = (text: string, vars: StoryVars): string => fillTemplate(text, vars);

/** A scene for a story screen's art panel, with its focus point (ADR 0015). */
export function sceneArt(content: GameContent, assetId: string): StoryScreenView['art'] {
  const asset = assetView(content, assetId);
  return { kind: 'scene', asset, focus: asset.focus };
}
