import type { GameContent } from '@irongate/content';
import { ChatMessage, isDuplicateKeyError } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { cityChannel, partyChannel, systemChannelFor } from '@irongate/rules';
import type { FactionId, SystemLineKind } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';
import { residenceCityId } from './residence';

/**
 * Slice 6 (ADR 0039): system lines are outbox inserts in the transaction that caused them, with a
 * `dedupeKey` so a retried or doubled cause writes one line. The change stream (ADR 0038) pushes the
 * insert to the channel's sockets after the commit; nothing here talks to a socket.
 */
export async function systemLine(
  session: ClientSession | null,
  i: {
    channel: string;
    factionId: FactionId;
    cityId: string | null;
    kind: SystemLineKind;
    payload: Record<string, unknown>;
    to?: Types.ObjectId;
    ref?: string;
    dedupeKey: string;
    at: Date;
  },
): Promise<void> {
  const doc = {
    channel: i.channel,
    factionId: i.factionId,
    cityId: i.cityId,
    kind: 'system' as const,
    characterId: null,
    name: null,
    avatarId: null,
    rank: null,
    text: null,
    system: { kind: i.kind, payload: i.payload, ...(i.to ? { to: i.to } : {}), ...(i.ref ? { ref: i.ref } : {}) },
    dedupeKey: i.dedupeKey,
    at: i.at,
  };
  if (session) {
    // Inside a transaction a duplicate would abort it: look first (the snapshot), then insert.
    if (await ChatMessage.exists({ dedupeKey: i.dedupeKey }).session(session)) return;
    await ChatMessage.create([doc], { session });
    return;
  }
  try {
    await ChatMessage.create([doc]);
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}

/** The branch channel of a place for a faction (tech §22.1 Q12): the place's city, else the residence's. */
export function branchChannel(
  content: GameContent,
  c: Pick<CharacterDoc, 'factionId' | 'residence' | 'homeCityId'>,
  placeCityId: string,
): { channel: string; cityId: string } {
  const chatCities = content.chatCities(c.factionId);
  const channel = systemChannelFor({
    factionId: c.factionId,
    placeCityId,
    residenceCityId: residenceCityId(c),
    chatCities,
  });
  const cityId = channel.split(':')[2] ?? placeCityId;
  return { channel, cityId };
}

export { cityChannel, partyChannel };
