import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || 'Admin#2026!Reset';

const ARTIFACTS_DIR = path.resolve('.artifacts/repro-form-runtime');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  let context;
  if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
    console.log(`Using storage state from: ${OA_STORAGE_STATE}`);
    context = await browser.newContext({ storageState: OA_STORAGE_STATE });
  } else {
    console.log(`No storage state found. Attempting auto-login.`);
    context = await browser.newContext();
  }

  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    if (page.url().includes('/login')) {
        console.log('Filling login form...');
        await page.fill('input[placeholder*="账号"], input[id*="account"], input[name*="username"]', ADMIN_USER);
        await page.fill('input[placeholder*="密码"], input[id*="password"], input[name*="password"]', ADMIN_PASS);
        
        // Try filling captcha if present (dummy value for admin bypass)
        try {
            const captchaInput = page.locator('input[placeholder*="验证码"], input[id*="inputCode"]');
            if (await captchaInput.isVisible()) {
                await captchaInput.fill('1234');
            }
        } catch (e) {}

        await page.click('button[type="submit"], button:has-text("登录"), .ant-btn-primary');
        await page.waitForTimeout(3000);
    }

    console.log('Checking for "App Runtime" menu...');
    // We might need to wait for the menu to load
    await page.waitForSelector('.ant-menu', { timeout: 10000 });

    const runtimeMenu = page.locator('.ant-menu-submenu-title, .ant-menu-item').filter({ hasText: /App Runtime|应用运行/ });
    if (await runtimeMenu.count() === 0) {
        throw new Error('Parent menu "App Runtime" not found in sidebar.');
    }
    console.log('Parent menu found.');
    
    // We don't necessarily have a formKey to test here unless we create one, 
    // but we can check if the parent menu is expandable.
    await runtimeMenu.first().click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sidebar.png') });
    console.log('Sidebar screenshot saved.');

  } catch (e) {
    console.error(`FAILURE: ${e.message}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();