import type { GameContent } from '@irongate/content';

export interface SessionUser {
  id: string;
  name: string;
}

export interface Context {
  /** The Better Auth user, or null when signed out. */
  user: SessionUser | null;
  content: GameContent;
  /** The server clock. Injected so tests can move time (lazy timers). */
  now: () => number;
}
