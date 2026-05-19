import { create } from 'zustand'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../db/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  init: () => () => void   // returns the unsubscribe function
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signIn: async () => {
    await signInWithPopup(auth, googleProvider)
  },

  signOut: async () => {
    await signOut(auth)
    set({ user: null })
  },

  init: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false })
    })
    return unsub
  },
}))
