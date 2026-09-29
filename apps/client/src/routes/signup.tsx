import { Button, Field } from '@irongate/ui';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { authClient, resetSession } from '../lib/auth';

export function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signUp.email({
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    });
    setPending(false);
    if (err) {
      setError(err.message ?? 'Sign-up failed. Try again.');
      return;
    }
    await resetSession();
    await navigate({ to: '/' });
  }

  return (
    <AuthLayout title="Join the struggle">
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate={false}>
        <Field label="Your name" name="name" autoComplete="name" required maxLength={60} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
        />
        {error && (
          <p role="alert" className="font-body text-[14px] text-collective">
            {error}
          </p>
        )}
        <Button type="submit" pending={pending} className="mt-1">
          Sign up
        </Button>
      </form>
      <p className="font-body text-[14px] text-text-2">
        Already registered?{' '}
        <Link to="/login" className="text-petrol underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
