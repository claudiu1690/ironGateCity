import { copy } from '@irongate/content/copy';
import { HERO, ISSUES, xpForLevel } from '@irongate/rules';
import {
  AvatarPicker,
  BottomSheet,
  Button,
  FACTION_STYLE,
  FactionCrest,
  HelpButton,
  ItemLine,
  OrdersList,
  Picture,
  ProgressBar,
  RankLadderSheet,
  ResultModal,
  RiskRows,
  Rosette,
  ScoreboardLine,
  StatPointsPanel,
  weekdayOf,
  TodayStrip,
  formatWhen,
  formatNumber,
  formatWeekday,
  healthNow,
  heatNow,
  helpMark,
  plural,
} from '@irongate/ui';
import { heatState } from '@irongate/rules';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePoliticalAct } from '../features/council/usePoliticalAct';
import { MeOffices } from '../features/nation/MeOffices';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { authClient, resetSession } from '../lib/auth';
import { isNetworkError, trpc, trpcClient } from '../lib/trpc';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3">
      <h2 className="label-caps text-[11px] font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

/** "29 September", as the dateline (no year). */
const dayMonth = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * Me (tech design §12.3; slice 2 §12.1): the face (changed in a bottom sheet), what is worn, the
 * party card line, the keepsakes, the Ambition; level and stat points, rank, PC, job, standing,
 * today, orders, sign out.
 */
export function MePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character: c, now } = useCharacter();
  // Slice 5 (screens §2.4): *Have a mark struck off*, one tap, the political modal.
  const strike = usePoliticalAct();
  // Slice 6 (design §8): the chat's one promise, that it can be switched off.
  const chatHidden = useMutation({
    ...trpc.chat.setHidden.mutationOptions(),
    onSuccess: (r) => queryClient.setQueryData(trpc.character.me.queryKey(), r.character),
  });
  // Slice 4: the hero, the heroes and the scoreboard come only from `character.me` (an action's
  // character view carries none), so the Me tab reads it fresh before it renders.
  const fresh = useQuery({ ...trpc.character.me.queryOptions(), refetchOnMount: 'always' });
  const stat = usePlaceStat();
  const [faceOpen, setFaceOpen] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  const faces = useQuery({ ...trpc.arrival.faces.queryOptions(), staleTime: Infinity, enabled: faceOpen });
  const setAvatar = useMutation({
    ...trpc.character.setAvatar.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (view) => {
      queryClient.setQueryData(trpc.character.me.queryKey(), view);
      setFaceOpen(false);
    },
  });
  // Without a job, the card names the home city's places that have a Jobs card, in pin order (when
  // standing at home: the city view is only for the city you are in).
  const home = useQuery({
    ...trpc.city.get.queryOptions({ cityId: c?.homeCityId ?? '' }),
    enabled: !!c && c.job === null && c.cityId === c.homeCityId && !c.journey,
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

  if (!c || !(fresh.isFetchedAfterMount || fresh.isError)) {
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
      <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-4 pt-4 pb-8 lg:pb-[132px]">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFaceOpen(true)}
            className="relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-ink bg-ink-2"
            aria-label={copy.chooseYourFace}
            data-testid="me-face"
          >
            {c.avatar && (
              <Picture
                asset={c.avatar}
                sizes="64px"
                decorative
                className="size-full object-cover object-top"
              />
            )}
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[28px] leading-none font-black">{c.name}</h1>
            <span className="label-caps flex items-center gap-1.5 text-[10px] text-muted">
              <FactionCrest factionId={c.factionId} label={c.factionName} size={10} />
              {c.rank.title} · {c.factionName} · Level {c.level}
            </span>
            {!c.avatar && (
              <span
                className="label-caps flex items-center gap-1.5 text-[10px] text-collective"
                data-testid="me-no-face"
              >
                <span className="size-2 rounded-full bg-collective" aria-hidden="true" />
                {copy.noFaceYet}
              </span>
            )}
          </div>
        </header>

        <Card title="Wearing and papers">
          {c.wearing && <ItemLine name={c.wearing.name} cha={c.wearing.cha} />}
          {c.partyCard && (
            <span className="font-mono text-[12px]" data-testid="me-party-card">
              {copy.partyCard(
                c.partyCard.factionName,
                c.partyCard.rankTitle,
                dayMonth(c.partyCard.memberSince),
              )}
            </span>
          )}
          {/* The voting rework (design §4.7): the rule where you live, one line under the party card;
              a tap opens the Town Hall. */}
          {c.cityRule && (
            <Link
              to="/council"
              className="flex min-h-11 items-center font-mono text-[12px] text-ink underline decoration-dotted underline-offset-2"
              data-testid="me-rule"
            >
              {copy.me.rule(c.cityRule.cityName, c.cityRule.name, c.cityRule.daysLeft)}
            </Link>
          )}
          {/* Slice 5 (screens §2.4): Health, Heat and the record, under the party card. */}
          {c.record && c.health && (
            <RiskRows
              heat={heatNow(c.heat, now)}
              heatState={heatState(heatNow(c.heat, now))}
              coolsAt={c.heat?.coolsAt ?? null}
              health={{ value: healthNow(c.health, now), max: c.health.max }}
              record={c.record}
              pc={c.pc}
              onStrike={() =>
                void strike.run('strike', (k) => trpcClient.record.strike.mutate({ idempotencyKey: k }))
              }
              strikePending={strike.pending === 'strike'}
              notice={strike.error ? noticeFor(strike.error) : null}
            />
          )}
          {/* Slice 3 (screens §8): the office line under the party card. */}
          {c.office ? (
            <Link
              to="/council"
              className="flex min-h-11 items-center font-mono text-[12px] text-petrol underline decoration-dotted underline-offset-2"
              data-testid="me-office"
            >
              {copy.councillorLine(c.office.cityName, formatWeekday(c.office.termEndsAt - 1))}
            </Link>
          ) : c.rank.value >= 3 ? (
            <span className="font-mono text-[12px] text-muted" data-testid="me-office">
              {copy.noOffice(c.rank.title)}
            </span>
          ) : null}
          {/* Slice 4 (screens §9.3): where you live, this election's scoreboard, the hero's title. */}
          {c.residence && (
            <Link
              to={c.residence.districtId ? '/city/$cityId/$quarterId' : '/city/$cityId'}
              params={
                c.residence.districtId
                  ? { cityId: c.residence.cityId, quarterId: c.residence.districtId }
                  : { cityId: c.residence.cityId }
              }
              disabled={c.cityId !== c.residence.cityId || !!c.journey}
              // QA slice 4 m8: a 44 px target, like every other control.
              className="flex min-h-11 items-center font-mono text-[12px] text-petrol underline decoration-dotted underline-offset-2"
              data-testid="me-residence"
            >
              {c.residence.districtName
                ? copy.residence.meLine(c.residence.districtName, weekdayOf(c.residence.canMoveFromDay))
                : copy.residence.youLiveIn(c.residence.cityName)}
            </Link>
          )}
          {(c.scoreboard ?? []).map((line) => (
            <ScoreboardLine key={line.placeId} line={line} factionName={c.factionName} />
          ))}
          {c.hero && (
            <span className="flex items-center gap-1.5 font-mono text-[12px]" data-testid="me-hero">
              <Rosette size={14} />
              {c.hero.title} · this election
            </span>
          )}
          {(c.heroes ?? []).map((h) => (
            <span key={h.placeName} className="font-mono text-[12px] text-muted" data-testid="me-heroes">
              {copy.scoreboard.heroes(h.placeName, h.n)}
            </span>
          ))}
          {c.keepsakes.length > 0 && (
            <ul className="flex flex-col gap-1.5 pt-1" aria-label="Keepsakes" data-testid="me-keepsakes">
              {c.keepsakes.map((k) => (
                <li key={k.itemId} className="flex items-center gap-2 font-body text-[14px]">
                  <Picture asset={k.art} sizes="32px" decorative className="size-8 object-cover" />
                  {copy.keepsakeLine(k.name)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {c.ambition.id && (
          <Card title="Ambition">
            <span className="font-display text-[17px] font-bold">{c.ambition.title}</span>
            {c.ambition.status === 'ready' || c.ambition.status === 'midway' ? (
              <Link
                to="/story/ambition"
                search={{ from: '/me' }}
                className="label-caps inline-flex min-h-11 items-center self-start border-[1.5px] border-ink px-3 text-[12px] hover:bg-ink hover:text-paper"
                data-testid="me-ambition"
              >
                Chapter {c.ambition.chapter} · {c.ambition.status === 'ready' ? 'ready' : copy.letterMidway}
              </Link>
            ) : (
              <span className="font-mono text-[12px] text-muted" data-testid="me-ambition">
                {c.ambition.status === 'waiting' && c.ambition.readyFrom !== null
                  ? `Chapter ${c.ambition.chapter} · from ${dayMonth(c.ambition.readyFrom)}`
                  : `Chapter ${c.ambition.chapter - 1} done`}
              </span>
            )}
          </Card>
        )}

        <ResultModal result={strike.result} open={strike.open} onOpenChange={strike.setOpen} />

        <BottomSheet open={faceOpen} onOpenChange={setFaceOpen} title={copy.chooseYourFace}>
          {faces.data ? (
            <AvatarPicker
              faces={faces.data}
              value={c.avatar?.id ?? null}
              onChange={(id) => setAvatar.mutate({ avatarId: id })}
              error={noticeFor(setAvatar.error)}
            />
          ) : (
            <p className="label-caps text-[11px] text-muted" role="status">
              Loading the faces…
            </p>
          )}
        </BottomSheet>

        <Card title="Rank">
          {/* Review 1 (answers §8): the full row; review 4 #25 (answers §25): *{title} · {fxp} / {next}
              to {nextTitle}*, and the Party XP opens the rank ladder. */}
          <button
            type="button"
            onClick={() => setLadderOpen(true)}
            aria-label={`${copy.ranks.meLine(c.rank.title, formatNumber(c.fxp), c.rank.fxpNext !== null ? formatNumber(c.rank.fxpNext) : null, c.rank.nextTitle)}: the party's ranks`}
            aria-haspopup="dialog"
            className="flex min-h-11 cursor-pointer flex-col gap-1.5 text-left"
            data-testid="me-rank-help"
          >
            <span className="font-label text-[14px]" data-testid="me-rank">
              {c.partyCard?.factionName ?? c.factionName} ·{' '}
              <span className={helpMark}>
                {copy.ranks.meLine(
                  c.rank.title,
                  formatNumber(c.fxp),
                  c.rank.fxpNext !== null ? formatNumber(c.rank.fxpNext) : null,
                  c.rank.nextTitle,
                )}
              </span>
            </span>
            <ProgressBar
              label="Party XP to the next rank"
              value={c.rank.fxpNext === null ? 1 : c.fxp - c.rank.fxpFloor}
              max={c.rank.fxpNext === null ? 1 : rankSpan}
              color={FACTION_STYLE[c.factionId].color}
              className="w-full"
            />
          </button>
          <RankLadderSheet
            open={ladderOpen}
            onOpenChange={setLadderOpen}
            factionName={c.factionName}
            ranks={c.ranks}
            rank={c.rank.value}
            fxp={c.fxp}
          />
          <HelpButton notes={[copy.help.pc()]} label="What Political Capital means" className="self-start">
            <span className="font-mono text-[12px] text-muted" data-testid="me-pc">
              <span className={helpMark}>{copy.pcSinks(c.pc)}</span>
            </span>
          </HelpButton>
          {/* Slice 4 (screens §9.3): the Political Capital line's new sources. */}
          <span className="font-mono text-[11.5px] text-muted" data-testid="me-pc-sources">
            {copy.scoreboard.pcSources(HERO.pc, ISSUES.topPc)}
          </span>
        </Card>

        {/* Slice 7 (screens §3): the offices held and the ladder. */}
        <MeOffices />

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
            stats={{ str: c.stats.str, int: c.stats.int, agi: c.stats.agi }}
            guide={c.statGuide}
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
              {/* Review 1 (§9.1): a wage, paid at midnight; seniority counts the days held. */}
              <span className="font-mono text-[12px]" data-testid="me-job">
                {copy.yourJob(c.job.seniority.days, c.job.seniority.pct)}
              </span>
              <span className="font-mono text-[12px] text-muted">
                {copy.jobPayLine(c.job.dailyPay, formatWhen(c.job.paidAt))}
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

        <Card title="Reputation">
          <span className="font-label text-[14px]">
            {c.standing.cityName}: {c.standing.name}
          </span>
          {c.standing.next !== null && (
            <>
              <ProgressBar
                label={`Wins to ${c.standing.nextName}`}
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
          <TodayStrip today={c.today} help={{ cityName: c.statGuide.cityName, turnsAt: c.day.endsAt }} />
        </Card>

        {/* Slice 6 (design §8; screens §2.5): *Chat* shown on the Faction tab, or hidden. */}
        <Card title={copy.together.chat.me.label}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[12px]" data-testid="me-chat">
              {c.chat?.hidden ? copy.together.chat.me.off : copy.together.chat.me.on}
            </span>
            <Button
              variant="outline"
              pending={chatHidden.isPending}
              onClick={() => chatHidden.mutate({ hidden: !c.chat?.hidden })}
              data-testid="me-chat-toggle"
            >
              {c.chat?.hidden ? copy.together.chat.me.show : copy.together.chat.me.hide}
            </Button>
          </div>
          <span className="font-mono text-[11.5px] text-muted">{copy.together.chat.me.note}</span>
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
