import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontMode = 'normal' | 'monospace'
export type Theme = 'dark' | 'light'

interface SettingsState {
  fontSize: number
  lineHeight: number
  fontMode: FontMode
  theme: Theme
  githubPat: string
  showChords: boolean
  setFontSize: (size: number) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  increaseLineHeight: () => void
  decreaseLineHeight: () => void
  setFontMode: (mode: FontMode) => void
  toggleFontMode: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setGithubPat: (pat: string) => void
  toggleShowChords: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
      fontSize: 20,
      lineHeight: 1.3,
      fontMode: 'normal',
      theme: 'dark',
      githubPat: '',
      showChords: true,

      setFontSize: (size) => set({ fontSize: Math.min(48, Math.max(12, size)) }),
      increaseFontSize: () => set((s) => ({ fontSize: Math.min(48, s.fontSize + 2) })),
      decreaseFontSize: () => set((s) => ({ fontSize: Math.max(12, s.fontSize - 2) })),

      increaseLineHeight: () =>
        set((s) => ({ lineHeight: Math.min(2.0, Math.round((s.lineHeight + 0.1) * 10) / 10) })),
      decreaseLineHeight: () =>
        set((s) => ({ lineHeight: Math.max(1.0, Math.round((s.lineHeight - 0.1) * 10) / 10) })),

      setFontMode: (mode) => set({ fontMode: mode }),
      toggleFontMode: () =>
        set((s) => ({ fontMode: s.fontMode === 'normal' ? 'monospace' : 'normal' })),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      setGithubPat: (pat) => set({ githubPat: pat }),
      toggleShowChords: () => set((s) => ({ showChords: !s.showChords })),
    }),
    { name: 'setlist-app-settings' }
  )
)
