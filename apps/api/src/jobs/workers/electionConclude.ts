/**
 * election:conclude — delayed job, scheduled at votingEnds per election
 *
 * 1. Tally votes (candidate voteWeight fields already updated in real-time)
 * 2. Find the winning candidate (highest voteWeight, tie-break: first nominated)
 * 3. Create or update ActivePresident record (termEnds = now + 30 days)
 * 4. Schedule president:term job at termEnds
 * 5. Mark election CONCLUDED
 * 6. Emit election:concluded + president:elected to /world
 */

import { prisma } from '../../lib/prisma.js';
import {
  broadcastElectionConcluded,
  broadcastPresidentElected,
} from '../../socket/index.js';

const TERM_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function runElectionConclude(electionId: string): Promise<void> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      candidates: {
        include: { character: { select: { id: true, name: true } } },
        orderBy: [{ voteWeight: 'desc' }, { id: 'asc' }], // tie-break: first nominated
      },
    },
  });

  if (!election || election.status === 'CONCLUDED') {
    console.log(`[election:conclude] Election ${electionId} already concluded or not found`);
    return;
  }

  const winner = election.candidates[0] ?? null;

  await prisma.election.update({
    where: { id: electionId },
    data: { status: 'CONCLUDED', winnerId: winner?.characterId ?? null },
  });

  if (!winner) {
    console.log(`[election:conclude] Election ${electionId} — no candidates, no winner`);
    broadcastElectionConcluded({ electionId, faction: election.faction, winner: null });
    return;
  }

  const termEnds = new Date(Date.now() + TERM_DURATION_MS);

  // Create/replace ActivePresident
  await prisma.activePresident.upsert({
    where: { characterId: winner.characterId },
    update: { faction: election.faction, termEnds, lawsProposed: 0 },
    create: { characterId: winner.characterId, faction: election.faction, termEnds },
  });

  // Schedule president:term job
  const { presidentTermQueue } = await import('../index.js');
  await presidentTermQueue.add(
    'term-end',
    { characterId: winner.characterId },
    { delay: TERM_DURATION_MS, jobId: `term-${winner.characterId}` },
  );

  broadcastElectionConcluded({
    electionId,
    faction: election.faction,
    winner: { id: winner.characterId, name: winner.character.name, votes: winner.voteWeight },
  });

  broadcastPresidentElected({
    faction: election.faction,
    characterId: winner.characterId,
    name: winner.character.name,
    termEnds,
  });

  console.log(
    `[election:conclude] ${election.faction} winner: ${winner.character.name} (${winner.voteWeight} votes)`,
  );
}
