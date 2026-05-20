import { useNavigate } from 'react-router-dom'
import type { Song } from '../db/db'
import { Music2, ChevronRight } from 'lucide-react'

interface SongCardProps {
  song: Song
  onClick?: () => void
}

export function SongCard({ song, onClick }: SongCardProps) {
  const navigate = useNavigate()

  const meta = [song.artist, song.key, song.genre, song.language]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      onClick={onClick ?? (() => navigate(`/songs/${song.id}`))}
      className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-800 hover:bg-slate-750
                 border border-slate-700 rounded-xl text-left transition-colors group"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center
                      group-hover:bg-violet-900/60 transition-colors">
        <Music2 size={18} className="text-slate-400 group-hover:text-violet-400 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-100 truncate">{song.title}</p>
        {meta && <p className="text-sm text-slate-400 truncate mt-0.5">{meta}</p>}
        {song.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {song.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
    </button>
  )
}
