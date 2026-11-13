import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { rebuildVisibleAt } from '../../../scripts/pre-process/rebuild-visible-at'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

describe('rebuildVisibleAt', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const snap = await getFirestore().collection('datasets').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  async function seed(
    id: string,
    scope: 'site' | 'multi-site' | 'national',
    sites: string[],
    visible_at: string[],
  ) {
    await getFirestore().collection('datasets').doc(id).set({
      id,
      layer: id,
      title: id,
      description: id,
      family: 'x',
      schema_id: 'x',
      schema_version: 1,
      scope,
      sites,
      visible_at,
      tags: [],
      current_version: null,
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      status: 'awaiting-provenance',
      last_upstream_mtime: Timestamp.now(),
      last_processed_at: Timestamp.now(),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
  }

  it('expands national visible_at to every ACTIVE site', async () => {
    await seed('national-ds', 'national', [], ['placencia', 'caye-caulker'])
    await seed('site-ds', 'site', ['placencia'], ['placencia'])

    const result = await rebuildVisibleAt()
    expect(result.updated).toBe(1)
    expect(result.scanned).toBe(2)

    const nat = (await getFirestore().collection('datasets').doc('national-ds').get()).data()!
    expect(nat.visible_at.sort()).toEqual(['caye-caulker', 'laughing-bird', 'placencia'])

    const site = (await getFirestore().collection('datasets').doc('site-ds').get()).data()!
    expect(site.visible_at).toEqual(['placencia'])
  })

  it('is a no-op when visible_at is already correct across families', async () => {
    await seed('national-ds', 'national', [], ['placencia', 'caye-caulker', 'laughing-bird'])
    await seed('site-ds', 'site', ['placencia'], ['placencia'])
    await seed('multi-ds', 'multi-site', ['placencia', 'laughing-bird'], ['placencia', 'laughing-bird'])

    const result = await rebuildVisibleAt()
    expect(result.updated).toBe(0)
    expect(result.scanned).toBe(3)
  })

  it('treats visible_at order as insignificant — set equality not array equality', async () => {
    await seed(
      'national-ds',
      'national',
      [],
      ['laughing-bird', 'caye-caulker', 'placencia'],
    )
    const result = await rebuildVisibleAt()
    expect(result.updated).toBe(0)
  })

  it('fixes a drifted multi-site visible_at to match its sites array', async () => {
    await seed('multi-ds', 'multi-site', ['placencia', 'laughing-bird'], ['placencia'])
    const result = await rebuildVisibleAt()
    expect(result.updated).toBe(1)
    const doc = (await getFirestore().collection('datasets').doc('multi-ds').get()).data()!
    expect(doc.visible_at.sort()).toEqual(['laughing-bird', 'placencia'])
  })
})
