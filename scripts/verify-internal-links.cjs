const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const routes = [...fs.readFileSync('src/App.tsx', 'utf8').matchAll(/<Route\s+path="([^"]+)"/g)]
  .map(match => match[1]).filter(route => route !== '*')
  .map(route => new RegExp('^' + route.split('/').map(part => part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '/?$'));
const failures = [];
function inspect(filename) {
  const text = fs.readFileSync(filename, 'utf8');
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function check(node, target) {
    if (!target.startsWith('/') || target.startsWith('//')) return;
    const pathname = target.split(/[?#]/)[0] || '/';
    if (pathname.startsWith('/api/') || fs.existsSync(path.join('public', pathname))) return;
    if (!routes.some(route => route.test(pathname))) {
      failures.push(`${filename}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${target}`);
    }
  }
  function visit(node) {
    if (ts.isJsxAttribute(node) && ['to','href'].includes(node.name.getText(source))) {
      const initializer = node.initializer;
      if (initializer && ts.isStringLiteral(initializer)) check(node, initializer.text);
      else if (initializer && ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteralLike(initializer.expression)) check(node, initializer.expression.text);
    }
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'navigate' && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) check(node, node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (/\.tsx$/.test(filename)) inspect(filename);
  }
}
walk('src');
if (failures.length) { console.error('Internal links without a matching route:\n' + failures.join('\n')); process.exitCode = 1; }
else console.log('Internal navigation targets match application routes.');
