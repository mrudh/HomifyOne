const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('admin creates a new product', async ({ page }) => {
  await login(page, { email: 'admin@e2e.test', role: 'admin' });

  await page.goto('/admin/products');

  await page.getByRole('button', { name: '+ New Product' }).click();

  const productName = `E2E Test Product ${Date.now()}`;
  await page.getByPlaceholder('Product name').fill(productName);
  await page.getByPlaceholder('Category', { exact: true }).fill('Kitchen');
  await page.getByPlaceholder('Sub-category').fill('Worktop');
  await page.getByPlaceholder('Room (e.g. Kitchen)').fill('Kitchen');

  await page.locator('select').filter({ has: page.getByRole('option', { name: 'Select style…' }) }).selectOption({ label: 'modern' });

  await page.locator('select').filter({ has: page.getByRole('option', { name: 'Select supplier…' }) }).selectOption({ label: 'E2E Supplier' });

  await page.getByRole('button', { name: 'Save Product' }).click();

  await expect(page.getByText(productName)).toBeVisible({ timeout: 15_000 });
});
