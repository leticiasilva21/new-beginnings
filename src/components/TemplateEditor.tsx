import { useState, useEffect } from "react"
import { Trash2, Plus } from "lucide-react"
import { usePricingTemplates } from "../hooks/usePricingTemplates"
import type { TemplateSeason } from "../types/template"

interface Props {
  regionId: string
  regionName: string
}

const COLORS = [
  "#f97316","#3b82f6","#10b981","#8b5cf6","#f59e0b",
  "#ef4444","#06b6d4","#84cc16","#ec4899","#6366f1",
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
      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-orange-400 font-mono"
    />
  )
}

export function TemplateEditor({ regionId, regionName }: Props) {
  const { getTemplate, saveTemplate, resetTemplate } = usePricingTemplates()
  const [seasons, setSeasons] = useState<TemplateSeason[]>([])
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editMode, setEditMode] = useState(false)

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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800">
          Template de Temporadas — {regionName}
        </h2>
        <button
          onClick={() => setEditMode((e) => !e)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
        >
          {editMode ? "Modo visualização" : "Editar"}
        </button>
      </div>

      {dirty && (
        <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          Alterações não salvas
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="py-2 pr-2 text-left w-4"></th>
              <th className="py-2 pr-3 text-left">Temporada</th>
              <th className="py-2 pr-3 text-left">Início</th>
              <th className="py-2 pr-3 text-left">Fim</th>
              <th className="py-2 pr-3 text-left">Mín. Noites</th>
              <th className="py-2 pr-3 text-left">Multiplicador %</th>
              {editMode && <th className="py-2 text-left w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr
                key={s.id}
                className={s.isBase ? "bg-orange-50" : "hover:bg-gray-50"}
              >
                <td className="py-1.5 pr-2">
                  {editMode && !s.isBase ? (
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => update(s.id, "color", e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                  ) : (
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {editMode && !s.isBase ? (
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => update(s.id, "name", e.target.value)}
                      className="w-36 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-orange-400"
                    />
                  ) : (
                    <span className="font-medium text-gray-800">{s.name}</span>
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {editMode && !s.isBase ? (
                    <MDInput value={s.startMD} onChange={(v) => update(s.id, "startMD", v)} />
                  ) : (
                    <span className="text-gray-500">{formatMD(s.startMD)}</span>
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {editMode && !s.isBase ? (
                    <MDInput value={s.endMD} onChange={(v) => update(s.id, "endMD", v)} />
                  ) : (
                    <span className="text-gray-500">{formatMD(s.endMD)}</span>
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {editMode ? (
                    <input
                      type="number"
                      min={1}
                      value={s.minNights}
                      onChange={(e) => update(s.id, "minNights", parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-orange-400"
                    />
                  ) : (
                    <span className="text-gray-700">{s.minNights}</span>
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {s.isBase ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">100 BASE</span>
                  ) : editMode ? (
                    <input
                      type="number"
                      min={1}
                      value={s.multiplierPct}
                      onChange={(e) => update(s.id, "multiplierPct", parseInt(e.target.value) || 100)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-orange-400"
                    />
                  ) : (
                    <span className="text-gray-700">{s.multiplierPct}%</span>
                  )}
                </td>
                {editMode && (
                  <td className="py-1.5">
                    {s.isBase ? (
                      <span className="px-2 py-0.5 bg-orange-500 text-white rounded text-xs font-bold">BASE</span>
                    ) : (
                      <button
                        onClick={() => deleteSeason(s.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

      {editMode && (
        <button
          onClick={addSeason}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-600 border border-dashed border-orange-300 rounded-lg hover:bg-orange-50 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar temporada
        </button>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          Salvar para esta região
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          Restaurar padrão
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Salvo!</span>
        )}
      </div>
    </div>
  )
}
