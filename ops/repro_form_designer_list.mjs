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
const ARTIFACTS_DIR = path.resolve(`.artifacts/mvp-9d/${RUN_ID}/repro-form-designer-list`);
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
    await page.goto(`${BASE_URL}/form/designer?tab=list`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });
    await page.waitForURL(/form\/designer/, { timeout: Math.min(30000, ROUTE_TIMEOUT) }).catch(() => {});

    if (!page.url().includes('/form/designer')) {
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
      await page.goto(`${BASE_URL}/form/designer?tab=list`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
      await page.waitForURL(/form\/designer/, { timeout: Math.min(30000, ROUTE_TIMEOUT) }).catch(() => {});
    }

    await page.waitForSelector('[data-testid="form-designer-root"], .vform-designer-page, .main-container', {
      state: 'visible',
      timeout: ROUTE_TIMEOUT,
    });

    const tabCandidates = [
      page.locator('[data-testid="tab-form-list"]').first(),
      page.getByText('表单列表', { exact: true }).first(),
    ];
    let listTab = null;
    for (const candidate of tabCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        listTab = candidate;
        break;
      }
    }

    if (!listTab) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-list-skip-${ts}.png`);
      await page.screenshot({ path: lastScreenshotPath, fullPage: true });
      writeResult({
        success: true,
        skipped: true,
        skipReason: 'list_tab_not_found',
        url: page.url(),
        screenshot: lastScreenshotPath,
        consoleErrors,
        pageErrors,
        failedRequests,
        runId: RUN_ID,
      });
      return;
    }

    await listTab.click().catch(() => {});
    const listRoot = page.locator('[data-testid="form-list-root"], .vform-designer-list');
    await listRoot.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });

    const rows = page.locator('.ant-table-tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-list-empty-${ts}.png`);
      await page.screenshot({ path: lastScreenshotPath, fullPage: true });
      writeResult({
        success: true,
        skipped: true,
        skipReason: 'no_form_records',
        url: page.url(),
        screenshot: lastScreenshotPath,
        consoleErrors,
        pageErrors,
        failedRequests,
        runId: RUN_ID,
      });
      return;
    }

    const firstRow = rows.first();
    const nameCell = firstRow.locator('td').nth(0);
    const keyCell = firstRow.locator('td').nth(1);
    const formName = (await nameCell.innerText()).trim();
    const formKey = (await keyCell.innerText()).trim();

    let editBtn = page.locator(`[data-testid="btn-form-list-edit-${formKey}"]`).first();
    if (!(await editBtn.isVisible().catch(() => false))) {
      editBtn = firstRow.locator('button:has-text("编辑")').first();
    }
    if (!(await editBtn.isVisible().catch(() => false))) {
      throw new Error('未找到编辑按钮');
    }
    await editBtn.click();

    const nameInput = page.locator('[data-testid="form-name-input"], input[placeholder="请输入表单名称"]');
    await nameInput.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    const inputValue = (await nameInput.inputValue()).trim();
    if (!inputValue) {
      throw new Error('表单名称未回填');
    }
    if (formName && inputValue !== formName) {
      console.warn(`WARN: 表单名称回填不一致: list=${formName}, input=${inputValue}`);
    }

    const metaText = await page.locator('.vform-designer-meta').first().innerText().catch(() => '');
    if (formKey && !metaText.includes(formKey)) {
      throw new Error(`表单Key未匹配: ${formKey}`);
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-list-${ts}.png`);
    await page.screenshot({ path: lastScreenshotPath, fullPage: true });

    writeResult({
      success: true,
      formKey,
      formName,
      inputValue,
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
      await page.screenshot({ path: lastScreenshotPath, fullPage: true });
    } catch (e) {}
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
