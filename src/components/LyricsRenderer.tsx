import React from 'react'

/**
 * Inline markup supported in lyrics:
 *   **text**      → bold (white, heavier)
 *   ==text==      → gold/amber  (chorus, key lines)
 *   [r]text[/r]   → coral/red   (cues, key changes)
 *   [b]text[/b]   → sky blue    (bridge, extra colour)
 *
 * Newlines inside text nodes are preserved by the parent's
 * whitespace-pre-wrap — no extra wrapper needed.
 */

const MARKUP_RE = /\*\*(.+?)\*\*|==(.+?)==|\[r\](.+?)\[\/r\]|\[b\](.+?)\[\/b\]/gs

function parseMarkup(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  // Re-create the regex each call so lastIndex starts at 0
  const re = new RegExp(MARKUP_RE.source, 'gs')
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    // plain text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>)
    } else if (match[2] !== undefined) {
      nodes.push(
        <span key={key++} className="text-amber-400 font-semibold">
          {match[2]}
        </span>
      )
    } else if (match[3] !== undefined) {
      nodes.push(
        <span key={key++} className="text-rose-400">
          {match[3]}
        </span>
      )
    } else if (match[4] !== undefined) {
      nodes.push(
        <span key={key++} className="text-sky-400">
          {match[4]}
        </span>
      )
    }

    lastIndex = re.lastIndex
  }

  // remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

interface LyricsRendererProps {
  lyrics: string
  fallback?: React.ReactNode
}

export function LyricsRenderer({ lyrics, fallback }: LyricsRendererProps) {
  if (!lyrics) {
    return (
      <>
        {fallback ?? (
          <span className="text-slate-500 italic">No lyrics added yet.</span>
        )}
      </>
    )
  }
  return <>{parseMarkup(lyrics)}</>
}

/** Strip all markup markers from a string (for plain-text export / search). */
export function stripMarkup(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/==(.+?)==/gs, '$1')
    .replace(/\[r\](.+?)\[\/r\]/gs, '$1')
    .replace(/\[b\](.+?)\[\/b\]/gs, '$1')
}
