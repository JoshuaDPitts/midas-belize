import { declareSchema } from './_template'

export const mimesCoastalPolyAttributes = declareSchema({
  id: 'mimes-coastal-poly-attributes',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^shapeid$/i.test(c.trim())) &&
    headers.some((c) => /^mimes_?id$/i.test(c.trim())) &&
    headers.some((c) => /area_km2/i.test(c)),
})
