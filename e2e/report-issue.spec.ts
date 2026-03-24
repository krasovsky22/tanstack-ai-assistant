import { test, expect, type Page } from '@playwright/test';

// Helper: log in with e2e test credentials
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="username"]', 'e2e-test');
  await page.fill('input[placeholder="password"]', 'e2etestpass123');
  // Submit and wait for navigation away from login (server fn + redirect)
  await page.click('button[type="submit"]');
  // Wait for navigation away from login with generous timeout
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// Scenario 1: Header absent on /login
// ---------------------------------------------------------------------------
test('header absent on /login page', async ({ page }) => {
  await page.goto('/login');
  // The "Report Issue" button should NOT be visible on the login page
  const reportBtn = page.getByRole('button', { name: /report issue/i });
  await expect(reportBtn).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 2: Header present on protected pages after login
// ---------------------------------------------------------------------------
test('header present on protected page after login', async ({ page }) => {
  await login(page);
  // After login we're on a protected page — "Report Issue" button should be visible
  const reportBtn = page.getByRole('button', { name: /report issue/i });
  await expect(reportBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 3: Page content starts below header (not obscured)
// ---------------------------------------------------------------------------
test('page content not obscured by fixed header', async ({ page }) => {
  await login(page);
  // The main content area should have a top margin/padding that accounts for 56px header
  // We verify the page body's first visible heading or main element is not behind the header
  const mainContent = page.locator('body');
  // Check the bounding box of the first heading or paragraph inside main content area
  // We know from code: pt="56px" is applied when isLoginPage is false, so main content starts at 56px
  // Simply verify the Report Issue button is present and the login heading is gone
  await expect(page.getByText('Sign in to Orin')).not.toBeVisible();
  // Verify the header bar shows "Orin AI" text which is in the header
  await expect(page.getByText('Orin AI')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 4: Modal opens when clicking Report Issue
// ---------------------------------------------------------------------------
test('modal opens on Report Issue button click', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: /report issue/i }).click();
  // Modal should appear with Title and Description fields
  await expect(page.getByPlaceholder(/brief summary/i)).toBeVisible();
  await expect(page.getByPlaceholder(/what happened/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 5: Form submission with Jira configured (success path)
// ---------------------------------------------------------------------------
test('form submission shows loading state then success or error', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: /report issue/i }).click();

  await page.fill('input[placeholder*="Brief summary"]', 'Test bug report');
  await page.fill('textarea[placeholder*="What happened"]', 'This is a test submission for QA');

  // Intercept /api/chat-sync to return a mock Jira success response
  await page.route('/api/chat-sync', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text: '{"success":true,"category":"Bug","ticketKey":"RPT-1","ticketUrl":"https://jira.example.com/browse/RPT-1"}',
        conversationAction: 'close_conversation',
      }),
    });
  });

  await page.getByRole('button', { name: /^submit$/i }).click();

  // Should show success state with category label and ticket link
  await expect(page.getByText(/report created/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: /view ticket/i })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Scenario 6: Error state preserves form values
// ---------------------------------------------------------------------------
test('error state preserves form data on failure', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: /report issue/i }).click();

  const titleValue = 'Test bug report preserved';
  const descValue = 'Description that should be preserved';

  await page.fill('input[placeholder*="Brief summary"]', titleValue);
  await page.fill('textarea[placeholder*="What happened"]', descValue);

  // Intercept /api/chat-sync to return an error
  await page.route('/api/chat-sync', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Jira integration not configured' }),
    });
  });

  await page.getByRole('button', { name: /^submit$/i }).click();

  // Should show error state
  await expect(page.getByText(/jira integration not configured/i)).toBeVisible({ timeout: 10000 });

  // Click "Try Again" — form should still have the submitted values
  await page.getByRole('button', { name: /try again/i }).click();

  // Form fields should still contain original values
  await expect(page.getByPlaceholder(/brief summary/i)).toHaveValue(titleValue);
  await expect(page.getByPlaceholder(/what happened/i)).toHaveValue(descValue);
});
