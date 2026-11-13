import { declareSchema } from './_template'

export const mimesCoastalLuByEbin = declareSchema({
  id: 'mimes-coastal-lu-by-ebin',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^mimes_?id$/i.test(c.trim())) &&
    headers.some((c) => /^ebin ?id$/i.test(c.trim())) &&
    headers.some((c) => /^lu_?id$/i.test(c.trim())) &&
    headers.some((c) => /^landuse$/i.test(c.trim())),
})
