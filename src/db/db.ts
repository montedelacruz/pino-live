import Dexie, { type EntityTable } from 'dexie'

export interface Song {
  id: string
  title: string
  artist: string
  language: string
  key: string
  genre: string
  tags: string[]
  lyrics: string
  notes: string
  durationSeconds: number | null
  year?: number          // release / composition year
  needsWork?: boolean    // flagged during practice
  createdAt: number
  updatedAt: number
}

export interface PracticeEntry {
  id: string
  songId: string
  sessionId: string
  result: 'nailed' | 'needs_work' | 'skipped'
  practicedAt: number    // Date.now()
}

export interface AutoFilters {
  genres?: string[]      // empty = any genre
  languages?: string[]   // empty = any language
  tags?: string[]        // empty = any tags  (song must match at least one)
  decades?: number[]     // decade start years: 1960, 1970 … empty = any
  sort?: 'titleAZ' | 'artist' | 'yearAsc' | 'yearDesc'
}

export interface Setlist {
  id: string
  name: string
  songIds: string[]
  type?: 'manual' | 'auto'   // default 'manual'
  autoFilters?: AutoFilters   // only used when type === 'auto'
  // Event details (all optional)
  venue?: string
  date?: string          // ISO date string "YYYY-MM-DD"
  contactPerson?: string
  contactPhone?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

class SetlistDB extends Dexie {
  songs!: EntityTable<Song, 'id'>
  setlists!: EntityTable<Setlist, 'id'>
  practiceEntries!: EntityTable<PracticeEntry, 'id'>

  constructor() {
    super('setlist-app-db')
    this.version(1).stores({
      songs: 'id, title, artist, language, genre, key, updatedAt',
      setlists: 'id, name, updatedAt',
    })
    this.version(2).stores({
      songs: 'id, title, artist, language, genre, key, updatedAt',
      setlists: 'id, name, updatedAt',
      practiceEntries: 'id, songId, sessionId, practicedAt, result',
    })
  }
}

export const db = new SetlistDB()
