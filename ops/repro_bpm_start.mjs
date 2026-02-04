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

const ARTIFACTS_DIR = path.resolve('.artifacts/repro-bpm-start');
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

  const stepWithRetries = async (label, fn) => {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_MAX; attempt += 1) {
      try {
        if (attempt > 0) {
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
      failureStage = 'navigate-base';
      await gotoWithRetries(BASE_URL, 'goto-base');
    } else {
      failureStage = 'navigate-login';
      await gotoWithRetries(`${BASE_URL}/user/login`, 'goto-login');
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
    }

    failureStage = 'navigate-start';
    await gotoWithRetries(`${BASE_URL}/bpm/start`, 'goto-start');
    await waitForAppShell();
    try {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'start-page.png'), timeout: 5000 });
    } catch (e) {}

    const procSelect = page
      .locator('[data-testid="bpm-start-proc"], .ant-form-item:has-text("流程定义") .ant-select')
      .first();
    const useNewUi = (await procSelect.count()) > 0;

    if (useNewUi) {
      await procSelect.locator('.ant-select-selector').click();
      await page.waitForSelector('.ant-select-dropdown', { timeout: ROUTE_TIMEOUT });
      const procOptions = page.locator('.ant-select-dropdown .ant-select-item-option');
      if ((await procOptions.count()) < 1) {
        throw new Error('No process definitions available');
      }
      await procOptions.first().click();

      const formSelect = page
        .locator('[data-testid="bpm-start-form"], .ant-form-item:has-text("业务表单") .ant-select')
        .first();
      if (!(await formSelect.count())) {
        throw new Error('Form select not found');
      }
      await formSelect.locator('.ant-select-selector').click();
      await page.waitForSelector('.ant-select-dropdown', { timeout: ROUTE_TIMEOUT });
      const formOptions = page.locator('.ant-select-dropdown .ant-select-item-option');
      if ((await formOptions.count()) < 1) {
        throw new Error('No published forms available');
      }
      await formOptions.first().click();

      const formContainer = page.locator('[data-testid="bpm-start-render"]').first();
      await formContainer.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
      await page.waitForTimeout(800);

      const textInput = formContainer.locator('input:not([type="hidden"])').first();
      if (await textInput.count()) {
        await textInput.fill('auto-start');
      }
      const textArea = formContainer.locator('textarea').first();
      if (await textArea.count()) {
        await textArea.fill('auto-start');
      }

      const submitBtn = page.locator('[data-testid="bpm-start-submit"]').first();
      await submitBtn.click();
      await page.waitForURL(/\/bpm\/my/, { timeout: ROUTE_TIMEOUT });
    } else {
      const formKeyInput = page.locator('input[placeholder*="formKey"]').first();
      const recordIdInput = page.locator('input[placeholder*="recordId"]').first();
      const createBtn = page.locator('button:has-text("创建测试记录")').first();
      const startBtn = page.locator('button:has-text("发起流程")').first();
      if (!(await formKeyInput.count()) || !(await recordIdInput.count())) {
        throw new Error('Process select not found');
      }
      await createBtn.click();
      await page.waitForFunction(
        (selector) => {
          const input = document.querySelector(selector);
          return input && input.value && input.value.length > 0;
        },
        'input[placeholder*="recordId"]',
        { timeout: ROUTE_TIMEOUT }
      );
      await startBtn.click();
      await page.waitForTimeout(1500);
      await gotoWithRetries(`${BASE_URL}/bpm/my`, 'goto-my-after-start');
    }

    await page.waitForSelector('.ant-table, body', { timeout: ROUTE_TIMEOUT });
    try {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'bpm-start.png'), timeout: 5000 });
    } catch (e) {}
    const successPayload = {
      success: true,
      url: page.url(),
      screenshot: path.join(ARTIFACTS_DIR, 'bpm-start.png'),
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(successPayload, null, 2));
  } catch (e) {
    failureReason = e?.message || 'unknown error';
    console.error(`FAILURE: ${failureReason}`);
    try {
      await page.screenshot({ path: lastScreenshotPath, timeout: 5000 });
    } catch (screenshotErr) {}
    const currentUrl = page.url();
    const title = await page.title().catch(() => 'unknown');
    const bodyText = await page.innerText('body').catch(() => '');
    const readyState = await page.evaluate(() => document.readyState).catch(() => 'unknown');
    const resultPayload = {
      success: false,
      failureStage,
      failureReason,
      url: currentUrl,
      title,
      bodyTextSample: bodyText ? bodyText.substring(0, 300).replace(/\n/g, ' ') : '',
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
