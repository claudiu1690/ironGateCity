'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { setTokens } from '../../../lib/token';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string }>('/auth/register', {
        username: form.username,
        email:    form.email,
        password: form.password,
      });
      setTokens(data.accessToken, data.refreshToken);
      router.push('/origin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <p className="text-gold font-mono text-xs tracking-[0.4em] uppercase mb-2">Irongate City</p>
          <h1 className="text-2xl font-bold text-iron-100">Begin Your Rise</h1>
          <p className="text-iron-400 text-sm mt-1">Choose your name. The city remembers everyone.</p>
        </div>

        <div className="card space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="section-heading">Alias</label>
              <input
                type="text"
                placeholder="Your name in Irongate"
                value={form.username}
                onChange={update('username')}
                className="input"
                minLength={3}
                maxLength={20}
                required
              />
              <p className="text-iron-600 text-xs mt-1 font-mono">3–20 characters. This is permanent.</p>
            </div>
            <div>
              <label className="section-heading">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={update('email')}
                className="input"
                required
              />
            </div>
            <div>
              <label className="section-heading">Password</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={update('password')}
                className="input"
                required
              />
            </div>
            <div>
              <label className="section-heading">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={update('confirm')}
                className="input"
                required
              />
            </div>
            {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating your identity...' : 'Enter the City'}
            </button>
          </form>
          <p className="text-center text-iron-500 text-xs">
            Already sworn in?{' '}
            <Link href="/" className="text-gold hover:text-gold-light">
              Return to Irongate →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
