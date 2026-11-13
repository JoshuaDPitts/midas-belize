import { declareSchema } from './_template'

export const gfwFishing = declareSchema({
  id: 'gfw-fishing',
  family: 'gfw',
  classify: (headers) =>
    headers.includes('date') && headers.includes('geartype') && headers.includes('hours'),
  incoming: {
    required: ['date', 'geartype', 'hours'],
    optional: ['vesselIDs', 'source', 'license'],
  },
})
