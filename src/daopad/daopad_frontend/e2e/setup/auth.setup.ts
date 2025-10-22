import { test as setup } from '@playwright/test';
import { setupAuthentication } from '../helpers/auth';

setup('authenticate', async ({ page }) => {
  await setupAuthentication(page);
});
