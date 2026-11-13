import { declareSchema } from './_template'

export const mimesEcosysByElevbin = declareSchema({
  id: 'mimes-ecosys-by-elevbin',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^elevbin_?id$/i.test(c.trim())) &&
    headers.some((c) => /^ecosystem_?id$/i.test(c.trim())) &&
    headers.some((c) => /^arearatio$/i.test(c.trim())),
})
