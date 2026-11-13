import { declareSchema } from './_template'

export const mimesFoodwebGuildAttributes = declareSchema({
  id: 'mimes-foodweb-guild-attributes',
  family: 'mimes-foodweb',
  classify: (headers) =>
    headers.some((c) => /^id ?number$/i.test(c.trim())) &&
    headers.some((c) => /^common name$/i.test(c.trim())) &&
    headers.some((c) => /recruitment rate/i.test(c)),
})
