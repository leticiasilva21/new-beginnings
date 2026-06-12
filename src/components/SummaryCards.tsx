import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import type { PriceJump } from "../types"

interface Props {
  results: PriceJump[]
  threshold: number
}

export function SummaryCards({ results, threshold }: Props) {
  const withData = results.filter((r) => r.diffPercent !== null)
  const alerts   = withData.filter((r) => r.diffPercent! >  threshold)
  const drops    = withData.filter((r) => r.diffPercent! < -threshold)
  const stable   = withData.filter((r) => Math.abs(r.diffPercent!) <= threshold)
  const noData   = results.filter((r) => r.diffPercent === null)

  const cards = [
    {
      label: `Salto > ${threshold}%`,
      value: alerts.length,
      icon: TrendingUp,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      label: `Queda > ${threshold}%`,
      value: drops.length,
      icon: TrendingDown,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Estável",
      value: stable.length,
      icon: Minus,
      color: "text-green-500",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "Sem dados",
      value: noData.length,
      icon: AlertTriangle,
      color: "text-gray-400",
      bg: "bg-gray-50",
      border: "border-gray-100",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.bg} ${c.border} p-4 flex items-center gap-3`}>
          <div className={`rounded-lg p-2 bg-white ${c.color}`}>
            <c.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{c.value}</div>
            <div className="text-xs text-gray-500">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
