import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';
const ARTIFACTS_DIR = '.artifacts/repro-form-process-approver';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined
  });

  const page = await context.newPage();
  const formKey = `test_process_approver_${Date.now()}`;

  try {
    console.log(`Navigating to Process Designer for formKey: ${formKey}`);
    await page.goto(`${BASE_URL}/form/designer?tab=process&formKey=${formKey}`, { waitUntil: 'networkidle' });

    await page.waitForSelector('[data-testid="process-designer-root"]', { timeout: 30000 });
    console.log('Designer loaded');

    // 2. Insert Sample Task if needed
    let tasks = page.locator('[data-testid^="task-rule-task-"]');
    let taskCount = await tasks.count();
    console.log(`Initial task count: ${taskCount}`);

    if (taskCount === 0) {
      console.log('Inserting sample user task...');
      const btn = page.locator('[data-testid="btn-insert-sample-usertask"]');
      if (await btn.isVisible()) {
          await btn.click();
      }
      await page.waitForTimeout(3000); 
      taskCount = await tasks.count();
      console.log(`Task count after insert: ${taskCount}`);
    }

    if (taskCount === 0) {
        const html = await page.content();
        fs.writeFileSync(path.join(ARTIFACTS_DIR, 'debug_page.html'), html);
        console.log('Dumped HTML to debug_page.html');
        throw new Error('Failed to create/find user tasks');
    }

    // ... rest of script ...
    // (abbreviated for speed, I just want to see if I get past this)
    console.log('Selecting user task...');
    await page.click('[data-testid="task-rule-task-0"]');
    
    // Check JSelectUser persistence
    const userSelector = page.locator('[data-testid="node-approver-users"]');
    await userSelector.waitFor({ state: 'visible' });
    
    // Mock user selection by manually setting value via eval if UI interaction is hard?
    // No, I need to trigger the change event.
    // I'll try to just save and verify reload (even if empty, just to prove flow works)
    
    console.log('Saving...');
    await page.click('[data-testid="btn-bpmn-save"]');
    await page.waitForTimeout(2000);
    
    console.log('Reloading...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="process-designer-root"]');
    await page.waitForSelector('[data-testid="task-rule-task-0"]');
    await page.click('[data-testid="task-rule-task-0"]');
    await page.waitForTimeout(500);
    
    // Assert existence
    if (await userSelector.isVisible()) {
        console.log('SUCCESS: Selectors visible after reload');
    }

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();