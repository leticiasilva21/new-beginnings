import { useEffect, useMemo, useState } from "react"
import { RefreshCw, Plus, Check, CalendarPlus } from "lucide-react"
import type { Listing } from "../types"
import type { RegionTemplate, TemplateSeason } from "../types/template"
import { fetchSeasonDetail, type StaysSeasonDetail } from "../lib/stays"
import { findBestMatchingSeason, effectiveRate } from "../lib/analysis"
import { findUnmappedEvents } from "../lib/eventMapping"
import { useRegionRates } from "../hooks/useRegionRates"
import { usePricingTemplates } from "../hooks/usePricingTemplates"

interface Props {
  regionId: string
  listings: Listing[]
  template: RegionTemplate
  year: number
}

const NEW_EVENT_COLOR = "#0891b2"

function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-")
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return `${d}/${months[parseInt(m) - 1]}`
}

export function UnmappedEventsPanel({ regionId, listings, template, year }: Props) {
  const { saveTemplate, getTemplate } = usePricingTemplates()
  const { ratesMap, fetching } = useRegionRates(listings, year)
  const [details, setDetails] = useState<StaysSeasonDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [jumpPct, setJumpPct] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState(0)

  // Region-level (global) seasons only — individual seasons belong to a single listing
  const seasonIds = useMemo(() => {
    const ids = new Set<string>()
    for (const seasons of Object.values(ratesMap)) {
      for (const s of seasons) if (s.type === "global" && s.status === "active") ids.add(s._idseason)
    }
    return [...ids].sort()
  }, [ratesMap])

  useEffect(() => {
    if (seasonIds.length === 0) { setDetails([]); return }
    let cancelled = false
    setLoadingDetails(true)
    Promise.all(seasonIds.map(fetchSeasonDetail)).then((ds) => {
      if (cancelled) return
      setDetails(ds.filter((d): d is StaysSeasonDetail => d !== null))
      setLoadingDetails(false)
    })
    return () => { cancelled = true }
  }, [seasonIds.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  const baseTmpl = template.seasons.find((s) => s.isBase)
  const unmapped = useMemo(() => {
    const baseRateOf = (listingId: string) => {
      if (!baseTmpl) return null
      const base = findBestMatchingSeason(ratesMap[listingId] ?? [], baseTmpl, year)
      return base ? effectiveRate(base, 2) : null
    }
    return findUnmappedEvents(template, details, ratesMap, baseRateOf, year)
  }, [template, details, ratesMap, baseTmpl, year])

  // New region/year → start with everything selected
  useEffect(() => {
    setSelected(new Set(unmapped.map((e) => e.key)))
  }, [regionId, year, unmapped.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function jumpFor(key: string, fallback: number | null) {
    return jumpPct[key] ?? fallback ?? 100
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function addSelected() {
    const toAdd = unmapped.filter((e) => selected.has(e.key))
    if (!toAdd.length) return
    const newSeasons: TemplateSeason[] = toAdd.map((e) => ({
      id: `stays-${e.staysSeasonId}`,
      name: e.name,
      startMD: e.from.substring(5),
      endMD: e.to.substring(5),
      minNights: e.minNights,
      multiplierPct: jumpFor(e.key, e.currentJumpPct),
      isBase: false,
      color: NEW_EVENT_COLOR,
    }))
    const current = getTemplate(regionId)
    const seasons = [...current.seasons, ...newSeasons].sort((a, b) => a.startMD.localeCompare(b.startMD))
    saveTemplate({ regionId, seasons, savedAt: new Date().toISOString() })
    setAdded(newSeasons.length)
    setTimeout(() => setAdded(0), 2500)
  }

  const loading = fetching || loadingDetails
  const selectedCount = unmapped.filter((e) => selected.has(e.key)).length
  const allSelected = unmapped.length > 0 && selectedCount === unmapped.length

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-navy" />
            Eventos da Stays fora do template
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Feriados/eventos cadastrados na região tarifária em {year} que ainda não têm salto definido. O salto é sobre a Baixa Temporada (100%).
          </p>
        </div>
        {!loading && (
          <span className={unmapped.length
            ? "text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg"
            : "text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg"}>
            {unmapped.length ? `${unmapped.length} não mapeado${unmapped.length > 1 ? "s" : ""}` : "Tudo mapeado"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-10">
          <RefreshCw className="w-4 h-4 animate-spin text-navy" />
          <span className="text-sm">Lendo temporadas da Stays…</span>
        </div>
      ) : unmapped.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">
          {added
            ? `${added} evento${added > 1 ? "s" : ""} adicionado${added > 1 ? "s" : ""} ao template — confira na Tabela de Preços abaixo.`
            : "Todos os eventos da Stays desta região já estão no template."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-2.5 px-5 w-6 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(unmapped.map((e) => e.key)))}
                      className="w-4 h-4 rounded border-gray-300 accent-[#142851]"
                    />
                  </th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Evento</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mín. Noites</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" title="Mediana dos imóveis da região: preço do evento ÷ preço da Baixa Temporada">Salto atual</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Salto desejado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {unmapped.map((e) => (
                  <tr key={e.key} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-5">
                      <input
                        type="checkbox"
                        checked={selected.has(e.key)}
                        onChange={() => toggle(e.key)}
                        className="w-4 h-4 rounded border-gray-300 accent-[#142851]"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{e.name}</td>
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{fmtDate(e.from)} – {fmtDate(e.to)}</td>
                    <td className="py-2.5 px-3 text-gray-700">{e.minNights}n</td>
                    <td className="py-2.5 px-3 text-gray-500 tabular-nums">{e.currentJumpPct === null ? "—" : `${e.currentJumpPct}%`}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={jumpFor(e.key, e.currentJumpPct)}
                          onChange={(ev) => setJumpPct((p) => ({ ...p, [e.key]: parseInt(ev.target.value) || 100 }))}
                          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                        />
                        <span className="text-gray-400 text-xs">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-gray-400">
              Os eventos entram no template desta região e viram linhas na Tabela de Preços, onde você aprova o preço na Stays.
            </span>
            <button
              onClick={addSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-navy hover:bg-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {added ? <><Check className="w-4 h-4" /> Adicionado!</> : <><Plus className="w-4 h-4" /> Adicionar {selectedCount} ao template</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
