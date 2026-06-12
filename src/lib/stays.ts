import type { Listing, Season } from "../types"

const BASE_URL = "https://rbm.stays.com.br/external/v1"
const AUTH = "Basic " + btoa("36f8bda9:59e627b3")

const headers = {
  Authorization: AUTH,
  "Content-Type": "application/json",
}

export async function fetchListings(): Promise<Listing[]> {
  const all: Listing[] = []
  let skip = 0
  const limit = 100

  while (true) {
    const res = await fetch(
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
  const res = await fetch(
    `${BASE_URL}/parr/listing-rates-sell?listingId=${listingId}&from=${from}&to=${to}`,
    { headers }
  )
  if (!res.ok) throw new Error(`Rates error ${res.status} for ${listingId}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
