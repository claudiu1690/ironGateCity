import { z } from 'zod';
import { factionHq, factionMembers, factionProfile, factionScoreboard } from '../../services/factionService';
import { postBail, visitMate } from '../../services/favourService';
import { presenceAt } from '../../services/presenceService';
import {
  chatChannels,
  chatHistory,
  chatMute,
  chatPost,
  chatReport,
  chatSeen,
  chatSetHidden,
} from '../../services/chatService';
import { protectedProcedure, router } from '../trpc';

const Oid = z.string().regex(/^[0-9a-f]{24}$/);
const Channel = z
  .string()
  .regex(/^(party:(vanguard|collective|alliance)|city:(vanguard|collective|alliance):[a-z-]+)$/);

/** Slice 6 (tech design §8.1): the Faction tab's reads. */
export const factionRouter = router({
  hq: protectedProcedure.query(({ ctx }) => factionHq({ user: ctx.user, content: ctx.content, now: ctx.now })),
  members: protectedProcedure
    .input(
      z.object({
        q: z.string().trim().min(1).max(40).optional(),
        cursor: z.string().max(80).optional(),
        filter: z.enum(['all', 'hereNow']).default('all'),
      }),
    )
    .query(({ ctx, input }) => factionMembers({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  profile: protectedProcedure
    .input(z.object({ characterId: Oid }))
    .query(({ ctx, input }) => factionProfile({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  scoreboard: protectedProcedure
    .input(z.object({ period: z.enum(['week', 'all']), cityId: z.string().min(1).nullable().default(null) }))
    .query(({ ctx, input }) => factionScoreboard({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

/** Slice 6 (tech design §8.1; ADR 0041): favours between faction mates. */
export const favoursRouter = router({
  postBail: protectedProcedure
    .input(z.object({ characterId: Oid, idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => postBail({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  visit: protectedProcedure
    .input(z.object({ characterId: Oid, idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => visitMate({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

/** Slice 6 (tech design §8.1; ADR 0040): a place's sheet opened; returns its *Here now* line. */
export const presenceRouter = router({
  at: protectedProcedure
    .input(z.object({ locationId: z.string().min(1) }))
    .mutation(({ ctx, input }) => presenceAt({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

/** Slice 6 (tech design §8.1; ADR 0038, 0039): faction chat. Posting is a mutation; the socket pushes. */
export const chatRouter = router({
  channels: protectedProcedure.query(({ ctx }) => chatChannels({ user: ctx.user, content: ctx.content, now: ctx.now })),
  history: protectedProcedure
    .input(z.object({ channel: Channel, before: Oid.optional() }))
    .query(({ ctx, input }) => chatHistory({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  post: protectedProcedure
    .input(z.object({ channel: Channel, text: z.string().max(2_000), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => chatPost({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  seen: protectedProcedure.mutation(({ ctx }) => chatSeen({ user: ctx.user, content: ctx.content, now: ctx.now })),
  report: protectedProcedure
    .input(z.object({ messageId: Oid }))
    .mutation(({ ctx, input }) => chatReport({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  mute: protectedProcedure
    .input(z.object({ characterId: Oid, muted: z.boolean() }))
    .mutation(({ ctx, input }) => chatMute({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  setHidden: protectedProcedure
    .input(z.object({ hidden: z.boolean() }))
    .mutation(({ ctx, input }) => chatSetHidden({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
