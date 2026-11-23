import type { NextConfig } from 'next'

/**
 * SIRR is entirely static: one prerendered page, client-side WebGL, no server code.
 * `output: 'export'` writes plain HTML/JS/CSS to `out/`, deployable to any static host or CDN.
 */
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['three'],
  images: { unoptimized: true },
  // no "x-powered-by" style fingerprints in exported HTML either
  poweredByHeader: false,
}

export default nextConfig
