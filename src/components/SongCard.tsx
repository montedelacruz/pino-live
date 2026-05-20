import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListPlus } from 'lucide-react'
import type { Song } from '../db/db'
import { AddToSetlistModal } from './AddToSetlistModal'

interface SongCardProps {
  song: Song
  onClick?: () => void
}

export function SongCard({ song, onClick }: SongCardProps) {
  const navigate = useNavigate()
  const [showSetlistPicker, setShowSetlistPicker] = useState(false)

  const meta = [song.artist, song.key, song.genre, song.language]
    .filter(Boolean)
    .join(' · ')

  const handleCardClick = onClick ?? (() => navigate(`/songs/${song.id}`))

  return (
    <>
      <div
        className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-800 hover:bg-slate-750
                   border border-slate-700 rounded-xl text-left transition-colors group cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick() }}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center
                        group-hover:bg-violet-900/60 transition-colors">
          <span className="text-slate-400 group-hover:text-violet-400 transition-colors font-bold text-base select-none">
            ♪
          </span>
        </div>

        {/* Info */}
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

        {/* Add to setlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowSetlistPicker(true) }}
          className="flex-shrink-0 p-2 text-slate-500 hover:text-violet-400
                     hover:bg-violet-900/30 rounded-lg transition-colors"
          title="Add to setlist"
          aria-label={`Add ${song.title} to a setlist`}
        >
          <ListPlus size={18} />
        </button>
      </div>

      {showSetlistPicker && (
        <AddToSetlistModal
          songId={song.id}
          songTitle={song.title}
          onClose={() => setShowSetlistPicker(false)}
        />
      )}
    </>
  )
}
