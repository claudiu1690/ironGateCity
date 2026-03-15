'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCharacterStore } from '../store/characterStore';
import { useWorldStore }     from '../store/worldStore';
import { getToken }          from '../lib/token';
import type { CityInfluence, WeatherState, NewsItem } from '../types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─── /world namespace ─────────────────────────────────────────────────────────

export function useWorldSocket() {
  const socketRef = useRef<Socket | null>(null);
  // Use individual selectors — Zustand actions are stable references,
  // but selecting the whole store re-renders on every state change
  const setInfluence = useWorldStore((s) => s.setInfluence);
  const addNewsItem  = useWorldStore((s) => s.addNewsItem);
  const setWeather   = useWorldStore((s) => s.setWeather);

  useEffect(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${BASE}/world`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('influence:update', (data: CityInfluence & { citySlug: string }) => {
      setInfluence(data.cityId, {
        cityId: data.cityId,
        fascistPct:   data.fascistPct,
        communistPct: data.communistPct,
        democratPct:  data.democratPct,
      });
    });

    socket.on('weather:change', (data: WeatherState) => {
      setWeather(data);
      addNewsItem({ message: `Weather: ${data.weather} (${data.season})`, type: 'weather', timestamp: Date.now() });
    });

    socket.on('law:activated', (data: { lawId: string; title: string }) => {
      addNewsItem({ message: `New law enacted: "${data.title}"`, type: 'law', timestamp: Date.now() });
    });

    socket.on('law:expired', (data: { title: string }) => {
      addNewsItem({ message: `Law expired: "${data.title}"`, type: 'law', timestamp: Date.now() });
    });

    socket.on('election:started', (data: { faction: string }) => {
      addNewsItem({ message: `${data.faction} election has begun — nominate candidates now.`, type: 'election', timestamp: Date.now() });
    });

    socket.on('election:concluded', (data: { faction: string; winner?: { name: string } }) => {
      const msg = data.winner
        ? `${data.faction} election concluded — ${data.winner.name} elected.`
        : `${data.faction} election concluded — no winner.`;
      addNewsItem({ message: msg, type: 'election', timestamp: Date.now() });
    });

    socket.on('president:elected', (data: { faction: string; name: string }) => {
      addNewsItem({ message: `${data.name} (${data.faction}) inaugurated as President.`, type: 'president', timestamp: Date.now() });
    });

    socket.on('news:tick', (data: NewsItem) => {
      addNewsItem({ ...data, timestamp: Date.now() });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [setInfluence, addNewsItem, setWeather]);
}

// ─── /player namespace ────────────────────────────────────────────────────────

export function usePlayerSocket() {
  const socketRef = useRef<Socket | null>(null);
  const setEnergy = useCharacterStore((s) => s.setEnergy);
  const setHealth = useCharacterStore((s) => s.setHealth);

  useEffect(() => {
    const token = getToken();
    if (!token || socketRef.current?.connected) return;

    const socket = io(`${BASE}/player`, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('energy:updated', (data: { current: number; max: number }) => {
      setEnergy(data.current, data.max);
    });

    socket.on('health:updated', (data: { currentHealth: number; maxHealth: number }) => {
      setHealth(data.currentHealth, data.maxHealth);
    });

    socket.on('hospitalised', () => {
      if (typeof window !== 'undefined') window.location.href = '/hospital';
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [setEnergy, setHealth]);
}
