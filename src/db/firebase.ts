import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAVBQbxxSw1ysXpexZoKbEdkThiSHthxXw",
  authDomain: "pino-live-867a1.firebaseapp.com",
  projectId: "pino-live-867a1",
  storageBucket: "pino-live-867a1.firebasestorage.app",
  messagingSenderId: "748020560390",
  appId: "1:748020560390:web:bf3a480ab834c9a62bc987",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
