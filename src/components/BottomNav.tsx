import { NavLink } from 'react-router-dom'
import { Home, Music2, ListMusic, Shuffle, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function BottomNav() {
  const { user, signOut } = useAuthStore()
  const base = 'flex flex-col items-center gap-1 flex-1 py-3 text-xs font-medium transition-colors'
  const active = 'text-violet-400'
  const inactive = 'text-slate-400 hover:text-slate-200'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex z-40">
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <Home size={22} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/library" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <Music2 size={22} />
        <span>Library</span>
      </NavLink>
      <NavLink to="/setlists" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <ListMusic size={22} />
        <span>Setlists</span>
      </NavLink>
      <NavLink to="/rehearsal" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <Shuffle size={22} />
        <span>Rehearsal</span>
      </NavLink>
      {user && (
        <button
          onClick={() => signOut()}
          title={`Signed in as ${user.email}`}
          className={`${base} text-slate-500 hover:text-red-400`}
        >
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
            : <LogOut size={22} />}
          <span>Sign out</span>
        </button>
      )}
    </nav>
  )
}
