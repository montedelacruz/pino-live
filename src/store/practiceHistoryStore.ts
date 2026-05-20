import { create } from 'zustand'
import { db, type PracticeEntry } from '../db/db'
import { v4 as uuidv4 } from 'uuid'

interface PracticeHistoryState {
  entries: PracticeEntry[]
  loading: boolean
  hydrate: () => Promise<void>
  addEntry: (e: Omit<PracticeEntry, 'id'>) => Promise<void>
  clearHistory: () => Promise<void>
  // Computed helpers
  getLastPracticedAt:  (songId: string) => number | null
  getTimespracticed:   (songId: string) => number
  getNeedsWorkIds:     ()               => string[]
  getStreakDays:       ()               => number
}

export const usePracticeHistoryStore = create<PracticeHistoryState>((set, get) => ({
  entries: [],
  loading: true,

  hydrate: async () => {
    // Load last 180 days — enough for streak + history view
    const since = Date.now() - 180 * 24 * 60 * 60 * 1000
    const entries = await db.practiceEntries
      .where('practicedAt').aboveOrEqual(since)
      .toArray()
    set({ entries, loading: false })
  },

  addEntry: async (data) => {
    const entry: PracticeEntry = { id: uuidv4(), ...data }
    await db.practiceEntries.add(entry)
    set((s) => ({ entries: [...s.entries, entry] }))
  },

  clearHistory: async () => {
    await db.practiceEntries.clear()
    set({ entries: [] })
  },

  getLastPracticedAt: (songId) => {
    const hits = get().entries
      .filter((e) => e.songId === songId)
      .map((e) => e.practicedAt)
    return hits.length ? Math.max(...hits) : null
  },

  getTimespracticed: (songId) =>
    get().entries.filter((e) => e.songId === songId && e.result !== 'skipped').length,

  getNeedsWorkIds: () => {
    const ids = new Set<string>()
    for (const e of get().entries) {
      if (e.result === 'needs_work') ids.add(e.songId)
    }
    return [...ids]
  },

  getStreakDays: () => {
    const entries = get().entries
    if (!entries.length) return 0

    // Collect unique practice days (YYYY-MM-DD in local time)
    const days = new Set(
      entries
        .filter((e) => e.result !== 'skipped')
        .map((e) => new Date(e.practicedAt).toLocaleDateString('en-CA')) // ISO local
    )

    // Walk backwards from today counting consecutive days
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const key = d.toLocaleDateString('en-CA')
      if (days.has(key)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else if (i === 0) {
        // today not practiced yet — start checking from yesterday
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  },
}))
