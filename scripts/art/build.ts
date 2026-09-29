/**
 * Web art pipeline (ADR 0007, ADR 0015).
 *
 *   pnpm art:build   read the sources from IRONGATE_ART_SRC and write apps/client/public/art/<id>-<w>.avif|webp
 *                    (vectors: copied to /art/<id>.svg after the safety check)
 *   pnpm art:check   verify every catalogue id has all its files, within budget, SVGs safe (no sources; CI)
 *
 * Idempotent: an output whose source hash and settings are unchanged is skipped (.build.json).
 * Over budget, quality steps down to a floor (AVIF 40, WebP 60); still over fails the build.
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { assets } from '../../packages/content/src/data/art';
import type { Asset } from '../../packages/content/src/schemas';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'apps/client/public/art');
const MANIFEST = join(OUT, '.build.json');
const SRC = process.env.IRONGATE_ART_SRC ?? 'E:/Projects/ironGateCity Docs/art-direction';

type Format = 'avif' | 'webp';
const FORMATS: Format[] = ['avif', 'webp'];
const QUALITY: Record<Format, { start: number; floor: number; step: number }> = {
  avif: { start: 55, floor: 40, step: 5 },
  webp: { start: 72, floor: 60, step: 4 },
};
const KB = 1024;
type RasterKind = Exclude<Asset['kind'], 'vector'>;
/** Per-file budgets in bytes by kind and width (ADR 0007, 0015); unlisted widths scale with the area. */
const BUDGETS: Record<RasterKind, Record<number, Record<Format, number>>> = {
  map: { 2560: { avif: 600 * KB, webp: 850 * KB }, 1280: { avif: 220 * KB, webp: 320 * KB } },
  scene: { 1280: { avif: 150 * KB, webp: 200 * KB }, 640: { avif: 60 * KB, webp: 80 * KB } },
  portrait: { 512: { avif: 45 * KB, webp: 60 * KB }, 256: { avif: 20 * KB, webp: 25 * KB } },
  avatar: { 256: { avif: 20 * KB, webp: 25 * KB }, 128: { avif: 6 * KB, webp: 8 * KB } },
  item: { 256: { avif: 20 * KB, webp: 25 * KB }, 128: { avif: 6 * KB, webp: 8 * KB } },
};
/** ADR 0015: a vector is copied, at most 8 KB. */
const VECTOR_BUDGET = 8 * KB;
/** ADR 0015: the committed set after slice 2 (raised per slice with a measured figure, never removed). */
const TOTAL_BUDGET = 12 * KB * KB;

interface ManifestEntry {
  sourceHash: string;
  settings: string;
  quality: number;
  bytes: number;
}
type Manifest = Record<string, ManifestEntry>;

const fileName = (id: string, width: number, format: Format) => `${id}-${width}.${format}`;
const svgName = (id: string) => `${id}.svg`;

/**
 * ADR 0015: an SVG may never carry code into the page. Refused: a <script>, an on…= attribute, a
 * <foreignObject>, and any external reference (an href or url( that does not start with #).
 */
function svgProblems(svg: string): string[] {
  const out: string[] = [];
  if (/<script\b/i.test(svg)) out.push('has a <script>');
  if (/\son[a-z]+\s*=/i.test(svg)) out.push('has an on…= attribute');
  if (/<foreignObject\b/i.test(svg)) out.push('has a <foreignObject>');
  for (const m of svg.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    if (!m[1]!.startsWith('#')) out.push(`has an external reference "${m[1]}"`);
  }
  for (const m of svg.matchAll(/url\(\s*["']?([^)"']*)/gi)) {
    if (!m[1]!.startsWith('#')) out.push(`has an external url("${m[1]}")`);
  }
  return out;
}

function budget(a: Asset, width: number, format: Format): number {
  const table = BUDGETS[a.kind as RasterKind];
  if (table[width]) return table[width][format];
  const [refWidth, ref] = Object.entries(table)
    .map(([w, b]) => [Number(w), b] as const)
    .at(-1)!;
  return Math.round(ref[format] * (width / refWidth) ** 2);
}

function readManifest(): Manifest {
  return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest) : {};
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

async function encode(a: Asset, width: number, format: Format, quality: number): Promise<Buffer> {
  let img = sharp(join(SRC, a.source), { limitInputPixels: false });
  if (a.crop) img = img.extract(a.crop);
  if (a.flatten) img = img.flatten({ background: a.flatten });
  img = img.resize({ width, kernel: 'lanczos3', withoutEnlargement: true });
  return format === 'avif'
    ? img.avif({ quality, effort: 4 }).toBuffer()
    : img.webp({ quality, effort: 5 }).toBuffer();
}

async function build(): Promise<void> {
  if (!existsSync(SRC)) {
    console.error(`Art source folder not found: ${SRC} (set IRONGATE_ART_SRC).`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const manifest = readManifest();
  let failed = false;
  for (const a of assets) {
    const sourceHash = await hashFile(join(SRC, a.source));
    if (a.kind === 'vector') {
      const name = svgName(a.id);
      const svg = readFileSync(join(SRC, a.source), 'utf8');
      const bad = svgProblems(svg);
      if (bad.length > 0 || Buffer.byteLength(svg) > VECTOR_BUDGET) {
        console.error(`FAIL   ${name}: ${[...bad, `${Buffer.byteLength(svg)} bytes`].join(', ')}`);
        failed = true;
        continue;
      }
      writeFileSync(join(OUT, name), svg);
      manifest[name] = { sourceHash, settings: 'copy', quality: 0, bytes: Buffer.byteLength(svg) };
      console.log(`copied ${name} (${Buffer.byteLength(svg)} bytes)`);
      continue;
    }
    for (const width of a.widths) {
      for (const format of FORMATS) {
        const name = fileName(a.id, width, format);
        const settings = JSON.stringify({
          width,
          format,
          crop: a.crop ?? null,
          flatten: a.flatten ?? null,
          q: QUALITY[format],
        });
        const prev = manifest[name];
        if (
          prev &&
          prev.sourceHash === sourceHash &&
          prev.settings === settings &&
          existsSync(join(OUT, name))
        ) {
          console.log(`skip   ${name} (${Math.round(prev.bytes / KB)} KB)`);
          continue;
        }
        const limit = budget(a, width, format);
        const q = QUALITY[format];
        let quality = q.start;
        let out = await encode(a, width, format, quality);
        while (out.length > limit && quality - q.step >= q.floor) {
          quality -= q.step;
          out = await encode(a, width, format, quality);
        }
        if (out.length > limit) {
          console.error(
            `FAIL   ${name}: ${Math.round(out.length / KB)} KB > ${Math.round(limit / KB)} KB at q${quality}`,
          );
          failed = true;
          continue;
        }
        writeFileSync(join(OUT, name), out);
        manifest[name] = { sourceHash, settings, quality, bytes: out.length };
        console.log(`wrote  ${name} (${Math.round(out.length / KB)} KB, q${quality})`);
      }
    }
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  if (failed || !check()) process.exit(1);
}

/** Every catalogue file present and within budget, every SVG safe; the whole set under 12 MB. */
function check(): boolean {
  const problems: string[] = [];
  let total = 0;
  for (const a of assets) {
    if (a.kind === 'vector') {
      const name = svgName(a.id);
      const path = join(OUT, name);
      if (!existsSync(path)) {
        problems.push(`missing ${name}`);
        continue;
      }
      const bytes = statSync(path).size;
      total += bytes;
      if (bytes > VECTOR_BUDGET) problems.push(`${name} is over budget (${bytes} bytes)`);
      for (const p of svgProblems(readFileSync(path, 'utf8'))) problems.push(`${name} ${p}`);
      continue;
    }
    for (const width of a.widths) {
      for (const format of FORMATS) {
        const name = fileName(a.id, width, format);
        const path = join(OUT, name);
        if (!existsSync(path)) {
          problems.push(`missing ${name}`);
          continue;
        }
        const bytes = statSync(path).size;
        total += bytes;
        if (bytes > budget(a, width, format))
          problems.push(`${name} is over budget (${Math.round(bytes / KB)} KB)`);
      }
    }
  }
  if (total > TOTAL_BUDGET)
    problems.push(`the art set is ${(total / KB / KB).toFixed(2)} MB, over ${TOTAL_BUDGET / KB / KB} MB`);
  if (problems.length > 0) {
    console.error(`art:check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    return false;
  }
  console.log(`art:check ok: ${assets.length} assets, ${(total / KB / KB).toFixed(2)} MB`);
  return true;
}

if (process.argv.includes('--check')) {
  if (!check()) process.exit(1);
} else {
  await build();
}
