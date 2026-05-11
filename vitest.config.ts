import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [svelteTesting(), svelte({ hot: false })],
  resolve: {
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
      '$components': resolve(__dirname, 'src/components'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/components/**'],
    },
  },
})
