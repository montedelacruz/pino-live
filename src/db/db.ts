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
  createdAt: number
  updatedAt: number
}

export interface Setlist {
  id: string
  name: string
  songIds: string[]
  createdAt: number
  updatedAt: number
}

class SetlistDB extends Dexie {
  songs!: EntityTable<Song, 'id'>
  setlists!: EntityTable<Setlist, 'id'>

  constructor() {
    super('setlist-app-db')
    this.version(1).stores({
      songs: 'id, title, artist, language, genre, key, updatedAt',
      setlists: 'id, name, updatedAt',
    })
  }
}

export const db = new SetlistDB()
