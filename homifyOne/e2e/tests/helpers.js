const ROLE_REDIRECTS = {
  buyer: '/buyer/dashboard',
  developer: '/developer/dashboard',
  supplier: '/supplier/dashboard',
  admin: '/admin/dashboard',
};

const PASSWORDS = {
  admin: process.env.E2E_ADMIN_PASSWORD || 'Test1234!',
  developer: process.env.E2E_DEVELOPER_PASSWORD || 'Test1234!',
  buyer: process.env.E2E_BUYER_PASSWORD || 'Test1234!',
  supplier: process.env.E2E_SUPPLIER_PASSWORD || process.env.E2E_BUYER_PASSWORD || 'Test1234!',
};


async function login(page, { email, role }) {
  await page.goto('/login');

  if (role !== 'buyer') {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    await page.getByRole('button', { name: roleLabel }).click();
  }

  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(PASSWORDS[role]);
  await page.getByRole('button', { name: 'Sign in to HomifyOne' }).click();

  await page.waitForURL(`**${ROLE_REDIRECTS[role]}`, { timeout: 15_000 });
}

async function answerStepGenerically(page) {
  const options = page.locator('button[aria-pressed="false"]');
  await options.first().click();

  const nextButton = page.getByRole('button', { name: 'Next →' });
  if (await nextButton.isDisabled()) {
    await page.locator('button[aria-pressed="false"]').first().click();
  }

  await nextButton.click();
}

module.exports = { login, answerStepGenerically, PASSWORDS };
