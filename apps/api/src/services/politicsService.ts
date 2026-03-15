import { createHmac } from 'crypto';
import { Faction, LawStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { computeNationalControl } from './ruleEngine.js';
import { broadcastLaw, broadcastLawActivated } from '../socket/index.js';
import { scheduleLawExpiry } from '../jobs/index.js';
import type { CharacterFull } from '../types.js';

// ─── Influence ────────────────────────────────────────────────────────────────

export async function getInfluence() {
  const cityInfluences = await prisma.cityInfluence.findMany({
    include: { city: true },
  });
  const national = computeNationalControl(cityInfluences);

  // Reshape so each entry is { id, name, slug, influence: { fascistPct, ... } }
  // — this matches what both the Map and Politics pages expect
  const cities = cityInfluences.map((ci) => ({
    id:   ci.city.id,
    name: ci.city.name,
    slug: ci.city.slug,
    influence: {
      cityId:       ci.cityId,
      fascistPct:   ci.fascistPct,
      communistPct: ci.communistPct,
      democratPct:  ci.democratPct,
    },
  }));

  return { cities, national };
}

// ─── Elections ────────────────────────────────────────────────────────────────

export async function getElection(faction?: Faction) {
  return prisma.election.findFirst({
    where: {
      status: { not: 'CONCLUDED' },
      ...(faction ? { faction } : {}),
    },
    include: {
      candidates: { include: { character: { select: { id: true, name: true, factionRank: true } } } },
      votes: { select: { voterId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function nominate(character: CharacterFull, manifesto?: string): Promise<void> {
  if (character.factionRank < 6) {
    throw AppError.gateNotMet('Faction Rank 6 required to stand for election.', { required: 6, have: character.factionRank });
  }

  const election = await prisma.election.findFirst({
    where: { faction: character.faction, status: 'NOMINATION' },
  });
  if (!election) throw AppError.electionNotActive();

  const existing = await prisma.candidate.findFirst({
    where: { electionId: election.id, characterId: character.id },
  });
  if (existing) throw AppError.alreadyVoted();

  await prisma.candidate.create({
    data: { electionId: election.id, characterId: character.id, manifesto: manifesto ?? null },
  });
}

export async function vote(character: CharacterFull, candidateId: string): Promise<void> {
  if (character.factionRank < 2) {
    throw AppError.gateNotMet('Faction Rank 2 required to vote.', { required: 2, have: character.factionRank });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { election: true },
  });
  if (!candidate) throw AppError.notFound('Candidate');
  if (candidate.election.faction !== character.faction) {
    throw AppError.factionMismatch(candidate.election.faction);
  }
  if (candidate.election.status !== 'VOTING') {
    throw AppError.electionNotActive();
  }

  // Cryptographic signature — proves this vote was server-issued
  const signature = createHmac('sha256', process.env.JWT_ACCESS_SECRET!)
    .update(`${candidate.electionId}:${character.id}:${candidateId}`)
    .digest('hex');

  // @@unique([electionId, voterId]) enforces one-vote-per-election at DB level
  await prisma.electionVote.create({
    data: {
      electionId: candidate.electionId,
      voterId: character.id,
      candidateId,
      signature,
    },
  });

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { voteWeight: { increment: 1 } },
  });
}

// ─── Laws ─────────────────────────────────────────────────────────────────────

export async function getActiveLaws() {
  return prisma.law.findMany({
    where: { status: LawStatus.ACTIVE },
    orderBy: { activatedAt: 'desc' },
  });
}

export async function proposeLaw(
  character: CharacterFull,
  data: { title: string; description: string; category: string; effect: object },
): Promise<object> {
  const president = await prisma.activePresident.findUnique({
    where: { characterId: character.id },
  });
  if (!president) throw AppError.notPresident();

  // One law per week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLaw = await prisma.law.findFirst({
    where: { proposedBy: character.id, createdAt: { gte: oneWeekAgo } },
  });
  if (recentLaw) throw new AppError(429, 'You may only propose one law per week.');

  const law = await prisma.law.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      effect: data.effect,
      proposedBy: character.id,
      status: LawStatus.PROPOSED,
    },
  });

  await prisma.activePresident.update({
    where: { characterId: character.id },
    data: { lawsProposed: { increment: 1 } },
  });

  broadcastLaw({ type: 'proposed', law });

  return law;
}

export async function voteOnLaw(
  character: CharacterFull,
  lawId: string,
  voteFor: boolean,
): Promise<void> {
  // Legislators: Rank 4+
  if (character.factionRank < 4) {
    throw AppError.gateNotMet('Faction Rank 4 required to vote on laws.', { required: 4, have: character.factionRank });
  }

  const law = await prisma.law.findUnique({ where: { id: lawId } });
  if (!law) throw AppError.notFound('Law');
  if (law.status !== LawStatus.PROPOSED) throw new AppError(400, 'This law is no longer open for voting.', ErrorCode.VALIDATION);

  await prisma.law.update({
    where: { id: lawId },
    data: {
      votesFor: voteFor ? { increment: 1 } : undefined,
      votesAgainst: !voteFor ? { increment: 1 } : undefined,
    },
  });

  // Check majority (simple majority of votes cast)
  const updated = await prisma.law.findUnique({ where: { id: lawId } });
  if (!updated) return;

  const total = updated.votesFor + updated.votesAgainst;
  if (total >= 5 && updated.votesFor > updated.votesAgainst) {
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    await prisma.law.update({
      where: { id: lawId },
      data: { status: LawStatus.ACTIVE, activatedAt, expiresAt },
    });
    broadcastLawActivated({ lawId: updated.id, title: updated.title, description: updated.description, effect: updated.effect, expiresAt, proposedBy: updated.proposedBy });
    await scheduleLawExpiry(lawId, expiresAt);
  } else if (total >= 5 && updated.votesAgainst >= updated.votesFor) {
    await prisma.law.update({ where: { id: lawId }, data: { status: LawStatus.REJECTED } });
    broadcastLaw({ type: 'rejected', law: { ...updated, status: 'REJECTED' } });
  }
}
