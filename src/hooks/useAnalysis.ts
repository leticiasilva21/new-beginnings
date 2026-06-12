import { useState, useCallback } from "react"
import { fetchRates, fetchListingSellPrice } from "../lib/stays"
import { getDominantSeason } from "../lib/analysis"
import { isoDate } from "../lib/utils"
import type { Listing, PriceJump } from "../types"

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function useAnalysis() {
  const [results, setResults]   = useState<PriceJump[]>([])
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState<string | null>(null)

  const run = useCallback(
    async (listings: Listing[], baseDate: string, cmpDate: string) => {
      setLoading(true)
      setError(null)
      setResults([])
      setProgress(0)

      const out: PriceJump[] = []

      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i]
        try {
          const minFrom = baseDate < cmpDate ? baseDate : cmpDate
          const maxTo   = addDays(baseDate > cmpDate ? baseDate : cmpDate, 90)

          // Fetch rates and region in parallel
          const [seasons, regionInfo] = await Promise.all([
            fetchRates(listing.id, minFrom, maxTo),
            fetchListingSellPrice(listing.id),
          ])

          const regionId   = regionInfo?.regionId   ?? "sem-regiao"
          const regionName = regionInfo?.regionName ?? "Sem região tarifária"

          const baseSeason    = getDominantSeason(seasons, baseDate, baseDate)
          const compareSeason = getDominantSeason(seasons, cmpDate, cmpDate)

          const baseAvg    = baseSeason?.baseRateValue ?? null
          const compareAvg = compareSeason?.baseRateValue ?? null

          let diffValue: number | null   = null
          let diffPercent: number | null = null
          if (baseAvg !== null && compareAvg !== null && baseAvg > 0) {
            diffValue   = compareAvg - baseAvg
            diffPercent = ((compareAvg - baseAvg) / baseAvg) * 100
          }

          out.push({ listing, regionId, regionName, baseSeason, compareSeason, baseAvg, compareAvg, diffValue, diffPercent })
        } catch {
          out.push({
            listing,
            regionId: "sem-regiao",
            regionName: "Sem região tarifária",
            baseSeason: null,
            compareSeason: null,
            baseAvg: null,
            compareAvg: null,
            diffValue: null,
            diffPercent: null,
          })
        }

        setProgress(Math.round(((i + 1) / listings.length) * 100))
      }

      // Sort by diffPercent desc (largest jumps first), nulls last
      out.sort((a, b) => {
        if (a.diffPercent === null && b.diffPercent === null) return 0
        if (a.diffPercent === null) return 1
        if (b.diffPercent === null) return -1
        return Math.abs(b.diffPercent) - Math.abs(a.diffPercent)
      })

      setResults(out)
      setLoading(false)
    },
    []
  )

  return { run, results, loading, progress, error }
}
