import { declareSchema } from './_template'

export const mimesMangroveAttributes = declareSchema({
  id: 'mimes-mangrove-attributes',
  family: 'mimes-input-habitats',
  classify: (headers) =>
    headers.some((c) => /^species_id$/i.test(c.trim())) &&
    headers.some((c) => /^bin_id$/i.test(c.trim())) &&
    headers.some((c) => /ratio_bgb_agb/i.test(c)),
})
