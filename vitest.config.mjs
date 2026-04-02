import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Same layering as Vite `loadEnv` (without importing `vite` as a direct dependency). */
function loadEnvFiles(root, mode) {
  return Object.assign(
    {},
    readEnvFile(path.join(root, '.env')),
    readEnvFile(path.join(root, '.env.local')),
    readEnvFile(path.join(root, `.env.${mode}`)),
    readEnvFile(path.join(root, `.env.${mode}.local`)),
  );
}

function readEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@scripts': path.resolve(__dirname, 'scripts'),
    },
  },
  test: {
    env: loadEnvFiles(__dirname, mode),
    include: ['scripts/**/*.test.mjs'],
    environment: 'node',
    // Integration tests rename dist / run screenshot; keep a single worker.
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 120_000,
  },
}));
