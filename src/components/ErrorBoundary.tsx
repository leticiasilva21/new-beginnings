import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {this.props.label ?? "Algo deu errado"} ao carregar esta seção.
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
