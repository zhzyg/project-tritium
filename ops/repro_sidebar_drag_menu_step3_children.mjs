import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';
const ADMIN_USER = process.env.OA_USER || 'admin';
const ADMIN_PASS = process.env.OA_PASS || '123456';
const STORAGE_STATE = process.env.OA_STORAGE_STATE;
const TS = Date.now();
const ARTIFACTS_DIR = path.resolve(`.artifacts/menu-drag-fix/${TS}`);

(async () => {
  if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const logFile = path.join(ARTIFACTS_DIR, 'console.log');
  fs.writeFileSync(logFile, '');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ storageState: STORAGE_STATE && fs.existsSync(STORAGE_STATE) ? STORAGE_STATE : undefined });
  const page = await context.newPage();

  page.on('console', msg => logStream.write(`[CONSOLE] ${msg.type()}: ${msg.text()}\n`));
  page.on('pageerror', err => logStream.write(`[PAGEERROR] ${err.message}\n`));

  // Network monitoring
  page.on('request', request => {
      if (request.url().includes('/sys/menuLayout/saveMine')) {
          console.log('Capture saveMine request');
          const postData = request.postData();
          fs.writeFileSync(path.join(ARTIFACTS_DIR, 'save_payload.json'), postData || '');
      }
  });

  page.on('response', async response => {
      if (response.url().includes('/sys/menuLayout/saveMine')) {
          console.log('Capture saveMine response');
          try {
            const body = await response.json();
            fs.writeFileSync(path.join(ARTIFACTS_DIR, 'save_resp.json'), JSON.stringify(body, null, 2));
          } catch(e) {
            fs.writeFileSync(path.join(ARTIFACTS_DIR, 'save_resp.txt'), `Error parsing JSON: ${e.message}`);
          }
      }
  });

  let success = false;
  try {
    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    if (page.url().includes('/login')) {
       throw new Error('Login failed or session expired');
    }

    console.log('Checking Sidebar...');
    const sidebar = page.locator('[data-testid="sidebar"], .ant-layout-sider').first();
    await sidebar.waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sidebar_before.png') });

    console.log('Enabling Edit Mode...');
    const editBtn = page.locator('text="调整菜单"').first();
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();
    await page.waitForSelector('[data-testid="sidebar-edit-list"]');

    console.log('Finding a menu with children...');
    const childrenContainers = page.locator('.menu-children');
    const count = await childrenContainers.count();
    
    let targetContainer = null;
    let targetParentText = '';

    for (let i = 0; i < count; i++) {
        const container = childrenContainers.nth(i);
        const childrenItems = container.locator('[data-testid="menu-editor-item-content"]');
        const childCount = await childrenItems.count();
        
        if (childCount >= 2) {
            const parentItem = container.locator('xpath=..');
            const parentContent = parentItem.locator('.menu-content').first();
            const text = (await parentContent.locator('span:nth-child(2)').textContent()).trim();
            
            if (text.includes('仪表盘') || text.includes('Dashboard')) continue;
            
            targetContainer = container;
            targetParentText = text;
            break;
        }
    }

    if (!targetContainer) throw new Error('Could not find a submenu with at least 2 children');

    // Capture Before Order
    const childrenItems = targetContainer.locator('[data-testid="menu-editor-item-content"]');
    const item1 = childrenItems.nth(0);
    const item2 = childrenItems.nth(1);
    const text1 = (await item1.locator('span:nth-child(2)').textContent()).trim();
    const text2 = (await item2.locator('span:nth-child(2)').textContent()).trim();
    console.log(`Swapping children: "${text1}" and "${text2}"`);
    
    // Save before state
    const beforeOrder = await childrenItems.allInnerTexts();
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'reload_menu_before.json'), JSON.stringify(beforeOrder, null, 2));

    const box1 = await item1.boundingBox();
    const box2 = await item2.boundingBox();

    if (box1 && box2) {
        await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
        await page.mouse.down();
        await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height, { steps: 20 });
        await page.mouse.up();
        await page.waitForTimeout(1000);
    }

    // Capture After Drag (Before Save)
    const afterOrder = await childrenItems.allInnerTexts();
    if (afterOrder[0].includes(text1)) {
         console.log('⚠️ Drag might have failed visually. Trying reverse...');
         // Force try
         const box1b = await item1.boundingBox();
         const box2b = await item2.boundingBox();
         if (box1b && box2b) {
             await page.mouse.move(box2b.x + box2b.width / 2, box2b.y + box2b.height / 2);
             await page.mouse.down();
             await page.mouse.move(box1b.x + box1b.width / 2, box1b.y, { steps: 20 }); 
             await page.mouse.up();
             await page.waitForTimeout(1000);
         }
    }

    console.log('Clicking "Done" (完成)...');
    await page.click('[data-testid="btn-sidebar-menu-edit"]');
    await page.waitForTimeout(3000); // Wait for API

    console.log('Reloading to verify persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait for sidebar async load
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sidebar_after.png') });

    // Verify in Normal Menu
    console.log(`Locating parent "${targetParentText}"...`);
    const reloadedParentTitle = page.locator(`.ant-menu-submenu-title:has-text("${targetParentText}")`).first();
    
    // Ensure visible and click if needed
    if (await reloadedParentTitle.isVisible()) {
        await reloadedParentTitle.click();
        await page.waitForTimeout(1000);
    } else {
        console.log('Parent menu not visible, trying to scroll sidebar...');
        // Simple scroll attempt
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(1000);
        if (await reloadedParentTitle.isVisible()) {
             await reloadedParentTitle.click();
             await page.waitForTimeout(1000);
        } else {
             throw new Error('Could not find parent menu after reload');
        }
    }

    const reloadedParentLi = reloadedParentTitle.locator('xpath=..');
    const reloadedChildren = reloadedParentLi.locator('.ant-menu-sub .ant-menu-item');
    const firstChildText = (await reloadedChildren.nth(0).innerText()).trim();
    console.log(`First child after reload: "${firstChildText}"`);
    
    const reloadedOrder = await reloadedChildren.allInnerTexts();
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'reload_menu_after.json'), JSON.stringify(reloadedOrder, null, 2));

    const result = {
        expectedFirst: text2,
        actualFirst: firstChildText,
        match: (firstChildText === text2 || firstChildText.includes(text2))
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'result.json'), JSON.stringify(result, null, 2));

    if (result.match) {
        console.log('✅ Persistence Verified: Submenu order changed/preserved.');
        success = true;
    } else {
        console.log(`⚠️ Persistence Check Failed: Expected "${text2}", got "${firstChildText}"`);
    }

  } catch (e) {
    console.log(`FAILURE: ${e.message}`);
    logStream.write(`[SCRIPT_ERROR] ${e.message}\n`);
    success = false;
  } finally {
    logStream.end();
    await browser.close();
    process.exit(success ? 0 : 1);
  }
})();