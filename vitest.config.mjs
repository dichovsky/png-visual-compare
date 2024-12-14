import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 90000,
    coverage: {
      provider: 'v8',
      include: ['out/**/*.js'],
      exclude: ['out/types/**/*'],
    },
  },
})
