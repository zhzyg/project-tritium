import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://oa.donaldzhu.com';
const OA_STORAGE_STATE = process.env.OA_STORAGE_STATE || '.artifacts/oa/oa-storage-state.json';

const ARTIFACTS_DIR = '.artifacts/repro-sidebar-drag-menu-step1';
if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: OA_STORAGE_STATE });
    const page = await context.newPage();

    try {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // 1. Enter edit mode
        await page.waitForSelector('[data-testid="btn-sidebar-menu-edit"]');
        await page.click('[data-testid="btn-sidebar-menu-edit"]');
        await page.waitForSelector('[data-testid="marker-sidebar-editing"]');
        console.log('Entered edit mode.');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'before.png') });

        // 2. Drag and drop
        const menuItems = await page.locator('[data-testid^="sidebar-menu-item-"]');
        const firstMenuItem = menuItems.first();
        const secondMenuItem = menuItems.nth(1);

        const firstBox = await firstMenuItem.boundingBox();
        const secondBox = await secondMenuItem.boundingBox();

        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2, { steps: 5 });
        await page.mouse.up();
        
        console.log('Dragged second menu item before first one.');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'after.png') });

        // 3. Exit edit mode
        await page.click('[data-testid="btn-sidebar-menu-edit"]');
        await page.waitForSelector(':not([data-testid="marker-sidebar-editing"])');
        console.log('Exited edit mode.');

        fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify({ success: true }));

    } catch (error) {
        console.error(error);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error.png') });
        fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
