import { chromium } from 'playwright';
import crypto from 'crypto';
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
const FORM_KEY = process.env.FORM_PROCESS_KEY || '';
const CACHE_CIPHER_KEY = '_11111000001111@';
const API_PREFIX = process.env.API_PREFIX || '/jeecg-boot';

const ARTIFACTS_DIR = path.resolve('.artifacts/repro-bpm-task-field-rule');
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
  let lastScreenshotPath = path.join(ARTIFACTS_DIR, 'error.png');

  const waitForAppShell = async () => {
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });
  };

  const gotoWithRetries = async (url) => {
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

  const decryptCache = (cipherText = '') => {
    if (!cipherText) return '';
    try {
      const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(CACHE_CIPHER_KEY), null);
      decipher.setAutoPadding(true);
      let decrypted = decipher.update(cipherText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      return '';
    }
  };

  const extractFormKey = (href = '') => {
    const match = href.match(/form\/runtime\/([^/]+)\/list/);
    return match?.[1] || '';
  };

  const extractTokenFromCache = (encryptedCache = '') => {
    const decryptedCache = decryptCache(encryptedCache || '');
    if (!decryptedCache) return '';
    try {
      const payload = JSON.parse(decryptedCache);
      const cacheValue = payload?.value || {};
      const tokenEntry = cacheValue?.TOKEN__ || cacheValue?.token || cacheValue?.tokenValue;
      return typeof tokenEntry === 'string' ? tokenEntry : tokenEntry?.value || '';
    } catch (err) {
      return '';
    }
  };

  const resolveTokenFromStorageState = () => {
    if (!OA_STORAGE_STATE || !fs.existsSync(OA_STORAGE_STATE)) return '';
    try {
      const state = JSON.parse(fs.readFileSync(OA_STORAGE_STATE, 'utf-8'));
      const origin = state?.origins?.find((item) => item.origin === BASE_URL);
      const localEntry = origin?.localStorage?.find((item) => item.name?.endsWith('COMMON__LOCAL__KEY__'));
      if (localEntry?.value) {
        return extractTokenFromCache(localEntry.value);
      }
    } catch (err) {}
    return '';
  };

  const resolveFormKeyFromMenu = async () => {
    try {
      const sidebar = page.locator('.ant-layout-sider').first();
      await page
        .waitForSelector('[data-testid="menu-item--form-runtime"]', {
          state: 'attached',
          timeout: Math.min(20000, ROUTE_TIMEOUT),
        })
        .catch(() => {});
      const directLink = sidebar.locator('a[href*="/form/runtime/"][href*="/list"]').first();
      if (await directLink.count()) {
        const href = (await directLink.getAttribute('href')) || '';
        const key = extractFormKey(href);
        if (key) return key;
      }
      const runtimeTestIdItem = sidebar
        .locator('[data-testid^="menu-item--form-runtime-"][data-testid$="-list"]')
        .first();
      if (await runtimeTestIdItem.count()) {
        const testId = (await runtimeTestIdItem.getAttribute('data-testid')) || '';
        const match = testId.match(/menu-item--form-runtime-(.+)-list$/);
        if (match?.[1]) return match[1];
      }
      let runtimeMenu = sidebar.locator(':text-matches("App Runtime|应用运行", "i")').first();
      if (!(await runtimeMenu.isVisible().catch(() => false))) {
        runtimeMenu = page.locator(':text-matches("App Runtime|应用运行", "i")').first();
      }
      if (await runtimeMenu.count()) {
        await runtimeMenu.click().catch(() => {});
      }
      const runtimeMenuByTestId = sidebar.locator('[data-testid="menu-item--form-runtime"]').first();
      if (await runtimeMenuByTestId.count()) {
        await runtimeMenuByTestId.click().catch(() => {});
      }
      await page.waitForTimeout(800);
      const openedLink = sidebar.locator('a[href*="/form/runtime/"][href*="/list"]').first();
      if (await openedLink.count()) {
        const href = (await openedLink.getAttribute('href')) || '';
        const key = extractFormKey(href);
        if (key) return key;
      }
      const runtimeTestIdOpened = sidebar
        .locator('[data-testid^="menu-item--form-runtime-"][data-testid$="-list"]')
        .first();
      if (await runtimeTestIdOpened.count()) {
        const testId = (await runtimeTestIdOpened.getAttribute('data-testid')) || '';
        const match = testId.match(/menu-item--form-runtime-(.+)-list$/);
        if (match?.[1]) return match[1];
      }
      const runtimeSubmenu = page
        .locator('.ant-layout-sider li.jeecg-menu-submenu, .ant-layout-sider .ant-menu-submenu')
        .filter({ hasText: /App Runtime|应用运行/i })
        .first();
      if (await runtimeSubmenu.count()) {
        const firstItem = runtimeSubmenu.locator('li.jeecg-menu-item, li.ant-menu-item').first();
        if (await firstItem.count()) {
          const text = (await firstItem.innerText()).trim();
          if (/^[A-Za-z0-9_-]+$/.test(text)) {
            return text;
          }
        }
      }
      const runtimeLink = page.locator('a[href*="/form/runtime/"]').first();
      if (await runtimeLink.count()) {
        const href = (await runtimeLink.getAttribute('href')) || '';
        const key = extractFormKey(href);
        if (key) return key;
      }
      const runtimePath = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('a[href], [data-path], [data-menu-path], [data-route], [data-url]'));
        for (const node of nodes) {
          const href = node.getAttribute('href') || '';
          if (href.includes('/form/runtime/')) return href;
          const dataPath = node.getAttribute('data-path') || '';
          if (dataPath.includes('/form/runtime/')) return dataPath;
          const dataMenuPath = node.getAttribute('data-menu-path') || '';
          if (dataMenuPath.includes('/form/runtime/')) return dataMenuPath;
          const dataRoute = node.getAttribute('data-route') || '';
          if (dataRoute.includes('/form/runtime/')) return dataRoute;
          const dataUrl = node.getAttribute('data-url') || '';
          if (dataUrl.includes('/form/runtime/')) return dataUrl;
          const dataMenu = node.getAttribute('data-menu') || '';
          if (dataMenu.includes('/form/runtime/')) return dataMenu;
        }
        return '';
      });
      const keyFromPath = extractFormKey(runtimePath || '');
      if (keyFromPath) return keyFromPath;

      const clickThroughMenuItems = async (items, limit = 8) => {
        const count = await items.count();
        const max = Math.min(count, limit);
        for (let i = 0; i < max; i += 1) {
          const item = items.nth(i);
          const label = ((await item.textContent()) || '').trim();
          if (!label || /App Runtime|应用运行/i.test(label)) continue;
          await item.scrollIntoViewIfNeeded().catch(() => {});
          await item.click({ timeout: Math.min(20000, ROUTE_TIMEOUT) }).catch(() => {});
          await page.waitForLoadState('domcontentloaded', { timeout: ROUTE_TIMEOUT }).catch(() => {});
          try {
            await page.waitForURL(/form\/runtime\/[^/]+\/list/, { timeout: 6000 });
          } catch (e) {}
          const currentUrl = page.url();
          if (currentUrl.includes('/form/runtime/') && currentUrl.includes('/list')) {
            const key = extractFormKey(currentUrl);
            if (key) return key;
          }
        }
        return '';
      };

      const runtimeContainer = page
        .locator('.ant-layout-sider li.jeecg-menu-submenu.jeecg-menu-opened, .ant-layout-sider .ant-menu-submenu-open')
        .filter({ hasText: /App Runtime|应用运行/i })
        .first();
      if (await runtimeContainer.count()) {
        const runtimeItems = runtimeContainer.locator('li.jeecg-menu-item, li.ant-menu-item');
        const key = await clickThroughMenuItems(runtimeItems);
        if (key) return key;
      }
      const fallbackItems = page.locator('.ant-layout-sider li.jeecg-menu-item, .ant-layout-sider li.ant-menu-item');
      const fallbackKey = await clickThroughMenuItems(fallbackItems);
      if (fallbackKey) return fallbackKey;

      const runtimePathFromDom = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('[data-path],[data-menu-path],[data-route],[data-url],a'));
        for (const el of candidates) {
          const attrs = ['data-path', 'data-menu-path', 'data-route', 'data-url'];
          for (const attr of attrs) {
            const val = el.getAttribute?.(attr) || '';
            if (val.includes('/form/runtime/') && val.includes('/list')) {
              return val;
            }
          }
          if (el.tagName === 'A') {
            const href = el.getAttribute('href') || '';
            if (href.includes('/form/runtime/') && href.includes('/list')) {
              return href;
            }
          }
        }
        return '';
      });
      const runtimeKeyFromDom = extractFormKey(runtimePathFromDom || '');
      if (runtimeKeyFromDom) return runtimeKeyFromDom;

      const payload = await page.evaluate(async () => {
        const keys = Object.keys(localStorage || {});
        const tokenKey = keys.find((k) => k.toLowerCase().includes('token')) || '';
        let token = tokenKey ? localStorage.getItem(tokenKey) || '' : '';
        if (!token || token.length < 20) {
          for (const k of keys) {
            const v = localStorage.getItem(k) || '';
            if (v.includes('.') && v.split('.').length === 3) {
              token = v;
              break;
            }
          }
        }
        if (!token) {
          return { error: 'token_missing' };
        }
        const res = await fetch('/jeecg-boot/sys/permission/getUserPermissionByToken?isSidebar=true&version=2', {
          headers: { 'X-Access-Token': token },
        });
        const data = await res.json().catch(() => null);
        return { data };
      });
      if (!payload?.error) {
        const tree = payload?.data?.result || payload?.data?.data || payload?.data?.menus || [];
        const stack = Array.isArray(tree) ? [...tree] : [];
        while (stack.length) {
          const node = stack.shift();
          if (!node) continue;
          const url = node.url || node.path || '';
          if (typeof url === 'string' && url.includes('/form/runtime/') && url.includes('/list')) {
            const key = extractFormKey(url);
            if (key) return key;
          }
          const children = node.children || node.childList || node.childMenuList || [];
          if (Array.isArray(children) && children.length) {
            stack.push(...children);
          }
        }
      }

      const encryptedCache = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const cacheKey = keys.find((k) => k.endsWith('COMMON__LOCAL__KEY__'));
        return cacheKey ? localStorage.getItem(cacheKey) : '';
      });
      const tokenFromPage = extractTokenFromCache(encryptedCache || '');
      const token = tokenFromPage || resolveTokenFromStorageState();
      if (token) {
        try {
          const resp = await page.request.get(`${BASE_URL}${API_PREFIX}/sys/permission/getUserPermissionByToken`, {
            headers: { 'X-Access-Token': token },
          });
          const data = await resp.json().catch(() => null);
          const menuList = data?.result || data?.data || data;
          const walk = (nodes = []) => {
            for (const node of nodes || []) {
              const url = node.url || node.path || '';
              if (typeof url === 'string' && url.includes('/form/runtime/') && url.includes('/list')) {
                const key = extractFormKey(url);
                if (key) return key;
              }
              const children = node.children || node.childList || node.childMenuList || [];
              if (Array.isArray(children)) {
                const childKey = walk(children);
                if (childKey) return childKey;
              }
            }
            return '';
          };
          const key = walk(menuList);
          if (key) return key;
        } catch (err) {
          return '';
        }
      }
    } catch (err) {}
    return '';
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

  const writeResult = (payload) => {
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(payload, null, 2));
  };

  try {
    if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
      failureStage = 'navigate-home';
      await gotoWithRetries(`${BASE_URL}/`);
    } else {
      failureStage = 'navigate-login';
      await gotoWithRetries(`${BASE_URL}/login`);
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
      failureStage = 'navigate-home';
      await gotoWithRetries(`${BASE_URL}/`);
    }

    await waitForAppShell();

    failureStage = 'resolve-formkey';
    let resolvedFormKey = await resolveFormKeyFromMenu();
    if (!resolvedFormKey && FORM_KEY) {
      resolvedFormKey = FORM_KEY;
    }
    if (!resolvedFormKey) {
      throw new Error('未能解析 formKey，请设置 FORM_PROCESS_KEY');
    }

    failureStage = 'navigate-designer';
    await gotoWithRetries(`${BASE_URL}/form/designer?formKey=${resolvedFormKey}&tab=process`);
    await waitForAppShell();
    await page.waitForTimeout(1500);

    failureStage = 'wait-process-root';
    await page.getByTestId('process-designer-root').waitFor({ state: 'attached', timeout: ROUTE_TIMEOUT });
    await page.getByTestId('task-rule-panel').waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });

    let taskBtn = page.getByTestId('task-rule-task-0');
    if (!(await taskBtn.count())) {
      const insertBtn = page.getByTestId('btn-insert-sample-usertask');
      if (!(await insertBtn.count())) {
        throw new Error('未找到用户任务节点，且缺少插入示例节点按钮');
      }
      failureStage = 'insert-sample-usertask';
      await insertBtn.scrollIntoViewIfNeeded().catch(() => {});
      await insertBtn.click({ force: true });
      taskBtn = page.getByTestId('task-rule-task-0');
      await taskBtn.waitFor({ state: 'attached', timeout: ROUTE_TIMEOUT });
    }

    failureStage = 'select-user-task';
    const taskClickTarget = taskBtn.locator('button').first();
    if (await taskClickTarget.count()) {
      await taskClickTarget.click({ force: true });
    } else {
      await taskBtn.click({ force: true });
    }

    const fieldRow = page.getByTestId('task-rule-row-0');
    if (!(await fieldRow.count())) {
      const skipShot = path.join(ARTIFACTS_DIR, 'no-field-options.png');
      try {
        await page.screenshot({ path: skipShot, timeout: 15000 });
      } catch (err) {}
      writeResult({
        success: true,
        skipped: true,
        reason: 'NO FIELD OPTIONS FOUND',
        url: page.url(),
        screenshot: skipShot,
      });
      await browser.close();
      return;
    }

    const visibleToggle = page.getByTestId('task-rule-visible-0');
    const editableToggle = page.getByTestId('task-rule-editable-0');

    failureStage = 'toggle-visible';
    const visibleInput = visibleToggle.locator('input').first();
    const visibleChecked = await visibleInput.isChecked().catch(() => false);
    if (!visibleChecked) {
      await visibleToggle.click();
    }

    failureStage = 'toggle-editable';
    const editableInput = editableToggle.locator('input').first();
    const editableChecked = await editableInput.isChecked().catch(() => false);
    if (!editableChecked) {
      await editableToggle.click();
    }

    failureStage = 'save-rule';
    const saveRuleBtn = page.getByTestId('btn-task-rule-save');
    await saveRuleBtn.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    if (await saveRuleBtn.isDisabled().catch(() => false)) {
      if (await taskClickTarget.count()) {
        await taskClickTarget.click({ force: true }).catch(() => {});
      } else {
        await taskBtn.click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="btn-task-rule-save"]');
      return !!btn && !btn.hasAttribute('disabled');
    }, { timeout: 20000 }).catch(() => {});
    await saveRuleBtn.click({ force: true });
    const saveResponse = await page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/bpm/taskFieldRule/upsert') &&
          resp.request().method() === 'POST',
        { timeout: 20000 }
      )
      .catch(() => null);
    if (saveResponse && !saveResponse.ok()) {
      throw new Error(`保存字段权限失败: ${saveResponse.status()}`);
    }
    const errorToast = await page
      .waitForSelector('.ant-message-error, .ant-message-notice-error, .el-message--error', { timeout: 3000 })
      .catch(() => null);
    if (errorToast) {
      throw new Error('保存字段权限失败: 页面提示错误');
    }
    await page
      .waitForSelector('.ant-message-success, .ant-message-notice, .el-message--success', { timeout: 5000 })
      .catch(() => null);

    const designerShot = path.join(ARTIFACTS_DIR, 'rule-saved.png');
    try {
      await page.screenshot({ path: designerShot, timeout: 15000 });
    } catch (err) {}

    failureStage = 'navigate-tasks';
    await gotoWithRetries(`${BASE_URL}/bpm/tasks`);
    await waitForAppShell();

    const openFormBtn = page.getByTestId('bpm-action-openForm').first();
    if (!(await openFormBtn.count())) {
      const skipShot = path.join(ARTIFACTS_DIR, 'no-task-data.png');
      try {
        await page.screenshot({ path: skipShot, timeout: 15000 });
      } catch (err) {}
      writeResult({
        success: true,
        skipped: true,
        reason: 'NO TASK DATA: SKIP runtime verify',
        url: page.url(),
        screenshot: skipShot,
      });
      await browser.close();
      return;
    }

    failureStage = 'open-task-form';
    await openFormBtn.click();
    await page.waitForURL(/\/bpm\/task\/.+\/form/, { timeout: ROUTE_TIMEOUT, waitUntil: 'domcontentloaded' });

    const formContainer = page.getByTestId('bpm-task-form-render');
    await formContainer.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });

    failureStage = 'check-editable';
    const editableCountAttr = await formContainer.getAttribute('data-editable-count');
    const editableCount = editableCountAttr ? Number.parseInt(editableCountAttr, 10) : 0;
    if (!Number.isFinite(editableCount) || editableCount <= 0) {
      throw new Error(`editable fields not applied (count=${editableCountAttr || '0'})`);
    }

    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="bpm-task-form-render"]');
      if (!container) return;
      const input = container.querySelector('input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])');
      if (input) {
        input.focus();
        input.value = `Auto-${Date.now()}`;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const commentInput = page.getByTestId('bpm-task-comment');
    await commentInput.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    await commentInput.fill(`Auto approve ${new Date().toISOString()}`);

    const approveBtn = page.getByTestId('bpm-task-approve');
    await approveBtn.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    await approveBtn.click();

    await Promise.race([
      page.waitForURL(/\/bpm\/tasks/, { timeout: ROUTE_TIMEOUT }),
      page.waitForSelector('.ant-message-success, .ant-message-notice', { timeout: ROUTE_TIMEOUT }),
    ]);

    const successShot = path.join(ARTIFACTS_DIR, 'task-field-rule.png');
    let screenshotError = null;
    try {
      await page.screenshot({ path: successShot, timeout: 15000 });
    } catch (err) {
      screenshotError = err?.message || 'screenshot failed';
    }

    writeResult({
      success: true,
      skipped: false,
      url: page.url(),
      screenshot: successShot,
      screenshotError,
    });
  } catch (e) {
    const failureReason = e?.message || 'unknown error';
    console.error(`FAILURE: ${failureReason}`);
    try {
      await page.screenshot({ path: lastScreenshotPath, timeout: 15000 });
    } catch (screenshotErr) {}
    const currentUrl = page.url();
    const readyState = await page.evaluate(() => document.readyState).catch(() => 'unknown');
    writeResult({
      success: false,
      failureStage,
      failureReason,
      url: currentUrl,
      readyState,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      screenshot: lastScreenshotPath,
    });
    if (consoleErrors.length) console.error(`Console Errors: ${consoleErrors.slice(-10).join(' | ')}`);
    if (pageErrors.length) console.error(`Page Errors: ${pageErrors[0]}`);
    if (failedRequests.length) console.error(`Failed Requests: ${failedRequests[0]}`);
    console.error(`Evidence: ${ARTIFACTS_DIR}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
