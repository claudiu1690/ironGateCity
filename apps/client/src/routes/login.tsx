import { Button, Field } from '@irongate/ui';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { authClient, resetSession } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    });
    setPending(false);
    if (err) {
      setError(err.message ?? 'Sign-in failed. Try again.');
      return;
    }
    await resetSession();
    await navigate({ to: '/' });
  }

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        {error && (
          <p role="alert" className="font-body text-[14px] text-collective">
            {error}
          </p>
        )}
        <Button type="submit" pending={pending} className="mt-1">
          Sign in
        </Button>
      </form>
      <p className="font-body text-[14px] text-text-2">
        New here?{' '}
        <Link to="/signup" className="text-petrol underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
