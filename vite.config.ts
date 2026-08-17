import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5000000
      },
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Boilerplate App',
        short_name: 'Boilerplate',
        description: 'Boilerplate Progressive Web Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Use esbuild for fast minification (default in Vite 5+)
    minify: 'esbuild',
    // Raise chunk warning limit to avoid noise from large vendor splits
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate cacheable chunks
        manualChunks(id) {
          // Core React runtime — loaded first, cached forever
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          // Supabase — large SDK, rarely changes
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }
          // Recharts + dependencies
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
          // Leaflet map library
          if (id.includes('node_modules/leaflet')) {
            return 'vendor-maps'
          }
          // PDF / document generation (large, only used on demand)
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/jspdf-autotable') ||
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/docx') ||
            id.includes('node_modules/xlsx')
          ) {
            return 'vendor-documents'
          }
          // QR code libraries
          if (id.includes('node_modules/qrcode') || id.includes('node_modules/html5-qrcode')) {
            return 'vendor-qr'
          }
          // Lucide icons (large icon set)
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router'
          }
          // All remaining node_modules into a shared vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc'
          }
        },
      },
    },
  },
  // Optimise cold-start in dev: pre-bundle known heavy deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'zustand',
      'lucide-react',
      'workbox-window'
    ],
  },
})
