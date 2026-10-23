const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
const requiredSnippets = [
  'Better hockey.',
  'Starts at home.',
  'Workouts and shooting challenges that keep your team moving.',
  'Free. No credit card.',
  'One weekly plan across every team.',
  'Set the standard once',
  'Set up your team free',
  'Free for the hockey community',
];

if (!fs.existsSync(htmlPath)) {
  console.error('Crawlability check failed: dist/index.html does not exist.');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const missing = requiredSnippets.filter((snippet) => !html.includes(snippet));

if (missing.length > 0) {
  console.error('Crawlability check failed: dist/index.html is missing required homepage copy:');
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

for (const route of ['about', 'features', 'demo', 'contact', 'privacy', 'terms']) {
  const document = fs.readFileSync(path.join(__dirname, '..', 'dist', route, 'index.html'), 'utf8');
  const main = document.match(/<main\b[\s\S]*?<\/main>/)?.[0] || '';
  if (!/<h1\b/.test(main) || /<h1[^>]*>Off-ice training delivers on-ice results\.<\/h1>/.test(main)) {
    console.error(`Crawlability check failed: /${route} has no distinct page content.`);
    process.exit(1);
  }
  if ((route === 'privacy' && !main.includes('Access, Correction, Deletion, and Retention')) ||
      (route === 'terms' && !main.includes('Limitation of Liability'))) {
    console.error(`Crawlability check failed: /${route} is missing its legal document.`);
    process.exit(1);
  }
}

const privatePages = {
  'shooting.html': 'Shooting challenge — The Hockey App',
  'auth.html': 'Sign in or create an account — The Hockey App',
  'join.html': 'Join a team — The Hockey App',
  'guardianInvite.html': 'Accept guardian access — The Hockey App',
  'teamStaffInvite.html': 'Join team staff — The Hockey App',
  'associationInvite.html': 'Join an association — The Hockey App',
  'sharedWorkout.html': 'Try a workout — The Hockey App',
  'unsubscribe.html': 'Email preferences — The Hockey App',
};

for (const [file, title] of Object.entries(privatePages)) {
  const privatePath = path.join(__dirname, '..', 'dist', '_private', file);
  if (!fs.existsSync(privatePath)) {
    console.error(`Crawlability check failed: ${file} metadata fallback does not exist.`);
    process.exit(1);
  }
  const privateHtml = fs.readFileSync(privatePath, 'utf8');
  if (!privateHtml.includes(`<title>${title}</title>`)
    || !privateHtml.includes('name="robots" content="noindex, nofollow"')
    || privateHtml.includes('rel="canonical"')
    || privateHtml.includes('property="og:url"')
    || privateHtml.includes('Team Dashboard')) {
    console.error(`Crawlability check failed: ${file} exposes incorrect private-route metadata.`);
    process.exit(1);
  }
}

console.log('Crawlability check passed: public copy and private-route metadata are correct.');
