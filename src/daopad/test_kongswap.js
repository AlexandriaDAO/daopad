const { HttpAgent, Actor } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');

const KONGSWAP_BACKEND_ID = '2ipq2-uqaaa-aaaar-qailq-cai';
const TEST_CANISTER = 'l5kzh-uqaaa-aaaal-qjuta-cai'; // A known lock canister

const kongSwapIdl = ({ IDL }) => {
  // Try the simplest version first - just return raw data
  return IDL.Service({
    'user_balances': IDL.Func([IDL.Text], [IDL.Unknown], ['query']),
  });
};

async function test() {
  const host = 'https://icp0.io';
  const agent = new HttpAgent({ host });
  
  const actor = Actor.createActor(kongSwapIdl, {
    agent,
    canisterId: KONGSWAP_BACKEND_ID,
  });

  try {
    const result = await actor.user_balances(TEST_CANISTER);
    console.log('Raw result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
