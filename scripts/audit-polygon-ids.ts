#!/usr/bin/env tsx
/**
 * Audit polygon-ID match-up between shape files and CSVs that want to
 * join to them.
 *
 * Per user direction 2026-05-12: "Pl Marine_ID.shp should be the current
 * and final data for MIMES outputs. However, earlier versions with smaller
 * or differently shaped polygons may be necessary for other data sources
 * such as NBS. Look for the number of polygons and polygon numbers in
 * different files and link by this!"
 *
 * Usage:
 *   pnpm tsx scripts/audit-polygon-ids.ts
 *
 * Reads only DBF attribute tables (skipping geometry) — we just need to
 * compare key sets.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const REF = path.join(ROOT, 'reference/MIMES_MIDAS');

interface DbfField {
  name: string;
  type: string;
  length: number;
  offset: number;
}

interface DbfTable {
  fieldOrder: string[];
  records: Record<string, string>[];
}

/**
 * Minimal DBF parser — handles dBase III, IV, V common cases. Reads field
 * descriptors from the header, then iterates fixed-width records. Trims
 * each value as text (caller can re-parse numeric if needed).
 */
function parseDbf(buf: Buffer): DbfTable {
  const recordCount = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);

  // Field descriptors: 32 bytes each, starting at offset 32, terminated by 0x0D.
  const fields: DbfField[] = [];
  let offset = 1; // first byte of each record is the deletion marker
  for (let pos = 32; pos < headerLength - 1; pos += 32) {
    if (buf[pos] === 0x0d) break;
    const rawName = buf.slice(pos, pos + 11);
    const nullIdx = rawName.indexOf(0);
    const name = rawName.slice(0, nullIdx === -1 ? 11 : nullIdx).toString('ascii').trim();
    const type = String.fromCharCode(buf[pos + 11]);
    const length = buf[pos + 16];
    fields.push({ name, type, length, offset });
    offset += length;
  }

  const records: Record<string, string>[] = [];
  for (let r = 0; r < recordCount; r++) {
    const recOffset = headerLength + r * recordLength;
    if (buf[recOffset] === 0x2a) continue; // deleted record marker '*'
    const obj: Record<string, string> = {};
    for (const f of fields) {
      const raw = buf.slice(recOffset + f.offset, recOffset + f.offset + f.length);
      obj[f.name] = raw.toString('ascii').trim();
    }
    records.push(obj);
  }
  return { fieldOrder: fields.map((f) => f.name), records };
}

// Candidate shape files for Placencia + Caye Caulker marine / coast variants.
const SHAPE_CANDIDATES = [
  'GIS Base Maps/Marine/Placencia/Marine/Pl Marine.shp',
  'GIS Base Maps/Marine/Placencia/Marine/Pl Marine_ID.shp',
  'GIS Base Maps/Coasts/Placencia/High Res/Pl Map 1-13-26.shp',
  'GIS Base Maps/Coasts/Placencia/Low Res/PlacenciaCoast.shp',
  '2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Placencia/GIS/Pl Marine.shp',
  '2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Placencia/GIS/Pl Marine_ID.shp',
  'GIS Base Maps/Marine/Caye Caulker/Marine/CC_Marine.shp',
  'GIS Base Maps/Marine/Caye Caulker/CayeCaulker.shp',
];

// CSVs that join to one of the polygon variants.
const CSV_CANDIDATES = [
  'Processed Output/Clade and Depth Bins/Pl_Marine_ebin_clade_detail.csv',
  'Processed Output/Clade and Depth Bins/Pl_Marine_nbs_scores.csv',
  'Processed Output/Clade and Depth Bins/Pl_Coast_ebin_clade_detail.csv',
  'Processed Output/Clade and Depth Bins/Pl_Coast_nbs_scores.csv',
  'Processed Output/Clade and Depth Bins/Pl_30_Polygons_ebin_clade_detail.csv',
  'Processed Output/Clade and Depth Bins/Pl_30_Polygons_nbs_scores.csv',
  'Processed Output/Clade and Depth Bins/CC_Marine_ebin_clade_detail.csv',
  'Processed Output/Clade and Depth Bins/CC_Marine_nbs_scores.csv',
];

interface ShapeAudit {
  path: string;
  count: number;
  idKey: string;
  ids: string[];
  allCols: string[];
}

interface CsvAudit {
  path: string;
  rowCount: number;
  idKey: string;
  ids: string[];
}

async function auditShape(relPath: string): Promise<ShapeAudit | null> {
  const abs = path.join(REF, relPath);
  const dbfAbs = abs.replace(/\.shp$/i, '.dbf');
  try {
    const dbf = await fs.readFile(dbfAbs);
    const table = parseDbf(dbf);
    if (table.records.length === 0) {
      return { path: relPath, count: 0, idKey: '?', ids: [], allCols: table.fieldOrder };
    }
    const cols = table.fieldOrder;
    const idKey =
      cols.find((c) => /^MIMES_?ID$/i.test(c)) ??
      cols.find((c) => /^Polygon_?ID$/i.test(c)) ??
      cols.find((c) => /^GRID_?ID$/i.test(c)) ??
      cols.find((c) => /^ID$/i.test(c)) ??
      cols[0];
    const ids = table.records
      .map((r) => r[idKey])
      .filter((v) => v !== undefined && v !== '' && v !== null);
    return {
      path: relPath,
      count: table.records.length,
      idKey,
      ids,
      allCols: cols,
    };
  } catch (e) {
    console.error(`  ! could not read ${relPath}: ${(e as Error).message}`);
    return null;
  }
}

async function auditCsv(relPath: string): Promise<CsvAudit | null> {
  const abs = path.join(REF, relPath);
  try {
    const text = await fs.readFile(abs, 'utf-8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return null;
    const header = lines[0].replace(/^﻿/, '').split(',');
    const idColIdx =
      header.findIndex((c) => /^Polygon_?ID$/i.test(c.trim())) >= 0
        ? header.findIndex((c) => /^Polygon_?ID$/i.test(c.trim()))
        : header.findIndex((c) => /^MIMES_?ID$/i.test(c.trim()));
    if (idColIdx < 0) return null;
    const idKey = header[idColIdx].trim();
    const idSet = new Set<string>();
    for (const line of lines.slice(1)) {
      const v = line.split(',')[idColIdx]?.trim();
      if (v) idSet.add(v.replace(/\.0+$/, ''));
    }
    return { path: relPath, rowCount: lines.length - 1, idKey, ids: [...idSet] };
  } catch {
    return null;
  }
}

function sortNumeric(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function overlap(a: string[], b: string[]): { both: number; aOnly: number; bOnly: number } {
  const aNorm = new Set(a.map((x) => x.replace(/\.0+$/, '')));
  const bNorm = new Set(b.map((x) => x.replace(/\.0+$/, '')));
  let both = 0;
  for (const x of aNorm) if (bNorm.has(x)) both++;
  return { both, aOnly: aNorm.size - both, bOnly: bNorm.size - both };
}

async function main() {
  console.log('=== Shape files ===');
  const shapeAudits: ShapeAudit[] = [];
  for (const rel of SHAPE_CANDIDATES) {
    const a = await auditShape(rel);
    if (!a) continue;
    shapeAudits.push(a);
    const sorted = sortNumeric(a.ids);
    const summary =
      sorted.length === 0
        ? '(no ID column)'
        : `key=${a.idKey} | n=${sorted.length} | range ${sorted[0]}..${sorted[sorted.length - 1]} | sample ${sorted.slice(0, 8).join(',')}${sorted.length > 8 ? '…' : ''}`;
    console.log(`  ${a.count.toString().padStart(4)}feat ${rel}`);
    console.log(`            ${summary}`);
    console.log(`            cols: ${a.allCols.join(', ')}`);
  }

  console.log('\n=== CSVs (per-polygon attribute tables) ===');
  const csvAudits: CsvAudit[] = [];
  for (const rel of CSV_CANDIDATES) {
    const a = await auditCsv(rel);
    if (!a) continue;
    csvAudits.push(a);
    const sorted = sortNumeric(a.ids);
    console.log(`  ${a.rowCount.toString().padStart(4)}rows ${rel}`);
    console.log(
      `            key=${a.idKey} | n_unique=${sorted.length} | range ${sorted[0]}..${sorted[sorted.length - 1]} | sample ${sorted.slice(0, 8).join(',')}${sorted.length > 8 ? '…' : ''}`,
    );
  }

  console.log('\n=== Best-match recommendations (CSV → shape by ID overlap) ===');
  for (const csv of csvAudits) {
    console.log(`\n${csv.path} (n=${csv.ids.length}):`);
    const ranked = shapeAudits
      .filter((s) => s.ids.length > 0)
      .map((s) => ({
        shape: s.path,
        shapeCount: s.ids.length,
        shapeKey: s.idKey,
        ...overlap(csv.ids, s.ids),
      }))
      .sort((a, b) => b.both - a.both || a.aOnly - b.aOnly);
    for (const r of ranked.slice(0, 4)) {
      const matchPct = csv.ids.length > 0 ? ((r.both / csv.ids.length) * 100).toFixed(0) : '0';
      console.log(
        `  ${matchPct.padStart(3)}% match | csv-side: ${r.both}/${csv.ids.length} matched + ${r.aOnly} unmatched | ${r.shape} (n=${r.shapeCount}, key=${r.shapeKey})`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
