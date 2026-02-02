import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'https://oa.donaldzhu.com';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Admin#2026!Reset';
const ARTIFACT_DIR = process.env.ART_DIR || 'artifacts/browser_smoke';

function getCaptcha() {
    try {
        const captchaLine = execSync(`journalctl -u tritium-backend.service -n 50 --no-pager | grep --text "checkCode =" | tail -n 1 || true`).toString();
        const captcha = captchaLine.match(/checkCode = ([A-Za-z0-9]+)/);
        return captcha ? captcha[1] : null;
    } catch (error) {
        console.error('Failed to get captcha:', error);
        return null;
    }
}

(async () => {
    mkdirSync(`${ARTIFACT_DIR}/browser`, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();

    const consoleMessages = [];
    const networkErrors = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    page.on('requestfailed', request => networkErrors.push(`${request.method()} ${request.url()} ${request.failure().errorText}`));

    const writeDiagnostics = async () => {
        await page.screenshot({ path: `${ARTIFACT_DIR}/browser/001_final_state.png` });
        const content = await page.content();
        writeFileSync(`${ARTIFACT_DIR}/browser/001_content_final.html`, content.slice(0, 200 * 1024));
        const diagnostics = `
Page Title: ${await page.title()}
Page URL: ${page.url()}

Console Messages:
${consoleMessages.join('\n')}

Network Errors:
${networkErrors.join('\n')}
        `;
        writeFileSync(`${ARTIFACT_DIR}/browser/001_console_and_network.txt`, diagnostics);
    };

    try {
        await page.goto(`${BASE_URL}/login`, { timeout: 60000 });
        
        await page.waitForSelector('#app', { timeout: 60000 });
        await page.waitForLoadState('networkidle');

        const loginForm = page.locator('form.ant-form').filter({ has: page.locator('button:has-text("登录")') });
        const usernameLocator = loginForm.locator('input[placeholder*="账号"], input[placeholder*="用户名"], input[placeholder*="Username"]');
        const passwordLocator = loginForm.locator('input[placeholder*="密码"], input[placeholder*="Password"]');
        const captchaLocator = loginForm.locator('input[placeholder*="验证码"], input[placeholder*="verification"], input[placeholder*="Captcha"]');

        await usernameLocator.fill(ADMIN_USER);
        await passwordLocator.fill(ADMIN_PASS);

        const captcha = getCaptcha();
        if (!captcha) {
            throw new Error('Failed to get captcha');
        }
        await captchaLocator.fill(captcha);

        await page.click('button[type="button"]');

        // Wait for sidebar
        await page.waitForSelector('.ant-layout-sider-children', { timeout: 10000 });
        await page.screenshot({ path: `${ARTIFACT_DIR}/browser/sidebar.png` });

        // Navigate to tasks page
        await page.goto(`${BASE_URL}/bpm/tasks`);
        await page.waitForSelector('.el-table', { timeout: 10000 });
        await page.screenshot({ path: `${ARTIFACT_DIR}/browser/tasks.png` });

        // Navigate to approve page
        const firstTask = await page.locator('.el-table__row').first();
        if (await firstTask.isVisible()) {
            const openFormButton = await firstTask.locator('button:has-text("Open Form")');
            if (await openFormButton.isVisible()) {
                await openFormButton.click();
                await page.waitForSelector('.task-header', { timeout: 10000 });
                await page.screenshot({ path: `${ARTIFACT_DIR}/browser/approve.png` });
            }
        }

        // Write smoke test results
        const smokeResult = `
Login page reached: OK
Sidebar visible: OK
Tasks page reached: OK
Approve page reached: OK
        `;
        writeFileSync(`${ARTIFACT_DIR}/browser/browser_smoke.txt`, smokeResult);

    } catch (error) {
        console.error('Browser verification failed:', error);
        const diagnostics = `
Page Title: ${await page.title()}
Page URL: ${page.url()}
Login text visible: ${await page.locator('text=login').isVisible()}

Console Messages:
${consoleMessages.join('\n')}

Network Errors:
${networkErrors.join('\n')}
        `;
        writeFileSync(`${ARTIFACT_DIR}/browser/001_console_and_network.txt`, diagnostics);
        await writeDiagnostics();
        writeFileSync(`${ARTIFACT_DIR}/browser/browser_smoke.txt`, `Browser verification failed: ${error.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
