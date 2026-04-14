import * as fs from 'fs';

async function globalSetup() {
  // Create auth directory if it doesn't exist
  fs.mkdirSync('e2e/.auth', { recursive: true });

  // Create empty auth state — tests will handle login individually
  if (!fs.existsSync('e2e/.auth/user.json')) {
    fs.writeFileSync('e2e/.auth/user.json', JSON.stringify({
      cookies: [],
      origins: []
    }));
  }
}

export default globalSetup;
