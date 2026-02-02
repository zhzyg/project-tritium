import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Use Dev Server port
const BASE_URL = 'http://127.0.0.1:3100';
const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456'; // Mock password
const ARTIFACTS_DIR = path.resolve('.artifacts/repro-bpm-my');

(async () => {
  if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'console.log'), '');
  const logStream = fs.createWriteStream(path.join(ARTIFACTS_DIR, 'console.log'), { flags: 'a' });
  
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    logStream.write(`[CONSOLE] ${msg.type()}: ${msg.text()}\n`);
    if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
      logStream.write(`[PAGEERROR] ${err.message}\n`);
      console.log(`[PAGE ERROR] ${err.message}`);
  });
  page.on('requestfailed', req => {
      // Ignore analytics
      if (!req.url().includes('baidu.com')) {
        logStream.write(`[REQUESTFAILED] ${req.url()} ${req.failure()?.errorText}\n`);
      }
  });

  try {
    console.log(`Navigating to Login at ${BASE_URL}...`);
    await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle' });

    await page.waitForSelector('input[placeholder*="账号"]', { state: 'visible', timeout: 5000 });
    
    // Fill credentials
    const userField = page.locator('input[placeholder*="账号"]:visible, input[placeholder*="Username"]:visible');
    const passField = page.locator('input[placeholder*="密码"]:visible, input[placeholder*="Password"]:visible');
    const captchaField = page.locator('input[placeholder*="验证码"]:visible, input[placeholder*="Captcha"]:visible');
    
    await userField.fill(ADMIN_USER);
    await passField.fill(ADMIN_PASS);
    
    // Mock login accepts any captcha
    if (await captchaField.count() > 0) {
        await captchaField.fill('1234');
    }

    const loginBtn = page.locator('button.ant-btn-primary:visible');
    await loginBtn.click();
    await page.waitForTimeout(3000); 

    console.log(`Navigating to ${BASE_URL}/bpm/my...`);
    await page.goto(`${BASE_URL}/bpm/my`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`Page Title: ${title}`);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Body Text Length: ${bodyText.length}`);
    if (bodyText.includes('我发起的流程')) {
        console.log('SUCCESS: Found "我发起的流程"');
    } else {
        console.log('FAILURE: "我发起的流程" NOT found.');
    }
    
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot.png'), fullPage: true });
    console.log('Screenshot saved.');

  } catch (e) {
    logStream.write(`[SCRIPT_ERROR] ${e.message}\n`);
    console.error(e);
  } finally {
    logStream.end();
    await browser.close();
  }
})();
