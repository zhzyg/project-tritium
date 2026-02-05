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
const BIND_OK_SELECTOR = '[data-testid="bpm-start-bind-ok"]';
const BIND_MISSING_SELECTOR = '[data-testid="bpm-start-bind-missing"]';
const MANUAL_TOGGLE_SELECTOR = '[data-testid="bpm-start-manual-toggle"]';
const PROC_NO_PERMISSION_SELECTOR = '[data-testid="bpm-start-proc-no-permission"]';

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
  let bindingStatus = 'unknown';
  let boundProcFound = false;
  let unboundProcFound = false;
  let lockedProcFound = false;

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

  const waitForBindingStatus = async () => {
    const boundAlert = page.locator(BIND_OK_SELECTOR);
    const missingAlert = page.locator(BIND_MISSING_SELECTOR);
    for (let i = 0; i < 10; i += 1) {
      if (await boundAlert.isVisible().catch(() => false)) return 'bound';
      if (await missingAlert.isVisible().catch(() => false)) return 'missing';
      await page.waitForTimeout(400);
    }
    return 'unknown';
  };

  const openProcDropdown = async (procSelect) => {
    try {
      await procSelect.locator('.ant-select-selector').click({ force: true });
      await page.waitForSelector('.ant-select-dropdown', { timeout: Math.min(8000, ROUTE_TIMEOUT) });
      return true;
    } catch (err) {
      return false;
    }
  };

  const selectProcessByIndex = async (procSelect, index) => {
    const opened = await openProcDropdown(procSelect);
    if (!opened) return false;
    const options = page.locator('.ant-select-dropdown .ant-select-item-option');
    await options.nth(index).click();
    return true;
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

  const loginWithRetries = async () => {
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
    if (OA_STORAGE_STATE) {
      await context.storageState({ path: OA_STORAGE_STATE });
    }
  };

  try {
    if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
      failureStage = 'navigate-base';
      await gotoWithRetries(BASE_URL, 'goto-base');
    } else {
      failureStage = 'navigate-login';
      await gotoWithRetries(`${BASE_URL}/login`, 'goto-login');
      failureStage = 'login-submit';
      await loginWithRetries();
    }

    failureStage = 'navigate-start';
    await gotoWithRetries(`${BASE_URL}/bpm/start`, 'goto-start');
    await waitForAppShell();

    const noPermAlert = page.locator('[data-testid="bpm-start-no-permission"]');
    if (await noPermAlert.isVisible().catch(() => false)) {
      console.log('Detected no-permission alert, skipping start flow.');
      const skipShot = path.join(ARTIFACTS_DIR, 'no-permission.png');
      try {
        await page.screenshot({ path: skipShot, timeout: 5000 });
      } catch (e) {}
      const skipPayload = {
        success: true,
        skipped: true,
        reason: 'NO PERMISSION: bpm:start missing',
        url: page.url(),
        screenshot: skipShot,
      };
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(skipPayload, null, 2));
      await browser.close();
      return;
    }
    try {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'start-page.png'), timeout: 5000 });
    } catch (e) {}

    const procSelect = page
      .locator('[data-testid="bpm-start-proc"], .ant-form-item:has-text("流程定义") .ant-select')
      .first();
    const useNewUi = (await procSelect.count()) > 0;

    if (useNewUi) {
      const dropdownReady = await openProcDropdown(procSelect);
      if (!dropdownReady) {
        const selectedText = ((await procSelect.locator('.ant-select-selection-item').first().innerText().catch(() => '')) || '').trim();
        if (!selectedText) {
          throw new Error('流程定义下拉无法打开且无默认选项');
        }
        console.log('流程定义下拉未展开，沿用当前已选流程');
      } else {
        const procOptions = page.locator('.ant-select-dropdown .ant-select-item-option');
        const procCount = await procOptions.count();
        if (procCount < 1) {
          throw new Error('No process definitions available');
        }
        const optionTexts = [];
        for (let i = 0; i < procCount; i += 1) {
          optionTexts.push((await procOptions.nth(i).innerText()) || '');
        }
        const lockedIndices = [];
        const startableIndices = [];
        optionTexts.forEach((text, index) => {
          if (text.includes('无权限')) lockedIndices.push(index);
          else startableIndices.push(index);
        });
        await page.keyboard.press('Escape').catch(() => {});

        if (lockedIndices.length > 0) {
          lockedProcFound = true;
          await selectProcessByIndex(procSelect, lockedIndices[0]);
          await page.waitForSelector(PROC_NO_PERMISSION_SELECTOR, { timeout: 8000 });
          const lockedSubmitBtn = page.locator('[data-testid="bpm-start-submit"]').first();
          if (!(await lockedSubmitBtn.isDisabled())) {
            throw new Error('Locked process submit button should be disabled');
          }
        } else {
          console.log('NO LOCKED PROC FOUND: skip locked check');
        }

        if (startableIndices.length < 1) {
          throw new Error('No startable process available');
        }

        let boundIndex = null;
        let missingIndex = null;
        const maxCheck = Math.min(startableIndices.length, 5);
        for (let i = 0; i < maxCheck; i += 1) {
          const index = startableIndices[i];
          const selected = await selectProcessByIndex(procSelect, index);
          if (!selected) break;
          const status = await waitForBindingStatus();
          if (status === 'bound' && boundIndex === null) boundIndex = index;
          if (status === 'missing' && missingIndex === null) missingIndex = index;
          if (boundIndex !== null && missingIndex !== null) break;
        }

        const targetIndex = boundIndex ?? missingIndex ?? startableIndices[0];
        if (targetIndex !== null) {
          await selectProcessByIndex(procSelect, targetIndex);
        }
        bindingStatus = await waitForBindingStatus();
        boundProcFound = boundIndex !== null;
        unboundProcFound = missingIndex !== null;
        if (!boundProcFound) {
          console.log('NO BOUND PROC FOUND: fallback to manual form select');
        }
        if (!unboundProcFound) {
          console.log('NO UNBOUND PROC FOUND: skip unbound branch');
        }
      }

      const formSelect = page
        .locator('[data-testid="bpm-start-form"], .ant-form-item:has-text("业务表单") .ant-select')
        .first();
      if (bindingStatus !== 'bound') {
        if ((await page.locator(MANUAL_TOGGLE_SELECTOR).count()) > 0) {
          await page.locator(MANUAL_TOGGLE_SELECTOR).click();
        }
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
      }

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
      if (!(await submitBtn.count())) {
        throw new Error('NO PERMISSION UI: start button missing');
      }
      try {
        await page.waitForFunction(
          (selector) => {
            const btn = document.querySelector(selector);
            return btn && !btn.hasAttribute('disabled');
          },
          '[data-testid="bpm-start-submit"]',
          { timeout: 10000 }
        );
      } catch (err) {
        throw new Error('NO PERMISSION UI: start button disabled');
      }
      await submitBtn.click();
      const successToast = page.locator('.ant-message-success, .ant-message-notice-success, .ant-message-notice');
      await successToast.first().waitFor({ timeout: 15000 }).catch(() => {});
      await gotoWithRetries(`${BASE_URL}/bpm/my`, 'goto-my-after-start');
    } else {
      bindingStatus = 'legacy';
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
      bindingStatus,
      boundProcFound,
      unboundProcFound,
      lockedProcFound,
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
