/**
 * Standalone Vite config for WPF host.
 * Builds the React renderer without any Electron context.
 * Output goes to wpf-host/wwwroot/ — served by WebView2 via virtual hostname.
 *
 * Usage:  npm run build:wpf
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared':   resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir:    resolve(__dirname, 'wpf-host/wwwroot'),
    emptyOutDir: true,
  },
})
