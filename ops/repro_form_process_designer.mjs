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

const resolveUrl = (href) => {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('#/')) return `${BASE_URL}/${href}`;
  if (href.startsWith('/')) return `${BASE_URL}${href}`;
  return `${BASE_URL}/#/${href.replace(/^#?\/?/, '')}`;
};

const ARTIFACTS_DIR = path.resolve('.artifacts/repro-form-process-designer');
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
      let runtimeMenu = sidebar.locator(':text-matches("App Runtime|应用运行", "i")').first();
      if (!(await runtimeMenu.isVisible().catch(() => false))) {
        runtimeMenu = page.locator(':text-matches("App Runtime|应用运行", "i")').first();
      }
      if (await runtimeMenu.count()) {
        await runtimeMenu.click().catch(() => {});
      }
      await page.waitForTimeout(800);
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
            for (const node of nodes) {
              const path = node?.path || '';
              if (path.includes('/form/runtime/')) return path;
              const child = walk(node?.children || []);
              if (child) return child;
            }
            return '';
          };
          const menuPath = walk(menuList || []);
          const apiKey = extractFormKey(menuPath || '');
          if (apiKey) return apiKey;
        } catch (err) {}
      }
    } catch (err) {}
    return '';
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

    failureStage = 'open-process-tab';
    let processTab = page.getByTestId('tab-process-designer').first();
    if (!(await processTab.count())) {
      processTab = page.locator('.ant-tabs-tab').filter({ hasText: '流程设计' }).first();
    }
    await processTab.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    await processTab.click().catch(() => {});

    failureStage = 'wait-process-root';
    const processRoot = page.locator('[data-testid="process-designer-root"], [data-testid="form-process-designer"]').first();
    await processRoot.waitFor({ state: 'attached', timeout: ROUTE_TIMEOUT });

    failureStage = 'save-draft';
    const saveBtn = page.getByTestId('btn-bpmn-save').first();
    if (!(await saveBtn.count())) {
      throw new Error('保存草稿按钮未找到');
    }
    await saveBtn.click();
    await page.waitForSelector('.ant-message-success, .ant-message-notice', { timeout: ROUTE_TIMEOUT });

    failureStage = 'publish';
    const publishBtn = page.getByTestId('btn-bpmn-publish').first();
    if (!(await publishBtn.count())) {
      throw new Error('发布部署按钮未找到');
    }
    await publishBtn.click();
    await page.waitForSelector('.ant-message-success, .ant-message-notice', { timeout: ROUTE_TIMEOUT });

    const successShot = path.join(ARTIFACTS_DIR, 'process-designer.png');
    try {
      await page.screenshot({ path: successShot, timeout: 15000 });
    } catch (err) {}
    const resultPayload = {
      success: true,
      skipped: false,
      url: page.url(),
      screenshot: successShot,
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(resultPayload, null, 2));
  } catch (e) {
    const failureReason = e?.message || 'unknown error';
    console.error(`FAILURE: ${failureReason}`);
    try {
      await page.screenshot({ path: lastScreenshotPath, timeout: 15000 });
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
