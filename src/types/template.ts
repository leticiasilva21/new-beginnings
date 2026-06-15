export interface TemplateSeason {
  id: string
  name: string
  startMD: string      // "02-01" = Feb 1 (MM-DD)
  endMD: string        // "06-30"
  minNights: number
  multiplierPct: number
  isBase: boolean
  color: string
}

export interface RegionTemplate {
  regionId: string
  seasons: TemplateSeason[]
  savedAt: string
}
