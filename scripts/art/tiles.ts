/**
 * Map tiles (ADR 0024 revised; docs/design/maps-v3-integration.md §4).
 *
 *   pnpm art:tiles [--src <folder>] [--only <name>] [--force]
 *       cut every master `<name>-<day|night>-<size>.png` in the folder (default
 *       $IRONGATE_ART_SRC/maps-v3) into a Deep Zoom pyramid of AVIF tiles at
 *       .art-cache/tiles/<assetId>/<rev>/avif.dzi + avif_files/<level>/<col>_<row>.avif
 *       (git-ignored), check it, and merge its entry into packages/content/src/data/tiles.json.
 *   pnpm art:tiles --check
 *       every manifest entry's <rev> is in the cache (dev only: the cache is not in git).
 *
 * `rev` is the first 8 hex of sha256(master bytes + settings): a re-export gets a new path, so an
 * immutable cache never serves a stale tile. Idempotent: an existing <rev>/<format>.dzi is skipped.
 * sharp's Deep Zoom writer (libvips dzsave) streams, so a 390 MB master needs no raw buffer.
 *
 * AVIF (maps v3 §9.2, R1): about 0.65 × WebP q75's bytes for the same tile, with the painted texture
 * kept at full zoom. sharp's dzsave writes only JPEG, PNG and WebP tiles, so an AVIF pyramid is cut in
 * two passes: dzsave writes lossless PNG tiles (fast, compression 1) into the temporary folder, then
 * every tile is encoded to AVIF in parallel and its PNG removed. The geometry is dzsave's either way.
 */
import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { levelGrid, maxLevelFor } from '../../packages/ui/src/tiles';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = join(ROOT, '.art-cache/tiles');
const MANIFEST = join(ROOT, 'packages/content/src/data/tiles.json');
const ART_SRC = process.env.IRONGATE_ART_SRC ?? 'E:/Projects/ironGateCity Docs/art-direction';

const MASTER = /^(nation|coalport|duskwall|ashford|clearwater|irongate)-(day|night)-(\d+)\.png$/;
type TileFormat = 'avif' | 'webp';
/**
 * AVIF q55 (maps v3 §9.2): q45 and q50 smear foliage and roof texture at full zoom; q55 is close to
 * WebP q75 there at about 0.65 × its bytes. `format: 'webp', quality: 75` is the previous pyramid.
 */
const SETTINGS = {
  tileSize: 512,
  overlap: 1,
  format: 'avif' as TileFormat,
  quality: 55,
  effort: 4,
  flatten: '#EFE6D2',
  layout: 'dz',
  depth: 'onepixel',
};
const MB = 1024 * 1024;

export interface TilesEntry {
  rev: string;
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  maxLevel: number;
  format: TileFormat;
  tiles: number;
  bytes: number;
}
type Manifest = Record<string, TilesEntry>;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readManifest(): Manifest {
  return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest) : {};
}

function writeManifest(m: Manifest): void {
  const sorted = Object.fromEntries(
    Object.keys(m)
      .sort()
      .map((k) => [k, m[k]!]),
  );
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
}

async function revOf(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  hash.update(JSON.stringify(SETTINGS));
  return hash.digest('hex').slice(0, 8);
}

/** The pyramid in `dir` against the geometry TileLayer reads: size, levels, and every tile there. */
function selfCheck(dir: string, width: number, height: number): { tiles: number; bytes: number } {
  const problems: string[] = [];
  const f = SETTINGS.format;
  const dzi = readFileSync(join(dir, `${f}.dzi`), 'utf8');
  const attr = (name: string) => Number(new RegExp(`${name}="(\\d+)"`).exec(dzi)?.[1]);
  if (attr('Width') !== width || attr('Height') !== height)
    problems.push(`.dzi is ${attr('Width')} × ${attr('Height')}, the master ${width} × ${height}`);
  if (attr('TileSize') !== SETTINGS.tileSize) problems.push(`.dzi TileSize ${attr('TileSize')}`);
  if (attr('Overlap') !== SETTINGS.overlap) problems.push(`.dzi Overlap ${attr('Overlap')}`);
  if (!dzi.includes(`Format="${f}"`)) problems.push(`.dzi Format is not ${f}`);
  const maxLevel = maxLevelFor(width, height);
  const files = join(dir, `${f}_files`);
  const levels = readdirSync(files).filter((d) => statSync(join(files, d)).isDirectory());
  if (levels.length !== maxLevel + 1) problems.push(`${levels.length} levels, expected ${maxLevel + 1}`);
  let tiles = 0;
  let bytes = statSync(join(dir, `${f}.dzi`)).size;
  const p = { width, height, maxLevel, tileSize: SETTINGS.tileSize };
  for (let level = 0; level <= maxLevel; level++) {
    const ld = join(files, String(level));
    if (!existsSync(ld)) {
      problems.push(`level ${level} missing`);
      continue;
    }
    const { cols, rows } = levelGrid(p, level);
    const names = new Set(readdirSync(ld));
    if (names.size !== cols * rows)
      problems.push(`level ${level}: ${names.size} tiles, expected ${cols * rows}`);
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const name = `${c}_${r}.${f}`;
        if (!names.has(name)) problems.push(`level ${level}: ${name} missing`);
        else {
          tiles++;
          bytes += statSync(join(ld, name)).size;
        }
      }
  }
  if (problems.length > 0) throw new Error(`self-check failed in ${dir}:\n  - ${problems.join('\n  - ')}`);
  return { tiles, bytes };
}

async function cut(src: string, dir: string): Promise<void> {
  const tmp = `${dir}.tmp`;
  const f = SETTINGS.format;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const tile = {
    size: SETTINGS.tileSize,
    overlap: SETTINGS.overlap,
    layout: 'dz',
    depth: 'onepixel',
  } as const;
  const img = sharp(src, { limitInputPixels: false }).flatten({ background: SETTINGS.flatten });
  if (f === 'webp') {
    await img
      .webp({ quality: SETTINGS.quality, effort: SETTINGS.effort })
      .tile(tile)
      .toFile(join(tmp, 'webp.dz'));
  } else {
    // Pass 1: lossless PNG tiles in `avif_files/` (the folder and the .dzi take the output's name,
    // the tiles and the .dzi's Format the PNG suffix: the Format is set to AVIF here, the tiles next).
    await img
      .png({ compressionLevel: 1 })
      .tile(tile)
      .toFile(join(tmp, `${f}.dz`));
    const dziPath = join(tmp, `${f}.dzi`);
    writeFileSync(dziPath, readFileSync(dziPath, 'utf8').replace(/Format="png"/, `Format="${f}"`));
    await encodeTiles(join(tmp, `${f}_files`), f);
  }
  // libvips' own metadata dump: not a tile, never served.
  rmSync(join(tmp, `${f}_files`, 'vips-properties.xml'), { force: true });
  rmSync(dir, { recursive: true, force: true });
  // Windows: a folder just written can be held for a moment (indexer, antivirus): retry the move.
  for (let attempt = 1; ; attempt++) {
    try {
      renameSync(tmp, dir);
      return;
    } catch (err) {
      if (attempt >= 20 || (err as NodeJS.ErrnoException).code !== 'EPERM') throw err;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

/** Pass 2: every `<level>/<col>_<row>.png` under `files` to `.avif`, the PNG removed; all cores. */
async function encodeTiles(files: string, f: TileFormat): Promise<void> {
  const jobs = readdirSync(files)
    .filter((d) => statSync(join(files, d)).isDirectory())
    .flatMap((d) =>
      readdirSync(join(files, d))
        .filter((n) => n.endsWith('.png'))
        .map((n) => join(files, d, n)),
    );
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < jobs.length; i = next++) {
      const png = jobs[i]!;
      await sharp(png)
        .avif({ quality: SETTINGS.quality, effort: SETTINGS.effort })
        .toFile(png.replace(/\.png$/, `.${f}`));
      rmSync(png);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, availableParallelism()) }, worker));
}

async function build(): Promise<void> {
  const src = resolve(arg('--src') ?? join(ART_SRC, 'maps-v3'));
  const only = arg('--only');
  const force = process.argv.includes('--force');
  if (!existsSync(src)) {
    console.error(`Masters folder not found: ${src} (pass --src or set IRONGATE_ART_SRC).`);
    process.exit(1);
  }
  const masters = readdirSync(src)
    .map((f) => ({ f, m: MASTER.exec(f) }))
    .filter((x): x is { f: string; m: RegExpExecArray } => !!x.m && (!only || x.m[1] === only));
  if (masters.length === 0) {
    console.error(`No masters in ${src}${only ? ` for "${only}"` : ''}.`);
    process.exit(1);
  }
  sharp.concurrency(0);
  // Pass 2 reads files that are written, read once and removed: nothing worth caching.
  sharp.cache(false);
  const manifest = readManifest();
  let failed = false;
  for (const { f, m } of masters) {
    const [, name, time, sizeText] = m;
    const id = `map.${name}.${time}`;
    const path = join(src, f);
    const t0 = Date.now();
    const meta = await sharp(path, { limitInputPixels: false }).metadata();
    const size = Number(sizeText);
    if (meta.width !== size || meta.height !== size) {
      console.error(`FAIL   ${f}: the file is ${meta.width} × ${meta.height}, its name says ${size}`);
      failed = true;
      continue;
    }
    const rev = await revOf(path);
    const dir = join(CACHE, id, rev);
    const fresh = force || !existsSync(join(dir, `${SETTINGS.format}.dzi`));
    try {
      if (fresh) await cut(path, dir);
      const { tiles, bytes } = selfCheck(dir, meta.width, meta.height);
      manifest[id] = {
        rev,
        width: meta.width,
        height: meta.height,
        tileSize: SETTINGS.tileSize,
        overlap: SETTINGS.overlap,
        maxLevel: maxLevelFor(meta.width, meta.height),
        format: SETTINGS.format,
        tiles,
        bytes,
      };
      writeManifest(manifest);
      const s = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `${fresh ? 'cut ' : 'skip'}   ${id}/${rev}: ${tiles} files, ${(bytes / MB).toFixed(1)} MB, ${s} s`,
      );
    } catch (err) {
      console.error(`FAIL   ${id}: ${(err as Error).message}`);
      failed = true;
    }
  }
  const total = Object.values(manifest).reduce((a, e) => ({ n: a.n + e.tiles, b: a.b + e.bytes }), {
    n: 0,
    b: 0,
  });
  console.log(
    `tiles.json: ${Object.keys(manifest).length} pyramids, ${total.n} files, ${(total.b / MB).toFixed(1)} MB`,
  );
  if (failed) process.exit(1);
}

/** Every manifest entry's <rev> is in the cache. */
function check(): boolean {
  const manifest = readManifest();
  const missing = Object.entries(manifest)
    .filter(([id, e]) => !existsSync(join(CACHE, id, e.rev, `${e.format}.dzi`)))
    .map(([id, e]) => `${id}/${e.rev}`);
  if (missing.length > 0) {
    console.error(
      `art:tiles --check: not in .art-cache/tiles (run pnpm art:tiles):\n  - ${missing.join('\n  - ')}`,
    );
    return false;
  }
  console.log(`art:tiles --check ok: ${Object.keys(manifest).length} pyramids in .art-cache/tiles`);
  return true;
}

if (process.argv.includes('--check')) {
  if (!check()) process.exit(1);
} else {
  await build();
}
