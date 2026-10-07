/**
 * Slice 4 content (docs/tech/slice-4.md §4, §15): the nation, the journey cards, the Issues, the
 * capital orders, the Irongate slates and the Tram Subsidy, word for word against
 * docs/design/slice-4-battleground.md; the accessors; one failing fixture per §4.2 check. The
 * Irongate city is in slice4.irongate.test.ts, the headlines and copy in slice4.headlines.test.ts.
 */
import { councilDay, dayKey, isMonday } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import DESIGN from '../../../docs/design/slice-4-battleground.md?raw';
import { inPolygon, loadContent, parseContent, rawContent } from '../src';
import type { ContentInput } from '../src';
import { mapPins } from '../src/data/mapPins';

const content = loadContent();
const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): ContentInput => deepCopy(rawContent as ContentInput);
const plain = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');

function section(start: string, end: string): string {
  const from = DESIGN.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = DESIGN.indexOf(end, from + 1);
  return plain(DESIGN.slice(from, to < 0 ? undefined : to));
}
function rows(text: string, row: RegExp): string[][] {
  return text
    .split('\n')
    .filter((l) => row.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
}
const fails = (mutate: (c: ContentInput) => void, problem: RegExp) => {
  const c = clone();
  mutate(c);
  expect(() => parseContent(c)).toThrow(problem);
};
const irongate = (c: ContentInput) => c.cities.find((x) => x.id === 'irongate')!;

describe('the real content, slice 4', () => {
  it('pins §3.1: Irongate offset 0; 4 Oct 2026 is cycle 4146 day 0; 5 Oct a Monday', () => {
    expect(content.city('irongate')?.council).toMatchObject({ offset: 0, seats: 10 });
    expect(councilDay(dayKey(Date.UTC(2026, 9, 4)), 0)).toMatchObject({ cycle: 4146, cycleDay: 0 });
    expect(councilDay(dayKey(Date.UTC(2026, 9, 9)), 0)).toMatchObject({ cycle: 4147, cycleDay: 0 });
    expect(isMonday(dayKey(Date.UTC(2026, 9, 5)))).toBe(true);
    expect(isMonday(dayKey(Date.UTC(2026, 9, 19)))).toBe(true);
    expect(councilDay(dayKey(Date.UTC(2026, 9, 19)), 0).cycleDay).toBe(0);
  });

  it('the nation: the survey positions, times, lines and the station points (§2.1–§2.3)', () => {
    const n = content.nation;
    expect(n.cities.map((c) => [c.cityId, c.x, c.y])).toEqual(
      mapPins.nation!.pins.map((p) => [p.id, p.x, p.y]),
    );
    expect(Object.fromEntries(n.cities.map((c) => [c.cityId, c.minutes]))).toEqual({
      irongate: 0,
      ashford: 12,
      duskwall: 15,
      coalport: 12,
      clearwater: 25,
    });
    expect(n.frame).toEqual({ x0: 0.06, y0: 0.11, x1: 0.94, y1: 0.91 });
    const table = rows(
      section('### 2.1 The nation map', '### 2.2'),
      /^\| (Irongate|Ashford|Duskwall|Coalport|Clearwater) \|/,
    );
    for (const [name, , line] of table) {
      const c = n.cities.find((x) => x.name === name)!;
      // The capital's tail is live (§19 Q14): content holds "Capital · 5 districts".
      expect(line!.startsWith(c.line), name).toBe(true);
    }
    expect(content.nationCity('clearwater')).toMatchObject({
      service: 'later',
      baselineOpinion: { vanguard: 20, collective: 24, alliance: 24, neutral: 32 },
    });
    expect(content.capitalCity().id).toBe('irongate');
  });

  it('the seven cards word for word (§3), the first the passenger', () => {
    const text = section('## 3. The seven journey events', '## 4. Irongate');
    expect(content.journeyDeck()).toEqual([
      'jev.passenger',
      'jev.leaflets',
      'jev.parcel',
      'jev.cards',
      'jev.reporter',
      'jev.signal',
      'jev.boy',
    ]);
    // Slice 5 adds the hostile deck (slice5.content.test.ts); slice 4's seven are the ordinary deck.
    const ordinary = content.journeyEvents.filter((j) => j.deck === 'ordinary');
    expect(ordinary.filter((j) => j.first).map((j) => j.id)).toEqual(['jev.passenger']);
    for (const j of ordinary) {
      expect(text, j.id).toContain(`${j.title} (${j.id})`);
      expect(text, j.id).toContain(j.setup);
      expect(text, j.id).toContain(j.ignore);
      for (const c of j.choices) {
        expect(text, c.id).toContain(`| ${c.title} | ${c.detail} |`);
        for (const o of [c.success, c.partial]) {
          if (!o) continue;
          expect(text, `${j.id}.${c.id}`).toContain(`${o.text.headline} — ${o.text.body}`);
        }
      }
    }
    // §19 Q2: the parcel's 50 + 50; the card school's stake; a Partial pays at most the stake.
    const parcel = content.journeyEvent('jev.parcel')!.choices.find((c) => c.id === 'carry')!;
    expect([parcel.success.rewards.iron, parcel.partial?.rewards.iron]).toEqual([100, 50]);
    const sit = content.journeyEvent('jev.cards')!.choices.find((c) => c.id === 'sit')!;
    expect([sit.cost?.iron, sit.success.rewards.iron, sit.partial?.rewards.iron]).toEqual([20, 40, 20]);
    expect(content.journeyEvent('jev.reporter')!.choices[0]!.success.rewards).toEqual({
      momentum: 10,
      quoted: true,
    });
  });

  it('the nineteen Issues word for word (§9.5): names, phrases, blurbs, stances, effect lines', () => {
    const deck = section('### 9.5 The deck', '### 9.6');
    const table = rows(deck, /^\| issue\./);
    // Slice 5 appends five Issues (design §12.1, slice5.content.test.ts); slice 4's nineteen come first.
    const nineteen = content.issues.slice(0, 19);
    const ids19 = new Set(nineteen.map((i) => i.id));
    expect(table.map((r) => [r[0], r[1], r[2]])).toEqual(nineteen.map((i) => [i.id, i.name, i.short]));
    const stances = rows(deck, /^\| [A-Z][^|]+ \| [^|]+ \| [^|]+ \| [^|]+ \| [^|]+ \|$/).filter(
      (r) => r[0] !== 'Issue',
    );
    for (const i of nineteen) {
      const r = stances.find((x) => x[0] === i.name)!;
      expect(r, i.id).toBeDefined();
      expect([i.blurb, i.stances.vanguard, i.stances.collective, i.stances.alliance]).toEqual(r.slice(1));
      // The player's effect lines are listed in §9.5's paragraph, in the pattern of review 2.
      expect(deck, i.id).toContain(i.effectLine);
    }
    const issuesFor = (c: string) => content.issuesFor(c).filter((x) => ids19.has(x.issue.id));
    expect(issuesFor('coalport').map((x) => x.issue.id)).toEqual([
      'issue.mill-strike',
      'issue.harbour-rates',
      'issue.labour-exchange',
      'issue.price-of-coal',
      'issue.lights-out',
    ]);
    const ig = issuesFor('irongate');
    expect(ig).toHaveLength(13);
    expect(new Set(ig.map((x) => x.districtId)).size).toBe(5);
    expect(issuesFor('duskwall')).toHaveLength(5);
    expect(issuesFor('ashford')).toHaveLength(5);
    expect(content.issue('issue.tram-fares')?.effects).toEqual([{ kind: 'ticketPct', value: -50 }]);
    expect(content.issue('issue.evictions')?.effects).toEqual([{ kind: 'roomPct', value: -50 }]);
  });

  it('the capital orders word for word (§10): two in A and two in B per faction, slot C shared', () => {
    const table = rows(section('## 10. Party orders for a capital resident', '## 11.'), /^\| dir\./);
    expect(table).toHaveLength(12);
    for (const [id, factionSlot, title, , target, line] of table) {
      const t = content.orderTemplates.find((x) => x.id === id)!;
      expect(t, id).toBeDefined();
      expect([t.slot, t.title, t.line, t.target, t.residence]).toEqual([
        factionSlot!.slice(-1),
        title,
        line,
        Number(target!.split(' ')[0]),
        'capital',
      ]);
    }
    for (const t of content.orderTemplates.filter((x) => x.slot === 'C' && x.use === 'rotation'))
      expect(t.residence, t.id).toBe('any');
    expect(content.orderTemplates.find((t) => t.id === 'dir.c.capital-district')?.match).toEqual({
      actionTypes: ['canvass'],
      districtId: 'home',
    });
  });

  it('the Irongate slates word for word (§8.3): two per faction per district, 28 then 20', () => {
    const table = rows(section('### 8.3 NPC fill', '### 8.4'), /^\| npc\./);
    expect(table).toHaveLength(30);
    expect(
      content.candidates
        .filter((c) => c.cityId === 'irongate')
        .map((c) => [
          c.id,
          c.name,
          c.districtId ? content.district(c.districtId)!.quarter.name : '',
          String(c.profile),
          c.line,
        ]),
    ).toEqual(table.map((r) => r));
    expect(content.slateOf('irongate.eastside').map((c) => c.id)).toEqual([
      'npc.v.ig.hollmann',
      'npc.v.ig.wirth',
      'npc.c.ig.novak',
      'npc.c.ig.albers',
      'npc.a.ig.baumann',
      'npc.a.ig.tesar',
    ]);
    expect(content.slateOf('irongate.eastside', 'collective').map((c) => c.profile)).toEqual([28, 20]);
    expect(content.slateOf('coalport')).toHaveLength(9);
  });

  it('the Tram Subsidy on every menu (§8.5)', () => {
    const [row] = rows(section('### 8.5 The Irongate ordinance menu', '### 8.6'), /^\| ord\./);
    const o = content.ordinance('ord.tram-subsidy')!;
    expect([o.id, o.name, o.line]).toEqual(row!.slice(0, 3));
    expect(o.effects).toEqual([{ kind: 'ticketPct', value: -50 }]);
    expect(content.irongateMenu().map((x) => x.id)).toEqual(content.ordinancesMenu().map((x) => x.id));
    expect(content.ordinancesMenu()).toHaveLength(11);
  });

  it('the districts, the HQs and the accessors', () => {
    expect(content.districtsOf('irongate').map((q) => [q.id, q.district!.n])).toEqual([
      ['irongate.government-quarter', 1],
      ['irongate.old-town', 2],
      ['irongate.station-market', 3],
      ['irongate.eastside', 4],
      ['irongate.garrison-hill', 5],
    ]);
    expect(content.isDistricted('irongate')).toBe(true);
    expect(content.isDistricted('coalport')).toBe(false);
    expect(content.districtsOf('coalport')).toEqual([]);
    expect(content.district('irongate.eastside')?.city.id).toBe('irongate');
    expect(content.hqOf('collective').location.id).toBe('coalport.union-hall');
    expect(content.hqOf('collective', 'irongate').location.id).toBe('irongate.union-house');
    expect(content.hqOf('vanguard', 'irongate').location.id).toBe('irongate.vanguard-house');
    expect(content.hqOf('alliance', 'irongate').location.id).toBe('irongate.concord-house');
    expect(content.councilCities().map((c) => c.id)).toEqual(['coalport', 'duskwall', 'ashford', 'irongate']);
    // Review 4 #9 (answers §9.2–§9.3): *Moved in* (was *Registered*); the bed's headline.
    expect(content.politics.results.register.stamp).toBe('Moved in');
    expect(content.politics.results.room).toMatchObject({ stamp: 'Taken', headline: 'A bed in Irongate' });
  });
});

describe('every §4.2 check has a failing fixture', () => {
  it('districts: a pin outside its frame, a baseline not 100, the city not their average, a quarter without a district', () => {
    fails((c) => {
      irongate(c).locations.find((l) => l.id === 'irongate.parliament')!.map = { x: 0.405, y: 0.32 };
    }, /irongate.parliament.*inside irongate.government-quarter's frame|its pin is not its survey pin/);
    fails((c) => {
      irongate(c).quarters[0]!.district!.baselineOpinion.neutral = 41;
    }, /baselineOpinion sums to 101/);
    fails((c) => {
      irongate(c).baselineOpinion = { vanguard: 22, collective: 20, alliance: 21, neutral: 37 };
    }, /not the average of its districts/);
    fails((c) => {
      delete irongate(c).quarters[4]!.district;
    }, /every quarter of a city with districts needs a district/);
    fails((c) => {
      irongate(c).quarters[0]!.district!.anchor = { x: 0.1, y: 0.1 };
    }, /anchor is outside its frame/);
  });

  it("the user's district lock (3 Oct 2026): a pin outside its outline, two outlines overlapping", () => {
    // Every pin lies inside its district's outline in the real data, and the anchors too.
    for (const q of content.districtsOf('irongate')) {
      const pins = content.city('irongate')!.locations.filter((l) => l.quarterId === q.id);
      expect(pins.length).toBeGreaterThan(0);
      for (const l of pins) expect(inPolygon(l.map, q.outline!), l.id).toBe(true);
      expect(inPolygon(q.district!.anchor, q.outline!), q.id).toBe(true);
    }
    // The unassigned band at the bottom of the picture lies outside all five.
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9])
      expect(content.districtsOf('irongate').some((q) => inPolygon({ x, y: 0.9 }, q.outline!))).toBe(false);
    fails((c) => {
      // Eastside drawn without the Union House's corner.
      irongate(c).quarters[3]!.outline = [
        [0.6, 0.48],
        [0.98, 0.56],
        [0.97, 0.73],
        [0.64, 0.76],
        [0.6, 0.65],
        [0.61, 0.55],
      ];
    }, /irongate.union-house": its pin is outside irongate.eastside's outline/);
    fails((c) => {
      // Old Town grown over the Ministries' street.
      irongate(c).quarters[1]!.outline = [
        [0.04, 0.06],
        [0.43, 0.08],
        [0.5, 0.2],
        [0.42, 0.355],
        [0.03, 0.32],
        [0.02, 0.2],
      ];
    }, /irongate.government-quarter and irongate.old-town: their outlines overlap/);
  });

  it('HQs: a faction-hq without its faction, two of one faction, a members-only street', () => {
    fails((c) => {
      delete irongate(c).locations.find((l) => l.id === 'irongate.union-house')!.factionId;
    }, /irongate.union-house": a faction-hq needs a factionId/);
    fails((c) => {
      irongate(c).locations.find((l) => l.id === 'irongate.union-house')!.factionId = 'alliance';
    }, /two alliance HQs/);
    fails((c) => {
      irongate(c).locations.find((l) => l.id === 'irongate.villas')!.factionId = 'vanguard';
    }, /only a faction-hq is members only/);
  });

  it('the nation: a moved pin, a wrong arrival, an open city with no content, the capital not at 0', () => {
    fails((c) => {
      c.nation.cities[1]!.x = 0.13;
    }, /nation.ashford: not at its survey pin/);
    fails((c) => {
      c.nation.cities[3]!.arrival = { x: 0.5, y: 0.5 };
    }, /nation.coalport: arrival must be the city's station pin/);
    fails((c) => {
      c.nation.cities[4]!.service = 'open';
    }, /nation.clearwater: an open city must be content/);
    fails((c) => {
      c.nation.cities[0]!.minutes = 5;
    }, /the capital is 0 minutes away/);
  });

  it('the cards: a checked choice without a partial, an unchecked with one, over a cap, a partial over the stake, two firsts', () => {
    fails((c) => {
      delete c.journeyEvents[1]!.choices[0]!.partial;
    }, /jev.leaflets.swap: a checked choice needs a partial/);
    fails((c) => {
      c.journeyEvents[1]!.choices[1]!.partial = c.journeyEvents[1]!.choices[0]!.partial;
    }, /jev.leaflets.read: an unchecked choice has no partial/);
    fails((c) => {
      c.journeyEvents[0]!.choices[1]!.success.rewards.xp = 46;
    }, /xp 46 is over the card cap 45/);
    fails((c) => {
      c.journeyEvents[2]!.choices[0]!.success.rewards.iron = 101;
    }, /iron 101 is over the card cap 100/);
    fails((c) => {
      c.journeyEvents[3]!.choices[0]!.partial!.rewards.iron = 21;
    }, /a partial returns at most the stake/);
    fails((c) => {
      c.journeyEvents[1]!.first = true;
    }, /exactly one ordinary card is drawn first/);
    fails((c) => {
      c.journeyEvents[1]!.choices[0]!.detail = 'Agility · {district}';
    }, /unknown placeholder \{district\}/);
  });

  it('Issues: a place in another city, a district missing, a feed outside its district, too few eligible', () => {
    fails((c) => {
      c.issues[0]!.where[0]!.feeds[0]!.locationIds = ['coalport.mill-gate'];
    }, /"coalport.mill-gate" is not a place in irongate/);
    fails((c) => {
      delete c.issues[0]!.where[0]!.districtId;
    }, /issue.tram-fares" in irongate needs one of its districts/);
    fails((c) => {
      c.issues[0]!.where[0]!.feeds[0]!.locationIds = ['irongate.foundry-row'];
    }, /"irongate.foundry-row" is not in irongate.station-market/);
    fails((c) => {
      // Slice 5 gave Coalport two more (the customs strike, the ferry fares).
      c.issues = c.issues.filter(
        (i) => !['issue.mill-strike', 'issue.harbour-rates', 'issue.customs-strike', 'issue.ferry-fares'].includes(i.id),
      );
    }, /cities.coalport has 3 eligible Issues/);
    fails((c) => {
      c.issues[0]!.effects = [{ kind: 'ticketPct', value: -60 }];
    }, /ticketPct -60 is outside its bound/);
  });

  it('orders: a capital slot short, {issue} on an untagged order, a slot C order for home only', () => {
    fails((c) => {
      c.orderTemplates.find((t) => t.id === 'dir.c.capital-district')!.residence = 'home';
    }, /factions.collective has 1 capital orders in slot A, not 2/);
    fails((c) => {
      c.orderTemplates.find((t) => t.id === 'dir.c.capital-canvass')!.line = 'Talk about {issue}.';
    }, /\{issue\} only on an issue-tagged order/);
    fails((c) => {
      c.orderTemplates.find((t) => t.id === 'dir.sharpen-up')!.residence = 'home';
    }, /a slot C rotation order serves every residence/);
  });

  it('candidates: three in a district for one faction, one without a district, a shared name', () => {
    fails((c) => {
      c.candidates.find((x) => x.id === 'npc.v.ig.moser')!.districtId = 'irongate.eastside';
    }, /irongate.eastside has 3 vanguard NPC candidates, not 2/);
    fails((c) => {
      delete c.candidates.find((x) => x.id === 'npc.v.ig.moser')!.districtId;
    }, /candidate "npc.v.ig.moser" needs a districtId of irongate/);
    fails((c) => {
      c.candidates.find((x) => x.id === 'npc.v.ig.moser')!.name = 'Anna Weiss';
    }, /shares the name "Anna Weiss"/);
  });

  it('papers and rules: the Herald without a template, a home paper without train-open, no Tram Subsidy', () => {
    fails((c) => {
      c.headlines = c.headlines.filter((h) => h.id !== 'hl.ig.district-line');
    }, /cities.irongate: the paper has no "district-line" headline/);
    fails((c) => {
      c.headlines = c.headlines.filter((h) => h.id !== 'hl.v.train-open');
    }, /cities.duskwall: the paper has no "train-open" headline/);
    fails((c) => {
      c.ordinances = c.ordinances.filter((o) => o.id !== 'ord.tram-subsidy');
    }, /"ord.tram-subsidy" is missing/);
  });
});
