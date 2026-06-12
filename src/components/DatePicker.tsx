import { Calendar } from "lucide-react"

interface Props {
  label: string
  value: string
  onChange: (date: string) => void
}

export function DatePicker({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-none outline-none bg-transparent text-sm text-gray-700 cursor-pointer"
        />
      </div>
    </div>
  )
}
