import { declareSchema } from './_template'

export const mimesFoodwebGuildDepthIc = declareSchema({
  id: 'mimes-foodweb-guild-depth-ic',
  family: 'mimes-foodweb',
  classify: (headers) =>
    headers.some((c) => /^guild_?id$/i.test(c.trim())) &&
    headers.some((c) => /carrying capacity/i.test(c)) &&
    headers.some((c) => /ic_biomass/i.test(c)),
})
