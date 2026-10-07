/**
 * Review 4, T5 (tech design docs/tech/review-4.md §12.7; answers §22, GDD §13.7): the order test's
 * content check. An order is offered only when the member can carry it out today. The mission order
 * is filtered at the rotation (`offerable`, phase 0); every other rotation template is guaranteed by
 * construction: at least one ticket that matches it exists in its residence city, at a place open at
 * Level 1, with no `requires`, open to the member's party (no members-only place of another party).
 * The welcome set and the crisis pair are exempt (built to pass). A future template gated by Level,
 * Rank or Reputation must go through `offerable` instead (tech design §24 note 8).
 */
import { feedMatches, orderMatches, quarterOpen } from '@irongate/rules';
import type { ActionDescriptor, FactionId, OrderTemplate } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import { getContent } from '../src';
import type { GameContent } from '../src';

const content = getContent();
const ALL_FACTIONS: FactionId[] = ['vanguard', 'collective', 'alliance'];

/** The residence cities (and, in the capital, each district) a template's members can live in. */
function residencesOf(
  c: GameContent,
  t: OrderTemplate,
): Array<{ cityId: string; districtId: string | null }> {
  const home = c.faction(t.factionId as FactionId).homeCityId;
  const capital = c.capitalCity().id;
  const inCapital = c.districtsOf(capital).map((d) => ({ cityId: capital, districtId: d.id }));
  const residence = t.residence ?? 'home';
  if (residence === 'home') return [{ cityId: home, districtId: null }];
  if (residence === 'capital') return inCapital;
  return [{ cityId: home, districtId: null }, ...inCapital];
}

/**
 * The tickets a Level-1 member of `factionId` can take in `cityId` today, Energy aside: places in a
 * quarter open at Level 1, not another party's members-only hall, actions with no `requires`. Each
 * as the descriptor the server builds, tagged with every Issue that could be drawn there.
 */
function takeableTickets(c: GameContent, cityId: string, factionId: FactionId): ActionDescriptor[] {
  const city = c.city(cityId)!;
  const districted = c.isDistricted(cityId);
  const issues = c.issuesFor(cityId);
  return city.locations.flatMap((l) => {
    const quarter = c.quarterOf(l.id);
    if (quarter && !quarterOpen(quarter, 1).open) return [];
    if (l.factionId && l.factionId !== factionId) return [];
    return l.actions.flatMap((a) => {
      if ('requires' in a && a.requires) return [];
      const d: ActionDescriptor = {
        kind: a.type === 'training' ? 'training' : 'checked',
        actionId: a.id,
        type: a.type,
        locationId: l.id,
        cityId,
        locationKind: l.kind,
        ...(districted ? { districtId: l.quarterId } : {}),
      };
      const tagged = issues.filter(
        (i) =>
          (i.districtId === null || i.districtId === d.districtId) && i.feeds.some((m) => feedMatches(m, d)),
      );
      return [{ ...d, issueIds: tagged.map((i) => i.issue.id) }];
    });
  });
}

/** The rotation templates no member can carry out somewhere they may live, with where. */
function uncarriable(c: GameContent, templates: readonly OrderTemplate[]): string[] {
  const out: string[] = [];
  for (const t of templates) {
    if ((t.use ?? 'rotation') !== 'rotation') continue;
    if (t.match.kinds?.includes('mission')) continue;
    for (const r of residencesOf(c, t)) {
      const tickets = takeableTickets(c, r.cityId, t.factionId as FactionId);
      // An Issue order holds whatever the week's draw: each Issue that can be drawn here tags a
      // matching ticket on its own.
      const draws = t.match.issueTagged ? c.issuesFor(r.cityId).map((i) => i.issue.id) : [null];
      for (const only of draws) {
        const ok = tickets.some((d) =>
          orderMatches(
            t.match,
            only === null ? d : { ...d, issueIds: (d.issueIds ?? []).filter((x) => x === only) },
            r,
          ),
        );
        if (!ok) out.push(`${t.id} @ ${r.districtId ?? r.cityId}${only ? ` (${only})` : ''}`);
      }
    }
  }
  return out;
}

describe('the order test: every rotation order can be carried out at Level 1 (answers §22)', () => {
  const rotation = ALL_FACTIONS.flatMap((f) => content.ordersOf(f));

  it('holds for every rotation template of the three parties, home and capital', () => {
    expect(rotation.filter((t) => (t.use ?? 'rotation') === 'rotation').length).toBeGreaterThan(30);
    expect(uncarriable(content, rotation)).toEqual([]);
  });

  it('the mission order, the welcome set and the crisis pair are left to their own rules', () => {
    const skipped = rotation.filter(
      (t) => (t.use ?? 'rotation') !== 'rotation' || t.match.kinds?.includes('mission'),
    );
    expect(skipped.map((t) => t.use ?? 'rotation')).toEqual(
      expect.arrayContaining(['welcome', 'crisis', 'rotation']),
    );
  });

  it('fails a template whose only ticket is at a place locked at Level 1, or gated, or members only', () => {
    const coalport = content.city('coalport')!;
    const locked = coalport.locations.find((l) => !quarterOpen(content.quarterOf(l.id)!, 1).open)!;
    // No ticket carries `requires` today: gate one in a copy of the content.
    const open = coalport.locations.find((l) => quarterOpen(content.quarterOf(l.id)!, 1).open)!;
    const gatedId = open.actions[0]!.id;
    const gatedContent: GameContent = {
      ...content,
      city: (id: string) =>
        id !== 'coalport'
          ? content.city(id)
          : {
              ...coalport,
              locations: coalport.locations.map((l) => ({
                ...l,
                actions: l.actions.map((a) => (a.id === gatedId ? { ...a, requires: { level: 3 } } : a)),
              })),
            },
    };
    const rivalHall = content.hqOf('vanguard', content.capitalCity().id).location;
    const fixture = (
      id: string,
      actionId: string,
      residence: OrderTemplate['residence'] = 'home',
    ): OrderTemplate => ({
      id,
      factionId: 'collective',
      slot: 'A',
      title: 'A fixture',
      line: 'A fixture.',
      match: { actionIds: [actionId] },
      target: 1,
      counts: 'attempts',
      use: 'rotation',
      residence,
    });
    expect(uncarriable(content, [fixture('dir.fixture-locked', locked.actions[0]!.id)])).toEqual([
      'dir.fixture-locked @ coalport',
    ]);
    expect(uncarriable(gatedContent, [fixture('dir.fixture-gated', gatedId)])).toEqual([
      'dir.fixture-gated @ coalport',
    ]);
    // The same ticket ungated passes.
    expect(uncarriable(content, [fixture('dir.fixture-open', gatedId)])).toEqual([]);
    // Another party's hall in the capital: members only, so every district fails.
    expect(
      uncarriable(content, [fixture('dir.fixture-members', rivalHall.actions[0]!.id, 'capital')]),
    ).toHaveLength(content.districtsOf(content.capitalCity().id).length);
  });
});
