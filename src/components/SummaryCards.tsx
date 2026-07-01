import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"
import type { PriceJump } from "../types"

interface Props {
  results: PriceJump[]
  threshold: number
}

export function SummaryCards({ results, threshold }: Props) {
  const withData = results.filter((r) => r.deviationFromExpected !== null)
  const alerts   = withData.filter((r) => r.deviationFromExpected! >  threshold)
  const drops    = withData.filter((r) => r.deviationFromExpected! < -threshold)
  const stable   = withData.filter((r) => Math.abs(r.deviationFromExpected!) <= threshold)
  const noData   = results.filter((r) => r.deviationFromExpected === null)

  const cards = [
    {
      label: `Salto acima de ${threshold}%`,
      value: alerts.length,
      icon: TrendingUp,
      accent: "text-red-600",
      border: "border-l-red-500",
    },
    {
      label: `Queda acima de ${threshold}%`,
      value: drops.length,
      icon: TrendingDown,
      accent: "text-navy",
      border: "border-l-navy",
    },
    {
      label: "Dentro do esperado",
      value: stable.length,
      icon: Minus,
      accent: "text-green-600",
      border: "border-l-green-500",
    },
    {
      label: "Sem dados",
      value: noData.length,
      icon: HelpCircle,
      accent: "text-gray-400",
      border: "border-l-gray-300",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-white rounded-lg border border-gray-200 border-l-4 ${c.border} shadow-sm p-5`}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl font-bold text-gray-900">{c.value}</span>
            <c.icon className={`w-4 h-4 mt-1 ${c.accent}`} />
          </div>
          <p className="text-xs text-gray-500 leading-snug">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
