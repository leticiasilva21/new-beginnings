import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtBRL(value: number | null | undefined): string {
  if (value == null) return "—"
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function isoDate(date: Date): string {
  return date.toISOString().split("T")[0]
}
