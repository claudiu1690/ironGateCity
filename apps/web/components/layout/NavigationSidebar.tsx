'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearTokens } from '../../lib/token';
import { useCharacterStore } from '../../store/characterStore';

const NAV_GROUPS = [
  {
    label: 'Activity',
    items: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/map',       label: 'World Map'  },
      { href: '/missions',  label: 'Missions'   },
      { href: '/jobs',      label: 'Jobs'       },
    ],
  },
  {
    label: 'Character',
    items: [
      { href: '/equipment', label: 'Equipment' },
      { href: '/dossier',   label: 'Dossier'   },
      { href: '/profile',   label: 'Profile'   },
      { href: '/store',     label: 'Store'      },
    ],
  },
  {
    label: 'City',
    items: [
      { href: '/hospital', label: 'Hospital' },
      { href: '/bar',      label: 'Bar'      },
      { href: '/politics', label: 'Politics' },
    ],
  },
];

const FACTION_META: Record<string, { label: string; cls: string }> = {
  FASCIST:   { label: 'Iron Vanguard',   cls: 'text-fascist-light   border-fascist/50   bg-fascist/10'   },
  COMMUNIST: { label: "Workers' Front",  cls: 'text-communist-light border-communist/50 bg-communist/10' },
  DEMOCRAT:  { label: 'Liberal Front',   cls: 'text-democrat-light  border-democrat/50  bg-democrat/10'  },
};

// ─── Resource bar (Energy / HP) ───────────────────────────────────────────────

function ResourceBar({
  label, current, max, fillClass, alert,
}: { label: string; current: number; max: number; fillClass: string; alert?: boolean }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const low = pct < 25;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-mono font-bold tracking-widest text-iron-400 uppercase">{label}</span>
        <span className={`text-xs font-mono font-semibold tabular-nums ${low ? 'text-red-400' : 'text-iron-200'}`}>
          {current}<span className="text-iron-600 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-3 bg-iron-800 rounded-sm border border-iron-700 overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all duration-500 ${fillClass} ${low ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Slim progress bar (XP / FXP) ────────────────────────────────────────────

function ProgressBar({
  label, current, max, fillClass, factionColored,
}: { label: string; current: number; max: number; fillClass?: string; factionColored?: boolean }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-mono text-iron-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-iron-500 tabular-nums">{current}<span className="text-iron-700">/{max}</span></span>
      </div>
      <div className="h-1.5 bg-iron-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${factionColored ? 'faction-bar' : fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] font-mono text-iron-500 uppercase tracking-widest w-8">{label}</span>
      <div className="flex-1 mx-2 h-px bg-iron-800" />
      <span className="text-xs font-mono font-semibold text-iron-200 tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NavigationSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const character = useCharacterStore((s) => s.character);
  const energy    = useCharacterStore((s) => s.energy);
  const maxEnergy = useCharacterStore((s) => s.maxEnergy);
  const health    = useCharacterStore((s) => s.health);
  const maxHealth = useCharacterStore((s) => s.maxHealth);

  const level     = character?.level    ?? 1;
  const xp        = character?.xp       ?? 0;
  const xpMax     = 1000 + (level - 1) * 200;
  const fRank     = character?.factionRank ?? 1;
  const fxp       = character?.factionXp   ?? 0;
  const fxpMax    = fRank * 5000;
  const meta      = FACTION_META[character?.faction ?? ''];

  function handleLogout() {
    clearTokens();
    router.push('/');
  }

  return (
    <aside className="fixed top-14 left-0 bottom-0 z-30 w-56 bg-iron-900 border-r border-iron-700 flex flex-col overflow-y-auto">

      {/* ── Character block ───────────────────────────────────── */}
      <div className="px-3 py-3 border-b border-iron-800 space-y-3">

        {/* Faction badge */}
        {meta && (
          <div className={`text-center text-[10px] font-mono font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded border ${meta.cls}`}>
            {meta.label}
          </div>
        )}

        {/* Name + rank */}
        {character ? (
          <div className="space-y-0.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-sm font-bold text-iron-100 truncate">{character.name}</span>
              <span className="text-[11px] font-mono text-iron-500 shrink-0">Lv{level}</span>
            </div>
            <div className="text-[11px] font-mono text-iron-500">
              Rank {fRank}&nbsp;&nbsp;·&nbsp;&nbsp;{character.ironMarks.toLocaleString()} Iron
            </div>
          </div>
        ) : (
          <div className="h-10 rounded bg-iron-800 animate-pulse" />
        )}

        {/* ── Resource bars ─────────────────────────────────── */}
        <ResourceBar label="Energy" current={energy}    max={maxEnergy} fillClass="bg-emerald-500" />
        <ResourceBar
          label="Health"
          current={health}
          max={maxHealth}
          fillClass={character?.isHospitalised ? 'bg-iron-600' : 'bg-red-500'}
        />
        {character?.isHospitalised && (
          <p className="text-[10px] font-mono text-red-400 text-center tracking-widest uppercase">Hospitalised</p>
        )}

        {/* ── Core stats ────────────────────────────────────── */}
        <div className="pt-1 border-t border-iron-800 space-y-0.5">
          <div className="text-[9px] font-mono font-bold tracking-[0.25em] text-iron-700 uppercase mb-1">Stats</div>
          <StatRow label="STR" value={character?.str      ?? 0} />
          <StatRow label="INT" value={character?.int      ?? 0} />
          <StatRow label="AGI" value={character?.agi      ?? 0} />
          <StatRow label="CHA" value={character?.charisma ?? 0} />
        </div>

        {/* ── Progress bars ─────────────────────────────────── */}
        <div className="pt-1 border-t border-iron-800 space-y-2">
          <ProgressBar label={`XP · Lv${level}`}  current={xp}  max={xpMax}  fillClass="bg-blue-500" />
          <ProgressBar label={`FXP · R${fRank}`}  current={fxp} max={fxpMax} factionColored />
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 mb-1 text-[9px] font-mono font-bold tracking-[0.25em] text-iron-700 uppercase">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ href, label }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link key={href} href={href} className={isActive ? 'nav-link-active' : 'nav-link'}>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Logout ────────────────────────────────────────────── */}
      <div className="px-2 py-2 border-t border-iron-800">
        <button
          onClick={handleLogout}
          className="nav-link w-full text-left text-iron-600 hover:text-red-400 text-xs"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
