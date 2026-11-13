import { db, bucket } from './firebase-admin'

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('Usage: tsx scripts/pre-process/_inspect.ts <dataset_id>')
    process.exit(1)
  }
  const snap = await db.collection('datasets').doc(id).get()
  if (!snap.exists) {
    console.error(`Dataset ${id} not found`)
    process.exit(1)
  }
  const doc = snap.data()!
  console.log('─── Firestore doc ──────────────────────────────')
  console.log(`id:              ${doc.id}`)
  console.log(`status:          ${doc.status}`)
  console.log(`scope:           ${doc.scope}`)
  console.log(`visible_at:      ${JSON.stringify(doc.visible_at)}`)
  console.log(`current_version: ${doc.current_version?.version}`)
  console.log(`gcs_path:        ${doc.current_version?.gcs_path}`)
  console.log(`size_bytes:      ${doc.current_version?.size_bytes}`)
  console.log(`feature_count:   ${doc.current_version?.feature_count}`)
  console.log(`bbox:            ${JSON.stringify(doc.current_version?.bbox)}`)

  const vs = await snap.ref.collection('versions').get()
  console.log(`versions:        ${vs.size}`)

  if (doc.current_version?.gcs_path) {
    const [bytes] = await bucket.file(doc.current_version.gcs_path).download()
    const fc = JSON.parse(bytes.toString('utf-8'))
    console.log('─── GCS object ─────────────────────────────────')
    console.log(`GeoJSON type:    ${fc.type}`)
    console.log(`features:        ${fc.features?.length}`)
    const first = fc.features?.[0]
    console.log(`first.props:     ${JSON.stringify(first?.properties)}`)
    console.log(`first.geom type: ${first?.geometry?.type}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
