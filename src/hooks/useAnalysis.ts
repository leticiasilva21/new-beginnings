import { useState, useCallback } from "react"
import { fetchRates } from "../lib/stays"
import { getDominantSeason } from "../lib/analysis"
import type { Listing, PriceJump } from "../types"

export function useAnalysis() {
  const [results, setResults]   = useState<PriceJump[]>([])
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState<string | null>(null)

  const run = useCallback(
    async (
      listings: Listing[],
      baseFrom: string,
      baseTo: string,
      cmpFrom: string,
      cmpTo: string
    ) => {
      setLoading(true)
      setError(null)
      setResults([])
      setProgress(0)

      const out: PriceJump[] = []

      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i]
        try {
          // Fetch a wide window covering both periods at once
          const minFrom = baseFrom < cmpFrom ? baseFrom : cmpFrom
          const maxTo   = baseTo > cmpTo ? baseTo : cmpTo

          const seasons = await fetchRates(listing.id, minFrom, maxTo)

          const baseSeason    = getDominantSeason(seasons, baseFrom, baseTo)
          const compareSeason = getDominantSeason(seasons, cmpFrom, cmpTo)

          const baseAvg    = baseSeason?.baseRateValue ?? null
          const compareAvg = compareSeason?.baseRateValue ?? null

          let diffValue: number | null   = null
          let diffPercent: number | null = null
          if (baseAvg !== null && compareAvg !== null && baseAvg > 0) {
            diffValue   = compareAvg - baseAvg
            diffPercent = ((compareAvg - baseAvg) / baseAvg) * 100
          }

          out.push({ listing, baseSeason, compareSeason, baseAvg, compareAvg, diffValue, diffPercent })
        } catch {
          out.push({
            listing,
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
