const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('supplier acknowledges a pending purchase order', async ({ page }) => {
  await login(page, { email: 'supplier@e2e.test', role: 'supplier' });

  await page.goto('/supplier/purchase-orders');

  await page.getByRole('button', { name: 'View' }).first().click();
  await page.waitForURL('**/supplier/purchase-orders/**');

  const acknowledgeButton = page.getByRole('button', { name: 'Acknowledge Order' });
  await expect(acknowledgeButton).toBeVisible({ timeout: 15_000 });
  await acknowledgeButton.click();

  await expect(page.getByRole('button', { name: 'Mark as Sent' })).toBeVisible({ timeout: 15_000 });
});
