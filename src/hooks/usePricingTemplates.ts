import { useState, useCallback, useEffect } from "react"
import type { RegionTemplate } from "../types/template"
import { getDefaultTemplate } from "../data/defaultSeasons"

const STORAGE_KEY = "nb_pricing_templates_v1"

// Module-level subscribers — notifies ALL hook instances when any saves
const subscribers = new Set<() => void>()
let revision = 0

function notifyAll() {
  revision++
  subscribers.forEach((fn) => fn())
}

function loadAll(): Record<string, RegionTemplate> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAll(all: Record<string, RegionTemplate>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function usePricingTemplates() {
  const [, setRev] = useState(revision)

  useEffect(() => {
    const notify = () => setRev(revision)
    subscribers.add(notify)
    return () => { subscribers.delete(notify) }
  }, [])

  const getTemplate = useCallback((regionId: string): RegionTemplate => {
    const all = loadAll()
    return all[regionId] ?? getDefaultTemplate(regionId)
  }, [])

  const saveTemplate = useCallback((template: RegionTemplate) => {
    const all = loadAll()
    all[template.regionId] = { ...template, savedAt: new Date().toISOString() }
    saveAll(all)
    notifyAll()
  }, [])

  const resetTemplate = useCallback((regionId: string) => {
    const all = loadAll()
    delete all[regionId]
    saveAll(all)
    notifyAll()
  }, [])

  return { getTemplate, saveTemplate, resetTemplate }
}
