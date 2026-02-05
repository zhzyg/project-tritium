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
const ARTIFACTS_DIR = path.resolve(`.artifacts/mvp-9d/${RUN_ID}/repro-form-designer-publish-menu`);
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const writeResult = (payload) => {
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(payload, null, 2));
};

const pickVisible = async (locator) => {
  const count = await locator.count();
  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible()) return candidate;
  }
  return null;
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

    await page.waitForSelector('[data-testid="form-designer-root"], .vform-designer-page, .main-container', {
      state: 'visible',
      timeout: ROUTE_TIMEOUT,
    });
    const designerRoot = page.locator('[data-testid="form-designer-root"], .vform-designer-page, .main-container').first();
    await designerRoot.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });

    const formName = `自动菜单表单-${Date.now()}`;
    let formKey = '';

    const findVisibleInFrames = async (selector) => {
      if (await page.locator(selector).first().isVisible().catch(() => false)) {
        return { scope: page, locator: page.locator(selector).first() };
      }
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        const candidate = frame.locator(selector).first();
        if (await candidate.isVisible().catch(() => false)) {
          return { scope: frame, locator: candidate };
        }
      }
      return null;
    };

    const nameInputHit = await findVisibleInFrames('[data-testid="form-name-input"], input[placeholder="请输入表单名称"]');
    const hasNewUi = Boolean(nameInputHit);
    if (hasNewUi && nameInputHit) {
      await nameInputHit.locator.fill(formName);
    }

    const findButtonByText = async (labels) => {
      const scopes = [page, ...page.frames().filter((f) => f !== page.mainFrame())];
      for (const scope of scopes) {
        const buttons = scope.getByRole ? scope.getByRole('button') : scope.locator('button');
        const count = await buttons.count().catch(() => 0);
        for (let i = 0; i < count; i += 1) {
          const btn = buttons.nth(i);
          const text = ((await btn.innerText().catch(() => '')) || '').trim();
          if (!text) continue;
          const compact = text.replace(/\s+/g, '');
          if (labels.some((label) => compact.includes(label))) {
            return btn;
          }
        }
      }
      return null;
    };

    const saveSelectors = [
      '[data-testid="btn-form-save"]',
      '.vform-designer-toolbar button:has-text("保存")',
      'button:has-text("保存")',
      'button:has-text("Save")',
      ':text("保存")',
      ':text("Save")',
      'text=/保\\s*存/',
      'text=/S\\s*a\\s*v\\s*e/i',
    ];
    let saveBtn = null;
    for (const selector of saveSelectors) {
      const hit = await findVisibleInFrames(selector);
      if (hit) {
        saveBtn = hit.locator;
        break;
      }
    }
    if (!saveBtn) {
      saveBtn = await findButtonByText(['保存', 'Save']);
    }
    if (!saveBtn) {
      throw new Error('未找到保存按钮');
    }
    await saveBtn.click();

    await page.waitForSelector('.ant-message-success', { timeout: 12000 }).catch(() => {});

    if (hasNewUi) {
      const currentUrl = page.url();
      const match = currentUrl.match(/formKey=([^&]+)/);
      formKey = match?.[1] ? decodeURIComponent(match[1]) : '';
      if (!formKey) {
        throw new Error(`保存后未获取到 formKey: ${currentUrl}`);
      }
    } else {
      const metaHit = await findVisibleInFrames('.vform-designer-meta');
      const metaText = metaHit ? await metaHit.locator.innerText().catch(() => '') : '';
      const match = metaText.match(/表单Key:\s*([^\s]+)/);
      formKey = match?.[1] || '';
      if (!formKey) {
        throw new Error('未能从页面获取 formKey');
      }
    }

    const publishSelectors = [
      '.vform-designer-toolbar button:has-text("发布")',
      'button:has-text("发布")',
      'button:has-text("Publish")',
      ':text("发布")',
      ':text("Publish")',
      'text=/发\\s*布/',
      'text=/P\\s*u\\s*b\\s*l\\s*i\\s*s\\s*h/i',
    ];
    let publishBtn = null;
    for (const selector of publishSelectors) {
      const hit = await findVisibleInFrames(selector);
      if (hit) {
        publishBtn = hit.locator;
        break;
      }
    }
    if (!publishBtn) {
      publishBtn = await findButtonByText(['发布', 'Publish']);
    }
    if (!publishBtn) {
      throw new Error('未找到发布按钮');
    }
    await publishBtn.click();
    await page.waitForSelector('.ant-message-success', { timeout: 20000 }).catch(() => {});

    await page.waitForTimeout(1500);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });

    const runtimeLocator = page.locator('[data-testid="menu-item--form-runtime"]');
    const runtimeMenu = (await pickVisible(runtimeLocator)) || runtimeLocator.first();
    await runtimeMenu.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    await runtimeMenu.click().catch(() => {});
    const submenuTitles = page.locator('.ant-menu-submenu-title, .el-submenu__title');
    const submenuCount = await submenuTitles.count().catch(() => 0);
    for (let i = 0; i < submenuCount; i += 1) {
      await submenuTitles.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(800);

    const menuTexts = [];
    if (formName) menuTexts.push(formName);
    if (formKey) {
      menuTexts.push(`运行表单：${formKey}`);
      menuTexts.push(`运行表单:${formKey}`);
      menuTexts.push(formKey);
    }

    let menuItem = null;
    for (const text of menuTexts) {
      const candidate = page.getByText(text, { exact: false }).first();
      if (await candidate.isVisible().catch(() => false)) {
        menuItem = candidate;
        break;
      }
    }

    let menuFoundByApi = false;
    if (!menuItem && formKey) {
      try {
        const apiResp = await page.request.get(`${BASE_URL}/jeecg-boot/sys/permission/getUserPermissionByToken`);
        if (apiResp.ok()) {
          const data = await apiResp.json();
          const payload = data?.result ?? data;
          const menuTree = Array.isArray(payload)
            ? payload
            : payload?.menu || payload?.result?.menu || payload?.data || [];
          const stack = [...menuTree];
          while (stack.length) {
            const node = stack.pop();
            if (!node) continue;
            if (node.url && node.url.includes(`/form/runtime/${formKey}/list`)) {
              menuFoundByApi = true;
              break;
            }
            if (Array.isArray(node.children)) {
              stack.push(...node.children);
            }
          }
        }
      } catch (err) {}
    }

    if (!menuItem && !menuFoundByApi) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-publish-menu-skip-${ts}.png`);
      await page.screenshot({ path: lastScreenshotPath, fullPage: true });
      writeResult({
        success: true,
        skipped: true,
        skipReason: 'menu_item_not_visible',
        formKey,
        formName,
        url: page.url(),
        screenshot: lastScreenshotPath,
        consoleErrors,
        pageErrors,
        failedRequests,
        runId: RUN_ID,
        mode: hasNewUi ? 'new-ui' : 'legacy-ui',
        menuFoundByApi: false,
        menuClicked: false,
      });
      return;
    }

    if (menuItem) {
      await menuItem.click();
      await page.waitForURL(new RegExp(`/form/runtime/${formKey}/list`), { timeout: ROUTE_TIMEOUT }).catch(() => {});
    } else {
      await page.goto(`${BASE_URL}/form/runtime/${formKey}/list`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    lastScreenshotPath = path.join(ARTIFACTS_DIR, `designer-publish-menu-${ts}.png`);
    await page.screenshot({ path: lastScreenshotPath, fullPage: true });

    writeResult({
      success: true,
      formKey,
      formName,
      url: page.url(),
      screenshot: lastScreenshotPath,
      consoleErrors,
      pageErrors,
      failedRequests,
      runId: RUN_ID,
      mode: hasNewUi ? 'new-ui' : 'legacy-ui',
      menuFoundByApi,
      menuClicked: Boolean(menuItem),
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
