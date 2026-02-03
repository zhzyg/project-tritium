const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to login page...');
  await page.goto('https://oa.donaldzhu.com');

  console.log('Logging in...');
  await page.fill('input[id="username"]', 'admin');
  await page.fill('input[id="password"]', 'Admin#2026!Reset');
  
  // Handle captcha if visible
  const captchaVisible = await page.isVisible('.login-captcha');
  if (captchaVisible) {
      console.log('Captcha detected, this automated script might fail if captcha is complex.');
  }

  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('Login successful');
  } catch (e) {
    console.log('Login wait failed, might be on same page or login failed');
    await page.screenshot({ path: 'browser_verify/login_result.png' });
  }

  console.log('Navigating to "My Initiated" page...');
  // Instead of clicking menus which might be tricky with dynamic layouts, go directly to URL
  await page.goto('https://oa.donaldzhu.com/#/bpm/my');
  
  await page.waitForTimeout(5000); // Wait for potential async rendering
  
  await page.screenshot({ path: 'browser_verify/my_page.png' });
  console.log('Screenshot saved to browser_verify/my_page.png');

  const content = await page.content();
  const isBlank = content.includes('data-testid="bpm-my-page"') === false;
  console.log('Page has my-page testid:', !isBlank);
  
  const innerText = await page.innerText('body');
  console.log('Page body text length:', innerText.length);
  if (innerText.length < 100) {
      console.log('Page seems blank or mostly empty');
  }

  await browser.close();
})();
