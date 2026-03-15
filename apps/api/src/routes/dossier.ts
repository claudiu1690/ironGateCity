import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as dossierService from '../services/dossierService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// GET /dossier
router.get('/', async (req, res, next) => {
  try {
    const result = await dossierService.listEntries(req.character!.id, req.character!.int);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /dossier/surveillance
router.post('/surveillance', async (req, res, next) => {
  try {
    const entries = await dossierService.performSurveillance(req.character!);
    res.json({ entries, count: entries.length });
  } catch (err) { next(err); }
});

// DELETE /dossier/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await dossierService.discardEntry(req.character!.id, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /dossier/:id/sell
router.post('/:id/sell', async (req, res, next) => {
  try {
    const result = await dossierService.sellEntry(req.character!.id, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
