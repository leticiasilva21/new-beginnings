import { useEffect, useState } from "react"
import type { Listing, Season } from "../types"
import { fetchRates } from "../lib/stays"

// Shared across components so the pricing tab fetches each listing's rates once.
// Short TTL so reopening a region after approving prices still shows fresh rates.
const TTL = 2 * 60 * 1000
const cache = new Map<string, Promise<Season[]>>()

function ratesFor(listingId: string, year: number): Promise<Season[]> {
  const key = `${listingId}_${year}`
  let p = cache.get(key)
  if (!p) {
    p = fetchRates(listingId, `${year - 1}-12-01`, `${year + 1}-03-31`).catch(() => {
      cache.delete(key) // don't keep a failure around — retry on the next visit
      return [] as Season[]
    })
    cache.set(key, p)
    setTimeout(() => cache.delete(key), TTL)
  }
  return p
}

export function useRegionRates(listings: Listing[], year: number) {
  const [ratesMap, setRatesMap] = useState<Record<string, Season[]>>({})
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (listings.length === 0) return
    let cancelled = false
    setFetching(true)
    Promise.all(listings.map((l) => ratesFor(l.id, year).then((seasons) => ({ id: l.id, seasons }))))
      .then((results) => {
        if (cancelled) return
        const map: Record<string, Season[]> = {}
        for (const r of results) map[r.id] = r.seasons
        setRatesMap(map)
      })
      .finally(() => { if (!cancelled) setFetching(false) })
    return () => { cancelled = true }
  }, [listings, year])

  return { ratesMap, fetching }
}
