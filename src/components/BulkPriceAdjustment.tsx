import { useEffect, useState } from "react"
import { RefreshCw, Check, AlertTriangle, TrendingUp, TrendingDown, Copy } from "lucide-react"
import { cn } from "../lib/utils"
import type { Listing, Season } from "../types"
import type { RegionTemplate } from "../types/template"
import { fetchRates, updateSeasonRate } from "../lib/stays"
import { findBestMatchingSeason, effectiveRate, computeNewBaseRateValue } from "../lib/analysis"

interface Props {
  listings: Listing[]
  template: RegionTemplate
  year: number
}

type ApplyState = "idle" | "loading" | "done" | "error" | "clone"

export function BulkPriceAdjustment({ listings, template, year }: Props) {
  const [ratesMap, setRatesMap] = useState<Record<string, Season[]>>({})
  const [fetching, setFetching] = useState(false)
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<Set<string>>(new Set())
  const [direction, setDirection] = useState<"up" | "down">("up")
  const [pct, setPct] = useState<number>(5)
  const [cellState, setCellState] = useState<Record<string, ApplyState>>({})
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (listings.length === 0) return
    setFetching(true)
    const from = `${year - 1}-12-01`
    const to = `${year + 1}-03-31`
    Promise.all(
      listings.map((l) =>
        fetchRates(l.id, from, to)
          .then((s) => ({ id: l.id, seasons: s ?? [] }))
          .catch(() => ({ id: l.id, seasons: [] as Season[] }))
      )
    ).then((results) => {
      const map: Record<string, Season[]> = {}
      for (const r of results) map[r.id] = r.seasons
      setRatesMap(map)
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [listings, year])

  function toggleSeason(id: string) {
    setSelectedSeasonIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const validIds = template.seasons
      .filter((s) => s.startMD?.match(/^\d{2}-\d{2}$/) && s.endMD?.match(/^\d{2}-\d{2}$/))
      .map((s) => s.id)
    const allSelected = validIds.every((id) => selectedSeasonIds.has(id))
    setSelectedSeasonIds(allSelected ? new Set() : new Set(validIds))
  }

  const multiplier = direction === "up" ? 1 + pct / 100 : 1 - pct / 100

  function getPreview(listingId: string, seasonId: string): { current: number; next: number } | null {
    const tmpl = template.seasons.find((s) => s.id === seasonId)
    if (!tmpl) return null
    const seasons = ratesMap[listingId] ?? []
    const match = findBestMatchingSeason(seasons, tmpl, year)
    if (!match) return null
    const current = effectiveRate(match, tmpl.minNights)
    const next = Math.round(current * multiplier)
    return { current, next }
  }

  function isClone(listing: { id: string; _id: string }, seasonId: string): boolean {
    const tmpl = template.seasons.find((s) => s.id === seasonId)
    if (!tmpl) return false
    const seasons = ratesMap[listing.id] ?? []
    const match = findBestMatchingSeason(seasons, tmpl, year)
    if (!match) return false
    return match._idlisting !== listing._id
  }

  async function applyAll() {
    if (selectedSeasonIds.size === 0) return
    setApplying(true)
    for (const seasonId of selectedSeasonIds) {
      const tmpl = template.seasons.find((s) => s.id === seasonId)
      if (!tmpl) continue
      for (const listing of listings) {
        const key = `${listing.id}_${seasonId}`
        if (isClone(listing, seasonId)) {
          setCellState((prev) => ({ ...prev, [key]: "clone" }))
          continue
        }
        const seasons = ratesMap[listing.id] ?? []
        const match = findBestMatchingSeason(seasons, tmpl, year)
        if (!match) continue
        const current = effectiveRate(match, tmpl.minNights)
        const next = Math.round(current * multiplier)
        const newBase = computeNewBaseRateValue(match, tmpl.minNights, next)
        setCellState((prev) => ({ ...prev, [key]: "loading" }))
        const ok = await updateSeasonRate(match._idseason, listing.id, newBase)
        setCellState((prev) => ({ ...prev, [key]: ok ? "done" : "error" }))
      }
    }
    setApplying(false)
  }

  const selectedSeasons = template.seasons.filter((s) => selectedSeasonIds.has(s.id))
  const validSeasons = template.seasons.filter(
    (s) => s.startMD?.match(/^\d{2}-\d{2}$/) && s.endMD?.match(/^\d{2}-\d{2}$/)
  )
  const allSelected = validSeasons.length > 0 && validSeasons.every((s) => selectedSeasonIds.has(s.id))
  const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Ajuste de Preço em Massa</h2>
        <p className="text-xs text-gray-500 mt-0.5">Aplique variações percentuais a múltiplas temporadas</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Direção</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setDirection("up")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors duration-150",
                  direction === "up" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                <TrendingUp className="w-4 h-4" /> Aumentar
              </button>
              <button
                onClick={() => setDirection("down")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors duration-150",
                  direction === "down" ? "bg-red-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                <TrendingDown className="w-4 h-4" /> Diminuir
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Percentual</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.5}
                value={pct}
                onChange={(e) => setPct(Math.max(0.1, parseFloat(e.target.value) || 0))}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>

          {selectedSeasonIds.size > 0 && (
            <div className={cn(
              "px-3 py-2 rounded-lg text-sm font-semibold border",
              direction === "up" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200"
            )}>
              {direction === "up" ? "+" : "−"}{pct}% em {selectedSeasonIds.size} temporada{selectedSeasonIds.size > 1 ? "s" : ""}
            </div>
          )}

          {fetching && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
              <RefreshCw className="w-3 h-3 animate-spin" /> Carregando tarifas…
            </span>
          )}
        </div>

        {/* Season chips */}
        <div>
          <div className="flex items-center gap-3 mb-2.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Temporadas</label>
            <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              {allSelected ? "Desmarcar todas" : "Selecionar todas"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {template.seasons.map((s) => {
              const valid = !!(s.startMD?.match(/^\d{2}-\d{2}$/) && s.endMD?.match(/^\d{2}-\d{2}$/))
              const checked = selectedSeasonIds.has(s.id)
              return (
                <button
                  key={s.id}
                  disabled={!valid}
                  onClick={() => toggleSeason(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150",
                    !valid
                      ? "opacity-30 cursor-not-allowed border-gray-200 text-gray-400"
                      : checked
                      ? "border-transparent text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  )}
                  style={checked ? { backgroundColor: s.color, borderColor: s.color } : {}}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: checked ? "rgba(255,255,255,0.7)" : s.color }}
                  />
                  {s.name}
                  {s.isBase && <span className="opacity-60 ml-0.5">(base)</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview table */}
        {selectedSeasons.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Prévia do ajuste</label>
            <div className="rounded-lg border border-gray-200 overflow-x-auto">
              <table className="text-xs min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 border-r border-gray-200 w-[220px] min-w-[220px]">
                      Imóvel
                    </th>
                    {selectedSeasons.map((s) => (
                      <th key={s.id} className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-gray-100 w-[220px] min-w-[220px] max-w-[220px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-800 text-xs truncate" title={l.internalName || l.id}>
                            {l.internalName || l.id}
                          </span>
                          <div className="flex items-center gap-1 group">
                            <span className="text-[10px] text-gray-400 font-mono">{l.id}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(l.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-gray-600 transition-all shrink-0"
                              title="Copiar ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      {selectedSeasons.map((s) => {
                        const key = `${l.id}_${s.id}`
                        const cs = cellState[key]
                        const clone = isClone(l, s.id)
                        const preview = getPreview(l.id, s.id)

                        if (cs === "done") return (
                          <td key={s.id} className="py-2.5 px-4">
                            <span className="flex items-center gap-1 text-green-600 font-semibold">
                              <Check className="w-3.5 h-3.5" /> OK
                            </span>
                          </td>
                        )
                        if (cs === "loading") return (
                          <td key={s.id} className="py-2.5 px-4">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          </td>
                        )
                        if (cs === "error") return (
                          <td key={s.id} className="py-2.5 px-4 text-red-500">Erro</td>
                        )
                        if (clone) return (
                          <td key={s.id} className="py-2.5 px-4">
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <AlertTriangle className="w-3 h-3" /> Clone
                            </span>
                          </td>
                        )
                        if (!preview) return (
                          <td key={s.id} className="py-2.5 px-4 text-gray-300">—</td>
                        )
                        const diff = preview.next - preview.current
                        return (
                          <td key={s.id} className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap tabular-nums">
                              <span className="text-gray-400">{brl(preview.current)}</span>
                              <span className="text-gray-300">→</span>
                              <span className={cn("font-semibold", direction === "up" ? "text-blue-700" : "text-red-600")}>
                                {brl(preview.next)}
                              </span>
                              {diff !== 0 && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                  direction === "up" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"
                                )}>
                                  {diff > 0 ? "+" : ""}{brl(Math.abs(diff))}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Apply button */}
        {selectedSeasonIds.size > 0 && (
          <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
            <button
              onClick={applyAll}
              disabled={applying || fetching}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                direction === "up" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600"
              )}
            >
              {applying
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Aplicando…</>
                : <>{direction === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    Aplicar {direction === "up" ? "+" : "−"}{pct}% em {selectedSeasonIds.size} temporada{selectedSeasonIds.size > 1 ? "s" : ""}</>
              }
            </button>
            <span className="text-xs text-gray-400">{listings.length} imóvel{listings.length !== 1 ? "eis" : ""}</span>
          </div>
        )}
      </div>
    </div>
  )
}
