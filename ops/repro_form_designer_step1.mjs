import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ROUTE_TIMEOUT = 60000;

const resolveRunId = () => {
  try {
    const raw = fs.readFileSync(path.resolve('.artifacts/last_run.json'), 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    if (parsed?.run_id) return parsed.run_id;
  } catch (err) {}
  return new Date().toISOString().replace(/[:.]/g, '-');
};

const RUN_ID = resolveRunId();
const ARTIFACTS_DIR = path.resolve(`.artifacts/mvp-9d-repair/${RUN_ID}/step1`);
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
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`[Browser PageError] ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    console.log(`[step1] Navigating to ${BASE_URL}/form/designer...`);
    const resp = await page.goto(`${BASE_URL}/form/designer`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    console.log(`[step1] Loaded: ${resp.status()} ${page.url()}`);
    console.log(`[step1] Title: ${await page.title()}`);

    // Immediate screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'loaded.png'), fullPage: true });

    // Check for login redirect
    if (page.url().includes('/login')) {
      throw new Error(`Redirected to login: ${page.url()}`);
    }

    // Check for 404/403
    if (await page.locator('.ant-result-404').isVisible()) throw new Error('Page 404 Not Found');
    if (await page.locator('.ant-result-403').isVisible()) throw new Error('Page 403 Forbidden');

    // 1. Assert UI elements
    console.log('[step1] Asserting UI elements...');
    
    // Wait for root - explicit check
    const root = page.locator('[data-testid="form-designer-root"]');
    try {
      await root.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.log('[step1] Root element not found. Dumping HTML...');
      const html = await page.content();
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dump.html'), html);
      console.log('[step1] HTML dumped to dump.html');
      throw e;
    }
    
    const requiredSelectors = [
      '[data-testid="btn-form-new"]',
      '[data-testid="input-form-name"]',
      '[data-testid="designer-canvas-root"]',
      '[data-testid="btn-form-save"]'
    ];

    for (const selector of requiredSelectors) {
      if (!(await page.isVisible(selector))) {
        throw new Error(`Missing required UI element: ${selector}`);
      }
    }

    // 2. Click "New Form" and verify empty state
    console.log('[step1] Clicking New Form...');
    await page.click('[data-testid="btn-form-new"]');
    await page.waitForTimeout(1000); 

    // Check data-empty
    const isEmptyAttr = await page.getAttribute('[data-testid="designer-canvas-root"]', 'data-empty');
    if (isEmptyAttr !== 'true') {
      console.warn(`[step1] Warning: data-empty is "${isEmptyAttr}". Expected "true".`);
    }

    // 3. Input name and save
    const formName = `AutoTestForm-${Date.now()}`;
    console.log(`[step1] Inputting name: ${formName}`);
    await page.fill('[data-testid="input-form-name"]', formName);
    
    console.log('[step1] Saving...');
    await page.click('[data-testid="btn-form-save"]');
    
    // 4. Assert success
    await page.waitForSelector('.ant-message-success', { timeout: 15000 }).catch(() => console.log('No toast found, checking URL...'));
    await page.waitForURL(/formKey=/, { timeout: 15000 });
    
    const currentUrl = page.url();
    const formKeyMatch = currentUrl.match(/formKey=([^&]+)/);
    if (!formKeyMatch) {
      throw new Error(`formKey not found in URL after save: ${currentUrl}`);
    }
    const formKey = decodeURIComponent(formKeyMatch[1]);
    console.log(`[step1] Form saved with key: ${formKey}`);

    // 5. Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'step1.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[step1] Screenshot saved to ${screenshotPath}`);

    writeResult({
      success: true,
      skipped: false,
      formKey,
      formName,
      url: currentUrl,
      screenshot: screenshotPath,
      consoleErrors
    });

  } catch (err) {
    console.error(`[step1] FAILED: ${err.message}`);
    const screenshotPath = path.join(ARTIFACTS_DIR, 'error_step1.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    writeResult({
      success: false,
      error: err.message,
      screenshot: screenshotPath,
      consoleErrors
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();