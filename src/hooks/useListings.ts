import { useState, useEffect } from "react"
import { fetchListings } from "../lib/stays"
import type { Listing } from "../types"

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { listings, loading, error }
}
