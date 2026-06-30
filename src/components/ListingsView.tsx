import { useState } from "react"
import { ChevronDown, Building2, MapPin, Search } from "lucide-react"
import { cn } from "../lib/utils"
import type { RegionGroup } from "../hooks/useListingsWithRegion"

interface Props {
  groups: RegionGroup[]
  loading: boolean
  progress: number
  error: string | null
  onLoad: () => void
}

export function ListingsView({ groups, loading, progress, error, onLoad }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState("")

  function toggleRegion(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll()   { setExpanded(new Set(groups.map((g) => g.regionId))) }
  function collapseAll() { setExpanded(new Set()) }

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      listings: g.listings.filter(
        (l) =>
          l.id.toLowerCase().includes(search.toLowerCase()) ||
          l.internalName.toLowerCase().includes(search.toLowerCase()) ||
          l.region.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g) => g.listings.length > 0 || search === "")

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar imóvel ou região…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors w-64"
              />
            </div>
            {groups.length > 0 && (
              <div className="flex gap-2 text-xs">
                <button onClick={expandAll}   className="text-navy hover:text-navy font-medium">Expandir tudo</button>
                <span className="text-gray-200">|</span>
                <button onClick={collapseAll} className="text-gray-400 hover:text-gray-600">Recolher tudo</button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {groups.length > 0 && (
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{groups.reduce((a, g) => a + g.listings.length, 0)}</span> imóveis em{" "}
                <span className="font-semibold text-gray-900">{groups.length}</span> regiões
              </span>
            )}
            {groups.length === 0 && !loading && (
              <button
                onClick={onLoad}
                className="flex items-center gap-2 bg-navy hover:bg-navy-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Carregar imóveis por região
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Buscando região tarifária de cada imóvel…</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-navy h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Region groups */}
      {filteredGroups.map((group) => {
        const isOpen = expanded.has(group.regionId)
        return (
          <div key={group.regionId} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => toggleRegion(group.regionId)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "transition-transform duration-150",
                  isOpen ? "rotate-0" : "-rotate-90"
                )}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </span>
                <span className="font-semibold text-gray-900 text-sm">{group.regionName}</span>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {group.listings.length} imóvel{group.listings.length !== 1 ? "s" : ""}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome interno</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Localização</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.listings.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{l.id}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-700 text-sm max-w-xs truncate">{l.internalName}</td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin className="w-3 h-3 shrink-0" />{l.region}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            ativo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}

      {groups.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm text-gray-500">Clique em <strong className="text-gray-700">Carregar imóveis por região</strong> para visualizar.</p>
          <p className="text-xs mt-1 text-gray-300">Isso faz uma requisição por imóvel — pode demorar alguns minutos.</p>
        </div>
      )}
    </div>
  )
}
