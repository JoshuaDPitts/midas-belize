import { declareSchema } from './_template'

export const mimesCoralAttributes = declareSchema({
  id: 'mimes-coral-attributes',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^coral ?id$/i.test(c.trim())) &&
    headers.some((c) => /bm dens height/i.test(c)),
})
