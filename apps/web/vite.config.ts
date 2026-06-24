import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Bind explicitly to IPv4 loopback so http://127.0.0.1:5173 works.
    // Default `localhost` resolves to IPv6 first on Windows hosts, which
    // would silently route the request to a different socket than the
    // 127.0.0.1:4000 the proxy target uses (cf. .planning/gallery-home-
    // visual-review/findings.md).
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('maplibre-gl')) return 'vendor-maplibre';
          if (id.includes('three')) return 'vendor-three';
          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router-dom')
          ) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
});
