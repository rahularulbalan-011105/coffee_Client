import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base: works at https://<user>.github.io/<any-repo-name>/ without configuration.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // three.js lands in the lazily-loaded scene chunks; the entry stays small.
    chunkSizeWarningLimit: 1400,
  },
})
