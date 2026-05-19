/**
 * Firestore sync helpers.
 * Each user's data lives under:  users/{uid}/songs/{id}  and  users/{uid}/setlists/{id}
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db as firestore } from './firebase'
import type { Song } from './db'
import type { Setlist } from './db'

// ── paths ────────────────────────────────────────────────────────────────────
const songsCol  = (uid: string) => collection(firestore, 'users', uid, 'songs')
const setlistsCol = (uid: string) => collection(firestore, 'users', uid, 'setlists')
const songDoc   = (uid: string, id: string) => doc(firestore, 'users', uid, 'songs', id)
const setlistDoc = (uid: string, id: string) => doc(firestore, 'users', uid, 'setlists', id)

// ── write helpers ─────────────────────────────────────────────────────────────
export async function syncSongUp(uid: string, song: Song) {
  await setDoc(songDoc(uid, song.id), song)
}

export async function deleteSongUp(uid: string, id: string) {
  await deleteDoc(songDoc(uid, id))
}

export async function syncSetlistUp(uid: string, setlist: Setlist) {
  await setDoc(setlistDoc(uid, setlist.id), setlist)
}

export async function deleteSetlistUp(uid: string, id: string) {
  await deleteDoc(setlistDoc(uid, id))
}

// ── real-time listeners ───────────────────────────────────────────────────────
export function subscribeSongs(
  uid: string,
  onData: (songs: Song[]) => void,
): Unsubscribe {
  return onSnapshot(songsCol(uid), (snap) => {
    const songs = snap.docs.map((d) => d.data() as Song)
    onData(songs)
  })
}

export function subscribeSetlists(
  uid: string,
  onData: (setlists: Setlist[]) => void,
): Unsubscribe {
  return onSnapshot(setlistsCol(uid), (snap) => {
    const setlists = snap.docs.map((d) => d.data() as Setlist)
    onData(setlists)
  })
}
