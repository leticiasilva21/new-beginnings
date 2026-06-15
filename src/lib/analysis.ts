import type { Season } from "../types"
import type { TemplateSeason } from "../types/template"

/**
 * Finds the season that contains the first day of the given period.
 * Stays seasons use [from, to) — the `from` date is inclusive, `to` is exclusive.
 * Short events (< 10 days) are ignored unless they're the only ones available.
 */
export function getDominantSeason(
  seasons: Season[],
  from: string,
  _to: string
): Season | null {
  if (!seasons.length) return null

  const refDay = new Date(from).getTime()

  const active = seasons.filter((s) => s.status === "active")

  // Ignore very short events (< 10 days) — they're point events like Reveillon
  const baseSeasonsOnly = active.filter((s) => {
    const duration = (new Date(s.to).getTime() - new Date(s.from).getTime()) / 86_400_000
    return duration >= 10
  })
  const pool = baseSeasonsOnly.length ? baseSeasonsOnly : active

  // Find the season whose [from, to) window contains the reference day
  const matches = pool.filter((s) => {
    const sStart = new Date(s.from).getTime()
    const sEnd   = new Date(s.to).getTime()
    return sStart <= refDay && sEnd > refDay
  })

  if (!matches.length) return null

  // If multiple match (overlapping seasons), pick the most specific (shortest duration)
  matches.sort((a, b) => {
    const da = new Date(a.to).getTime() - new Date(a.from).getTime()
    const db = new Date(b.to).getTime() - new Date(b.from).getTime()
    return da - db
  })

  return matches[0]
}

// Resolve "MM-DD" to "YYYY-MM-DD" for a given year
export function resolveDate(md: string, year: number): string {
  return `${year}-${md}`
}

// Overlap in days between [from1, to1) and [from2, to2)
export function dateOverlap(from1: string, to1: string, from2: string, to2: string): number {
  const a = Math.max(new Date(from1).getTime(), new Date(from2).getTime())
  const b = Math.min(new Date(to1).getTime(), new Date(to2).getTime())
  return Math.max(0, (b - a) / 86_400_000)
}

// Find Stays season with most overlap with the template season (for a given year)
export function findBestMatchingSeason(seasons: Season[], tmpl: TemplateSeason, year: number): Season | null {
  const startNum = parseInt(tmpl.startMD.replace("-", ""))
  const endNum   = parseInt(tmpl.endMD.replace("-", ""))
  const wraps    = startNum > endNum

  const tFrom = resolveDate(tmpl.startMD, year)
  const tTo   = wraps
    ? resolveDate(tmpl.endMD, year + 1)
    : resolveDate(tmpl.endMD, year)

  let best: Season | null = null
  let bestOverlap = 0
  for (const s of seasons.filter((s) => s.status === "active")) {
    const ov = dateOverlap(s.from, s.to, tFrom, tTo)
    if (ov > bestOverlap) { bestOverlap = ov; best = s }
  }
  return best
}

// Get effective daily rate for a season at a given minNights level
export function effectiveRate(season: Season, minNights: number): number {
  const plans = season.ratePlans
    .filter((rp) => rp.minStay <= minNights && rp._f_val > 0)
    .sort((a, b) => b.minStay - a.minStay)
  return plans.length > 0 ? plans[0]._f_val : season.baseRateValue
}

// Compute new baseRateValue so that effectiveRate(newSeason, minNights) === desiredRate
export function computeNewBaseRateValue(season: Season, minNights: number, desiredRate: number): number {
  const plans = season.ratePlans
    .filter((rp) => rp.minStay <= minNights && rp._f_val > 0)
    .sort((a, b) => b.minStay - a.minStay)
  if (plans.length > 0) {
    const discount = plans[0]._i_percent / 100
    return Math.round(desiredRate / (1 - discount))
  }
  return Math.round(desiredRate)
}

/**
 * Simple average of all base rates weighted by season overlap in the range.
 */
export function weightedAvgRate(
  seasons: Season[],
  from: string,
  to: string
): number | null {
  const dominant = getDominantSeason(seasons, from, to)
  return dominant ? dominant.baseRateValue : null
}
