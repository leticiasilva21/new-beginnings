import type { Season } from "../types"
import type { RegionTemplate, TemplateSeason } from "../types/template"
import type { StaysSeasonDetail } from "./stays"
import { dateOverlap, effectiveRate } from "./analysis"

// Lowercase, no accents, no "1/10" prefix, no parentheses, no years
export function normalizeName(name: string): string {
  let s = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  s = s.replace(/\([^)]*\)/g, " ")
  s = s.replace(/^\s*(\d+\s*[/-]?\s*)+/, "")
  s = s.replace(/\b(19|20)\d\d\b/g, " ")
  return s.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

// Display name without the Stays "1/10 " ordering prefix
export function cleanName(name: string): string {
  return name.replace(/^\s*(\d+\s*\/\s*\d+\s*)+/, "").trim()
}

// Stays events whose names differ from the default template names
const ALIASES: Record<string, RegExp> = {
  "season-carnaval":      /\bcarnaval\b/,
  "season-semanasanta":   /\bsemana santa\b|\bpascoa\b|\bsexta feira santa\b/,
  "season-tiradentes":    /\btiradentes\b/,
  "season-trabalho":      /\bdia do trabalh/,
  "season-maes":          /\bdia das maes\b/,
  "season-namorados":     /\bnamorados\b/,
  "season-corpus":        /\bcorpus c/,
  "season-saojoao":       /^sao joao\b/,
  "season-fortal":        /\bfortal\b/,
  "season-pais":          /\bdia dos pais\b/,
  "season-independencia": /^independencia( do brasil)?\b(?! da bahia)/,
  "season-aparecida":     /\baparecida\b|\bpadroeira do br/,
  "season-finados":       /\bfinados\b/,
  "season-proclamacao":   /\bproclamacao\b|\brepublica proclamacao\b/,
  "season-natal":         /^natal\b/,
  "season-reveillon":     /\breveillon\b|\bano novo\b/,
  "season-carnatal":      /\bcarnatal\b/,
}

// Long periods (alta/baixa, veraneio, meses) are covered by the base seasons, not holidays
const SEASONAL = /\btemporada\b|\bveraneio\b|\bverao\b|^(janeiro|julho|dezembro)\b/

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function nameMatches(tmpl: TemplateSeason, eventKey: string): boolean {
  const alias = ALIASES[tmpl.id]
  if (alias) return alias.test(eventKey)
  const tKey = normalizeName(tmpl.name)
  return tKey.length > 0 && new RegExp(`\\b${escapeRe(tKey)}\\b`).test(eventKey)
}

function templateWindow(tmpl: TemplateSeason, year: number): [string, string] | null {
  if (!tmpl.startMD?.match(/^\d{2}-\d{2}$/) || !tmpl.endMD?.match(/^\d{2}-\d{2}$/)) return null
  const wraps = tmpl.endMD < tmpl.startMD
  return [`${year}-${tmpl.startMD}`, `${wraps ? year + 1 : year}-${tmpl.endMD}`]
}

// Same period as a non-base template season (e.g. an event added earlier under another name)
function datesMatch(tmpl: TemplateSeason, from: string, to: string): boolean {
  if (tmpl.isBase) return false
  const eDur = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
  const year = parseInt(from.substring(0, 4))
  for (const y of [year - 1, year]) {
    const w = templateWindow(tmpl, y)
    if (!w) continue
    const tDur = Math.max(1, (new Date(w[1]).getTime() - new Date(w[0]).getTime()) / 86_400_000)
    // Must be similarly short too, so a 5-month base season never "covers" a holiday
    if (dateOverlap(from, to, w[0], w[1]) / Math.sqrt(eDur * tDur) >= 0.7) return true
  }
  return false
}

export interface UnmappedEvent {
  key: string
  staysSeasonId: string
  name: string
  from: string
  to: string
  minNights: number
  // Current Stays price of the event vs. the listing's low-season rate (median over the region)
  currentJumpPct: number | null
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// The Stays minimum stay is the first rate plan without a discount/markup
function staysMinNights(d: StaysSeasonDetail): number {
  const plans = [...(d.ratePlans ?? [])].sort((a, b) => a.minStay - b.minStay)
  return (plans.find((p) => p._i_percent === 0) ?? plans[0])?.minStay ?? 2
}

export function findUnmappedEvents(
  template: RegionTemplate,
  details: StaysSeasonDetail[],
  ratesMap: Record<string, Season[]>,
  baseRateOf: (listingId: string) => number | null,
  year: number
): UnmappedEvent[] {
  const byKey = new Map<string, UnmappedEvent>()
  const events = details
    .filter((d) => d.type === "event" && d.status === "active")
    .filter((d) => d.from >= `${year}-01-01` && d.from < `${year + 1}-01-01`)
    .sort((a, b) => a.from.localeCompare(b.from))

  for (const d of events) {
    const key = normalizeName(d.name)
    if (!key || SEASONAL.test(key) || byKey.has(key)) continue
    if (template.seasons.some((t) => nameMatches(t, key) || datesMatch(t, d.from, d.to))) continue

    const jumps: number[] = []
    for (const [listingId, seasons] of Object.entries(ratesMap)) {
      const s = seasons.find((x) => x._idseason === d._id)
      const base = baseRateOf(listingId)
      if (!s || !base) continue
      jumps.push((effectiveRate(s, staysMinNights(d)) / base) * 100)
    }
    const m = median(jumps)

    byKey.set(key, {
      key,
      staysSeasonId: d._id,
      name: cleanName(d.name),
      from: d.from,
      to: d.to,
      minNights: staysMinNights(d),
      currentJumpPct: m === null ? null : Math.round(m),
    })
  }
  return [...byKey.values()]
}
