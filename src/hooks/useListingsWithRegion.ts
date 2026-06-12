import { useState } from "react"
import { fetchListings, fetchListingSellPrice } from "../lib/stays"
import type { Listing } from "../types"

export interface ListingWithRegion extends Listing {
  regionId: string
  regionName: string
}

export interface RegionGroup {
  regionId: string
  regionName: string
  listings: ListingWithRegion[]
}

export function useListingsWithRegion() {
  const [groups, setGroups]     = useState<RegionGroup[]>([])
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      const listings = await fetchListings()
      const withRegion: ListingWithRegion[] = []
      const regionMap: Record<string, RegionGroup> = {}

      for (let i = 0; i < listings.length; i++) {
        const l = listings[i]
        const region = await fetchListingSellPrice(l.id)
        const regionId   = region?.regionId   ?? "sem-regiao"
        const regionName = region?.regionName ?? "Sem região tarifária"

        const item: ListingWithRegion = { ...l, regionId, regionName }
        withRegion.push(item)

        if (!regionMap[regionId]) {
          regionMap[regionId] = { regionId, regionName, listings: [] }
        }
        regionMap[regionId].listings.push(item)

        setProgress(Math.round(((i + 1) / listings.length) * 100))
      }

      const sorted = Object.values(regionMap).sort((a, b) =>
        a.regionName.localeCompare(b.regionName)
      )
      setGroups(sorted)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return { groups, loading, progress, error, load }
}
