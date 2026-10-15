import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { heatState, xpForLevel } from '@irongate/rules';
import type { EventResult, FactionId, RewardLine } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock, formatNumber, formatShare, formatSigned, formatWeekday } from '../format';
import { formatSwing } from './Capital';
import { statName } from '../odds';
import type { TrainingPlaces } from '../odds';
import { Button } from './Button';
import { bandStamp } from './EventCard';
import { FACTION_STYLE } from './FactionCrest';
import { groundOf } from './GroundSash';
import type { Ground } from './GroundSash';
import { ArtHeader, ReceiptRow } from './ResultModal';
import { heatWord } from './Street';

const OUTCOME_TONE = {
  success: 'text-success',
  partial: 'text-partial',
  failure: 'text-failure',
  volunteer: 'text-muted',
} as const;

/** *+12 · Triumph +6 · Party order +3* (the base under the band's word, then each named part). */
function partsText(line: RewardLine, baseLabel: string | null): string | null {
  const parts = (line.parts ?? []).filter((p) => p.amount !== 0);
  if (parts.length === 0 && !baseLabel) return null;
  return [
    ...(baseLabel ? [copy.together.result.part(baseLabel, line.base)] : []),
    ...parts.map((p) => copy.together.result.part(p.label, p.amount)),
  ].join(' · ');
}

/** The reason under your row (design §8.4, §11): your stat, or the roster's cause on a Fiasco. */
function reasonText(r: EventResult['reason'], places: TrainingPlaces): string | null {
  if (!r) return null;
  if (r.kind === 'volunteers') return copy.together.result.reasonVolunteers(r.k);
  const place = places[r.stat as keyof TrainingPlaces] ?? null;
  return r.stat === 'cha' ? copy.reason.statLowCha : copy.reason.statLow(statName(r.stat), place);
}

export interface EventBodyProps {
  result: EventResult;
  /** The caller's sash (overrides the one worked out from the result's shares). */
  ground: Ground | null;
  factionNames?: Partial<Record<FactionId, string>>;
  trainingPlaces?: TrainingPlaces;
  onContinue?: () => void;
  continuePending?: boolean;
}

/**
 * `ResultModal kind="event"` (screens §5, tech design §10.1): art and stamp with the ground sash, the
 * headline and body, *How it went* (`EventResultRoles`), the receipt (XP, Party XP, Political Capital,
 * Opinion, Issue points), the knock-ons and *Continue*. No repeat buttons. It words the server's
 * breakdown and computes nothing.
 */
export function EventBody({ result: r, ground, factionNames = {}, trainingPlaces = {}, onContinue, continuePending }: EventBodyProps) {
  const c = r.character;
  const fid = c.factionId;
  const names: Partial<Record<FactionId, string>> = { ...(c.factionNames ?? {}), ...factionNames };
  const sash = ground ?? groundOf({ shares: r.ground.shares, names });
  const stamp = bandStamp(r.stamp, fid);
  const city = r.place.districtName ? `${r.place.districtName}, ${r.place.cityName}` : r.place.cityName;
  const caption = copy.together.result.place(r.place.venueName, city, formatWeekday(r.startsAt), formatClock(r.startsAt));
  const style = FACTION_STYLE[fid];

  // The receipt (review 3).
  const rows: ReactNode[] = [];
  const floor = xpForLevel(c.level);
  const next = xpForLevel(c.level + 1);
  if (r.rewards.xp.total !== 0)
    rows.push(
      <ReceiptRow
        key="xp"
        label={copy.reward.xp}
        value={formatSigned(r.rewards.xp.total)}
        note={partsText(r.rewards.xp, null) ?? copy.reward.toLevel(formatNumber(next - c.xp), c.level + 1)}
        bar={{ label: copy.hud.xp, value: c.xp - floor, max: next - floor, className: 'bg-ink' }}
        testId="reward-xp"
      />,
    );
  if (r.rewards.fxp.total !== 0) {
    const { fxpFloor, fxpNext } = c.rank;
    rows.push(
      <ReceiptRow
        key="fxp"
        label={copy.reward.fxp}
        value={formatSigned(r.rewards.fxp.total)}
        valueClassName={style.text}
        note={partsText(r.rewards.fxp, copy.together.band[r.stamp])}
        bar={{
          label: copy.hud.fxp,
          value: fxpNext !== null ? c.fxp - fxpFloor : 1,
          max: fxpNext !== null ? fxpNext - fxpFloor : 1,
          color: style.color,
        }}
        testId="reward-fxp"
      />,
    );
  }
  if (r.pc.amount !== 0)
    rows.push(
      <ReceiptRow
        key="pc"
        label="Political Capital"
        value={formatSigned(r.pc.amount)}
        note={r.pc.rate === 'full' ? copy.together.result.pcFirst : copy.together.result.pcLater(2)}
        testId="reward-pc"
      />,
    );
  const o = r.opinion;
  if (o.total !== 0) {
    const against = o.mode === 'against' && o.targetFactionId;
    const fname = names[fid] ?? c.factionName;
    const text = against
      ? copy.together.result.opinionAgainst(
          formatSwing(Math.abs(o.total)),
          names[o.targetFactionId!] ?? o.targetFactionId!,
          o.placeName,
          formatSwing(Math.abs(o.share)),
        )
      : copy.together.result.opinion(formatSwing(o.total), fname, o.placeName, formatSwing(o.share));
    rows.push(
      <li key="opinion" className="flex flex-col gap-px border-b border-dotted border-faint py-[3px]" data-testid="reward-opinion">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-body text-[13px]">Opinion</span>
          <span className={cx('font-label text-[17px] leading-none font-semibold', style.text)}>
            {formatSwing(o.total)}
          </span>
        </span>
        <span className="font-mono text-[10.5px] text-muted">
          {text} · {copy.reward.opinionMove(fname, formatShare(o.before), formatShare(o.after))}
        </span>
      </li>,
    );
  }
  for (const i of r.issues)
    if (i.added > 0)
      rows.push(
        <ReceiptRow
          key={`issue-${i.issueId}`}
          label={copy.together.result.issuePoints}
          value={formatSigned(i.added)}
          note={copy.together.result.issueLine(i.added, i.name)}
          testId="reward-issue"
        />,
      );

  // Knock-ons (screens §5 item 5).
  const knocks: Array<{ id: string; text: string }> = [];
  const e = r.effects;
  // The view carries the win's count and the level's name, not the next threshold (tech §10.1):
  // *Reputation in Coalport · a win · Known in Coalport*.
  if (e.standing && e.standing.after > e.standing.before)
    knocks.push({
      id: 'standing',
      text: `${copy.together.result.standingWin(e.standing.cityName, e.standing.after, 0).split(' · ').slice(0, 2).join(' · ')} · ${e.standing.level}`,
    });
  if (e.heat)
    knocks.push({
      id: 'heat',
      text: copy.risk.heatKnock(e.heat.before, e.heat.after, heatWord(heatState(e.heat.after))),
    });
  if (e.levelUp) knocks.push({ id: 'level', text: copy.levelUpLine(e.levelUp.to, e.levelUp.statPoints) });
  if (e.rankUp) knocks.push({ id: 'rank', text: `Rank ${e.rankUp.to} · ${e.rankUp.title}` });
  knocks.push({ id: 'next', text: r.next ?? copy.together.result.next });

  const reason = reasonText(r.reason, trainingPlaces);
  const you = r.roles.find((x) => x.holder?.you);

  return (
    <>
      <ArtHeader art={r.art} stamp={stamp} caption={caption} ground={sash} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3.5 pb-4" data-testid="event-result">
        <section className="flex flex-col gap-1">
          <span className="label-caps text-[10px] text-muted">{copy.together.result.kicker(r.place.venueName, city)}</span>
          <Dialog.Title className="font-display text-[24px] leading-tight font-black" data-testid="result-headline">
            {r.headline}
          </Dialog.Title>
          <Dialog.Description className="font-body text-[14px] leading-normal text-text-2">{r.body}</Dialog.Description>
        </section>
        <section aria-labelledby="event-how" data-testid="event-how">
          <h3 id="event-how" className="label-caps mb-1 border-b-[3px] border-double border-ink pb-1 text-[10px] font-semibold">
            {copy.together.result.howItWent}
          </h3>
          <ul className="flex flex-col">
            {r.roles.map((x) => (
              <li
                key={x.roleId}
                className={cx('flex flex-col border-b border-dotted border-faint px-1.5 py-1', x.holder?.you && 'bg-paper-2')}
                data-testid="event-role"
                data-you={x.holder?.you ? 'true' : undefined}
              >
                <span className="flex min-h-9 items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-body text-[14px] font-semibold">
                      {x.name}
                      {x.holder?.you && (
                        <span className="font-mono text-[11px] font-normal text-muted"> · {copy.together.result.you}</span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-text-2" data-testid="event-role-holder">
                      {x.holder ? x.holder.name : copy.together.event.volunteer}
                    </span>
                  </span>
                  <span
                    className={cx('label-caps shrink-0 text-[12px] font-semibold', OUTCOME_TONE[x.outcome])}
                    data-testid="event-role-outcome"
                  >
                    {copy.together.result.outcome[x.outcome]}
                  </span>
                </span>
                {x === you && reason && (
                  <span className="pb-1 font-body text-[12.5px] text-text-2 italic" data-testid="event-reason">
                    {reason}
                  </span>
                )}
              </li>
            ))}
            {r.hands.length > 0 && (
              <li className="flex min-h-9 items-center border-b border-dotted border-faint px-1.5 py-1 font-mono text-[12px]" data-testid="event-hands">
                {copy.together.result.hands(r.hands.join(', '))}
              </li>
            )}
          </ul>
          {!you && reason && (
            <p className="pt-1 font-body text-[12.5px] text-text-2 italic" data-testid="event-reason">
              {reason}
            </p>
          )}
          <p className="pt-1 font-mono text-[11px] text-muted" data-testid="event-summary">
            {copy.together.result.summary(r.summary.cameOff, r.summary.roles, r.summary.volunteers)}
          </p>
        </section>
        {rows.length > 0 && (
          <ul className="flex flex-col border-t border-dotted border-faint" data-testid="receipt">
            {rows}
          </ul>
        )}
        <section aria-labelledby="event-knock">
          <h3 id="event-knock" className="label-caps mb-1 text-[10px] text-muted">
            Knock-on effects
          </h3>
          <ul className="flex flex-col">
            {knocks.map((l) => (
              <li
                key={l.id}
                className={cx(
                  'border-b border-dotted border-faint py-1',
                  l.id === 'next' ? 'font-mono text-[12px] text-petrol' : 'font-body text-[12.5px]',
                )}
                data-testid={`event-${l.id}`}
              >
                {l.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div
        className="sticky bottom-0 z-10 mt-auto border-t border-track bg-paper px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]"
        data-testid="result-buttons"
      >
        <Button
          variant="primary"
          className="w-full"
          onClick={onContinue}
          pending={continuePending}
          data-testid="event-continue"
        >
          Continue
        </Button>
      </div>
    </>
  );
}
