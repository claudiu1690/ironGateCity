'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../../components/ui/Modal';
import type { Faction } from '../../types';

// ─── Static data ──────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'q1',
    text: '"Tell me, child — how did you spend those years before the gates closed?"',
    answers: [
      { id: 'a', text: 'In the factory, learning every gear and mechanism by hand.', stat: 'STR +2, END +1' },
      { id: 'b', text: 'In the library, reading everything the regime had not yet burned.', stat: 'INT +2, CHAR +1' },
      { id: 'c', text: 'On the streets, trading favours and reading people like maps.', stat: 'CHAR +2, INT +1' },
    ],
  },
  {
    id: 'q2',
    text: '"When the soldiers came to our street, your mother hid the books. What did you do?"',
    answers: [
      { id: 'a', text: 'I stood in the doorway and stared them down.', stat: 'STR +2, CHAR +1' },
      { id: 'b', text: 'I memorised the faces of every soldier on the list.', stat: 'INT +2, END +1' },
      { id: 'c', text: 'I smiled and offered them tea — bought us two days.', stat: 'CHAR +2, STR +1' },
    ],
  },
  {
    id: 'q3',
    text: '"Your first arrest — you were seventeen. What did they want from you?"',
    answers: [
      { id: 'a', text: 'Names. I gave them nothing and took the beating.', stat: 'END +2, STR +1' },
      { id: 'b', text: 'Information. I fed them false leads and walked free.', stat: 'INT +2, END +1' },
      { id: 'c', text: 'Silence. I negotiated my release inside forty minutes.', stat: 'CHAR +2, INT +1' },
    ],
  },
  {
    id: 'q4',
    text: '"If Irongate falls tomorrow — what survives?"',
    answers: [
      { id: 'a', text: 'The strong. Only power endures when the walls come down.', stat: 'STR +2, END +1' },
      { id: 'b', text: 'Ideas. What we carry in our minds they cannot burn.', stat: 'INT +2, CHAR +1' },
      { id: 'c', text: 'People. The bonds we forged outlast every regime.', stat: 'CHAR +2, END +1' },
    ],
  },
];

const FACTIONS: { id: Faction; symbol: string; title: string; ideology: string; bonus: string; mission: string; border: string; color: string }[] = [
  {
    id: 'FASCIST',
    symbol: '⚔',
    title: 'THE IRON VANGUARD',
    ideology: 'Order through strength. The nation rises when the weak submit to the capable. Sentiment is a weapon of the enemy.',
    bonus: '+5 STR at start · Vanguard missions unlocked · Black Market access at Rank 3',
    mission: '"Silence the Dissenter" — eliminate a Communist organizer in the docks.',
    border: 'border-fascist',
    color: 'text-fascist',
  },
  {
    id: 'COMMUNIST',
    symbol: '☭',
    title: 'THE RED COLLECTIVE',
    ideology: 'Power belongs to the workers. The state exists to serve the people — not the powerful. Revolution, if necessary.',
    bonus: '+5 INT at start · Collective missions unlocked · Trade Union contacts at Rank 2',
    mission: '"Distribute the Pamphlets" — spread propaganda through the industrial quarter.',
    border: 'border-communist',
    color: 'text-communist',
  },
  {
    id: 'DEMOCRAT',
    symbol: '⚖',
    title: 'THE FREE ASSEMBLY',
    ideology: 'Freedom through law. Reform the system from within. Persuasion is more permanent than the bullet.',
    bonus: '+5 CHAR at start · Assembly missions unlocked · Press contacts at Rank 2',
    mission: '"Win the Ward Vote" — convince dockworkers to support democratic reform.',
    border: 'border-democrat',
    color: 'text-democrat',
  },
];

const STORAGE_KEY = 'ig_origin_state';

interface OriginState {
  questionIndex: number;
  answers: Record<string, string>;
  phase: 'questions' | 'summary' | 'faction';
  selectedFaction: Faction | null;
}

function loadState(): OriginState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { questionIndex: 0, answers: {}, phase: 'questions', selectedFaction: null };
}

function saveState(s: OriginState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Rain animation ───────────────────────────────────────────────────────────

function RainLayer() {
  const drops = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {drops.map((i) => (
        <div
          key={i}
          className="absolute w-px bg-iron-600/30"
          style={{
            left:             `${Math.random() * 100}%`,
            height:           `${Math.random() * 80 + 40}px`,
            animationName:    'rain-drop',
            animationDuration:`${Math.random() * 1.5 + 0.8}s`,
            animationDelay:   `${Math.random() * 3}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            top:              '-100px',
          }}
        />
      ))}
    </div>
  );
}

// ─── Father portrait ─────────────────────────────────────────────────────────

function FatherPortrait() {
  return (
    <div className="w-32 h-40 mx-auto relative">
      <svg viewBox="0 0 128 160" className="w-full h-full" fill="none">
        {/* Background shadow */}
        <ellipse cx="64" cy="152" rx="40" ry="8" fill="#111" opacity="0.6" />
        {/* Body / coat */}
        <rect x="28" y="90" width="72" height="70" rx="8" fill="#1a1a1f" />
        <rect x="20" y="88" width="20" height="50" rx="4" fill="#242429" />
        <rect x="88" y="88" width="20" height="50" rx="4" fill="#242429" />
        {/* Collar / lapel */}
        <polygon points="56,90 64,110 72,90" fill="#35353d" />
        {/* Neck */}
        <rect x="56" y="74" width="16" height="18" rx="4" fill="#8b6b4a" />
        {/* Head */}
        <ellipse cx="64" cy="62" rx="26" ry="30" fill="#8b6b4a" />
        {/* Hair */}
        <ellipse cx="64" cy="36" rx="26" ry="16" fill="#2a1a0a" />
        {/* Eyes */}
        <ellipse cx="54" cy="60" rx="4" ry="4.5" fill="#1a1a1f" />
        <ellipse cx="74" cy="60" rx="4" ry="4.5" fill="#1a1a1f" />
        <circle cx="55" cy="59" r="1.5" fill="#fff" opacity="0.6" />
        <circle cx="75" cy="59" r="1.5" fill="#fff" opacity="0.6" />
        {/* Nose */}
        <ellipse cx="64" cy="68" rx="3" ry="4" fill="#7a5c3e" />
        {/* Mouth — stern expression */}
        <line x1="56" y1="76" x2="72" y2="76" stroke="#5a3e28" strokeWidth="2" strokeLinecap="round" />
        {/* Medal / party pin */}
        <circle cx="40" cy="105" r="5" fill="#d4af37" />
        <circle cx="40" cy="105" r="3" fill="#9a7d0a" />
      </svg>
    </div>
  );
}

// ─── Typewriter text ──────────────────────────────────────────────────────────

function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 28);
    return () => clearInterval(id);
  }, [text, onDone]);

  return (
    <p className="text-iron-200 italic text-lg leading-relaxed min-h-[3.5rem]">
      {displayed}
      <span className="animate-pulse text-gold">|</span>
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OriginPage() {
  useAuth();
  const router = useRouter();

  const [state, setState]         = useState<OriginState>(() => {
    if (typeof window !== 'undefined') return loadState();
    return { questionIndex: 0, answers: {}, phase: 'questions', selectedFaction: null };
  });
  const [dialogueDone, setDialogueDone] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const q = QUESTIONS[state.questionIndex];

  function update(patch: Partial<OriginState>) {
    setState((s) => {
      const next = { ...s, ...patch };
      saveState(next);
      return next;
    });
  }

  function selectAnswer(answerId: string) {
    if (pendingAnswer) return;
    setPendingAnswer(answerId);
    setTimeout(() => {
      const newAnswers = { ...state.answers, [q.id]: answerId };
      if (state.questionIndex < QUESTIONS.length - 1) {
        update({ answers: newAnswers, questionIndex: state.questionIndex + 1 });
        setDialogueDone(false);
      } else {
        update({ answers: newAnswers, phase: 'summary' });
      }
      setPendingAnswer(null);
    }, 1400);
  }

  const selectFaction = useCallback((f: Faction) => {
    update({ selectedFaction: f });
    setConfirmOpen(true);
  }, []);

  async function confirmFaction() {
    if (!state.selectedFaction) return;
    setLoading(true);
    setError('');
    try {
      // Tally answers: a = strength (STR), b = wisdom (INT), c = speed (AGI)
      const tally = { a: 0, b: 0, c: 0 };
      Object.values(state.answers).forEach((v) => { if (v in tally) tally[v as keyof typeof tally]++; });
      const dominant = tally.a >= tally.b && tally.a >= tally.c ? 'strength'
        : tally.b >= tally.c ? 'wisdom' : 'speed';
      await api.post('/character/faction', { faction: state.selectedFaction, originChoice: dominant });
      localStorage.removeItem(STORAGE_KEY);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set faction');
    } finally {
      setLoading(false);
    }
  }

  // ── Summary stats derived from answers ──────────────────────────────────────
  const statSummary = [
    { label: 'STR', base: 10 + Object.values(state.answers).filter((a) => a === 'a').length * 2 },
    { label: 'INT', base: 10 + Object.values(state.answers).filter((a) => a === 'b').length * 2 },
    { label: 'CHAR', base: 10 + Object.values(state.answers).filter((a) => a === 'c').length * 2 },
    { label: 'END', base: 10 + 1 },
  ];

  return (
    <div className="min-h-screen bg-iron-950 relative flex flex-col items-center justify-center overflow-hidden">
      <RainLayer />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)'
      }} />

      <div className="relative z-10 w-full max-w-2xl px-6 py-12 space-y-8">

        {/* ── Questions Phase ── */}
        {state.phase === 'questions' && q && (
          <div className="animate-fade-up space-y-8">
            {/* Progress */}
            <div className="flex gap-2 justify-center">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < state.questionIndex ? 'bg-gold' : i === state.questionIndex ? 'bg-gold/60' : 'bg-iron-700'
                  }`}
                />
              ))}
            </div>

            {/* Father */}
            <div className="text-center space-y-4">
              <FatherPortrait />
              <div className="text-xs font-mono text-iron-500 tracking-widest uppercase">Your father speaks</div>
            </div>

            {/* Dialogue */}
            <div className="card border-gold/20 bg-iron-900/80">
              <Typewriter key={q.id} text={q.text} onDone={() => setDialogueDone(true)} />
            </div>

            {/* Answer cards */}
            {dialogueDone && (
              <div className="space-y-3 animate-fade-up">
                {q.answers.map((ans) => {
                  const isPending = pendingAnswer === ans.id;
                  const isDimmed  = pendingAnswer && pendingAnswer !== ans.id;
                  return (
                    <button
                      key={ans.id}
                      onClick={() => selectAnswer(ans.id)}
                      disabled={!!pendingAnswer}
                      className={`w-full card text-left transition-all duration-300 hover:border-gold/60 hover:bg-iron-800 group ${
                        isPending ? 'border-gold bg-iron-800 scale-[1.02]' : ''
                      } ${isDimmed ? 'opacity-30' : ''}`}
                    >
                      <p className="text-iron-200 text-sm group-hover:text-iron-100">{ans.text}</p>
                      {isPending && (
                        <p className="text-gold text-xs font-mono mt-1">{ans.stat}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Summary Phase ── */}
        {state.phase === 'summary' && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-iron-500 tracking-widest uppercase">Your story, before Irongate</div>
              <h2 className="text-2xl font-bold text-iron-100">Who You Are</h2>
            </div>

            <div className="card space-y-4">
              <p className="text-iron-300 italic text-sm leading-relaxed">
                "Your years at the factory hardened your hands. Your mother&apos;s books sharpened your mind.
                The streets taught you to read people before they read you. Irongate has waited long enough."
              </p>
              <div className="divider" />
              <div className="grid grid-cols-4 gap-3">
                {statSummary.map((s) => (
                  <div key={s.label} className="card bg-iron-800 text-center">
                    <div className="text-xs font-mono text-iron-400">{s.label}</div>
                    <div className="text-2xl font-bold text-gold">{s.base}</div>
                  </div>
                ))}
              </div>
              <p className="text-iron-500 text-xs font-mono text-center">
                Final stats are adjusted by your faction choice.
              </p>
            </div>

            <button
              onClick={() => update({ phase: 'faction' })}
              className="btn-primary w-full"
            >
              Choose Your Cause →
            </button>
          </div>
        )}

        {/* ── Faction Selection Phase ── */}
        {state.phase === 'faction' && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-iron-500 tracking-widest uppercase">The moment of choice</div>
              <h2 className="text-2xl font-bold text-iron-100">Choose Your Faction</h2>
              <p className="text-iron-400 text-sm">This cannot be changed. Choose with conviction.</p>
            </div>

            <div className="space-y-4">
              {FACTIONS.map((faction) => (
                <button
                  key={faction.id}
                  onClick={() => selectFaction(faction.id)}
                  className={`w-full card border-2 ${faction.border} text-left hover:bg-iron-800 transition-all group`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`text-4xl ${faction.color} shrink-0`}>{faction.symbol}</span>
                    <div className="flex-1 space-y-2">
                      <div className={`font-mono font-bold text-sm tracking-wider ${faction.color}`}>{faction.title}</div>
                      <p className="text-iron-300 text-xs leading-relaxed">{faction.ideology}</p>
                      <div className="divider" />
                      <div className="text-xs font-mono text-iron-400">
                        <span className="text-gold">BONUS:</span> {faction.bonus}
                      </div>
                      <div className="text-xs font-mono text-iron-500">
                        <span className="text-iron-400">FIRST MISSION:</span> {faction.mission}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      <Modal open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} title="Final Oath">
        {state.selectedFaction && (() => {
          const f = FACTIONS.find((x) => x.id === state.selectedFaction)!;
          return (
            <div className="space-y-4">
              <p className="text-iron-300 text-sm">
                You are about to swear allegiance to{' '}
                <span className={`font-bold ${f.color}`}>{f.title}</span>.
                This choice defines your path in Irongate City — permanently.
              </p>
              <div className={`card border ${f.border} bg-iron-800 text-center py-4`}>
                <div className={`text-3xl ${f.color} mb-2`}>{f.symbol}</div>
                <div className={`font-mono font-bold ${f.color}`}>{f.title}</div>
                <div className="text-xs text-iron-400 mt-2 font-mono">{f.bonus}</div>
              </div>
              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={loading}
                  className="btn-ghost flex-1"
                >
                  Reconsider
                </button>
                <button
                  onClick={confirmFaction}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Taking the oath...' : 'I Swear Allegiance'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
