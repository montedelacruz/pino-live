/** iTunes Search API result (no key required) */
export interface ItunesTrack {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100: string
  trackTimeMillis?: number
}

interface ItunesSearchResult {
  resultCount: number
  results: Array<{ wrapperType: string; kind: string } & ItunesTrack>
}

/** Search tracks via iTunes Search API — free, no key */
export async function searchTracks(query: string, limit = 10): Promise<ItunesTrack[]> {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}` +
    `&media=music&entity=song&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`iTunes search error: ${res.status}`)
  const data: ItunesSearchResult = await res.json()
  return data.results.filter((r) => r.wrapperType === 'track') as ItunesTrack[]
}

interface LrclibResult {
  plainLyrics?: string
  syncedLyrics?: string
  trackName?: string
  artistName?: string
}

/**
 * Fetch lyrics from LRCLIB — free, no key, excellent coverage.
 * Tries exact match first (artist + title + duration), then falls back
 * to a broader search so less-known tracks still have a chance.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
  durationMs?: number,
): Promise<string> {
  // 1️⃣ Try exact get (best match, uses duration hint when available)
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
    ...(durationMs ? { duration: String(Math.round(durationMs / 1000)) } : {}),
  })
  const exactRes = await fetch(`https://lrclib.net/api/get?${params}`)
  if (exactRes.ok) {
    const data: LrclibResult = await exactRes.json()
    const lyrics = data.plainLyrics || stripTimestamps(data.syncedLyrics)
    if (lyrics) return lyrics.trim()
  }

  // 2️⃣ Fall back to search — picks the first result with lyrics
  const searchRes = await fetch(
    `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
  )
  if (searchRes.ok) {
    const results: LrclibResult[] = await searchRes.json()
    for (const r of results) {
      const lyrics = r.plainLyrics || stripTimestamps(r.syncedLyrics)
      if (lyrics) return lyrics.trim()
    }
  }

  throw new Error('No lyrics found')
}

/** Strip LRC timestamps like [00:12.34] from synced lyrics */
function stripTimestamps(synced?: string): string {
  if (!synced) return ''
  return synced
    .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}
