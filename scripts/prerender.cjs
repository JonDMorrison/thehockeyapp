/**
 * Prerender script: starts vite preview, captures each route with Puppeteer, writes static HTML.
 *
 * Runs everywhere (including Vercel) so the homepage is emitted from the same React source
 * wherever Chrome is available. ANY failure (Chrome not found, launch failure, timeout,
 * preview server failure) is caught, logged as a warning, and exits 0 (success) — leaving the
 * SEO-complete static shell (dist/index.html) in place so the build NEVER fails.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const PORT = 4777;
const BASE_URL = `http://localhost:${PORT}`;
const WAIT_MS = 3000;

// NOTE: /pricing is excluded because BETA_MODE=true redirects it to /
// Add it back when BETA_MODE is set to false
const routes = ['/', '/features', '/about', '/privacy', '/terms', '/contact', '/demo'];

// Never let an unhandled rejection crash the build — log and succeed with the static shell.
process.on('unhandledRejection', (err) => {
  console.warn('Prerender skipped (unhandled rejection):', err && err.message ? err.message : err);
  console.warn('Static shell with full SEO metadata remains in place. Build continues.');
  process.exit(0);
});

async function prerender() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (err) {
    console.warn('Prerender skipped: puppeteer not available —', err && err.message ? err.message : err);
    return;
  }

  let preview;
  let browser;
  try {
    // Start vite preview
    preview = spawn(
      'node_modules/.bin/vite',
      ['preview', '--port', String(PORT), '--host', 'localhost'],
      { cwd: path.join(__dirname, '..'), stdio: 'pipe' }
    );

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const route of routes) {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));

      const html = await page.content();
      await page.close();

      const routeDir = route === '/' ? distDir : path.join(distDir, route);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      fs.writeFileSync(path.join(routeDir, 'index.html'), html);
      console.log(`Prerendered: ${route}`);
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        /* ignore */
      }
    }
    if (preview) {
      try {
        preview.kill();
      } catch (_) {
        /* ignore */
      }
    }
  }
}

prerender()
  .then(() => process.exit(0))
  .catch((err) => {
    // Any failure (Chrome missing, launch failure, timeout, preview server fail) must NOT
    // break the build. Log a clear warning and exit successfully with the static shell intact.
    console.warn('Prerender skipped:', err && err.message ? err.message : err);
    console.warn('Static shell with full SEO metadata remains in place. Build continues.');
    process.exit(0);
  });
