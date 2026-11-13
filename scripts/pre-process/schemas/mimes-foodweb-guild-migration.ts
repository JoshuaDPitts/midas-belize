import { declareSchema } from './_template'

export const mimesFoodwebGuildMigration = declareSchema({
  id: 'mimes-foodweb-guild-migration',
  family: 'mimes-foodweb',
  classify: (headers) =>
    headers.some((c) => /horizontal migration strength/i.test(c)) &&
    headers.some((c) => /^common name$/i.test(c.trim())),
})
