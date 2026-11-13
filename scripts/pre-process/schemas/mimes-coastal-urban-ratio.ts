import { declareSchema } from './_template'

export const mimesCoastalUrbanRatio = declareSchema({
  id: 'mimes-coastal-urban-ratio',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^polygon_?id$/i.test(c.trim())) &&
    headers.some((c) => /perc urban/i.test(c)) &&
    headers.some((c) => /ratio urban/i.test(c)),
})
