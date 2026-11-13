import type { CatalogEntry } from '@/lib/data/types'

/**
 * HTTP header values must be ISO-8859-1 / ByteString in the fetch spec;
 * Node's Response constructor throws when any char code > 255 lands in
 * a header. Real provenance strings from the MIMES/MIDAS catalog use
 * em dashes, curly quotes, and accented characters. We encode ALL
 * provenance header values via encodeURIComponent and the client
 * fetcher decodes them.
 */
export function provenanceHeaders(entry: CatalogEntry): Record<string, string> {
  const prov = entry.provenance
  const v = entry.current_version
  return {
    'X-Dataset-Source': encodeURIComponent(prov.source),
    'X-Dataset-License': encodeURIComponent(prov.license),
    'X-Dataset-Citation': encodeURIComponent(prov.citation),
    'X-Dataset-Version': v?.version ?? '',
  }
}
