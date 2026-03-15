import { getToken, getRefreshToken, setTokens, clearTokens } from './token';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const V1   = `${BASE}/api/v1`;

let isRefreshing = false;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken || isRefreshing) return false;
  isRefreshing = true;
  try {
    const res = await fetch(`${V1}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${V1}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options);
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/auth/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = (body as { error?: unknown }).error;
    if (typeof err === 'string') throw new Error(err);
    // Zod flatten shape: { formErrors: string[], fieldErrors: Record<string, string[]> }
    if (err && typeof err === 'object') {
      const flat = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
      const fieldMsgs = Object.entries(flat.fieldErrors ?? {})
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join(' | ');
      const formMsgs = (flat.formErrors ?? []).join(' | ');
      throw new Error(fieldMsgs || formMsgs || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                      => request<T>(path),
  post:   <T>(path: string, body?: unknown)       => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown)       => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T>(path: string)                      => request<T>(path, { method: 'DELETE' }),
};
