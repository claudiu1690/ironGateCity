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
