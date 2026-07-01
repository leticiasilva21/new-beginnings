import { useEffect, useState } from "react"
import { Check, RefreshCw, Copy } from "lucide-react"
import type { Listing, Season } from "../types"
import type { RegionTemplate } from "../types/template"
import { fetchRates, updateSeasonRate } from "../lib/stays"
import { findBestMatchingSeason, effectiveRate, computeNewBaseRateValue } from "../lib/analysis"
import { cn } from "../lib/utils"

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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center gap-2 text-gray-400 py-16">
        <RefreshCw className="w-4 h-4 animate-spin text-navy" />
        <span className="text-sm">Carregando tarifas…</span>
      </div>
    )
  }

  const brl = (v: number | null | undefined) =>
    v == null ? "—" : `R$ ${v.toLocaleString("pt-BR")}`

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Tabela de Preços</h2>
        <p className="text-xs text-gray-500 mt-0.5">Tarifas atuais vs. template por temporada</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[160px]">
                Temporada
              </th>
              {listings.map((l) => (
                <th key={l.id} className="py-3 px-4 text-left w-[140px] min-w-[140px] max-w-[140px]">
                  <div className="group w-full overflow-hidden">
                    <div className="text-xs font-medium text-gray-700 truncate w-full" title={l.internalName || l.id}>
                      {l.internalName || l.id}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono text-[10px] text-gray-400 truncate">{l.id}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(l.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-gray-600 transition-all shrink-0"
                        title="Copiar ID"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {template.seasons.map((tmpl, idx) => (
              <tr key={tmpl.id} className={tmpl.isBase ? "bg-navy-light/30" : "hover:bg-gray-50 transition-colors"}>
                <td className="py-3 px-4 sticky left-0 bg-inherit border-r border-gray-100 font-medium text-gray-800 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-gray-400" />
                    <span className="text-xs">{tmpl.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-normal">{tmpl.minNights}n</span>
                  </div>
                </td>
                {listings.map((l) => {
                  const key = `${l.id}_${tmpl.id}`
                  const cs = cellState[key] ?? "idle"
                  const seasons = ratesMap[l.id] ?? []

                  if (!tmpl.startMD?.match(/^\d{2}-\d{2}$/) || !tmpl.endMD?.match(/^\d{2}-\d{2}$/)) {
                    return <td key={l.id} className="py-3 px-4 text-gray-300">—</td>
                  }

                  const targetSeason = findBestMatchingSeason(seasons, tmpl, year)
                  const baseRate = getBaseRate(l.id)

                  if (!targetSeason || baseRate === null) {
                    return <td key={l.id} className="py-3 px-4 text-gray-300">—</td>
                  }

                  const current = effectiveRate(targetSeason, tmpl.minNights) ?? 0
                  const expected = Math.round((baseRate ?? 0) * (tmpl.multiplierPct ?? 100) / 100)
                  const diff = expected - current
                  const diffPct = current > 0 ? Math.round((diff / current) * 100) : 0

                  if (cs === "done") return (
                    <td key={l.id} className="py-3 px-4">
                      <span className="flex items-center gap-1 text-green-600 font-semibold text-xs">
                        <Check className="w-3.5 h-3.5" /> OK
                      </span>
                    </td>
                  )
                  if (cs === "loading") return (
                    <td key={l.id} className="py-3 px-4">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-navy/60" />
                    </td>
                  )
                  if (cs === "error") return (
                    <td key={l.id} className="py-3 px-4 text-red-500 text-xs">Erro</td>
                  )

                  return (
                    <td key={l.id} className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap tabular-nums">
                        <span className="text-gray-400 text-xs">{brl(current)}</span>
                        <span className="text-gray-300">→</span>
                        <span className={cn(
                          "text-xs font-semibold",
                          diff > 0 ? "text-green-700" : diff < 0 ? "text-red-600" : "text-gray-600"
                        )}>
                          {brl(expected)}
                        </span>
                        {diff !== 0 && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            diff > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {diff > 0 ? "+" : ""}{diffPct}%
                          </span>
                        )}
                        <button
                          onClick={() => approveCell(l.id, idx)}
                          className="ml-0.5 p-0.5 text-gray-300 hover:text-navy transition-colors"
                          title="Aprovar"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  )
                })}
                <td className="py-3 px-4">
                  <button
                    onClick={() => approveRow(idx)}
                    className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Aprovar linha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
