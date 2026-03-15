'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api';
import { setTokens } from '../lib/token';

export default function LandingPage() {
  const router  = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string }>('/auth/login', { email, password });
      setTokens(data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <p className="text-gold font-mono text-sm tracking-[0.4em] uppercase">A Political RPG</p>
          <h1 className="text-5xl font-bold tracking-tight text-iron-100">IRONGATE CITY</h1>
          <p className="text-iron-400 text-sm font-mono">Est. Year Zero — Population: Unknown</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-iron-700" />
          <span className="text-iron-600 text-xs font-mono">◆</span>
          <div className="flex-1 h-px bg-iron-700" />
        </div>

        {/* Faction cards */}
        <div className="grid grid-cols-3 gap-3 text-xs font-mono">
          {[
            { icon: '⚔', name: 'FASCIST',   tagline: 'Order through strength', cls: 'border-fascist/40 text-fascist' },
            { icon: '☭', name: 'COMMUNIST', tagline: 'Power to the people',    cls: 'border-communist/40 text-communist' },
            { icon: '⚖', name: 'DEMOCRAT',  tagline: 'Freedom through law',    cls: 'border-democrat/40 text-democrat' },
          ].map((f) => (
            <div key={f.name} className={`card ${f.cls} text-center py-3`}>
              <div className="text-lg mb-1">{f.icon}</div>
              <div className="font-bold text-[11px]">{f.name}</div>
              <div className="text-iron-500 mt-1 text-[10px]">{f.tagline}</div>
            </div>
          ))}
        </div>

        {/* Login form */}
        <div className="card space-y-4">
          <h2 className="text-sm font-mono font-bold text-iron-300 tracking-widest uppercase">Continue the Struggle</h2>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
            {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Entering...' : 'Enter Irongate'}
            </button>
          </form>
          <p className="text-center text-iron-500 text-xs">
            No account?{' '}
            <Link href="/auth/register" className="text-gold hover:text-gold-light transition-colors">
              Begin your rise →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
