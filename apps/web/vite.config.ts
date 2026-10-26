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
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Las rutas de negocio se importan desde el router; agruparlas por
          // dominio evita que la navegación inicial descargue todo el ERP.
          if (id.includes('/src/app/rentals/')) return 'rentals';
          if (id.includes('/src/app/reservations/')) return 'reservations';
          if (id.includes('/src/app/inquiries/')) return 'inquiries';
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
