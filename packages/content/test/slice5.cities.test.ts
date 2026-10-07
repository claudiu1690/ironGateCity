/**
 * Slice 5, T7 and the missions of T8 (docs/tech/slice-5.md §4.2, §4.4, §15): the second quarters,
 * the fifteen places, the 35 actions and the 22 missions, word for word against
 * docs/design/slice-5-risk.md (§2.2, §2.3, §3, §3.1, §5, §23.4) and city-quarters.md §2; the pins
 * against the survey; the outlines, labels, services and run-in pools; the accessors.
 */
import { MISSION_TYPES, missionDifficulty } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import QUARTERS_DOC from '../../../docs/design/city-quarters.md?raw';
import DESIGN from '../../../docs/design/slice-5-risk.md?raw';
import { LABEL_MIN_DISTANCE, inPolygon, isCheckedAction, isTrainingAction, loadContent, outlinesOverlap } from '../src';
import type { City, Mission } from '../src';
import { mapPins } from '../src/data/mapPins';

const content = loadContent();
const HOME = ['coalport', 'duskwall', 'ashford'] as const;
const city = (id: string): City => content.city(id)!;

function section(start: string, end: string): string {
  const from = DESIGN.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = DESIGN.indexOf(end, from + 1);
  return DESIGN.slice(from, to < 0 ? undefined : to);
}
const cells = (line: string) =>
  line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
const STATS: Record<string, string[]> = {
  STR: ['str'],
  INT: ['int'],
  AGI: ['agi'],
  'CHA+INT': ['cha', 'int'],
  'CHA+STR': ['cha', 'str'],
  best: ['best'],
};

describe('the quarters (design §2.1–§2.2, §23.4, ADR 0035)', () => {
  it('three quarters per home city: open, Level 6, a later edition (review 4, ADR 0076: no shapes)', () => {
    for (const c of HOME) {
      expect(city(c).quarters.map((q) => q.opens ?? { level: 1 })).toEqual([
        { level: 1 },
        { level: 6 },
        { edition: 'later' },
      ]);
      for (const q of city(c).quarters) {
        expect([q.frame, q.outline, q.label, q.district], q.id).toEqual([undefined, undefined, undefined, undefined]);
        expect('teaser' in q, q.id).toBe(false);
      }
    }
  });

  it('the blurbs (§23.4, city-quarters.md §2)', () => {
    const blurbs = section('### 23.4', '### 23.5');
    for (const id of ['duskwall.pass', 'duskwall.town', 'ashford.wharf', 'ashford.station-road']) {
      const q = content.quartersOf(id.split('.')[0]!).find((x) => x.id === id)!;
      expect(blurbs, id).toContain(`| ${q.blurb} |`);
    }
    for (const id of ['coalport.mill', 'coalport.harbour', 'coalport.sidings'])
      expect(QUARTERS_DOC, id).toContain(content.quartersOf('coalport').find((x) => x.id === id)!.blurb!.replace(/\.$/, ''));
    for (const c of content.cities) for (const q of c.quarters) if (q.blurb) expect(q.blurb.length, q.id).toBeLessThanOrEqual(200);
  });

  it('the later places (review 4, ADR 0076): every survey pin with no place, in its painted quarter', () => {
    const later = (c: string) => content.laterPins(c).map((p) => [p.id, p.quarterId]);
    expect(later('coalport')).toEqual([
      ['coalport.station', 'coalport.sidings'],
      ['coalport.coal-yards', 'coalport.sidings'],
      ['coalport.tram-depot', 'coalport.sidings'],
      ['coalport.st-barbaras', 'coalport.sidings'],
    ]);
    expect(later('duskwall').map(([id]) => id)).toEqual([
      'duskwall.station',
      'duskwall.town-square',
      'duskwall.signal-lamp',
      'duskwall.brewery',
    ]);
    // Ashford's Station Road less its Town Hall, which is a place (open at Level 1).
    expect(later('ashford').map(([id]) => id)).toEqual([
      'ashford.station',
      'ashford.corn-exchange',
      'ashford.theatre',
      'ashford.park',
      'ashford.press-club',
    ]);
    expect(content.laterPins('irongate')).toEqual([]);
    for (const c of HOME)
      for (const p of content.laterPins(c)) {
        const pin = mapPins[c]!.pins.find((x) => x.id === p.id)!;
        expect(p.map, p.id).toEqual({ x: pin.x, y: pin.y });
      }
  });

  it("the capital's districts tile the picture: pins, anchors and labels strictly inside; labels 0.25 apart", () => {
    const qs = city('irongate').quarters;
    for (const l of city('irongate').locations)
      expect(inPolygon(l.map, qs.find((q) => q.id === l.quarterId)!.outline!, true), l.id).toBe(true);
    for (let a = 0; a < qs.length; a++)
      for (let b = a + 1; b < qs.length; b++) {
        expect(outlinesOverlap(qs[a]!.outline!, qs[b]!.outline!), `${qs[a]!.id}/${qs[b]!.id}`).toBe(false);
        const [la, lb] = [qs[a]!.label!, qs[b]!.label!];
        expect(Math.hypot(la.x - lb.x, la.y - lb.y), `${qs[a]!.id}/${qs[b]!.id}`).toBeGreaterThanOrEqual(LABEL_MIN_DISTANCE);
      }
    for (const q of qs) expect(inPolygon(q.label!, q.outline!, true), q.id).toBe(true);
  });

  it("the capital's districts keep their outlines, now on the quarter, labelled at their anchors", () => {
    for (const q of content.districtsOf('irongate')) {
      expect(q.outline!.length, q.id).toBeGreaterThanOrEqual(6);
      expect(q.label).toEqual(q.district!.anchor);
      expect('outline' in q.district!).toBe(false);
    }
  });
});

describe('the fifteen places (design §2.3)', () => {
  const rows = section('### 2.3 The fifteen places', '**Count:**')
    .split('\n')
    .filter((l) => /^\| \d+ \| `/.test(l))
    .map(cells);
  const refs = [...(/\*\*Ref forms\*\* \(for sentences\): (.+)/.exec(DESIGN)![1]!.matchAll(/\*([^*]+)\*/g))].map((m) => m[1]);

  it('name, kind, pin (the survey), blurb and ref, word for word, pins 7–11', () => {
    expect(rows).toHaveLength(15);
    rows.forEach(([n, id, name, kind, xy, blurb], i) => {
      const pid = id!.replace(/`/g, '');
      const hit = content.location(pid)!;
      expect(hit, pid).toBeDefined();
      const l = hit.location;
      expect(hit.city.locations.indexOf(l) + 1, pid).toBe(Number(n));
      expect([l.name, l.kind, l.blurb, l.ref]).toEqual([name, kind!.replace(/`/g, ''), blurb, refs[i]]);
      const [x, y] = xy!.split(',').map(Number);
      expect(l.map, pid).toEqual({ x, y });
      expect(mapPins[hit.city.id]!.pins.find((p) => p.id === pid), pid).toMatchObject({ x, y, quarter: 2 });
      expect(l.quarterId, pid).toBe(hit.city.quarters[1]!.id);
    });
  });

  it('the services: the police station and the infirmary of each city; the run-in pools', () => {
    const s = (c: string) => {
      const x = content.servicesOf(c)!;
      return [x.cells.location.id, x.infirmary.location.id];
    };
    expect(s('coalport')).toEqual(['coalport.harbour-police', 'coalport.infirmary']);
    expect(s('duskwall')).toEqual(['duskwall.lock-up', 'duskwall.infirmary']);
    expect(s('ashford')).toEqual(['ashford.police', 'ashford.infirmary']);
    expect(s('irongate')).toEqual(['irongate.police-hq', 'irongate.st-agnes']);
    expect(content.runInPoolOf('duskwall')).toEqual(['street-enforcer', 'vanguard-doorman']);
    expect(content.runInPoolOf('coalport')).toEqual(['strike-picket', 'branch-inspector']);
    expect(content.runInPoolOf('ashford')).toEqual(['party-thug']);
    expect(content.runInPoolOf('irongate')).toEqual([]);
    expect(content.quarterOf('coalport.far-bank')?.id).toBe('coalport.harbour');
    expect(content.quarterOf('ashford.wharf')?.id).toBe('ashford.wharf');
  });
});

describe('the 35 actions (design §3, §3.1)', () => {
  const rows = section('## 3. Tier-1 actions', '**Count:**')
    .split('\n')
    .filter((l) => /^\| `[a-z]/.test(l))
    .map(cells);
  const texts = section('### 3.1 Outcome texts', '## 4. Missions');

  it('ids, titles, types, stats and Energy; the count by type', () => {
    expect(rows).toHaveLength(35);
    for (const [id, title, type, stat, energy] of rows) {
      const a = content.action(id!.replace(/`/g, ''))!.action;
      expect(a.name).toBe(title);
      const tm = /training \((\w+)\) · verb \*(\w+)\*/.exec(type!);
      if (tm) {
        if (!isTrainingAction(a)) throw new Error(`${a.id} is not training`);
        expect([a.trains, a.verb]).toEqual([tm[1]!.toLowerCase(), tm[2]]);
      } else {
        if (!isCheckedAction(a)) throw new Error(`${a.id} is checked`);
        expect([a.type, a.stats, a.energy]).toEqual([type, STATS[stat!], Number(energy)]);
        expect(a.givesFxp).toBe(a.type !== 'intelligence');
      }
    }
    const types = rows.map((r) => (r[2]!.startsWith('training') ? 'training' : r[2]));
    const count = (t: string) => types.filter((x) => x === t).length;
    // The table's rows: speech 4 and propaganda 5 (the design's count line says 5 and 6, which sums to 37).
    expect([count('canvass'), count('speech'), count('propaganda'), count('intelligence'), count('training')]).toEqual([15, 4, 5, 7, 4]);
  });

  it('every text word for word', () => {
    for (const [id] of rows) {
      const a = content.action(id!.replace(/`/g, ''))!.action;
      const t = a.text as Record<string, { headline: string; body: string }>;
      if (isTrainingAction(a)) expect(texts, a.id).toContain(`- Trained — *${t.success!.headline}* — ${t.success!.body}`);
      else {
        expect(texts, a.id).toContain(`- Success — *${t.success!.headline}* — ${t.success!.body}`);
        expect(texts, a.id).toContain(`- Partial — *${t.partial!.headline}* — ${t.partial!.body}`);
      }
    }
  });

  it('every jail and hospital has exactly two tickets', () => {
    for (const c of content.cities)
      for (const l of c.locations) if (l.kind === 'jail' || l.kind === 'hospital') expect(l.actions, l.id).toHaveLength(2);
  });
});

describe('the 22 missions (design §5, ADR 0031)', () => {
  const catalogue = section('## 5. The mission catalogue', '## 6. Heat');
  const all: Array<{ mission: Mission; cityId: string; locationId: string }> = content.cities.flatMap((c) =>
    c.locations.flatMap((l) => (l.missions ?? []).map((mission) => ({ mission, cityId: c.id, locationId: l.id }))),
  );

  it('22 at 19 places (three HQs have two): speech 4, surveillance 4, vandalism 4, disruption 4, sabotage 3, theft 3', () => {
    expect(all).toHaveLength(22);
    expect(new Set(all.map((m) => m.locationId)).size).toBe(19);
    const by = (t: string) => all.filter((m) => m.mission.type === t).length;
    expect(['speech', 'surveillance', 'vandalism', 'disruption', 'sabotage', 'theft'].map(by)).toEqual([4, 4, 4, 4, 3, 3]);
    expect(['coalport', 'duskwall', 'ashford', 'irongate'].map((c) => all.filter((m) => m.cityId === c).length)).toEqual([6, 6, 6, 4]);
  });

  it('the header line: type, Energy, Level, difficulty (Irongate 20), Rank, target, pool', () => {
    for (const { mission: m, cityId } of all) {
      const re = new RegExp(`\\*\\*${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\* \\(\`${m.id}\`\\) · (.+)`);
      const head = re.exec(catalogue)?.[1];
      expect(head, m.id).toBeDefined();
      expect(head).toContain(`${m.type} · ${m.energy} E · Level ${m.level} · difficulty ${m.difficulty}`);
      expect(m.energy).toBe(MISSION_TYPES[m.type].energy);
      expect(m.difficulty).toBe(missionDifficulty(m.level, content.city(cityId)!.role));
      expect(head!.includes('Rank 3')).toBe(m.requires?.rank === 3);
      expect(head!.includes(m.target ? `target \`${m.target}\`` : 'everyone')).toBe(true);
      expect(head).toContain(`pool ${m.pool.map((p) => `\`${p}\``).join(', ')}`);
    }
    expect(all.filter((m) => m.cityId === 'irongate').map((m) => m.mission.difficulty)).toEqual([20, 20, 20, 20]);
  });

  it('the briefing, the ways (title, stat, hint, a loud way\'s run-in) and the three texts word for word', () => {
    for (const { mission: m } of all) {
      const from = catalogue.indexOf(`(\`${m.id}\`)`);
      const block = catalogue.slice(from, catalogue.indexOf('\n**', from + 1));
      expect(block, m.id).toContain(`\n*${m.briefing}*\n`);
      for (const w of m.ways) {
        const row = block.split('\n').find((l) => l.startsWith(`| ${w.title} |`));
        expect(row, `${m.id} ${w.title}`).toBeDefined();
        const [, stat, hint, risk] = cells(row!);
        expect(w.stats).toEqual(STATS[stat!]);
        expect(w.hint).toBe(hint);
        const loud = risk ? /run-in \*\*(\d+) %\*\*/.exec(risk) : null;
        expect(w.runIn, `${m.id} ${w.id}`).toBe(loud ? Number(loud[1]) : undefined);
      }
      expect(block.split('\n').filter((l) => /^\| (?!Way|---)/.test(l))).toHaveLength(m.ways.length);
      for (const o of ['success', 'partial', 'failure'] as const) {
        const t = m.text[o];
        expect(block, `${m.id} ${o}`).toContain(`- ${o[0]!.toUpperCase()}${o.slice(1)} — *${t.headline}* — ${t.body}`);
      }
    }
  });

  it('the accessors: mission, missionsAt, the mission cards', () => {
    expect(content.mission('coalport.union-hall.spike')).toMatchObject({ city: { id: 'coalport' }, location: { id: 'coalport.union-hall' } });
    expect(content.missionsAt('coalport.union-hall').map((m) => m.id)).toEqual(['coalport.union-hall.spike', 'coalport.union-hall.roll']);
    expect(content.missionsAt('coalport.mill-gate')).toEqual([]);
    expect(content.missionCard('disruption')).toBe('scene.news-strike');
    expect(content.missionCard('speech')).toBe('scene.mission-speech');
  });

  it('no knife, torch, sergeant or "in front of" in any mission or place text', () => {
    const text = JSON.stringify([all, HOME.map((c) => city(c).locations)]);
    expect(text).not.toMatch(/\bknife\b|\btorch\b|sergeant|in front of/i);
  });
});
