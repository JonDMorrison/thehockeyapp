/**
 * Prerender script: starts vite preview, captures each route with Puppeteer, writes static HTML.
 * Skips gracefully on Vercel or when Chrome is not available.
 */

if (process.env.VERCEL) {
  console.log('Prerender skipped: running on Vercel');
  process.exit(0);
}

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const puppeteer = require('puppeteer');

const distDir = path.join(__dirname, '..', 'dist');
const PORT = 4777;
const BASE_URL = `http://localhost:${PORT}`;
const WAIT_MS = 3000;

// NOTE: /pricing is excluded because BETA_MODE=true redirects it to /
// Add it back when BETA_MODE is set to false
const routes = ['/', '/features', '/about', '/privacy', '/terms', '/demo'];

process.on('unhandledRejection', (err) => {
  if (err.message && err.message.includes('Could not find Chrome')) {
    console.warn('Puppeteer: Chrome not available — skipping prerender (Vercel environment)');
    process.exit(0);
  }
  throw err;
});

async function prerender() {
  // Start vite preview
  const preview = spawn(
    'node_modules/.bin/vite',
    ['preview', '--port', String(PORT), '--host', 'localhost'],
    { cwd: path.join(__dirname, '..'), stdio: 'pipe' }
  );

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
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
    await browser.close();
    preview.kill();
  }
}

prerender().catch((err) => {
  if (err.message && (err.message.includes('Could not find Chrome') || err.message.includes('Failed to launch'))) {
    console.warn('Prerender skipped: Chrome not available in this environment');
    process.exit(0);
  }
  console.error('Prerender failed:', err);
  process.exit(1);
});
