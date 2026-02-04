import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Environment variables
const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_USER = process.env.OA_USER || 'admin';
const OA_PASS = process.env.OA_PASS;
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const HEADLESS = process.env.HEADLESS !== 'false'; // Default to true for agent safety, user can override

// Artifacts setup
const ARTIFACTS_DIR = path.resolve('.artifacts/oa-login');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const LOG_FILE = path.join(ARTIFACTS_DIR, 'console.log');
fs.writeFileSync(LOG_FILE, '');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(msg) {
  console.log(msg);
  logStream.write(`${msg}\n`);
}

(async () => {
  if (!OA_PASS) {
    log('ERROR: OA_PASS environment variable is required.');
    process.exit(1);
  }

  log(`Launching browser (headless=${HEADLESS}) to capture session for ${OA_USER} at ${BASE_URL}...`);
  
  const browser = await chromium.launch({
    headless: HEADLESS, // User should set HEADLESS=false for manual interaction
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logStream.write(`[CONSOLE] ${msg.type()}: ${msg.text()}\n`);
    }
  });

  try {
    const loginUrl = `${BASE_URL}/login`;
    log(`Navigating to ${loginUrl}...`);
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

    log('Filling credentials...');
    await page.fill('input[placeholder*="账号"], input[id*="account"], input[name*="username"]', OA_USER);
    await page.fill('input[placeholder*="密码"], input[id*="password"], input[name*="password"]', OA_PASS);

    // Click login
    log('Clicking login...');
    await page.click('button[type="submit"], button:has-text("登录"), .ant-btn-primary');

    // Wait for login success marker (e.g., dashboard, user avatar, or url change)
    // If CAPTCHA is present, this might timeout.
    // If running in headed mode (by user), they can solve it.
    log('Waiting for login success (navigation to dashboard or presence of .ant-layout)...');
    
    try {
      await page.waitForFunction(() => {
        return !location.href.includes('/login') && document.querySelector('.ant-layout');
      }, null, { timeout: 15000 });
    } catch (e) {
      log('Login did not complete automatically (possible CAPTCHA).');
      if (!HEADLESS) {
        log('PAUSING for manual intervention. Please solve CAPTCHA and ensure login completes.');
        await page.pause(); // Keeps browser open for user
      } else {
        log('Headless mode enabled: cannot solve CAPTCHA manually. Failing.');
        throw new Error('Login failed (timeout waiting for redirect) - CAPTCHA likely required.');
      }
    }

    log('Login detected! Saving storage state...');
    const statePath = path.resolve(OA_STORAGE_STATE);
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
    
    await context.storageState({ path: statePath });
    log(`Storage state saved to: ${statePath}`);

    // Evidence
    const title = await page.title();
    const url = page.url();
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.txt'), `URL: ${url}\nTitle: ${title}\nStorage: ${statePath}\n`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot.png'), fullPage: true });
    log('Evidence saved.');

  } catch (err) {
    log(`FAILURE: ${err.message}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error.png'), fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
    logStream.end();
  }
})();
