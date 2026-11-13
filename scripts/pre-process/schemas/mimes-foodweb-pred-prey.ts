import { declareSchema } from './_template'

export const mimesFoodwebPredPrey = declareSchema({
  id: 'mimes-foodweb-pred-prey',
  family: 'mimes-foodweb',
  classify: (headers) =>
    headers.some((c) => /^predator id$/i.test(c.trim())) &&
    headers.some((c) => /^prey id$/i.test(c.trim())),
})
