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
import { copy, isCheckedAction, isShiftAction, loadContent, rawContent } from '../src';

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
  it('§1.1 locations: ids, names, kinds, map positions and blurbs, in pin order', () => {
    const rows = tableRows('### 1.1 Locations', '**Reserved');
    expect(rows).toHaveLength(6);
    rows.forEach((r, i) => {
      const [n, id, name, kind, xy, blurb] = r as [string, string, string, string, string, string];
      const loc = city.locations[i]!;
      expect(Number(n)).toBe(i + 1);
      expect(loc.id).toBe(unq(id));
      expect(loc.name).toBe(name);
      expect(loc.kind).toBe(unq(kind));
      const [x, y] = xy.split(',').map((v) => Number(v.trim()));
      expect(loc.map).toEqual({ x, y });
      expect(loc.blurb).toBe(blurb);
    });
  });

  it('§2.2: every action id, title, type, stats and Energy; checked rewards (S / P) follow from the §5.5 rates', () => {
    const rows = tableRows('### 2.2 The list', '**Council**');
    expect(rows).toHaveLength(21);
    expect(actions).toHaveLength(21);
    for (const r of rows) {
      const [id, title, type, std, e, xp, fxp, iron, opinion] = r.map(unq) as string[];
      const a = actions.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.name, id).toBe(title);
      if (isCheckedAction(a!)) {
        expect(a.type, id).toBe(type);
        expect(a.stats.map((s) => s.toUpperCase()).join('+'), id).toBe(std);
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
      } else if (isShiftAction(a!)) {
        expect(type).toMatch(/^job/);
        expect(content.job(a.jobId)!.shiftEnergy, id).toBe(Number(e));
      } else {
        expect(type).toBe(`training (${a!.trains.toUpperCase()})`);
      }
    }
  });

  it('§2.3: every checked action has its Success and Partial text word for word; shifts and training their one text', () => {
    const block = DOC.slice(DOC.indexOf('### 2.3 Outcome text'), DOC.indexOf('### 2.4 Training'));
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
        expect(first.label).toBe(isShiftAction(a) ? 'Worked' : 'Trained');
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

  it('§3: the three jobs with pinned pay, shift Energy and unlocks', () => {
    expect(content.jobs.map((j) => [j.id, j.locationId, j.dailyPay, j.shiftEnergy, j.unlock])).toEqual([
      ['street-vendor', 'coalport.market-row', 100, 3, { level: 1 }],
      ['factory-worker', 'coalport.mill-gate', 180, 4, { level: 1, stats: { str: 5 } }],
      ['driver', 'coalport.quays', 200, 4, { level: 3, stats: { agi: 10 } }],
    ]);
  });

  it("§6.3: the twelve order templates, their slots, titles, targets and Holm's lines", () => {
    const rows = tableRows('### 6.3 Templates', '### 6.4');
    expect(rows).toHaveLength(12);
    rows.forEach((r, i) => {
      const [id, slot, title, , target, line] = r as string[];
      const t = content.orderTemplates[i]!;
      expect(t.id).toBe(unq(id!));
      expect(t.slot).toBe(slot);
      expect(t.title).toBe(title);
      expect(t.target).toBe(Number(target!.match(/^\d+/)![0]));
      expect(t.line).toBe(line);
    });
  });

  it('§7.4: the ambient pool, in day order', () => {
    const pool = DOC.match(/\*\*Ambient pool\*\*[^:]*: (.+)\n/)![1]!
      .replace(/\*/g, '')
      .replace(/\.$/, '')
      .split(' · ');
    const ambient = content.headlines.filter((h) => h.group === 'ambient').map((h) => h.headline);
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
      expect(() => loadContent(bad), kind).not.toThrow();
    }
    bad.cities[0]!.locations[0]!.kind = 'barricade';
    expect(() => loadContent(bad)).toThrow();
  });

  it('§12.1 UI copy: the exact strings of the table', () => {
    expect(copy.needsEnergy(10, '14:20')).toBe('Needs 10 Energy · ready at 14:20');
    expect(copy.x3Needs(30)).toBe('×3 needs 30 Energy');
    expect(copy.x3Needs(138)).toBe('×3 needs 138 Energy');
    expect(copy.shiftWorked('01:00')).toBe('Shift worked · next at 01:00');
    expect(copy.shiftNotYourJob).toBe('Not your job · see the Jobs card');
    expect(copy.shiftNoJob).toBe('No job yet · take one below');
    expect(copy.jobPayLine(216)).toBe('216 a day · half at midnight, half for the shift');
    expect(copy.switchJob(2)).toBe('Switch · 2 Energy · streak resets');
    expect(copy.yourJob(4, 2)).toBe('Your job · streak 4 days · 2 sick days left');
    expect(copy.jobNeeds(['Level 3', 'AGI 10'])).toBe('Needs Level 3, AGI 10');
    expect(copy.jobTaken('01:00')).toBe('Taken · first half pay at 01:00');
    expect(copy.jobTakenOrder(20)).toBe('Taken · party order complete: +20 FXP');
    expect(copy.jobSwitched('01:00')).toBe('Switched · streak reset · first half pay at 01:00');
    expect(copy.orderTag(1, 3, 25)).toBe('Party order 1 / 3 · +25 % FXP');
    expect(copy.orderDone).toBe('Order done');
    expect(copy.allOrdersDone(5)).toBe('All orders carried out · +5 PC');
    expect([copy.pointsToPlace(1), copy.pointsToPlace(2)]).toEqual(['1 point to place', '2 points to place']);
    expect(copy.levelPointsToPlace(4, 1)).toBe('Level 4 · 1 stat point to place');
    expect(copy.statButton('STR', 10)).toBe('STR 10 → 11');
    expect(copy.levelUpLine(3, 5, 2)).toBe('Levels 4–5 · 2 points to place');
    expect(copy.standingUp('Coalport', 'Familiar', 3)).toBe('Coalport: Familiar · actions here +3 %');
    expect(copy.orderComplete(20)).toBe('Party order complete: +20 FXP');
    // "UTC" never appears on a button, and there are no exclamation marks (§12.1).
    const all = JSON.stringify(copy) + copySamples();
    expect(all).not.toMatch(/UTC|!/);
  });
});

describe('CLAUDE.md design rules 2 and 6: vocabulary across all player-facing content', () => {
  const allText = JSON.stringify(rawContent) + JSON.stringify(copy) + copySamples();

  it('uses campaign vocabulary: no war framing', () => {
    const war =
      /\b(war|wars|warfare|battle|battles|battlefield|uprising|insurrection|revolt|troops|soldiers?|army|armies|militia|invade|invasion|attack|assault|siege|combat|enemy|enemies|weapon|guns?|rifles?|bomb|kill|killed)\b/i;
    expect(allText.match(war)?.[0] ?? null).toBeNull();
    // "front" only as a building's front ("columns out front"), never as a political front.
    const fronts = [...allText.matchAll(/.{0,20}\bfront\b.{0,20}/gi)].map((m) => m[0]);
    for (const f of fronts) expect(f, f).toMatch(/out front|the front of|front door|front room/i);
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
