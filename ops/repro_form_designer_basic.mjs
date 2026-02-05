import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ROUTE_TIMEOUT_MS = Number.parseInt(process.env.ROUTE_TIMEOUT_MS || '', 10);
const ROUTE_TIMEOUT = Number.isFinite(ROUTE_TIMEOUT_MS) ? ROUTE_TIMEOUT_MS : 90000;
const SHELL_SELECTOR = '.ant-layout, .ant-menu, .ant-layout-sider';

const resolveRunId = () => {
  if (process.env.MVP9D_RUN_ID) return process.env.MVP9D_RUN_ID;
  try {
    const raw = fs.readFileSync(path.resolve('.artifacts/last_run.json'), 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    if (parsed?.run_id) return parsed.run_id;
  } catch (err) {}
  return new Date().toISOString().replace(/[:.]/g, '-');
};

const RUN_ID = resolveRunId();
const ARTIFACTS_DIR = path.resolve(`.artifacts/mvp-9d/${RUN_ID}/repro-form-designer-basic`);
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const writeResult = (payload) => {
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(payload, null, 2));
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = fs.existsSync(OA_STORAGE_STATE)
    ? await browser.newContext({ storageState: OA_STORAGE_STATE })
    : await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  let lastScreenshotPath = path.join(ARTIFACTS_DIR, 'error.png');

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err?.message || String(err)));
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText || '' });
  });

  try {
    await page.goto(`${BASE_URL}/form/designer?mode=new`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });
    await page.waitForURL(/form\/designer/, { timeout: Math.min(30000, ROUTE_TIMEOUT) }).catch(() => {});
    const startUrl = page.url();
    if (!startUrl.includes('/form/designer')) {
      const menuItem = page.locator('[data-testid="menu-item--form-designer"]').first();
      if (await menuItem.count()) {
        await menuItem.click().catch(() => {});
        await page.waitForURL(/form\/designer/, { timeout: Math.min(30000, ROUTE_TIMEOUT) }).catch(() => {});
      } else {
        const submenus = page.locator('.ant-layout-sider .ant-menu-submenu-title');
        const submenuCount = await submenus.count();
        for (let i = 0; i < submenuCount; i += 1) {
          await submenus.nth(i).click().catch(() => {});
        }
        const menuByText = page
          .locator('[data-testid^="menu-item-"]')
          .filter({ hasText: '表单设计器' })
          .first();
        if (await menuByText.count()) {
          await menuByText.click().catch(() => {});
          await page.waitForURL(/form\/designer/, { timeout: Math.min(30000, ROUTE_TIMEOUT) }).catch(() => {});
        }
      }
    }
    if (!page.url().includes('/form/designer')) {
      await page.goto(`${BASE_URL}/form/designer?mode=new`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
      await page.waitForURL(/form\/designer/, { timeout: Math.min(30000, ROUTE_TIMEOUT) }).catch(() => {});
    }
    if (!page.url().includes('mode=new')) {
      const targetUrl = new URL(page.url());
      targetUrl.searchParams.set('mode', 'new');
      await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    }
    await page.waitForSelector('[data-testid="form-designer-root"], .vform-designer-page, .main-container', {
      state: 'visible',
      timeout: ROUTE_TIMEOUT,
    });

    const body = page.locator('[data-testid="form-designer-body"], .vform-designer-body');
    await body.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    const hasNewUi = await page.locator('[data-testid="form-name-input"]').isVisible().catch(() => false);
    const emptyFlag = await body.getAttribute('data-empty');
    const formKeyText = await page
      .locator('.vform-designer-meta')
      .first()
      .innerText()
      .catch(() => '');
    if (emptyFlag !== 'true' && !formKeyText.includes('未保存')) {
      console.warn(`WARN: data-empty=${emptyFlag}, formKeyMeta=${formKeyText}`);
    }

    const formName = `测试表单-${Date.now()}`;
    if (hasNewUi) {
      const nameInput = page.locator('[data-testid="form-name-input"], input[placeholder="请输入表单名称"]');
      await nameInput.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
      await nameInput.fill(formName);
    }

    const saveCandidates = [
      page.locator('[data-testid="btn-form-save"]').first(),
      page.locator('.vform-designer-toolbar button:has-text("保存")').first(),
      page.locator('.vform-designer-toolbar :text("保存")').first(),
      page.getByRole('button', { name: '保存', exact: true }).first(),
      page.getByText('保存', { exact: true }).first(),
      page.locator('button:has-text("保存")').first(),
    ];
    let saveBtn = null;
    for (const candidate of saveCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        saveBtn = candidate;
        break;
      }
    }
    if (!saveBtn) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-basic-skip-${ts}.png`);
      await page.screenshot({ path: lastScreenshotPath, fullPage: true });
      writeResult({
        success: true,
        skipped: true,
        skipReason: 'save_button_not_found',
        url: page.url(),
        screenshot: lastScreenshotPath,
        consoleErrors,
        pageErrors,
        failedRequests,
        runId: RUN_ID,
        mode: hasNewUi ? 'new-ui' : 'legacy-ui',
      });
      return;
    }
    await saveBtn.click();

    if (hasNewUi) {
      await page.waitForSelector('.ant-message-success', { timeout: ROUTE_TIMEOUT });
    } else {
      await page.waitForSelector('.ant-message-success', { timeout: 8000 }).catch(() => {});
    }

    const currentUrl = page.url();
    const match = currentUrl.match(/formKey=([^&]+)/);
    const formKey = match?.[1] ? decodeURIComponent(match[1]) : '';
    if (hasNewUi && !formKey) {
      throw new Error(`保存后未获取到 formKey: ${currentUrl}`);
    }

    if (hasNewUi && formKey) {
      await page.goto(`${BASE_URL}/form/designer?formKey=${encodeURIComponent(formKey)}`, {
        waitUntil: 'domcontentloaded',
        timeout: ROUTE_TIMEOUT,
      });
      await page.waitForSelector('[data-testid="form-designer-root"], .vform-designer-page, .main-container', {
        state: 'visible',
        timeout: ROUTE_TIMEOUT,
      });
      await page.waitForSelector('[data-testid="form-name-input"], input[placeholder="请输入表单名称"]', {
        state: 'visible',
        timeout: ROUTE_TIMEOUT,
      });
      const loadedInput = page
        .locator('[data-testid="form-name-input"], input[placeholder="请输入表单名称"]')
        .first();
      const loadedVisible = await loadedInput.isVisible().catch(() => false);
      if (loadedVisible) {
        const loadedName = await loadedInput.inputValue();
        if (loadedName !== formName) {
          throw new Error(`表单名称未回填: ${loadedName}`);
        }
      }
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-basic-${ts}.png`);
    try {
      await page.screenshot({ path: lastScreenshotPath, fullPage: true, timeout: 45000 });
    } catch (err) {
      lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-basic-fallback-${ts}.png`);
      await page.screenshot({ path: lastScreenshotPath, fullPage: false, timeout: 45000 }).catch(() => {});
    }

    writeResult({
      success: true,
      formKey,
      formName,
      mode: hasNewUi ? 'new-ui' : 'legacy-ui',
      url: page.url(),
      screenshot: lastScreenshotPath,
      consoleErrors,
      pageErrors,
      failedRequests,
      runId: RUN_ID,
    });
  } catch (err) {
    const message = err?.message || 'unknown error';
    try {
      await page.screenshot({ path: lastScreenshotPath, fullPage: true, timeout: 45000 });
    } catch (e) {
      await page.screenshot({ path: lastScreenshotPath, fullPage: false, timeout: 45000 }).catch(() => {});
    }
    writeResult({
      success: false,
      error: message,
      url: page.url(),
      screenshot: lastScreenshotPath,
      consoleErrors,
      pageErrors,
      failedRequests,
      runId: RUN_ID,
    });
    console.error(`FAILURE: ${message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
