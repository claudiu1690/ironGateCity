import { copy } from '@irongate/content/copy';
import type { FactionId } from '@irongate/rules';
import { Button, PaperSheet, cx } from '@irongate/ui';
import type { FactionNames } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { noticeFor } from '../game/errors';
import { useCharacter } from '../game/hooks';
import { gameErrorOf, trpc } from '../../lib/trpc';

/**
 * Slice 7 phase C (screens §4–§9): the nation's pages share the paper column of the council's
 * screens: 640 px, edge-to-edge header on a phone, the sticky commit over the tab bar.
 */
export function NationFrame({ header, children, wide = false }: { header?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <PaperSheet>
      <div className="paper-grain min-h-full text-ink">
        <div className={cx('mx-auto flex max-w-[640px] flex-col gap-3 px-4 pb-8 lg:pb-[132px]', wide && 'lg:max-w-[1000px]', !header && 'pt-4')}>
          {header && <div className="-mx-4 sm:mx-0 sm:mt-4">{header}</div>}
          {children}
        </div>
      </div>
    </PaperSheet>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p className="label-caps py-10 text-center text-[12px] text-muted" role="status">
      {what}
    </p>
  );
}

export function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="p-4">
      <p role="alert">This could not be loaded.</p>
      <Button variant="outline" className="mt-3" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

/** The national refusals in plain words (the server's reason decides; the client only words it). */
const NATION_REASONS: Record<string, string> = {
  NOT_NOW: 'Not open now. The page shows when it opens.',
  ALREADY_STANDING: 'You are already standing.',
  ALREADY_BACKED: 'You have already given your backing this term.',
  CANNOT_BACK_SELF: 'You cannot back yourself.',
  ALREADY_SIGNED: 'Your name is already on it.',
  ALREADY_TABLED: 'You have already put a law to Parliament this term.',
  PAPER_FULL: 'The order paper is full. Try again when a vote is decided.',
  NOT_DEPUTY: 'Only deputies vote in Parliament.',
  NOT_CHAIR: 'Only the Chair sets this.',
  NOT_PRESIDENT: 'Only the President can do this.',
  BILL_CLOSED: 'The vote on this law has closed.',
  NOT_VETOABLE: 'This law cannot be vetoed now.',
  VETO_USED: 'The veto is spent for the term.',
  ADDRESS_USED: 'The Address is spent for the term.',
  RANK_TOO_LOW: 'Your Rank is too low for this.',
  NOT_RESIDENT: 'Only residents can do this.',
  PETITION_CLOSED: 'The petition has closed.',
  NO_VOTE_OPEN: 'There is no vote open.',
  REMOVAL_CLOSED: 'A vote to remove the President cannot be put up now.',
  REMOVAL_TOO_SOON: 'A vote to remove the President was put up less than a week ago.',
  WITHDRAW_CLOSED: 'Too late to take your name off.',
  NATION_NOT_READY: 'The republic is still being counted. Try again in a moment.',
  PUSH_PLACE: 'Push to a battleground: a district of Irongate, or Clearwater.',
  CONFLICT: 'Too many things at once. Tap again.',
};

export function nationNotice(error: unknown): string | undefined {
  if (!error) return undefined;
  const reason = gameErrorOf(error)?.reason;
  return (reason ? NATION_REASONS[reason] : undefined) ?? noticeFor(error);
}

export function Notice({ error }: { error: unknown }) {
  const text = error ? nationNotice(error) : undefined;
  return text ? (
    <p role="status" className="font-body text-[13px] text-collective" data-testid="nation-notice">
      {text}
    </p>
  ) : null;
}

/** Every party's short name (the character carries them since slice 4). */
export function useFactionNames(): FactionNames {
  const { character } = useCharacter();
  return character?.factionNames ?? (character ? ({ [character.factionId]: character.factionName } as Partial<Record<FactionId, string>>) : {});
}

/** The nation's three scenes (`parliament.art`), cached for the session. */
export function useNationArt() {
  return useQuery({ ...trpc.parliament.art.queryOptions(), staleTime: Infinity }).data ?? null;
}

/** The plain gate words for an act's `why` (an `ActGate`). */
export function gateWords(why: string | null | undefined): string | null {
  if (!why) return null;
  return NATION_REASONS[why] ?? GATE_WORDS[why] ?? null;
}
const GATE_WORDS: Record<string, string> = {
  RANK: 'Your Rank is too low for this yet.',
  LADDER: 'Needs a completed term in the office below.',
  TENURE: copy.nation.chairElection.tenure,
  TERM_LIMIT: 'Two terms in a row is the most.',
  NOT_ENOUGH_PC: 'Not enough Political Capital.',
  ALREADY_VOTED: 'You have voted.',
  noRunnerUp: 'Nobody has been elected yet to take over.',
};
