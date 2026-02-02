import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const ARTIFACT_DIR = process.env.ART_DIR || '/tmp/tritium_browser_artifacts';

(async () => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMessages = [];
    const networkErrors = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    page.on('requestfailed', request => networkErrors.push(`${request.method()} ${request.url()} ${request.failure().errorText}`));

    try {
        await page.goto('https://example.com', { timeout: 60000 });
        await page.screenshot({ path: `${ARTIFACT_DIR}/001_example.png` });
        const content = await page.content();
        writeFileSync(`${ARTIFACT_DIR}/001_content_head.html`, content.slice(0, 200 * 1024));
        const diagnostics = `
Console Messages:
${consoleMessages.join('\n')}

Network Errors:
${networkErrors.join('\n')}
        `;
        writeFileSync(`${ARTIFACT_DIR}/001_console_and_network.txt`, diagnostics);
    } catch (error) {
        console.error('Smoke screenshot failed:', error);
        writeFileSync(`${ARTIFACT_DIR}/999_fatal.txt`, error.stack);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
