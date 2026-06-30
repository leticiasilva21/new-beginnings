import { useState, useEffect, useMemo } from "react"
import { RefreshCw, Building2, BarChart2, Tag, AlertCircle } from "lucide-react"
import { useListings }           from "./hooks/useListings"
import { useListingsWithRegion } from "./hooks/useListingsWithRegion"
import { useAnalysis }           from "./hooks/useAnalysis"
import { usePricingTemplates }   from "./hooks/usePricingTemplates"
import { DatePicker }            from "./components/DatePicker"
import { SummaryCards }          from "./components/SummaryCards"
import { ResultsTable }          from "./components/ResultsTable"
import { ListingsView }          from "./components/ListingsView"
import { TemplateEditor }        from "./components/TemplateEditor"
import { PriceComparisonTable }  from "./components/PriceComparisonTable"
import { BulkPriceAdjustment }   from "./components/BulkPriceAdjustment"
import { ErrorBoundary }         from "./components/ErrorBoundary"
import { isoDate, cn }           from "./lib/utils"

type Tab = "analysis" | "listings" | "pricing"

const today     = isoDate(new Date())
const nextMonth = isoDate(new Date(Date.now() + 30 * 86_400_000))
const THRESHOLD = 30

const TABS = [
  { key: "analysis", label: "Análise de Saltos",  Icon: BarChart2  },
  { key: "pricing",  label: "Tabela de Preços",   Icon: Tag        },
  { key: "listings", label: "Imóveis por Região", Icon: Building2  },
] as const

export default function App() {
  const { listings, loading: loadingListings, error: listingsError, reload: reloadListings } = useListings()
  const { groups, loading: loadingRegions, progress: regionProgress, error: regionError, load: loadRegions } = useListingsWithRegion()
  const { run, results, loading: running, progress, error: analysisError } = useAnalysis()

  const { getTemplate } = usePricingTemplates()
  const [tab, setTab]               = useState<Tab>("analysis")
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [baseDate, setBaseDate]     = useState(today)
  const [cmpDate,  setCmpDate]      = useState(nextMonth)
  const [pricingRegionId, setPricingRegionId] = useState<string | null>(null)
  const [pricingYear, setPricingYear] = useState(new Date().getFullYear())

  const selectedGroup = groups.find((g) => g.regionId === selectedRegionId) ?? null

  const targetListings = useMemo(
    () => selectedGroup
      ? listings.filter((l) => selectedGroup.listings.some((sl) => sl.id === l.id))
      : [],
    [selectedGroup, listings]
  )

  useEffect(() => {
    if (!selectedRegionId || !baseDate || !cmpDate) return
    if (loadingRegions || loadingListings) return
    if (targetListings.length === 0) return
    run(targetListings, baseDate, cmpDate)
  }, [selectedRegionId, baseDate, cmpDate, targetListings, loadingRegions, loadingListings]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo / title */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">CD</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">Carpediem</span>
                <span className="text-sm text-gray-400 ml-1.5">Revenue</span>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-2">
              {loadingListings && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Carregando imóveis…
                </span>
              )}
              {loadingRegions && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Regiões… {regionProgress}%
                </span>
              )}
              {!loadingListings && listings.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  {listings.length} imóveis
                </span>
              )}
              {!loadingListings && !loadingRegions && (listingsError || regionError || listings.length === 0 || groups.length === 0) && (
                <button
                  onClick={() => { reloadListings(); loadRegions() }}
                  className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <AlertCircle className="w-3 h-3" />
                  {regionError || groups.length === 0 ? "Erro ao carregar — Reconectar" : "0 imóveis — Reconectar"}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 -mb-px">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150",
                  tab === key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── PRICING TAB ─────────────────────────────────── */}
        {tab === "pricing" && (
          <ErrorBoundary label="Tabela de Preços">
            <div className="space-y-5">
              {/* Controls card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="flex flex-wrap items-end gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ano</label>
                    <input
                      type="number"
                      value={pricingYear}
                      onChange={(e) => setPricingYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div className="min-w-[280px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Região Tarifária</label>
                    {loadingRegions ? (
                      <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                        Carregando regiões… {regionProgress}%
                      </div>
                    ) : (
                      <RegionSelect
                        value={pricingRegionId ?? ""}
                        onChange={(v) => setPricingRegionId(v || null)}
                        groups={groups}
                      />
                    )}
                  </div>
                </div>
              </div>

              {pricingRegionId && (() => {
                const pricingGroup = groups.find((g) => g.regionId === pricingRegionId)
                const pricingListings = pricingGroup
                  ? listings.filter((l) => pricingGroup.listings.some((sl) => sl.id === l.id))
                  : []
                const template = getTemplate(pricingRegionId)
                return (
                  <div className="space-y-5">
                    <TemplateEditor
                      regionId={pricingRegionId}
                      regionName={pricingGroup?.regionName ?? pricingRegionId}
                    />
                    <BulkPriceAdjustment
                      listings={pricingListings}
                      template={template}
                      year={pricingYear}
                    />
                    <PriceComparisonTable
                      regionId={pricingRegionId}
                      listings={pricingListings}
                      template={template}
                      year={pricingYear}
                    />
                  </div>
                )
              })()}

              {!pricingRegionId && (
                <div className="text-center py-24 text-gray-400">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Selecione uma região tarifária para ver a tabela de preços.</p>
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}

        {/* ── LISTINGS TAB ─────────────────────────────────── */}
        {tab === "listings" && (
          <ListingsView
            groups={groups}
            loading={loadingRegions}
            progress={regionProgress}
            error={regionError}
            onLoad={loadRegions}
          />
        )}

        {/* ── ANALYSIS TAB ─────────────────────────────────── */}
        {tab === "analysis" && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap items-end gap-5">
                <div className="min-w-[280px]">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Região Tarifária</label>
                  {loadingRegions ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                      Carregando regiões… {regionProgress}%
                    </div>
                  ) : (
                    <RegionSelect
                      value={selectedRegionId ?? ""}
                      onChange={(v) => setSelectedRegionId(v || null)}
                      groups={groups}
                    />
                  )}
                </div>

                <DatePicker label="Data Base"          value={baseDate} onChange={setBaseDate} />
                <DatePicker label="Data de Comparação" value={cmpDate}  onChange={setCmpDate}  />

                {running && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analisando… {progress}%
                  </div>
                )}
              </div>

              {(running || loadingRegions) && (
                <div className="mt-4">
                  <div className="w-full bg-gray-100 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${running ? progress : regionProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {analysisError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Erro na análise: {analysisError}
              </div>
            )}

            {results.length > 0 && (
              <>
                <SummaryCards results={results} threshold={THRESHOLD} />
                <ResultsTable results={results} threshold={THRESHOLD} cmpDate={cmpDate} getTemplate={getTemplate} />
              </>
            )}

            {results.length === 0 && !running && (
              <div className="text-center py-24 text-gray-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  {loadingRegions
                    ? "Aguarde — carregando regiões tarifárias…"
                    : !selectedRegionId
                    ? "Selecione uma região tarifária para iniciar a análise."
                    : "Aguardando análise…"}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function RegionSelect({
  value,
  onChange,
  groups,
}: {
  value: string
  onChange: (v: string) => void
  groups: { regionId: string; regionName: string; listings: unknown[] }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none px-3 py-2 pr-8 border rounded-lg text-sm outline-none bg-white transition-colors focus:ring-1 focus:ring-blue-500",
          value
            ? "border-blue-500 text-gray-900 font-medium"
            : "border-gray-200 text-gray-400"
        )}
      >
        <option value="">Selecionar região…</option>
        {groups.map((g) => (
          <option key={g.regionId} value={g.regionId}>
            {g.regionName} ({g.listings.length})
          </option>
        ))}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
