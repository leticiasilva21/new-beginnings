import { useState, useEffect } from "react"
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

const CACHE_KEY = "nb_region_groups_v2"
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function readCache(): RegionGroup[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data as RegionGroup[]
  } catch {
    return null
  }
}

function writeCache(groups: RegionGroup[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: groups }))
  } catch {}
}

export function useListingsWithRegion() {
  const cached = readCache()
  const [groups, setGroups]     = useState<RegionGroup[]>(cached ?? [])
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState<string | null>(null)

  // Auto-load on mount if not cached
  useEffect(() => {
    if (cached) return   // fresh cache → skip
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      const listings = await fetchListings()
      const regionMap: Record<string, RegionGroup> = {}

      for (let i = 0; i < listings.length; i++) {
        const l = listings[i]
        const region = await fetchListingSellPrice(l.id)
        const regionId   = region?.regionId   ?? "sem-regiao"
        const regionName = region?.regionName ?? "Sem região tarifária"

        const item: ListingWithRegion = { ...l, regionId, regionName }

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
      writeCache(sorted)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return { groups, loading, progress, error, load }
}
