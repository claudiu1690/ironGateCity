import type { DevAction, DevActionResult, DevStatus } from '@irongate/server/dev';
import { queryOptions } from '@tanstack/react-query';
import { env } from '../../env';

/**
 * The dev time-skip panel's calls (README "Reviewing with the dev panel"). The routes exist only on
 * a server with the test hooks (memory mode); anywhere else the status is a 404 and the panel
 * renders nothing. The server decides, not the build.
 */

async function fetchDevStatus(): Promise<DevStatus | null> {
  try {
    const res = await fetch(`${env.apiBase}/test/dev/status`, { credentials: 'include' });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<DevStatus> | null;
    return body?.hooks === true ? (body as DevStatus) : null;
  } catch {
    return null;
  }
}

export const devStatusQuery = queryOptions({
  queryKey: ['dev', 'status'] as const,
  queryFn: fetchDevStatus,
  retry: false,
  // No hooks: asked once per page load, never again (a 404 in production).
  staleTime: (q) => (q.state.data === null ? Infinity : 10_000),
  refetchOnWindowFocus: (q) => q.state.data !== null,
});

export async function postDevAction(action: DevAction): Promise<DevActionResult> {
  const res = await fetch(`${env.apiBase}/test/dev/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  const body = (await res.json().catch(() => null)) as (DevActionResult & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `The dev action failed (${res.status})`);
  return body;
}
