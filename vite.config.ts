import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const PORT = 5050
const PRODUCTION_URL = 'https://atre-soundboard.vercel.app'

/**
 * Absolute origin of the deployed site. Crawlers reject relative og:image URLs,
 * so index.html carries %SITE_URL% placeholders resolved at build time. Defaults
 * to production rather than localhost: a build without env vars must still ship
 * shareable metadata.
 */
const siteUrl = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : PRODUCTION_URL)
).replace(/\/$/, '')

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'inject-site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: PORT,
    strictPort: true,
  },
  preview: {
    port: PORT,
    strictPort: true,
  },
})
