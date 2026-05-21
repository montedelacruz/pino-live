import { SignIn } from '@clerk/clerk-react'
import { Music2 } from 'lucide-react'

export function SignInScreen() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6 px-4 overflow-y-auto py-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 bg-violet-600/30 rounded-2xl flex items-center justify-center">
          <Music2 size={32} className="text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Pino Live!</h1>
        <p className="text-slate-400 text-sm max-w-xs">
          Sign in to sync your songs and setlists across all your devices.
        </p>
      </div>

      {/* Clerk sign-in widget */}
      <SignIn
        routing="virtual"
        appearance={{
          variables: {
            colorPrimary: '#7c3aed',
            colorBackground: '#1e293b',
            colorText: '#f1f5f9',
            colorInputBackground: '#0f172a',
            colorInputText: '#f1f5f9',
            borderRadius: '0.75rem',
          },
          elements: {
            card: 'shadow-2xl border border-slate-700',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
          },
        }}
      />
    </div>
  )
}
