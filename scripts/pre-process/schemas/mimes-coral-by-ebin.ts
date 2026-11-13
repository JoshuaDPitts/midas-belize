import { declareSchema } from './_template'

export const mimesCoralByEbin = declareSchema({
  id: 'mimes-coral-by-ebin',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^ebin ?id$/i.test(c.trim())) &&
    headers.some((c) => /^coral$/i.test(c.trim())) &&
    headers.some((c) => /cover ratio/i.test(c)),
})
