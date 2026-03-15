import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as paymentService from '../services/paymentService.js';

const router = Router();

// GET /payments/packs  (no auth required — public pricing)
router.get('/packs', (_req, res) => {
  res.json(paymentService.listPacks());
});

// POST /payments/create-checkout  (auth required)
router.post('/create-checkout', requireAuth, attachCharacter, async (req: Request, res: Response, next: NextFunction) => {
  const schema = z.object({ packSlug: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await paymentService.createCheckout(
      req.auth!.userId,
      req.character!.id,
      parsed.data.packSlug,
    );
    res.json(result);
  } catch (err) { next(err); }
});

// POST /payments/webhook  (raw body, no auth — validated via Stripe signature)
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header.' });

  try {
    await paymentService.handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err) { next(err); }
});

export default router;
