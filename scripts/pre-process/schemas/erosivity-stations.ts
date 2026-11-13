import { declareSchema } from './_template'

export const erosivityStations = declareSchema({
  id: 'erosivity-stations',
  family: 'erosivity',
  classify: (headers) => headers.includes('station_id') && headers.includes('r_factor'),
  incoming: {
    required: ['station_id', 'r_factor'],
    optional: ['lat', 'lon', 'elevation', 'source', 'license'],
  },
})
