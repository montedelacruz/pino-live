import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
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
  const hydrateSongs = useSongStore((s) => s.hydrate)
  const hydrateSetlists = useSetlistStore((s) => s.hydrate)

  useEffect(() => {
    hydrateSongs()
    hydrateSetlists()
  }, [hydrateSongs, hydrateSetlists])

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
