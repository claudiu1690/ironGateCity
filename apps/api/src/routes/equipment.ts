import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as equipmentService from '../services/equipmentService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// GET /equipment/inventory
router.get('/inventory', async (req, res, next) => {
  try {
    const inventory = await equipmentService.getInventory(req.character!.id);
    res.json(inventory);
  } catch (err) { next(err); }
});

// GET /equipment/shop
router.get('/shop', async (req, res, next) => {
  try {
    const items = await equipmentService.getShop(req.character!);
    res.json(items);
  } catch (err) { next(err); }
});

// POST /equipment/buy/:itemId
router.post('/buy/:itemId', async (req, res, next) => {
  try {
    await equipmentService.buyItem(req.character!, req.params.itemId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /equipment/equip/:inventoryId
router.post('/equip/:inventoryId', async (req, res, next) => {
  try {
    const newCharisma = await equipmentService.equipItem(req.character!, req.params.inventoryId);
    res.json({ success: true, newCharisma });
  } catch (err) { next(err); }
});

// POST /equipment/craft
router.post('/craft', async (req, res, next) => {
  const schema = z.object({
    inventoryId1: z.string().cuid(),
    inventoryId2: z.string().cuid(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await equipmentService.craftItems(
      req.character!,
      parsed.data.inventoryId1,
      parsed.data.inventoryId2,
    );
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
