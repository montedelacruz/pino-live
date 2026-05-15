import { db, type Song, type Setlist } from '../db/db'

export interface BackupFile {
  version: number
  exportedAt: string
  songs: Song[]
  setlists: Setlist[]
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportData(): Promise<void> {
  const songs = await db.songs.toArray()
  const setlists = await db.setlists.toArray()

  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    setlists,
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `setlist-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  songsAdded: number
  songsUpdated: number
  setlistsAdded: number
  setlistsUpdated: number
  errors: string[]
}

export async function importData(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    songsAdded: 0,
    songsUpdated: 0,
    setlistsAdded: 0,
    setlistsUpdated: 0,
    errors: [],
  }

  let backup: BackupFile
  try {
    const text = await file.text()
    backup = JSON.parse(text)
  } catch {
    throw new Error('Invalid file — could not parse JSON.')
  }

  if (!Array.isArray(backup.songs)) {
    throw new Error('Invalid backup file — missing songs array.')
  }

  // ── Songs ────────────────────────────────────────────────────────────────
  for (const song of backup.songs) {
    if (!song.id || !song.title) {
      result.errors.push(`Skipped song with missing id or title.`)
      continue
    }
    try {
      const existing = await db.songs.get(song.id)
      if (existing) {
        await db.songs.put(song)
        result.songsUpdated++
      } else {
        await db.songs.add(song)
        result.songsAdded++
      }
    } catch (e) {
      result.errors.push(`Song "${song.title}": ${String(e)}`)
    }
  }

  // ── Setlists ─────────────────────────────────────────────────────────────
  for (const setlist of (backup.setlists ?? [])) {
    if (!setlist.id || !setlist.name) continue
    try {
      const existing = await db.setlists.get(setlist.id)
      if (existing) {
        await db.setlists.put(setlist)
        result.setlistsUpdated++
      } else {
        await db.setlists.add(setlist)
        result.setlistsAdded++
      }
    } catch (e) {
      result.errors.push(`Setlist "${setlist.name}": ${String(e)}`)
    }
  }

  return result
}
