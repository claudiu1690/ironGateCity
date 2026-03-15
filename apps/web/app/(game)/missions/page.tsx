'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Modal } from '../../../components/ui/Modal';
import { useCharacterStore } from '../../../store/characterStore';
import type { Mission, MissionResult, CombatRound } from '../../../types';

const TYPE_BADGE: Record<string, string> = {
  ASSAULT:      'badge-red',
  INFILTRATION: 'badge-gray',
  PROPAGANDA:   'badge-gold',
  EXTORTION:    'badge-red',
  ALLIANCE:     'badge-green',
  SABOTAGE:     'badge-red',
};

// encounterChance is stored as 0–1 decimal in DB; convert to 0–100 for display
const toDisplayPct = (raw: number) => Math.round(raw * 100);
const ENCOUNTER_RISK = (raw: number) => {
  const pct = toDisplayPct(raw);
  return pct < 20 ? 'text-green-400' : pct < 50 ? 'text-yellow-400' : 'text-red-400';
};

const OUTCOME_STYLE: Record<string, string> = {
  SUCCESS:        'text-green-400',
  PARTIAL:        'text-yellow-400',
  FAILURE:        'text-red-400',
  ENCOUNTER_WIN:  'text-blue-400',
  ENCOUNTER_LOSS: 'text-red-500',
};

// ─── Combat log display ───────────────────────────────────────────────────────

function CombatLogViewer({ rounds, npcName }: { rounds: CombatRound[]; npcName: string }) {
  const [revealed, setRevealed] = useState(0);

  useState(() => {
    const reveal = () => {
      setRevealed((n) => {
        if (n < rounds.length) {
          setTimeout(reveal, 800);
          return n + 1;
        }
        return n;
      });
    };
    setTimeout(reveal, 300);
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
        <div className="text-center text-iron-300">YOU</div>
        <div className="text-center text-iron-300">{npcName}</div>
      </div>
      {rounds.slice(0, revealed).map((r) => (
        <div key={r.round} className="animate-fade-up">
          <div className="flex justify-between text-xs text-iron-500 font-mono mb-1">
            <span>Round {r.round}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="space-y-1">
              <div className="progress-track">
                <div
                  className="progress-fill bg-green-500"
                  style={{ width: `${(r.playerHp / 100) * 100}%` }}
                />
              </div>
              <span className="text-green-400">{r.playerHp} HP</span>
              <span className="text-red-400 block">−{r.npcDamage} dmg taken</span>
            </div>
            <div className="space-y-1 text-right">
              <div className="progress-track">
                <div
                  className="progress-fill bg-red-500"
                  style={{ width: `${(r.npcHp / 100) * 100}%` }}
                />
              </div>
              <span className="text-red-400">{r.npcHp} HP</span>
              <span className="text-green-400 block">−{r.playerDamage} dmg dealt</span>
            </div>
          </div>
        </div>
      ))}
      {revealed < rounds.length && (
        <div className="text-center text-iron-500 text-xs font-mono animate-pulse">Fighting...</div>
      )}
    </div>
  );
}

// ─── Mission card ─────────────────────────────────────────────────────────────

function MissionCard({ mission, onStart }: { mission: Mission; onStart: (m: Mission) => void }) {
  const character = useCharacterStore((s) => s.character);
  const charStats = character ? {
    str: character.str, int: character.int, agi: character.agi,
    level: character.level, rank: character.factionRank,
  } : null;

  const gates = [
    mission.minStr   && charStats && charStats.str   < mission.minStr   ? `STR ${mission.minStr}`   : null,
    mission.minInt   && charStats && charStats.int   < mission.minInt   ? `INT ${mission.minInt}`   : null,
    mission.minChar  && charStats && charStats.agi   < mission.minChar  ? `AGI ${mission.minChar}`  : null,
    mission.minLevel && charStats && charStats.level < mission.minLevel ? `Lv${mission.minLevel}` : null,
  ].filter(Boolean) as string[];

  const blocked = !mission.eligible;

  return (
    <div className={`card transition-all ${blocked ? 'opacity-60' : 'hover:border-iron-500'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-iron-100">{mission.title}</span>
            <span className={`badge ${TYPE_BADGE[mission.type] ?? 'badge-gray'}`}>{mission.type}</span>
            {mission.faction && (
              <span className={`badge badge-${mission.faction.toLowerCase()}`}>{mission.faction}</span>
            )}
          </div>
          <p className="text-iron-400 text-xs leading-relaxed">{mission.description}</p>
          <div className="flex flex-wrap gap-3 text-xs font-mono">
            <span className="text-iron-300">⚡ {mission.energyCost}</span>
            <span className="text-gold">⚙ {mission.ironReward}</span>
            <span className="text-blue-400">{mission.xpReward} XP</span>
            {mission.fxpReward > 0 && <span className={`badge badge-${(mission.faction ?? 'FASCIST').toLowerCase()}`}>{mission.fxpReward} FXP</span>}
            <span className={ENCOUNTER_RISK(mission.encounterChance)}>
              {toDisplayPct(mission.encounterChance)}% encounter risk
            </span>
          </div>
          {gates.length > 0 && (
            <div className="text-red-400 text-xs font-mono">
              ✕ Requires: {gates.join(', ')}
            </div>
          )}
        </div>
        <button
          onClick={() => onStart(mission)}
          disabled={blocked}
          className={blocked ? 'btn-secondary text-sm opacity-40 cursor-not-allowed' : 'btn-primary text-sm'}
          title={mission.ineligibilityReason}
        >
          Start
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MissionsPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [confirmMission, setConfirmMission] = useState<Mission | null>(null);
  const [result, setResult]   = useState<MissionResult | null>(null);
  const [running, setRunning] = useState(false);

  const { data: missions, isLoading } = useQuery({
    queryKey: ['missions'],
    queryFn:  () => api.get<Mission[]>('/missions'),
  });

  const startMission = useMutation({
    mutationFn: (missionId: string) => api.post<MissionResult>(`/missions/${missionId}/start`),
    onSuccess: (data) => {
      setConfirmMission(null);
      setResult(data);
      qc.invalidateQueries({ queryKey: ['character', 'me'] });
      qc.invalidateQueries({ queryKey: ['character', 'energy'] });
      qc.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  function handleStart(mission: Mission) {
    setConfirmMission(mission);
  }

  async function confirmStart() {
    if (!confirmMission) return;
    setRunning(true);
    await startMission.mutateAsync(confirmMission.id);
    setRunning(false);
  }

  function closeResult() {
    if (result?.outcome === 'ENCOUNTER_LOSS') {
      router.push('/hospital');
    } else {
      setResult(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">Missions</h1>
        <p className="text-iron-400 text-sm mt-1">Each mission carries risk. Failure has consequences.</p>
      </div>

      {isLoading && <div className="text-iron-400 font-mono text-sm animate-pulse">Loading missions...</div>}

      <div className="space-y-3">
        {(missions ?? []).map((m) => (
          <MissionCard key={m.id} mission={m} onStart={handleStart} />
        ))}
      </div>

      {/* Confirm modal */}
      <Modal open={!!confirmMission} onClose={() => !running && setConfirmMission(null)} title="Confirm Mission">
        {confirmMission && (
          <div className="space-y-4">
            <h3 className="text-iron-100 font-semibold">{confirmMission.title}</h3>
            <p className="text-iron-300 text-sm leading-relaxed">{confirmMission.description}</p>
            <div className="divider" />
            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
              <div className="text-iron-400">Energy cost:</div><div className="text-iron-100">⚡ {confirmMission.energyCost}</div>
              <div className="text-iron-400">XP reward:</div><div className="text-blue-400">{confirmMission.xpReward} XP</div>
              <div className="text-iron-400">Iron reward:</div><div className="text-gold">⚙ {confirmMission.ironReward}</div>
              <div className="text-iron-400">Encounter risk:</div>
              <div className={ENCOUNTER_RISK(confirmMission.encounterChance)}>{toDisplayPct(confirmMission.encounterChance)}%</div>
            </div>
            {startMission.isError && (
              <p className="text-red-400 text-xs font-mono">{(startMission.error as Error).message}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmMission(null)} disabled={running} className="btn-ghost flex-1">Cancel</button>
              <button onClick={confirmStart} disabled={running} className="btn-primary flex-1">
                {running ? 'Running mission...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Result modal */}
      <Modal open={!!result} onClose={closeResult} title="Mission Complete" size="lg">
        {result && (
          <div className="space-y-5">
            {/* Outcome heading */}
            <div className="text-center space-y-2">
              <div className={`text-3xl font-mono font-bold tracking-widest ${OUTCOME_STYLE[result.outcome]}`}>
                {result.outcome.replace('_', ' ')}
              </div>
              {result.narrative && (
                <p className="text-iron-400 text-sm font-mono italic">{result.narrative}</p>
              )}
            </div>

            {/* Rewards — always shown, zeros on loss */}
            <div className="grid grid-cols-3 gap-3 text-center font-mono">
              <div className="card bg-iron-800 py-3">
                <div className="text-xs text-iron-500 mb-1">XP</div>
                <div className={`text-2xl font-bold ${result.xpGained > 0 ? 'text-blue-400' : 'text-iron-600'}`}>
                  +{result.xpGained}
                </div>
              </div>
              <div className="card bg-iron-800 py-3">
                <div className="text-xs text-iron-500 mb-1">Iron</div>
                <div className={`text-2xl font-bold ${result.ironGained > 0 ? 'text-gold' : 'text-iron-600'}`}>
                  +{result.ironGained}
                </div>
              </div>
              <div className="card bg-iron-800 py-3">
                <div className="text-xs text-iron-500 mb-1">FXP</div>
                <div className={`text-2xl font-bold ${result.fxpGained > 0 ? 'text-iron-200' : 'text-iron-600'}`}>
                  +{result.fxpGained}
                </div>
              </div>
            </div>

            {/* Combat log */}
            {result.combatLog && result.combatLog.length > 0 && (
              <div className="card bg-iron-800">
                <p className="section-heading">Combat Log</p>
                <CombatLogViewer
                  rounds={result.combatLog}
                  npcName={result.combatLog[0]?.npcName ?? 'Enemy'}
                />
              </div>
            )}

            {result.leveledUp && (
              <div className="text-center animate-level-up">
                <div className="text-gold text-2xl font-bold font-mono">★ LEVEL UP ★</div>
                <div className="text-iron-300 text-sm">You are now Level {result.newLevel}</div>
              </div>
            )}

            {result.rankedUp && (
              <div className="text-center">
                <div className="text-iron-200 text-lg font-bold font-mono">⬆ RANK UP</div>
                <div className="text-iron-400 text-sm">Promoted to Rank {result.newRank}</div>
              </div>
            )}

            <button onClick={closeResult} className="btn-primary w-full">
              {result.outcome === 'ENCOUNTER_LOSS' ? 'Go to Hospital' : 'Continue'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
