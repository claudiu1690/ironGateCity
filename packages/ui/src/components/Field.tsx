import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cx } from '../format';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
}

/** A labelled input, typed like a form on a ration card. */
export function Field({ label, hint, error, className, ...input }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="label-caps text-[11px] text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={cx(
          'min-h-11 border-[1.5px] bg-paper-card px-3 font-mono text-[15px] text-ink',
          'focus:outline-2 focus:outline-offset-1 focus:outline-petrol',
          error ? 'border-collective' : 'border-ink',
        )}
        {...input}
      />
      {hint && (
        <p id={hintId} className="font-body text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="font-body text-[13px] text-collective">
          {error}
        </p>
      )}
    </div>
  );
}
