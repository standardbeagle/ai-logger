import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**']
    },
    testTimeout: 10000, // Increased timeout to 10 seconds
    hookTimeout: 10000,
    isolate: true,
    sequence: {
      hooks: 'list' // Run hooks in sequence for more predictable cleanup
    },
    poolOptions: {
      threads: {
        singleThread: true // Run tests serially to avoid timing issues
      }
    }
  }
});