/**
 * Mainnet testing utilities
 *
 * Usage in browser console:
 * ```javascript
 * window.testTransferFlow()
 * ```
 */

export const testTransferFlow = async () => {
  console.log('🧪 Starting Transfer Flow Test');

  // Check if user is authenticated
  const identity = window.__IDENTITY__;
  if (!identity) {
    console.error('❌ Not authenticated');
    return { success: false, error: 'Not authenticated' };
  }

  console.log('✅ User authenticated');

  // Get current token from Redux store
  const state = window.__REDUX_STORE__?.getState();
  const currentToken = state?.tokens?.currentToken;

  if (!currentToken) {
    console.error('❌ No token selected');
    return { success: false, error: 'No token selected' };
  }

  console.log('✅ Token:', currentToken);

  // Get accounts from Redux
  const accounts = state?.orbit?.accounts?.data?.[currentToken?.stationId];

  if (!accounts || accounts.length === 0) {
    console.error('❌ No accounts found');
    return { success: false, error: 'No accounts found' };
  }

  console.log(`✅ Found ${accounts.length} accounts`);

  // Check first account has assets
  const firstAccount = accounts[0];
  console.log('First account:', firstAccount);

  if (!firstAccount.assets || firstAccount.assets.length === 0) {
    console.error('❌ First account has no assets');
    return { success: false, error: 'First account has no assets' };
  }

  console.log(`✅ First account has ${firstAccount.assets.length} assets`);

  // Validate asset structure
  const firstAsset = firstAccount.assets[0];
  const requiredFields = ['id', 'symbol', 'decimals'];
  const missingFields = requiredFields.filter(field => !firstAsset[field]);

  if (missingFields.length > 0) {
    console.error('❌ Asset missing fields:', missingFields);
    return { success: false, error: `Asset missing: ${missingFields.join(', ')}` };
  }

  console.log('✅ Asset has all required fields');

  // Check voting power
  const votingPower = state?.user?.votingPower?.[currentToken.id] || 0;
  console.log('User voting power:', votingPower);

  if (votingPower < 10000) {
    console.warn('⚠️ Low voting power:', votingPower, '(need 10,000 to create proposals)');
  } else {
    console.log('✅ Sufficient voting power');
  }

  return {
    success: true,
    data: {
      token: currentToken,
      accounts: accounts.length,
      firstAccount: {
        id: firstAccount.id,
        name: firstAccount.name,
        assets: firstAccount.assets.length
      },
      firstAsset: {
        id: firstAsset.id,
        symbol: firstAsset.symbol,
        decimals: firstAsset.decimals
      },
      votingPower
    }
  };
};

// Expose to window for console testing
if (typeof window !== 'undefined') {
  window.testTransferFlow = testTransferFlow;
}
