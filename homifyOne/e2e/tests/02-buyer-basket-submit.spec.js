const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('buyer adds a recommendation to the basket and submits selections', async ({ page }) => {
  await login(page, { email: 'buyer2@e2e.test', role: 'buyer' });

  await page.goto('/buyer/recommendations');
  await expect(page.getByText(/\d+ results/)).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Add to basket' }).first().click();
  await expect(page.getByRole('button', { name: '✓ In basket' }).first()).toBeVisible();

  await page.goto('/buyer/basket');

  const submitButton = page.getByRole('button', { name: 'Submit Selections for Approval' });
  await expect(submitButton).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await submitButton.click();

  await expect(page.getByText('Your order has been sent to the developer for approval')).toBeVisible({ timeout: 15_000 });
});
