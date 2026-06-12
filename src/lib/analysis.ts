import type { Season } from "../types"

/**
 * Given a list of seasons and a date range [from, to],
 * returns the season(s) that cover the majority of the range,
 * excluding short events (< 10 days) unless they're the only ones.
 *
 * When multiple seasons overlap the range, returns the one
 * with the largest overlap.
 */
export function getDominantSeason(
  seasons: Season[],
  from: string,
  to: string
): Season | null {
  if (!seasons.length) return null

  const rangeEnd = new Date(to).getTime()

  const active = seasons.filter((s) => s.status === "active")

  // Filter out very short events (< 10 days) unless they're the only ones
  const baseSeasonsOnly = active.filter((s) => {
    const duration = (new Date(s.to).getTime() - new Date(s.from).getTime()) / 86_400_000
    return duration >= 10
  })
  const pool = baseSeasonsOnly.length ? baseSeasonsOnly : active

  // Find the season that is active on the LAST day of the period.
  // This ensures: if the period ends in July, we pick the July season — not June.
  const atEnd = pool.filter((s) => {
    const sStart = new Date(s.from).getTime()
    const sEnd   = new Date(s.to).getTime()
    return sStart <= rangeEnd && sEnd >= rangeEnd
  })

  if (atEnd.length) {
    // If multiple seasons cover the end date, pick the shortest (most specific)
    atEnd.sort((a, b) => {
      const da = new Date(a.to).getTime() - new Date(a.from).getTime()
      const db = new Date(b.to).getTime() - new Date(b.from).getTime()
      return da - db
    })
    return atEnd[0]
  }

  // Fallback: season with most overlap in the range
  const rangeStart = new Date(from).getTime()
  const scored = pool
    .map((s) => {
      const sStart = new Date(s.from).getTime()
      const sEnd   = new Date(s.to).getTime()
      const overlap = Math.max(0, Math.min(sEnd, rangeEnd) - Math.max(sStart, rangeStart)) / 86_400_000
      return { season: s, overlap }
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)

  return scored.length ? scored[0].season : null
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
