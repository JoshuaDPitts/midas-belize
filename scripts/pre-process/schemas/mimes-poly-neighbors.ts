import { declareSchema } from './_template'

export const mimesPolyNeighbors = declareSchema({
  id: 'mimes-poly-neighbors',
  family: 'mimes-marine-topology',
  classify: (headers) =>
    headers.some((c) => /^poly_?id$/i.test(c.trim())) &&
    headers.some((c) => /^neighbou?r_?id$/i.test(c.trim())),
})
