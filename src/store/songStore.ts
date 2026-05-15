import { create } from 'zustand'
import { db, type Song } from '../db/db'
import { v4 as uuidv4 } from 'uuid'

interface SongState {
  songs: Song[]
  loading: boolean
  hydrate: () => Promise<void>
  addSong: (data: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Song>
  updateSong: (id: string, data: Partial<Omit<Song, 'id' | 'createdAt'>>) => Promise<void>
  deleteSong: (id: string) => Promise<void>
  duplicateSong: (id: string) => Promise<Song | undefined>
}

export const useSongStore = create<SongState>((set, get) => ({
  songs: [],
  loading: true,

  hydrate: async () => {
    const songs = await db.songs.orderBy('updatedAt').reverse().toArray()
    set({ songs, loading: false })
  },

  addSong: async (data) => {
    const now = Date.now()
    const song: Song = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }
    await db.songs.add(song)
    set((s) => ({ songs: [song, ...s.songs] }))
    return song
  },

  updateSong: async (id, data) => {
    const now = Date.now()
    const updates = { ...data, updatedAt: now }
    await db.songs.update(id, updates)
    set((s) => ({
      songs: s.songs.map((song) =>
        song.id === id ? { ...song, ...updates } : song
      ),
    }))
  },

  deleteSong: async (id) => {
    await db.songs.delete(id)
    set((s) => ({ songs: s.songs.filter((song) => song.id !== id) }))
  },

  duplicateSong: async (id) => {
    const original = get().songs.find((s) => s.id === id)
    if (!original) return undefined
    const now = Date.now()
    const copy: Song = {
      ...original,
      id: uuidv4(),
      title: `${original.title} (copy)`,
      createdAt: now,
      updatedAt: now,
    }
    await db.songs.add(copy)
    set((s) => ({ songs: [copy, ...s.songs] }))
    return copy
  },
}))
