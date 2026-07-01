import type { Listing, Season } from "../types"

const BASE_URL = "https://stays-proxy.leticiasilvabarros09.workers.dev"

const headers = {
  "Content-Type": "application/json",
}

async function fetchWithRetry(url: string, opts: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, opts)
    if (res.ok || i === retries - 1) return res
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
  }
  return fetch(url, opts)
}

export async function fetchListings(): Promise<Listing[]> {
  const all: Listing[] = []
  let skip = 0
  const limit = 100

  while (true) {
    const res = await fetchWithRetry(
      `${BASE_URL}/content/listings?limit=${limit}&skip=${skip}`,
      { headers }
    )
    if (!res.ok) throw new Error(`Listings error: ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break

    const active = data
      .filter((l: any) => l.status === "active")
      .map((l: any) => ({
        _id: l._id,
        id: l.id,
        internalName: l.internalName ?? "",
        title: l._mstitle?.pt_BR ?? l._mstitle?.en_US ?? l.internalName ?? l.id,
        status: l.status,
        region: l.address?.region ?? l.address?.city ?? "",
      }))

    all.push(...active)
    if (data.length < limit) break
    skip += limit
  }

  return all.sort((a, b) => a.internalName.localeCompare(b.internalName))
}

export async function fetchRates(
  listingId: string,
  from: string,
  to: string
): Promise<Season[]> {
  const res = await fetchWithRetry(
    `${BASE_URL}/parr/listing-rates-sell?listingId=${listingId}&from=${from}&to=${to}`,
    { headers }
  )
  if (!res.ok) throw new Error(`Rates error ${res.status} for ${listingId}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchListingSellPrice(listingId: string): Promise<{ regionId: string; regionName: string } | null> {
  const res = await fetchWithRetry(`${BASE_URL}/settings/listing/${listingId}/sellprice`, { headers })
  if (!res.ok) return null
  const data = await res.json()
  const region = data?.region
  if (!region?._id) return null
  return {
    regionId: region._id,
    regionName: region._t_meta?.internalName ?? region._id,
  }
}

export async function fetchPriceRegions(): Promise<{ _id: string; name: string }[]> {
  const res = await fetchWithRetry(`${BASE_URL}/parr/price-regions`, { headers })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function updateSeasonRate(
  seasonId: string,
  listingId: string,
  baseRateValue: number
): Promise<boolean> {
  const res = await fetch(
    `${BASE_URL}/parr/listing-rates-sell/${seasonId}?listingId=${listingId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ listingId, type: "global", baseRateValue }),
    }
  )
  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status))
    console.error("updateSeasonRate failed:", res.status, msg)
  }
  return res.ok
}
