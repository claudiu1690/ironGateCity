/**
 * Web art pipeline (ADR 0007).
 *
 *   pnpm art:build   read the sources from IRONGATE_ART_SRC and write apps/client/public/art/<id>-<w>.avif|webp
 *   pnpm art:check   verify every catalogue id has all its files, within budget (no sources needed; CI)
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
/** Per-file budgets in bytes by kind and width (ADR 0007); unlisted widths scale with the area. */
const BUDGETS: Record<Asset['kind'], Record<number, Record<Format, number>>> = {
  map: { 2560: { avif: 600 * KB, webp: 850 * KB }, 1280: { avif: 220 * KB, webp: 320 * KB } },
  scene: { 1280: { avif: 150 * KB, webp: 200 * KB }, 640: { avif: 60 * KB, webp: 80 * KB } },
  portrait: { 512: { avif: 45 * KB, webp: 60 * KB }, 256: { avif: 20 * KB, webp: 25 * KB } },
};
const TOTAL_BUDGET = 5 * KB * KB;

interface ManifestEntry {
  sourceHash: string;
  settings: string;
  quality: number;
  bytes: number;
}
type Manifest = Record<string, ManifestEntry>;

const fileName = (id: string, width: number, format: Format) => `${id}-${width}.${format}`;

function budget(a: Asset, width: number, format: Format): number {
  const table = BUDGETS[a.kind];
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

/** Every catalogue file present and within budget; the whole set under 5 MB. */
function check(): boolean {
  const problems: string[] = [];
  let total = 0;
  for (const a of assets) {
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
  if (total > TOTAL_BUDGET) problems.push(`the art set is ${(total / KB / KB).toFixed(2)} MB, over 5 MB`);
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
