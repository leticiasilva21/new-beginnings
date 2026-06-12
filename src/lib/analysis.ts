import type { Season } from "../types"

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
