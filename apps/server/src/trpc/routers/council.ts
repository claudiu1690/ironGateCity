import { Types } from 'mongoose';
import { z } from 'zod';
import { declare, endorse, setRule, vote } from '../../services/councilService';
import { ensureCityDay } from '../../services/cityDay';
import { loadCharacter } from '../../services/dayService';
import { ballotView, electionView, getCapitalCount, getCount } from '../../services/politicsService';
import { residenceCityId } from '../../services/residence';
import { markWhatNowSeen, townHallView } from '../../services/townHallService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 3 (tech design §8.1); the voting rework (tech design §8.4): the council and the town's vote on
 * its rule. No act names a city or a character: the session's character and its residence decide
 * everything (§13); the reads `ballot` and `hall` may look at another city's.
 */
export const councilRouter = router({
  /** Who's standing and the stand card: never another voter's choice or a total. */
  election: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc, city } = await loadCharacter(ctx.user, ctx.content, now);
    return electionView(ctx.content, doc, now, null, city);
  }),

  /**
   * The voting rework (tech design §8.4): next week's rule for a city (default: the residence). Days
   * 0–1 the provisional cards, days 2–4 the set cards; the caller's own vote only (ADR 0019).
   */
  ballot: protectedProcedure
    .input(z.object({ cityId: z.string().min(1) }).optional())
    .query(async ({ ctx, input }) => {
      const now = ctx.now();
      const { doc, city } = await loadCharacter(ctx.user, ctx.content, now);
      const cityId = input?.cityId ?? residenceCityId(doc);
      const cityDoc = cityId === residenceCityId(doc) ? city : await ensureCityDay(ctx.content, cityId, now);
      return ballotView(ctx.content, doc, cityId, cityDoc, now);
    }),

  /** The latest counted election by default; null while the asked-for election is open. */
  count: protectedProcedure
    .input(
      z
        .object({
          // Slice 4: a district's election too ('irongate.eastside:4146').
          electionId: z
            .string()
            .regex(/^[a-z]+(\.[a-z-]+)?:\d+$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = ctx.now();
      const { doc } = await loadCharacter(ctx.user, ctx.content, now);
      return getCount(ctx.content, doc, input?.electionId, now);
    }),

  /** Slice 4 (tech design §8.1, §10.5): the capital's count, five districts, by its council key. */
  capitalCount: protectedProcedure
    .input(
      z
        .object({
          cycleKey: z
            .string()
            .regex(/^[a-z]+:\d+$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = ctx.now();
      const { doc } = await loadCharacter(ctx.user, ctx.content, now);
      return getCapitalCount(ctx.content, doc, input?.cycleKey, now);
    }),

  /**
   * Review 4 (ADR 0077); the voting rework: the Town Hall's sheet for any city with a council: the rule
   * in force, next week's rule, the council, the stand card, and the councillor's rule.
   */
  hall: protectedProcedure.input(z.object({ cityId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const now = ctx.now();
    const { doc } = await loadCharacter(ctx.user, ctx.content, now);
    return townHallView(ctx.content, doc, input.cityId, now);
  }),

  /** Review 4 (answers §10.1): *What now* was shown; a conditional write, idempotent with no key. */
  whatNowSeen: protectedProcedure
    .input(z.object({ termId: z.string().regex(/^[0-9a-f]{24}$/) }))
    .mutation(async ({ ctx, input }) => {
      const now = ctx.now();
      const { doc } = await loadCharacter(ctx.user, ctx.content, now);
      return markWhatNowSeen(doc, new Types.ObjectId(input.termId), now);
    }),

  /** Stand with a rule (days 0–1, 10 Political Capital spent; ADR 0084). */
  declare: protectedProcedure
    .input(z.object({ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => declare({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** Back a standing candidate (days 0–4, until the count). */
  endorse: protectedProcedure
    .input(z.object({ candidacyId: z.string().regex(/^[0-9a-f]{24}$/), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => endorse({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** One tap, one rule card, secret and final (ADR 0083, ADR 0019). */
  vote: protectedProcedure
    .input(z.object({ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => vote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** A councillor names the rule they put to the town (the term's days 0–1, free; ADR 0084). */
  setRule: protectedProcedure
    .input(z.object({ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => setRule({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
