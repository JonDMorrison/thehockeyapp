const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const copy = require('../src/i18n/locales/en.json').marketing;

const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

// Legal documents have static JSX. Render their actual source so the browser-free
// build cannot drift to an abbreviated or independently maintained legal policy.
function legalMain(page) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', `${page}.tsx`), 'utf8');
  const main = source.match(/<main\b[\s\S]*?<\/main>/)?.[0];
  if (!main) throw new Error(`Missing legal content in ${page}`);
  const jsx = main.replace(/<Link\b/g, '<a').replace(/<\/Link>/g, '</a>').replace(/\bto=/g, 'href=');
  const output = ts.transpileModule(`module.exports = (${jsx});`, {compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS}}).outputText;
  const compiled = {exports:null};
  new Function('React', 'module', output)(React, compiled);
  return renderToStaticMarkup(compiled.exports);
}

function main(heading, description, extra = '') {
  return `<main><section class="static-marketing-container static-marketing-hero"><div><p class="static-marketing-eyebrow">The Hockey App</p><h1>${escape(heading)}</h1><p class="static-marketing-lead">${escape(description)}</p>${extra}<div class="static-marketing-actions"><a class="static-marketing-button" href="/demo">Try the demo</a><a class="static-marketing-button static-marketing-secondary" href="/auth?mode=signup&amp;redirect=%2Fonboarding%2Fcoach">Set up your team free</a></div></div></section></main>`;
}

function publicMain(route, metadata) {
  if (route === '/privacy') return legalMain('Privacy');
  if (route === '/terms') return legalMain('Terms');
  if (route === '/about') return main(`${copy.about_visual_hero_first} ${copy.about_visual_hero_accent}`, copy.about_visual_intro, '<h2>Built by coach and dad Jon Morrison</h2><p>A clear plan between practices. Work families can follow. Progress teams can see.</p>');
  if (route === '/features') return main('A clear plan. Real progress.', metadata.description, '<h2>Plan, train, track</h2><ul><li>Coaches choose a weekly plan or shooting challenge.</li><li>Families follow activities and record completed work.</li><li>Coaches see participation and progress for their team.</li></ul>');
  if (route === '/demo') return main('Try a workout. Start a shooting challenge.', 'Explore a sample workout and shooting leaderboard before creating your team.', '<p>Choose challenge dates, log sample shots, then start a real challenge with your own team. Sample totals stay in the demo.</p><noscript><p>Enable JavaScript to use the interactive samples.</p></noscript>');
  if (route === '/contact') return main('Talk to a real person.', metadata.description, '<p>Use the support form to ask a question, report a problem, or request help with your data.</p><noscript><p>Enable JavaScript to send the contact form.</p></noscript>');
  return null;
}

function privateMain(metadata) {
  return `<main><section class="static-marketing-container static-marketing-hero"><div><h1>${escape(metadata.title.replace(' — The Hockey App',''))}</h1><p class="static-marketing-lead">${escape(metadata.description)}</p><noscript><p>Enable JavaScript to continue securely.</p></noscript><div class="static-marketing-actions"><a class="static-marketing-button" href="/auth">Sign in</a><a class="static-marketing-button static-marketing-secondary" href="/contact">Get help</a></div></div></section></main>`;
}

module.exports = { publicMain, privateMain };
