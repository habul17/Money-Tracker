import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi use the dev server (http://192.168.x.x:5173), which
  // Next.js otherwise blocks. Development only: production builds ignore it.
  allowedDevOrigins: ['192.168.*.*'],
  // The floating "N" badge sits on top of the Home tab. Errors still show without it.
  devIndicators: false,
}

export default nextConfig
