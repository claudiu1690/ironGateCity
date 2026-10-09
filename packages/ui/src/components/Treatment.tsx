import { copy } from '@irongate/content/copy';
import { treatmentPrice } from '@irongate/rules';
import type { CharacterView } from '@irongate/rules';
import { cx } from '../format';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import { healthNow } from './Street';

export interface TreatmentCardProps {
  carer: 'matron' | 'sister' | 'nurse';
  /** The character view's Health timer (projected here with `now`). */
  health: CharacterView['health'];
  iron: number;
  /** The server's clock, ticking (the price falls as Health comes back). */
  now: number;
  onTreat: () => void;
  pending?: boolean;
  /** One line under the button after a refusal. */
  notice?: string | null;
  className?: string;
}

/**
 * Review 5 (answers §8.2, tech design §6.2): *Treatment* on an infirmary's sheet, the `JobsCard`
 * pattern. *See the matron · Health 64 / 125*, the Courier line with the price, and *Get patched up ·
 * 61 Iron* (outline; *Needs 61 Iron* disabled when short). At full Health, *You're well · nothing to
 * treat* and no button. The price is live from the Health timer; the server charges its own figure.
 */
export function TreatmentCard({ carer, health, iron, now, onTreat, pending, notice, className }: TreatmentCardProps) {
  if (!health) return null;
  const t = copy.treatment;
  const hp = healthNow(health, now);
  const price = treatmentPrice(health.max - hp);
  const short = iron < price;
  return (
    <section
      aria-label={t.kicker}
      className={cx('mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card', className)}
      data-testid="treatment"
      data-price={price}
    >
      <div className="flex items-center border-b border-ink px-3 py-1.5">
        <HelpButton notes={[copy.help.treatment(carer)]} label={`What ${t.kicker} means`} className="-my-2">
          <span className={cx('label-caps text-[11px] font-semibold', helpMark)}>{t.kicker}</span>
        </HelpButton>
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2">
        {price === 0 ? (
          <span className="font-display text-[15px] font-bold" data-testid="treatment-well">
            {t.well}
          </span>
        ) : (
          <>
            <span className="font-display text-[15px] font-bold" data-testid="treatment-line">
              {t.line(carer, hp, health.max)}
            </span>
            <p className="font-mono text-[11.5px] text-text-2" data-testid="treatment-price">
              {t.price(price)}
            </p>
            <Button
              variant="outline"
              className="w-full"
              pending={pending}
              disabled={short}
              onClick={onTreat}
              data-testid="treatment-take"
            >
              {short ? t.needs(price) : t.button(price)}
            </Button>
          </>
        )}
        {notice && (
          <p role="status" className="font-mono text-[12px] text-collective">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
