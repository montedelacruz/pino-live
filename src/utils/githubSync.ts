import { useSettingsStore } from '../store/settingsStore'
import { db } from '../db/db'

const OWNER = 'montedelacruz'
const REPO  = 'pino-live'
const PATH  = 'public/pino-import.json'

// Module-level debounce timer
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false

async function getFileSha(pat: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
    { headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.sha ?? null
}

async function pushToGitHub(pat: string): Promise<void> {
  if (syncing) return
  syncing = true
  try {
    // Build the export payload from current IndexedDB contents
    const songs = await db.songs.toArray()
    const setlists = await db.setlists.toArray()
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), songs, setlists }, null, 2)

    // GitHub API requires base64-encoded content (UTF-8 safe)
    const encoded = btoa(unescape(encodeURIComponent(payload)))
    const sha = await getFileSha(pat)

    const body: Record<string, unknown> = {
      message: 'chore: sync repertoire from app',
      content: encoded,
    }
    if (sha) body.sha = sha

    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('GitHub sync failed:', err.message ?? res.status)
    } else {
      console.info('✓ Repertoire synced to GitHub')
    }
  } catch (err) {
    console.warn('GitHub sync error:', err)
  } finally {
    syncing = false
  }
}

/**
 * Schedule a GitHub sync. Call this after any song/setlist write.
 * Debounced so rapid saves (auto-save while typing) collapse into one push.
 * @param immediate – skip the delay (use after explicit Save button presses)
 */
export function scheduleGitHubSync(immediate = false) {
  const { githubPat } = useSettingsStore.getState()
  if (!githubPat) return

  if (syncTimer) clearTimeout(syncTimer)
  const delay = immediate ? 0 : 30_000   // 0ms for explicit saves, 30s for auto-saves
  syncTimer = setTimeout(() => pushToGitHub(githubPat), delay)
}
