import { copy } from '@irongate/content/copy';
import { AvatarPicker, Button, Field } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { authClient, resetSession } from '../lib/auth';
import { trpcClient, trpc } from '../lib/trpc';

/**
 * Sign-up with a face (slice-2 tech design §12.1, GDD §7.3): name, the six faces (required, no
 * default), email, password → the account → the arrival's draft with the face → `/arrive`.
 * If the face does not reach the server, `/arrive` shows the face phase, so nothing is lost.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const faces = useQuery({ ...trpc.arrival.faces.queryOptions(), staleTime: Infinity });
  const [face, setFace] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!face) {
      setFaceError(copy.chooseYourFace);
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signUp.email({
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    });
    if (err) {
      setPending(false);
      setError(err.message ?? 'Sign-up failed. Try again.');
      return;
    }
    await resetSession();
    // Best effort: /arrive asks again for the face if this does not land.
    await trpcClient.arrival.start.mutate({ avatarId: face }).catch(() => undefined);
    setPending(false);
    await navigate({ to: '/arrive' });
  }

  return (
    <AuthLayout title={copy.signupTitle} wide>
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate={false}>
        <Field label="Your name" name="name" autoComplete="name" required maxLength={60} />
        {faces.data ? (
          <AvatarPicker
            faces={faces.data}
            value={face}
            onChange={(id) => {
              setFace(id);
              setFaceError(undefined);
            }}
            error={faceError}
          />
        ) : (
          <p className="label-caps py-6 text-center text-[11px] text-muted" role="status">
            {faces.isError ? 'The faces could not be loaded.' : 'Loading the faces…'}
          </p>
        )}
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
