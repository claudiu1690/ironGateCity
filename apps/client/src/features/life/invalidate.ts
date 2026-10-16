import type { QueryClient } from '@tanstack/react-query';
import { trpc } from '../../lib/trpc';

/**
 * Slice 8 phase C, lane P (tech design §24.6, Deviations phase B lane 1): the life cards and the Me
 * tab's life line are their own queries (`life.place`, `life.me`, `wardrobe.get`), so every act that
 * changes the character invalidates them with `character.me` (the buffs, his row, Iron, Charisma).
 */
export function invalidateLife(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: trpc.life.pathKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.wardrobe.get.queryKey() });
}
