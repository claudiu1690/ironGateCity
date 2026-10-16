import { copy } from '@irongate/content/copy';
import type { PatronClockView } from '@irongate/rules';
import { HomeCard, LegacyBlock, MeBlock, PatronClock, ResultModal } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { usePoliticalAct } from '../council/usePoliticalAct';
import { useCharacter } from '../game/hooks';
import { setResultModalOpen } from '../../lib/modalGate';
import { trpc, trpcClient } from '../../lib/trpc';
import { qNotice } from './errors';

/**
 * Slice 8 phase C, lane Q (screens §8.2, §9.2, §10, §16): the Me tab's Patrons, Where you sleep and
 * Legacy blocks, each collapsed to its kicker and one line until tapped (the state kept in this
 * browser). Their acts (buy the flat, pay the rent, take a perk) are one tap and one modal each.
 */

const KEY = 'irongate.me.open';

function useOpenBlock(id: string): [boolean, () => void] {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>)[id] === true;
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setOpen((o) => {
      try {
        const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>;
        localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: !o }));
      } catch {
        // A private window: the block opens for this visit only.
      }
      return !o;
    });
  };
  return [open, toggle];
}

/** One political act for the Me tab's lane-Q blocks (one modal at a time). */
function useMeAct() {
  const act = usePoliticalAct();
  useEffect(() => setResultModalOpen(act.open, 'me-life-q'), [act.open]);
  useEffect(() => () => setResultModalOpen(false, 'me-life-q'), []);
  return act;
}

/** Screens §8.2: *Patrons*: a clock per patron; below Level 10 one line. */
export function MePatrons() {
  const { character: c } = useCharacter();
  const me = useQuery({ ...trpc.life.me.queryOptions(), enabled: !!c });
  const [open, toggle] = useOpenBlock('patrons');
  if (!c) return null;
  const clocks = (me.data as { patrons?: PatronClockView[] } | undefined)?.patrons ?? [];
  const early = c.level < 10;
  const line = early || clocks.length === 0 ? copy.life.patron.meEmpty : clocks.map((p) => p.line).join(' · ');
  return (
    <MeBlock
      title={copy.life.patron.meKicker}
      line={line}
      open={open}
      onToggle={toggle}
      testId="me-patrons"
    >
      {early || clocks.length === 0 ? (
        <span className="font-mono text-[12px] text-muted">{copy.life.patron.meEmpty}</span>
      ) : (
        clocks.map((p) => (
          <PatronClock key={p.id} clock={p} />
        ))
      )}
    </MeBlock>
  );
}

/** Screens §9.2: *Where you sleep*: the room or the flat, the offer, the rent. */
export function MeHome() {
  const { character: c } = useCharacter();
  const home = useQuery({ ...trpc.home.get.queryOptions(), enabled: !!c });
  const act = useMeAct();
  const [open, toggle] = useOpenBlock('home');
  if (!c || !home.data) return null;
  const pending = act.pending === 'buyFlat' ? 'buy' : act.pending === 'rent-1' ? 'week' : act.pending === 'rent-4' ? 'four' : null;
  return (
    <>
      <MeBlock title={copy.life.home.kicker} line={home.data.line} open={open} onToggle={toggle} testId="me-home">
        <HomeCard
          home={home.data}
          pending={pending}
          notice={act.pending === null && act.error ? (qNotice(act.error, 'home') ?? null) : null}
          onBuy={() => void act.run('buyFlat', (k) => trpcClient.home.buyFlat.mutate({ idempotencyKey: k }))}
          onPay={(weeks) => void act.run(`rent-${weeks}`, (k) => trpcClient.home.payRent.mutate({ weeks, idempotencyKey: k }))}
        />
      </MeBlock>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </>
  );
}

/** Screens §10: *Legacy*: the figure, the entries, the lasting perks. */
export function MeLegacy() {
  const { character: c } = useCharacter();
  const legacy = useQuery({ ...trpc.legacy.get.queryOptions(), enabled: !!c });
  const act = useMeAct();
  const [open, toggle] = useOpenBlock('legacy');
  const [all, setAll] = useState(false);
  if (!c || !legacy.data) return null;
  return (
    <>
      <MeBlock
        title={copy.life.legacy.kicker}
        line={legacy.data.line || copy.life.legacy.total(legacy.data.total, legacy.data.toSpend)}
        open={open}
        onToggle={toggle}
        testId="me-legacy"
      >
        <LegacyBlock
          legacy={legacy.data}
          expanded={all}
          onExpand={() => setAll(true)}
          pendingPerk={act.pending?.startsWith('perk-') ? act.pending.slice(5) : null}
          notice={act.pending === null && act.error ? (qNotice(act.error, 'legacy') ?? null) : null}
          onTake={(perkId) =>
            void act.run(`perk-${perkId}`, (k) => trpcClient.legacy.takePerk.mutate({ perkId, idempotencyKey: k }))
          }
        />
      </MeBlock>
      <ResultModal result={act.result} open={act.open} onOpenChange={act.setOpen} />
    </>
  );
}
