import { useState } from "react"
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react"
import { cn } from "../lib/utils"
import { fmtBRL, fmtPct } from "../lib/utils"
import type { PriceJump } from "../types"

interface Props {
  results: PriceJump[]
  threshold: number
}

type SortKey = "name" | "base" | "compare" | "diff" | "pct"
type SortDir = "asc" | "desc"

export function ResultsTable({ results, threshold }: Props) {
  const [sort, setSort]       = useState<SortKey>("pct")
  const [dir, setDir]         = useState<SortDir>("desc")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter]   = useState<"all" | "alert" | "drop" | "stable">("all")

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSort(key); setDir("desc") }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = results.filter((r) => {
    if (filter === "alert")  return r.diffPercent !== null && r.diffPercent > threshold
    if (filter === "drop")   return r.diffPercent !== null && r.diffPercent < -threshold
    if (filter === "stable") return r.diffPercent !== null && Math.abs(r.diffPercent) <= threshold
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any
    if (sort === "name")    { va = a.listing.id;       vb = b.listing.id }
    if (sort === "base")    { va = a.baseAvg ?? -Infinity; vb = b.baseAvg ?? -Infinity }
    if (sort === "compare") { va = a.compareAvg ?? -Infinity; vb = b.compareAvg ?? -Infinity }
    if (sort === "diff")    { va = a.diffValue ?? -Infinity; vb = b.diffValue ?? -Infinity }
    if (sort === "pct")     { va = a.diffPercent !== null ? Math.abs(a.diffPercent) : -Infinity; vb = b.diffPercent !== null ? Math.abs(b.diffPercent) : -Infinity }
    if (va < vb) return dir === "asc" ? -1 : 1
    if (va > vb) return dir === "asc" ? 1 : -1
    return 0
  })

  function diffClass(pct: number | null) {
    if (pct === null) return "text-gray-400"
    if (pct > threshold) return "text-red-600 font-semibold"
    if (pct < -threshold) return "text-blue-600 font-semibold"
    return "text-green-600"
  }

  function rowBg(pct: number | null) {
    if (pct === null) return ""
    if (pct > threshold) return "bg-red-50/40"
    if (pct < -threshold) return "bg-blue-50/40"
    return ""
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-700"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </span>
    </th>
  )

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "alert", "drop", "stable"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filter === f
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {{ all: "Todos", alert: "🚨 Alertas", drop: "📉 Quedas", stable: "✅ Estáveis" }[f]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-3 py-3" />
                <Th k="name" label="Imóvel" />
                <Th k="base" label="Diária Base" />
                <Th k="compare" label="Diária Comparação" />
                <Th k="diff" label="Variação R$" />
                <Th k="pct" label="Variação %" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((r) => {
                const isOpen = expanded.has(r.listing.id)
                const pct = r.diffPercent
                return (
                  <>
                    <tr
                      key={r.listing.id}
                      className={cn("hover:bg-gray-50 transition-colors cursor-pointer", rowBg(pct))}
                      onClick={() => toggleExpand(r.listing.id)}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{r.listing.id}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[180px]">{r.listing.region}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{fmtBRL(r.baseAvg)}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtBRL(r.compareAvg)}</td>
                      <td className={cn("px-4 py-3", diffClass(pct))}>
                        {r.diffValue !== null ? (r.diffValue > 0 ? "+" : "") + fmtBRL(r.diffValue) : "—"}
                      </td>
                      <td className={cn("px-4 py-3 text-base", diffClass(pct))}>
                        {fmtPct(pct)}
                      </td>
                      <td className="px-4 py-3">
                        {pct === null ? (
                          <span className="text-xs text-gray-400">sem dados</span>
                        ) : pct > threshold ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">🚨 Salto</span>
                        ) : pct < -threshold ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">📉 Queda</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">✅ Estável</span>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${r.listing.id}-detail`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <SeasonDetail title="Período Base" season={r.baseSeason} />
                            <SeasonDetail title="Período Comparação" season={r.compareSeason} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum resultado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SeasonDetail({ title, season }: { title: string; season: any }) {
  if (!season) return (
    <div>
      <div className="font-medium text-gray-600 mb-1">{title}</div>
      <div className="text-gray-400">Sem temporada encontrada</div>
    </div>
  )
  return (
    <div>
      <div className="font-medium text-gray-600 mb-2">{title}</div>
      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Período</span>
          <span className="font-medium">{season.from} → {season.to}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Diária base</span>
          <span className="font-semibold text-gray-800">
            {season.baseRateValue?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        {season.ratePlans?.length > 0 && (
          <div className="pt-1 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Planos de desconto</div>
            {season.ratePlans.map((rp: any, i: number) => (
              <div key={i} className="flex justify-between text-xs text-gray-600">
                <span>{rp.minStay}+ noites ({rp._i_percent}% off)</span>
                <span>{rp._f_val?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
