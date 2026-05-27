import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { WifiOff } from 'lucide-react'
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

// ── Clerk load timeout (ms) — if Clerk can't initialise in time, go offline ──
const CLERK_TIMEOUT_MS = 7000

const FULLSCREEN_ROUTES = ['/performance/', '/practice']

function Layout({
  children,
  offlineMode,
}: {
  children: React.ReactNode
  offlineMode: boolean
}) {
  const { pathname } = useLocation()
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r))
  return (
    <>
      {/* Offline banner — shown on every page except full-screen views */}
      {offlineMode && !isFullscreen && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2
                        py-1.5 bg-amber-600/90 backdrop-blur-sm text-white text-xs font-medium">
          <WifiOff size={13} />
          Offline — using local data. Sync will resume when connected.
        </div>
      )}
      {/* Push content down when banner is showing */}
      <div className={offlineMode && !isFullscreen ? 'pt-7' : ''}>
        {children}
      </div>
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
  const setSongs        = useSongStore((s) => s.setSongs)
  const setSetlists     = useSetlistStore((s) => s.setSetlists)

  // ── Offline / Clerk-timeout detection ──────────────────────────────────────
  const [isOffline,     setIsOffline]     = useState(!navigator.onLine)
  const [clerkTimedOut, setClerkTimedOut] = useState(false)

  // Track browser online/offline events
  useEffect(() => {
    const onOffline = () => setIsOffline(true)
    const onOnline  = () => { setIsOffline(false); setClerkTimedOut(false) }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [])

  // If Clerk hasn't finished loading after CLERK_TIMEOUT_MS, stop waiting
  useEffect(() => {
    if (isLoaded || clerkTimedOut) return
    const t = setTimeout(() => setClerkTimedOut(true), CLERK_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [isLoaded, clerkTimedOut])

  // Offline mode = browser says offline OR Clerk gave up loading
  const offlineMode = isOffline || clerkTimedOut

  // ── Keep module-level uid in sync with Clerk ───────────────────────────────
  useEffect(() => {
    setCurrentUid(user?.id ?? null)
  }, [user?.id])

  // ── Data loading — Firestore (online+signed in) or local Dexie ────────────
  useEffect(() => {
    // Wait until we know the auth state, OR we've given up waiting (offline)
    if (!isLoaded && !offlineMode) return

    if (!user || offlineMode) {
      // Signed out or offline → use local IndexedDB only
      hydrateSongs()
      hydrateSetlists()
      hydratePractice()
      return
    }

    // Signed in and online → live Firestore subscriptions
    const unsubSongs    = subscribeSongs(user.id, setSongs)
    const unsubSetlists = subscribeSetlists(user.id, setSetlists)
    hydratePractice()
    return () => { unsubSongs(); unsubSetlists() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoaded, offlineMode])

  // ── Spinner — only while Clerk is loading AND we're online ────────────────
  if (!isLoaded && !clerkLoaded && !offlineMode) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    )
  }

  // ── Sign-in wall — only when online, Clerk settled, and no session ─────────
  if (!user && !offlineMode) {
    return <SignInScreen />
  }

  // ── App ───────────────────────────────────────────────────────────────────
  return (
    <HashRouter>
      <Layout offlineMode={offlineMode}>
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
