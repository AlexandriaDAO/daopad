import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create .auth directory if it doesn't exist
const authDir = path.join(__dirname, '..', '.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
  console.log('✅ Created .auth directory');
}

// Create mock auth state for tests
const mockAuthState = {
  cookies: [],
  origins: [
    {
      origin: process.env.TEST_BASE_URL || 'https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io',
      localStorage: [
        {
          name: 'ic-delegation',
          value: '{"delegations":[{"delegation":{"pubkey":"mock-test-pubkey","expiration":"9999999999999999999","targets":[]},"signature":"mock-test-signature"}]}'
        },
        {
          name: 'ic-identity',
          value: '{"principal":"test-principal-id"}'
        },
        {
          name: 'test-auth-token',
          value: 'mock-token-for-testing'
        }
      ]
    }
  ]
};

const authFile = path.join(authDir, 'user.json');
fs.writeFileSync(authFile, JSON.stringify(mockAuthState, null, 2));
console.log('✅ Created mock auth state at', authFile);