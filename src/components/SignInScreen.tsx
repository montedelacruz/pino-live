import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { Music2, Loader2 } from 'lucide-react'

export function SignInScreen() {
  const signIn = useAuthStore((s) => s.signIn)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signIn()
    } catch (err) {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-8 px-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 bg-violet-600/30 rounded-2xl flex items-center justify-center">
          <Music2 size={32} className="text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Pino Live!</h1>
        <p className="text-slate-400 text-sm max-w-xs">
          Sign in with Google to sync your songs and setlists across all your devices.
        </p>
      </div>

      {/* Sign in button */}
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="flex items-center gap-3 px-6 py-3.5 bg-white hover:bg-slate-100
                   text-slate-800 font-semibold rounded-2xl transition-colors
                   disabled:opacity-60 shadow-lg"
      >
        {loading ? (
          <Loader2 size={20} className="animate-spin text-slate-600" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.6 5.1C9.7 39.7 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.8 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
        )}
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <p className="text-slate-600 text-xs text-center max-w-xs">
        Your data is private and only accessible with your Google account.
      </p>
    </div>
  )
}
