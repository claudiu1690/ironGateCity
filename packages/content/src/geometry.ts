/**
 * Whether a point lies inside a polygon (even-odd ray casting); `strict` leaves out the points on (or
 * within 1e-6 of) an edge, so two outlines that share an edge do not count as overlapping.
 */
export function inPolygon(
  p: { x: number; y: number },
  poly: ReadonlyArray<readonly [number, number]>,
  strict = false,
): boolean {
  const eps = 1e-6;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    // On the edge?
    const cross = (p.x - xi) * (yj - yi) - (p.y - yi) * (xj - xi);
    const within =
      p.x >= Math.min(xi, xj) - eps && p.x <= Math.max(xi, xj) + eps && p.y >= Math.min(yi, yj) - eps && p.y <= Math.max(yi, yj) + eps;
    if (within && Math.abs(cross) <= eps * Math.hypot(xj - xi, yj - yi)) return !strict;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

type Pt = readonly [number, number];

/** The area of a simple polygon (the shoelace formula), absolute. */
export function polygonArea(poly: readonly Pt[]): number {
  let twice = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    twice += xj * yi - xi * yj;
  }
  return Math.abs(twice) / 2;
}

/**
 * Review 4 (answers §8, ADR 0076): whether a city's outlines tile its whole picture. Returns a named
 * problem for each way they do not:
 *
 * - the areas do not sum to 1 (± 1e-9): *a gap or an overlap*;
 * - an inner edge (one not along the picture's border) has no reversed twin in another outline: *an
 *   unshared point* (a T-junction, or a gap along a seam);
 * - an edge is used by more than two outlines, or runs the same way in two.
 *
 * Shared points must be the same numbers in both outlines (typed point for point).
 */
export function tilingProblems(
  cityId: string,
  outlines: ReadonlyArray<{ id: string; poly: readonly Pt[] }>,
): string[] {
  const problems: string[] = [];
  const total = outlines.reduce((sum, o) => sum + polygonArea(o.poly), 0);
  if (Math.abs(total - 1) > 1e-9)
    problems.push(`cities.${cityId}: the outlines cover ${total.toFixed(6)} of the picture, not 1 (a gap or an overlap)`);
  const key = ([x, y]: Pt) => `${Math.round(x * 1e9)},${Math.round(y * 1e9)}`;
  const onBorder = (a: Pt, b: Pt) =>
    (a[0] === 0 && b[0] === 0) || (a[0] === 1 && b[0] === 1) || (a[1] === 0 && b[1] === 0) || (a[1] === 1 && b[1] === 1);
  // Directed edge → the outlines that use it.
  const edges = new Map<string, string[]>();
  for (const o of outlines)
    for (let i = 0; i < o.poly.length; i++) {
      const a = o.poly[i]!;
      const b = o.poly[(i + 1) % o.poly.length]!;
      const k = `${key(a)}>${key(b)}`;
      edges.set(k, [...(edges.get(k) ?? []), o.id]);
    }
  for (const o of outlines)
    for (let i = 0; i < o.poly.length; i++) {
      const a = o.poly[i]!;
      const b = o.poly[(i + 1) % o.poly.length]!;
      const same = edges.get(`${key(a)}>${key(b)}`) ?? [];
      const twins = edges.get(`${key(b)}>${key(a)}`) ?? [];
      const where = `${o.id}: the edge (${a.join(', ')}) → (${b.join(', ')})`;
      if (same.length + twins.length > 2) problems.push(`${where} is used by more than two outlines`);
      else if (same.length > 1)
        problems.push(`${where} runs the same way in two outlines (an overlap, or one wound the other way)`);
      else if (!onBorder(a, b) && twins.length === 0)
        problems.push(`${where} is not shared with a neighbour (an unshared point)`);
    }
  return [...new Set(problems)];
}
