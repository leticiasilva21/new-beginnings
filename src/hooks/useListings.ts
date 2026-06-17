import { useState, useEffect, useCallback } from "react"
import { fetchListings } from "../lib/stays"
import type { Listing } from "../types"

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { listings, loading, error, reload: load }
}
