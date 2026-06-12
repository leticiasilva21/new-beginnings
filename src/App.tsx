import { useState, useEffect } from "react"
import { RefreshCw, Building2, BarChart2, ChevronDown } from "lucide-react"
import { useListings }           from "./hooks/useListings"
import { useListingsWithRegion } from "./hooks/useListingsWithRegion"
import { useAnalysis }           from "./hooks/useAnalysis"
import { DatePicker }      from "./components/DatePicker"
import { SummaryCards }    from "./components/SummaryCards"
import { ResultsTable }    from "./components/ResultsTable"
import { ListingsView }    from "./components/ListingsView"
import { CorrectionPanel } from "./components/CorrectionPanel"
import { isoDate, cn } from "./lib/utils"

type Tab = "analysis" | "listings"

const today     = isoDate(new Date())
const nextMonth = isoDate(new Date(Date.now() + 30 * 86_400_000))

const THRESHOLD = 30

export default function App() {
  const { listings, loading: loadingListings } = useListings()
  const { groups, loading: loadingRegions, progress: regionProgress, error: regionError, load: loadRegions } = useListingsWithRegion()
  const { run, results, loading: running, progress, error: analysisError } = useAnalysis()

  const [tab, setTab]               = useState<Tab>("analysis")
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [baseDate, setBaseDate]     = useState(today)
  const [cmpDate,  setCmpDate]      = useState(nextMonth)

  const selectedGroup = groups.find((g) => g.regionId === selectedRegionId) ?? null

  // Listings from the selected region (matched against full listing data)
  const targetListings = selectedGroup
    ? listings.filter((l) => selectedGroup.listings.some((sl) => sl.id === l.id))
    : []

  // Auto-run analysis whenever region or dates change (and everything is ready)
  useEffect(() => {
    if (!selectedRegionId || !baseDate || !cmpDate) return
    if (loadingRegions || loadingListings || targetListings.length === 0) return
    run(targetListings, baseDate, cmpDate)
  }, [selectedRegionId, baseDate, cmpDate]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Beginnings · Revenue</h1>
            <p className="text-sm text-gray-500">Ferramentas de precificação — Carpediem</p>
          </div>
          <div className="flex items-center gap-3">
            {loadingRegions && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Carregando regiões… {regionProgress}%
              </span>
            )}
            {!loadingListings && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                {listings.length} imóveis ativos
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex gap-1">
          {([
            { key: "analysis", label: "Análise de Saltos",  Icon: BarChart2  },
            { key: "listings", label: "Imóveis por Região", Icon: Building2  },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                tab === key
                  ? "bg-orange-500 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {tab === "listings" && (
          <ListingsView
            groups={groups}
            loading={loadingRegions}
            progress={regionProgress}
            error={regionError}
            onLoad={loadRegions}
          />
        )}

        {tab === "analysis" && (
          <>
            {/* Config bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex flex-wrap items-end gap-4">

                {/* Region dropdown */}
                <div className="min-w-[260px]">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    Região Tarifária
                  </label>
                  {loadingRegions ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400 shrink-0" />
                      Carregando regiões… {regionProgress}%
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedRegionId ?? ""}
                        onChange={(e) => setSelectedRegionId(e.target.value || null)}
                        className={cn(
                          "w-full appearance-none px-3 py-2 pr-8 border rounded-lg text-sm outline-none bg-white transition-colors",
                          selectedRegionId
                            ? "border-orange-400 text-gray-800 font-medium"
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
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>

                <DatePicker label="Data Base"          value={baseDate} onChange={setBaseDate} />
                <DatePicker label="Data de Comparação" value={cmpDate}  onChange={setCmpDate}  />

                {/* Status */}
                {running && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analisando… {progress}%
                  </div>
                )}
              </div>

              {/* Progress bar while analyzing */}
              {running && (
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Region loading progress bar */}
              {loadingRegions && (
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-1">
                    <div
                      className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${regionProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {analysisError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Erro na análise: {analysisError}
              </div>
            )}

            {results.length > 0 && (
              <>
                <SummaryCards results={results} threshold={THRESHOLD} />
                <ResultsTable results={results} threshold={THRESHOLD} />
                <CorrectionPanel results={results} />
              </>
            )}

            {results.length === 0 && !running && (
              <div className="text-center py-20 text-gray-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {loadingRegions
                    ? "Aguarde — carregando regiões tarifárias…"
                    : !selectedRegionId
                    ? "Selecione uma região tarifária para ver a análise."
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
