/** Format seconds → "3:45" or "1h 02m" */
export function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Sum durations of songs, skipping nulls */
export function totalDuration(durations: (number | null)[]): number {
  return durations.reduce<number>((acc, d) => acc + (d ?? 0), 0)
}
