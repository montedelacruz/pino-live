import { useNavigate, useParams } from 'react-router-dom'
import { Edit2, Type, AlignLeft } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSongStore } from '../store/songStore'
import { useSettingsStore } from '../store/settingsStore'

export function SongViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { songs } = useSongStore()
  const { fontSize, lineHeight, fontMode, increaseFontSize, decreaseFontSize, increaseLineHeight, decreaseLineHeight, toggleFontMode } =
    useSettingsStore()

  const song = songs.find((s) => s.id === id)

  if (!song) {
    return (
      <div className="flex flex-col flex-1 pb-20">
        <TopBar title="Song not found" showBack />
        <div className="flex-1 flex items-center justify-center text-slate-500">
          This song no longer exists.
        </div>
      </div>
    )
  }

  const meta = [song.artist, song.key, song.language, song.genre]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopBar
        title={song.title}
        showBack
        right={
          <div className="flex items-center gap-1">
            {/* Font mode toggle */}
            <button
              onClick={toggleFontMode}
              title={fontMode === 'normal' ? 'Switch to chord/monospace mode' : 'Switch to normal mode'}
              className={`p-2 rounded-lg transition-colors ${
                fontMode === 'monospace'
                  ? 'bg-violet-700/40 text-violet-300'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {fontMode === 'monospace' ? <Type size={18} /> : <AlignLeft size={18} />}
            </button>

            {/* Font size */}
            <button
              onClick={decreaseFontSize}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors font-bold text-sm"
              title="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={increaseFontSize}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors font-bold"
              title="Increase font size"
            >
              A+
            </button>

            {/* Line spacing */}
            <button
              onClick={decreaseLineHeight}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Tighter line spacing"
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
                <rect x="2" y="2" width="14" height="2" rx="1"/>
                <rect x="2" y="8" width="14" height="2" rx="1"/>
                <rect x="2" y="14" width="14" height="2" rx="1"/>
              </svg>
            </button>
            <button
              onClick={increaseLineHeight}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Looser line spacing"
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
                <rect x="2" y="2" width="14" height="2" rx="1"/>
                <rect x="2" y="9" width="14" height="2" rx="1"/>
                <rect x="2" y="16" width="14" height="2" rx="1"/>
              </svg>
            </button>

            {/* Edit */}
            <button
              onClick={() => navigate(`/songs/${song.id}/edit`)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit song"
            >
              <Edit2 size={18} />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 space-y-3 max-w-2xl w-full mx-auto">
        {/* Meta */}
        {meta && (
          <p className="text-sm text-slate-400">{meta}</p>
        )}
        {song.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {song.tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Lyrics */}
        <div
          className={`whitespace-pre-wrap text-slate-100 pt-2 ${
            fontMode === 'monospace' ? 'font-mono' : ''
          }`}
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {song.lyrics || <span className="text-slate-500 italic">No lyrics added yet.</span>}
        </div>

        {/* Notes */}
        {song.notes && (
          <div className="mt-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Notes (private)</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{song.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
