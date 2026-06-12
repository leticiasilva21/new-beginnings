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

  const rangeStart = new Date(from).getTime()
  const rangeEnd   = new Date(to).getTime()

  const active = seasons.filter((s) => s.status === "active")

  // Score each season by how many days it overlaps with the requested range
  const scored = active
    .map((s) => {
      const sStart  = new Date(s.from).getTime()
      const sEnd    = new Date(s.to).getTime()
      const overlap =
        Math.max(0, Math.min(sEnd, rangeEnd) - Math.max(sStart, rangeStart)) /
        86_400_000
      const duration = (sEnd - sStart) / 86_400_000
      return { season: s, overlap, duration }
    })
    .filter((x) => x.overlap > 0)

  if (!scored.length) return null

  // Prefer seasons that aren't very short events (< 10 days) if others exist
  const baseOnly = scored.filter((x) => x.duration >= 10)
  const pool = baseOnly.length ? baseOnly : scored

  // Pick the one with the most overlap days
  pool.sort((a, b) => b.overlap - a.overlap)
  return pool[0].season
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
