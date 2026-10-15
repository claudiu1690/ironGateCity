import { FactionScoreboard } from '@irongate/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { useCharacter } from '../game/hooks';
import { ProfileFlow } from './ProfileFlow';
import { togetherNotice } from './togetherErrors';

/**
 * Slice 6 (screens §2.4; design §6.4; ADR 0042): the Faction tab's Scoreboard part. *This week* ·
 * *All time*, the city chips, the top ten per Level bracket with three rosettes, your row below the
 * ten when outside them; a row opens the profile.
 */
export function ScoreboardTab() {
  const { character } = useCharacter();
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const [cityId, setCityId] = useState<string | null>(null);
  const board = useQuery({
    ...trpc.faction.scoreboard.queryOptions({ period, cityId }),
    placeholderData: keepPreviousData,
  });
  const [profile, setProfile] = useState<string | null>(null);
  return (
    <section className="mx-auto w-full max-w-[640px] px-4 py-4 text-ink" data-testid="faction-scoreboard">
      {board.isError ? (
        <p role="alert" className="font-body text-[14px]">
          {togetherNotice(board.error)}
        </p>
      ) : !board.data ? (
        <p className="font-mono text-[12px] text-muted" role="status">
          …
        </p>
      ) : (
        <FactionScoreboard
          view={board.data}
          factionName={character?.factionName ?? ''}
          onPeriod={setPeriod}
          onCity={setCityId}
          onOpen={setProfile}
        />
      )}
      <ProfileFlow characterId={profile} onClose={() => setProfile(null)} />
    </section>
  );
}
