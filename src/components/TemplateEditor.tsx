import { useState, useEffect } from "react"
import { usePricingTemplates } from "../hooks/usePricingTemplates"
import type { TemplateSeason } from "../types/template"

interface Props {
  regionId: string
  regionName: string
}

function formatMD(md: string): string {
  const [m, d] = md.split("-")
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return `${d}/${months[parseInt(m) - 1]}`
}

export function TemplateEditor({ regionId, regionName }: Props) {
  const { getTemplate, saveTemplate, resetTemplate } = usePricingTemplates()
  const [seasons, setSeasons] = useState<TemplateSeason[]>([])
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const t = getTemplate(regionId)
    setSeasons(t.seasons.map((s) => ({ ...s })))
    setDirty(false)
  }, [regionId, getTemplate])

  function updateSeason(id: string, field: "multiplierPct" | "minNights", value: number) {
    setSeasons((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
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
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Template de Temporadas — {regionName}
      </h2>

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
              <th className="py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr
                key={s.id}
                className={s.isBase ? "bg-orange-50" : "hover:bg-gray-50"}
              >
                <td className="py-1.5 pr-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                </td>
                <td className="py-1.5 pr-3 font-medium text-gray-800">{s.name}</td>
                <td className="py-1.5 pr-3 text-gray-500">{formatMD(s.startMD)}</td>
                <td className="py-1.5 pr-3 text-gray-500">{formatMD(s.endMD)}</td>
                <td className="py-1.5 pr-3">
                  <input
                    type="number"
                    min={1}
                    value={s.minNights}
                    onChange={(e) => updateSeason(s.id, "minNights", parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-orange-400"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  {s.isBase ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">100 BASE</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={s.multiplierPct}
                      onChange={(e) => updateSeason(s.id, "multiplierPct", parseInt(e.target.value) || 100)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-orange-400"
                    />
                  )}
                </td>
                <td className="py-1.5">
                  {s.isBase && (
                    <span className="px-2 py-0.5 bg-orange-500 text-white rounded text-xs font-bold">BASE</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
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
