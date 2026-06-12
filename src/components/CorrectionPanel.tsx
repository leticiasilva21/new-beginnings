import { useState } from "react"
import { CheckCircle, ChevronDown, ChevronRight, Loader2, AlertTriangle } from "lucide-react"
import { cn, fmtBRL, fmtPct } from "../lib/utils"
import { updateSeasonRate } from "../lib/stays"
import type { PriceJump } from "../types"

interface Props {
  results: PriceJump[]
}

interface RegionState {
  targetPct: string
  applying: boolean
  applied: number
  errors: number
  done: boolean
}

export function CorrectionPanel({ results }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [regionState, setRegionState] = useState<Record<string, RegionState>>({})

  // Group results by region, only those with both seasons identified
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

  function getState(id: string): RegionState {
    return regionState[id] ?? { targetPct: "", applying: false, applied: 0, errors: 0, done: false }
  }

  function updateState(id: string, patch: Partial<RegionState>) {
    setRegionState((prev) => ({ ...prev, [id]: { ...getState(id), ...patch } }))
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function applyCorrection(regionId: string, items: PriceJump[]) {
    const state = getState(regionId)
    const pct = parseFloat(state.targetPct)
    if (isNaN(pct)) return

    updateState(regionId, { applying: true, applied: 0, errors: 0, done: false })

    let applied = 0, errors = 0
    for (const item of items) {
      if (!item.baseSeason || !item.compareSeason) continue
      const newRate = Math.round(item.baseSeason.baseRateValue * (1 + pct / 100))
      const ok = await updateSeasonRate(item.compareSeason._idseason, newRate)
      if (ok) applied++
      else errors++
      updateState(regionId, { applied, errors })
    }

    updateState(regionId, { applying: false, done: true, applied, errors })
  }

  if (regions.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-800">Calculadora de Correção</h2>
        <span className="text-xs text-gray-400">— defina o % alvo por região e aprove o ajuste</span>
      </div>

      {regions.map(([regionId, { name, items }]) => {
        const state   = getState(regionId)
        const isOpen  = expanded.has(regionId)
        const pct     = parseFloat(state.targetPct)
        const validPct = !isNaN(pct)

        // Preview: what each listing's compare season would become
        const preview = items.map((item) => {
          const targetRate = validPct && item.baseSeason
            ? Math.round(item.baseSeason.baseRateValue * (1 + pct / 100))
            : null
          const currentRate = item.compareAvg
          const delta = targetRate !== null && currentRate !== null ? targetRate - currentRate : null
          return { item, targetRate, delta }
        })

        // Season name from first item's compareSeason
        const seasonName = items[0]?.compareSeason
          ? `${items[0].compareSeason.from} → ${items[0].compareSeason.to}`
          : "—"

        return (
          <div key={regionId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Region header */}
            <button
              onClick={() => toggleExpand(regionId)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <div className="text-left">
                  <div className="font-semibold text-gray-800">{name}</div>
                  <div className="text-xs text-gray-400">{items.length} imóveis · temporada: {seasonName}</div>
                </div>
              </div>
              {state.done && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" /> Aplicado ({state.applied})
                  {state.errors > 0 && <span className="text-red-500 ml-1">· {state.errors} erro(s)</span>}
                </span>
              )}
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {/* Target % input */}
                <div className="flex items-end gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
                      % sobre a Baixa Temporada
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="ex: 50"
                        value={state.targetPct}
                        onChange={(e) => updateState(regionId, { targetPct: e.target.value, done: false })}
                        className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400 bg-white"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>

                  {validPct && (
                    <div className="text-sm text-gray-600">
                      Nova diária = diária base × <strong>{(1 + pct / 100).toFixed(2)}x</strong>
                    </div>
                  )}

                  <button
                    onClick={() => applyCorrection(regionId, items)}
                    disabled={!validPct || state.applying}
                    className={cn(
                      "ml-auto flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-colors",
                      validPct && !state.applying
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {state.applying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando {state.applied}/{items.length}</>
                    ) : state.done ? (
                      <><CheckCircle className="w-4 h-4" /> Reaplicar</>
                    ) : (
                      "Aprovar Correção"
                    )}
                  </button>
                </div>

                {/* Preview table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Imóvel</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diária Base</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Atual Comparação</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">% Atual</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova Diária</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Δ Ajuste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.map(({ item, targetRate, delta }) => (
                        <tr key={item.listing.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{item.listing.id}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700">{fmtBRL(item.baseAvg)}</td>
                          <td className="px-4 py-2.5 text-gray-700">{fmtBRL(item.compareAvg)}</td>
                          <td className={cn("px-4 py-2.5 font-medium",
                            item.diffPercent !== null && Math.abs(item.diffPercent) > 30 ? "text-red-600" : "text-green-600"
                          )}>
                            {fmtPct(item.diffPercent)}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-gray-800">
                            {targetRate !== null ? fmtBRL(targetRate) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className={cn("px-4 py-2.5 font-medium",
                            delta === null ? "text-gray-300" :
                            delta > 0 ? "text-orange-600" : delta < 0 ? "text-blue-600" : "text-gray-400"
                          )}>
                            {delta === null ? "—" : delta === 0 ? "sem alteração" : (delta > 0 ? "+" : "") + fmtBRL(delta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {state.done && state.errors > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {state.errors} imóvel(s) não foram atualizados. Verifique as permissões da API ou tente novamente.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
