const { IDL } = require('@dfinity/candid');
const fs = require('fs');
const { execSync } = require('child_process');

// Read the .did file
const didFile = fs.readFileSync('./daopad_backend/daopad_backend.did', 'utf8');

// Generate JavaScript declarations using didc
try {
    // Use dfx to generate the JS file
    execSync(`dfx generate --network ic daopad_backend`, { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to generate declarations:', error);
}