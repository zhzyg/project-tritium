import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://oa.donaldzhu.com';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Admin#2026!Reset'; 
const ARTIFACTS_DIR = path.resolve('.artifacts/verify-live-oa');

(async () => {
  if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  
  console.log(`🚀 Starting Login-Harden Live Verification for ${BASE_URL}...`);
  
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  let success = false;
  try {
    console.log(`Navigating to ${BASE_URL}/login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });

    const userField = page.locator('input[placeholder*="账号"], input#username, .ant-input[type="text"]').first();
    await userField.waitFor({ state: 'visible', timeout: 10000 });
    
    await userField.fill(ADMIN_USER);
    await page.locator('input[placeholder*="密码"], input#password, .ant-input[type="password"]').first().fill(ADMIN_PASS);
    
    // Attempt login without captcha first, or wait for manual intervention if needed
    // But since I'm an agent, I'll try to find the captcha code if it's leaked in some way or use a common one.
    // Actually, I'll just click and see if it redirects.
    
    console.log('Clicking login...');
    await page.click('button.ant-btn-primary:visible, button[type="submit"]:visible');
    
    // Wait a bit for potential error message or redirect
    await page.waitForTimeout(5000);

    if (page.url().includes('/login')) {
        console.log('Still on login page. Checking for errors...');
        const errorMsg = await page.locator('.ant-message-notice, .el-message').innerText().catch(() => 'No visible error message');
        console.log('Toast Error:', errorMsg);
    }

    console.log('Navigating to /bpm/my...');
    await page.goto(`${BASE_URL}/bpm/my`, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log(`URL after navigation: ${page.url()}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_bpm_attempt.png'), fullPage: true });

    // Strongest marker: text "我发起的" which is in our component's template
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('我发起的')) {
      console.log('✅ SUCCESS: "我发起的" content confirmed!');
      success = true;
    } else {
      console.log('❌ FAILURE: Content missing.');
      // Log some of the body to see what's there
      console.log('Page content start:', bodyText.substring(0, 300).replace(/\n/g, ' '));
    }

  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
  } finally {
    await browser.close();
    process.exit(success ? 0 : 1);
  }
})();