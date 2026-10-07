import type { FactionId, IssueRowView, WhatNowView } from '@irongate/rules';
import { ElectionCard, ResultModal, TownHallBlocks, WhatNowCard } from '@irongate/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { noticeFor } from '../game/errors';
import { gameErrorOf, trpc, trpcClient } from '../../lib/trpc';
import { useNow } from '../../lib/useNow';
import { usePoliticalAct } from './usePoliticalAct';

/**
 * Review 4 (answers §10–§11, ADR 0077): the Town Hall's blocks for any city with a council, as the
 * hall's place sheet and `/council` show them: *What now* once per term (marked seen once it has
 * shown), the desk's acts (vote, put forward a rule) for a councillor here, and the public blocks.
 * The server decides every outcome; this wires the taps to the existing political acts.
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
  const navigate = useNavigate();
  const now = useNow(60_000);
  const act = usePoliticalAct();
  const [selected, setSelected] = useState<string | null>(null);
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
  return (
    <div className="flex flex-col gap-3" data-testid="town-hall-section">
      {whatNow && <WhatNowCard whatNow={whatNow} hallName={hall.hall.name} />}
      <TownHallBlocks
        hall={hall}
        names={names}
        factionId={factionId}
        onWhereToAct={onWhereToAct}
        desk={{
          selected,
          onSelect: setSelected,
          pending: act.pending,
          notice: act.pending === null && act.error !== null ? (noticeFor(act.error) ?? null) : null,
          onVote: () =>
            selected &&
            void act.run('councilVote', (k) =>
              trpcClient.council.councilVote.mutate({ choice: selected, idempotencyKey: k }),
            ),
          onPropose: (ordinanceId) =>
            void act.run('propose', (k) => trpcClient.council.propose.mutate({ ordinanceId, idempotencyKey: k })),
        }}
        election={
          hall.election ? (
            <ElectionCard
              summary={hall.election}
              onOpen={(route) => void navigate({ to: route })}
              now={now}
              factionNames={names}
            />
          ) : null
        }
      />
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </div>
  );
}
