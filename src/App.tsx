import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { BottomNav } from './components/BottomNav'
import { SignInScreen } from './components/SignInScreen'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { SongEditorPage } from './pages/SongEditorPage'
import { SongViewPage } from './pages/SongViewPage'
import { SetlistsPage } from './pages/SetlistsPage'
import { SetlistEditorPage } from './pages/SetlistEditorPage'
import { PerformancePage } from './pages/PerformancePage'
import { RehearsalPage } from './pages/RehearsalPage'
import { PracticePage } from './pages/PracticePage'
import { PracticeHistoryPage } from './pages/PracticeHistoryPage'
import { useSongStore } from './store/songStore'
import { useSetlistStore } from './store/setlistStore'
import { usePracticeHistoryStore } from './store/practiceHistoryStore'
import { setCurrentUid } from './store/currentUser'
import { subscribeSongs, subscribeSetlists } from './db/firestoreSync'
import { Loader2 } from 'lucide-react'

const FULLSCREEN_ROUTES = ['/performance/', '/practice']

function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r))
  return (
    <>
      {children}
      {!isFullscreen && <BottomNav />}
    </>
  )
}

export default function App() {
  const { user, isLoaded } = useUser()
  const { loaded: clerkLoaded } = useClerk()
  const hydrateSongs    = useSongStore((s) => s.hydrate)
  const hydrateSetlists = useSetlistStore((s) => s.hydrate)
  const hydratePractice = usePracticeHistoryStore((s) => s.hydrate)
  const setSongs     = useSongStore((s) => s.setSongs)
  const setSetlists  = useSetlistStore((s) => s.setSetlists)

  // Keep the module-level uid in sync with Clerk so stores can access it
  useEffect(() => {
    setCurrentUid(user?.id ?? null)
  }, [user?.id])

  // When signed in → subscribe to Firestore live updates
  // When signed out → fall back to local IndexedDB
  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      hydrateSongs()
      hydrateSetlists()
      hydratePractice()
      return
    }
    const unsubSongs = subscribeSongs(user.id, setSongs)
    const unsubSetlists = subscribeSetlists(user.id, setSetlists)
    hydratePractice()
    return () => { unsubSongs(); unsubSetlists() }
  }, [user?.id, isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Spinner while Clerk checks auth state or processes an OAuth callback
  if (!isLoaded || !clerkLoaded) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    )
  }

  // Sign-in wall — only shown once Clerk is fully settled
  if (!user) {
    return <SignInScreen />
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/"                    element={<HomePage />} />
          <Route path="/library"             element={<LibraryPage />} />
          <Route path="/songs/new"           element={<SongEditorPage />} />
          <Route path="/songs/:id"           element={<SongViewPage />} />
          <Route path="/songs/:id/edit"      element={<SongEditorPage />} />
          <Route path="/setlists"            element={<SetlistsPage />} />
          <Route path="/setlists/:id/edit"   element={<SetlistEditorPage />} />
          <Route path="/performance/:id"     element={<PerformancePage />} />
          <Route path="/rehearsal"           element={<RehearsalPage />} />
          <Route path="/practice"            element={<PracticePage />} />
          <Route path="/practice/history"    element={<PracticeHistoryPage />} />
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
