import { create } from 'zustand'
import { db, type Setlist } from '../db/db'
import { syncSetlistUp, deleteSetlistUp } from '../db/firestoreSync'
import { getCurrentUid } from './currentUser'
import { scheduleGitHubSync } from '../utils/githubSync'
import { v4 as uuidv4 } from 'uuid'

interface SetlistState {
  setlists: Setlist[]
  loading: boolean
  hydrate: () => Promise<void>
  setSetlists: (setlists: Setlist[]) => void
  addSetlist: (name: string) => Promise<Setlist>
  updateSetlist: (id: string, data: Partial<Omit<Setlist, 'id' | 'createdAt'>>) => Promise<void>
  deleteSetlist: (id: string) => Promise<void>
  duplicateSetlist: (id: string) => Promise<Setlist | undefined>
}

const uid = () => getCurrentUid()

export const useSetlistStore = create<SetlistState>((set, get) => ({
  setlists: [],
  loading: true,

  hydrate: async () => {
    const setlists = await db.setlists.orderBy('updatedAt').reverse().toArray()
    set({ setlists, loading: false })
  },

  setSetlists: (setlists) => {
    if (setlists.length === 0) {
      set({ loading: false })
      return
    }
    set({ setlists: [...setlists].sort((a, b) => b.updatedAt - a.updatedAt), loading: false })
    db.setlists.clear().then(() => db.setlists.bulkAdd(setlists))
  },

  addSetlist: async (name) => {
    const now = Date.now()
    const setlist: Setlist = { id: uuidv4(), name, songIds: [], createdAt: now, updatedAt: now }
    await db.setlists.add(setlist)
    set((s) => ({ setlists: [setlist, ...s.setlists] }))
    const u = uid()
    if (u) syncSetlistUp(u, setlist).catch(console.error)
    scheduleGitHubSync(true)
    return setlist
  },

  updateSetlist: async (id, data) => {
    const now = Date.now()
    const updates = { ...data, updatedAt: now }
    await db.setlists.update(id, updates)
    set((s) => ({
      setlists: s.setlists.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl)),
    }))
    const u = uid()
    if (u) {
      const sl = get().setlists.find((s) => s.id === id)
      if (sl) syncSetlistUp(u, { ...sl, ...updates }).catch(console.error)
    }
    scheduleGitHubSync(false)
  },

  deleteSetlist: async (id) => {
    await db.setlists.delete(id)
    set((s) => ({ setlists: s.setlists.filter((sl) => sl.id !== id) }))
    const u = uid()
    if (u) deleteSetlistUp(u, id).catch(console.error)
    scheduleGitHubSync(true)
  },

  duplicateSetlist: async (id) => {
    const original = get().setlists.find((sl) => sl.id === id)
    if (!original) return undefined
    const now = Date.now()
    const copy: Setlist = { ...original, id: uuidv4(), name: `${original.name} (copy)`, createdAt: now, updatedAt: now }
    await db.setlists.add(copy)
    set((s) => ({ setlists: [copy, ...s.setlists] }))
    const u = uid()
    if (u) syncSetlistUp(u, copy).catch(console.error)
    scheduleGitHubSync(true)
    return copy
  },
}))
