import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, Copy, Search, Save, Loader2, Music2 } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { LyricsSearchModal, type LyricsSearchResult } from '../components/LyricsSearchModal'
import { useSongStore } from '../store/songStore'
import type { Song } from '../db/db'

type DraftSong = Omit<Song, 'id' | 'createdAt' | 'updatedAt'>

const EMPTY_DRAFT: DraftSong = {
  title: '',
  artist: '',
  language: '',
  key: '',
  genre: '',
  tags: [],
  lyrics: '',
  notes: '',
  durationSeconds: null,
}

const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb',
  'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m',
  'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
]

export function SongEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === undefined || id === 'new'

  const { songs, addSong, updateSong, deleteSong, duplicateSong } = useSongStore()
  const existingSong = songs.find((s) => s.id === id)

  const [draft, setDraft] = useState<DraftSong>(EMPTY_DRAFT)
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showLyricsSearch, setShowLyricsSearch] = useState(false)
  const createdIdRef = useRef<string | null>(null)

  // Populate form when editing an existing song
  useEffect(() => {
    if (!isNew && existingSong) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existingSong
      setDraft(rest)
      setTagsInput(existingSong.tags.join(', '))
      setIsDirty(false)
    }
  }, [isNew, existingSong?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const parseTags = (raw: string) =>
    raw.split(',').map((t) => t.trim()).filter(Boolean)

  const setField = <K extends keyof DraftSong>(key: K, value: DraftSong[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleTagsChange = (raw: string) => {
    setTagsInput(raw)
    setDraft((prev) => ({ ...prev, tags: parseTags(raw) }))
    setIsDirty(true)
  }

  // Single save handler for both new and existing songs
  const handleSave = useCallback(async () => {
    if (!draft.title.trim() || saving) return
    setSaving(true)
    try {
      if (isNew && !createdIdRef.current) {
        // Create new song
        const created = await addSong(draft)
        createdIdRef.current = created.id
        setIsDirty(false)
        navigate(`/songs/${created.id}/edit`, { replace: true })
      } else {
        // Update existing song
        const editId = createdIdRef.current ?? id!
        await updateSong(editId, draft)
        setIsDirty(false)
      }
    } finally {
      setSaving(false)
    }
  }, [draft, isNew, id, addSong, updateSong, navigate, saving])

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${draft.title || 'this song'}"? This cannot be undone.`)) return
    const deleteId = createdIdRef.current ?? id
    if (deleteId) await deleteSong(deleteId)
    navigate('/', { replace: true })
  }

  const handleDuplicate = async () => {
    const dupeId = createdIdRef.current ?? id
    if (!dupeId) return
    const copy = await duplicateSong(dupeId)
    if (copy) navigate(`/songs/${copy.id}/edit`)
  }

  const durationMinutes = draft.durationSeconds != null
    ? Math.floor(draft.durationSeconds / 60)
    : ''
  const durationSecs = draft.durationSeconds != null
    ? draft.durationSeconds % 60
    : ''

  const handleDurationChange = (mins: string, secs: string) => {
    const m = parseInt(mins) || 0
    const s = parseInt(secs) || 0
    const total = mins === '' && secs === '' ? null : m * 60 + s
    setField('durationSeconds', total)
  }

  const existingId = createdIdRef.current ?? (isNew ? null : id)
  const canSave = draft.title.trim().length > 0 && !saving && (isNew || isDirty)

  return (
    <div className="flex flex-col flex-1 pb-8">
      <TopBar
        title={isNew ? 'New Song' : 'Edit Song'}
        showBack
        right={
          <div className="flex items-center gap-2">

            {/* Save button — shown when new or when there are unsaved changes */}
            {(isNew || isDirty) && (
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500
                           disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Save size={15} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}

            {/* Saved indicator — only when existing song with no unsaved changes */}
            {!isNew && !isDirty && !saving && draft.title && (
              <span className="text-xs text-slate-500">Saved</span>
            )}

            {existingId && (
              <>
                <button
                  onClick={handleDuplicate}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Duplicate song"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Delete song"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="px-4 pt-4 space-y-4 max-w-2xl w-full mx-auto">

        {/* Title */}
        <Field label="Title *">
          <input
            autoFocus={isNew}
            value={draft.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Song title"
            className={inputClass}
          />
        </Field>

        {/* Artist + Key */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Artist">
            <input
              value={draft.artist}
              onChange={(e) => setField('artist', e.target.value)}
              placeholder="Artist / band"
              className={inputClass}
            />
          </Field>
          <Field label="Key">
            <select
              value={draft.key}
              onChange={(e) => setField('key', e.target.value)}
              className={inputClass}
            >
              <option value="">— none —</option>
              {MUSICAL_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Language + Genre */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Language">
            <input
              value={draft.language}
              onChange={(e) => setField('language', e.target.value)}
              placeholder="e.g. English"
              className={inputClass}
            />
          </Field>
          <Field label="Genre">
            <input
              value={draft.genre}
              onChange={(e) => setField('genre', e.target.value)}
              placeholder="e.g. Gospel"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Tags */}
        <Field label="Tags" hint="Comma separated, e.g. worship, fast, opener">
          <input
            value={tagsInput}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="worship, fast, opener"
            className={inputClass}
          />
        </Field>

        {/* Duration */}
        <Field label="Duration (optional)" hint="Used to estimate set length">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={59}
              value={durationMinutes}
              onChange={(e) => handleDurationChange(e.target.value, String(durationSecs))}
              placeholder="0"
              className={`${inputClass} w-20 text-center`}
            />
            <span className="text-slate-400 text-sm">min</span>
            <input
              type="number"
              min={0}
              max={59}
              value={durationSecs}
              onChange={(e) => handleDurationChange(String(durationMinutes), e.target.value)}
              placeholder="00"
              className={`${inputClass} w-20 text-center`}
            />
            <span className="text-slate-400 text-sm">sec</span>
          </div>
        </Field>

        {/* Lyrics search — prominent card */}
        <button
          type="button"
          onClick={() => setShowLyricsSearch(true)}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-dashed
                     border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10
                     hover:border-violet-500/60 transition-all group"
        >
          {/* Icon */}
          <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center
                          bg-violet-600/20 rounded-xl group-hover:bg-violet-600/30 transition-colors">
            <Music2 size={18} className="text-violet-400" />
            <Search size={11} className="text-violet-300 absolute bottom-1 right-1" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-violet-300 group-hover:text-violet-200">
              Search lyrics online
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Find title, artist and lyrics automatically
            </p>
          </div>
        </button>

        {/* Lyrics */}
        <Field label="Lyrics">
          <textarea
            value={draft.lyrics}
            onChange={(e) => setField('lyrics', e.target.value)}
            placeholder="Paste or type lyrics here…"
            rows={14}
            className={`${inputClass} resize-y font-mono text-sm leading-relaxed`}
          />
        </Field>

        {showLyricsSearch && (
          <LyricsSearchModal
            initialQuery={[draft.title, draft.artist].filter(Boolean).join(' ')}
            onSelect={(result: LyricsSearchResult) => {
              // Always apply lyrics
              setField('lyrics', result.lyrics)
              // Fill title/artist/duration only if the field is currently empty
              if (!draft.title.trim()) setField('title', result.title)
              if (!draft.artist.trim()) setField('artist', result.artist)
              if (!draft.durationSeconds && result.durationSeconds)
                setField('durationSeconds', result.durationSeconds)
              setShowLyricsSearch(false)
            }}
            onClose={() => setShowLyricsSearch(false)}
          />
        )}

        {/* Notes */}
        <Field label="Notes" hint="Private — not shown on stage">
          <textarea
            value={draft.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Capo, key changes, personal reminders…"
            rows={4}
            className={`${inputClass} resize-y text-sm`}
          />
        </Field>

      </div>
    </div>
  )
}

const inputClass =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 ' +
  'placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 ' +
  'focus:border-transparent transition-colors'

function Field({
  label,
  hint,
  action,
  children,
}: {
  label: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <label className="text-sm font-medium text-slate-300">{label}</label>
          {hint && <span className="text-xs text-slate-500">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
