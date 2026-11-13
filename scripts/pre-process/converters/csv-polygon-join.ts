import { parse } from 'csv-parse/sync'
import { register } from '../registry'
import { db, bucket } from '../firebase-admin'
import type { ConverterHandler, FileGroup } from '../types'
import type { CatalogEntry } from '@/lib/data/types'

interface GroupWithProvenanceHint extends FileGroup {
  _provenance?: { join_to?: string; join_key?: string; csv_key?: string; strict?: boolean }
}

type GeoJsonFeature = {
  type: 'Feature'
  geometry: unknown
  properties: Record<string, unknown>
  bbox?: [number, number, number, number]
}

type GeoJsonFC = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

async function loadPolygonGrid(datasetId: string): Promise<GeoJsonFC> {
  const snap = await db.collection('datasets').doc(datasetId).get()
  if (!snap.exists) {
    throw new Error(`csv-polygon-join: referenced polygon grid not found: ${datasetId}`)
  }
  const entry = snap.data() as CatalogEntry
  if (!entry.current_version) {
    throw new Error(`csv-polygon-join: polygon grid ${datasetId} has no current version`)
  }
  const [bytes] = await bucket.file(entry.current_version.gcs_path).download()
  return JSON.parse(bytes.toString('utf-8')) as GeoJsonFC
}

export const csvPolygonJoinConverter: ConverterHandler = {
  id: 'csv-polygon-join',
  priority: 200,

  match(group) {
    if (group.primary.ext !== '.csv') return false
    const prov = (group as GroupWithProvenanceHint)._provenance
    return Boolean(prov?.join_to)
  },

  async convert(group, ctx) {
    const prov = (group as GroupWithProvenanceHint)._provenance
    if (!prov?.join_to) {
      throw new Error('csv-polygon-join: missing join_to in provenance')
    }
    const joinKey = prov.join_key ?? 'Polygon_ID'
    // CSV-side key defaults to join_key (most common: both sides use the
    // same column name). Override via provenance.csv_key when the CSV column
    // is named differently from the polygon field — e.g., CSV uses
    // `Polygon_ID` but the polygon shape uses `id` or `MIMES_ID`.
    const csvKey = prov.csv_key ?? joinKey
    const strict = Boolean(prov.strict)

    const csvBytes = await ctx.readFile(group.primary.path)
    let text = csvBytes.toString('utf-8')
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
    const rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      // Defensive parity with the plain csv converter — joined CSVs are
      // usually curated but the parser flag costs nothing.
      relax_column_count: true,
    }) as Record<string, unknown>[]

    const fc = await loadPolygonGrid(prov.join_to)
    const byKey = new Map<string, GeoJsonFeature>()
    for (const feat of fc.features) {
      const k = feat.properties?.[joinKey]
      if (k == null) continue
      // Normalise so "33.0" (DBF float) and "33" (CSV string) hash the same.
      byKey.set(String(k).replace(/\.0+$/, ''), feat)
    }

    const joined: GeoJsonFeature[] = []
    const unmatched: string[] = []
    for (const row of rows) {
      const rawCsvVal = row[csvKey]
      if (rawCsvVal == null) {
        unmatched.push('(missing)')
        continue
      }
      // Normalise trailing decimals so "33.0" matches "33".
      const k = String(rawCsvVal).replace(/\.0+$/, '')
      const feat = byKey.get(k)
      if (!feat) {
        unmatched.push(k)
        continue
      }
      // Drop the csv-side key from the row so the polygon's typed key survives.
      const { [csvKey]: _k, ...rowWithoutKey } = row
      void _k
      // csv-parse returns every column as a string. Coerce values that look
      // like numbers so the consuming UI's `typeof === 'number'` checks (in
      // hasEncodingData, the encoder functions, the NbSScoreCard guards,
      // etc.) actually fire instead of always falling through to em-dash /
      // per-family-fallback paths. Discovered 2026-05-13 when 87 features
      // joined but UI still rendered grey fallback because props.NbS_Score
      // was "0.8842" (string) not 0.8842 (number).
      const coerced: Record<string, unknown> = {}
      for (const [k2, v2] of Object.entries(rowWithoutKey)) {
        if (typeof v2 !== 'string') {
          coerced[k2] = v2
          continue
        }
        const trimmed = v2.trim()
        if (trimmed === '') {
          coerced[k2] = null
          continue
        }
        const n = Number(trimmed)
        coerced[k2] = Number.isFinite(n) && /^-?\d/.test(trimmed) ? n : v2
      }
      joined.push({
        type: 'Feature',
        geometry: feat.geometry,
        properties: {
          ...feat.properties,
          ...coerced,
          source: ctx.provenance.source,
          license: ctx.provenance.license,
        },
      })
    }

    if (unmatched.length > 0) {
      const preview = unmatched.slice(0, 5).join(', ')
      const ellipsis = unmatched.length > 5 ? '…' : ''
      const msg = `csv-polygon-join: ${unmatched.length} unmatched ${csvKey}(s) in ${group.primary.relativePath} (looking up polygon.${joinKey}): ${preview}${ellipsis}`
      if (strict) throw new Error(msg)
      console.warn(msg)
    }

    const out: GeoJsonFC = { type: 'FeatureCollection', features: joined }
    const bytes = Buffer.from(JSON.stringify(out))

    const joinedKeys = new Set(joined.flatMap((f) => (f.properties?.[joinKey] != null ? [String(f.properties[joinKey])] : [])))
    const firstJoinedFeat = fc.features.find((f) => joinedKeys.has(String(f.properties?.[joinKey])))
    const bbox: [number, number, number, number] = firstJoinedFeat?.bbox ?? [0, 0, 0, 0]

    return {
      bytes,
      contentType: 'application/geo+json',
      extension: '.geojson',
      feature_count: joined.length,
      bbox,
    }
  },
}

register(csvPolygonJoinConverter)
