/**
 * Asset manifest — every external file the experience loads must be listed here
 * with its origin and license. The prototype is fully procedural, so it is empty.
 */
export interface AssetEntry {
  id: string
  chapter: string
  url: string
  kind: 'glb' | 'ktx2' | 'hdr' | 'audio' | 'texture'
  source: string
  license: string
  attribution?: string
  tiers: Array<'low' | 'medium' | 'high'>
}

export const ASSETS: AssetEntry[] = []
