import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';
const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456'; 
const ARTIFACTS_DIR = path.resolve('.artifacts/repro-bpm-my');

(async () => {
  if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const logFile = path.join(ARTIFACTS_DIR, 'console.log');
  fs.writeFileSync(logFile, '');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const errors = [];
  const consoleErrors = [];
  const failedRequests = [];

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    logStream.write(`[CONSOLE] ${msg.type()}: ${text}\n`);
    if (msg.type() === 'error') consoleErrors.push(text);
  });
  page.on('pageerror', err => {
    logStream.write(`[PAGEERROR] ${err.message}\n`);
    errors.push(err.message);
  });
  page.on('requestfailed', req => {
    const url = req.url();
    const errText = req.failure()?.errorText;
    logStream.write(`[REQUESTFAILED] ${url} ${errText}\n`);
    if (!url.includes('baidu.com')) {
      failedRequests.push(`${url} -> ${errText}`);
    }
  });

  let success = false;
  try {
    console.log(`Navigating to Login at ${BASE_URL}...`);
    await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle' });

    console.log('Checking for login fields...');
    const userField = page.locator('input[placeholder*="账号"], .ant-input[type="text"], input#username');
    const passField = page.locator('input[placeholder*="密码"], .ant-input[type="password"], input#password');
    
    await userField.first().waitFor({ state: 'visible', timeout: 5000 });
    await userField.first().fill(ADMIN_USER);
    await passField.first().fill(ADMIN_PASS);
    
    const captcha = page.locator('input[placeholder*="验证码"], input#captcha');
    if (await captcha.count() > 0 && await captcha.isVisible()) {
      await captcha.fill('1234');
    }

    console.log('Clicking login button...');
    const loginBtn = page.locator('button.ant-btn-primary, button[type="submit"], .login-button');
    await loginBtn.first().click();
    
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});

    console.log(`Navigating to /bpm/my...`);
    await page.goto(`${BASE_URL}/bpm/my`, { waitUntil: 'networkidle' });

    // Strong assertion: Wait for "我发起的流程" text OR .el-table
    const successMarker = page.locator('span:has-text("我发起的流程"), .el-table, .el-card__header');
    await successMarker.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('SUCCESS: Render verified (marker found).');
    success = true;

  } catch (e) {
    console.log(`FAILURE: Assertion failed or timeout. ${e.message}`);
    logStream.write(`[SCRIPT_ERROR] ${e.message}\n`);
  } finally {
    const title = await page.title().catch(() => 'N/A');
    const currentUrl = page.url();
    console.log(`Final URL: ${currentUrl}`);
    console.log(`Final Page Title: ${title}`);
    
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot.png'), fullPage: true });
    console.log('Screenshot saved.');

    console.log('\n--- ERROR SUMMARY ---');
    if (errors.length) console.log(`Page Errors (${errors.length}):\n  ${errors.slice(0, 3).join('\n  ')}`);
    if (consoleErrors.length) console.log(`Console Errors (${consoleErrors.length}):\n  ${consoleErrors.slice(0, 5).join('\n  ')}`);
    if (failedRequests.length) console.log(`Failed Requests (${failedRequests.length}):\n  ${failedRequests.slice(0, 5).join('\n  ')}`);
    if (!errors.length && !consoleErrors.length && !failedRequests.length) console.log('No obvious frontend errors captured.');
    console.log('----------------------\n');

    logStream.end();
    await browser.close();
    process.exit(success ? 0 : 1);
  }
})();