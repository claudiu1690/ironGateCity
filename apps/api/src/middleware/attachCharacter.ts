import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import '../types.js'; // ensure Request augmentation is registered

const CHARACTER_INCLUDE = {
  equipment: {
    include: { weapon: true, armour: true, utility: true, accessory: true, document: true },
  },
  bodyguards: { where: { active: true } },
  currentJob: true,
  currentCity: true,
} as const;

/**
 * Fetches the character from the database and attaches it to req.character.
 * Must be placed after requireAuth in the middleware chain.
 */
export async function attachCharacter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const character = await prisma.character.findUnique({
    where: { userId: req.auth.userId },
    include: CHARACTER_INCLUDE,
  });

  if (!character) {
    res.status(404).json({ error: 'Character not found for this account.' });
    return;
  }

  req.character = character;
  next();
}
