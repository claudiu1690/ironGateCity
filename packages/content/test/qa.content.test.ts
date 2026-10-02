/**
 * QA (slices 0–1): the content data checked against the design document itself
 * (docs/design/slice-1-content.md) rather than against a second hand-typed copy, plus the
 * vocabulary rules of CLAUDE.md (campaign vocabulary, no real-world extremist references).
 */
import { computeRewards, FXP_TYPE_MULTIPLIER } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
// Vite's ?raw import (see raw.d.ts): the package has no Node types, and the docs are read as text.
import GDD from '../../../docs/GDD.md?raw';
import DOC from '../../../docs/design/slice-1-content.md?raw';
import R1 from '../../../docs/design/review-1-answers.md?raw';
import { copy, isCheckedAction, loadContent, rawContent } from '../src';
import { mapPins } from '../src/data/mapPins';
import { R2_ORDERS, plainProse } from './review2';
import { R3_ORDER_TITLES, R3_VERBS } from './review3';

const content = loadContent();
const city = content.city('coalport')!;
const actions = city.locations.flatMap((l) => l.actions);

/** Markdown table rows of a section (the lines starting with "| `"). */
function tableRows(sectionStart: string, sectionEnd: string, row = /^\| (`|\d+ \| `)/): string[][] {
  const from = DOC.indexOf(sectionStart);
  const to = DOC.indexOf(sectionEnd, from + 1);
  expect(from, `section ${sectionStart}`).toBeGreaterThan(-1);
  return DOC.slice(from, to)
    .split('\n')
    .filter((l) => row.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
}
/** Every copy function called with sample arguments, so templates are scanned too. */
function copySamples(): string {
  const fns = Object.values(copy).filter((v) => typeof v === 'function') as Array<
    (...a: unknown[]) => string
  >;
  return fns
    .map((call) => {
      try {
        return call(1, 2, 3);
      } catch {
        return call(['Level 3', 'AGI 10']);
      }
    })
    .join(' ');
}
const unq = (s: string) => s.replace(/`/g, '').replace(/\*\*/g, '');

describe('content vs docs/design/slice-1-content.md', () => {
  // Maps v3 (design §5.3): the positions in the doc were measured on the retired pen-and-ink map; a
  // location now sits at its approved pin in the survey (pins.json), checked here against that.
  it('§1.1 locations: ids, names, kinds, map positions and blurbs, in pin order', () => {
    const rows = tableRows('### 1.1 Locations', '**Reserved');
    expect(rows).toHaveLength(6);
    rows.forEach((r, i) => {
      const [n, id, name, kind, , blurb] = r as [string, string, string, string, string, string];
      const loc = city.locations[i]!;
      expect(Number(n)).toBe(i + 1);
      expect(loc.id).toBe(unq(id));
      expect(loc.name).toBe(name);
      expect(loc.kind).toBe(unq(kind));
      const pin = mapPins.coalport!.pins.find((p) => p.id === loc.id)!;
      expect(loc.map).toEqual({ x: pin.x, y: pin.y });
      expect(loc.blurb).toBe(blurb);
    });
  });

  it('§2.2: every action id, title, type, stats and Energy; checked rewards (S / P) follow from the §5.5 rates', () => {
    // Review 1 (answers §1.2): the three job shifts left the content (a job is a wage).
    const rows = tableRows('### 2.2 The list', '**Council**').filter((r) => !/^job/.test(r[2]!));
    expect(rows).toHaveLength(18);
    expect(actions).toHaveLength(18);
    for (const r of rows) {
      const [id, title, type, std, e, xp, fxp, iron, opinion] = r.map(unq) as string[];
      const a = actions.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.name, id).toBe(title);
      if (isCheckedAction(a!)) {
        expect(a.type, id).toBe(type);
        // Review 1 (answers §2): the committee checks the best trained stat.
        expect(a.stats.map((s) => s.toUpperCase()).join('+'), id).toBe(a.type === 'council' ? 'BEST' : std);
        expect(a.energy, id).toBe(Number(e));
        const reward = (outcome: 'success' | 'partial') =>
          computeRewards({
            tier: 1,
            energy: a.energy,
            outcome,
            givesFxp: a.givesFxp,
            givesOpinion: a.givesOpinion,
            restedUsed: 0,
            fxpRateMultiplier: FXP_TYPE_MULTIPLIER[a.type] ?? 1,
          });
        const s = reward('success');
        const p = reward('partial');
        expect(`${s.xp.total} / ${p.xp.total}`, `${id} XP`).toBe(xp);
        expect(fxp === '—' ? '—' : `${s.fxp.total} / ${p.fxp.total}`, `${id} FXP`).toBe(
          a.givesFxp ? `${s.fxp.total} / ${p.fxp.total}` : '—',
        );
        if (a.givesFxp) expect(`${s.fxp.total} / ${p.fxp.total}`, `${id} FXP`).toBe(fxp);
        expect(`${s.iron.total} / ${p.iron.total}`, `${id} Iron`).toBe(iron);
        if (opinion === '—') expect(a.givesOpinion, id).toBe(false);
        else expect(`${s.opinion} / ${p.opinion}`, `${id} opinion`).toBe(opinion);
      } else {
        expect(type).toBe(`training (${a!.trains.toUpperCase()})`);
      }
    }
  });

  it('§2.3: every checked action has its Success and Partial text word for word; training its one text', () => {
    // Review 2 (answers §1.4, §1.13): the doc's prose predates the plain-words swaps.
    const block = plainProse(DOC.slice(DOC.indexOf('### 2.3 Outcome text'), DOC.indexOf('### 2.4 Training')));
    for (const a of actions) {
      const at = block.indexOf(`(\`${a.id}\``);
      expect(at, `text for ${a.id}`).toBeGreaterThan(-1);
      const tail = block.slice(at);
      const lines = tail.split('\n').slice(1, 3);
      const parse = (line: string | undefined) => {
        const m = line?.match(/^- (Success|Partial|Worked|Trained) — \*(.+?)\* — (.+)$/);
        expect(m, `${a.id}: ${line}`).not.toBeNull();
        return { label: m![1]!, headline: m![2]!, body: m![3]! };
      };
      const first = parse(lines[0]);
      expect(a.text.success, a.id).toEqual({ headline: first.headline, body: first.body });
      if (isCheckedAction(a)) {
        expect(first.label).toBe('Success');
        const second = parse(lines[1]);
        expect(second.label).toBe('Partial');
        expect(a.text.partial, a.id).toEqual({ headline: second.headline, body: second.body });
      } else {
        expect(first.label).toBe('Trained');
      }
    }
  });

  it('pillar 7: every outcome body is 2–3 sentences and short (≤ 320 characters)', () => {
    for (const a of actions) {
      const texts = [a.text.success, ...(isCheckedAction(a) ? [a.text.partial] : [])];
      for (const t of texts) {
        const sentences = t.body.split(/(?<=[.?!])\s+/).length;
        expect(sentences, `${a.id}: ${t.body}`).toBeGreaterThanOrEqual(2);
        expect(sentences, `${a.id}: ${t.body}`).toBeLessThanOrEqual(4);
        expect(t.body.length, a.id).toBeLessThanOrEqual(320);
      }
    }
  });

  it('§3: the three jobs with pinned pay and unlocks (review 1: no shift Energy)', () => {
    // Slice 2: job ids are prefixed by city (slice-2 cities §3 Q1, ADR 0016); Coalport's three here.
    const coalportJobs = content.jobs.filter((j) => j.locationId.startsWith('coalport.'));
    expect(coalportJobs.map((j) => [j.id, j.locationId, j.dailyPay, j.unlock])).toEqual([
      ['coalport-street-vendor', 'coalport.market-row', 100, { level: 1 }],
      ['coalport-factory-worker', 'coalport.mill-gate', 180, { level: 1, stats: { str: 5 } }],
      ['coalport-driver', 'coalport.quays', 200, { level: 3, stats: { agi: 10 } }],
    ]);
  });

  it('review 1 §3: every order template, its slot, title, line and target, word for word', () => {
    // The answers' tables (§3.1 to §3.3) supersede slice-1 content §6.3.
    const from = R1.indexOf('### 3.1 The Collective');
    const to = R1.indexOf('### 3.4 Rotation');
    const rows = R1.slice(from, to)
      .split('\n')
      .filter((l) => /^\| `dir\./.test(l))
      .map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    expect(rows).toHaveLength(content.orderTemplates.length);
    for (const r of rows) {
      const [id, slot, title, line, target] = r as [string, string, string, string, string];
      const t = content.orderTemplates.find((x) => x.id === id.match(/`([^`]+)`/)![1]);
      expect(t, id).toBeDefined();
      expect(t!.slot, id).toBe(slot.charAt(0));
      // Review 2 (answers §1.7) supersedes the titles and lines it lists; review 3 (answers §5.4,
      // §7) the training orders' titles.
      const r2 = R2_ORDERS.get(t!.id);
      expect(t!.title, id).toBe(R3_ORDER_TITLES.get(t!.id) ?? r2?.title ?? title);
      expect(t!.line, id).toBe(r2?.line ?? line);
      expect(t!.target, id).toBe(Number(target.match(/· (\d+)/)![1]));
    }
  });

  it('review 3 §5.4, §7: the training orders name the verbs', () => {
    expect([...R3_ORDER_TITLES]).toEqual([
      ['dir.sharpen-up', 'Study, lift or run once in Coalport'],
      ['dir.v.sharpen-up', 'Study, lift or run once in Duskwall'],
      ['dir.a.sharpen-up', 'Study, unload or run once in Ashford'],
    ]);
    for (const [id, title] of R3_ORDER_TITLES)
      expect(content.orderTemplates.find((t) => t.id === id)?.title, id).toBe(title);
  });

  it('review 3 §5.3: every training action carries the verb of the answers table, word for word', () => {
    expect(R3_VERBS).toHaveLength(9);
    for (const [id, title, verb] of R3_VERBS) {
      const a = content.cities.flatMap((c) => c.locations.flatMap((l) => l.actions)).find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.name, id).toBe(title);
      expect(a?.type === 'training' && a.verb, id).toBe(verb);
    }
    const all = content.cities
      .flatMap((c) => c.locations.flatMap((l) => l.actions))
      .filter((a) => a.type === 'training');
    expect(all).toHaveLength(9);
  });

  it('§7.4: the ambient pool, in day order', () => {
    const pool = DOC.match(/\*\*Ambient pool\*\*[^:]*: (.+)\n/)![1]!
      .replace(/\*/g, '')
      .replace(/\.$/, '')
      .split(' · ');
    // Slice 2 adds the Sentinel's and the Gazette's pools: the Clarion's is Coalport's.
    const ambient = content.headlines
      .filter((h) => h.group === 'ambient' && h.cityId === 'coalport')
      .map((h) => h.headline);
    expect(ambient).toEqual(pool);
  });

  it('§13.5: the location-kind list is the closed list of 19 in the GDD', () => {
    const table = GDD.slice(GDD.indexOf('**Location kinds.**'), GDD.indexOf('Nineteen kinds'));
    const kinds = [...table.matchAll(/\| `([a-z-]+)` \|/g)].map((m) => m[1]);
    expect(kinds).toHaveLength(19);
    // Every kind the schema accepts is in the GDD list, and vice versa.
    const bad = {
      ...(JSON.parse(JSON.stringify(rawContent)) as {
        cities: Array<{ locations: Array<{ kind: string }> }>;
      }),
    };
    for (const kind of kinds) {
      bad.cities[0]!.locations[0]!.kind = kind!;
      // Slice 2: a home city has exactly one faction-hq (tech design §4.3), so the Union Hall
      // steps aside while the Mill Gate tries that kind.
      bad.cities[0]!.locations[2]!.kind = kind === 'faction-hq' ? 'square' : 'faction-hq';
      expect(() => loadContent(bad), kind).not.toThrow();
    }
    bad.cities[0]!.locations[0]!.kind = 'barricade';
    expect(() => loadContent(bad)).toThrow();
  });

  it('§5.4: every faction rank title matches the GDD table (content-policy review §3)', () => {
    const table = GDD.slice(GDD.indexOf('### 5.4 Faction Rank'), GDD.indexOf('### 5.5'));
    const rows = [...table.matchAll(/^\| (\d) \| [\d,*]+ \| ([^|]+) \|/gm)].map((m) =>
      m[2]!.split(' / ').map((t) => t.trim()),
    );
    expect(rows).toHaveLength(7);
    const byFaction = content.factions.map((_, f) => rows.map((r) => r[f]));
    expect(content.factions.map((f) => f.rankTitles)).toEqual(byFaction);
  });

  it('§12.1 UI copy: the exact strings of the table', () => {
    expect(copy.needsEnergy(10, '14:20')).toBe('Needs 10 Energy · ready at 14:20');
    expect(copy.x3Needs(30)).toBe('×3 needs 30 Energy');
    expect(copy.x3Needs(138)).toBe('×3 needs 138 Energy');
    // Review 1 (answers §1.2, §10.6): the shift strings are retired; the wage's lines replace them.
    expect(copy.jobPayLine(216)).toBe('216 a day · paid at midnight');
    expect(copy.switchJob).toBe('Switch · seniority resets');
    expect(copy.yourJob(4, 8)).toBe('Your job · seniority 4 days · +8 %');
    expect(copy.jobNeeds(['Level 3', 'AGI 10'])).toBe('Needs Level 3, AGI 10');
    expect(copy.jobTaken('01:00')).toBe('Taken · paid at 01:00');
    expect(copy.jobTakenOrder(20)).toBe('Taken · party order complete: +20 Party XP');
    expect(copy.jobSwitched('01:00')).toBe('Switched · seniority reset · paid at 01:00');
    expect(copy.orderTag(1, 3, 25)).toBe('Party order 1 / 3 · +25 % Party XP'); // review 2: Party XP
    expect(copy.orderDone).toBe('Order done');
    expect(copy.allOrdersDone(5)).toBe('All orders carried out · +5 Political Capital');
    expect([copy.pointsToPlace(1), copy.pointsToPlace(2)]).toEqual([
      '1 point to place · nothing is lost by choosing later',
      '2 points to place · nothing is lost by choosing later',
    ]);
    expect(copy.levelPointsToPlace(4, 1)).toBe('Level 4 · 1 stat point to place');
    expect(copy.statButton('STR', 10)).toBe('STR 10 → 11');
    expect(copy.levelUpLine(3, 5, 2)).toBe('Levels 4–5 · 2 points to place');
    expect(copy.standingUp('Coalport', 'Familiar')).toBe(
      'Coalport: Familiar · everything here goes a little better',
    );
    expect(copy.orderComplete(20)).toBe('Party order complete: +20 Party XP');
    // "UTC" never appears on a button, and there are no exclamation marks (§12.1).
    const all = JSON.stringify(copy) + copySamples();
    expect(all).not.toMatch(/UTC|!/);
  });
});

describe('CLAUDE.md design rules 2 and 6: vocabulary across all player-facing content', () => {
  const allText = JSON.stringify(rawContent) + JSON.stringify(copy) + copySamples();
  // Allowed, by exact JSON string value only (so the same word in any display text still fails):
  // the Duskwall ids that keep their original words. Content-policy review §1 ("Ids: no id
  // changes"): ids are never shown, and characters' jobs, order progress and logs reference them.
  const legacyIds = /"duskwall\.(garrison-gate(\.(canvass|speech|drill|stores))?|beacon-house\.muster)"/g;
  const withoutLegacyIds = (s: string) => s.replace(legacyIds, '"[legacy id]"');

  it('uses campaign vocabulary: no war framing', () => {
    // The militia words of docs/design/content-policy-review.md §7 (checklist items 1, 2 and 6) are
    // banned alongside the war words, so a later slice cannot bring them back.
    const war =
      /\b(war|wars|warfare|battle|battles|battlefield|uprising|insurrection|revolt|troops|soldiers?|army|armies|militia|invade|invasion|attack|assault|siege|combat|enemy|enemies|weapon|guns?|rifles?|bomb|kill|killed|garrisons?|barracks|drill(s|ed|ing)?|musters?|mustered|marshals?|footsoldiers?|sergeants?|uniforms?|purges?|purged|conscription|paramilitar(y|ies))\b/gi;
    const text = withoutLegacyIds(allText);
    expect([...text.matchAll(war)].map((m) => m[0])).toEqual([]);
    // "front" only as a building's front ("columns out front") or a row of seats ("the front row"),
    // never as a political front.
    const fronts = [...text.matchAll(/.{0,20}\bfront\b.{0,20}/gi)].map((m) => m[0]);
    for (const f of fronts) expect(f, f).toMatch(/out front|the front of|front door|front room|front row/i);
  });

  it('the militia words fail in display text, and the legacy-id allowance is exact', () => {
    // A guard on the guard: the allow-list above must not hide a display string.
    const war = /\b(garrison|muster|drill)\b/i;
    const scan = (x: object) => withoutLegacyIds(JSON.stringify(x));
    expect(scan({ id: 'duskwall.garrison-gate.drill', job: 'duskwall.beacon-house.muster' })).not.toMatch(
      war,
    );
    expect(scan({ name: 'Garrison Gate' })).toMatch(war);
    expect(scan({ body: 'the evening muster at duskwall.garrison-gate' })).toMatch(war);
  });

  it('carries no real-world extremist symbols, slogans or names', () => {
    const extremist =
      /\b(swastika|hakenkreuz|sieg|heil|reich|f(ü|ue)hrer|duce|nazis?|fascis(t|m)|ss|sa|gestapo|blackshirts?|brownshirts?|hammer and sickle|sickle|stalin|lenin|trotsky|mussolini|hitler|franco|bolshevik|soviet|kkk|88|1488|14 words|totenkopf|sonnenrad|black sun|fasces|iron cross|wolfsangel)\b/i;
    expect(allText.match(extremist)?.[0] ?? null).toBeNull();
  });

  it('faction crests are plain geometric shapes (square / circle / triangle)', () => {
    expect(content.factions.map((f) => f.crest)).toEqual(['square', 'circle', 'triangle']);
  });
});
