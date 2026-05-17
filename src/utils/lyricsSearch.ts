export interface HappiTrack {
  id_track: number
  track: string
  artist: string
  id_artist: number
  album: string
  id_album: number
  haslyrics: boolean
  api_lyrics: string
  bpm: number
  lang: string
  cover: string
}

export interface HappiSearchResult {
  success: boolean
  length: number
  result: HappiTrack[]
}

export interface HappiLyricsResult {
  success: boolean
  result: {
    id_track: number
    track: string
    artist: string
    album: string
    lyrics: string
    lang: string
    api_lyrics: string
    id_artist: number
    id_album: number
    cover: string
    bpm: number
  }
}

export async function searchTracks(
  query: string,
  apiKey: string,
  limit = 10
): Promise<HappiTrack[]> {
  const url = `https://api.happi.dev/v1/music?q=${encodeURIComponent(query)}&limit=${limit}&type=track&apikey=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Happi API error: ${res.status}`)
  const data: HappiSearchResult = await res.json()
  if (!data.success) throw new Error('Happi API returned success=false')
  return data.result ?? []
}

export async function fetchLyrics(
  apiLyricsUrl: string,
  apiKey: string
): Promise<string> {
  const sep = apiLyricsUrl.includes('?') ? '&' : '?'
  const url = `${apiLyricsUrl}${sep}apikey=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Happi lyrics error: ${res.status}`)
  const data: HappiLyricsResult = await res.json()
  if (!data.success) throw new Error('Could not fetch lyrics')
  return data.result.lyrics ?? ''
}

/** Fallback: fetch lyrics from lyrics.ovh (no key required) */
export async function fetchLyricsOvh(artist: string, title: string): Promise<string> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`lyrics.ovh: no lyrics found`)
  const data: { lyrics?: string; error?: string } = await res.json()
  if (data.error || !data.lyrics) throw new Error('No lyrics found on lyrics.ovh')
  return data.lyrics.trim()
}
