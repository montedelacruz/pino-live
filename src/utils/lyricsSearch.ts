/** iTunes Search API result (no key required) */
export interface ItunesTrack {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100: string
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

/** Fetch lyrics from lyrics.ovh — free, no key */
export async function fetchLyricsOvh(artist: string, title: string): Promise<string> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('No lyrics found')
  const data: { lyrics?: string; error?: string } = await res.json()
  if (data.error || !data.lyrics) throw new Error('No lyrics found')
  return data.lyrics.trim()
}
