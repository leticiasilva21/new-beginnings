import { Calendar } from "lucide-react"

interface Props {
  label: string
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

export function DateRangePicker({ label, from, to, onChange }: Props) {
  function handleDateInput(field: "from" | "to", val: string) {
    if (field === "from") onChange(val, to)
    else onChange(from, val)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-center gap-1 text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => handleDateInput("from", e.target.value)}
            className="border-none outline-none bg-transparent text-gray-700 w-[130px] cursor-pointer"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => handleDateInput("to", e.target.value)}
            className="border-none outline-none bg-transparent text-gray-700 w-[130px] cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
