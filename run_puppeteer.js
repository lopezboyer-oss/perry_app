const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto('https://perry-app.netlify.app/login');
  
  const elementAtCenter = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return el ? { tag: el.tagName, className: el.className, outerHTML: el.outerHTML } : null;
  });
  console.log("Element blocking center of screen:", elementAtCenter);
  
  await browser.close();
})();
