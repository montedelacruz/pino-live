import { useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { useSongStore } from './store/songStore'
import { useSetlistStore } from './store/setlistStore'
import { useAuthStore } from './store/authStore'
import { subscribeSongs, subscribeSetlists, syncSongUp, syncSetlistUp } from './db/firestoreSync'
import { importData } from './utils/exportImport'
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

/** Auto-import the bundled repertoire if Firestore is empty on first load,
 *  then push everything up to Firestore so other devices can see it. */
async function autoLoadRepertoire(
  uid: string,
  setSongs: ReturnType<typeof useSongStore.getState>['setSongs'],
  setSetlists: ReturnType<typeof useSetlistStore.getState>['setSetlists'],
) {
  try {
    const url = `${import.meta.env.BASE_URL}pino-import.json`
    const res = await fetch(url)
    if (!res.ok) return
    const blob = await res.blob()
    const file = new File([blob], 'pino-import.json', { type: 'application/json' })
    await importData(file)

    const { db } = await import('./db/db')
    const songs = await db.songs.toArray()
    const setlists = await db.setlists.toArray()

    // Update local UI immediately
    setSongs(songs)
    setSetlists(setlists)

    // Push every song and setlist up to Firestore so all devices sync
    for (const song of songs) syncSongUp(uid, song).catch(console.error)
    for (const sl of setlists) syncSetlistUp(uid, sl).catch(console.error)

    console.info(`Auto-loaded & synced: ${songs.length} songs, ${setlists.length} setlists`)
  } catch (err) {
    console.warn('Auto-load repertoire failed:', err)
  }
}

export default function App() {
  const { user, loading: authLoading, init } = useAuthStore()
  const hydrateSongs = useSongStore((s) => s.hydrate)
  const hydrateSetlists = useSetlistStore((s) => s.hydrate)
  const setSongs = useSongStore((s) => s.setSongs)
  const setSetlists = useSetlistStore((s) => s.setSetlists)
  const songs = useSongStore((s) => s.songs)
  const songsLoading = useSongStore((s) => s.loading)  // watch loading state
  const autoLoadDone = useRef(false)

  // Boot Firebase auth listener once
  useEffect(() => {
    const unsub = init()
    return unsub
  }, [init])

  // When signed in → subscribe to Firestore live updates
  // When signed out → fall back to local IndexedDB
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      hydrateSongs()
      hydrateSetlists()
      return
    }
    const unsubSongs = subscribeSongs(user.uid, setSongs)
    const unsubSetlists = subscribeSetlists(user.uid, setSetlists)
    return () => { unsubSongs(); unsubSetlists() }
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load repertoire when Firestore is confirmed empty (after first snapshot)
  useEffect(() => {
    if (!user || authLoading) return
    if (autoLoadDone.current) return
    // Wait until Firestore has fired its first snapshot (loading becomes false)
    if (songsLoading) return
    if (songs.length > 0) { autoLoadDone.current = true; return }

    // Confirmed empty — auto-load bundled repertoire and push to Firestore
    autoLoadDone.current = true
    autoLoadRepertoire(user.uid, setSongs, setSetlists)
  }, [songs, songsLoading, user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Spinner while Firebase checks auth state
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    )
  }

  // Sign-in wall
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
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
