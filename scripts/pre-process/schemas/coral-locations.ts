import { declareSchema } from './_template'

export const coralLocations = declareSchema({
  id: 'coral-locations',
  family: 'mimes-input-lb',
  classify: (headers) =>
    headers.length >= 2 &&
    headers.some((col) => /polygon|coral|coord|lat|lon/i.test(col)),
})
