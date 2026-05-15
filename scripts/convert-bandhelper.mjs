/**
 * Converts a BandHelper JSON export to the Setlist App import format.
 *
 * Usage:
 *   node scripts/convert-bandhelper.mjs <input.json> <output.json>
 *
 * Example:
 *   node scripts/convert-bandhelper.mjs "C:/Users/OscarGomez/Downloads/Pino (1).json" public/pino-import.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

const [,, inputPath, outputPath = 'pino-import.json'] = process.argv
if (!inputPath) {
  console.error('Usage: node convert-bandhelper.mjs <input.json> [output.json]')
  process.exit(1)
}

// ── HTML → plain text ────────────────────────────────────────────────────────

function htmlToPlain(html) {
  if (!html) return ''
  return html
    // Block-level tags → newline
    .replace(/<\/p>\s*/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Collapse 3+ consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── Load source ──────────────────────────────────────────────────────────────

console.log(`Reading: ${inputPath}`)
const raw = readFileSync(inputPath, 'utf-8')
const data = JSON.parse(raw)

const sourceSongs  = data.song      ?? {}
const sourceSetlists = data.set_list ?? {}

// ── Convert songs ────────────────────────────────────────────────────────────

// BandHelper ID → new UUID map (so setlists can reference the same IDs)
const idMap = {}

const songs = Object.entries(sourceSongs)
  .filter(([, s]) => s.active === '1')
  .map(([bhId, s]) => {
    const uuid = randomUUID()
    idMap[bhId] = uuid

    const rawTags = (s.tags ?? '').split(',').map(t => t.trim()).filter(Boolean)
    const duration = parseInt(s.duration) || null

    return {
      id: uuid,
      title: (s.name ?? '').trim(),
      artist: (s.artist ?? '').trim(),
      language: '',          // BandHelper has no language field
      key: (s.key ?? '').trim(),
      genre: '',             // BandHelper has no genre field
      tags: rawTags,
      lyrics: htmlToPlain(s.lyrics ?? ''),
      notes: htmlToPlain(s.notes ?? ''),
      durationSeconds: duration === 0 ? null : duration,
      createdAt: new Date(s.added ?? Date.now()).getTime(),
      updatedAt: new Date(s.date_updated ?? s.added ?? Date.now()).getTime(),
    }
  })

console.log(`Converted ${songs.length} songs`)

// ── Convert setlists ─────────────────────────────────────────────────────────

const setlists = Object.entries(sourceSetlists)
  .map(([, sl]) => {
    // songs field: "-,GrRyy2,2ZTzhD,..." — leading "-" is a separator marker
    const bhSongIds = (sl.songs ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(id => id && id !== '-')

    const mappedIds = bhSongIds
      .map(bhId => idMap[bhId])
      .filter(Boolean) // drop any IDs that didn't map (inactive songs, etc.)

    return {
      id: randomUUID(),
      name: (sl.name ?? 'Untitled').trim(),
      songIds: mappedIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  })
  .filter(sl => sl.name)           // drop nameless setlists
  .filter(sl => sl.songIds.length > 0) // drop empty setlists

console.log(`Converted ${setlists.length} setlists`)

// ── Write output ─────────────────────────────────────────────────────────────

const output = {
  version: 1,
  exportedAt: new Date().toISOString(),
  songs,
  setlists,
}

writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
console.log(`\nWrote: ${outputPath}`)
console.log(`  ${songs.length} songs`)
console.log(`  ${setlists.length} setlists`)
