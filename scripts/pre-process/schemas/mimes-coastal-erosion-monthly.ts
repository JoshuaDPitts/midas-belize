import { declareSchema } from './_template'

export const mimesCoastalErosionMonthly = declareSchema({
  id: 'mimes-coastal-erosion-monthly',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^mimes_?id$/i.test(c.trim())) &&
    headers.some((c) => /^t per (month|day)$/i.test(c.trim())) &&
    headers.some((c) => /jday/i.test(c)),
})
