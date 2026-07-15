import { useState, useCallback } from "react"
import { Search, MapPin, User, Building2, Plus, X, Check } from "lucide-react"
import { supabase } from "../lib/supabase"

interface Imovel {
  id: number
  nome_interno: string
  stays_id: string | null
  titulo: string | null
  unidade_negocio: string | null
  lider: string | null
  status: string | null
}

const BLANK_FORM = { nome_interno: "", stays_id: "", titulo: "", unidade_negocio: "", lider: "" }

export function ImoveisSearch() {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<Imovel[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(BLANK_FORM)
  const [saving, setSaving]     = useState(false)
  const [saveOk, setSaveOk]     = useState(false)
  const [saveErr, setSaveErr]   = useState<string | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    const term = q.trim()
    const { data } = await supabase
      .from("imoveis")
      .select("id,nome_interno,stays_id,titulo,unidade_negocio,lider,status")
      .eq("status", "Ativo")
      .or(`nome_interno.ilike.%${term}%,stays_id.ilike.%${term}%,titulo.ilike.%${term}%`)
      .order("nome_interno")
      .limit(50)
    setResults(data ?? [])
    setLoading(false)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    search(v)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome_interno.trim()) return
    setSaving(true)
    setSaveErr(null)
    const { error } = await supabase.from("imoveis").insert({
      nome_interno:    form.nome_interno.trim(),
      stays_id:        form.stays_id.trim() || null,
      titulo:          form.titulo.trim() || null,
      unidade_negocio: form.unidade_negocio.trim() || null,
      lider:           form.lider.trim() || null,
      status:          "Ativo",
    })
    setSaving(false)
    if (error) { setSaveErr(error.message); return }
    setSaveOk(true)
    setForm(BLANK_FORM)
    setTimeout(() => { setSaveOk(false); setShowForm(false) }, 1500)
    if (query.trim().length >= 2) search(query)
  }

  return (
    <div className="space-y-4">

      {/* Header + Add button */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Buscar Imóvel</h2>
            <p className="text-xs text-gray-500">Pesquise pelo ID Stays, nome interno ou título do anúncio.</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setSaveErr(null); setSaveOk(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Cancelar" : "Cadastrar imóvel"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSave} className="border border-gray-100 rounded-lg p-4 bg-gray-50 mb-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Novo imóvel</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome interno <span className="text-red-400">*</span></label>
                <input value={form.nome_interno} onChange={(e) => setForm({ ...form, nome_interno: e.target.value })}
                  placeholder="BA-SSA-AR.NomeImovel/Proprietario"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors bg-white" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID Stays</label>
                <input value={form.stays_id} onChange={(e) => setForm({ ...form, stays_id: e.target.value })}
                  placeholder="Ex: RD82H"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors bg-white font-mono" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Título do anúncio</label>
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Apartamento com vista para o mar"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors bg-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unidade de negócio (rota)</label>
                <input value={form.unidade_negocio} onChange={(e) => setForm({ ...form, unidade_negocio: e.target.value })}
                  placeholder="Ex: BA - ART STUDIOS"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors bg-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Líder</label>
                <input value={form.lider} onChange={(e) => setForm({ ...form, lider: e.target.value })}
                  placeholder="Ex: Ana"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors bg-white" />
              </div>
            </div>
            {saveErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{saveErr}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving || saveOk}
                className="flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-hover disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors">
                {saveOk ? <><Check className="w-4 h-4" /> Salvo!</> : saving ? "Salvando…" : "Salvar imóvel"}
              </button>
            </div>
          </form>
        )}

        {/* Search input */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Ex: RD82H, Art Studio, Praia do Forte…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
          />
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          Buscando…
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-500">Nenhum imóvel ativo encontrado para <strong className="text-gray-700">"{query}"</strong></p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-navy hover:underline font-medium">
            + Cadastrar este imóvel
          </button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {results.length} resultado{results.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {results.map((im) => (
              <div key={im.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{im.nome_interno}</span>
                      {im.stays_id && (
                        <span className="font-mono text-xs bg-navy-light text-navy px-2 py-0.5 rounded font-medium shrink-0">
                          {im.stays_id}
                        </span>
                      )}
                    </div>
                    {im.titulo && <p className="text-xs text-gray-500 mb-2">{im.titulo}</p>}
                    <div className="flex items-center gap-4 flex-wrap">
                      {im.unidade_negocio ? (
                        <span className="flex items-center gap-1.5 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium">{im.unidade_negocio}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Sem rota definida
                        </span>
                      )}
                      {im.lider && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {im.lider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!searched && !showForm && (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">Digite pelo menos 2 caracteres para buscar.</p>
        </div>
      )}
    </div>
  )
}
