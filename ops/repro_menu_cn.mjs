import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ROUTE_TIMEOUT_MS = Number.parseInt(process.env.ROUTE_TIMEOUT_MS || '', 10);
const ROUTE_TIMEOUT = Number.isFinite(ROUTE_TIMEOUT_MS) ? ROUTE_TIMEOUT_MS : 60000;
const SCREENSHOT_TIMEOUT_MS = Number.parseInt(process.env.SCREENSHOT_TIMEOUT_MS || '', 10);
const SCREENSHOT_TIMEOUT = Number.isFinite(SCREENSHOT_TIMEOUT_MS) ? SCREENSHOT_TIMEOUT_MS : 15000;
const SHELL_SELECTOR = '.ant-layout, .ant-menu, .ant-layout-sider';

const ARTIFACTS_DIR = path.resolve('.artifacts/menu-cn');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const writeResult = (payload) => {
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(payload, null, 2));
};

const pickVisible = async (locator) => {
  const count = await locator.count();
  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible()) {
      return candidate;
    }
  }
  return null;
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = fs.existsSync(OA_STORAGE_STATE)
    ? await browser.newContext({ storageState: OA_STORAGE_STATE })
    : await browser.newContext();
  const page = await context.newPage();
  let lastScreenshotPath = path.join(ARTIFACTS_DIR, 'menu-cn.png');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    await page.waitForSelector(SHELL_SELECTOR, { state: 'visible', timeout: ROUTE_TIMEOUT });

    const dashboardLocator = page.locator('[data-testid="menu-item--dashboard"]');
    const dashboardMenu = (await pickVisible(dashboardLocator)) || dashboardLocator.first();
    await dashboardMenu.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    const dashboardText = (await dashboardMenu.innerText()).trim();
    if (!dashboardText.includes('仪表盘')) {
      throw new Error(`仪表盘菜单文本异常: ${dashboardText}`);
    }

    const runtimeLocator = page.locator('[data-testid="menu-item--form-runtime"]');
    const runtimeMenu = (await pickVisible(runtimeLocator)) || runtimeLocator.first();
    await runtimeMenu.waitFor({ state: 'visible', timeout: ROUTE_TIMEOUT });
    const runtimeText = (await runtimeMenu.innerText()).trim();
    if (!runtimeText.includes('应用运行')) {
      throw new Error(`应用运行菜单文本异常: ${runtimeText}`);
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    lastScreenshotPath = path.join(ARTIFACTS_DIR, `sidebar-${ts}.png`);
    await page.addStyleTag({ content: '*{font-family:Arial, sans-serif !important;}' }).catch(() => {});
    const sidebar = page.locator('.ant-layout-sider');
    let screenshotDone = false;
    let screenshotError = '';
    if (await sidebar.count()) {
      try {
        await sidebar.first().screenshot({ path: lastScreenshotPath, timeout: SCREENSHOT_TIMEOUT });
        screenshotDone = true;
      } catch (err) {
        screenshotError = err?.message || 'sidebar screenshot failed';
      }
    }
    if (!screenshotDone) {
      try {
        await page.screenshot({ path: lastScreenshotPath, timeout: SCREENSHOT_TIMEOUT });
        screenshotDone = true;
      } catch (err) {
        screenshotError = screenshotError || err?.message || 'page screenshot failed';
      }
    }

    writeResult({
      success: true,
      screenshot: lastScreenshotPath,
      url: page.url(),
      screenshotError: screenshotError || undefined,
    });
  } catch (err) {
    const message = err?.message || 'unknown error';
    try {
      await page.addStyleTag({ content: '*{font-family:Arial, sans-serif !important;}' }).catch(() => {});
      await page.screenshot({ path: lastScreenshotPath, timeout: SCREENSHOT_TIMEOUT });
    } catch (e) {}
    writeResult({ success: false, error: message, screenshot: lastScreenshotPath, url: page.url() });
    console.error(`FAILURE: ${message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
