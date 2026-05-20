import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Song, Setlist, PracticeEntry } from '../db/db'
import { computeAutoSongIds } from '../utils/autoSetlist'

// ─── Config shape (persisted) ──────────────────────────────────────────────

export interface PracticeConfig {
  sourceType: 'all' | 'setlist' | 'filter'
  setlistId:        string
  filterGenres:     string[]
  filterLanguages:  string[]
  filterDecades:    number[]
  onlyNeedsWork:    boolean

  orderMode: 'shuffle' | 'smart' | 'warmup' | 'in_order' | 'alternate'

  limitType:        'all' | 'count' | 'time'
  songCount:        number   // used when limitType === 'count'
  timeLimitMinutes: number   // used when limitType === 'time'

  repeatCount:      number   // 1 = no repeat, 2+ = repeat each song N times
  countdownSeconds: number   // 0 = no countdown
}

export const DEFAULT_CONFIG: PracticeConfig = {
  sourceType:       'all',
  setlistId:        '',
  filterGenres:     [],
  filterLanguages:  [],
  filterDecades:    [],
  onlyNeedsWork:    false,
  orderMode:        'shuffle',
  limitType:        'all',
  songCount:        20,
  timeLimitMinutes: 30,
  repeatCount:      1,
  countdownSeconds: 0,
}

// ─── Store ────────────────────────────────────────────────────────────────

interface RehearsalState {
  config:    PracticeConfig
  songIds:   string[]
  sessionId: string

  setConfig:    (partial: Partial<PracticeConfig>) => void
  resetConfig:  () => void
  buildSession: (allSongs: Song[], allSetlists: Setlist[], entries: PracticeEntry[]) => void
  // Backward-compat helpers used by existing RehearsalPage / PracticePage
  shuffle:  (songs: Song[]) => void
  setSongs: (songs: Song[]) => void
}

// ─── Fisher-Yates in-place ────────────────────────────────────────────────

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Interleave round-robin by a string key ───────────────────────────────

function interleaveBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const k = keyFn(item) || '__none'
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(item)
  }
  const groups = [...buckets.values()]
  const result: T[] = []
  let maxLen = Math.max(...groups.map((g) => g.length))
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (i < group.length) result.push(group[i])
    }
  }
  return result
}

// ─── Main session builder ──────────────────────────────────────────────────

export function buildPracticeSession(
  config:      PracticeConfig,
  allSongs:    Song[],
  allSetlists: Setlist[],
  entries:     PracticeEntry[],
): string[] {
  // 1. Source pool
  let pool: Song[]
  if (config.sourceType === 'setlist') {
    const sl = allSetlists.find((s) => s.id === config.setlistId)
    const ids = new Set(sl?.songIds ?? [])
    pool = allSongs.filter((s) => ids.has(s.id))
  } else if (config.sourceType === 'filter') {
    const ids = computeAutoSongIds(allSongs, {
      genres:    config.filterGenres.length    ? config.filterGenres    : undefined,
      languages: config.filterLanguages.length ? config.filterLanguages : undefined,
      decades:   config.filterDecades.length   ? config.filterDecades   : undefined,
    })
    const idSet = new Set(ids)
    pool = allSongs.filter((s) => idSet.has(s.id))
  } else {
    pool = [...allSongs]
  }

  // 2. Build history maps first (used for filter AND ordering)
  const lastPracticedMap = new Map<string, number>()
  for (const e of entries) {
    const prev = lastPracticedMap.get(e.songId)
    if (!prev || e.practicedAt > prev) lastPracticedMap.set(e.songId, e.practicedAt)
  }
  const needsWorkSet = new Set(entries.filter((e) => e.result === 'needs_work').map((e) => e.songId))

  // Needs-work filter: check song flag OR practice-history "needs_work" result
  if (config.onlyNeedsWork) {
    pool = pool.filter((s) => s.needsWork === true || needsWorkSet.has(s.id))
  }

  if (!pool.length) return []

  let ordered: Song[]
  switch (config.orderMode) {
    case 'shuffle':
      ordered = fisherYates(pool)
      break

    case 'smart':
      ordered = [...pool].sort((a, b) => {
        const aNW = a.needsWork || needsWorkSet.has(a.id) ? 0 : 1
        const bNW = b.needsWork || needsWorkSet.has(b.id) ? 0 : 1
        if (aNW !== bNW) return aNW - bNW
        const aT = lastPracticedMap.get(a.id) ?? 0
        const bT = lastPracticedMap.get(b.id) ?? 0
        return aT - bT // oldest practiced first
      })
      break

    case 'warmup':
      ordered = [...pool].sort((a, b) => {
        const ad = a.durationSeconds ?? 999999
        const bd = b.durationSeconds ?? 999999
        return ad - bd
      })
      break

    case 'alternate':
      ordered = interleaveBy(fisherYates(pool), (s) => s.language)
      break

    case 'in_order':
    default:
      ordered = [...pool]
      break
  }

  // 4. Size constraints
  if (config.limitType === 'count') {
    ordered = ordered.slice(0, config.songCount)
  } else if (config.limitType === 'time') {
    const limitSec = config.timeLimitMinutes * 60
    let acc = 0
    const capped: Song[] = []
    for (const s of ordered) {
      const dur = s.durationSeconds ?? 180 // assume 3 min if unknown
      if (acc + dur > limitSec && capped.length > 0) break
      capped.push(s)
      acc += dur
    }
    ordered = capped
  }

  // 5. Expand for repeat (focus) mode
  if (config.repeatCount > 1) {
    const expanded: Song[] = []
    for (const s of ordered) {
      for (let r = 0; r < config.repeatCount; r++) expanded.push(s)
    }
    ordered = expanded
  }

  return ordered.map((s) => s.id)
}

// ─── Zustand store ────────────────────────────────────────────────────────

export const useRehearsalStore = create<RehearsalState>()(
  persist(
    (set, get) => ({
      config:    DEFAULT_CONFIG,
      songIds:   [],
      sessionId: uuidv4(),

      setConfig:   (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
      resetConfig: ()        => set({ config: { ...DEFAULT_CONFIG } }),

      buildSession: (allSongs, allSetlists, entries) => {
        const ids = buildPracticeSession(get().config, allSongs, allSetlists, entries)
        set({ songIds: ids, sessionId: uuidv4() })
      },

      // Backward-compat
      shuffle:  (songs) => set({ songIds: fisherYates(songs.map((s) => s.id)), sessionId: uuidv4() }),
      setSongs: (songs) => set({ songIds: fisherYates(songs.map((s) => s.id)) }),
    }),
    { name: 'practice-config', partialize: (s) => ({ config: s.config }) }
  )
)
