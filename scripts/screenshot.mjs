import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const PORT = 4173;
const DIST = 'dist';

export const OUT_DIR = 'shots';

export const PAGES = [
  { url: '/', slug: 'home' },
  { url: '/posts', slug: 'posts' },
  { url: '/posts/2025/explore-rails-with-vue', slug: 'posts-2025-explore-rails-with-vue' },
  { url: '/workouts', slug: 'workouts' },
  { url: '/workouts/17751421152', slug: 'workouts-17751421152' },
];

export const VIEWPORTS = [
  { name: 'iphone', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'pc', width: 1280, height: 800 },
];

/** Generate output path for a screenshot */
export function outputPath(slug, vpName) {
  return `${OUT_DIR}/${slug}.${vpName}.png`;
}

const __filename = fileURLToPath(import.meta.url);

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === __filename;
}

// Helper: ensure the site is built
function ensureBuilt() {
  if (existsSync(DIST)) {
    console.log(`✓ ${DIST}/ exists, skipping build`);
    return;
  }
  console.log(`Building site...`);
  execSync('pnpm run build', { stdio: 'inherit' });
}

// Helper: start a simple HTTP server serving dist/
function startServer(port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = createServer(async (req, res) => {
    let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url);

    // Handle directory requests
    if (!extname(filePath)) {
      filePath = join(filePath, 'index.html');
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✓ Server running on http://localhost:${port}`);
        resolve({
          close: () => {
            return new Promise((resolveClose) => {
              server.close(() => {
                console.log('✓ Server stopped');
                resolveClose();
              });
            });
          }
        });
      }
    });
  });
}

// Main: capture all screenshots
async function captureShots(baseUrl) {
  console.log('Launching browser...');
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    for (const pageInfo of PAGES) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const url = `${baseUrl}${pageInfo.url}`;
        console.log(`Capturing ${pageInfo.slug} @ ${viewport.name} (${viewport.width}×${viewport.height})`);

        await page.goto(url, { waitUntil: 'networkidle' });
        const outputFile = outputPath(pageInfo.slug, viewport.name);
        await page.screenshot({ path: outputFile, fullPage: true });
      }
    }

    console.log(`✓ Captured ${PAGES.length * VIEWPORTS.length} screenshots`);
  } finally {
    await browser.close();
  }
}

if (isMainModule()) {
  (async () => {
    let serverHandle = null;

    try {
      if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true });
        console.log(`✓ Created ${OUT_DIR}/ directory`);
      }

      ensureBuilt();

      serverHandle = await startServer(PORT);

      await captureShots(`http://localhost:${PORT}`);

      await serverHandle.close();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      if (serverHandle) {
        await serverHandle.close();
      }
      process.exit(1);
    }
  })();
}
