import { RefreshCw, ChevronDown, X } from "lucide-react"
import { cn } from "../lib/utils"
import type { RegionGroup } from "../hooks/useListingsWithRegion"

interface Props {
  groups: RegionGroup[]
  loading: boolean
  progress: number
  selectedRegionId: string | null
  onSelect: (regionId: string | null) => void
  onLoad: () => void
}

export function RegionSelect({ groups, loading, progress, selectedRegionId, onSelect, onLoad }: Props) {
  const selected = groups.find((g) => g.regionId === selectedRegionId) ?? null

  // Not loaded yet
  if (groups.length === 0 && !loading) {
    return (
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
          Região Tarifária
        </label>
        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-orange-300 rounded-lg text-sm text-orange-600 hover:bg-orange-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Carregar regiões
        </button>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="min-w-[240px]">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
          Região Tarifária
        </label>
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 w-full">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500 shrink-0" />
          <span>Carregando regiões… {progress}%</span>
        </div>
        <div className="mt-1 w-full bg-gray-100 rounded-full h-1">
          <div
            className="bg-orange-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  // Loaded — show native select
  return (
    <div className="min-w-[240px]">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
        Região Tarifária
      </label>
      <div className="relative">
        <select
          value={selectedRegionId ?? ""}
          onChange={(e) => onSelect(e.target.value || null)}
          className={cn(
            "w-full appearance-none px-3 py-2 pr-8 border rounded-lg text-sm outline-none transition-colors bg-white",
            selectedRegionId
              ? "border-orange-400 text-gray-800 font-medium"
              : "border-gray-200 text-gray-400"
          )}
        >
          <option value="">Selecionar região…</option>
          {groups.map((g) => (
            <option key={g.regionId} value={g.regionId}>
              {g.regionName} ({g.listings.length} imóveis)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {selected && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">
            {selected.listings.length} imóveis selecionados automaticamente
          </span>
          <button
            onClick={() => onSelect(null)}
            className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" /> limpar
          </button>
        </div>
      )}
    </div>
  )
}
