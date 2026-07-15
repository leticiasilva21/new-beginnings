import { useState } from "react"
import { Mail, Check } from "lucide-react"

interface Props {
  onSend: (email: string) => Promise<{ error: string | null }>
}

export function LoginScreen({ onSend }: Props) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await onSend(email.trim())
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
            <span className="text-white text-xs font-bold">CD</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">Carpediem</span>
            <span className="text-sm text-gray-400 ml-1.5">Revenue</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {!sent ? (
            <>
              <h1 className="text-base font-semibold text-gray-900 mb-1">Entrar na plataforma</h1>
              <p className="text-sm text-gray-500 mb-6">
                Digite seu email corporativo para receber o link de acesso.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@carpediemhomes.com.br"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {loading ? "Enviando…" : "Enviar link de acesso"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Link enviado!</h2>
              <p className="text-sm text-gray-500">
                Verifique sua caixa de entrada em <span className="font-medium text-gray-700">{email}</span> e clique no link para entrar.
              </p>
              <button
                onClick={() => { setSent(false); setEmail("") }}
                className="mt-4 text-xs text-navy hover:underline"
              >
                Usar outro email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Acesso restrito a @carpediemhomes.com.br
        </p>
      </div>
    </div>
  )
}
