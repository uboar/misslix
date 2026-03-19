import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
      '$components': resolve(__dirname, 'src/components'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'es2023',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/misskey-js')) return 'misskey';
          if (id.includes('node_modules/mfm-js')) return 'mfm';
        },
      },
    },
  },
})
