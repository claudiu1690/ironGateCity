/**
 * election:check — runs every 15 minutes
 *
 * 1. Fetch all city influences and compute national control
 * 2. For each faction >= 55%:
 *    a. Check if an active (non-CONCLUDED) election exists for that faction
 *    b. If not: create Election record, schedule election:conclude job
 *    c. Emit election:started to /world
 */

import { Faction } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { computeNationalControl } from '../../services/ruleEngine.js';
import { broadcastElectionStarted } from '../../socket/index.js';

const NOMINATION_WINDOW_MS = 24 * 60 * 60 * 1000;       // 24 hours
const VOTING_WINDOW_MS     = 3 * 24 * 60 * 60 * 1000;   // 72 hours after nomination ends

export async function runElectionCheck(): Promise<void> {
  const allInfluences = await prisma.cityInfluence.findMany({ include: { city: true } });
  const national = computeNationalControl(allInfluences);

  const factions: Faction[] = [Faction.FASCIST, Faction.COMMUNIST, Faction.DEMOCRAT];

  for (const faction of factions) {
    if (national[faction] < 55) continue;

    // Check for an already-active election
    const existing = await prisma.election.findFirst({
      where: { faction, status: { not: 'CONCLUDED' } },
    });
    if (existing) continue;

    // Create new election
    const now = Date.now();
    const nominationEnds = new Date(now + NOMINATION_WINDOW_MS);
    const votingEnds     = new Date(now + NOMINATION_WINDOW_MS + VOTING_WINDOW_MS);

    const election = await prisma.election.create({
      data: { faction, status: 'NOMINATION', nominationEnds, votingEnds },
    });

    // Schedule the conclude job as a delayed BullMQ task
    // Import inline to avoid circular dependency
    const { electionConcludeQueue } = await import('../index.js');
    await electionConcludeQueue.add(
      'conclude',
      { electionId: election.id },
      { delay: votingEnds.getTime() - now, jobId: `conclude-${election.id}` },
    );

    broadcastElectionStarted({
      electionId: election.id,
      faction,
      nominationEnds,
      votingEnds,
    });

    console.log(
      `[election:check] Created ${faction} election — nominations until ${nominationEnds.toISOString()}`,
    );
  }
}
