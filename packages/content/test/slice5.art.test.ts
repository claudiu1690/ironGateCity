import { describe, expect, it } from 'vitest';
import BUILD from '../../../apps/client/public/art/.build.json?raw';
import RISK from '../../../docs/design/slice-5-risk.md?raw';
import { Asset, SceneBinding, loadContent } from '../src';
import { assets, scenes } from '../src/data/art';

/**
 * Slice 5's art (docs/tech/slice-5.md §13; docs/design/slice-5-risk.md §21, §23.5): eight scenes
 * (the five mission cards, the strike card, the infirmary, the cells) and eight portraits, their
 * sizes, widths and crops, the thirteen alt texts read from the design's table, the `hospital` and
 * `jail` bindings, and every file in the build's manifest (`pnpm art:check` checks the files).
 */
const byId = new Map(assets.map((a) => [a.id, a]));
const get = (id: string) => {
  const a = byId.get(id);
  expect(a, id).toBeDefined();
  return a!;
};

const MISSION_SCENES = ['speech', 'watch', 'posters', 'sabotage', 'theft'].map((k) => `scene.mission-${k}`);
const SCENES = [...MISSION_SCENES, 'scene.news-strike', 'scene.hospital', 'scene.jail-cell'];
/** id → [source file in mvp/portraits/, the crop's top]. */
const PORTRAITS: Record<string, [string, number]> = {
  'portrait.street-enforcer': ['street-enforcer', 40],
  'portrait.vanguard-doorman': ['vanguard-doorman', 40],
  'portrait.strike-picket': ['strike-picket', 40],
  'portrait.branch-inspector': ['branch-inspector', 20],
  'portrait.party-thug': ['party-thug', 40],
  // §23.1 #22: the id and every text say duty officer; the file keeps its name.
  'portrait.duty-officer': ['sergeant', 20],
  'portrait.kessler': ['kessler', 20],
  'portrait.matron': ['nurse', 40],
};
/** The three alt texts §23.5 does not give (the developer's drafts, for the designer). */
const DRAFTED = ['scene.news-strike', 'scene.hospital', 'scene.jail-cell'];

/** §23.5's table as [asset id, alt text]; the id is the cell's first `code` span. */
function altTable(): [string, string][] {
  const from = RISK.indexOf('### 23.5');
  expect(from).toBeGreaterThan(-1);
  return RISK.slice(from, RISK.indexOf('### 23.6', from))
    .split('\n')
    .filter((l) => /^\| `(scene|portrait)\.[a-z-]+`/.test(l))
    .map((l) => {
      const [id, alt] = l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      return [/`([a-z]+\.[a-z-]+)`/.exec(id!)![1]!, alt!];
    });
}

describe('slice 5 art (tech design §13)', () => {
  it('§23.5: the thirteen alt texts, word for word', () => {
    const table = altTable();
    expect(table.map(([id]) => id).sort()).toEqual(
      [...MISSION_SCENES, ...Object.keys(PORTRAITS)].sort(),
    );
    for (const [id, alt] of table) {
      expect(get(id).alt, id).toBe(alt);
      expect(alt.length, id).toBeLessThanOrEqual(160);
    }
  });

  it('the three drafted alt texts are plain and within 160 characters', () => {
    for (const id of DRAFTED) {
      const { alt } = get(id);
      expect(alt.length, id).toBeLessThanOrEqual(160);
      expect(alt, id).not.toMatch(/\b(jail|hospital|wards?|uniforms?)\b/i);
    }
  });

  it('eight scenes: 2688 × 1520 like the others, 640 and 1280, the WebP at 640 only', () => {
    for (const id of SCENES) {
      const a = get(id);
      expect(Asset.parse(a)).toEqual(a);
      expect(a.kind, id).toBe('scene');
      expect(a.source, id).toBe(`mvp/scenes/${id.slice('scene.'.length)}.png`);
      expect(a.widths, id).toEqual([640, 1280]);
      expect(a.webpWidths, id).toEqual([640]);
      if (id === 'scene.news-strike') {
        // The 3:2 news print (2048 × 1360), cropped to the scenes' ratio.
        expect(a.crop).toEqual({ left: 0, top: 40, width: 2048, height: 1158 });
        expect([a.width, a.height]).toEqual([2048, 1158]);
        expect(Math.abs(a.width / a.height - 2688 / 1520)).toBeLessThan(0.005);
      } else {
        expect(a.crop, id).toBeUndefined();
        expect([a.width, a.height], id).toEqual([2688, 1520]);
      }
    }
  });

  it('eight portraits: the faces’ 4:5 crop of an 880 × 1168 source, 256 and 512', () => {
    for (const [id, [file, top]] of Object.entries(PORTRAITS)) {
      const a = get(id);
      expect(Asset.parse(a)).toEqual(a);
      expect(a.kind, id).toBe('portrait');
      expect(a.source, id).toBe(`mvp/portraits/${file}.png`);
      expect(a.crop, id).toEqual({ left: 60, top, width: 760, height: 950 });
      expect([a.width, a.height], id).toEqual([760, 950]);
      expect(a.widths, id).toEqual([256, 512]);
      expect(a.webpWidths, id).toBeUndefined();
    }
  });

  it('the infirmary and the cells show their scenes (hospital, jail)', () => {
    for (const [kind, assetId] of [
      ['hospital', 'scene.hospital'],
      ['jail', 'scene.jail-cell'],
    ] as const) {
      const bound = scenes.filter((s) => s.locationKind === kind);
      expect(bound, kind).toEqual([{ locationKind: kind, assetId }]);
      expect(SceneBinding.parse(bound[0])).toEqual(bound[0]);
    }
    // The loader's cross-checks accept them (a binding names a scene).
    const content = loadContent();
    expect(content.asset('scene.hospital').kind).toBe('scene');
    expect(content.asset('scene.jail-cell').kind).toBe('scene');
  });

  it('no asset id or alt text says "sergeant" (§23.1 #22: the duty officer)', () => {
    for (const a of assets) {
      expect(a.id, a.id).not.toMatch(/sergeant/i);
      expect(a.alt, a.id).not.toMatch(/sergeant/i);
    }
  });

  it('every file of the sixteen is built (the manifest; art:check reads the files)', () => {
    const manifest = JSON.parse(BUILD) as Record<string, { bytes: number }>;
    for (const id of [...SCENES, ...Object.keys(PORTRAITS)]) {
      const a = get(id);
      const names = [
        ...a.widths.map((w) => `${id}-${w}.avif`),
        ...(a.webpWidths ?? a.widths).map((w) => `${id}-${w}.webp`),
      ];
      for (const name of names) expect(manifest[name]?.bytes, name).toBeGreaterThan(0);
    }
  });
});
