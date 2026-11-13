import { declareSchema } from './_template'

export const mimesCoastalBinLocation = declareSchema({
  id: 'mimes-coastal-bin-location',
  family: 'mimes-coastal',
  classify: (headers) =>
    headers.some((c) => /^polygon_?id$/i.test(c.trim())) &&
    headers.some((c) => /^bin_?id$/i.test(c.trim())) &&
    headers.some((c) => /pixel_count/i.test(c)) &&
    !headers.some((c) => /perc urban/i.test(c)) &&
    !headers.some((c) => /clade_n_pct/i.test(c)),
})
