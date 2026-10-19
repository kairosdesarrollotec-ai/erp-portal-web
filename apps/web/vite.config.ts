import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Las llamadas a la API no se cachean en Workbox — se manejan vía Dexie/IndexedDB
        runtimeCaching: [],
      },
      manifest: {
        name: 'VeloxRent ERP',
        short_name: 'VeloxRent',
        theme_color: '#1F2A33',
        background_color: '#FCF9F3',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'react';
          if (id.includes('/@radix-ui/') || id.includes('/lucide-react/') || id.includes('/react-hook-form/') || id.includes('/zod/')) return 'ui-forms';
          if (id.includes('/@tanstack/')) return 'data';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
