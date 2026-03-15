import { Router } from 'express';
import { z } from 'zod';
import { Faction } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as politicsService from '../services/politicsService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// GET /politics/influence
router.get('/influence', async (req, res, next) => {
  try {
    const influence = await politicsService.getInfluence();
    res.json(influence);
  } catch (err) { next(err); }
});

// GET /politics/election
router.get('/election', async (req, res, next) => {
  try {
    const faction = req.query.faction as Faction | undefined;
    const election = await politicsService.getElection(faction);
    res.json(election ?? null);
  } catch (err) { next(err); }
});

// POST /politics/election/nominate
router.post('/election/nominate', async (req, res, next) => {
  const schema = z.object({ manifesto: z.string().max(500).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await politicsService.nominate(req.character!, parsed.data.manifesto);
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

// POST /politics/election/vote/:candidateId
router.post('/election/vote/:candidateId', async (req, res, next) => {
  try {
    await politicsService.vote(req.character!, req.params.candidateId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /politics/laws
router.get('/laws', async (req, res, next) => {
  try {
    const laws = await politicsService.getActiveLaws();
    res.json(laws);
  } catch (err) { next(err); }
});

// POST /politics/laws/propose
router.post('/laws/propose', async (req, res, next) => {
  const schema = z.object({
    title: z.string().min(3).max(80),
    description: z.string().min(10).max(500),
    category: z.string().min(2).max(40),
    effect: z.object({
      type: z.string(),
      value: z.number(),
      targetFaction: z.nativeEnum(Faction).nullable().optional(),
      nightOnly: z.boolean().optional(),
    }),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const law = await politicsService.proposeLaw(req.character!, parsed.data);
    res.status(201).json(law);
  } catch (err) { next(err); }
});

// POST /politics/laws/:id/vote
router.post('/laws/:id/vote', async (req, res, next) => {
  const schema = z.object({ voteFor: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await politicsService.voteOnLaw(req.character!, req.params.id, parsed.data.voteFor);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
