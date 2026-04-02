import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const PORT = 4173;
const DIST = process.env.SCREENSHOT_DIST_DIR ?? 'dist';

export const OUT_DIR = 'screenshots';

export const PAGES = [
  { url: '/', slug: 'home' },
  { url: '/posts', slug: 'posts' },
  { url: '/posts/2025/hi', slug: 'posts-2025-hi' },
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
  const skipBuild = process.env.SCREENSHOT_SKIP_BUILD === 'true';

  if (existsSync(DIST)) {
    console.log(`✓ ${DIST}/ exists, skipping build`);
    return;
  }

  if (skipBuild) {
    throw new Error(
      `Screenshot server cannot start: ${DIST}/ is missing and SCREENSHOT_SKIP_BUILD=true`,
    );
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

  const distRoot = resolve(DIST);

  function resolveRequestedFile(reqUrl) {
    // Parse URL to strip querystrings/fragments before path resolution.
    const url = new URL(reqUrl, `http://localhost:${port}`);

    // Handle directory requests and default index page.
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname === '') pathname = '/index.html';
    if (pathname.endsWith('/')) pathname = `${pathname}index.html`;

    // Resolve the candidate path and ensure it stays within distRoot.
    // We explicitly prefix with '.' to avoid issues with absolute paths.
    const directCandidate = resolve(distRoot, `.${pathname}`);
    const relative = directCandidate.slice(distRoot.length);
    const isWithinDist = relative === '' || relative.startsWith('/') || relative.startsWith('\\');
    if (!isWithinDist) return null;

    // Astro static output uses directories with `index.html` (e.g. `/posts/index.html`).
    // When we request `/posts` (no trailing slash), `pathname` doesn't end with `/`,
    // so we need to fall back to `/posts/index.html`.
    let candidate = directCandidate;
    if (!pathname.endsWith('/') && extname(directCandidate) === '') {
      try {
        if (statSync(directCandidate).isDirectory()) {
          candidate = resolve(distRoot, `.${pathname}/index.html`);
        } else {
          // If it exists but isn't a directory, keep the direct file.
          candidate = directCandidate;
        }
      } catch {
        // If it doesn't exist yet, later readFile will return 404.
        candidate = directCandidate;
      }
    }

    const ext = extname(candidate).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return { filePath: candidate, contentType };
  }

  const server = createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
      }

      req.socket?.setTimeout(10_000);

      const resolved = resolveRequestedFile(req.url);
      if (!resolved) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const content = await readFile(resolved.filePath);
      res.writeHead(200, { 'Content-Type': resolved.contentType });
      res.end(content);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else if (err instanceof URIError) {
        res.writeHead(400);
        res.end('Bad Request');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.on('clientError', (_err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request');
    });

    server.on('error', reject);
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
async function captureScreenshots(baseUrl) {
  console.log('Launching browser...');
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    for (const pageInfo of PAGES) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const url = `${baseUrl}${pageInfo.url}`;
        console.log(`Capturing ${pageInfo.slug} @ ${viewport.name} (${viewport.width}×${viewport.height})`);

        // Use bounded waits to avoid indefinite hangs on long-lived connections.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

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

      await captureScreenshots(`http://localhost:${PORT}`);

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
