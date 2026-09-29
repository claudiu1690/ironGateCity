import type { GameErrorData, GameErrorReason } from '@irongate/rules';
import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';

/**
 * A game-rule refusal with a reason the client can switch on. Carried as the `cause` of a
 * TRPCError; the errorFormatter copies it into `error.data.game`. Thrown inside a transaction, it
 * aborts it and is turned into a TRPCError with its `code` by the caller.
 */
export class GameError extends Error {
  override name = 'GameError';

  constructor(
    readonly reason: GameErrorReason,
    readonly data: Record<string, unknown> = {},
    readonly code: TRPC_ERROR_CODE_KEY = 'PRECONDITION_FAILED',
  ) {
    super(reason);
  }

  toData(): GameErrorData {
    return { ...this.data, reason: this.reason };
  }

  toTRPC(): TRPCError {
    return new TRPCError({ code: this.code, message: this.reason, cause: this });
  }
}

export function gameError(
  code: TRPC_ERROR_CODE_KEY,
  reason: GameErrorReason,
  data: Record<string, unknown> = {},
): TRPCError {
  return new GameError(reason, data, code).toTRPC();
}
