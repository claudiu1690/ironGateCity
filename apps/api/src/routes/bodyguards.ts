import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as bodyguardService from '../services/bodyguardService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// GET /bodyguards
router.get('/', async (req, res, next) => {
  try {
    const guards = await bodyguardService.listActive(req.character!.id);
    res.json(guards);
  } catch (err) { next(err); }
});

// POST /bodyguards/hire/:tier
router.post('/hire/:tier', async (req, res, next) => {
  const tier = parseInt(req.params.tier, 10);
  if (isNaN(tier)) return res.status(400).json({ error: 'Tier must be a number.' });
  try {
    await bodyguardService.hire(req.character!, tier);
    res.status(201).json({ success: true, tier });
  } catch (err) { next(err); }
});

// DELETE /bodyguards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await bodyguardService.dismiss(req.character!, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
