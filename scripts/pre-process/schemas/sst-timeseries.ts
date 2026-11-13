import { declareSchema } from './_template'

export const sstTimeseries = declareSchema({
  id: 'sst-timeseries',
  family: 'timeseries',
  classify: (headers) =>
    headers.some((col) => /sst/i.test(col)) &&
    headers.some((col) => /date|time|year|month/i.test(col)),
  incoming: { required: [], optional: [], patterns: [/^sst_/i] },
})
