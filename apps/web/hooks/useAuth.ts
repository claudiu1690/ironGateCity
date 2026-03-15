'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken }  from '../lib/token';

/** Redirect to /auth/login if no access token is present. */
export function useAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) router.replace('/auth/login');
  }, [router]);
}

/** Redirect to /dashboard if already authenticated (for auth pages). */
export function useGuestOnly() {
  const router = useRouter();
  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);
}
