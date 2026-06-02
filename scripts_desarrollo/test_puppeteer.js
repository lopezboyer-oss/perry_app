const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('https://perry-app.netlify.app/login', { waitUntil: 'networkidle0' });
  
  console.log('Page loaded. Checking inputs...');
  const isInputEnabled = await page.evaluate(() => {
    const el = document.querySelector('input[type="email"]');
    return el && !el.disabled && window.getComputedStyle(el).pointerEvents !== 'none';
  });
  console.log('Is Input Enabled?', isInputEnabled);
  
  await browser.close();
})();
