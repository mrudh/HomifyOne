const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('developer reviews and approves a submitted order', async ({ page }) => {
  await login(page, { email: 'developer@e2e.test', role: 'developer' });

  await page.goto('/developer/orders');

  const row = page.locator('div.rounded-2xl', { hasText: 'E2E Buyer Three' });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: 'View Order →' }).click();

  await page.waitForURL('**/developer/orders/**');

  const approveButton = page.getByRole('button', { name: 'Approve' });
  await expect(approveButton).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await approveButton.click();

  await page.waitForURL('**/developer/orders');
  await expect(page.getByText('E2E Buyer Three')).not.toBeVisible({ timeout: 15_000 });
});
