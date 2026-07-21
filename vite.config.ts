import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// mkcert-generated cert so demo.localhost etc. are trusted without warnings (same setup as psa-ui).
// Regenerate with: mkcert -cert-file certs/dev-cert.pem -key-file certs/dev-key.pem demo.localhost "*.localhost" localhost 127.0.0.1 ::1
// (and once per machine: mkcert -install). Falls back to plain HTTP when certs are absent.
const CERT_FILE = path.resolve(__dirname, 'certs/dev-cert.pem')
const KEY_FILE = path.resolve(__dirname, 'certs/dev-key.pem')
const httpsCerts = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)
  ? { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) }
  : undefined

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Custom SW (src/sw.ts): precache + API caching + Web Push handlers
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      // SW active in `npm run dev` too, so push can be tested without a build
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'GarageOS Field',
        short_name: 'GarageOS',
        description: 'Field engineer companion for GarageOS workshop management',
        theme_color: '#f97316',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/field',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    https: httpsCerts,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
      // Socket.io (real-time notifications) — websocket proxy to the API
      '/socket.io': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
