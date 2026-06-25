import type { Season } from "../types"
import type { RegionTemplate, TemplateSeason } from "../types/template"

/**
 * Finds the season that contains the reference date.
 * Stays seasons use [from, to) — the `from` date is inclusive, `to` is exclusive.
 * When multiple seasons overlap (e.g. Réveillon inside Baixa T2), the most
 * specific (shortest duration) wins — so holiday seasons take priority.
 */
export function getDominantSeason(
  seasons: Season[],
  from: string,
  _to: string
): Season | null {
  if (!seasons.length) return null

  const refDay = new Date(from).getTime()
  const active = seasons.filter((s) => s.status === "active")

  // Find all seasons whose [from, to) window contains the reference day
  const matches = active.filter((s) => {
    const sStart = new Date(s.from).getTime()
    const sEnd   = new Date(s.to).getTime()
    return sStart <= refDay && sEnd > refDay
  })

  if (!matches.length) return null

  // If multiple match (overlapping seasons), pick the most specific (shortest duration)
  // This ensures Réveillon / Carnaval take priority over the surrounding base season
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
  // Guard: skip if startMD/endMD are missing or incomplete
  if (!tmpl.startMD?.match(/^\d{2}-\d{2}$/) || !tmpl.endMD?.match(/^\d{2}-\d{2}$/)) return null

  const startNum = parseInt(tmpl.startMD.replace("-", ""))
  const endNum   = parseInt(tmpl.endMD.replace("-", ""))
  const wraps    = startNum > endNum

  const tFrom = resolveDate(tmpl.startMD, year)
  const tTo   = wraps
    ? resolveDate(tmpl.endMD, year + 1)
    : resolveDate(tmpl.endMD, year)

  let best: Season | null = null
  let bestOverlap = 0
  let bestDuration = Infinity
  for (const s of seasons.filter((s) => s.status === "active")) {
    const ov = dateOverlap(s.from, s.to, tFrom, tTo)
    const dur = new Date(s.to).getTime() - new Date(s.from).getTime()
    if (ov > bestOverlap || (ov === bestOverlap && ov > 0 && dur < bestDuration)) {
      bestOverlap = ov; bestDuration = dur; best = s
    }
  }
  return best
}

// Get effective daily rate for a season at a given minNights level
export function effectiveRate(season: Season, minNights: number): number {
  const plans = (season.ratePlans ?? [])
    .filter((rp) => rp.minStay <= minNights && rp._f_val > 0)
    .sort((a, b) => b.minStay - a.minStay)
  return plans.length > 0 ? plans[0]._f_val : (season.baseRateValue ?? 0)
}

// Compute new baseRateValue so that effectiveRate(newSeason, minNights) === desiredRate
export function computeNewBaseRateValue(season: Season, minNights: number, desiredRate: number): number {
  const plans = (season.ratePlans ?? [])
    .filter((rp) => rp.minStay <= minNights && rp._f_val > 0)
    .sort((a, b) => b.minStay - a.minStay)
  if (plans.length > 0) {
    const discount = plans[0]._i_percent / 100
    return Math.round(desiredRate / (1 - discount))
  }
  return Math.round(desiredRate)
}

// Given a date "YYYY-MM-DD", find which template season contains it.
// Shorter (more specific) seasons take priority over longer ones.
export function findTemplateSeasonForDate(template: RegionTemplate, date: string): TemplateSeason | null {
  if (!template?.seasons?.length || !date) return null
  const year = parseInt(date.substring(0, 4))

  function contains(s: TemplateSeason): boolean {
    const startNum = parseInt(s.startMD.replace("-", ""))
    const endNum   = parseInt(s.endMD.replace("-", ""))
    const wraps    = startNum > endNum

    if (!wraps) {
      return date >= `${year}-${s.startMD}` && date < `${year}-${s.endMD}`
    }
    // Wraps year-end: [year-start … year+1-end) OR [prev-start … year-end)
    if (date >= `${year}-${s.startMD}` && date < `${year + 1}-${s.endMD}`) return true
    if (date >= `${year - 1}-${s.startMD}` && date < `${year}-${s.endMD}`) return true
    return false
  }

  function duration(s: TemplateSeason): number {
    const [sm, sd] = s.startMD.split("-").map(Number)
    const [em, ed] = s.endMD.split("-").map(Number)
    const a = sm * 31 + sd
    const b = em * 31 + ed
    return b >= a ? b - a : (12 * 31 + b) - a
  }

  // Sort shortest first so specific holidays override base seasons
  const sorted = [...template.seasons].sort((a, b) => duration(a) - duration(b))
  return sorted.find(contains) ?? null
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
