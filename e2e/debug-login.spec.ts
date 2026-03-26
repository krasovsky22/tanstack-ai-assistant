import { test, expect } from '@playwright/test';

test('debug login form submission', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[placeholder="username"]', 'e2e-test');
  await page.fill('input[type="password"]', 'e2etestpass123');

  // Listen for specific API call
  const apiPromise = page.waitForResponse(
    resp => resp.url().includes('/_server') || resp.url().includes('/login'),
    { timeout: 15000 }
  ).catch(e => { console.log('No API response:', e.message); return null; });

  await page.click('button[type="submit"]');

  const apiResponse = await apiPromise;
  if (apiResponse) {
    console.log('API response status:', apiResponse.status());
    console.log('API response URL:', apiResponse.url());
    try {
      const body = await apiResponse.json();
      console.log('API response body:', JSON.stringify(body));
    } catch (e) {
      console.log('Cannot parse response as JSON');
    }
  }

  await page.waitForTimeout(3000);
  console.log('Final URL:', page.url());
});
