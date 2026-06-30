import { useState, useCallback } from "react"
import { ChevronDown, ChevronUp, ArrowUpDown, CheckCircle, AlertTriangle, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn, fmtBRL, fmtPct } from "../lib/utils"
import { updateSeasonRate } from "../lib/stays"
import { findTemplateSeasonForDate } from "../lib/analysis"
import type { PriceJump } from "../types"
import type { RegionTemplate } from "../types/template"

interface Props {
  results: PriceJump[]
  threshold: number
  cmpDate?: string
  getTemplate?: (regionId: string) => RegionTemplate
}

type SortKey = "name" | "base" | "compare" | "diff" | "pct"
type SortDir = "asc" | "desc"
type ApproveState = "idle" | "loading" | "done" | "error" | "clone"

function isClonedSeason(r: PriceJump): boolean {
  if (!r.compareSeason || !r.listing._id) return false
  return r.compareSeason._idlisting !== r.listing._id
}

const APPROVED_KEY = "nb_approved_seasons_v1"

function loadApproved(): Record<string, true> {
  try { return JSON.parse(localStorage.getItem(APPROVED_KEY) ?? "{}") } catch { return {} }
}
function saveApproved(seasonKey: string) {
  const all = loadApproved()
  all[seasonKey] = true
  localStorage.setItem(APPROVED_KEY, JSON.stringify(all))
}
function approvedKey(seasonId: string, suggested: number) {
  return `${seasonId}|${suggested}`
}

export function ResultsTable({ results, threshold, cmpDate, getTemplate }: Props) {
  const [sort, setSort]         = useState<SortKey>("pct")
  const [dir, setDir]           = useState<SortDir>("desc")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<"all" | "alert" | "drop" | "stable">("all")
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [approveState, setApproveState] = useState<Record<string, ApproveState>>({})
  const [approved]  = useState<Record<string, true>>(loadApproved)

  const isApproved = useCallback(
    (seasonId: string, suggested: number) => !!approved[approvedKey(seasonId, suggested)],
    [approved]
  )

  const regions = Array.from(
    new Map(results.map((r) => [r.regionId, r.regionName])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

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

  const uniqueRegionId = (() => {
    if (regionFilter !== "all") return regionFilter
    const ids = Array.from(new Set(results.map((r) => r.regionId)))
    return ids.length === 1 ? ids[0] : null
  })()
  const activeTemplate = uniqueRegionId && getTemplate && cmpDate
    ? getTemplate(uniqueRegionId)
    : null
  const activeTemplateSeason = activeTemplate && cmpDate
    ? findTemplateSeasonForDate(activeTemplate, cmpDate)
    : null

  const filtered = results.filter((r) => {
    if (regionFilter !== "all" && r.regionId !== regionFilter) return false
    if (statusFilter === "alert")  return r.diffPercent !== null && r.diffPercent > threshold
    if (statusFilter === "drop")   return r.diffPercent !== null && r.diffPercent < -threshold
    if (statusFilter === "stable") return r.diffPercent !== null && Math.abs(r.diffPercent) <= threshold
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any
    if (sort === "name")    { va = a.listing.internalName || a.listing.id; vb = b.listing.internalName || b.listing.id }
    if (sort === "base")    { va = a.baseAvg ?? -Infinity; vb = b.baseAvg ?? -Infinity }
    if (sort === "compare") { va = a.compareAvg ?? -Infinity; vb = b.compareAvg ?? -Infinity }
    if (sort === "diff")    { va = a.diffValue ?? -Infinity; vb = b.diffValue ?? -Infinity }
    if (sort === "pct")     { va = a.diffPercent !== null ? Math.abs(a.diffPercent) : -Infinity; vb = b.diffPercent !== null ? Math.abs(b.diffPercent) : -Infinity }
    if (va < vb) return dir === "asc" ? -1 : 1
    if (va > vb) return dir === "asc" ? 1 : -1
    return 0
  })

  function statusBadge(pct: number | null) {
    if (pct === null) return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        Sem dados
      </span>
    )
    if (pct > threshold) return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
        <TrendingUp className="w-3.5 h-3.5" />
        Salto
      </span>
    )
    if (pct < -threshold) return (
      <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
        <TrendingDown className="w-3.5 h-3.5" />
        Queda
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <Minus className="w-3.5 h-3.5" />
        Estável
      </span>
    )
  }

  function diffClass(pct: number | null) {
    if (pct === null) return "text-gray-400"
    if (pct > threshold) return "text-red-600 font-semibold"
    if (pct < -threshold) return "text-blue-600 font-semibold"
    return "text-green-600"
  }

  async function handleApprove(r: PriceJump, suggested: number) {
    if (!r.compareSeason) return
    const id = r.listing.id
    if (isClonedSeason(r)) {
      setApproveState((p) => ({ ...p, [id]: "clone" }))
      return
    }
    setApproveState((p) => ({ ...p, [id]: "loading" }))
    const ok = await updateSeasonRate(r.compareSeason._idseason, r.listing.id, suggested)
    if (ok) saveApproved(approvedKey(r.compareSeason._idseason, suggested))
    setApproveState((p) => ({ ...p, [id]: ok ? "done" : "error" }))
  }

  const [approvingAll, setApprovingAll] = useState(false)

  async function handleApproveAll() {
    if (!showTemplate || !activeTemplateSeason) return
    setApprovingAll(true)
    const pending = sorted.filter((r) => {
      if (!r.compareSeason || r.baseAvg === null) return false
      if (isClonedSeason(r)) return false
      const sug = Math.round(r.baseAvg * activeTemplateSeason!.multiplierPct / 100)
      return !isApproved(r.compareSeason._idseason, sug) && (approveState[r.listing.id] !== "done")
    })
    for (const r of pending) {
      const suggested = Math.round(r.baseAvg! * activeTemplateSeason!.multiplierPct / 100)
      await handleApprove(r, suggested)
    }
    setApprovingAll(false)
  }

  const showTemplate = !!activeTemplateSeason
  const colSpan = (regionFilter === "all" ? 8 : 7) + (showTemplate ? 3 : 0)

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-800 transition-colors"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {sort === k
          ? dir === "asc"
            ? <ChevronUp className="w-3 h-3 text-blue-600" />
            : <ChevronDown className="w-3 h-3 text-blue-600" />
          : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  )

  const STATUS_FILTERS = [
    { key: "all",    label: "Todos" },
    { key: "alert",  label: "Saltos" },
    { key: "drop",   label: "Quedas" },
    { key: "stable", label: "Estáveis" },
  ] as const

  return (
    <div className="space-y-4">
      {/* Region filter */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtrar por Região</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRegionFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150",
              regionFilter === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"
            )}
          >
            Todas
            <span className="ml-1.5 opacity-70">({results.length})</span>
          </button>
          {regions.map(([id, name]) => {
            const count = results.filter((r) => r.regionId === id).length
            const alertCount = results.filter(
              (r) => r.regionId === id && r.diffPercent !== null && Math.abs(r.diffPercent) > threshold
            ).length
            return (
              <button
                key={id}
                onClick={() => setRegionFilter(id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 flex items-center gap-1.5",
                  regionFilter === id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"
                )}
              >
                {name}
                <span className="opacity-70">({count})</span>
                {alertCount > 0 && regionFilter !== id && (
                  <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none">
                    {alertCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {showTemplate && activeTemplateSeason && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeTemplateSeason.color }}
              />
              <span>
                Temporada em {cmpDate}: <strong className="text-gray-800">{activeTemplateSeason.name}</strong>
                {" — "}<strong className="text-blue-600">{activeTemplateSeason.multiplierPct}%</strong> da Baixa T1
              </span>
            </div>
            <button
              onClick={handleApproveAll}
              disabled={approvingAll}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                approvingAll
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {approvingAll
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</>
                : <><CheckCircle className="w-4 h-4" /> Aprovar tudo</>}
            </button>
          </div>
        )}
      </div>

      {/* Status filter + count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150",
                statusFilter === f.key
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {sorted.length} imóvel{sorted.length !== 1 ? "is" : ""}
          {regionFilter !== "all" && regions.find(([id]) => id === regionFilter)
            ? ` · ${regions.find(([id]) => id === regionFilter)?.[1]}`
            : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3" />
                <Th k="name" label="Imóvel" />
                {regionFilter === "all" && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Região</th>
                )}
                <Th k="base"    label="Diária Base" />
                <Th k="compare" label="Diária Atual" />
                <Th k="diff"    label="Variação R$" />
                <Th k="pct"     label="Variação %" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                {showTemplate && <>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide">Sugerido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide">vs Tabela</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide">Aprovar</th>
                </>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((r, idx) => {
                const isOpen = expanded.has(r.listing.id)
                const pct = r.diffPercent
                const aState = approveState[r.listing.id] ?? "idle"

                let suggested: number | null = null
                let vsTabela: number | null = null
                if (showTemplate && activeTemplateSeason && r.baseAvg !== null && r.compareAvg !== null) {
                  suggested = Math.round(r.baseAvg * activeTemplateSeason.multiplierPct / 100)
                  vsTabela = Math.round(((r.compareAvg - suggested) / suggested) * 100)
                }

                const alreadyApproved = suggested !== null && r.compareSeason
                  ? isApproved(r.compareSeason._idseason, suggested)
                  : false
                const isDone = aState === "done" || alreadyApproved

                return (
                  <>
                    <tr
                      key={r.listing.id}
                      className={cn(
                        "hover:bg-gray-50 transition-colors cursor-pointer",
                        idx % 2 === 1 && "bg-gray-50/30",
                        isDone && "bg-green-50/40"
                      )}
                      onClick={() => toggleExpand(r.listing.id)}
                    >
                      <td className="px-3 py-3.5 text-gray-300">
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4" />}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900">{r.listing.internalName || r.listing.id}</div>
                        <div className="font-mono text-xs text-gray-400 mt-0.5">{r.listing.id}</div>
                      </td>
                      {regionFilter === "all" && (
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {r.regionName}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-gray-600 tabular-nums">{fmtBRL(r.baseAvg)}</td>
                      <td className="px-4 py-3.5 text-gray-600 tabular-nums">{fmtBRL(r.compareAvg)}</td>
                      <td className={cn("px-4 py-3.5 tabular-nums", diffClass(pct))}>
                        {r.diffValue !== null ? (r.diffValue > 0 ? "+" : "") + fmtBRL(r.diffValue) : "—"}
                      </td>
                      <td className={cn("px-4 py-3.5 font-semibold tabular-nums", diffClass(pct))}>
                        {fmtPct(pct)}
                      </td>
                      <td className="px-4 py-3.5">{statusBadge(pct)}</td>

                      {showTemplate && (
                        <>
                          <td className="px-4 py-3.5 font-semibold text-blue-700 tabular-nums" onClick={(e) => e.stopPropagation()}>
                            {suggested !== null ? fmtBRL(suggested) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            {vsTabela === null ? (
                              <span className="text-gray-300">—</span>
                            ) : Math.abs(vsTabela) <= 3 ? (
                              <span className="text-xs text-green-600 font-medium">Alinhado</span>
                            ) : vsTabela > 0 ? (
                              <span className="text-xs text-orange-600 font-medium">+{vsTabela}% acima</span>
                            ) : (
                              <span className="text-xs text-red-600 font-medium">{vsTabela}% abaixo</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            {isDone ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle className="w-3.5 h-3.5" /> Aprovado
                              </span>
                            ) : aState === "clone" || (suggested !== null && r.compareSeason && isClonedSeason(r)) ? (
                              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium" title="Imóvel clona preços de outro anúncio. Ajuste no anúncio-fonte.">
                                <AlertTriangle className="w-3.5 h-3.5" /> Clone
                              </span>
                            ) : aState === "error" ? (
                              <span className="flex items-center gap-1 text-xs text-red-500">
                                <AlertTriangle className="w-3.5 h-3.5" /> Erro
                              </span>
                            ) : suggested !== null && r.compareSeason ? (
                              <button
                                disabled={aState === "loading" || isDone || (vsTabela !== null && Math.abs(vsTabela) <= 3)}
                                onClick={() => handleApprove(r, suggested!)}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                                  aState === "loading" || (vsTabela !== null && Math.abs(vsTabela) <= 3)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                )}
                              >
                                {aState === "loading"
                                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Aplicando</>
                                  : "Aprovar"}
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>

                    {isOpen && (
                      <tr key={`${r.listing.id}-detail`} className="bg-gray-50">
                        <td colSpan={colSpan} className="px-6 py-5">
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
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-400 text-sm">
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
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <p className="text-sm text-gray-400">Sem temporada encontrada</p>
    </div>
  )
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Período</span>
          <span className="font-medium text-gray-900">{season.from} → {season.to}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Diária base</span>
          <span className="font-semibold text-gray-900">
            {season.baseRateValue?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        {season.ratePlans?.length > 0 && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Planos de desconto</p>
            {season.ratePlans.map((rp: any, i: number) => (
              <div key={i} className="flex justify-between text-xs text-gray-500">
                <span>{rp.minStay}+ noites ({rp._i_percent}% off)</span>
                <span className="font-medium text-gray-700">{rp._f_val?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
