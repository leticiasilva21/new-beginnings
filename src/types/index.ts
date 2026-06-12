export interface RatePlan {
  minStay: number
  _i_percent: number
  _f_val: number
}

export interface Season {
  _idlisting: string
  _idseason: string
  type: "global" | "individual"
  status: "active" | "inactive"
  from: string
  to: string
  baseRateValue: number
  ratePlans: RatePlan[]
}

export interface Listing {
  _id: string
  id: string
  internalName: string
  title: string
  status: string
  region: string
}

export interface PriceJump {
  listing: Listing
  baseSeason: Season | null
  compareSeason: Season | null
  baseAvg: number | null
  compareAvg: number | null
  diffValue: number | null
  diffPercent: number | null
}
