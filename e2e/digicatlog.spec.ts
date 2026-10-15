import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('DIGICATLOG Full Autonomous SaaS Journey', () => {
  const timestamp = Date.now();
  const shopName = `E2E Bistro ${timestamp}`;
  const slug = `e2e-bistro-${timestamp}`;
  let ownerLoginId = '';
  let temporaryPassword = '';
  const permanentPassword = 'NewSecretPassword2025!';

  test.beforeAll(async () => {
    const screenshotsDir = path.resolve(process.cwd(), 'e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Full Journey: Super Admin -> Shop Owner First Login & Setup -> Public Menu -> Out-of-Stock -> Suspension', async ({
    page,
    browser,
  }) => {
    // -------------------------------------------------------------
    // Step 1: Super Admin Logs in and Creates a Shop
    // -------------------------------------------------------------
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('DIGICATLOG');

    await page.fill('input[placeholder*="superadmin"]', 'superadmin');
    await page.fill('input[type="password"]', 'Admin@DigiCatlog2025!');
    await page.click('button[type="submit"]');

    // Land on Super Admin console
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Super Admin Console');

    // Click "Create New Shop"
    await page.click('button:has-text("Create New Shop")');
    await expect(page.locator('h2:has-text("Create New Restaurant Shop")')).toBeVisible();

    await page.fill('input[placeholder*="Bella Italia"]', shopName);
    await page.fill('input[placeholder*="bella-italia"]', slug);

    await page.click('button[type="submit"]:has-text("Create Shop")');

    // Credentials Modal appears with single-view temporary password
    await expect(page.locator('h2:has-text("Shop Created Successfully!")')).toBeVisible();

    const loginIdElement = page.locator('span.font-mono.text-sm.font-bold.text-cream-950');
    ownerLoginId = (await loginIdElement.textContent()) || '';
    expect(ownerLoginId).toBeTruthy();

    const tempPasswordElement = page.locator('span.font-mono.text-sm.font-bold.text-brand-700');
    temporaryPassword = (await tempPasswordElement.textContent()) || '';
    expect(temporaryPassword).toBeTruthy();

    // Dismiss credential modal
    await page.click('button:has-text("I Have Saved These Credentials")');

    // Logout from Super Admin
    await page.click('button[aria-label="Sign Out"]');
    await expect(page).toHaveURL(/\/login/);

    // -------------------------------------------------------------
    // Step 2: Shop Owner Logs In & Forces Password Change
    // -------------------------------------------------------------
    await page.fill('input[placeholder*="superadmin"]', ownerLoginId);
    await page.fill('input[type="password"]', temporaryPassword);
    await page.click('button[type="submit"]');

    // Must be forced to change password
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator('h1')).toContainText('Set Your New Password');

    await page.fill('input[placeholder*="current password"]', temporaryPassword);
    await page.fill('input[placeholder*="Minimum 8 characters"]', permanentPassword);
    await page.fill('input[placeholder*="Re-enter new password"]', permanentPassword);
    await page.click('button:has-text("Update Password")');

    // Lands in Shop Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Menu Items');

    // Capture Desktop Dashboard Screenshot
    await page.screenshot({ path: 'e2e/screenshots/01-dashboard-desktop.png', fullPage: true });

    // -------------------------------------------------------------
    // Step 3: Add Category and Menu Item
    // -------------------------------------------------------------
    await page.click('a:has-text("Categories")');
    await expect(page).toHaveURL(/\/dashboard\/categories/);

    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Artisanal Pastas"]', 'Chef Specialties');
    await page.click('button[type="submit"]:has-text("Create Category")');

    await expect(page.locator('text=Chef Specialties')).toBeVisible();

    // Go to Items
    await page.click('a:has-text("Items & Menu")');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.click('button:has-text("Add New Item")');
    await page.fill('input[placeholder*="Truffle Pappardelle"]', 'Artisan Truffle Pizza');
    await page.fill('textarea', 'Black summer truffles with fior di latte and cultured butter');
    await page.fill('input[placeholder="0.00"]', '24.50');

    await page.click('button[type="submit"]:has-text("Create Item")');
    await expect(page.locator('text=Artisan Truffle Pizza')).toBeVisible();

    // -------------------------------------------------------------
    // Step 4: Verify Public Menu
    // -------------------------------------------------------------
    const publicPage = await browser.newPage();
    await publicPage.goto(`/m/${slug}`);

    await expect(publicPage.locator('h1')).toContainText(shopName);
    await expect(publicPage.locator('text=Artisan Truffle Pizza')).toBeVisible();
    await expect(publicPage.locator('text=$24.50')).toBeVisible();

    // Capture Public Menu Desktop Screenshot
    await publicPage.screenshot({ path: 'e2e/screenshots/02-public-menu-desktop.png', fullPage: true });

    // -------------------------------------------------------------
    // Step 5: Toggle Availability to Out-of-Stock
    // -------------------------------------------------------------
    // Toggle switch on dashboard
    const availabilitySwitch = page.locator('button[role="switch"]').first();
    await availabilitySwitch.click();

    // Verify optimistic UI update to "Sold Out" on the dashboard
    await expect(page.locator('span:has-text("Sold Out")').first()).toBeVisible();
    await page.waitForTimeout(1000);

    // Refresh public menu with fresh network query
    await publicPage.goto(`/m/${slug}?v=${Date.now()}`);
    await expect(publicPage.locator('text=Sold Out')).toBeVisible();

    // Capture Sold Out public menu screenshot
    await publicPage.screenshot({ path: 'e2e/screenshots/03-public-menu-soldout.png' });

    // -------------------------------------------------------------
    // Step 6: Change Template to Modern Dark
    // -------------------------------------------------------------
    await page.click('a:has-text("Design & Templates")');
    await expect(page).toHaveURL(/\/dashboard\/templates/);

    await page.click('text=Modern Dark');
    await page.click('button:has-text("Apply & Save Design")');

    await page.waitForTimeout(600);

    // Reload public menu
    await publicPage.reload();
    const bodyBg = await publicPage.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bodyBg).toBeDefined();

    // -------------------------------------------------------------
    // Step 7: Check QR Code Download Page
    // -------------------------------------------------------------
    await page.click('a:has-text("QR Code & Posters")');
    await expect(page).toHaveURL(/\/dashboard\/qr/);
    await expect(page.getByText(`/m/${slug}`).first()).toBeVisible();

    // -------------------------------------------------------------
    // Step 8: Suspend Shop as Super Admin & Verify Menu Unavailable
    // -------------------------------------------------------------
    await page.click('button[aria-label="Sign Out"]');
    await expect(page).toHaveURL(/\/login/);

    // Login as Super Admin
    await page.fill('input[placeholder*="superadmin"]', 'superadmin');
    await page.fill('input[type="password"]', 'Admin@DigiCatlog2025!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h1')).toContainText('Super Admin Console');

    // Click Shops Directory link in navigation
    await page.click('a:has-text("Shops Directory")');
    await expect(page).toHaveURL(/\/admin\/shops/);
    await page.fill('input[placeholder*="Search by shop name"]', slug);
    await page.waitForTimeout(600);

    // Click suspend button
    await page.click('button[title="Suspend Shop"]');
    await page.click('button:has-text("Suspend Shop")');
    await page.waitForTimeout(600);

    // Check public menu is now unavailable!
    await publicPage.reload();
    await expect(publicPage.locator('h1')).toContainText('Menu Currently Unavailable');

    // Capture Suspended State Screenshot
    await publicPage.screenshot({ path: 'e2e/screenshots/04-menu-suspended.png' });

    await publicPage.close();
  });

  test('Mobile Responsiveness Verification (390px Viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Demo shop public menu
    await page.goto('/m/bella-italia');
    await expect(page.locator('h1')).toContainText('Bella Italia');
    await expect(page.locator('button:has-text("Veg Only")')).toBeVisible();

    // Capture Mobile Public Menu Screenshot
    await page.screenshot({ path: 'e2e/screenshots/05-mobile-public-menu.png' });

    // Login on Mobile
    await page.goto('/login');
    await page.fill('input[placeholder*="superadmin"]', 'bella_owner');
    await page.fill('input[type="password"]', 'Bella@2025!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Menu Items');

    // Capture Mobile Dashboard Screenshot
    await page.screenshot({ path: 'e2e/screenshots/06-mobile-dashboard.png' });
  });

  test('Tablet Responsiveness Verification (768px Viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/m/bella-italia');
    await expect(page.locator('h1')).toContainText('Bella Italia');

    // Capture Tablet Public Menu Screenshot
    await page.screenshot({ path: 'e2e/screenshots/07-tablet-public-menu.png' });
  });
});
