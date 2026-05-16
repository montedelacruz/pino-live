import { create } from 'zustand'
import type { Song } from '../db/db'

interface RehearsalState {
  songIds: string[]       // current randomized order
  setSongs: (songs: Song[]) => void
  shuffle: (songs: Song[]) => void
}

function randomize(songs: Song[]): string[] {
  const ids = songs.map((s) => s.id)
  // Fisher-Yates shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

export const useRehearsalStore = create<RehearsalState>((set) => ({
  songIds: [],

  setSongs: (songs) => set({ songIds: randomize(songs) }),
  shuffle:  (songs) => set({ songIds: randomize(songs) }),
}))
