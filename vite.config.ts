import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// localStorage is scoped per origin, so the port has to be stable or the
// ledger appears to vanish between runs. strictPort fails loudly instead of
// silently moving to the next free port. dev and preview share a port for the
// same reason: they should see the same data.
const server = { port: 5173, strictPort: true, host: true }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server,
  preview: server,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
