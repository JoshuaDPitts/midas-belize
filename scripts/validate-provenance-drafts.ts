import fs from 'node:fs'
import path from 'node:path'
import { ProvenanceFileSchema } from './pre-process/provenance-schema'

const ROOT = 'scripts/pre-process/provenance'
const DIRS = [
  'national',
  'placencia',
  'cayecaulker',
  'laughingbird',
  'multi-site',
  'input-timeseries',
] as const

function stripInternal(raw: Record<string, unknown>): Record<string, unknown> {
  const { _target_path: _ignored, ...rest } = raw
  return rest
}

let ready = 0
let gated = 0
const issues: Array<{ file: string; reasons: string[] }> = []

for (const dir of DIRS) {
  const full = path.join(ROOT, dir)
  for (const name of fs.readdirSync(full).sort()) {
    if (!name.endsWith('.provenance.json')) continue
    const filePath = path.join(full, name)
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (err) {
      issues.push({ file: filePath, reasons: [`parse error: ${(err as Error).message}`] })
      continue
    }
    const parsed = ProvenanceFileSchema.safeParse(
      stripInternal(raw as Record<string, unknown>),
    )
    if (parsed.success) {
      ready++
    } else {
      gated++
      issues.push({
        file: filePath,
        reasons: parsed.error.issues.map(
          (i) => `${i.path.join('.') || '<root>'}: ${i.message}`,
        ),
      })
    }
  }
}

console.log(`✅ Ready (validates clean): ${ready}`)
console.log(`⚠️  User-gated: ${gated}`)
console.log(`Total: ${ready + gated}`)
if (issues.length) {
  console.log(`\nPer-file reasons:`)
  for (const { file, reasons } of issues) {
    const short = file.replace(/.*\/provenance\//, '')
    console.log(`  ${short}`)
    for (const r of reasons) console.log(`    - ${r}`)
  }
}
