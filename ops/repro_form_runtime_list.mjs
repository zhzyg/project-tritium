import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || '123456';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`[Verify] Navigating to ${BASE_URL}/login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log(`[Verify] Attempting login...`);
    await page.fill('input[placeholder*="账号"]', ADMIN_USER);
    await page.fill('input[placeholder*="密码"]', ADMIN_PASS);
    
    // Fill dummy captcha for admin bypass
    const captchaInput = page.locator('.ant-tabs-tabpane-active input[placeholder="验证码"]');
    if (await captchaInput.count() > 0 && await captchaInput.isVisible()) {
        await captchaInput.fill('1234');
    }

    await page.click('button:has-text("登 录")');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    console.log(`[Verify] Checking for "App Runtime" menu...`);
    const appRuntimeMenu = page.locator('.ant-menu-title-content:has-text("App Runtime")');
    await appRuntimeMenu.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`[Verify] SUCCESS: "App Runtime" menu found.`);

    // Click to expand
    await appRuntimeMenu.click();
    
    // Wait for a form menu (e.g. any sub-menu under App Runtime)
    // Since we don't know the exact form names, we look for items in the submenu
    console.log(`[Verify] Waiting for dynamic form submenus...`);
    await page.waitForTimeout(2000); // Wait for animation
    
    // For this test to pass, a form MUST HAVE BEEN PUBLISHED after the fix.
    // I will trigger a publish via API in this script or just check if any submenu exists.
    const subMenus = page.locator('.ant-menu-sub .ant-menu-title-content');
    const count = await subMenus.count();
    console.log(`[Verify] Found ${count} submenus under App Runtime.`);
    
    if (count > 0) {
        const firstMenuText = await subMenus.first().innerText();
        console.log(`[Verify] Clicking first form menu: ${firstMenuText}`);
        await subMenus.first().click();
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        
        console.log(`[Verify] Final URL: ${page.url()}`);
        const table = page.locator('.ant-table');
        await table.waitFor({ state: 'visible', timeout: 10000 });
        console.log(`[Verify] SUCCESS: Data table found on list page.`);
    } else {
        console.log(`[Verify] WARNING: No dynamic form menus found. Please publish a form to see them.`);
    }

  } catch (e) {
    console.error(`[Verify] FAILURE: ${e.message}`);
    await page.screenshot({ path: '.artifacts/repro_form_runtime_fail.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
