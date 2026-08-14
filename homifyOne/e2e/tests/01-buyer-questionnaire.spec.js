const { test, expect } = require('@playwright/test');
const { login, answerStepGenerically } = require('./helpers');

test('buyer completes the questionnaire and sees recommendations', async ({ page }) => {
  await login(page, { email: 'buyer1@e2e.test', role: 'buyer' });

  await page.goto('/buyer/questionnaire');

  await page.getByRole('button', { name: "Let's get started →" }).click();

  for (let i = 0; i < 7; i++) {
    await answerStepGenerically(page);
  }


  const submitButton = page.getByRole('button', { name: 'See My Recommendations →' });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  const continueButton = page.getByRole('button', { name: 'See My Personalised Recommendations →' });
  await expect(continueButton).toBeVisible({ timeout: 20_000 });
  await continueButton.click();

  await page.waitForURL('**/buyer/recommendations');

  await expect(page.getByText(/\d+ results/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Add to basket' }).first()).toBeVisible();
});
