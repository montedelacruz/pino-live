import { useState } from 'react'
import { Activity } from 'lucide-react'
import { useMetronome } from '../hooks/useMetronome'

interface Props {
  /** BPM from song or store */
  initialBpm?: number
}

export function MetronomeControl({ initialBpm = 100 }: Props) {
  const [bpm,     setBpm]     = useState(initialBpm)
  const [enabled, setEnabled] = useState(false)

  const { beat } = useMetronome({ bpm, enabled })

  const adjust = (delta: number) => setBpm((b) => Math.max(40, Math.min(240, b + delta)))

  return (
    <div className="flex items-center gap-2">
      {/* Beat dots — 4 dots that light up */}
      <div className="flex gap-0.5 items-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-75
                        ${enabled && beat === i
                          ? (i === 0 ? 'bg-emerald-400' : 'bg-slate-300')
                          : 'bg-slate-600'}`}
          />
        ))}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setEnabled((e) => !e)}
        className={`p-1.5 rounded-lg transition-colors
                    ${enabled
                      ? 'bg-emerald-700/50 text-emerald-300 border border-emerald-600'
                      : 'text-slate-500 hover:text-slate-300 border border-slate-700'}`}
        title={enabled ? 'Stop metronome' : 'Start metronome'}
      >
        <Activity size={16} />
      </button>

      {/* BPM adjust */}
      <button onClick={() => adjust(-5)} className="w-6 text-center text-slate-400 hover:text-slate-200 text-sm font-bold">−</button>
      <span className="text-xs tabular-nums text-slate-300 w-9 text-center">{bpm}</span>
      <button onClick={() => adjust(+5)} className="w-6 text-center text-slate-400 hover:text-slate-200 text-sm font-bold">+</button>
    </div>
  )
}
