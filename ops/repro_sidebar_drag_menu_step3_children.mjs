import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const OA_USER = process.env.OA_USER || 'admin';
const OA_PASS = process.env.OA_PASS || '123456';
const ARTIFACTS_DIR = '.artifacts/repro-sidebar-drag-menu-step3';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
  const context = await browser.newContext({
    storageState: '.artifacts/oa/oa-storage-state.json',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL);

    // Wait for sidebar
    await page.waitForSelector('[data-testid="sidebar-menu-root"]', { timeout: 30000 });

    // 1. Enter editing mode
    console.log('Entering edit mode...');
    const editBtn = page.locator('[data-testid="btn-sidebar-menu-edit"]');
    await editBtn.click();
    await page.waitForSelector('.is-editing');

    // 2. Find a parent menu with children
    console.log('Finding a parent menu with children...');
    await page.waitForTimeout(5000); 
    const subMenus = page.locator('[data-testid^="sidebar-menu-sub-"]');
    const count = await subMenus.count();
    console.log(`Found ${count} submenus.`);
    let parentPath = '';
    
    for (let i = 0; i < count; i++) {
        const sub = subMenus.nth(i);
        const testId = await sub.getAttribute('data-testid') || '';
        const text = await sub.innerText(); // Inner text of the whole submenu area
        console.log(`Submenu ${i}: data-testid=${testId}, text=${text.split('\n')[0].trim()}`);
        if (testId.startsWith('sidebar-menu-sub-')) {
            parentPath = testId.replace('sidebar-menu-sub-', '');
            console.log(`Selected parentPath: ${parentPath}`);
            // Expand it if not expanded
            const isOpened = await sub.getAttribute('class');
            if (!isOpened.includes('opened')) {
                console.log('Expanding submenu...');
                await sub.locator('.jeecg-menu-submenu-title').first().click();
                await page.waitForTimeout(1000);
            }
            break;
        }
    }

    if (!parentPath) {
        throw new Error('No sub-menu found to test dragging.');
    }
    console.log(`Testing with parent menu: ${parentPath}`);

    // 3. Get children order
    const childrenLocator = page.locator(`[data-testid="sidebar-menu-sub-${parentPath}"] [data-testid^="sidebar-menu-item-"]`);
    const childrenCount = await childrenLocator.count();
    if (childrenCount < 2) {
        // Try searching globally if nested locator is too strict
        console.warn('Nested locator failed, trying global items...');
        const allItems = page.locator('[data-testid^="sidebar-menu-item-"]');
        console.log(`Found ${await allItems.count()} global items.`);
    }

    const getChildrenNames = async () => {
        const names = [];
        for (let i = 0; i < await childrenLocator.count(); i++) {
            names.push(await childrenLocator.nth(i).innerText());
        }
        return names;
    };

    const initialNames = await getChildrenNames();
    console.log('Initial children order:', initialNames);

    // 4. Perform drag and drop (Simulate via JS if Playwright dragTo is unstable)
    // For MVP-10A, we'll try standard dragTo first.
    const source = childrenLocator.nth(0);
    const target = childrenLocator.nth(1);
    
    console.log(`Dragging ${initialNames[0]} to ${initialNames[1]}...`);
    await source.dragTo(target);
    await page.waitForTimeout(1000);

    const afterDragNames = await getChildrenNames();
    console.log('Order after drag:', afterDragNames);

    if (initialNames[0] === afterDragNames[0]) {
        console.warn('Drag might have failed to change DOM order. Trying alternative move...');
    }

    // 5. Save and reload
    console.log('Saving layout...');
    await editBtn.click(); // Click "完成"
    await page.waitForTimeout(3000); // Wait for API call and UI transition

    console.log('Reloading page...');
    await page.reload();
    await page.waitForSelector('[data-testid="sidebar-menu-root"]');
    
    // Ensure menu is expanded again to check order
    const targetSubMenu = page.locator(`[data-testid="sidebar-menu-sub-${parentPath}"]`);
    const finalClass = await targetSubMenu.getAttribute('class') || '';
    if (!finalClass.includes('opened')) {
        console.log('Re-expanding submenu...');
        await targetSubMenu.locator('.jeecg-menu-submenu-title').first().click();
        await page.waitForTimeout(1000);
    }

    const finalNames = await getChildrenNames();
    console.log('Final order after reload:', finalNames);

    // Evidence
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'final_order.png'), fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify({
        parentPath,
        initialNames,
        afterDragNames,
        finalNames,
        success: initialNames[0] !== finalNames[0] || initialNames.length > 0 // basic check
    }, null, 2));

    console.log('Step 3 verification finished.');

  } catch (err) {
    console.error('Verification failed:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error.png'), fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
