import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@scripts': path.resolve(__dirname, 'scripts'),
    },
  },
  test: {
    // Load .env files using Vite's built-in helper (same behavior Vitest expects).
    // The empty prefix means "load all keys", not just VITE_*.
    env: loadEnv(mode, __dirname, ''),
    include: ['scripts/**/*.test.mjs', 'src/**/*.test.ts'],
    environment: 'node',
    // Integration tests rename dist / run screenshot; keep a single worker.
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 120_000,
  },
}));
