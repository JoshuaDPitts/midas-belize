import { NextRequest, NextResponse } from 'next/server'
import { db, bucket } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { NotFoundError, ValidationError } from '@/app/api/_lib/errors'
import type { CatalogEntry } from '@/lib/data/types'

interface TimeSeriesFeatureProperties {
  polygon_id: number | string
  [scenarioKey: string]: unknown
}

type ScenarioTimeSeries = Record<string, number>

function isScenarioTimeSeries(value: unknown): value is ScenarioTimeSeries {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const GET = withRouteHandler<{ dataset: string }>(async (req: NextRequest, ctx) => {
  const { dataset: datasetId } = await ctx.params
  const scenario = req.nextUrl.searchParams.get('scenario')
  const metric = req.nextUrl.searchParams.get('metric')
  if (!scenario || !metric) {
    throw new ValidationError('Missing required query params: scenario, metric')
  }

  const snap = await db.collection('datasets').doc(datasetId).get()
  if (!snap.exists) throw new NotFoundError(`dataset ${datasetId} not found`)
  const entry = snap.data() as CatalogEntry
  if (entry.status !== 'published' || !entry.current_version) {
    throw new NotFoundError(`dataset ${datasetId} is not published`)
  }

  const [bytes] = await bucket.file(entry.current_version.gcs_path).download()
  const fc = JSON.parse(bytes.toString('utf-8')) as {
    features: Array<{ properties: TimeSeriesFeatureProperties }>
  }
  if (!fc.features?.length) throw new NotFoundError('dataset has no features')

  const firstWithScenario = fc.features.find((f) => isScenarioTimeSeries(f.properties?.[scenario]))
  if (!firstWithScenario) {
    throw new NotFoundError(`scenario ${scenario} not found in dataset`)
  }
  const scenarioSeries = firstWithScenario.properties[scenario] as ScenarioTimeSeries
  const time_axis = Object.keys(scenarioSeries).sort()

  const polygons = fc.features
    .filter((f) => isScenarioTimeSeries(f.properties?.[scenario]))
    .map((f) => {
      const series = f.properties[scenario] as ScenarioTimeSeries
      return {
        polygon_id: f.properties.polygon_id,
        values: time_axis.map((t) => series[t] ?? null),
      }
    })

  return NextResponse.json(
    {
      dataset_id: entry.id,
      scenario,
      metric,
      time_axis,
      polygons,
      provenance: entry.provenance,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    },
  )
})
