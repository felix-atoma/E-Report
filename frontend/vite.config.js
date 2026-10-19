import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enregistrement fait dans src/index.jsx (mise à jour immédiate + vérification horaire)
      injectRegister: false,
      includeAssets: ['offline.html', 'pwa-192.svg', 'pwa-512.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'NovaBulletin',
        short_name: 'NovaBulletin',
        description: 'Gestion scolaire numérique — bulletins, notes, frais',
        id: '/',
        theme_color: '#002347',
        background_color: '#ffffff',
        display: 'standalone',
        // « any » : l'application installée suit la rotation du téléphone (fiche de notes en paysage)
        orientation: 'any',
        scope: '/',
        start_url: '/',
        // PNG : exigé par Android/Chrome pour proposer « Installer l'application »
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
        categories: ['education', 'productivity'],
        lang: 'fr',
        shortcuts: [
          {
            name: 'Tableau de bord',
            url: '/admin',
            description: 'Accéder au tableau de bord',
            icons: [{ src: 'pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // pdf.js (import de signature en PDF) : chargé à la demande, pas pré-téléchargé pour tous
        globIgnores: ['**/pdf.worker*.js', '**/pdf-*.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // PDF / ZIP generation — long-running, bypass service worker entirely
            urlPattern: /^https?:\/\/.*\/api\/reports\/(.*\/pdf|bulk-zip)/i,
            handler: 'NetworkOnly',
          },
          {
            // API — network first; without internet, the last answer (up to 7 days old) is shown
            // 60s timeout to survive Render free-tier cold starts (~30-60s)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 86400 },
              networkTimeoutSeconds: 60,
            },
          },
          {
            // Uploaded files (avatars, logos) — cache for 30 days
            urlPattern: /^https?:\/\/.*\/uploads\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/offline\.html/],
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/settings/colors" as *;
          @use "@/styles/settings/spacing" as *;
          @use "@/styles/settings/typography" as *;
          @use "@/styles/settings/breakpoints" as *;
        `,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  optimizeDeps: {
    // Pre-bundle heavy deps so the browser makes fewer individual requests
    include: [
      'react', 'react-dom', 'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'react-hot-toast',
      'i18next', 'react-i18next',
      '@sentry/react',
    ],
  },
});
