import { NavLink } from 'react-router-dom'
import { Music2, ListMusic } from 'lucide-react'

export function BottomNav() {
  const base =
    'flex flex-col items-center gap-1 px-8 py-3 text-xs font-medium transition-colors'
  const active = 'text-violet-400'
  const inactive = 'text-slate-400 hover:text-slate-200'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex justify-around z-40">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
      >
        <Music2 size={22} />
        <span>Library</span>
      </NavLink>
      <NavLink
        to="/setlists"
        className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
      >
        <ListMusic size={22} />
        <span>Setlists</span>
      </NavLink>
    </nav>
  )
}
