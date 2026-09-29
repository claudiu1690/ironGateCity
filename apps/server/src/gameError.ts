import type { GameErrorData, GameErrorReason } from '@irongate/rules';
import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';

/**
 * A game-rule refusal with a reason the client can switch on. Carried as the `cause` of a
 * TRPCError; the errorFormatter copies it into `error.data.game`.
 */
export class GameError extends Error {
  override name = 'GameError';

  constructor(
    readonly reason: GameErrorReason,
    readonly data: Record<string, unknown> = {},
  ) {
    super(reason);
  }

  toData(): GameErrorData {
    return { ...this.data, reason: this.reason };
  }
}

export function gameError(
  code: TRPC_ERROR_CODE_KEY,
  reason: GameErrorReason,
  data: Record<string, unknown> = {},
): TRPCError {
  return new TRPCError({ code, message: reason, cause: new GameError(reason, data) });
}
