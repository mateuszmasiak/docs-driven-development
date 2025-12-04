import { test, expect } from '@playwright/test';

test.describe('Demo feature @feat-demo-example', () => {
  test('should load homepage @AC1', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toBeVisible();
  });
  
  test('should have working navigation @AC2', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/.*about/);
  });
});
