import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set')
}

// After sign-in/up, redirect back to the app root (works on both localhost and /pino-live/)
const afterAuthUrl = `${import.meta.env.BASE_URL}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_KEY}
      signInForceRedirectUrl={afterAuthUrl}
      signUpForceRedirectUrl={afterAuthUrl}
      afterSignOutUrl={afterAuthUrl}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
