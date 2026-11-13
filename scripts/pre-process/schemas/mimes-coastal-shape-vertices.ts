import { declareSchema } from './_template'

export const mimesCoastalShapeVertices = declareSchema({
  id: 'mimes-coastal-shape-vertices',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^shapeid$/i.test(c.trim())) &&
    headers.some((c) => /^partid$/i.test(c.trim())) &&
    headers.some((c) => /^x$/i.test(c.trim())) &&
    headers.some((c) => /^y$/i.test(c.trim())),
})
