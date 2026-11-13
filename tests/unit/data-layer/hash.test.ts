import { describe, it, expect } from 'vitest'
import { buildVersion, sha256OfBytes } from '../../../scripts/pre-process/hash'

describe('hash + versioning', () => {
  it('sha256OfBytes is deterministic', () => {
    const a = sha256OfBytes([Buffer.from('abc'), Buffer.from('def')])
    const b = sha256OfBytes([Buffer.from('abc'), Buffer.from('def')])
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('sha256 is order-sensitive at call site — caller must pre-sort', () => {
    const a = sha256OfBytes([Buffer.from('a'), Buffer.from('b')])
    const b = sha256OfBytes([Buffer.from('b'), Buffer.from('a')])
    expect(a).not.toBe(b)
  })

  it('buildVersion produces expected shape', () => {
    const v = buildVersion('abc1234deadbeef', new Date('2026-04-22T00:00:00Z'))
    expect(v).toBe('v2026-04-22-abc1234')
  })
})
