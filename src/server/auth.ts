import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { headers } from 'next/headers'
import { pool } from './db'

// The secret and the site address come from BETTER_AUTH_SECRET and BETTER_AUTH_URL.
export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // A phone on the same Wi-Fi opens the dev server at http://192.168.x.x:5173, which
  // is a different origin from BETTER_AUTH_URL. Without this, its logins are refused.
  trustedOrigins: process.env.NODE_ENV === 'development' ? ['http://192.168.*.*:5173'] : [],
  // Lets server actions set the session cookie. Must stay the last plugin.
  plugins: [nextCookies()],
})

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}
