import { declareSchema } from './_template'

export const gfwPresence = declareSchema({
  id: 'gfw-presence',
  family: 'gfw',
  classify: (headers) =>
    headers.includes('date') && headers.includes('flag') && headers.includes('hours'),
  incoming: {
    required: ['date', 'flag', 'hours'],
    optional: ['vesselIDs', 'source', 'license'],
  },
})
