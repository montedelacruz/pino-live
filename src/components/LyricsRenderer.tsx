import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Inline markup (bold / colour) parser
// ─────────────────────────────────────────────────────────────────────────────
//   **text**      → bold
//   ==text==      → gold/amber  (chorus, key lines)
//   [r]text[/r]   → coral/red   (cues, key changes)
//   [b]text[/b]   → sky blue    (bridge)
//
// NOTE: these use lowercase tags — chord markers use uppercase [A-G]…
// so there is no ambiguity between the two systems.

const INLINE_RE = /\*\*(.+?)\*\*|==(.+?)==|\[r\](.+?)\[\/r\]|\[b\](.+?)\[\/b\]/gs

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = new RegExp(INLINE_RE.source, 'gs')
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    if (match[1] !== undefined)
      nodes.push(<strong key={key++}>{match[1]}</strong>)
    else if (match[2] !== undefined)
      nodes.push(<span key={key++} className="text-amber-400 font-semibold">{match[2]}</span>)
    else if (match[3] !== undefined)
      nodes.push(<span key={key++} className="text-rose-400">{match[3]}</span>)
    else if (match[4] !== undefined)
      nodes.push(<span key={key++} className="text-sky-400">{match[4]}</span>)
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

// ─────────────────────────────────────────────────────────────────────────────
// ChordPro chord parser
// ─────────────────────────────────────────────────────────────────────────────
// Matches [G], [Am], [D7], [Bbmaj7], [F#m], [C/E], [Gsus4] …
// Only fires on uppercase A–G so [r], [b] color tags are never touched.

const CHORD_TOKEN_RE = /\[([A-G][A-Ga-z0-9#b/]*)\]/g

export function hasChords(line: string): boolean {
  CHORD_TOKEN_RE.lastIndex = 0
  return CHORD_TOKEN_RE.test(line)
}

interface ChordSegment {
  chord: string   // e.g. "Am7" — empty string means no chord above this text
  text: string    // lyric text that follows (may contain inline markup)
}

function parseChordLine(line: string): ChordSegment[] {
  const re = new RegExp(CHORD_TOKEN_RE.source, 'g')
  const segments: ChordSegment[] = []
  let lastIndex = 0
  let pendingChord: string | null = null

  let match: RegExpExecArray | null
  while ((match = re.exec(line)) !== null) {
    const textBefore = line.slice(lastIndex, match.index)
    // Flush accumulated text + pending chord as one segment
    if (pendingChord !== null || textBefore) {
      segments.push({ chord: pendingChord ?? '', text: textBefore })
    }
    pendingChord = match[1]
    lastIndex = re.lastIndex
  }
  // Last chord + remaining text
  segments.push({ chord: pendingChord ?? '', text: line.slice(lastIndex) })

  return segments
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip helpers (for search / export / chord-hidden mode)
// ─────────────────────────────────────────────────────────────────────────────

/** Remove all ChordPro chord tokens [X] from a string. */
export function stripChords(text: string): string {
  return text.replace(CHORD_TOKEN_RE, '')
}

/** Remove all inline colour/bold markup markers from a string. */
export function stripMarkup(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/==(.+?)==/gs, '$1')
    .replace(/\[r\](.+?)\[\/r\]/gs, '$1')
    .replace(/\[b\](.+?)\[\/b\]/gs, '$1')
}

// ─────────────────────────────────────────────────────────────────────────────
// Chord line renderer — chords float above their corresponding lyric syllables
// ─────────────────────────────────────────────────────────────────────────────

function ChordLineBlock({ line }: { line: string }) {
  const segments = parseChordLine(line)
  return (
    <div style={{ lineHeight: 'normal', marginBottom: '0.1em' }}>
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{ display: 'inline-block', verticalAlign: 'bottom' }}
        >
          {/* Chord — always shown even if empty so the lyric row aligns */}
          <span
            style={{
              display: 'block',
              color: '#a78bfa',          // violet-400
              fontSize: '0.72em',
              lineHeight: 1.25,
              fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              userSelect: 'none',
              paddingRight: seg.chord ? '0.4em' : 0,
            }}
          >
            {seg.chord || ' '}
          </span>

          {/* Lyric text (may contain inline markup) */}
          <span style={{ display: 'block' }}>
            {seg.text
              ? parseInline(seg.text)
              : seg.chord
                ? ' '   // keep column width when chord has no following text
                : null}
          </span>
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

interface LyricsRendererProps {
  lyrics: string
  showChords?: boolean          // default true
  fallback?: React.ReactNode
}

export function LyricsRenderer({
  lyrics,
  showChords = true,
  fallback,
}: LyricsRendererProps) {
  if (!lyrics) {
    return (
      <>
        {fallback ?? (
          <span className="text-slate-500 italic">No lyrics added yet.</span>
        )}
      </>
    )
  }

  const lines = lyrics.split('\n')

  return (
    <>
      {lines.map((line, i) => {
        // Chord line — render with chord-above layout
        if (showChords && hasChords(line)) {
          return <ChordLineBlock key={i} line={line} />
        }

        // Plain / inline-markup line — strip chord tokens when chords are hidden
        const text = showChords ? line : stripChords(line)

        // Empty line keeps vertical rhythm
        if (!text.trim()) {
          return <div key={i} style={{ height: '0.9em' }} />
        }

        return (
          <div key={i}>
            {parseInline(text)}
          </div>
        )
      })}
    </>
  )
}
