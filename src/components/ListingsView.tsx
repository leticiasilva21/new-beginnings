import { useState } from "react"
import { ChevronDown, ChevronRight, Building2, MapPin } from "lucide-react"
import { useListingsWithRegion } from "../hooks/useListingsWithRegion"

export function ListingsView() {
  const { groups, loading, progress, error, load } = useListingsWithRegion()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState("")

  function toggleRegion(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll() { setExpanded(new Set(groups.map((g) => g.regionId))) }
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
      {/* Header actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar imóvel ou região..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400 w-64"
            />
            {groups.length > 0 && (
              <div className="flex gap-2 text-xs">
                <button onClick={expandAll}  className="text-orange-500 hover:underline">Expandir tudo</button>
                <span className="text-gray-300">|</span>
                <button onClick={collapseAll} className="text-gray-400 hover:underline">Recolher tudo</button>
              </div>
            )}
          </div>

          {groups.length === 0 && !loading && (
            <button
              onClick={load}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Carregar imóveis por região
            </button>
          )}

          {groups.length > 0 && (
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{groups.reduce((a, g) => a + g.listings.length, 0)}</span> imóveis em{" "}
              <span className="font-semibold text-gray-800">{groups.length}</span> regiões
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Buscando região tarifária de cada imóvel...</span>
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
          <div key={group.regionId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => toggleRegion(group.regionId)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                }
                <span className="font-semibold text-gray-800">{group.regionName}</span>
              </div>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {group.listings.length} imóvel{group.listings.length !== 1 ? "s" : ""}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome interno</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Localização</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.listings.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{l.id}</span>
                        </td>
                        <td className="px-5 py-2.5 text-gray-700 max-w-xs truncate">{l.internalName}</td>
                        <td className="px-5 py-2.5">
                          <span className="flex items-center gap-1 text-gray-500 text-xs">
                            <MapPin className="w-3 h-3" />{l.region}
                          </span>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="inline-flex items-center bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
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
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Clique em <strong>Carregar imóveis por região</strong> para visualizar.</p>
          <p className="text-xs mt-1 text-gray-300">Isso faz uma requisição por imóvel — pode demorar alguns minutos para 790 imóveis.</p>
        </div>
      )}
    </div>
  )
}
