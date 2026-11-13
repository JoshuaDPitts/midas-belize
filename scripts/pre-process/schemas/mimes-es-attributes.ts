import { declareSchema } from './_template'

export const mimesEsAttributes = declareSchema({
  id: 'mimes-es-attributes',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^ecosystem_?id$/i.test(c.trim())) &&
    headers.some((c) => /^ecosystem_short$/i.test(c.trim())),
})
