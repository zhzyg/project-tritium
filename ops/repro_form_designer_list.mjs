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
const ARTIFACTS_DIR = path.resolve(`.artifacts/mvp-9d-repair/${RUN_ID}/step2`);
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
    // 1. Create a draft first
    console.log(`[step2] Creating draft...`);
    await page.goto(`${BASE_URL}/form/designer`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    
    // Ensure we are in "New" mode
    await page.click('[data-testid="btn-form-new"]');
    await page.waitForTimeout(500);

    const formName = `ListTest-${Date.now()}`;
    await page.fill('[data-testid="input-form-name"]', formName);
    await page.click('[data-testid="btn-form-save"]');
    
    await page.waitForURL(/formKey=/, { timeout: 15000 });
    const currentUrl = page.url();
    const formKeyMatch = currentUrl.match(/formKey=([^&]+)/);
    const formKey = decodeURIComponent(formKeyMatch[1]);
    console.log(`[step2] Created draft: ${formName} (${formKey})`);

    // 2. Switch to List Tab
    console.log(`[step2] Switching to List Tab...`);
    await page.click('[data-testid="tab-form-list"]');
    await page.waitForSelector('[data-testid="form-list-root"]');

    // Dump HTML to debug selector issues
    const html = await page.content();
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'list_tab.html'), html);

    // 3. Filter by Draft
    console.log(`[step2] Filtering by Draft...`);
    // Try simpler selector if testid fails, but prefer debugging why testid fails
    try {
      await page.click('[data-testid="filter-status-draft"]', { timeout: 5000 });
    } catch (e) {
      console.log('[step2] data-testid not found, trying text "草稿"...');
      await page.getByText('草稿').click();
    }
    
    await page.waitForTimeout(1000); // Wait for filter to apply (client side)

    // 4. Find row
    console.log(`[step2] Finding row for ${formKey}...`);
    const editBtnSelector = `[data-testid="btn-form-list-edit-${formKey}"]`;
    
    // Wait for table to possibly reload/filter
    await page.waitForSelector(editBtnSelector, { timeout: 10000 }).catch(async () => {
        console.log('[step2] Row not found immediately. Clicking Refresh...');
        await page.click('[data-testid="btn-form-list-refresh"]');
        await page.waitForTimeout(2000);
        
        // Log all visible rows keys
        const buttons = await page.$$('[data-testid^="btn-form-list-edit-"]');
        console.log(`[step2] Found ${buttons.length} edit buttons in list.`);
        for (const btn of buttons) {
            const id = await btn.getAttribute('data-testid');
            console.log(`[step2] Visible Row: ${id}`);
        }
    });

    const editBtn = page.locator(editBtnSelector);
    if (!(await editBtn.isVisible())) {
      const screenshotPath = path.join(ARTIFACTS_DIR, 'list_fail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      throw new Error(`Row for formKey ${formKey} not found in list. Screenshot saved.`);
    }

    // 5. Click Edit
    console.log(`[step2] Clicking Edit...`);
    await editBtn.click();

    // 6. Assert Editor Loaded
    console.log(`[step2] Verifying editor loaded...`);
    // Tab should switch back to 'form'
    await page.waitForSelector('[data-testid="form-designer-root"]');
    
    // Check name input value
    const nameInput = page.locator('[data-testid="input-form-name"]');
    await nameInput.waitFor();
    const loadedName = await nameInput.inputValue();
    
    if (loadedName !== formName) {
      throw new Error(`Loaded name mismatch. Expected: ${formName}, Got: ${loadedName}`);
    }
    console.log(`[step2] Name matched: ${loadedName}`);

    // Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'step2_success.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[step2] Screenshot saved to ${screenshotPath}`);

    writeResult({
      success: true,
      formKey,
      formName,
      screenshot: screenshotPath,
      consoleErrors
    });

  } catch (err) {
    console.error(`[step2] FAILED: ${err.message}`);
    const screenshotPath = path.join(ARTIFACTS_DIR, 'error_step2.png');
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