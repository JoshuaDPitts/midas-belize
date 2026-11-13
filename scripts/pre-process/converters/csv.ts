import { parse } from 'csv-parse/sync'
import { register } from '../registry'
import type { ConverterHandler } from '../types'

export const csvConverter: ConverterHandler = {
  id: 'csv',
  priority: 50,

  match(group) {
    return group.primary.ext === '.csv'
  },

  async convert(group, ctx) {
    const bytes = await ctx.readFile(group.primary.path)
    let text = bytes.toString('utf-8')
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

    const rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      // Some MIMES CSVs (e.g. MangrovesBC.csv) ship as wide-format matrices
      // where the header row declares fewer columns than the body. Without
      // this flag, csv-parse throws 'Invalid Record Length'. With it, extras
      // are silently dropped so the converter at least produces output rather
      // than failing the whole publish. Filed as Track F (Session 38).
      relax_column_count: true,
    }) as Record<string, unknown>[]

    const enriched = rows.map((row) => ({
      ...row,
      source: ctx.provenance.source,
      license: ctx.provenance.license,
    }))

    const out = {
      dataset_id: ctx.datasetId,
      row_count: enriched.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows: enriched,
    }

    return {
      bytes: Buffer.from(JSON.stringify(out)),
      contentType: 'application/json',
      extension: '.json',
    }
  },
}

register(csvConverter)
