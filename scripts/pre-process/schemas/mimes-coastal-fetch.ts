import { declareSchema } from './_template'

export const mimesCoastalFetch = declareSchema({
  id: 'mimes-coastal-fetch',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^mimes_?id$/i.test(c.trim())) &&
    headers.some((c) => /^wd_?id$/i.test(c.trim())) &&
    headers.some((c) => /fetch.*_?m/i.test(c)),
})
