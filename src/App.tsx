import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { LibraryPage } from './pages/LibraryPage'
import { SongEditorPage } from './pages/SongEditorPage'
import { SongViewPage } from './pages/SongViewPage'
import { SetlistsPage } from './pages/SetlistsPage'
import { SetlistEditorPage } from './pages/SetlistEditorPage'
import { PerformancePage } from './pages/PerformancePage'
import { useSongStore } from './store/songStore'
import { useSetlistStore } from './store/setlistStore'

/** Hide the bottom nav in performance mode */
function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isPerformance = pathname.startsWith('/performance/')
  return (
    <>
      {children}
      {!isPerformance && <BottomNav />}
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
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/songs/new" element={<SongEditorPage />} />
          <Route path="/songs/:id" element={<SongViewPage />} />
          <Route path="/songs/:id/edit" element={<SongEditorPage />} />
          <Route path="/setlists" element={<SetlistsPage />} />
          <Route path="/setlists/:id/edit" element={<SetlistEditorPage />} />
          <Route path="/performance/:id" element={<PerformancePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
