import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || 'Admin#2026!Reset';
const ROUTE_TIMEOUT_MS = Number.parseInt(process.env.ROUTE_TIMEOUT_MS || '', 10);
const ROUTE_TIMEOUT = Number.isFinite(ROUTE_TIMEOUT_MS) ? ROUTE_TIMEOUT_MS : 90000;
const RETRY_MAX = Number.parseInt(process.env.RETRY_MAX || '2', 10);
const RETRY_BASE_DELAY_MS = Number.parseInt(process.env.RETRY_DELAY_MS || '2000', 10);
const SHELL_SELECTOR = '.ant-layout, .ant-menu, .ant-layout-sider';
const FORM_MARKER = '[data-testid="bpm-task-form-render"]';
const LEGACY_FORM_MARKER = '.approve-page';

const ARTIFACTS_DIR = path.resolve('.artifacts/repro-bpm-open-form');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let context;
  if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
    console.log(`Using storage state from: ${OA_STORAGE_STATE}`);
    context = await browser.newContext({ storageState: OA_STORAGE_STATE });
  } else {
    console.log('No storage state found. Attempting auto-login.');
    context = await browser.newContext();
  }

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  let failureStage = 'init';
  let failureReason = '';
  let lastScreenshotPath = path.join(ARTIFACTS_DIR, 'error.png');

  const waitForAppShell = async () => {
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });
  };

  const gotoWithRetries = async (url, label) => {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_MAX; attempt += 1) {
      try {
        if (attempt > 0) {
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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text().replace(new RegExp(ADMIN_PASS, 'g'), '***');
      consoleErrors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    const url = req.url();
    const errText = req.failure()?.errorText || 'unknown';
    if (!url.includes('baidu.com')) {
      failedRequests.push(`${url} -> ${errText}`);
    }
  });

  try {
    if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
      failureStage = 'navigate-tasks';
      await gotoWithRetries(`${BASE_URL}/bpm/tasks`, 'goto-tasks');
    } else {
      failureStage = 'navigate-login';
      await gotoWithRetries(`${BASE_URL}/login`, 'goto-login');
      failureStage = 'login-submit';
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
      failureStage = 'navigate-tasks';
      await gotoWithRetries(`${BASE_URL}/bpm/tasks`, 'goto-tasks');
    }

    await waitForAppShell();
    await page.waitForSelector('.ant-table, .ant-table-wrapper', { timeout: ROUTE_TIMEOUT });

    const rows = page.locator('.ant-table-tbody tr');
    const rowCount = await rows.count();
    if (rowCount < 1) {
      const emptyShot = path.join(ARTIFACTS_DIR, 'no-data.png');
      await page.screenshot({ path: emptyShot, timeout: 5000 });
      const result = {
        success: true,
        skipped: true,
        reason: 'NO TASK DATA: SKIP open-form',
        url: page.url(),
        screenshot: emptyShot,
      };
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(result, null, 2));
      console.log(result.reason);
      await browser.close();
      return;
    }

    failureStage = 'open-form-click';
    const firstRow = rows.nth(0);
    const openButton = firstRow.locator('[data-testid="bpm-action-openForm"], button:has-text("打开表单"), button:has-text("查看表单"), button:has-text("Open Form")').first();
    if (!(await openButton.count())) {
      throw new Error('Open form button not found');
    }
    await openButton.click();

    failureStage = 'wait-form-route';
    const targetRoute = /\/bpm\/(task|instance)\/.+\/form|\/bpm\/approve/;
    try {
      await page.waitForURL(targetRoute, { timeout: ROUTE_TIMEOUT, waitUntil: 'domcontentloaded' });
    } catch (err) {
      const fallbackUrl = page.url();
      if (!targetRoute.test(fallbackUrl)) {
        throw err;
      }
    }
    const currentUrl = page.url();
    const notFoundMarker = page.locator('text=404, text=页面不存在, text=抱歉');
    if (await notFoundMarker.first().isVisible().catch(() => false)) {
      const notFoundShot = path.join(ARTIFACTS_DIR, 'not-found.png');
      await page.screenshot({ path: notFoundShot, timeout: 5000 });
      throw new Error('Open form landed on 404 page');
    }
    if (currentUrl.includes('/bpm/approve')) {
      await page.waitForSelector(LEGACY_FORM_MARKER, { timeout: ROUTE_TIMEOUT });
    } else {
      await page.waitForSelector(FORM_MARKER, { timeout: ROUTE_TIMEOUT });
    }

    const successShot = path.join(ARTIFACTS_DIR, 'open-form.png');
    await page.screenshot({ path: successShot, timeout: 5000 });
    const resultPayload = {
      success: true,
      skipped: false,
      url: page.url(),
      routeType: currentUrl.includes('/bpm/approve') ? 'legacy-approve' : 'task-form',
      screenshot: successShot,
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(resultPayload, null, 2));
  } catch (e) {
    failureReason = e?.message || 'unknown error';
    console.error(`FAILURE: ${failureReason}`);
    try {
      await page.screenshot({ path: lastScreenshotPath, timeout: 5000 });
    } catch (screenshotErr) {}
    const currentUrl = page.url();
    const readyState = await page.evaluate(() => document.readyState).catch(() => 'unknown');
    const resultPayload = {
      success: false,
      failureStage,
      failureReason,
      url: currentUrl,
      readyState,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      screenshot: lastScreenshotPath,
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(resultPayload, null, 2));
    if (consoleErrors.length) console.error(`Console Errors: ${consoleErrors.slice(-10).join(' | ')}`);
    if (pageErrors.length) console.error(`Page Errors: ${pageErrors[0]}`);
    if (failedRequests.length) console.error(`Failed Requests: ${failedRequests[0]}`);
    console.error(`Evidence: ${ARTIFACTS_DIR}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
