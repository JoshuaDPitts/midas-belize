import { declareSchema } from './_template'

export const mimesCoastalOutsideSediments = declareSchema({
  id: 'mimes-coastal-outside-sediments',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^direction_?id$/i.test(c.trim())) &&
    headers.some((c) => /jday end month/i.test(c)) &&
    headers.some((c) => /t per day/i.test(c)),
})
