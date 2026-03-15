import type { Prisma } from '@prisma/client';

/** Full character payload used by middleware and services */
export type CharacterFull = Prisma.CharacterGetPayload<{
  include: {
    equipment: {
      include: {
        weapon: true;
        armour: true;
        utility: true;
        accessory: true;
        document: true;
      };
    };
    bodyguards: true;
    currentJob: true;
    currentCity: true;
  };
}>;

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      character?: CharacterFull;
    }
  }
}
