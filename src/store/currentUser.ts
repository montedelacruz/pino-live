/**
 * Module-level uid accessor for use in Zustand stores (which can't call React hooks).
 * App.tsx calls setCurrentUid() whenever Clerk's user changes.
 */
let _uid: string | null = null

export function setCurrentUid(uid: string | null) {
  _uid = uid
}

export function getCurrentUid(): string | null {
  return _uid
}
