import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';
const ROUTE = process.env.ROUTE || '/bpm/my';
const MARKER_TEXT = process.env.MARKER_TEXT || '';
const MARKER_SELECTOR = process.env.MARKER_SELECTOR || '.el-table, .el-card__header';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456'; 
const ARTIFACTS_BASE = path.resolve('.artifacts/repro-bpm-suite');
const ROUTE_SLUG = ROUTE.replace(/\//g, '_').replace(/^_/, '');
const ARTIFACTS_DIR = path.join(ARTIFACTS_BASE, ROUTE_SLUG);

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
    console.log(`[${ROUTE}] Navigating to Login at ${BASE_URL}...`);
    await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const userField = page.locator('input[placeholder*="账号"], .ant-input[type="text"], input#username').first();
    await userField.waitFor({ state: 'visible', timeout: 5000 });
    await userField.fill(ADMIN_USER);
    await page.locator('input[placeholder*="密码"], .ant-input[type="password"], input#password').first().fill(ADMIN_PASS);
    
    const captcha = page.locator('input[placeholder="验证码"]:visible, input#captcha:visible').first();
    if (await captcha.count() > 0) {
      await captcha.fill('1234');
    }

    await page.click('button.ant-btn-primary:visible, button[type="submit"]:visible, .login-button:visible');
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});

    console.log(`[${ROUTE}] Navigating to ${ROUTE}...`);
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle', timeout: 15000 });

    // Strong assertion
    let successMarker;
    if (MARKER_TEXT) {
      successMarker = page.locator(`span:has-text("${MARKER_TEXT}"), div:has-text("${MARKER_TEXT}"), :text("${MARKER_TEXT}")`);
    } else {
      successMarker = page.locator(MARKER_SELECTOR);
    }
    
    await successMarker.first().waitFor({ state: 'visible', timeout: 10000 });
    
    console.log(`[${ROUTE}] SUCCESS: Render verified.`);
    success = true;

  } catch (e) {
    console.log(`[${ROUTE}] FAILURE: ${e.message}`);
    logStream.write(`[SCRIPT_ERROR] ${e.message}\n`);
  } finally {
    try {
      const title = await page.title().catch(() => 'N/A');
      const currentUrl = page.url();
      logStream.write(`Final URL: ${currentUrl}\nFinal Page Title: ${title}\n`);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot.png'), fullPage: true, timeout: 5000 }).catch(() => {});
    } catch (ssErr) {}

    if (!success) {
      console.log(`[${ROUTE}] --- ERROR SUMMARY ---`);
      if (errors.length) console.log(`  Page Errors (${errors.length}): ${errors[0]}`);
      if (consoleErrors.length) console.log(`  Console Errors (${consoleErrors.length}): ${consoleErrors[0]}`);
      if (failedRequests.length) console.log(`  Failed Requests (${failedRequests.length}): ${failedRequests[0]}`);
      console.log('----------------------');
    }

    logStream.end();
    await browser.close();
    process.exit(success ? 0 : 1);
  }
})();
