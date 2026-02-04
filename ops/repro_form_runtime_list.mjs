import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || 'Admin#2026!Reset';
const ROUTE_TIMEOUT_MS = Number.parseInt(process.env.RUNTIME_TIMEOUT_MS || '', 10);
const ROUTE_TIMEOUT = Number.isFinite(ROUTE_TIMEOUT_MS) ? ROUTE_TIMEOUT_MS : 60000;
const RETRY_MAX = Number.parseInt(process.env.RETRY_MAX || '2', 10);
const RETRY_BASE_DELAY_MS = Number.parseInt(process.env.RETRY_DELAY_MS || '2000', 10);
const SHELL_SELECTOR = '.ant-layout, .ant-menu, .ant-layout-sider';

const ARTIFACTS_DIR = path.resolve('.artifacts/repro-form-runtime');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const resolveUrl = (href) => {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('#/')) return `${BASE_URL}/${href}`;
  if (href.startsWith('/')) return `${BASE_URL}${href}`;
  return `${BASE_URL}/#/${href.replace(/^#?\/?/, '')}`;
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  let context;
  if (OA_STORAGE_STATE && fs.existsSync(OA_STORAGE_STATE)) {
    console.log(`Using storage state from: ${OA_STORAGE_STATE}`);
    context = await browser.newContext({ storageState: OA_STORAGE_STATE });
  } else {
    console.log(`No storage state found. Attempting auto-login.`);
    context = await browser.newContext();
  }

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  let failureStage = 'init';
  let failureReason = '';
  let lastScreenshotPath = path.join(ARTIFACTS_DIR, 'error.png');

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForAppShell = async () => {
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });
  };

  const fetchRuntimeMenuUrl = async () => {
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

    if (payload?.error) {
      return '';
    }
    const tree = payload?.data?.result || payload?.data?.data || payload?.data?.menus || [];
    const stack = Array.isArray(tree) ? [...tree] : [];
    while (stack.length) {
      const node = stack.shift();
      if (!node) continue;
      const url = node.url || node.path || '';
      if (typeof url === 'string' && url.includes('/form/runtime/') && url.includes('/list')) {
        return url;
      }
      const children = node.children || node.childList || node.childMenuList || [];
      if (Array.isArray(children) && children.length) {
        stack.push(...children);
      }
    }
    return '';
  };

  const findRuntimePathFromDom = async () => {
    return page.evaluate(() => {
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
  };

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
        await page.waitForURL(/form\/runtime\/[^/]+\/list/, { timeout: 8000 });
      } catch (e) {}
      const currentUrl = page.url();
      if (currentUrl.includes('/form/runtime/') && currentUrl.includes('/list')) {
        return currentUrl;
      }
    }
    return '';
  };

  const clickRuntimeMenuItems = async () => {
    const runtimeContainer = page
      .locator('.ant-layout-sider li.jeecg-menu-submenu.jeecg-menu-opened, .ant-layout-sider .ant-menu-submenu-open')
      .filter({ hasText: /App Runtime|应用运行/i })
      .first();
    if (await runtimeContainer.count()) {
      const runtimeItems = runtimeContainer.locator('li.jeecg-menu-item, li.ant-menu-item');
      const runtimeUrl = await clickThroughMenuItems(runtimeItems);
      if (runtimeUrl) return runtimeUrl;
    }
    const fallbackItems = page.locator('.ant-layout-sider li.jeecg-menu-item, .ant-layout-sider li.ant-menu-item');
    return clickThroughMenuItems(fallbackItems);
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

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', req => {
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
      await gotoWithRetries(`${BASE_URL}/login`, 'goto-login');
      console.log('Filling login form...');
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
        await gotoWithRetries(BASE_URL, 'goto-post-login');
      });
    }

    console.log('Checking for "App Runtime" menu...');
    failureStage = 'wait-shell';
    await waitForAppShell();

    const sidebar = page.locator('.ant-layout-sider').first();
    let runtimeMenu = sidebar.locator(':text-matches("App Runtime|应用运行", "i")').first();
    if (!(await runtimeMenu.isVisible().catch(() => false))) {
      runtimeMenu = page.locator(':text-matches("App Runtime|应用运行", "i")').first();
    }
    if (!(await runtimeMenu.isVisible().catch(() => false))) {
      throw new Error('Parent menu "App Runtime" not found in sidebar.');
    }
    console.log('Parent menu found.');

    await runtimeMenu.click();
    await page.waitForTimeout(1000);

    const sidebarDump = await page.evaluate(() => {
      const sidebar = document.querySelector('.ant-layout-sider') || document.body;
      const anchors = Array.from(sidebar.querySelectorAll('a')).map((a) => ({
        text: (a.textContent || '').trim(),
        href: a.getAttribute('href') || '',
        title: a.getAttribute('title') || '',
      }));
      const items = Array.from(sidebar.querySelectorAll('li')).map((li) => ({
        text: (li.textContent || '').trim().replace(/\s+/g, ' '),
        path: li.getAttribute('data-path') || '',
        menuPath: li.getAttribute('data-menu-path') || '',
        menuId: li.getAttribute('data-menu-id') || '',
        menuKey: li.getAttribute('data-key') || '',
        menuRoute: li.getAttribute('data-route') || '',
        menuUrl: li.getAttribute('data-url') || '',
        className: li.className || '',
      }));
      return { anchors, items };
    });
    try {
      fs.writeFileSync(
        path.join(ARTIFACTS_DIR, 'sidebar-links.json'),
        JSON.stringify(sidebarDump, null, 2)
      );
    } catch (e) {}

    try {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sidebar.png'), timeout: 5000 });
    } catch (e) {
      // ignore screenshot failures
    }
    console.log('Sidebar screenshot saved.');

    let href = await fetchRuntimeMenuUrl();
    if (!href) {
      href = await findRuntimePathFromDom();
    }
    let listUrl = href ? resolveUrl(href) : '';
    if (!listUrl) {
      listUrl = await clickRuntimeMenuItems();
    }
    if (!listUrl && page.url().includes('/form/runtime/') && page.url().includes('/list')) {
      listUrl = page.url();
    }
    if (!listUrl) {
      throw new Error('Runtime form menu item not found.');
    }
    const match = listUrl.match(/form\/runtime\/([^/]+)\/list/);
    const formKey = match ? match[1] : '';

    console.log(`Navigating to runtime list: ${listUrl}`);
    failureStage = 'goto-list';
    if (page.url() !== listUrl) {
      await gotoWithRetries(listUrl, 'goto-list');
    }
    await page.waitForSelector('.ant-table', { timeout: ROUTE_TIMEOUT });
    try {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'list.png'), timeout: 5000 });
    } catch (e) {
      // ignore screenshot failures
    }
    console.log('List screenshot saved.');

    // Column settings toggle (system columns)
    const settingsBtn = page.locator('button:has-text("列设置")').first();
    if (await settingsBtn.count()) {
      try {
        const createdByHeader = page.locator('th:has-text("created_by")');
        const createdByVisible = (await createdByHeader.count()) > 0;
        await settingsBtn.click();
        const modal = page.locator('.ant-modal-content').first();
        await modal.waitFor({ state: 'visible', timeout: 8000 });
        const targetOption = modal.locator('label:has-text("created_by")').first();
        if (await targetOption.count()) {
          await targetOption.click();
        } else {
          const firstOption = modal.locator('label').first();
          if (await firstOption.count()) {
            await firstOption.click();
          }
        }
        const okBtn = modal.locator('.ant-modal-footer .ant-btn-primary').first();
        if (await okBtn.count()) {
          await okBtn.click();
        }
        if (createdByVisible) {
          await page.waitForSelector('th:has-text("created_by")', { state: 'detached', timeout: 8000 }).catch(() => {});
        } else {
          await page.waitForSelector('th:has-text("created_by")', { state: 'attached', timeout: 8000 }).catch(() => {});
        }
        try {
          await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'columns.png'), timeout: 5000 });
        } catch (e) {
          // ignore screenshot failures
        }
        console.log('Column settings toggled.');
      } catch (e) {
        console.warn('Column settings modal did not appear. Skipping column toggle.');
      }
    }

    // Export CSV
    const exportBtn = page.locator('button:has-text("导出 CSV")').first();
    if (await exportBtn.count()) {
      await exportBtn.click();
      await page.waitForTimeout(800);
      try {
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'export.png'), timeout: 5000 });
      } catch (e) {
        // ignore screenshot failures
      }
      console.log('Export button clicked.');
    }

    const rows = page.locator('.ant-table-tbody tr');
    let rowCount = await rows.count();
    if (rowCount > 0) {
      const checkbox = page.locator('.ant-table-tbody .ant-checkbox-wrapper').first();
      if (await checkbox.count()) {
        await checkbox.click();
        await page.waitForTimeout(500);
      }
      const deleteBtn = page.locator('button:has-text("删除")').first();
      if (await deleteBtn.count()) {
        await deleteBtn.click();
        const confirmBtn = page.locator('.ant-modal .ant-btn-dangerous, .ant-modal-footer .ant-btn-primary').first();
        if (await confirmBtn.count()) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(1200);
        await page.waitForSelector('.ant-message', { timeout: 5000 }).catch(() => {});
      }
      rowCount = await rows.count();
      if (rowCount > 0) {
        const firstRow = rows.first();
        const viewBtn = firstRow.locator('button:has-text("查看"), a:has-text("查看")');
        if (await viewBtn.count() > 0) {
          await viewBtn.first().click();
        } else {
          await firstRow.click();
        }
        await page.waitForTimeout(1000);
        await page.waitForLoadState('domcontentloaded', { timeout: ROUTE_TIMEOUT });
        await page.waitForSelector('.ant-card, .ant-table, body', { timeout: ROUTE_TIMEOUT });
        try {
          await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'detail.png'), timeout: 5000 });
        } catch (e) {
          // ignore screenshot failures
        }
        console.log('Detail screenshot saved.');
      } else {
        console.log('NO DATA: skip detail after delete.');
      }
    } else if (formKey) {
      console.log('NO DATA: skip delete assertion.');
      const detailUrl = `${BASE_URL}/#/form/runtime/${formKey}/view?recordId=missing`;
      console.log('No rows found. Verifying empty detail page...');
      failureStage = 'goto-empty-detail';
      await gotoWithRetries(detailUrl, 'goto-empty-detail');
      await page.waitForSelector('.ant-card, body', { timeout: ROUTE_TIMEOUT });
      try {
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'detail-empty.png'), timeout: 5000 });
      } catch (e) {
        // ignore screenshot failures
      }
      console.log('Empty detail screenshot saved.');
    } else {
      console.log('No rows found and formKey unavailable. Skipped detail verification.');
    }

  } catch (e) {
    failureReason = e?.message || 'unknown error';
    console.error(`FAILURE: ${failureReason}`);
    lastScreenshotPath = path.join(ARTIFACTS_DIR, 'error.png');
    try {
      await page.screenshot({ path: lastScreenshotPath, timeout: 5000 });
    } catch (screenshotErr) {
      // ignore screenshot failures
    }
    const readyState = await page.evaluate(() => document.readyState).catch(() => 'unknown');
    const failureCategory = failureStage.startsWith('login')
      ? 'login'
      : failureStage.startsWith('navigate') || failureStage.startsWith('goto')
        ? 'navigation'
        : failureStage.startsWith('wait')
          ? 'marker'
          : 'unknown';
    const resultPayload = {
      success: false,
      failureStage,
      failureReason,
      failureCategory,
      readyState,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      screenshot: lastScreenshotPath,
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(resultPayload, null, 2));
    console.error(`Evidence: ${ARTIFACTS_DIR}`);
    if (consoleErrors.length) console.error(`Console Errors: ${consoleErrors.slice(-10).join(' | ')}`);
    if (pageErrors.length) console.error(`Page Errors: ${pageErrors[0]}`);
    if (failedRequests.length) console.error(`Failed Requests: ${failedRequests[0]}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
