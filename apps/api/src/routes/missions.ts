import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachCharacter } from '../middleware/attachCharacter.js';
import * as missionService from '../services/missionService.js';

const router = Router();
router.use(requireAuth, attachCharacter);

// GET /missions
router.get('/', async (req, res, next) => {
  try {
    const missions = await missionService.listMissions(req.character!);
    res.json(missions);
  } catch (err) { next(err); }
});

// GET /missions/history
router.get('/history', async (req, res, next) => {
  try {
    const history = await missionService.getMissionHistory(req.character!.id);
    res.json(history);
  } catch (err) { next(err); }
});

// POST /missions/:id/start
router.post('/:id/start', async (req, res, next) => {
  try {
    const raw = await missionService.startMission(req.character!, req.params.id);

    const NARRATIVES: Record<string, string> = {
      SUCCESS:         raw.combat ? 'You fought through resistance and completed the objective.' : 'Flawless execution. The objective is secured.',
      PARTIAL_SUCCESS: 'You achieved part of the objective but had to pull out early.',
      FAILURE:         'The mission was blown. You escaped clean, but empty-handed.',
      ENCOUNTER_WIN:   'You handled the contact. The objective is complete.',
      ENCOUNTER_LOSS:  'They had more people than expected. You barely made it out alive.',
    };

    // Normalise combat log field names (playerHpAfter → playerHp etc.)
    const combatLog = (raw.combat as any)?.combatLog?.map((r: any) => ({
      round:        r.round,
      playerDamage: r.playerDamage,
      npcDamage:    r.npcDamage,
      playerHp:     r.playerHpAfter,
      npcHp:        r.npcHpAfter,
      npcName:      (raw.combat as any)?.npcSlug ?? 'Enemy',
    })) ?? [];

    res.json({
      outcome:    raw.outcome,
      narrative:  NARRATIVES[raw.outcome] ?? '',
      xpGained:   raw.rewards.xp,
      ironGained: raw.rewards.iron,
      fxpGained:  raw.rewards.fxp,
      combatLog,
      leveledUp:  raw.levelUp !== null,
      newLevel:   raw.levelUp?.newLevel,
      rankedUp:   raw.rankUp !== null,
      newRank:    raw.rankUp?.newRank,
    });
  } catch (err) { next(err); }
});

export default router;
