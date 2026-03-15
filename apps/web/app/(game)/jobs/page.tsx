'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useCharacterStore } from '../../../store/characterStore';
import type { Job } from '../../../types';

interface JobsResponse {
  currentJob: Job | null;
  available: Job[];
  lastJobDoneAt: string | null;
  jobAbsences: number;
}

function canWorkToday(lastJobDoneAt: string | null): boolean {
  if (!lastJobDoneAt) return true;
  const last = new Date(lastJobDoneAt);
  const now  = new Date();
  return last.toDateString() !== now.toDateString();
}

export default function JobsPage() {
  const qc = useQueryClient();
  const character = useCharacterStore((s) => s.character);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn:  () => api.get<JobsResponse>('/jobs/available'),
  });

  const takeJob = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/take/${jobId}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const work = useMutation({
    mutationFn: () => api.post<{ ironGained: number }>('/jobs/work'),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['character', 'me'] });
      qc.invalidateQueries({ queryKey: ['character', 'energy'] });
    },
  });

  const quit = useMutation({
    mutationFn: () => api.post('/jobs/quit'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const { currentJob, available = [], lastJobDoneAt, jobAbsences = 0 } = data ?? {};
  const workedToday = !canWorkToday(lastJobDoneAt ?? null);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-iron-100">Jobs</h1>
        <p className="text-iron-400 text-sm mt-1">Work once per day. Miss 3 days and you&apos;re fired.</p>
      </div>

      {/* Current job */}
      {currentJob ? (
        <div className="card border-gold/30 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="section-heading !mb-1">Current Employment</p>
              <h2 className="text-lg font-bold text-iron-100">{currentJob.title}</h2>
              <p className="text-iron-400 text-sm mt-1">{currentJob.description}</p>
              <div className="flex gap-4 mt-2 text-xs font-mono text-iron-300">
                <span>⚡ {currentJob.energyCost} energy/shift</span>
                <span>⚙ {currentJob.ironMin}–{currentJob.ironMax} Iron/shift</span>
              </div>
            </div>
            <button
              onClick={() => quit.mutate()}
              disabled={quit.isPending}
              className="btn-danger text-sm"
            >
              Quit
            </button>
          </div>

          {jobAbsences > 0 && (
            <div className={`text-xs font-mono ${jobAbsences >= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
              ⚠ {jobAbsences}/3 absences recorded. Miss one more and you&apos;re fired.
            </div>
          )}

          <div className="divider" />

          <div className="flex items-center justify-between">
            {workedToday ? (
              <span className="text-green-400 text-sm font-mono">✓ Shift complete for today</span>
            ) : (
              <span className="text-iron-400 text-sm">Ready for today&apos;s shift.</span>
            )}
            <button
              onClick={() => work.mutate()}
              disabled={workedToday || work.isPending}
              className="btn-primary"
            >
              {work.isPending ? 'Working...' : workedToday ? 'Worked today' : 'Work Shift'}
            </button>
          </div>

          {work.isSuccess && (
            <div className="text-green-400 text-sm font-mono animate-fade-up">
              Shift complete — earned Iron!
            </div>
          )}
          {work.isError && (
            <div className="text-red-400 text-xs font-mono">{(work.error as Error).message}</div>
          )}
        </div>
      ) : (
        <div className="card text-center py-8 text-iron-500">
          You are unemployed. Find work below.
        </div>
      )}

      {/* Available jobs */}
      {!currentJob && (
        <div>
          <p className="section-heading">Available Positions</p>
          {isLoading && <div className="text-iron-400 font-mono animate-pulse text-sm">Loading...</div>}
          <div className="space-y-3">
            {available.map((job) => {
              const gates = [
                job.minStr  && character && character.str  < job.minStr  ? `STR ${job.minStr}` : null,
                job.minInt  && character && character.int  < job.minInt  ? `INT ${job.minInt}` : null,
                job.minRank && character && character.factionRank < job.minRank ? `Rank ${job.minRank}` : null,
              ].filter(Boolean) as string[];
              const blocked = !job.available || gates.length > 0;
              return (
                <div key={job.id} className={`card flex items-center justify-between gap-4 ${blocked ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <div className="font-semibold text-iron-100">{job.title}</div>
                    <div className="text-iron-400 text-xs mt-1">{job.description}</div>
                    <div className="flex gap-3 mt-2 text-xs font-mono text-iron-300">
                      <span>⚡ {job.energyCost}</span>
                      <span>⚙ {job.ironMin}–{job.ironMax} Iron</span>
                    </div>
                    {gates.length > 0 && (
                      <div className="text-red-400 text-xs font-mono mt-1">Requires: {gates.join(', ')}</div>
                    )}
                  </div>
                  <button
                    onClick={() => takeJob.mutate(job.id)}
                    disabled={blocked || takeJob.isPending}
                    className="btn-primary text-sm"
                  >
                    Apply
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
