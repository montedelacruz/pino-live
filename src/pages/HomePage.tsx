import { useNavigate } from 'react-router-dom'
import { Music2, ListMusic, Shuffle, Zap } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { useSetlistStore } from '../store/setlistStore'
import { useRehearsalStore } from '../store/rehearsalStore'

export function HomePage() {
  const navigate = useNavigate()
  const { songs } = useSongStore()
  const { setlists } = useSetlistStore()
  const startRehearsal = useRehearsalStore((s) => s.setSongs)

  const handleRehearsal = () => {
    if (songs.length === 0) return
    startRehearsal(songs)
    navigate('/rehearsal')
  }

  return (
    <div className="flex flex-col flex-1 pb-24">

      {/* Hero */}
      <div className="flex flex-col items-center justify-center pt-12 pb-8 px-6 text-center">
        <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-900/50">
          <Zap size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Pino Live!</h1>
        <p className="text-slate-400 mt-1 text-sm">Your live performance companion</p>

        {/* Stats */}
        <div className="flex gap-6 mt-5">
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-400">{songs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Songs</p>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-400">{setlists.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Setlists</p>
          </div>
        </div>
      </div>

      {/* Action cards */}
      <div className="px-4 space-y-3 max-w-lg w-full mx-auto">

        {/* Library */}
        <ActionCard
          icon={<Music2 size={26} className="text-violet-400" />}
          iconBg="bg-violet-900/50"
          title="Library"
          description="Browse, search and edit your full song collection"
          onClick={() => navigate('/library')}
        />

        {/* Setlists */}
        <ActionCard
          icon={<ListMusic size={26} className="text-sky-400" />}
          iconBg="bg-sky-900/50"
          title="Setlists"
          description="Build and manage setlists for your gigs"
          onClick={() => navigate('/setlists')}
        />

        {/* Rehearsal */}
        <ActionCard
          icon={<Shuffle size={26} className="text-emerald-400" />}
          iconBg="bg-emerald-900/50"
          title="Rehearsal"
          description="Practice all your songs in a random order"
          badge={songs.length === 0 ? 'No songs yet' : undefined}
          onClick={handleRehearsal}
          disabled={songs.length === 0}
        />

      </div>
    </div>
  )
}

interface ActionCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  badge?: string
  onClick: () => void
  disabled?: boolean
}

function ActionCard({ icon, iconBg, title, description, badge, onClick, disabled }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 p-5 bg-slate-800 border border-slate-700
                 rounded-2xl text-left transition-all
                 hover:border-slate-500 hover:bg-slate-750 active:scale-[0.98]
                 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-slate-100">{title}</p>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
      {badge && (
        <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full flex-shrink-0">
          {badge}
        </span>
      )}
      <div className="text-slate-600 flex-shrink-0">›</div>
    </button>
  )
}
