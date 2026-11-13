import { declareSchema } from './_template'

export const mimesMangroveSeasonalGrowth = declareSchema({
  id: 'mimes-mangrove-seasonal-growth',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /julian day/i.test(c)) &&
    headers.some((c) => /^species$/i.test(c.trim())) &&
    headers.some((c) => /^season$/i.test(c.trim())),
})
