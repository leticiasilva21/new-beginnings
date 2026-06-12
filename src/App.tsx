import { useState } from "react"
import { Search, RefreshCw } from "lucide-react"
import { useListings }  from "./hooks/useListings"
import { useAnalysis }  from "./hooks/useAnalysis"
import { DateRangePicker }    from "./components/DateRangePicker"
import { ListingMultiSelect } from "./components/ListingMultiSelect"
import { SummaryCards }       from "./components/SummaryCards"
import { ResultsTable }       from "./components/ResultsTable"
import { isoDate } from "./lib/utils"

const today     = isoDate(new Date())
const lastMonth = isoDate(new Date(Date.now() - 30 * 86_400_000))
const nextMonth = isoDate(new Date(Date.now() + 30 * 86_400_000))
const twoMonths = isoDate(new Date(Date.now() + 60 * 86_400_000))

const THRESHOLD = 30

export default function App() {
  const { listings, loading: loadingListings, error: listingError } = useListings()
  const { run, results, loading: running, progress, error: analysisError } = useAnalysis()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [baseFrom, setBaseFrom] = useState(lastMonth)
  const [baseTo,   setBaseTo]   = useState(today)
  const [cmpFrom,  setCmpFrom]  = useState(nextMonth)
  const [cmpTo,    setCmpTo]    = useState(twoMonths)

  const targetListings =
    selectedIds.length === 0 ? listings : listings.filter((l) => selectedIds.includes(l.id))

  function handleAnalyze() {
    if (!baseFrom || !baseTo || !cmpFrom || !cmpTo) return
    run(targetListings, baseFrom, baseTo, cmpFrom, cmpTo)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Análise de Salto de Preços</h1>
            <p className="text-sm text-gray-500">Comparação de diárias entre períodos — Carpediem</p>
          </div>
          {!loadingListings && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
              {listings.length} imóveis ativos
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Configurar Análise</h2>

          {listingError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Erro ao carregar imóveis: {listingError}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4">
            {loadingListings ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" /> Carregando imóveis...
              </div>
            ) : (
              <div className="relative">
                <ListingMultiSelect
                  listings={listings}
                  selected={selectedIds}
                  onChange={setSelectedIds}
                />
              </div>
            )}

            <DateRangePicker
              label="Período Base"
              from={baseFrom}
              to={baseTo}
              onChange={(f, t) => { setBaseFrom(f); setBaseTo(t) }}
            />

            <DateRangePicker
              label="Período de Comparação"
              from={cmpFrom}
              to={cmpTo}
              onChange={(f, t) => { setCmpFrom(f); setCmpTo(t) }}
            />

            <button
              onClick={handleAnalyze}
              disabled={running || loadingListings || targetListings.length === 0}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg shadow-sm transition-colors"
            >
              {running ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> {progress}%</>
              ) : (
                <><Search className="w-4 h-4" /> Analisar</>
              )}
            </button>
          </div>

          {running && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Buscando preços na Stays...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
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
          </>
        )}

        {results.length === 0 && !running && !loadingListings && (
          <div className="text-center py-16 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              Configure os filtros e clique em <strong>Analisar</strong> para ver os resultados.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
