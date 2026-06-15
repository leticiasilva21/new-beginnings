import { useState, useCallback } from "react"
import type { RegionTemplate } from "../types/template"
import { getDefaultTemplate } from "../data/defaultSeasons"

const STORAGE_KEY = "nb_pricing_templates_v1"

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
  const [, forceUpdate] = useState(0)

  const getTemplate = useCallback((regionId: string): RegionTemplate => {
    const all = loadAll()
    return all[regionId] ?? getDefaultTemplate(regionId)
  }, [])

  const saveTemplate = useCallback((template: RegionTemplate) => {
    const all = loadAll()
    all[template.regionId] = { ...template, savedAt: new Date().toISOString() }
    saveAll(all)
    forceUpdate((n) => n + 1)
  }, [])

  const resetTemplate = useCallback((regionId: string) => {
    const all = loadAll()
    delete all[regionId]
    saveAll(all)
    forceUpdate((n) => n + 1)
  }, [])

  return { getTemplate, saveTemplate, resetTemplate }
}
