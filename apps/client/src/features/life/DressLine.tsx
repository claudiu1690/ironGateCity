import { copy } from '@irongate/content/copy';
import { RECOGNITION } from '@irongate/rules';
import type { JourneyView } from '@irongate/rules';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { lifeNotice } from './lifeErrors';

const r = copy.life.recognition;
/** The lowest Charisma that is recognised on rival ground (design §3.7: 20 and up). */
const RECOGNISED_FROM = Math.min(...RECOGNITION.cha.map(([at]) => at));

const doneKey = (journeyId: string) => `irongate.dress.${journeyId}`;
function readDone(journeyId: string): boolean {
  try {
    return window.sessionStorage.getItem(doneKey(journeyId)) === '1';
  } catch {
    return false;
  }
}
function writeDone(journeyId: string): void {
  try {
    window.sessionStorage.setItem(doneKey(journeyId), '1');
  } catch {
    // A private window: the line forgets on reload; the tap is idempotent.
  }
}

/**
 * Slice 8 phase C, lane P (screens §13, §19; tech design §3.2): on a train to a rival home city, the
 * plate's *Change into plain clothes* (one tap, applied at the station by the arrival), *Plain clothes
 * on arrival ✓* after, *You're in plain clothes* when already, and the warning in a Town coat that is
 * recognised. Whether the city is rival ground is the nation view's (`rival`); the outfit and
 * Charisma are the Wardrobe's.
 */
export function DressLine({ journey }: { journey: JourneyView }) {
  const queryClient = useQueryClient();
  const onTheWay = journey.status === 'onTheWay';
  const nation = useQuery({ ...trpc.travel.nation.queryOptions(), enabled: onTheWay, staleTime: 60_000 });
  const wardrobe = useQuery({ ...trpc.wardrobe.get.queryOptions(), enabled: onTheWay });
  const [done, setDone] = useState(() => readDone(journey.id));
  const dress = useMutation({
    ...trpc.wardrobe.dressOnArrival.mutationOptions(),
    onSuccess: (res) => {
      if (res.done) {
        writeDone(journey.id);
        setDone(true);
      }
      void queryClient.invalidateQueries({ queryKey: trpc.wardrobe.get.queryKey() });
    },
  });
  const rival = nation.data?.cities.find((c) => c.cityId === journey.to.cityId)?.rival;
  const w = wardrobe.data;
  if (!onTheWay || !rival || !w) return null;
  const plain = w.line.outfit === 'plain';
  const warn = !plain && !done && w.line.outfit === 'town' && w.cha >= RECOGNISED_FROM;
  return (
    <div className="flex flex-col gap-0.5" data-testid="journey-dress">
      {plain ? (
        <span className="font-mono text-[12px]" data-testid="journey-dress-state">
          {r.youAreInPlain}
        </span>
      ) : done ? (
        <span className="font-mono text-[12px] text-petrol" data-testid="journey-dress-state">
          {r.plainOnArrival}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => !dress.isPending && dress.mutate({ journeyId: journey.id })}
          disabled={dress.isPending}
          aria-busy={dress.isPending || undefined}
          className="label-caps min-h-11 cursor-pointer self-start border-[1.5px] border-ink px-3 text-[12px] hover:bg-ink hover:text-paper disabled:opacity-60"
          data-testid="journey-dress-change"
        >
          {dress.isPending ? '…' : r.changeIntoPlain}
        </button>
      )}
      {warn && (
        <span className="font-mono text-[11.5px] text-failure" data-testid="journey-dress-warning">
          {r.warning(journey.to.name)}
        </span>
      )}
      {dress.error && (
        <span role="status" className="font-body text-[13px] text-failure">
          {lifeNotice(dress.error)}
        </span>
      )}
    </div>
  );
}
