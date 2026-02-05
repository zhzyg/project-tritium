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
const ARTIFACTS_DIR = path.resolve(`.artifacts/mvp-9d-repair/${RUN_ID}/step3`);
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
    // 1. Create a form
    console.log(`[step3] Creating form...`);
    await page.goto(`${BASE_URL}/form/designer`, { waitUntil: 'domcontentloaded', timeout: ROUTE_TIMEOUT });
    
    await page.click('[data-testid="btn-form-new"]');
    await page.waitForTimeout(500);

    const formName = `MenuTest-${Date.now()}`;
    await page.fill('[data-testid="input-form-name"]', formName);
    await page.click('[data-testid="btn-form-save"]');
    
    await page.waitForURL(/formKey=/, { timeout: 15000 });
    const currentUrl = page.url();
    const formKeyMatch = currentUrl.match(/formKey=([^&]+)/);
    const formKey = decodeURIComponent(formKeyMatch[1]);
    console.log(`[step3] Created form: ${formName} (${formKey})`);

    // 2. Publish
    console.log(`[step3] Publishing...`);
    await page.click('[data-testid="btn-form-publish"]');
    await page.waitForSelector('.ant-message-success', { timeout: 20000 });
    console.log(`[step3] Publish success toast appeared.`);
    
    await page.waitForTimeout(3000); 

    // 3. Find Sidebar Menu (Non-fatal)
    console.log(`[step3] Searching sidebar for "${formName}"...`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const partialMenuText = formName;
    console.log(`[step3] Waiting for menu text to exist in DOM...`);
    let menuFound = false;
    try {
        await page.waitForSelector(`text="${partialMenuText}"`, { state: 'attached', timeout: 15000 });
        menuFound = true;
    } catch (e) {
        console.warn(`[step3] Menu text "${partialMenuText}" not found via selector. Manual navigation will follow.`);
    }

    if (menuFound) {
        const candidates = [
            page.locator('.ant-menu-title-content').filter({ hasText: partialMenuText }),
            page.locator('.jeecg-simple-menu-sub-title').filter({ hasText: partialMenuText }),
            page.locator('span').filter({ hasText: partialMenuText })
        ];

        let menuItem = null;
        for (const locator of candidates) {
            if (await locator.count() > 0) {
                menuItem = locator.first();
                break;
            }
        }

        if (menuItem) {
            if (!await menuItem.isVisible()) {
                console.log('[step3] Menu item hidden. Attempting to expand "应用运行"...');
                const parentSelectors = ['span:text-is("应用运行")', 'span:text-is("App Runtime")'];
                for (const pSel of parentSelectors) {
                     const p = page.locator(pSel).first();
                     if (await p.isVisible().catch(()=>false)) {
                         await p.click();
                         await page.waitForTimeout(1000);
                         break;
                     }
                }
            }
            
            if (await menuItem.isVisible()) {
                 console.log('[step3] Clicking menu item...');
                 await menuItem.click();
            } else {
                 console.warn('[step3] Menu item still hidden. Manual navigation...');
                 await page.goto(`${BASE_URL}/form/runtime/${formKey}/list`);
            }
        } else {
            console.warn('[step3] Locator failed. Manual navigation...');
            await page.goto(`${BASE_URL}/form/runtime/${formKey}/list`);
        }
    } else {
        await page.goto(`${BASE_URL}/form/runtime/${formKey}/list`);
    }

    // 4. Verify Runtime Page
    console.log(`[step3] Verifying runtime page...`);
    await page.waitForURL(/\/form\/runtime\/.*\/list/, { timeout: 15000 });
    console.log(`[step3] URL match: ${page.url()}`);

    // 5. Check "Design Form" button
    console.log(`[step3] Checking "Design Form" button...`);
    const designBtn = page.locator('[data-testid="btn-go-designer"]');
    await designBtn.waitFor({ state: 'visible', timeout: 10000 });
    
    // 6. Click it
    console.log(`[step3] Clicking "Design Form"...`);
    await designBtn.click();
    
    // 7. Verify back in designer and CONTENT LOADED
    console.log(`[step3] Verifying designer content...`);
    await page.waitForURL(/\/form\/designer/, { timeout: 15000 });
    const designerUrl = page.url();
    if (!designerUrl.includes(formKey)) {
        throw new Error(`Designer URL mismatch. Expected formKey=${formKey}, Got: ${designerUrl}`);
    }
    
    const nameInput = page.locator('[data-testid="input-form-name"]');
    await nameInput.waitFor();
    // Wait for async backend load
    await page.waitForTimeout(3000);
    const loadedName = await nameInput.inputValue();
    console.log(`[step3] Loaded form name: "${loadedName}"`);
    
    if (!loadedName || loadedName === '') {
        throw new Error(`Form name is empty. Form failed to load content.`);
    }
    
    if (loadedName !== formName) {
        throw new Error(`Form name mismatch. Expected "${formName}", Got "${loadedName}". Might have loaded wrong data or blank template.`);
    }

    console.log(`[step3] SUCCESS: Form content loaded correctly from published state.`);

    // Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'step3_success.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    writeResult({
      success: true,
      formKey,
      formName,
      screenshot: screenshotPath,
      consoleErrors
    });

  } catch (err) {
    console.error(`[step3] FAILED: ${err.message}`);
    const screenshotPath = path.join(ARTIFACTS_DIR, 'error_step3.png');
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