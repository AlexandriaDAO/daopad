import https from 'https';
import { readFileSync } from 'fs';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function verifyDeployment() {
  const url = 'https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io';

  console.log('Fetching deployed HTML...');
  // Fetch index.html
  const html = await fetchUrl(url);

  // Extract JS bundle hash from script tags
  const scriptMatch = html.match(/AppRoute-([a-zA-Z0-9]+)\.js/);

  if (!scriptMatch) {
    console.error('❌ Could not find AppRoute bundle in deployed HTML');
    process.exit(1);
  }

  const deployedHash = scriptMatch[1];

  // Read local dist/index.html
  console.log('Reading local build...');
  const localHtml = readFileSync('dist/index.html', 'utf8');
  const localMatch = localHtml.match(/AppRoute-([a-zA-Z0-9]+)\.js/);

  if (!localMatch) {
    console.error('❌ Could not find AppRoute bundle in local build');
    process.exit(1);
  }

  const localHash = localMatch[1];

  if (deployedHash === localHash) {
    console.log(`✅ Deployment verified! Bundle hash: ${deployedHash}`);
  } else {
    console.error(`❌ Deployment mismatch!`);
    console.error(`   Deployed: AppRoute-${deployedHash}.js`);
    console.error(`   Local:    AppRoute-${localHash}.js`);
    console.error(`   → Browser may be caching old version`);
    console.error(`   → Users should hard refresh (Ctrl+Shift+R)`);
    process.exit(1);
  }
}

verifyDeployment();
