import { declareSchema } from './_template'

export const jdayTable = declareSchema({
  id: 'jday-table',
  family: 'timeseries',
  classify: (headers) =>
    headers.some((col) => /^j[_\s-]?day$|julian/i.test(col)),
})
