import { Router } from 'express';
import { z } from 'zod';
import { Faction } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as characterService from '../services/characterService.js';
import { getEnergy } from '../services/energyService.js';
import { getCriminalLevel } from '../services/ruleEngine.js';
import { getPublicProfile } from '../services/characterService.js';

const router = Router();

// All character routes require auth + attached character
router.use(requireAuth, attachCharacter);

// GET /character/me
router.get('/me', async (req, res, next) => {
  try {
    const character = req.character!;
    const energy = await getEnergy(character.id);
    const criminalLevel = getCriminalLevel(character.criminalPoints);

    res.json({
      ...character,
      energy,
      criminalLevel,
    });
  } catch (err) { next(err); }
});

// GET /character/me/energy
router.get('/me/energy', async (req, res, next) => {
  try {
    const energy = await getEnergy(req.character!.id);
    res.json(energy);
  } catch (err) { next(err); }
});

// POST /character/faction
router.post('/faction', async (req, res, next) => {
  const schema = z.object({
    faction: z.nativeEnum(Faction),
    originChoice: z.enum(['strength', 'wisdom', 'speed']).optional().default('strength'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await characterService.setFaction(req.character!, parsed.data.faction, parsed.data.originChoice);
    res.json({ success: true, faction: parsed.data.faction });
  } catch (err) { next(err); }
});

// GET /character/:id  (public profile — still requires auth)
router.get('/:id', async (req, res, next) => {
  try {
    const profile = await getPublicProfile(req.params.id);
    res.json(profile);
  } catch (err) { next(err); }
});

// POST /character/travel
router.post('/travel', async (req, res, next) => {
  const schema = z.object({ citySlug: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await characterService.travel(req.character!, parsed.data.citySlug);
    res.json({ success: true, newCity: parsed.data.citySlug });
  } catch (err) { next(err); }
});

export default router;
