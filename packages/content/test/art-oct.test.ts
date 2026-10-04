import { describe, expect, it } from 'vitest';
import ART from '../../../docs/design/art-wiring-oct.md?raw';
import { LocationKind, loadContent } from '../src';

/**
 * The October art (docs/design/art-wiring-oct.md), wired in the slice-4 fix round: the fourteen scenes
 * (asset, binding, alt text, focus) and the twelve new faces (crop, alt text) read from the note's
 * tables, the sign-up order of all eighteen, and every location kind but two with a scene (slice 5
 * bound `hospital` and `jail`).
 */
const content = loadContent();
const unq = (s: string) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();

function section(start: string, end: string): string {
  const from = ART.indexOf(start);
  expect(from, start).toBeGreaterThan(-1);
  const to = ART.indexOf(end, from + 1);
  return ART.slice(from, to < 0 ? undefined : to);
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

describe('the October art (art-wiring-oct.md)', () => {
  it('§1: fourteen scenes, each an asset with the note’s alt text, bound to its kind (and faction)', () => {
    const r = rows(section('## 1. Scenes', '**Focus points**'), /^\| `[a-z-]+\.png` \|/);
    expect(r).toHaveLength(14);
    for (const [, id, binding, , alt] of r) {
      const assetId = unq(id!);
      const a = content.asset(assetId);
      expect(a.kind, assetId).toBe('scene');
      expect(a.alt, assetId).toBe(alt);
      expect(a.alt.length).toBeLessThanOrEqual(160);
      // "`faction-hq`, **`alliance`**" or "`theatre` (the kind slice 4 adds)".
      const [kind, faction] = [...binding!.matchAll(/`([a-z-]+)`/g)].map((m) => m[1]!);
      const bound = content.art.scenes.filter((s) => s.assetId === assetId);
      expect(bound, assetId).toEqual([
        { locationKind: kind, assetId, ...(faction ? { factionId: faction } : {}) },
      ]);
    }
  });

  it('§1: the three focus points; the rest are composed on the centre', () => {
    const text = section('**Focus points**', '**Content-policy read**');
    const focus = [...text.matchAll(/`(scene\.[a-z-]+)` `\{ x: ([\d.]+), y: ([\d.]+) \}`/g)];
    expect(focus).toHaveLength(3);
    for (const [, id, x, y] of focus) expect(content.asset(id!).focus).toEqual({ x: Number(x), y: Number(y) });
  });

  it('every location kind has a scene but parliament and barracks (jail and hospital: slice 5)', () => {
    const bound = new Set(content.art.scenes.map((s) => s.locationKind));
    const without = LocationKind.options.filter((k) => !bound.has(k));
    expect(without.sort()).toEqual(['barracks', 'parliament']);
  });

  it('§2: twelve new faces with the note’s crop and alt text', () => {
    const r = rows(section('## 2. Faces', '### 2.1'), /^\| `avatar-[a-z0-9-]+\.png` \|/);
    expect(r).toHaveLength(12);
    for (const [, id, top, alt] of r) {
      const a = content.asset(unq(id!));
      expect(a.kind).toBe('avatar');
      expect(a.crop).toEqual({ left: 60, top: Number(top), width: 760, height: 950 });
      expect(a.alt).toBe(alt);
    }
  });

  it('§2.1: eighteen distinct faces at sign-up, in the note’s order', () => {
    const order = rows(section('### 2.1', '## 3.'), /^\| \d+ \|/).map((x) => unq(x[1]!));
    expect(order).toHaveLength(18);
    expect(content.avatars).toEqual(order);
    expect(new Set(content.avatars).size).toBe(18);
    for (const id of content.avatars) expect(content.asset(id).kind).toBe('avatar');
  });
});
