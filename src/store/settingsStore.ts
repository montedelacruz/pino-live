import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontMode = 'normal' | 'monospace'
export type Theme = 'dark' | 'light'

interface SettingsState {
  fontSize: number
  fontMode: FontMode
  theme: Theme
  happiApiKey: string
  setFontSize: (size: number) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  setFontMode: (mode: FontMode) => void
  toggleFontMode: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setHappiApiKey: (key: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, _get) => ({
      fontSize: 20,
      fontMode: 'normal',
      theme: 'dark',
      happiApiKey: '',

      setFontSize: (size) => set({ fontSize: Math.min(48, Math.max(12, size)) }),
      increaseFontSize: () => set((s) => ({ fontSize: Math.min(48, s.fontSize + 2) })),
      decreaseFontSize: () => set((s) => ({ fontSize: Math.max(12, s.fontSize - 2) })),

      setFontMode: (mode) => set({ fontMode: mode }),
      toggleFontMode: () =>
        set((s) => ({ fontMode: s.fontMode === 'normal' ? 'monospace' : 'normal' })),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      setHappiApiKey: (key) => set({ happiApiKey: key }),
    }),
    { name: 'setlist-app-settings' }
  )
)
