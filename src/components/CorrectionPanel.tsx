import { useState } from "react"
import { CheckCircle, ChevronDown, ChevronRight, Loader2, AlertTriangle } from "lucide-react"
import { cn, fmtBRL, fmtPct } from "../lib/utils"
import { updateSeasonRate } from "../lib/stays"
import type { PriceJump } from "../types"

interface Props {
  results: PriceJump[]
}

// State per listing
interface ListingState {
  applying: boolean
  done: boolean
  error: boolean
}

export function CorrectionPanel({ results }: Props) {
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set())
  const [targetPct,    setTargetPct]    = useState<Record<string, string>>({})   // regionId → pct string
  const [listingState, setListingState] = useState<Record<string, ListingState>>({}) // listingId → state

  // Group results by region — only those with both seasons
  const regionMap = new Map<string, { name: string; items: PriceJump[] }>()
  for (const r of results) {
    if (!r.baseSeason || !r.compareSeason) continue
    if (!regionMap.has(r.regionId)) {
      regionMap.set(r.regionId, { name: r.regionName, items: [] })
    }
    regionMap.get(r.regionId)!.items.push(r)
  }
  const regions = Array.from(regionMap.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name)
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getListingState(id: string): ListingState {
    return listingState[id] ?? { applying: false, done: false, error: false }
  }

  function setLS(id: string, patch: Partial<ListingState>) {
    setListingState((prev) => ({ ...prev, [id]: { ...getListingState(id), ...patch } }))
  }

  async function applyOne(item: PriceJump, pct: number) {
    if (!item.baseSeason || !item.compareSeason) return
    const id = item.listing.id
    setLS(id, { applying: true, done: false, error: false })
    const newRate = Math.round(item.baseSeason.baseRateValue * (1 + pct / 100))
    const ok = await updateSeasonRate(item.compareSeason._idseason, newRate)
    setLS(id, { applying: false, done: ok, error: !ok })
  }

  async function applyAll(regionId: string, items: PriceJump[]) {
    const pct = parseFloat(targetPct[regionId] ?? "")
    if (isNaN(pct)) return
    for (const item of items) {
      await applyOne(item, pct)
    }
  }

  if (regions.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-800">Calculadora de Correção</h2>
        <span className="text-xs text-gray-400">— defina o % alvo por região e aprove imóvel a imóvel</span>
      </div>

      {regions.map(([regionId, { name, items }]) => {
        const isOpen   = expanded.has(regionId)
        const pctStr   = targetPct[regionId] ?? ""
        const pct      = parseFloat(pctStr)
        const validPct = !isNaN(pct)

        const seasonName = items[0]?.compareSeason
          ? `${items[0].compareSeason.from} → ${items[0].compareSeason.to}`
          : "—"

        const doneCount  = items.filter((i) => getListingState(i.listing.id).done).length
        const errorCount = items.filter((i) => getListingState(i.listing.id).error).length

        return (
          <div key={regionId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Region header */}
            <button
              onClick={() => toggleExpand(regionId)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen
                  ? <ChevronDown  className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <div className="text-left">
                  <div className="font-semibold text-gray-800">{name}</div>
                  <div className="text-xs text-gray-400">
                    {items.length} imóveis · temporada: {seasonName}
                  </div>
                </div>
              </div>
              {doneCount > 0 && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {doneCount}/{items.length} aprovados
                  {errorCount > 0 && <span className="text-red-500 ml-1">· {errorCount} erro(s)</span>}
                </span>
              )}
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {/* % input + apply all */}
                <div className="flex items-end gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                      % sobre a Baixa Temporada
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="ex: 50"
                        value={pctStr}
                        onChange={(e) =>
                          setTargetPct((prev) => ({ ...prev, [regionId]: e.target.value }))
                        }
                        className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 bg-white"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>

                  {validPct && (
                    <div className="text-sm text-gray-600">
                      Nova diária = base × <strong>{(1 + pct / 100).toFixed(2)}x</strong>
                    </div>
                  )}

                  <button
                    onClick={() => applyAll(regionId, items)}
                    disabled={!validPct}
                    className={cn(
                      "ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      validPct
                        ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    Aprovar todos
                  </button>
                </div>

                {/* Per-listing table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Imóvel</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diária Base</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Atual</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">% Atual</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova Diária</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Δ Ajuste</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item) => {
                        const ls        = getListingState(item.listing.id)
                        const newRate   = validPct && item.baseSeason
                          ? Math.round(item.baseSeason.baseRateValue * (1 + pct / 100))
                          : null
                        const delta     = newRate !== null && item.compareAvg !== null
                          ? newRate - item.compareAvg
                          : null

                        return (
                          <tr key={item.listing.id} className={cn(
                            "hover:bg-gray-50 transition-colors",
                            ls.done  && "bg-green-50/40",
                            ls.error && "bg-red-50/40"
                          )}>
                            <td className="px-4 py-2.5">
                              <div className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded inline-block">{item.listing.id}</div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">{fmtBRL(item.baseAvg)}</td>
                            <td className="px-4 py-2.5 text-gray-700">{fmtBRL(item.compareAvg)}</td>
                            <td className={cn("px-4 py-2.5 font-medium text-xs",
                              item.diffPercent !== null && Math.abs(item.diffPercent) > 30
                                ? "text-red-600" : "text-green-600"
                            )}>
                              {fmtPct(item.diffPercent)}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">
                              {newRate !== null ? fmtBRL(newRate) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={cn("px-4 py-2.5 text-sm font-medium",
                              delta === null  ? "text-gray-300" :
                              delta > 0       ? "text-orange-600" :
                              delta < 0       ? "text-blue-600"   : "text-gray-400"
                            )}>
                              {delta === null
                                ? "—"
                                : delta === 0
                                ? <span className="text-gray-400 text-xs">sem alteração</span>
                                : (delta > 0 ? "+" : "") + fmtBRL(delta)}
                            </td>
                            <td className="px-4 py-2.5">
                              {ls.done ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <CheckCircle className="w-3.5 h-3.5" /> Aprovado
                                </span>
                              ) : ls.error ? (
                                <span className="flex items-center gap-1 text-xs text-red-500">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Erro
                                </span>
                              ) : (
                                <button
                                  onClick={() => validPct && applyOne(item, pct)}
                                  disabled={!validPct || ls.applying}
                                  className={cn(
                                    "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                                    validPct && !ls.applying
                                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  )}
                                >
                                  {ls.applying
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Aplicando</>
                                    : "Aprovar"}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
