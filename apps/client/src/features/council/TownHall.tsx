import type { FactionId, IssueRowView, WhatNowView } from '@irongate/rules';
import { ResultModal, TownHallBlocks, WhatNowCard } from '@irongate/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { noticeFor } from '../game/errors';
import { useCharacter } from '../game/hooks';
import { gameErrorOf, trpc, trpcClient } from '../../lib/trpc';
import { usePoliticalAct } from './usePoliticalAct';
import { useRuleVote } from './useRuleVote';

/**
 * Review 4 (answers §10–§11, ADR 0077); the voting rework (tech design §9.5): the Town Hall's five
 * blocks for any city with a council, as the hall's place sheet and `/council` show them: *What now*
 * once per term (marked seen once it has shown), the vote on next week's rule, a councillor's rule
 * (`council.setRule`), the stand card (`council.declare`) and the public blocks. The server decides
 * every outcome; this wires the taps to the political acts.
 */
export function TownHall({
  cityId,
  enabled = true,
  names,
  factionId,
  onWhereToAct,
}: {
  cityId: string;
  /** Asked for only while the sheet is open (the hall's place sheet), always on `/council`. */
  enabled?: boolean;
  names: Partial<Record<FactionId, string>>;
  factionId: FactionId;
  onWhereToAct?: (row: IssueRowView) => void;
}) {
  const q = useQuery({ ...trpc.council.hall.queryOptions({ cityId }), enabled });
  const { character } = useCharacter();
  const act = usePoliticalAct();
  const ballot = useRuleVote(act);
  // *What now* stays on show for this visit once it has shown, though the term is marked seen.
  const [whatNow, setWhatNow] = useState<WhatNowView | null>(null);
  const marked = useRef<string | null>(null);
  const seen = useMutation(trpc.council.whatNowSeen.mutationOptions());
  const incoming = q.data?.whatNow ?? null;
  useEffect(() => {
    if (!incoming || marked.current === incoming.termId) return;
    marked.current = incoming.termId;
    setWhatNow(incoming);
    seen.mutate({ termId: incoming.termId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.termId]);

  if (q.isError) {
    // A city whose council has not sat yet: the sheet keeps its ticket and blurb.
    return gameErrorOf(q.error)?.reason === 'ELECTION_NOT_READY' ? null : (
      <p role="status" className="font-body text-[13px] text-collective" data-testid="hall-error">
        The council could not be read. Try again.
      </p>
    );
  }
  if (!q.data) {
    return enabled ? (
      <p className="label-caps py-3 text-center text-[11px] text-dim" role="status">
        Opening the council…
      </p>
    ) : null;
  }
  const hall = q.data;
  const ladder = character?.rank.ladder ?? [];
  return (
    <div className="flex flex-col gap-3" data-testid="town-hall-section">
      {whatNow && <WhatNowCard whatNow={whatNow} hallName={hall.hall.name} names={names} />}
      <TownHallBlocks
        hall={hall}
        names={names}
        factionId={factionId}
        rankTitles={{ rank2: ladder[1] ?? '', rank3: ladder[2] ?? '' }}
        onWhereToAct={onWhereToAct}
        desk={{
          selected: ballot.selected,
          onSelect: ballot.select,
          pending: act.pending,
          notice: act.pending === null && act.error !== null ? (noticeFor(act.error) ?? null) : null,
          onVote: ballot.vote,
          onSetRule: (ordinanceId) =>
            void act.run('setRule', (k) => trpcClient.council.setRule.mutate({ ordinanceId, idempotencyKey: k })),
          onStand: (ordinanceId) =>
            void act.run('declare', (k) => trpcClient.council.declare.mutate({ ordinanceId, idempotencyKey: k })),
        }}
      />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </div>
  );
}
