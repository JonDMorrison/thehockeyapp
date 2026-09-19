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

const routeMetadata = {
  '/pricing': {
    title: 'Pricing — The Hockey App',
    description: 'Simple plans for hockey associations, coaches, players, and families.',
  },
  '/features': {
    title: 'Features — The Hockey App',
    description: 'Weekly plans, player workouts, Hockey Canada skill videos, team participation, and association-wide progress in one private hockey development app.',
  },
  '/about': {
    title: 'About — The Hockey App',
    description: 'Why The Hockey App was built to connect association standards, coaching plans, player work, and family support.',
  },
  '/privacy': {
    title: 'Privacy Policy — The Hockey App',
    description: 'How The Hockey App handles account, team, player, and training data.',
  },
  '/terms': {
    title: 'Terms of Service — The Hockey App',
    description: 'Terms and conditions for using The Hockey App.',
  },
  '/contact': {
    title: 'Contact — The Hockey App',
    description: 'Contact The Hockey App about association pilots, product support, or privacy requests.',
  },
  '/demo': {
    title: 'Product Tour — The Hockey App',
    description: 'See how associations, coaches, players, and families use one shared hockey development system.',
  },
};

const privateRouteMetadata = {
  auth: {
    title: 'Sign in or create an account — The Hockey App',
    description: 'Use one Hockey App account for every association, team, and player role.',
  },
  join: {
    title: 'Join a team — The Hockey App',
    description: 'Use a private team invitation to connect your existing Hockey App account.',
  },
  guardianInvite: {
    title: 'Accept guardian access — The Hockey App',
    description: 'Review and accept a private player guardian invitation.',
  },
  teamStaffInvite: {
    title: 'Join team staff — The Hockey App',
    description: 'Review and accept a private team staff invitation.',
  },
  associationInvite: {
    title: 'Join an association — The Hockey App',
    description: 'Review and accept a private association invitation using your existing account.',
  },
  sharedWorkout: {
    title: 'Try a workout — The Hockey App',
    description: 'Open a privately shared Hockey App workout.',
  },
  unsubscribe: {
    title: 'Email preferences — The Hockey App',
    description: 'Update your Hockey App email preferences.',
  },
};

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function writeMetadataFallbacks() {
  const sourcePath = path.join(distDir, 'index.html');
  if (!fs.existsSync(sourcePath)) return;
  const source = fs.readFileSync(sourcePath, 'utf8');

  for (const [route, meta] of Object.entries(routeMetadata)) {
    const url = `https://www.hockeyapp.ca${route}`;
    const title = escapeAttribute(meta.title);
    const description = escapeAttribute(meta.description);
    const html = source
      .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
      .replace(/<meta data-rh="true" name="description" content="[^"]*" \/>/, `<meta data-rh="true" name="description" content="${description}" />`)
      .replace(/<link data-rh="true" rel="canonical" href="[^"]*" \/>/, `<link data-rh="true" rel="canonical" href="${url}" />`)
      .replace(/<meta data-rh="true" property="og:url" content="[^"]*" \/>/, `<meta data-rh="true" property="og:url" content="${url}" />`)
      .replace(/<meta data-rh="true" property="og:title" content="[^"]*" \/>/, `<meta data-rh="true" property="og:title" content="${title}" />`)
      .replace(/<meta data-rh="true" property="og:description" content="[^"]*" \/>/, `<meta data-rh="true" property="og:description" content="${description}" />`)
      .replace(/<meta data-rh="true" property="og:image:alt" content="[^"]*" \/>/, `<meta data-rh="true" property="og:image:alt" content="${title}" />`)
      .replace(/<meta data-rh="true" name="twitter:title" content="[^"]*" \/>/, `<meta data-rh="true" name="twitter:title" content="${title}" />`)
      .replace(/<meta data-rh="true" name="twitter:description" content="[^"]*" \/>/, `<meta data-rh="true" name="twitter:description" content="${description}" />`);
    const routeDir = path.join(distDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), html);
  }

  const privateDir = path.join(distDir, '_private');
  fs.mkdirSync(privateDir, { recursive: true });
  for (const [fileName, meta] of Object.entries(privateRouteMetadata)) {
    const title = escapeAttribute(meta.title);
    const description = escapeAttribute(meta.description);
    const html = source
      .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
      .replace(/<meta data-rh="true" name="description" content="[^"]*" \/>/, `<meta data-rh="true" name="description" content="${description}" />`)
      .replace(/<meta data-rh="true" name="robots" content="[^"]*" \/>/, '<meta data-rh="true" name="robots" content="noindex, nofollow" />')
      .replace(/\s*<link data-rh="true" rel="canonical" href="[^"]*" \/>/, '')
      .replace(/\s*<meta data-rh="true" property="og:url" content="[^"]*" \/>/, '')
      .replace(/<meta data-rh="true" property="og:title" content="[^"]*" \/>/, `<meta data-rh="true" property="og:title" content="${title}" />`)
      .replace(/<meta data-rh="true" property="og:description" content="[^"]*" \/>/, `<meta data-rh="true" property="og:description" content="${description}" />`)
      .replace(/<meta data-rh="true" property="og:image:alt" content="[^"]*" \/>/, `<meta data-rh="true" property="og:image:alt" content="${title}" />`)
      .replace(/<meta data-rh="true" name="twitter:title" content="[^"]*" \/>/, `<meta data-rh="true" name="twitter:title" content="${title}" />`)
      .replace(/<meta data-rh="true" name="twitter:description" content="[^"]*" \/>/, `<meta data-rh="true" name="twitter:description" content="${description}" />`);
    fs.writeFileSync(path.join(privateDir, `${fileName}.html`), html);
  }
}

// Never let an unhandled rejection crash the build — log and succeed with the static shell.
process.on('unhandledRejection', (err) => {
  console.warn('Prerender skipped (unhandled rejection):', err && err.message ? err.message : err);
  console.warn('Static shell with full SEO metadata remains in place. Build continues.');
  process.exit(0);
});

async function prerender() {
  // Always emit route-specific metadata first. The rendered pass below replaces these
  // fallbacks when Chromium is available; production still has correct route metadata
  // when its build image cannot launch a browser.
  writeMetadataFallbacks();

  // Vercel's build image does not include Chromium's native Linux libraries. The source
  // document already contains a complete crawlable marketing shell, so keep that shell
  // there instead of attempting a browser launch that cannot succeed.
  if (process.env.VERCEL === '1') {
    console.log('Browser prerender skipped on Vercel; using route-specific metadata fallbacks.');
    return;
  }

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
      const renderedTitle = await page.title();
      await page.close();

      // If the application failed to mount (for example, a local build without
      // runtime environment variables), keep the route-specific fallback instead
      // of overwriting it with the homepage shell.
      if (routeMetadata[route] && renderedTitle !== routeMetadata[route].title) {
        console.warn(`Prerender skipped for ${route}: route metadata did not mount.`);
        continue;
      }

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
