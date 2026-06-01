import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['offline.html', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'NovaBulletin',
        short_name: 'NovaBulletin',
        description: 'Gestion scolaire numérique — bulletins, notes, frais',
        theme_color: '#1E2A78',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['education', 'productivity'],
        lang: 'fr',
        shortcuts: [
          {
            name: 'Tableau de bord',
            url: '/admin',
            description: 'Accéder au tableau de bord',
            icons: [{ src: 'pwa-192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // PDF generation — long-running, bypass service worker entirely
            urlPattern: /^https?:\/\/.*\/api\/reports\/.*\/pdf/i,
            handler: 'NetworkOnly',
          },
          {
            // API — network first, fall back to cache for 24h
            // 60s timeout to survive Render free-tier cold starts (~30-60s)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
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
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/reports/],
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
});
