import type { Song, AutoFilters } from '../db/db'

/**
 * Given the full song library and a set of AutoFilters, return the ordered
 * list of song IDs that match every active filter.
 */
export function computeAutoSongIds(songs: Song[], filters: AutoFilters): string[] {
  const filtered = songs.filter((song) => {
    if (filters.genres?.length && !filters.genres.includes(song.genre))
      return false
    if (filters.languages?.length && !filters.languages.includes(song.language))
      return false
    if (filters.tags?.length && !filters.tags.some((t) => song.tags.includes(t)))
      return false
    if (filters.decades?.length) {
      if (song.year == null) return false
      const decade = Math.floor(song.year / 10) * 10
      if (!filters.decades.includes(decade)) return false
    }
    return true
  })

  switch (filters.sort) {
    case 'artist':
      filtered.sort(
        (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title)
      )
      break
    case 'yearAsc':
      filtered.sort(
        (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title)
      )
      break
    case 'yearDesc':
      filtered.sort(
        (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title)
      )
      break
    default: // titleAZ
      filtered.sort((a, b) => a.title.localeCompare(b.title))
  }

  return filtered.map((s) => s.id)
}

/** Decades present in the library (sorted ascending). */
export function availableDecades(songs: Song[]): number[] {
  const set = new Set<number>()
  for (const s of songs) {
    if (s.year != null) set.add(Math.floor(s.year / 10) * 10)
  }
  return [...set].sort((a, b) => a - b)
}

export function decadeLabel(d: number): string {
  return `${String(d).slice(2)}s`   // 1980 → "80s"
}
