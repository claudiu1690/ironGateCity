import type { Server as HttpServer } from 'node:http';
import type { GameContent } from '@irongate/content';
import { Character, ChatMessage } from '@irongate/db';
import type { CharacterDoc, ChatMessageDoc } from '@irongate/db';
import { fromNodeHeaders } from 'better-auth/node';
import { Server } from 'socket.io';
import type { Auth } from './auth';
import { captureException } from './sentry';
import { channelsFor, lineView } from './services/chatService';

/**
 * Slice 6 (ADR 0038; tech design §8.5): the chat socket, push only. Socket.IO on `/api/socket.io`
 * through the same-origin proxy (`ws: true`); the handshake reads the Better Auth session from the
 * cookie (as tRPC does) and joins the faction's channel rooms and `char:{id}`. No client→server
 * events are handled. Fan-out is a MongoDB change stream on `chatMessages` inserts in this process,
 * so a line written by any process (the worker's too) reaches every API's sockets; no Redis.
 */

const MAX_SOCKETS_PER_USER = 5;

export interface ChatSocketHandle {
  close(): Promise<void>;
}

export function attachChat(
  httpServer: HttpServer,
  deps: { auth: Auth; content: GameContent; publicOrigin: string; log?: (m: string) => void },
): ChatSocketHandle {
  const log = deps.log ?? (() => {});
  const allowed = new Set([deps.publicOrigin]);
  const io = new Server(httpServer, {
    path: '/api/socket.io',
    serveClient: false,
    maxHttpBufferSize: 1e4,
    // A cross-origin handshake is refused (ADR 0038); a request without Origin (a same-origin
    // non-browser client) is allowed: the session cookie is still required below.
    allowRequest: (req, cb) => {
      const origin = req.headers.origin;
      if (!origin) return cb(null, true);
      const host = req.headers.host;
      const same = allowed.has(origin) || (host !== undefined && new URL(origin).host === host);
      cb(same ? null : 'cross-origin', same);
    },
  });
  const perUser = new Map<string, number>();

  io.use(async (socket, next) => {
    try {
      const headers = fromNodeHeaders(socket.request.headers);
      const session = await deps.auth.api.getSession({ headers });
      if (!session) return next(new Error('unauthorised'));
      const c = await Character.findOne({ userId: session.user.id }, { _id: 1, factionId: 1, chat: 1 }).lean<CharacterDoc>();
      if (!c) return next(new Error('no character'));
      const n = perUser.get(session.user.id) ?? 0;
      if (n >= MAX_SOCKETS_PER_USER) return next(new Error('too many sockets'));
      perUser.set(session.user.id, n + 1);
      socket.data.userId = session.user.id;
      socket.data.characterId = c._id.toHexString();
      socket.data.rooms = [...channelsFor(deps.content, c), `char:${c._id.toHexString()}`];
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on('connection', (socket) => {
    for (const room of socket.data.rooms as string[]) void socket.join(room);
    socket.emit('chat:ready', { rooms: socket.data.rooms });
    socket.on('disconnect', () => {
      const u = socket.data.userId as string;
      const n = (perUser.get(u) ?? 1) - 1;
      if (n <= 0) perUser.delete(u);
      else perUser.set(u, n);
    });
  });

  let stream: ReturnType<typeof ChatMessage.watch> | null = null;
  let resumeAfter: unknown = undefined;
  let closed = false;
  const open = () => {
    if (closed) return;
    stream = ChatMessage.watch<ChatMessageDoc>([{ $match: { operationType: 'insert' } }], {
      ...(resumeAfter ? { resumeAfter } : {}),
    });
    stream.on('change', (ev: { _id: unknown; fullDocument?: ChatMessageDoc }) => {
      resumeAfter = ev._id;
      const doc = ev.fullDocument;
      if (!doc) return;
      const line = lineView(doc);
      io.to(doc.channel).emit('chat:line', line);
      if (doc.system?.to) io.to(`char:${doc.system.to.toHexString()}`).emit('chat:forYou', { id: line.id });
    });
    stream.on('error', (err: unknown) => {
      captureException(err, { where: 'chat change stream' });
      log(`chat change stream error: ${(err as Error).message}`);
      void stream?.close().catch(() => {});
      stream = null;
      setTimeout(open, 1_000);
    });
  };
  open();

  return {
    async close() {
      closed = true;
      await stream?.close().catch(() => {});
      io.disconnectSockets(true);
    },
  };
}
