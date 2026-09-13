const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "src");
const sourceExtensions = new Set([".css", ".ts", ".tsx"]);
const forbiddenUtility = /(?:^|[^a-z])(?:bg|text|border|ring|shadow|from|via|to)-(?:blue|cyan|sky|indigo|violet|purple|pink|fuchsia|orange|amber|yellow|lime|teal)-\d+/g;
const teamControlUtility = /(?:^|[^a-z])(?:bg|text|border|ring|shadow|from|via|to)-team-(?:primary|secondary|tertiary)/g;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const violations = [];

for (const file of walk(root)) {
  if (!sourceExtensions.has(path.extname(file))) continue;

  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    const forbiddenMatches = [...line.matchAll(forbiddenUtility)];
    const teamMatches = [...line.matchAll(teamControlUtility)];

    for (const match of [...forbiddenMatches, ...teamMatches]) {
      violations.push(`${path.relative(process.cwd(), file)}:${index + 1} ${match[0].trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error("Off-brand interface colours found:\n");
  console.error(violations.join("\n"));
  console.error("\nUse primary/brand-strong, neutral greys, or success for completed states.");
  process.exit(1);
}

console.log("Brand colour check passed.");
