import { Page } from '@playwright/test';

/**
 * Extract canister method from IC request URL
 * IC URLs encode the method in the request body, not URL
 * This is a best-effort heuristic parser
 */
export function parseIcMethod(url: string): string {
  // Common DAOPad backend methods
  if (url.includes('list_orbit_accounts')) return 'list_orbit_accounts';
  if (url.includes('list_station_assets')) return 'list_station_assets';
  if (url.includes('get_available_assets')) return 'get_available_assets';
  if (url.includes('list_dashboard_assets')) return 'list_dashboard_assets';

  // Generic IC call endpoint
  if (url.includes('/call')) return 'ic_canister_call';
  if (url.includes('/query')) return 'ic_canister_query';

  return 'unknown_method';
}

/**
 * Parse and validate IC canister response
 */
export function parseIcResponse(responseText: string): any {
  try {
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (e) {
    // Not JSON - could be binary candid
    return null;
  }
}

/**
 * Wait for Redux action to be dispatched
 */
export async function waitForReduxAction(
  page: Page,
  actionType: string,
  timeout: number = 10000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const actions = await page.evaluate(() =>
      (window as any).__REDUX_ACTIONS__
    );

    const found = actions?.find((a: any) => a.type.includes(actionType));
    if (found) return found;

    await page.waitForTimeout(100);
  }

  throw new Error(`Redux action ${actionType} not found within ${timeout}ms`);
}

/**
 * Get current Redux state
 */
export async function getReduxState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const store = (window as any).store;
    return store?.getState();
  });
}

/**
 * Get all dispatched Redux actions
 */
export async function getReduxActions(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    return (window as any).__REDUX_ACTIONS__ || [];
  });
}

/**
 * Check if a specific Redux action was dispatched
 */
export async function hasReduxAction(
  page: Page,
  actionTypePattern: string
): Promise<boolean> {
  const actions = await getReduxActions(page);
  return actions.some((a: any) => a.type.includes(actionTypePattern));
}

/**
 * Wait for network request matching pattern
 */
export async function waitForNetworkRequest(
  page: Page,
  urlPattern: string,
  timeout: number = 10000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`No network request matching '${urlPattern}' within ${timeout}ms`));
    }, timeout);

    page.on('response', async (response) => {
      if (response.url().includes(urlPattern)) {
        clearTimeout(timeoutId);
        const data = await response.text().catch(() => null);
        resolve({
          url: response.url(),
          status: response.status(),
          response: data
        });
      }
    });
  });
}

/**
 * Extract method name from IC URL or request body
 * More robust version that handles various IC URL formats
 */
export function extractMethodFromUrl(url: string): string {
  // Try to find method name in URL path or query params
  const methodPatterns = [
    'list_orbit_accounts',
    'list_station_assets',
    'get_available_assets',
    'list_dashboard_assets',
    'fetchDashboard',
    'create_request',
    'list_requests'
  ];

  for (const pattern of methodPatterns) {
    if (url.includes(pattern)) {
      return pattern;
    }
  }

  // Check if it's a generic IC canister call
  if (url.includes('/api/v2/canister/') && url.includes('/call')) {
    return 'ic_canister_update_call';
  }

  if (url.includes('/api/v2/canister/') && url.includes('/query')) {
    return 'ic_canister_query_call';
  }

  return 'unknown_ic_method';
}
