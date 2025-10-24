import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function ensureTestEnvironment() {
  // Create .auth directory if missing
  const authDir = join(process.cwd(), '.auth');
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
    console.log('Created .auth directory');
  }

  // Check if auth file exists
  const authFile = join(authDir, 'user.json');
  const hasAuth = existsSync(authFile);

  if (!hasAuth) {
    console.log('⚠️  No auth file found. Authenticated tests may fail.');
    console.log('   Run: npm run test:e2e:setup to create auth');
  }

  return hasAuth;
}