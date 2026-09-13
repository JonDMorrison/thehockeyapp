const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
const requiredSnippets = [
  'Turn the days between practices',
  'into an advantage',
  'One weekly plan across your association',
  'One weekly plan across every team.',
  'Set the standard once',
  'Start a free team pilot',
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

console.log('Crawlability check passed: dist/index.html contains required homepage copy.');
