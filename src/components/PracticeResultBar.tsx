import { ThumbsUp, Wrench, SkipForward } from 'lucide-react'

interface Props {
  onNailed:    () => void
  onNeedsWork: () => void
  onSkip:      () => void
  /** Show a subtle pulse on the Nailed button to invite interaction */
  highlight?: boolean
}

export function PracticeResultBar({ onNailed, onNeedsWork, onSkip, highlight }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700">
      {/* Skip */}
      <button
        onClick={onSkip}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                   bg-slate-800 border border-slate-700 text-slate-400
                   hover:border-slate-500 hover:text-slate-200 transition-colors text-sm"
      >
        <SkipForward size={15} />
        Skip
      </button>

      {/* Needs work */}
      <button
        onClick={onNeedsWork}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                   bg-amber-900/40 border border-amber-700/60 text-amber-300
                   hover:bg-amber-800/50 hover:border-amber-600 transition-colors text-sm font-medium"
      >
        <Wrench size={15} />
        Needs work
      </button>

      {/* Nailed it */}
      <button
        onClick={onNailed}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl
                    bg-emerald-700/40 border border-emerald-600/60 text-emerald-300
                    hover:bg-emerald-600/50 hover:border-emerald-500 transition-colors text-sm font-medium
                    ${highlight ? 'ring-2 ring-emerald-500/60 ring-offset-1 ring-offset-slate-900' : ''}`}
      >
        <ThumbsUp size={15} />
        Nailed it!
      </button>
    </div>
  )
}
