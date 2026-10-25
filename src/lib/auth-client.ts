import { createAuthClient } from 'better-auth/react'

// No baseURL: requests go to whatever address the page was opened at, so the same
// build works on localhost, a phone on Wi-Fi, and the live domain.
export const authClient = createAuthClient()
