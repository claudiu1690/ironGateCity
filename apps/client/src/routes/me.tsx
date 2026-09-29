import { copy } from '@irongate/content/copy';
import { xpForLevel } from '@irongate/rules';
import {
  Button,
  FactionCrest,
  OrdersList,
  ProgressBar,
  StatPointsPanel,
  TodayStrip,
  formatClock,
  formatNumber,
  plural,
} from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { authClient, resetSession } from '../lib/auth';
import { trpc } from '../lib/trpc';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3">
      <h2 className="label-caps text-[11px] font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

/** Me (tech design §12.3): level and stat points, rank, PC, job, standing, today, orders, sign out. */
export function MePage() {
  const navigate = useNavigate();
  const { character: c } = useCharacter();
  const stat = usePlaceStat();
  // Without a job, the card names the home city's places that have a Jobs card, in pin order.
  const home = useQuery({
    ...trpc.city.get.queryOptions({ cityId: c?.homeCityId ?? '' }),
    enabled: !!c && c.job === null,
  });
  const jobPlaces = (home.data?.locations ?? [])
    .filter((l) => l.jobs.length > 0)
    .sort((a, b) => a.n - b.n)
    .map((l) => l.name);

  async function signOut() {
    await authClient.signOut();
    await resetSession();
    await navigate({ to: '/login' });
  }

  if (!c) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Loading…
      </p>
    );
  }
  const floor = xpForLevel(c.level);
  const next = xpForLevel(c.level + 1);
  const rankSpan = c.rank.fxpNext === null ? 1 : c.rank.fxpNext - c.rank.fxpFloor;

  return (
    <div className="paper-grain min-h-full text-ink">
      <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-4 pt-4 pb-8 lg:pb-28">
        <header className="flex items-center gap-3">
          <FactionCrest factionId={c.factionId} label={c.factionName} size={22} />
          <div className="flex flex-col">
            <h1 className="font-display text-[28px] leading-none font-black">{c.name}</h1>
            <span className="label-caps text-[10px] text-muted">
              {c.rank.title} · {c.factionName} · Level {c.level}
            </span>
          </div>
        </header>

        <Card title="Rank">
          <div className="flex justify-between font-label text-[14px]">
            <span>
              Rank {c.rank.value}: {c.rank.title}
            </span>
            <span>
              {formatNumber(c.fxp)} FXP{c.rank.fxpNext !== null ? ` / ${formatNumber(c.rank.fxpNext)}` : ''}
            </span>
          </div>
          <ProgressBar
            label="Faction XP to the next rank"
            value={c.fxp - c.rank.fxpFloor}
            max={rankSpan}
            tone="collective"
          />
          <span className="font-mono text-[12px] text-muted">Political Capital {c.pc}</span>
        </Card>

        <Card title="Level">
          <div className="flex justify-between font-label text-[14px]">
            <span>Level {c.level}</span>
            <span>
              {formatNumber(c.xp)} / {formatNumber(next)} XP
            </span>
          </div>
          <ProgressBar
            label="Experience to the next level"
            value={c.xp - floor}
            max={next - floor}
            tone="xp"
          />
          <dl className="grid grid-cols-4 gap-2 pt-1 text-center">
            {(['str', 'int', 'agi', 'cha'] as const).map((s) => (
              <div key={s} className="flex flex-col border border-faint py-1">
                <dt className="label-caps text-[10px] text-muted">{s}</dt>
                <dd className="font-label text-[20px]" data-testid={`stat-${s}`}>
                  {c.stats[s]}
                </dd>
              </div>
            ))}
          </dl>
          <StatPointsPanel
            pending={c.statPointsPending}
            level={c.level}
            stats={{ str: c.stats.str, int: c.stats.int }}
            onPlace={stat.place}
            placing={stat.placing}
          />
        </Card>

        <Card title="Job">
          {c.job ? (
            <>
              <span className="font-display text-[17px] font-bold">
                {c.job.name} · {c.job.dailyPay} a day
              </span>
              <span className="font-mono text-[12px]">{copy.yourJob(c.job.streak, c.sickDaysLeft)}</span>
              <span className="font-mono text-[12px] text-muted">
                {c.job.shiftWorkedToday && c.job.nextShiftAt !== null
                  ? copy.shiftWorked(formatClock(c.job.nextShiftAt))
                  : `Shift waiting · ${c.job.shiftEnergy} Energy`}
              </span>
              <Link
                to="/city/$cityId"
                params={{ cityId: c.cityId }}
                search={{ loc: c.job.locationId }}
                className="label-caps inline-flex min-h-11 items-center self-start border-[1.5px] border-ink px-3 text-[12px] hover:bg-ink hover:text-paper"
              >
                Go to the {c.job.locationName}
              </Link>
            </>
          ) : (
            jobPlaces.length > 0 && (
              <span className="font-body text-[14px]" data-testid="me-no-job">
                {copy.meNoJob(jobPlaces)}
              </span>
            )
          )}
        </Card>

        <Card title="Local Standing">
          <span className="font-label text-[14px]">
            {c.standing.cityName}: {c.standing.name}
            {c.standing.bonus > 0 ? ` · +${c.standing.bonus} % here` : ''}
          </span>
          {c.standing.next !== null && (
            <>
              <ProgressBar
                label={`Successes to ${c.standing.nextName}`}
                value={c.standing.successes - c.standing.floor}
                max={c.standing.next - c.standing.floor}
              />
              <span className="font-mono text-[12px] text-muted">
                {c.standing.successes} / {c.standing.next} to {c.standing.nextName} ·{' '}
                {plural(c.standing.next - c.standing.successes, 'win')} to go
              </span>
            </>
          )}
        </Card>

        <Card title="Today">
          <TodayStrip today={c.today} />
        </Card>

        <Card title="Party orders">
          <OrdersList orders={c.orders} />
        </Card>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
