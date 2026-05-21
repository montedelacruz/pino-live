import { create } from 'zustand'

/**
 * Tracks cloud sync failures so the UI can surface them.
 * Incremented whenever a syncSongUp / syncSetlistUp call rejects.
 * Reset to 0 after a successful Force Sync.
 */
interface SyncErrorState {
  pendingCount: number
  inc:   () => void
  reset: () => void
}

export const useSyncErrorStore = create<SyncErrorState>((set) => ({
  pendingCount: 0,
  inc:   () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  reset: () => set({ pendingCount: 0 }),
}))
