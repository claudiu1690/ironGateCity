import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as hospitalService from '../services/hospitalService.js';
import * as barService from '../services/barService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// ── Hospital ─────────────────────────────────────────────────────────────────

// GET /city/hospital
router.get('/hospital', async (req, res, next) => {
  try {
    const status = await hospitalService.getStatus(req.character!);
    res.json(status);
  } catch (err) { next(err); }
});

// POST /city/hospital/treat/:service
router.post('/hospital/treat/:service', async (req, res, next) => {
  try {
    const result = await hospitalService.treat(req.character!, req.params.service);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Bar ───────────────────────────────────────────────────────────────────────

// GET /city/bar
router.get('/bar', async (req, res, next) => {
  try {
    const services = barService.listServices();
    res.json(services);
  } catch (err) { next(err); }
});

// POST /city/bar/action/:action
router.post('/bar/action/:action', async (req, res, next) => {
  const schema = z.object({ bet: z.number().int().positive().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await barService.performAction(req.character!, req.params.action, parsed.data.bet);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
