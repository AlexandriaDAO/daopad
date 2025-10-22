import { Page } from '@playwright/test';

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  response: unknown;
  timestamp: number;
}

export interface OrbitAsset {
  symbol?: string;
  balance?: string | number;
  decimals?: number;
  metadata?: Record<string, unknown>;
}

export interface OrbitAccount {
  name: string;
  blockchain?: string;
  balance?: {
    value: string;
    decimals: number;
  };
  assets?: OrbitAsset[];
}

export interface OrbitListAccountsResponse {
  accounts: OrbitAccount[];
  privileges?: unknown[];
  next_offset?: number;
}

export interface OrbitResponse {
  Ok?: OrbitListAccountsResponse;
  Err?: string;
  accounts?: OrbitAccount[];
}

export interface ReduxAction {
  type: string;
  payload?: unknown;
  timestamp: number;
}

export interface TreasuryTestState {
  networkRequests: NetworkRequest[];
  consoleErrors: string[];
  orbitResponse: OrbitResponse | null;
}

export const BACKEND_CANISTER = process.env.VITE_BACKEND_CANISTER_ID || 'lwsav-iiaaa-aaaap-qp2qq-cai';
export const TEST_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai'; // ALEX token

/**
 * Setup comprehensive test instrumentation
 * Captures: network requests, console errors, Redux actions
 */
export async function setupTreasuryTestMonitoring(
  page: Page,
  testState: TreasuryTestState
): Promise<void> {
  // Network request capture
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(BACKEND_CANISTER) || url.includes('ic0.app/api') || url.includes('icp0.io')) {
      try {
        const responseText = await response.text();
        const parsed = tryParseJSON(responseText);

        testState.networkRequests.push({
          url,
          method: extractMethod(url),
          status: response.status(),
          response: parsed,
          timestamp: Date.now()
        });

        if (url.includes('list_orbit_accounts') || url.includes('listDashboardAssets')) {
          testState.orbitResponse = parsed as OrbitResponse;
          console.log('[Test] Captured Orbit response');
        }
      } catch (e) {
        // Binary response, skip
      }
    }
  });

  // Console error capture
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      testState.consoleErrors.push(errorText);
      console.error('[Browser Console Error]:', errorText);
    }
  });

  // Redux action spy
  await page.addInitScript(() => {
    (window as any).__REDUX_ACTIONS__ = [];

    const pollForStore = setInterval(() => {
      const store = (window as any).store;
      if (store?.dispatch) {
        const originalDispatch = store.dispatch;
        store.dispatch = function(action: any) {
          (window as any).__REDUX_ACTIONS__.push({
            type: action.type,
            payload: action.payload,
            timestamp: Date.now()
          });
          return originalDispatch.apply(this, arguments);
        };
        clearInterval(pollForStore);
      }
    }, 50);
  });
}

/**
 * Navigate to treasury tab and wait for it to load
 * Replaces repetitive navigation boilerplate
 */
export async function navigateToTreasury(page: Page, tokenId: string = TEST_TOKEN_ID): Promise<void> {
  await page.goto(`/dao/${tokenId}`);
  await page.waitForLoadState('networkidle');

  // Wait for tab to be clickable
  await page.waitForSelector('[data-testid="treasury-tab"]', {
    state: 'visible',
    timeout: 10000
  });

  await page.click('[data-testid="treasury-tab"]');

  // Wait for treasury overview to appear
  await page.waitForSelector('[data-testid="treasury-overview"]', {
    timeout: 30000
  });
}

/**
 * Wait for Orbit API response with timeout
 */
export async function waitForOrbitResponse(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  await page.waitForResponse(
    response => (
      (response.url().includes('list_orbit_accounts') ||
       response.url().includes('listDashboardAssets')) &&
      response.status() === 200
    ),
    { timeout }
  );
}

export function extractMethod(url: string): string {
  if (url.includes('list_orbit_accounts')) return 'list_orbit_accounts';
  if (url.includes('listDashboardAssets')) return 'listDashboardAssets';
  if (url.includes('query')) return 'query';
  if (url.includes('call')) return 'call';
  return 'unknown';
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.substring(0, 200) };
  }
}
