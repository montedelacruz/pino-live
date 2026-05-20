import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Music2, ListMusic, Shuffle, Download } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { useSetlistStore } from '../store/setlistStore'
import { useRehearsalStore } from '../store/rehearsalStore'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function HomePage() {
  const navigate = useNavigate()
  const { songs } = useSongStore()
  const { setlists } = useSetlistStore()
  const startRehearsal = useRehearsalStore((s) => s.setSongs)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  const handleRehearsal = () => {
    if (songs.length === 0) return
    startRehearsal(songs)
    navigate('/rehearsal')
  }

  // Resolves correctly on localhost (/) and GitHub Pages (/pino-live/)
  const bgUrl = `${import.meta.env.BASE_URL}de%20cerca%20FICA%202015.jpg`

  return (
    <div className="relative flex flex-col flex-1 min-h-screen overflow-hidden pb-20">

      {/* ── Background photo ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />

      {/* ── Dark gradient overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-b
                      from-slate-950/80 via-slate-950/40 to-slate-950/90" />

      {/* ── Content ── */}
      <div className="relative flex flex-col flex-1 z-10">

        {/* Title block */}
        <div className="flex flex-col items-center pt-14 pb-6 px-6 text-center">
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            Pino Live!
          </h1>
          <p className="text-slate-300 mt-2 text-base drop-shadow">
            Your live performance companion
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-violet-300 drop-shadow">{songs.length}</p>
              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">Songs</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-violet-300 drop-shadow">{setlists.length}</p>
              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">Setlists</p>
            </div>
          </div>
        </div>

        {/* Spacer — pushes cards to lower half */}
        <div className="flex-1" />

        {/* Action cards */}
        <div className="px-4 pb-6 space-y-3 max-w-lg w-full mx-auto">

          <ActionCard
            icon={<Music2 size={26} className="text-violet-300" />}
            iconBg="bg-violet-600/40"
            border="border-violet-500/30"
            title="Library"
            description="Browse, search and edit your songs"
            onClick={() => navigate('/library')}
          />

          <ActionCard
            icon={<ListMusic size={26} className="text-sky-300" />}
            iconBg="bg-sky-600/40"
            border="border-sky-500/30"
            title="Setlists"
            description="Build and manage setlists for your gigs"
            onClick={() => navigate('/setlists')}
          />

          <ActionCard
            icon={<Shuffle size={26} className="text-emerald-300" />}
            iconBg="bg-emerald-600/40"
            border="border-emerald-500/30"
            title="Rehearsal"
            description="Practice all your songs in random order"
            badge={songs.length === 0 ? 'No songs yet' : `${songs.length} songs`}
            onClick={handleRehearsal}
            disabled={songs.length === 0}
          />

          {installPrompt && (
            <ActionCard
              icon={<Download size={26} className="text-amber-300" />}
              iconBg="bg-amber-600/40"
              border="border-amber-500/30"
              title="Install App"
              description="Add Pino Live! to your home screen"
              onClick={handleInstall}
            />
          )}

        </div>
      </div>
    </div>
  )
}

interface ActionCardProps {
  icon: React.ReactNode
  iconBg: string
  border: string
  title: string
  description: string
  badge?: string
  onClick: () => void
  disabled?: boolean
}

function ActionCard({ icon, iconBg, border, title, description, badge, onClick, disabled }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4
                  bg-slate-900/70 backdrop-blur-md border ${border}
                  rounded-2xl text-left transition-all
                  hover:bg-slate-800/80 active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-white">{title}</p>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
      {badge && (
        <span className="text-xs text-slate-400 bg-slate-700/60 px-2 py-1 rounded-full flex-shrink-0">
          {badge}
        </span>
      )}
      <span className="text-slate-500 flex-shrink-0 text-lg">›</span>
    </button>
  )
}
