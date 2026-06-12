import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../lib/utils"
import type { Listing } from "../types"

interface Props {
  listings: Listing[]
  selected: string[]   // listing ids
  onChange: (ids: string[]) => void
}

export function ListingMultiSelect({ listings, selected, onChange }: Props) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = listings.filter(
    (l) =>
      l.internalName.toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase()) ||
      l.region.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  function selectAll() { onChange(listings.map((l) => l.id)) }
  function clearAll()  { onChange([]) }

  const label =
    selected.length === 0
      ? "Todos os imóveis"
      : selected.length === listings.length
      ? "Todos os imóveis"
      : `${selected.length} imóvel${selected.length > 1 ? "s" : ""} selecionado${selected.length > 1 ? "s" : ""}`

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Imóveis
      </label>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-sm text-gray-700 min-w-[220px] hover:border-gray-300 transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-80 overflow-hidden" style={{ top: "auto" }}>
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Buscar imóvel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex gap-2 px-3 py-1.5 text-xs border-b border-gray-100">
            <button onClick={selectAll} className="text-orange-500 hover:underline">Todos</button>
            <button onClick={clearAll}  className="text-gray-400 hover:underline">Nenhum</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum resultado</p>
            )}
            {filtered.map((l) => {
              const isSelected = selected.includes(l.id)
              return (
                <button
                  key={l.id}
                  onClick={() => toggle(l.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors",
                    isSelected && "bg-orange-50"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                    isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">{l.id}</div>
                    <div className="text-xs text-gray-400 truncate">{l.region}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
