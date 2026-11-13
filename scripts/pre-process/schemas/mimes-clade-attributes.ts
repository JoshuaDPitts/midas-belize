import { declareSchema } from './_template'

export const mimesCladeAttributes = declareSchema({
  id: 'mimes-clade-attributes',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^clade_?id$/i.test(c.trim())) &&
    headers.some((c) => /manning n rougness/i.test(c)),
})
