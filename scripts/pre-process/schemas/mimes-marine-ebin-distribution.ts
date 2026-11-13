import { declareSchema } from './_template'

export const mimesMarineEbinDistribution = declareSchema({
  id: 'mimes-marine-ebin-distribution',
  family: 'mimes-marine-habitats',
  classify: (headers) =>
    headers.some((c) => /^mimes_?id$/i.test(c.trim())) &&
    headers.some((c) => /^ebin$/i.test(c.trim())) &&
    headers.some((c) => /ebin_?ratio/i.test(c)) &&
    headers.some((c) => /ebin.*area/i.test(c)),
})
