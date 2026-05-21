import { create } from 'zustand'
import { db, type Song } from '../db/db'
import { syncSongUp, deleteSongUp } from '../db/firestoreSync'
import { getCurrentUid } from './currentUser'
import { useSyncErrorStore } from './syncErrorStore'
import { scheduleGitHubSync } from '../utils/githubSync'
import { v4 as uuidv4 } from 'uuid'

const onSyncFail = (err: unknown) => {
  console.error('[cloud sync]', err)
  useSyncErrorStore.getState().inc()
}

interface SongState {
  songs: Song[]
  loading: boolean
  hydrate: () => Promise<void>
  setSongs: (songs: Song[]) => void
  addSong: (data: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Song>
  updateSong: (id: string, data: Partial<Omit<Song, 'id' | 'createdAt'>>) => Promise<void>
  deleteSong: (id: string) => Promise<void>
  duplicateSong: (id: string) => Promise<Song | undefined>
}

const uid = () => getCurrentUid()

export const useSongStore = create<SongState>((set, get) => ({
  songs: [],
  loading: true,

  hydrate: async () => {
    const songs = await db.songs.orderBy('updatedAt').reverse().toArray()
    set({ songs, loading: false })
  },

  // Called by Firestore listener to push cloud data into local state + IndexedDB
  setSongs: (songs) => {
    // If Firestore is empty, don't wipe local data — let auto-load handle seeding
    if (songs.length === 0) {
      set({ loading: false })
      return
    }
    set({ songs: [...songs].sort((a, b) => b.updatedAt - a.updatedAt), loading: false })
    db.songs.clear().then(() => db.songs.bulkAdd(songs))
  },

  addSong: async (data) => {
    const now = Date.now()
    const song: Song = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
    await db.songs.add(song)
    set((s) => ({ songs: [song, ...s.songs] }))
    const u = uid()
    if (u) syncSongUp(u, song).catch(onSyncFail)
    scheduleGitHubSync(true)   // immediate — triggered by explicit Save button
    return song
  },

  updateSong: async (id, data) => {
    const now = Date.now()
    const updates = { ...data, updatedAt: now }
    await db.songs.update(id, updates)
    set((s) => ({
      songs: s.songs.map((song) => (song.id === id ? { ...song, ...updates } : song)),
    }))
    const u = uid()
    if (u) {
      const song = get().songs.find((s) => s.id === id)
      if (song) syncSongUp(u, { ...song, ...updates }).catch(onSyncFail)
    }
    scheduleGitHubSync(false)  // debounced 30s — collapses rapid auto-saves
  },

  deleteSong: async (id) => {
    await db.songs.delete(id)
    set((s) => ({ songs: s.songs.filter((song) => song.id !== id) }))
    const u = uid()
    if (u) deleteSongUp(u, id).catch(onSyncFail)
    scheduleGitHubSync(true)   // immediate — song removed
  },

  duplicateSong: async (id) => {
    const original = get().songs.find((s) => s.id === id)
    if (!original) return undefined
    const now = Date.now()
    const copy: Song = { ...original, id: uuidv4(), title: `${original.title} (copy)`, createdAt: now, updatedAt: now }
    await db.songs.add(copy)
    set((s) => ({ songs: [copy, ...s.songs] }))
    const u = uid()
    if (u) syncSongUp(u, copy).catch(onSyncFail)
    scheduleGitHubSync(true)
    return copy
  },
}))
