import { declareSchema } from './_template'

export const mimesCoverByEbin = declareSchema({
  id: 'mimes-cover-by-ebin',
  family: 'mimes-marine-habitats',
  classify: (headers) =>
    headers.some((c) => /^ebin$/i.test(c.trim())) &&
    headers.some((c) => /^eco_?id$/i.test(c.trim())) &&
    headers.some((c) => /ebin ratio/i.test(c)),
})
