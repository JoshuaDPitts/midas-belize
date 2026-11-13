import { declareSchema } from './_template'

export const slrTimeseries = declareSchema({
  id: 'slr-timeseries',
  family: 'timeseries',
  classify: (headers) =>
    headers.some((col) => /slr|sea[_\s-]?level/i.test(col)) &&
    headers.some((col) => /date|time|year|month/i.test(col)),
  incoming: { required: [], optional: [], patterns: [/^slr_/i] },
})
