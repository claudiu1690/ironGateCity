import { Request, Response, NextFunction } from 'express';

// ─── Standard error codes (§10.1) ────────────────────────────────────────────

export const ErrorCode = {
  INSUFFICIENT_ENERGY:  'INSUFFICIENT_ENERGY',
  HOSPITALISED:         'HOSPITALISED',
  GATE_NOT_MET:         'GATE_NOT_MET',
  WRONG_CITY:           'WRONG_CITY',
  INSUFFICIENT_IRON:    'INSUFFICIENT_IRON',
  DAILY_LIMIT_REACHED:  'DAILY_LIMIT_REACHED',
  DOSSIER_FULL:         'DOSSIER_FULL',
  FACTION_MISMATCH:     'FACTION_MISMATCH',
  ELECTION_NOT_ACTIVE:  'ELECTION_NOT_ACTIVE',
  ALREADY_VOTED:        'ALREADY_VOTED',
  NOT_PRESIDENT:        'NOT_PRESIDENT',
  UNAUTHORISED:         'UNAUTHORISED',
  RATE_LIMIT:           'RATE_LIMIT',
  NOT_FOUND:            'NOT_FOUND',
  CONFLICT:             'CONFLICT',
  VALIDATION:           'VALIDATION',
  INTERNAL:             'INTERNAL',
} as const;

export type ErrorCodeValue = typeof ErrorCode[keyof typeof ErrorCode];

// ─── AppError ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeValue | string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCodeValue | string = ErrorCode.INTERNAL,
    details?: unknown,
  ) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    this.details    = details;
  }

  /** Helpers for the most common domain errors */
  static insufficientEnergy(have: number, need: number) {
    return new AppError(400, `Insufficient energy — need ${need}, have ${have}.`, ErrorCode.INSUFFICIENT_ENERGY, { have, need });
  }

  static hospitalised() {
    return new AppError(403, 'You are hospitalised and cannot perform this action.', ErrorCode.HOSPITALISED);
  }

  static gateNotMet(reason: string, details?: unknown) {
    return new AppError(403, reason, ErrorCode.GATE_NOT_MET, details);
  }

  static wrongCity(expected: string, current: string) {
    return new AppError(403, `This mission requires you to be in ${expected}.`, ErrorCode.WRONG_CITY, { expected, current });
  }

  static insufficientIron(have: number, need: number) {
    return new AppError(400, `Insufficient Iron — need ${need}, have ${have}.`, ErrorCode.INSUFFICIENT_IRON, { have, need });
  }

  static dailyLimit(action: string) {
    return new AppError(429, `Daily limit reached for: ${action}.`, ErrorCode.DAILY_LIMIT_REACHED, { action });
  }

  static dossierFull() {
    return new AppError(400, 'Dossier is full — sell or discard entries before adding new ones.', ErrorCode.DOSSIER_FULL);
  }

  static factionMismatch(required: string) {
    return new AppError(403, `This action requires faction: ${required}.`, ErrorCode.FACTION_MISMATCH, { required });
  }

  static electionNotActive() {
    return new AppError(400, 'No active election exists for this faction.', ErrorCode.ELECTION_NOT_ACTIVE);
  }

  static alreadyVoted() {
    return new AppError(409, 'You have already cast your vote in this election.', ErrorCode.ALREADY_VOTED);
  }

  static notPresident() {
    return new AppError(403, 'Only the active President may perform this action.', ErrorCode.NOT_PRESIDENT);
  }

  static unauthorised(msg = 'Invalid or expired token.') {
    return new AppError(401, msg, ErrorCode.UNAUTHORISED);
  }

  static notFound(resource = 'Resource') {
    return new AppError(404, `${resource} not found.`, ErrorCode.NOT_FOUND);
  }
}

// ─── Standard error response shape (§10.1) ───────────────────────────────────

interface ErrorResponse {
  error: {
    code:     string;
    message:  string;
    details?: unknown;
  };
}

function makeErrorBody(code: string, message: string, details?: unknown): ErrorResponse {
  const body: ErrorResponse = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return body;
}

// ─── Global error handler middleware ─────────────────────────────────────────

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // AppError — our own domain errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json(makeErrorBody(err.code, err.message, err.details));
    return;
  }

  // Zod validation errors (thrown by routes via .parse())
  if (err.name === 'ZodError') {
    const zodErr = err as unknown as { issues: { path: string[]; message: string }[] };
    res.status(422).json(
      makeErrorBody(ErrorCode.VALIDATION, 'Validation failed.', zodErr.issues),
    );
    return;
  }

  // Prisma known request errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      res.status(409).json(
        makeErrorBody(ErrorCode.CONFLICT, `Unique constraint violation on: ${prismaErr.meta?.target?.join(', ')}`),
      );
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json(makeErrorBody(ErrorCode.NOT_FOUND, 'Record not found.'));
      return;
    }
  }

  // Catch-all
  console.error('[Unhandled Error]', err);
  res.status(500).json(makeErrorBody(ErrorCode.INTERNAL, 'Internal server error.'));
}
