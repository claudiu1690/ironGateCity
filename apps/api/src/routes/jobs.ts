import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as jobService from '../services/jobService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// GET /jobs/available
router.get('/available', async (req, res, next) => {
  try {
    const jobs = await jobService.listAvailable(req.character!);
    res.json(jobs);
  } catch (err) { next(err); }
});

// POST /jobs/:id/take
router.post('/:id/take', async (req, res, next) => {
  try {
    await jobService.takeJob(req.character!, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /jobs/work
router.post('/work', async (req, res, next) => {
  try {
    const result = await jobService.doWork(req.character!);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /jobs/quit
router.post('/quit', async (req, res, next) => {
  try {
    await jobService.quitJob(req.character!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
