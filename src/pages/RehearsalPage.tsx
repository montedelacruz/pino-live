import { useNavigate } from 'react-router-dom'
import { Shuffle, Play, Music2, ArrowLeft } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { useRehearsalStore } from '../store/rehearsalStore'
import type { Song } from '../db/db'

export function RehearsalPage() {
  const navigate = useNavigate()
  const { songs: allSongs } = useSongStore()
  const { songIds, shuffle } = useRehearsalStore()

  // Resolve IDs to songs in rehearsal order
  const songs: Song[] = songIds
    .map((id) => allSongs.find((s) => s.id === id))
    .filter(Boolean) as Song[]

  const handleShuffle = () => shuffle(allSongs)

  const handlePractice = () => {
    if (songs.length === 0) return
    navigate('/practice')
  }

  return (
    <div className="flex flex-col flex-1 pb-24">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-700 flex items-center px-4 h-14 gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-slate-100">Rehearsal</h1>
        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-emerald-400 hover:text-emerald-300 bg-emerald-900/30
                     hover:bg-emerald-900/50 border border-emerald-800/50 rounded-lg transition-colors"
        >
          <Shuffle size={15} />
          Shuffle
        </button>
        <button
          onClick={handlePractice}
          disabled={songs.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg
                     transition-colors disabled:opacity-40"
        >
          <Play size={15} />
          Practice
        </button>
      </header>

      {/* Info bar */}
      <div className="px-4 py-3 flex items-center gap-2 text-sm text-slate-400 border-b border-slate-800">
        <Shuffle size={14} className="text-emerald-500" />
        <span>{songs.length} songs in random order · tap Shuffle to re-randomize</span>
      </div>

      {/* Song list */}
      <div className="px-4 pt-3 space-y-2">
        {songs.map((song, index) => {
          const meta = [song.artist, song.key, song.genre].filter(Boolean).join(' · ')
          return (
            <div
              key={song.id}
              className="flex items-center gap-3 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl"
            >
              {/* Order number */}
              <span className="w-8 text-center text-sm font-mono text-emerald-500 flex-shrink-0">
                {index + 1}
              </span>

              {/* Icon */}
              <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music2 size={16} className="text-slate-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-100 truncate">{song.title}</p>
                {meta && <p className="text-sm text-slate-400 truncate">{meta}</p>}
              </div>

              {/* Tags */}
              {song.tags.length > 0 && (
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block">
                  {song.tags[0]}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      {songs.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pointer-events-none">
          <button
            onClick={handlePractice}
            className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-center
                       gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold
                       text-lg rounded-2xl shadow-xl shadow-emerald-900/40 transition-colors"
          >
            <Play size={22} />
            Start Practice ({songs.length} songs)
          </button>
        </div>
      )}
    </div>
  )
}
