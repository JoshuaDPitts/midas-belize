import { declareSchema } from './_template'

export const mimesCoralMortality = declareSchema({
  id: 'mimes-coral-mortality',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^coral ?id$/i.test(c.trim())) &&
    headers.some((c) => /^mort cause ?id$/i.test(c.trim())),
})
