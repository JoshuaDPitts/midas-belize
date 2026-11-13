import { declareSchema } from './_template'

export const mimesCoastalPolyConnections = declareSchema({
  id: 'mimes-coastal-poly-connections',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^id here$/i.test(c.trim())) &&
    headers.some((c) => /^id there$/i.test(c.trim())),
})
