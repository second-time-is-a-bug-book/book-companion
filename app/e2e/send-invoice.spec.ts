// What the user sees: can a freelancer fill in the form and
// send an invoice? Unit tests cannot catch a button that CSS
// has hidden; this test can (drill D13).
import { expect, test } from '@playwright/test';

test('a freelancer can send an invoice', async ({ page }) => {
  await page.goto('/');
  const client = page.getByLabel('Client');
  await expect(client).toContainText('Demo client');
  await page.getByLabel('Description').fill('Logo design');
  await page.getByLabel('Quantity').fill('2');
  await page.getByLabel('Unit price').fill('450.00');

  // includeHidden: a button that CSS hides should fail as
  // "hidden", not as "not found".
  const send = page.getByRole('button', {
    name: 'Send invoice',
    includeHidden: true,
  });
  await expect(send).toBeVisible();
  await send.click();

  const status = page.getByRole('status');
  await expect(status).toHaveText(
    /^Invoice INV-\d{4} sent\. Total 1080\.00$/,
  );
});
