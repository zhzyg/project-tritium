import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'https://oa.donaldzhu.com';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Admin#2026!Reset';
const ARTIFACT_DIR = 'run_results'; // Relative to ops/browser

function getCaptcha() {
    try {
        const captchaLine = execSync(`journalctl -u tritium-backend.service -n 50 --no-pager | grep --text "checkCode =" | tail -n 1 || true`).toString();
        const captcha = captchaLine.match(/checkCode = ([A-Za-z0-9]+)/);
        return captcha ? captcha[1] : null;
    } catch (error) {
        return null;
    }
}

(async () => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    page.on('console', msg => console.log(`PAGE LOG: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));

    try {
        console.log('Navigating to login page...');
        await page.goto(`${BASE_URL}/login`, { timeout: 60000 });
        
        console.log('Filling credentials...');
        // Use first() to avoid ambiguity if there are multiple forms
        await page.locator('input[placeholder*="账号"], input[placeholder*="用户名"]').first().fill(ADMIN_USER);
        await page.locator('input[placeholder*="密码"]').first().fill(ADMIN_PASS);

        const captcha = getCaptcha();
        if (captcha) {
            console.log('Captcha acquired:', captcha);
            await page.locator('input[placeholder*="验证码"]').first().fill(captcha);
        }

        await page.click('button:has-text("登录"), button[type="submit"]');
        
        console.log('Waiting for login redirect...');
        await page.waitForTimeout(5000); 

        console.log('Directly navigating to "My Started" page...');
        await page.goto(`${BASE_URL}/#/bpm/my-started`);
        
        await page.waitForTimeout(8000); // Give plenty of time for rendering
        
        await page.screenshot({ path: `${ARTIFACT_DIR}/my_started_rendering.png` });
        
        const content = await page.content();
        const hasTestId = content.includes('data-testid="bpm-my-page"');
        const hasTitle = content.includes('我发起的流程');
        const hasTable = content.includes('ant-table') || content.includes('el-table');
        
        console.log('--- FINAL VERIFICATION ---');
        console.log('URL:', page.url());
        console.log('Has testid:', hasTestId);
        console.log('Has "我发起的流程":', hasTitle);
        console.log('Has table element:', hasTable);
        
        if (hasTitle && hasTable) {
            console.log('VERIFICATION SUCCESS: Page rendered correctly.');
        } else {
            console.log('VERIFICATION FAILURE: Page still looks empty/broken.');
            // Dump partial HTML for debugging
            const bodyHtml = await page.evaluate(() => document.body.innerHTML);
            console.log('Body HTML preview:', bodyHtml.slice(0, 500));
        }

    } catch (error) {
        console.error('Script error:', error);
    } finally {
        await browser.close();
    }
})();