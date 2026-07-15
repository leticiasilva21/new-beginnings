import { useState, useEffect } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"

const ALLOWED_DOMAIN = "carpediemhomes.com.br"

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isAllowed = !!session?.user?.email?.endsWith(`@${ALLOWED_DOMAIN}`)

  async function sendMagicLink(email: string): Promise<{ error: string | null }> {
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return { error: `Acesso restrito a emails @${ALLOWED_DOMAIN}` }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, loading, isAllowed, sendMagicLink, signOut }
}
