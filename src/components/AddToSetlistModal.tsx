import { X, ListMusic, Check, Plus } from 'lucide-react'
import { useSetlistStore } from '../store/setlistStore'

interface Props {
  songId: string
  songTitle: string
  onClose: () => void
}

export function AddToSetlistModal({ songId, songTitle, onClose }: Props) {
  const { setlists, updateSetlist } = useSetlistStore()

  const toggle = async (setlistId: string, currentIds: string[]) => {
    const already = currentIds.includes(songId)
    const next = already
      ? currentIds.filter((id) => id !== songId)
      : [...currentIds, songId]
    await updateSetlist(setlistId, { songIds: next })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center
                 bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-slate-900 border border-slate-700
                   rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Add to setlist</p>
            <p className="text-sm text-slate-200 font-semibold truncate mt-0.5">{songTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 p-1.5 text-slate-400 hover:text-slate-100
                       hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Setlist list */}
        <div className="overflow-y-auto max-h-72">
          {setlists.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
              <ListMusic size={32} className="opacity-30" />
              <p className="text-sm">No setlists yet.</p>
            </div>
          ) : (
            setlists.map((sl) => {
              const included = sl.songIds.includes(songId)
              return (
                <button
                  key={sl.id}
                  onClick={() => toggle(sl.id, sl.songIds)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left
                              border-b border-slate-800/60 last:border-0
                              ${included
                                ? 'bg-violet-900/20 hover:bg-violet-900/30'
                                : 'hover:bg-slate-800/60'}`}
                >
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                                   ${included ? 'bg-violet-600' : 'bg-slate-700'}`}>
                    {included
                      ? <Check size={14} className="text-white" />
                      : <Plus size={14} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${included ? 'text-violet-300' : 'text-slate-200'}`}>
                      {sl.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sl.songIds.length} song{sl.songIds.length !== 1 ? 's' : ''}
                      {sl.venue ? ` · ${sl.venue}` : ''}
                    </p>
                  </div>
                  {included && (
                    <span className="flex-shrink-0 text-xs text-violet-400 font-medium">Added</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Bottom safe area */}
        <div className="h-safe-bottom pb-2" />
      </div>
    </div>
  )
}
