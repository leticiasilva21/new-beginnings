import { useState, useEffect, useRef } from "react"
import { Trash2, Plus, Check, Copy, ChevronDown } from "lucide-react"
import { usePricingTemplates } from "../hooks/usePricingTemplates"
import type { TemplateSeason } from "../types/template"

interface Props {
  regionId: string
  regionName: string
  allRegions?: { regionId: string; regionName: string }[]
}

const COLORS = [
  "#2563eb","#7c3aed","#059669","#d97706","#dc2626",
  "#0891b2","#9333ea","#16a34a","#ea580c","#4f46e5",
]

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10)
}

function formatMD(md: string): string {
  if (!md || !md.includes("-")) return md ?? "—"
  const [m, d] = md.split("-")
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const month = months[parseInt(m) - 1]
  if (!month) return md
  return `${d}/${month}`
}

function MDInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder="MM-DD"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy font-mono transition-colors"
    />
  )
}

export function TemplateEditor({ regionId, regionName, allRegions = [] }: Props) {
  const { getTemplate, saveTemplate, resetTemplate } = usePricingTemplates()
  const [seasons, setSeasons] = useState<TemplateSeason[]>([])
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copySelected, setCopySelected] = useState<Set<string>>(new Set())
  const [copyDone, setCopyDone] = useState(false)
  const copyRef = useRef<HTMLDivElement>(null)

  const otherRegions = allRegions.filter((r) => r.regionId !== regionId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (copyRef.current && !copyRef.current.contains(e.target as Node)) {
        setCopyOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function toggleCopyRegion(id: string) {
    setCopySelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllCopy() {
    if (copySelected.size === otherRegions.length) {
      setCopySelected(new Set())
    } else {
      setCopySelected(new Set(otherRegions.map((r) => r.regionId)))
    }
  }

  function applyCopy() {
    for (const rid of copySelected) {
      saveTemplate({ regionId: rid, seasons: seasons.map((s) => ({ ...s })), savedAt: new Date().toISOString() })
    }
    setCopyDone(true)
    setTimeout(() => { setCopyDone(false); setCopyOpen(false); setCopySelected(new Set()) }, 1800)
  }

  useEffect(() => {
    const t = getTemplate(regionId)
    setSeasons(t.seasons.map((s) => ({ ...s })))
    setDirty(false)
  }, [regionId, getTemplate])

  function update(id: string, field: keyof TemplateSeason, value: any) {
    setSeasons((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
    setDirty(true)
  }

  function addSeason() {
    const blank: TemplateSeason = {
      id: nanoid(),
      name: "Nova Temporada",
      startMD: "01-01",
      endMD: "01-31",
      minNights: 2,
      multiplierPct: 120,
      isBase: false,
      color: randomColor(),
    }
    setSeasons((prev) => [...prev, blank])
    setDirty(true)
  }

  function deleteSeason(id: string) {
    setSeasons((prev) => prev.filter((s) => s.id !== id))
    setDirty(true)
  }

  function handleSave() {
    saveTemplate({ regionId, seasons, savedAt: new Date().toISOString() })
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    resetTemplate(regionId)
    const t = getTemplate(regionId)
    setSeasons(t.seasons.map((s) => ({ ...s })))
    setDirty(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Template de Temporadas</h2>
          <p className="text-xs text-gray-500 mt-0.5">{regionName}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              Não salvo
            </span>
          )}
          <button
            onClick={() => setEditMode((e) => !e)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            {editMode ? "Visualizar" : "Editar"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="py-2.5 px-5 text-left w-6" />
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Temporada</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Início</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fim</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mín. Noites</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Multiplicador</th>
              {editMode && <th className="py-2.5 px-3 w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {seasons.map((s) => (
              <tr key={s.id} className={s.isBase ? "bg-navy-light/40" : "hover:bg-gray-50 transition-colors"}>
                <td className="py-3 px-5">
                  {editMode && !s.isBase ? (
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => update(s.id, "color", e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                  ) : (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />
                  )}
                </td>
                <td className="py-3 px-3">
                  {editMode && !s.isBase ? (
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => update(s.id, "name", e.target.value)}
                      className="w-40 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{s.name}</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  {editMode && !s.isBase
                    ? <MDInput value={s.startMD} onChange={(v) => update(s.id, "startMD", v)} />
                    : <span className="text-gray-500 text-sm">{formatMD(s.startMD)}</span>}
                </td>
                <td className="py-3 px-3">
                  {editMode && !s.isBase
                    ? <MDInput value={s.endMD} onChange={(v) => update(s.id, "endMD", v)} />
                    : <span className="text-gray-500 text-sm">{formatMD(s.endMD)}</span>}
                </td>
                <td className="py-3 px-3">
                  {editMode ? (
                    <input
                      type="number"
                      min={1}
                      value={s.minNights}
                      onChange={(e) => update(s.id, "minNights", parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                    />
                  ) : (
                    <span className="text-gray-700">{s.minNights}n</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  {s.isBase ? (
                    <span className="text-xs font-semibold text-navy bg-navy-light px-2 py-0.5 rounded-md">BASE 100%</span>
                  ) : editMode ? (
                    <input
                      type="number"
                      min={1}
                      value={s.multiplierPct}
                      onChange={(e) => update(s.id, "multiplierPct", parseInt(e.target.value) || 100)}
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                    />
                  ) : (
                    <span className="text-gray-700">{s.multiplierPct}%</span>
                  )}
                </td>
                {editMode && (
                  <td className="py-3 px-3">
                    {!s.isBase && (
                      <button
                        onClick={() => deleteSeason(s.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir temporada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
        {editMode && (
          <button
            onClick={addSeason}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-800 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar temporada
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Copy to other regions */}
          {otherRegions.length > 0 && (
            <div className="relative" ref={copyRef}>
              <button
                onClick={() => { setCopyOpen((o) => !o); setCopyDone(false) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                Aplicar em outras regiões
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${copyOpen ? "rotate-180" : ""}`} />
              </button>

              {copyOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Aplicar template em outras regiões</p>
                    <p className="text-xs text-gray-500 mt-0.5">O template atual de <span className="font-medium text-gray-700">{regionName}</span> será copiado para as regiões selecionadas.</p>
                  </div>

                  <div className="px-4 py-2 border-b border-gray-100">
                    <button onClick={toggleAllCopy} className="text-xs font-medium text-navy hover:underline">
                      {copySelected.size === otherRegions.length ? "Desmarcar todas" : "Selecionar todas"}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                    {otherRegions.map((r) => (
                      <label key={r.regionId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={copySelected.has(r.regionId)}
                          onChange={() => toggleCopyRegion(r.regionId)}
                          className="w-4 h-4 rounded border-gray-300 text-navy accent-[#142851]"
                        />
                        <span className="text-sm text-gray-700 truncate">{r.regionName}</span>
                      </label>
                    ))}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">
                      {copySelected.size > 0 ? `${copySelected.size} região${copySelected.size > 1 ? "ns" : ""} selecionada${copySelected.size > 1 ? "s" : ""}` : "Nenhuma selecionada"}
                    </span>
                    <button
                      onClick={applyCopy}
                      disabled={copySelected.size === 0 || copyDone}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-navy hover:bg-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {copyDone ? <><Check className="w-3.5 h-3.5" /> Aplicado!</> : "Aplicar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            Restaurar padrão
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-navy hover:bg-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {saved ? <><Check className="w-4 h-4" /> Salvo!</> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}
