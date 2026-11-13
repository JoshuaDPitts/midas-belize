import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    globals: true,
    testTimeout: 20_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
