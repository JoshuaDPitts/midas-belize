#!/usr/bin/env node
/**
 * RUSLE per-watershed factor ETL.
 *
 * Reads watershed polygons + the four source rasters (GloREDa R-factor,
 * SoilGrids texture+SOC, Copernicus DEM, ESA WorldCover), computes the
 * five RUSLE factors per polygon (R, K, LS, C, P) plus the derived A
 * (annual soil loss), and emits a CSV that the existing preprocess
 * pipeline can ingest under a `rusle-factors` schema family.
 *
 * Required inputs (manually downloaded — see ./README.md):
 *
 *   --polygons <path>     GeoJSON FeatureCollection of watershed polygons
 *   --r-raster <path>     GloREDa annual R-factor GeoTIFF (clipped to Belize)
 *   --soil-sand <path>    SoilGrids sand g/kg, 0-5cm or 0-30cm
 *   --soil-silt <path>    SoilGrids silt g/kg
 *   --soil-clay <path>    SoilGrids clay g/kg
 *   --soil-soc  <path>    SoilGrids SOC dg/kg
 *   --dem <path>          Copernicus DEM GLO-30 GeoTIFF
 *   --worldcover <path>   ESA WorldCover v200 GeoTIFF
 *   --out <path>          Destination directory for rusle-factors.csv +
 *                         rusle-factors.provenance.json
 *   --dataset-id <id>     Catalog dataset id (e.g.
 *                         "placencia-watersheds-rusle-factors")
 *
 * Usage:
 *   pnpm tsx scripts/pre-process/rusle/compute.ts \
 *     --polygons reference/rusle-inputs/placencia-watershed-polygons.geojson \
 *     --r-raster reference/rusle-inputs/gloreda-belize.tif \
 *     --soil-sand reference/rusle-inputs/sg-sand-0-30cm-belize.tif \
 *     --soil-silt reference/rusle-inputs/sg-silt-0-30cm-belize.tif \
 *     --soil-clay reference/rusle-inputs/sg-clay-0-30cm-belize.tif \
 *     --soil-soc  reference/rusle-inputs/sg-soc-0-30cm-belize.tif \
 *     --dem reference/rusle-inputs/copernicus-dem-belize.tif \
 *     --worldcover reference/rusle-inputs/worldcover-belize.tif \
 *     --out scripts/pre-process/rusle/out/placencia \
 *     --dataset-id placencia-watersheds-rusle-factors
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import {
  computeK,
  permeabilityFromTexture,
  structureFromSoc,
} from './factors/k-wischmeier';
import { cFromClassFractions } from './factors/c-borrelli';
import { computeP } from './factors/p-default';

interface Args {
  polygons: string;
  rRaster: string;
  soilSand: string;
  soilSilt: string;
  soilClay: string;
  soilSoc: string;
  dem: string;
  worldcover: string;
  out: string;
  datasetId: string;
}

function parseArgs(argv: string[]): Args {
  const map: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    map[key] = argv[i + 1];
  }
  const required = [
    'polygons',
    'r-raster',
    'soil-sand',
    'soil-silt',
    'soil-clay',
    'soil-soc',
    'dem',
    'worldcover',
    'out',
    'dataset-id',
  ];
  for (const r of required) {
    if (!map[r]) {
      throw new Error(`Missing required --${r}`);
    }
  }
  return {
    polygons: resolve(map['polygons']),
    rRaster: resolve(map['r-raster']),
    soilSand: resolve(map['soil-sand']),
    soilSilt: resolve(map['soil-silt']),
    soilClay: resolve(map['soil-clay']),
    soilSoc: resolve(map['soil-soc']),
    dem: resolve(map['dem']),
    worldcover: resolve(map['worldcover']),
    out: resolve(map['out']),
    datasetId: map['dataset-id'],
  };
}

interface ZonalRecord {
  feature_id: string | number;
  mean: number | null;
}

interface SoilRecord {
  feature_id: string | number;
  sand_pct: number | null;
  silt_pct: number | null;
  clay_pct: number | null;
  soc_pct: number | null;
  om_pct: number | null;
}

interface LSRecord {
  feature_id: string | number;
  ls_factor: number;
  slope_pct_mean: number;
  cell_count: number;
}

interface ClassRecord {
  feature_id: string | number;
  total_pixels: number;
  fractions: Record<string, number>;
}

function runPython<T>(script: string, args: string[]): T {
  const py = process.env.PYTHON_BIN ?? 'python3';
  try {
    const out = execFileSync(py, [script, ...args], {
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    return JSON.parse(out.toString()) as T;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: Buffer; stderr?: Buffer };
    console.error(`\n[rusle] python helper failed: ${script}`);
    if (e.stdout) console.error('stdout:', e.stdout.toString().slice(0, 2000));
    if (e.stderr) console.error('stderr:', e.stderr.toString().slice(0, 2000));
    throw err;
  }
}

function indexBy<T extends { feature_id: string | number }>(
  records: T[],
): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of records) m.set(String(r.feature_id), r);
  return m;
}

function main(): void {
  const args = parseArgs(process.argv);
  const pyDir = join(__dirname, 'python');

  console.error('[rusle] zonal R-factor (GloREDa) …');
  const rZonal = runPython<ZonalRecord[]>(join(pyDir, 'zonal-stats.py'), [
    args.polygons,
    args.rRaster,
  ]);

  console.error('[rusle] soil texture + SOC (SoilGrids) …');
  const soil = runPython<SoilRecord[]>(join(pyDir, 'soil-texture.py'), [
    args.polygons,
    args.soilSand,
    args.soilSilt,
    args.soilClay,
    args.soilSoc,
  ]);

  console.error('[rusle] slope cells (Copernicus DEM) …');
  const lsCells = runPython<LSRecord[]>(join(pyDir, 'ls-from-dem.py'), [
    args.polygons,
    args.dem,
  ]);

  console.error('[rusle] land-cover fractions (ESA WorldCover) …');
  const classFracs = runPython<ClassRecord[]>(
    join(pyDir, 'class-fractions.py'),
    [args.polygons, args.worldcover],
  );

  const rByFeature = indexBy(rZonal);
  const soilByFeature = indexBy(soil);
  const lsByFeature = indexBy(lsCells);
  const classByFeature = indexBy(classFracs);

  const polygons = JSON.parse(readFileSync(args.polygons, 'utf-8')) as {
    features: { properties?: Record<string, unknown> }[];
  };

  const rows: Record<string, unknown>[] = [];
  const p = computeP();

  for (const feature of polygons.features) {
    const props = feature.properties ?? {};
    const featureId =
      (props.MIMES_ID as string | number | undefined) ??
      (props.Name as string | undefined) ??
      (props.WATERSHED as string | undefined) ??
      (props.id as string | undefined);
    const key = featureId !== undefined ? String(featureId) : '';

    const R = rByFeature.get(key)?.mean ?? null;
    const soilRec = soilByFeature.get(key);
    const K =
      soilRec && soilRec.sand_pct !== null && soilRec.silt_pct !== null &&
      soilRec.clay_pct !== null && soilRec.om_pct !== null
        ? computeK({
            sand_pct: soilRec.sand_pct,
            silt_pct: soilRec.silt_pct,
            clay_pct: soilRec.clay_pct,
            om_pct: soilRec.om_pct,
            structure: structureFromSoc(soilRec.soc_pct ?? 0),
            permeability: permeabilityFromTexture(
              soilRec.sand_pct,
              soilRec.clay_pct,
            ),
          })
        : null;
    const LS = lsByFeature.get(key)?.ls_factor ?? 0;
    const cFractions = Object.fromEntries(
      Object.entries(classByFeature.get(key)?.fractions ?? {}).map(
        ([code, frac]) => [Number(code), frac],
      ),
    );
    const C = cFromClassFractions(cFractions);
    const A =
      R !== null && K !== null ? R * K * LS * C * p.P : null;

    rows.push({
      feature_id: featureId,
      MIMES_ID: props.MIMES_ID ?? '',
      Name: props.Name ?? '',
      WATERSHED: props.WATERSHED ?? '',
      mean_r_factor: R,
      K_factor: K,
      LS_factor: LS,
      C_factor: C,
      P_factor: p.P,
      A_t_ha_yr: A,
    });
  }

  mkdirSync(args.out, { recursive: true });
  const csvPath = join(args.out, `${args.datasetId}.csv`);
  writeFileSync(csvPath, stringify(rows, { header: true }));
  console.error(`[rusle] wrote ${csvPath}`);

  // Provenance sidecar pointing at the four source datasets.
  const provenance = {
    schema_family: 'rusle-factors',
    dataset_id: args.datasetId,
    title: 'RUSLE factors per watershed polygon',
    description:
      'Per-polygon Revised Universal Soil Loss Equation (RUSLE) ' +
      'factors. R from GloREDa annual; K from SoilGrids 2.0 (Wischmeier ' +
      'nomograph); LS from Copernicus DEM (McCool 1987 formulation); C ' +
      'from ESA WorldCover via Borrelli et al. 2017 class lookup; P = 1.0 ' +
      '(no support-practice raster).',
    source:
      'Composite: GloREDa (JRC ESDAC), SoilGrids 2.0 (ISRIC), ' +
      'Copernicus DEM GLO-30 (Copernicus / ESA), ESA WorldCover v200 (ESA / VITO).',
    source_url: 'https://esdac.jrc.ec.europa.eu/content/global-rainfall-erosivity',
    license:
      'Composite. R: ESDAC custom (joined values redistributable). ' +
      'K + LS-DEM + C: CC BY 4.0. P: methodology assumption (no upstream).',
    citation:
      'Panagos et al. 2017 (GloREDa); Hengl et al. 2017 (SoilGrids 2.0); ' +
      'Copernicus DEM 2019; ESA WorldCover 2021; Wischmeier & Smith 1978; ' +
      'McCool et al. 1987; Borrelli et al. 2017.',
    upstream_paths: [
      args.rRaster,
      args.soilSand,
      args.soilSilt,
      args.soilClay,
      args.soilSoc,
      args.dem,
      args.worldcover,
    ],
    scope: 'site',
    join_to: undefined,
    join_key: 'MIMES_ID',
    csv_key: 'MIMES_ID',
    strict: false,
    tags: ['rusle', 'soil-loss', 'watershed', 'derived'],
    notes: p.note,
  };
  const provPath = join(args.out, `${args.datasetId}.provenance.json`);
  writeFileSync(provPath, JSON.stringify(provenance, null, 2));
  console.error(`[rusle] wrote ${provPath}`);
}

main();
