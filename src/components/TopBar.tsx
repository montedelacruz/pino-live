import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface TopBarProps {
  title: React.ReactNode
  showBack?: boolean
  right?: React.ReactNode
}

export function TopBar({ title, showBack, right }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-700 flex items-center px-4 h-14 gap-3">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-slate-100 truncate">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
