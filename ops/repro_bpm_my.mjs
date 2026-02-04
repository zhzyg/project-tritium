import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';
const ROUTE = process.env.ROUTE || '/bpm/my';
const MARKER_TEXT = process.env.MARKER_TEXT || '';
const MARKER_SELECTOR = process.env.MARKER_SELECTOR || '.el-table, .el-card__header';
const ROUTE_TIMEOUT_MS = Number.parseInt(process.env.ROUTE_TIMEOUT_MS || '', 10);
const DEFAULT_ROUTE_TIMEOUT = ROUTE === '/bpm/done' ? 90000 : 45000;
const ROUTE_TIMEOUT = Number.isFinite(ROUTE_TIMEOUT_MS) ? ROUTE_TIMEOUT_MS : DEFAULT_ROUTE_TIMEOUT;
const SHELL_TIMEOUT_MS = Math.min(ROUTE_TIMEOUT, 60000);
const RETRY_MAX = Number.parseInt(process.env.RETRY_MAX || '2', 10);
const RETRY_BASE_DELAY_MS = Number.parseInt(process.env.RETRY_DELAY_MS || '2000', 10);
const SHELL_SELECTOR = '.ant-layout, .ant-menu, .ant-layout-sider';

const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || '123456';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE;

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
  
  let context;
  if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
    console.log(`[${ROUTE}] Using storage state from: ${OA_STORAGE_STATE}`);
    context = await browser.newContext({ storageState: OA_STORAGE_STATE });
  } else {
    console.log(`[${ROUTE}] No valid storage state found. Will attempt login.`);
    context = await browser.newContext();
  }

  const page = await context.newPage();
  
  const reproDir = path.join('.artifacts', 'repro');
  if (!fs.existsSync(reproDir)) fs.mkdirSync(reproDir, { recursive: true });
  const apiSnapshotFile = path.join(reproDir, `api-snapshot-${ROUTE_SLUG}.txt`);
  fs.writeFileSync(apiSnapshotFile, `API Snapshot for ${ROUTE} at ${new Date().toISOString()}\n\n`);

  let listApiCaptured = false;
  page.on('request', request => {
    const url = request.url();
    const isBpmApi = url.includes('/jeecg-boot/bpm/') && (url.includes('/my') || url.includes('/done') || url.includes('/list'));
    if (isBpmApi && !listApiCaptured) {
      const method = request.method();
      const postData = request.postData();
      let bodySummary = 'N/A';
      
      if (method === 'GET') {
          const urlObj = new URL(url);
          const params = {};
          urlObj.searchParams.forEach((v, k) => {
              if (!['token', '_t'].includes(k.toLowerCase())) {
                  params[k] = v;
              }
          });
          bodySummary = `Query: ${JSON.stringify(params)}`;
      } else if (postData) {
          try {
              const parsed = JSON.parse(postData);
              const safeBody = {};
              Object.keys(parsed).forEach(k => {
                  if (!['token', 'password', 'cookie', 'authorization'].includes(k.toLowerCase())) {
                      safeBody[k] = parsed[k];
                  }
              });
              bodySummary = JSON.stringify(safeBody);
          } catch (e) {
              bodySummary = 'non-JSON body';
          }
      }
      
      const snapshot = `[API_CALL] ${method} ${url.split('?')[0]}\n[DATA] ${bodySummary}\n`;
      fs.appendFileSync(apiSnapshotFile, snapshot);
      logStream.write(snapshot);
      listApiCaptured = true; 
    }
  });

  let mainResponseStatus = 0;
  page.on('response', response => {
    if (response.url() === `${BASE_URL}${ROUTE}` || response.url() === `${BASE_URL}${ROUTE}/`) {
      mainResponseStatus = response.status();
      logStream.write(`[RESPONSE] ${response.url()} status: ${mainResponseStatus}\n`);
    }
  });

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
  let failureStage = 'init';
  let failureReason = '';
  let lastScreenshotPath = path.join(ARTIFACTS_DIR, 'screenshot.png');
  const shouldSaveStorageState = OA_STORAGE_STATE && !fs.existsSync(OA_STORAGE_STATE);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForAppShell = async () => {
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: SHELL_TIMEOUT_MS });
  };

  const gotoWithRetries = async (url, label) => {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_MAX; attempt += 1) {
      try {
        if (attempt > 0) {
          logStream.write(`[RETRY] ${label} attempt ${attempt + 1}\n`);
          await page.reload({ waitUntil: 'domcontentloaded', timeout: Math.min(20000, ROUTE_TIMEOUT) }).catch(() => {});
          await sleep(RETRY_BASE_DELAY_MS * attempt);
        }
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
        await page.waitForLoadState('domcontentloaded', { timeout: ROUTE_TIMEOUT });
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };

  const stepWithRetries = async (label, fn) => {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_MAX; attempt += 1) {
      try {
        if (attempt > 0) {
          logStream.write(`[RETRY] ${label} attempt ${attempt + 1}\n`);
          await page.reload({ waitUntil: 'domcontentloaded', timeout: Math.min(20000, ROUTE_TIMEOUT) }).catch(() => {});
          await sleep(RETRY_BASE_DELAY_MS * attempt);
        }
        return await fn();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };

  const waitForRouteReady = async () => {
    await page.waitForLoadState('domcontentloaded', { timeout: ROUTE_TIMEOUT });
    await waitForAppShell();
    const marker = page.locator(MARKER_SELECTOR).first();
    await marker.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    if (MARKER_TEXT) {
      const textMarker = page.locator(`span:has-text("${MARKER_TEXT}"), div:has-text("${MARKER_TEXT}"), :text("${MARKER_TEXT}")`).first();
      await textMarker.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    }
  };
  try {
    if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
       console.log(`[${ROUTE}] Navigating to target route (with session): ${BASE_URL}${ROUTE}`);
       failureStage = 'navigate-route';
       await gotoWithRetries(`${BASE_URL}${ROUTE}`, 'goto-route-session');
    } else {
        console.log(`[${ROUTE}] Navigating to login...`);
        failureStage = 'navigate-login';
        await gotoWithRetries(`${BASE_URL}/user/login`, 'goto-login');

        console.log(`[${ROUTE}] Attempting login...`);
        failureStage = 'login-submit';
        await stepWithRetries('login-submit', async () => {
          await page.fill('input[placeholder*="账号"], input[id*="account"], input[name*="username"]', ADMIN_USER);
          await page.fill('input[placeholder*="密码"], input[id*="password"], input[name*="password"]', ADMIN_PASS);
          try {
            const captchaInput = page.locator('input[placeholder*="验证码"], input[id*="inputCode"]');
            if (await captchaInput.isVisible()) {
              await captchaInput.fill('1234');
            }
          } catch (e) {}
          await page.click('button[type="submit"], button:has-text("登录"), .ant-btn-primary');
          await page.waitForLoadState('domcontentloaded', { timeout: ROUTE_TIMEOUT });
          await waitForAppShell();
        });

        console.log(`[${ROUTE}] Navigating to target route: ${BASE_URL}${ROUTE}`);
        failureStage = 'navigate-route';
        await gotoWithRetries(`${BASE_URL}${ROUTE}`, 'goto-route');
    }

    console.log(`[${ROUTE}] Navigation done, waiting for marker: ${MARKER_SELECTOR}`);
    failureStage = 'wait-marker';
    await stepWithRetries('wait-marker', waitForRouteReady);
    
    success = true;
    console.log(`[${ROUTE}] SUCCESS: Marker found.`);

  } catch (e) {
    failureReason = e?.message || 'unknown error';
    console.log(`[${ROUTE}] FAILURE: ${failureReason}`);
    logStream.write(`[SCRIPT_ERROR] ${e.message}\n`);
  } finally {
    try {
      const title = await page.title().catch(() => 'N/A');
      const currentUrl = page.url();
      const readyState = await page.evaluate(() => document.readyState).catch(() => 'unknown');
      console.log(`[${ROUTE}] Final URL: ${currentUrl}`);
      console.log(`[${ROUTE}] Final Page Title: ${title}`);
      console.log(`[${ROUTE}] Document ReadyState: ${readyState}`);
      console.log(`[${ROUTE}] Main Doc Status: ${mainResponseStatus}`);
      try {
        const bodyText = await page.innerText('body');
        console.log(`[${ROUTE}] Body Text Sample: ${bodyText.substring(0, 500).replace(/\n/g, ' ')}`);
      } catch (e) {}
      logStream.write(`Final URL: ${currentUrl}\nFinal Page Title: ${title}\n`);
      lastScreenshotPath = path.join(ARTIFACTS_DIR, 'screenshot.png');
      await page.screenshot({ path: lastScreenshotPath, fullPage: true, timeout: 5000 }).catch(() => {});

      const resultPayload = {
        route: ROUTE,
        success,
        failureStage,
        failureReason,
        url: currentUrl,
        readyState,
        consoleErrorCount: consoleErrors.length,
        pageErrorCount: errors.length,
        screenshot: lastScreenshotPath,
      };
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(resultPayload, null, 2));
    } catch (ssErr) {}

    if (!success) {
      const failureCategory = failureStage.startsWith('login')
        ? 'login'
        : failureStage.startsWith('navigate')
          ? 'navigation'
          : failureStage.startsWith('wait')
            ? 'marker'
            : 'unknown';
      console.log(`[${ROUTE}] --- ERROR SUMMARY ---`);
      console.log(`  Failure Category: ${failureCategory}`);
      console.log(`  Failure Stage: ${failureStage}`);
      console.log(`  Failure Reason: ${failureReason || 'n/a'}`);
      if (errors.length) console.log(`  Page Errors (${errors.length}): ${errors[0]}`);
      if (consoleErrors.length) console.log(`  Console Errors (${consoleErrors.length}): ${consoleErrors.slice(-10).join(' | ')}`);
      if (failedRequests.length) console.log(`  Failed Requests (${failedRequests.length}): ${failedRequests[0]}`);
      console.log(`  Evidence: ${ARTIFACTS_DIR}/console.log , ${lastScreenshotPath}`);
      console.log('----------------------');
    }

    logStream.end();
    if (success && shouldSaveStorageState) {
      try {
        fs.mkdirSync(path.dirname(OA_STORAGE_STATE), { recursive: true });
        await context.storageState({ path: OA_STORAGE_STATE });
        console.log(`[${ROUTE}] Saved storage state to: ${OA_STORAGE_STATE}`);
      } catch (e) {
        console.log(`[${ROUTE}] Warning: failed to save storage state.`);
      }
    }
    await browser.close();
    process.exit(success ? 0 : 1);
  }
})();
