import { describe, it, expect, beforeAll } from 'vitest';
import { Principal } from '@dfinity/principal';
import {
  createBackendActor,
  ALEX_TOKEN_ID,
  ORBIT_STATION_ID,
  logResponse,
  serializeBigInt
} from './setup';

/**
 * Treasury Accounts - Mainnet Integration Tests
 *
 * Purpose: Debug treasury loading issues by making real mainnet calls
 * Usage: npm run test:integration
 *
 * These tests:
 * - Make real HTTP calls to mainnet canisters
 * - Log full response structures for debugging
 * - Show exact types (especially BigInt handling)
 * - Display error messages with codes and details
 */
describe('Treasury Accounts - Mainnet Integration', () => {
  let backendActor: any;

  beforeAll(async () => {
    console.log('🔗 Connecting to mainnet...');
    console.log('Backend:', 'lwsav-iiaaa-aaaap-qp2qq-cai');
    console.log('ALEX Token:', ALEX_TOKEN_ID);
    console.log('Orbit Station:', ORBIT_STATION_ID);

    backendActor = await createBackendActor();
    console.log('✅ Connected to backend actor\n');
  });

  describe('List Accounts', () => {
    it('should fetch Alexandria treasury accounts', async () => {
      console.log('📋 Testing: list_orbit_accounts');
      const tokenId = Principal.fromText(ALEX_TOKEN_ID);

      try {
        // Make real mainnet call
        const result = await backendActor.list_orbit_accounts(
          tokenId,
          [], // search_term (empty = all accounts)
          [], // offset (empty = start at 0)
          []  // limit (empty = default limit)
        );

        // Log EVERYTHING for debugging
        logResponse('RAW RESPONSE', result);

        // Check response structure
        expect(result).toBeDefined();

        // Check if it's an Ok/Err variant
        if ('Ok' in result) {
          console.log('✅ Success response');
          console.log('Accounts found:', result.Ok.accounts?.length || 0);

          // Log each account's structure
          if (result.Ok.accounts) {
            result.Ok.accounts.forEach((account: any, i: number) => {
              console.log(`\n📦 Account ${i + 1}:`);
              console.log('  ID:', account.id);
              console.log('  Name:', account.name);
              console.log('  Assets:', account.assets?.length || 0);
              console.log('  Metadata items:', account.metadata?.length || 0);

              // Show asset details if present
              if (account.assets && account.assets.length > 0) {
                console.log('  Asset details:');
                account.assets.forEach((asset: any, j: number) => {
                  console.log(`    ${j + 1}. Asset ID:`, asset.asset_id);
                  if (asset.balance) {
                    console.log(`       Balance:`, asset.balance.balance?.toString());
                    console.log(`       Balance type:`, typeof asset.balance.balance);
                    console.log(`       Decimals:`, asset.balance.decimals);
                  }
                });
              }
            });
          }

          expect(result.Ok).toHaveProperty('accounts');
          expect(Array.isArray(result.Ok.accounts)).toBe(true);
        } else if ('Err' in result) {
          console.log('❌ Error response');

          // Error can be either a string or a structured object
          if (typeof result.Err === 'string') {
            console.log('Error (string):', result.Err);
          } else {
            console.log('Error code:', result.Err.code);
            console.log('Error message:', result.Err.message);
            console.log('Error details:', result.Err.details);
          }

          // Test passes - we just want to see the error structure
          expect(result.Err).toBeDefined();
        }
      } catch (error: any) {
        console.error('=== EXCEPTION THROWN ===');
        console.error('Type:', error.constructor.name);
        console.error('Message:', error.message);
        console.error('Full error:', error);

        // Fail test on exception
        throw error;
      }
    }, 60000); // 60s timeout for mainnet

    it('should handle invalid token ID gracefully', async () => {
      console.log('🧪 Testing: Invalid token ID handling');
      const invalidId = Principal.fromText('aaaaa-aa');

      try {
        const result = await backendActor.list_orbit_accounts(
          invalidId,
          [], [], []
        );

        logResponse('INVALID TOKEN RESPONSE', result);

        // Should get error response
        expect(result).toBeDefined();
        if ('Err' in result) {
          expect(result.Err).toBeTruthy();
          if (typeof result.Err === 'string') {
            console.log('✅ Got expected error (string):', result.Err.substring(0, 100));
          } else {
            console.log('✅ Got expected error:', result.Err.code);
          }
        } else {
          console.log('⚠️  Got success for invalid token (unexpected)');
        }
      } catch (error: any) {
        console.log('✅ Exception for invalid token:', error.message);
        // Exception is acceptable for invalid token
      }
    }, 30000);

    it('should handle search term filtering', async () => {
      console.log('🔍 Testing: Search term filtering');
      const tokenId = Principal.fromText(ALEX_TOKEN_ID);

      try {
        const result = await backendActor.list_orbit_accounts(
          tokenId,
          ['Treasury'], // search for "Treasury"
          [], []
        );

        logResponse('FILTERED RESPONSE', result);

        if ('Ok' in result) {
          console.log('Filtered accounts:', result.Ok.accounts?.length || 0);
          result.Ok.accounts?.forEach((account: any) => {
            console.log('  - Match:', account.name);
          });
        }
      } catch (error: any) {
        console.log('Search error:', error.message);
      }
    }, 30000);
  });

  describe('Get Available Assets', () => {
    it('should fetch available assets from Orbit Station', async () => {
      console.log('💎 Testing: get_available_assets');
      const tokenId = Principal.fromText(ALEX_TOKEN_ID);

      try {
        const result = await backendActor.get_available_assets(tokenId);

        logResponse('ASSETS RESPONSE', result);

        if ('Ok' in result) {
          console.log('✅ Assets fetched');
          console.log('Asset count:', result.Ok.assets?.length || 0);

          if (result.Ok.assets) {
            result.Ok.assets.forEach((asset: any, i: number) => {
              console.log(`\n💰 Asset ${i + 1}:`);
              console.log('  ID:', asset.id);
              console.log('  Symbol:', asset.symbol);
              console.log('  Name:', asset.name);
              console.log('  Decimals:', asset.decimals);
              console.log('  Blockchain:', asset.blockchain);
              console.log('  Standards:', asset.standards);

              if (asset.metadata && asset.metadata.length > 0) {
                console.log('  Metadata:');
                asset.metadata.forEach((meta: any) => {
                  console.log(`    ${meta.key}: ${meta.value}`);
                });
              }
            });
          }

          expect(result.Ok).toHaveProperty('assets');
          expect(Array.isArray(result.Ok.assets)).toBe(true);
        } else if ('Err' in result) {
          console.log('❌ Error fetching assets');
          console.log('Error:', result.Err);
          expect(result.Err).toHaveProperty('code');
        }
      } catch (error: any) {
        console.error('=== ASSETS EXCEPTION ===');
        console.error(error);
        throw error;
      }
    }, 60000);
  });

  describe('Account with Assets', () => {
    it('should fetch specific account with asset balances', async () => {
      console.log('🏦 Testing: get_account_with_assets');
      const tokenId = Principal.fromText(ALEX_TOKEN_ID);

      // First get accounts to find a valid account ID
      const accounts = await backendActor.list_orbit_accounts(
        tokenId, [], [], []
      );

      if ('Ok' in accounts && accounts.Ok.accounts?.length > 0) {
        const accountId = accounts.Ok.accounts[0].id;
        console.log('Testing with account:', accountId);

        try {
          const result = await backendActor.get_account_with_assets(
            tokenId,
            accountId
          );

          logResponse('ACCOUNT WITH ASSETS', result);

          if ('Ok' in result) {
            console.log('✅ Account details fetched');
            console.log('Account name:', result.Ok.account?.name);
            console.log('Assets in account:', result.Ok.assets?.length || 0);

            // Show detailed asset information
            if (result.Ok.assets) {
              result.Ok.assets.forEach((asset: any, i: number) => {
                console.log(`\n  Asset ${i + 1}:`);
                console.log('    Symbol:', asset.asset?.symbol);
                console.log('    Name:', asset.asset?.name);
                if (asset.balance) {
                  console.log('    Balance:', asset.balance.balance?.toString());
                  console.log('    Decimals:', asset.balance.decimals);
                  console.log('    Last update:', asset.balance.last_update_timestamp);
                }
              });
            }
          } else if ('Err' in result) {
            console.log('❌ Error fetching account details');
            console.log('Error:', result.Err);
          }
        } catch (error: any) {
          console.error('=== ACCOUNT DETAILS EXCEPTION ===');
          console.error(error);
          // Don't fail test - we got far enough to test the account listing
        }
      } else {
        console.log('⚠️  No accounts found to test with');
        console.log('This might indicate an issue with list_orbit_accounts');
      }
    }, 60000);
  });

  describe('Type Debugging', () => {
    it('should show exact BigInt handling', async () => {
      console.log('🔬 Testing: Type analysis and BigInt conversion');
      const tokenId = Principal.fromText(ALEX_TOKEN_ID);

      const result = await backendActor.list_orbit_accounts(
        tokenId, [], [], []
      );

      if ('Ok' in result && result.Ok.accounts?.[0]) {
        const account = result.Ok.accounts[0];

        console.log('\n=== TYPE ANALYSIS ===');
        console.log('Account ID type:', typeof account.id);
        console.log('Account ID value:', account.id);
        console.log('Account name type:', typeof account.name);

        if (account.assets?.[0]) {
          const asset = account.assets[0];
          console.log('\nAsset structure:');
          console.log('  asset_id type:', typeof asset.asset_id);
          console.log('  asset_id value:', asset.asset_id);

          if (asset.balance) {
            const balance = asset.balance.balance;
            console.log('\nBalance handling:');
            console.log('  Balance type:', typeof balance);
            console.log('  Balance value:', balance);
            console.log('  Is BigInt?', typeof balance === 'bigint');

            // Show conversion methods
            if (typeof balance === 'bigint') {
              console.log('  As Number:', Number(balance));
              console.log('  As String:', balance.toString());
              console.log('  As JSON (stringified):', serializeBigInt(balance));

              // Show potential issues
              const asNumber = Number(balance);
              if (asNumber === Infinity || asNumber !== Number(balance)) {
                console.log('  ⚠️  WARNING: BigInt too large for Number conversion!');
                console.log('  Use balance.toString() instead of Number(balance)');
              }
            }

            // Show decimals handling
            if (asset.balance.decimals) {
              console.log('\nDecimals:');
              console.log('  Type:', typeof asset.balance.decimals);
              console.log('  Value:', asset.balance.decimals);

              if (typeof balance === 'bigint') {
                const decimals = Number(asset.balance.decimals);
                const humanReadable = Number(balance) / Math.pow(10, decimals);
                console.log(`  Formatted: ${humanReadable} (balance / 10^${decimals})`);
              }
            }
          }
        }

        console.log('=== END TYPE ANALYSIS ===\n');
      } else {
        console.log('⚠️  No accounts available for type analysis');
      }
    }, 30000);

    it('should show response variant structure', async () => {
      console.log('📊 Testing: Candid variant structure');
      const tokenId = Principal.fromText(ALEX_TOKEN_ID);

      const result = await backendActor.list_orbit_accounts(
        tokenId, [], [], []
      );

      console.log('\n=== VARIANT STRUCTURE ===');
      console.log('Top-level keys:', Object.keys(result));
      console.log('Is Ok variant?', 'Ok' in result);
      console.log('Is Err variant?', 'Err' in result);

      if ('Ok' in result) {
        console.log('\nOk variant structure:');
        console.log('  Type:', typeof result.Ok);
        console.log('  Keys:', Object.keys(result.Ok));

        if (result.Ok.accounts) {
          console.log('  Accounts array length:', result.Ok.accounts.length);
          if (result.Ok.accounts[0]) {
            console.log('  First account keys:', Object.keys(result.Ok.accounts[0]));
          }
        }
      }

      console.log('=== END VARIANT STRUCTURE ===\n');
    }, 30000);
  });

  describe('Error Scenarios', () => {
    it('should show timeout behavior', async () => {
      console.log('⏱️  Testing: Timeout behavior');
      // This test helps understand what happens when calls take too long
      // Useful for debugging slow mainnet responses

      const tokenId = Principal.fromText(ALEX_TOKEN_ID);
      const startTime = Date.now();

      try {
        const result = await backendActor.list_orbit_accounts(
          tokenId, [], [], []
        );
        const duration = Date.now() - startTime;

        console.log(`✅ Call completed in ${duration}ms`);
        if (duration > 30000) {
          console.log('⚠️  Call took over 30 seconds - consider reducing timeout');
        }
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`❌ Call failed after ${duration}ms`);
        console.log('Error:', error.message);
      }
    }, 60000);

    it('should show network error handling', async () => {
      console.log('🌐 Testing: Network error structure');
      // Use invalid principal to trigger network-level error
      const invalidTokenId = Principal.fromText('2vxsx-fae'); // Management canister

      try {
        const result = await backendActor.list_orbit_accounts(
          invalidTokenId, [], [], []
        );

        logResponse('UNEXPECTED SUCCESS', result);
      } catch (error: any) {
        console.log('✅ Got expected network error');
        console.log('Error type:', error.constructor.name);
        console.log('Error message:', error.message);
        console.log('Error stack available?', !!error.stack);

        // This helps understand what errors look like from agent
        expect(error).toBeDefined();
      }
    }, 30000);
  });
});
