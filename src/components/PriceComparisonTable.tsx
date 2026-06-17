import { useEffect, useState } from "react"
import { Check, RefreshCw } from "lucide-react"
import type { Listing, Season } from "../types"
import type { RegionTemplate } from "../types/template"
import { fetchRates, updateSeasonRate } from "../lib/stays"
import { findBestMatchingSeason, effectiveRate, computeNewBaseRateValue } from "../lib/analysis"

interface Props {
  regionId: string
  listings: Listing[]
  template: RegionTemplate
  year: number
}

type CellState = "idle" | "loading" | "done" | "error"

export function PriceComparisonTable({ listings, template, year }: Props) {
  const [ratesMap, setRatesMap] = useState<Record<string, Season[]>>({})
  const [fetching, setFetching] = useState(false)
  const [cellState, setCellState] = useState<Record<string, CellState>>({})

  useEffect(() => {
    if (listings.length === 0) return
    setFetching(true)
    const from = `${year - 1}-12-01`
    const to = `${year + 1}-03-31`

    Promise.all(
      listings.map((l) =>
        fetchRates(l.id, from, to)
          .then((seasons) => ({ id: l.id, seasons: seasons ?? [] }))
          .catch(() => ({ id: l.id, seasons: [] as Season[] }))
      )
    ).then((results) => {
      const map: Record<string, Season[]> = {}
      for (const r of results) map[r.id] = r.seasons
      setRatesMap(map)
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [listings, year])

  // Find base season template
  const baseTmpl = template.seasons.find((s) => s.isBase)

  function getBaseRate(listingId: string): number | null {
    if (!baseTmpl) return null
    const seasons = ratesMap[listingId] ?? []
    const baseSeason = findBestMatchingSeason(seasons, baseTmpl, year)
    if (!baseSeason) return null
    return effectiveRate(baseSeason, 2)
  }

  async function approveRow(seasonIdx: number) {
    const tmpl = template.seasons[seasonIdx]
    for (const listing of listings) {
      const key = `${listing.id}_${tmpl.id}`
      const seasons = ratesMap[listing.id] ?? []
      const targetSeason = findBestMatchingSeason(seasons, tmpl, year)
      const baseRate = getBaseRate(listing.id)
      if (!targetSeason || baseRate === null) continue
      const expected = Math.round(baseRate * tmpl.multiplierPct / 100)
      setCellState((prev) => ({ ...prev, [key]: "loading" }))
      const newBase = computeNewBaseRateValue(targetSeason, tmpl.minNights, expected)
      const ok = await updateSeasonRate(targetSeason._idseason, listing.id, newBase)
      setCellState((prev) => ({ ...prev, [key]: ok ? "done" : "error" }))
    }
  }

  async function approveCell(listingId: string, seasonIdx: number) {
    const tmpl = template.seasons[seasonIdx]
    const key = `${listingId}_${tmpl.id}`
    const seasons = ratesMap[listingId] ?? []
    const targetSeason = findBestMatchingSeason(seasons, tmpl, year)
    const baseRate = getBaseRate(listingId)
    if (!targetSeason || baseRate === null) return
    const expected = Math.round(baseRate * tmpl.multiplierPct / 100)
    setCellState((prev) => ({ ...prev, [key]: "loading" }))
    const newBase = computeNewBaseRateValue(targetSeason, tmpl.minNights, expected)
    const ok = await updateSeasonRate(targetSeason._idseason, listingId, newBase)
    setCellState((prev) => ({ ...prev, [key]: ok ? "done" : "error" }))
  }

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-10 justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-orange-400" />
        <span className="text-sm">Carregando tarifas…</span>
      </div>
    )
  }

  const brl = (v: number | null | undefined) =>
    v == null ? "—" : `R$ ${v.toLocaleString("pt-BR")}`

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="text-xs min-w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2 px-3 text-left text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white">
              Temporada
            </th>
            {listings.map((l) => (
              <th key={l.id} className="py-2 px-3 text-left text-gray-500 font-semibold truncate max-w-[120px]">
                {(l.internalName || l.id).slice(0, 18)}
              </th>
            ))}
            <th className="py-2 px-3 text-left text-gray-500 font-semibold">Ação</th>
          </tr>
        </thead>
        <tbody>
          {template.seasons.map((tmpl, idx) => (
            <tr key={tmpl.id} className={tmpl.isBase ? "bg-orange-50" : "hover:bg-gray-50"}>
              <td className="py-2 px-3 sticky left-0 bg-inherit font-medium text-gray-800 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tmpl.color }} />
                  <span>{tmpl.name}</span>
                  <span className="ml-1 bg-gray-100 text-gray-500 px-1 rounded">{tmpl.minNights}n</span>
                </div>
              </td>
              {listings.map((l) => {
                const key = `${l.id}_${tmpl.id}`
                const cs = cellState[key] ?? "idle"
                const seasons = ratesMap[l.id] ?? []

                // Guard against invalid template season data during editing
                if (!tmpl.startMD?.match(/^\d{2}-\d{2}$/) || !tmpl.endMD?.match(/^\d{2}-\d{2}$/)) {
                  return <td key={l.id} className="py-2 px-3 text-gray-300">—</td>
                }

                const targetSeason = findBestMatchingSeason(seasons, tmpl, year)
                const baseRate = getBaseRate(l.id)

                if (!targetSeason || baseRate === null) {
                  return <td key={l.id} className="py-2 px-3 text-gray-300">—</td>
                }

                const current = effectiveRate(targetSeason, tmpl.minNights) ?? 0
                const expected = Math.round((baseRate ?? 0) * (tmpl.multiplierPct ?? 100) / 100)
                const diff = expected - current
                const diffPct = current > 0 ? Math.round((diff / current) * 100) : 0

                if (cs === "done") {
                  return (
                    <td key={l.id} className="py-2 px-3">
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> OK
                      </span>
                    </td>
                  )
                }
                if (cs === "loading") {
                  return <td key={l.id} className="py-2 px-3"><RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" /></td>
                }
                if (cs === "error") {
                  return <td key={l.id} className="py-2 px-3 text-red-500 text-xs">Erro</td>
                }

                return (
                  <td key={l.id} className="py-2 px-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-gray-400">{brl(current)}</span>
                      <span className="text-gray-300">→</span>
                      <span className={diff > 0 ? "text-green-700 font-semibold" : diff < 0 ? "text-orange-600 font-semibold" : "text-gray-600"}>
                        {brl(expected)}
                      </span>
                      {diff !== 0 && (
                        <span className={`text-xs px-1 rounded font-medium ${diff > 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {diff > 0 ? "+" : ""}{diffPct}%
                        </span>
                      )}
                      <button
                        onClick={() => approveCell(l.id, idx)}
                        className="ml-1 p-0.5 text-gray-400 hover:text-green-600 transition-colors"
                        title="Aprovar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )
              })}
              <td className="py-2 px-3">
                <button
                  onClick={() => approveRow(idx)}
                  className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Aprovar linha
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
