# Crawlable Homepage Verification

This project is a Vite React SPA. The marketing homepage is rendered by React, but crawlers and simple HTML fetches need meaningful content before JavaScript executes.

The root `index.html` now includes a static marketing shell inside `#root`. React replaces this shell when the app loads, but a raw HTML fetch can still read the core homepage message.

Required verification after deployment:

```bash
curl -L https://www.hockeyapp.ca/ | grep -i "off-ice training"
curl -L https://www.hockeyapp.ca/ | grep -i "structured home training"
curl -L https://www.hockeyapp.ca/ | grep -i "Strong players go"
curl -L https://www.hockeyapp.ca/ | grep -i "Set up your team"
```

The production build also runs:

```bash
node scripts/verify-crawlable-homepage.cjs
```

That check fails the build if `dist/index.html` does not contain the required homepage copy.
