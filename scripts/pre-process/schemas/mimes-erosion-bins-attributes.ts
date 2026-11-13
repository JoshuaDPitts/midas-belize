import { declareSchema } from './_template'

export const mimesErosionBinsAttributes = declareSchema({
  id: 'mimes-erosion-bins-attributes',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^bin_id$/i.test(c.trim())) &&
    headers.some((c) => /elev_min_m/i.test(c)) &&
    headers.some((c) => /sed.*ratio/i.test(c)),
})
