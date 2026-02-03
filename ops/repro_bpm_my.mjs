import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';
const ROUTE = process.env.ROUTE || '/bpm/my';
const MARKER_TEXT = process.env.MARKER_TEXT || '';
const MARKER_SELECTOR = process.env.MARKER_SELECTOR || '.el-table, .el-card__header';

const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || '123456'; 
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
    // Mask password in logs
    const safeText = text.replace(new RegExp(ADMIN_PASS, 'g'), '***');
    logStream.write(`[CONSOLE] ${msg.type()}: ${safeText}\n`);
    if (msg.type() === 'error') consoleErrors.push(safeText);
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
    const loginUrl = (await page.url()).includes('/login') ? await page.url() : `${BASE_URL}/login`;
    // Also try /user/login if /login is not the right one, usually base/login works or redirects
    console.log(`[${ROUTE}] Navigating to login...`);
    await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle', timeout: 20000 });
    
    console.log(`[${ROUTE}] Attempting login...`);
    await page.fill('input[placeholder*="账号"], input[id*="account"], input[name*="username"]', ADMIN_USER);
    await page.fill('input[placeholder*="密码"], input[id*="password"], input[name*="password"]', ADMIN_PASS);
    
    await page.click('button[type="submit"], button:has-text("登录"), .ant-btn-primary');
    
    console.log(`[${ROUTE}] Login submitted, waiting for navigation...`);
    // Wait for either the target route or a redirect
    await page.waitForTimeout(3000); 

    console.log(`[${ROUTE}] Navigating to target route: ${BASE_URL}${ROUTE}`);
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle', timeout: 20000 });

    console.log(`[${ROUTE}] Navigation done, waiting for marker: ${MARKER_SELECTOR}`);
    await page.waitForTimeout(2000); 

    const marker = page.locator(MARKER_SELECTOR).first();
    await marker.waitFor({ state: 'visible', timeout: 20000 });
    
    if (MARKER_TEXT) {
      console.log(`[${ROUTE}] Waiting for text: ${MARKER_TEXT}`);
      const textMarker = page.locator(`span:has-text("${MARKER_TEXT}"), div:has-text("${MARKER_TEXT}"), :text("${MARKER_TEXT}")`).first();
      await textMarker.waitFor({ state: 'visible', timeout: 20000 });
    }
    
    success = true;
    console.log(`[${ROUTE}] SUCCESS: Marker found.`);

  } catch (e) {
    console.log(`[${ROUTE}] FAILURE: ${e.message}`);
    logStream.write(`[SCRIPT_ERROR] ${e.message}\n`);
  } finally {
    try {
      const title = await page.title().catch(() => 'N/A');
      const currentUrl = page.url();
      console.log(`[${ROUTE}] Final URL: ${currentUrl}`);
      console.log(`[${ROUTE}] Final Page Title: ${title}`);
      try {
        const bodyText = await page.innerText('body');
        console.log(`[${ROUTE}] Body Text Sample: ${bodyText.substring(0, 500).replace(/\n/g, ' ')}`);
      } catch (e) {}
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
