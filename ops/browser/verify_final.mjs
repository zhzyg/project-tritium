import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'https://oa.donaldzhu.com';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Admin#2026!Reset';
const ARTIFACT_DIR = 'run_results_final';

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
    const page = await browser.newPage();

    console.log('1. Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    
    console.log('2. Filling login form...');
    await page.locator('input[placeholder*="账号"]').first().fill(ADMIN_USER);
    await page.locator('input[placeholder*="密码"]').first().fill(ADMIN_PASS);
    
    const captcha = getCaptcha();
    if (captcha) {
        console.log('Captcha:', captcha);
        await page.locator('input[placeholder*="验证码"]').first().fill(captcha);
    }
    
    await page.click('button:has-text("登录"), button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log('3. Navigating to /bpm/my...');
    await page.goto(`${BASE_URL}/#/bpm/my`);
    await page.waitForTimeout(10000); // Wait for async data
    
    const screenshotPath = `${ARTIFACT_DIR}/bpm_my_page.png`;
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to', screenshotPath);

    const content = await page.content();
    const hasTitle = content.includes('我发起的流程');
    const hasTable = content.includes('ant-table') || content.includes('el-table');
    
    console.log('Verification Results:');
    console.log('- Title "我发起的流程" present:', hasTitle);
    console.log('- Table present:', hasTable);
    
    if (hasTitle && hasTable) {
        console.log('SUCCESS: Page is rendering correctly.');
    } else {
        console.log('FAILURE: Page still empty or title missing.');
        // Log more details
        const text = await page.innerText('body');
        console.log('Body Text length:', text.length);
        console.log('Body Text start:', text.slice(0, 200).replace(/\n/g, ' '));
    }

    await browser.close();
})();
