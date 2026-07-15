import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { LoginScreen } from './components/LoginScreen.tsx'
import { useAuth } from './hooks/useAuth.ts'

function Root() {
  const { session, loading, isAllowed, sendMagicLink, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || !isAllowed) {
    return <LoginScreen onSend={sendMagicLink} />
  }

  return <App onSignOut={signOut} userEmail={session.user.email ?? ""} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary label="Aplicação">
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
