import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  // Use the deployment sub-path in every mode so preview exercises the exact
  // URLs shipped to GitHub Pages rather than a more forgiving root build.
  base: '/track-and-tag/',
  plugins: [react(), VitePWA({
    registerType: 'prompt', injectRegister: false,
    includeAssets: ['icons/*.png'],
    manifest: {
      name: 'Track&Tag', short_name: 'Track&Tag', description: 'Warehouse tracking and Bluetooth label printing',
      id: '/track-and-tag/', start_url: '/track-and-tag/', scope: '/track-and-tag/', display: 'standalone', orientation: 'portrait-primary',
      background_color: '#10151c', theme_color: '#1b222c', categories: ['productivity', 'utilities'],
      icons: [
        ...[72,96,128,144,152,192,384,512].map(size => ({ src: `icons/icon-${size}x${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' as const })),
        ...[192,512].map(size => ({ src: `icons/icon-maskable-${size}x${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'maskable' as const })),
      ]
    },
    workbox: { navigateFallback: 'index.html', cleanupOutdatedCaches: true, globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
    devOptions: { enabled: false }
  })],
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: './tests/setup.ts', coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/domain/**', 'src/devices/**', 'src/storage/**'] } }
}));
