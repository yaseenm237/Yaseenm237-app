const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log('App loaded. Clicking "Optimize Layout"...');
  
  // Find the button with "Optimize Layout" text
  const [button] = await page.$x("//button[contains(., 'Optimize Layout')]");
  if (button) {
    await button.click();
    console.log('Clicked! Waiting 5 seconds for results...');
    await page.waitForTimeout(5000);
  } else {
    console.log('Button not found!');
  }
  
  await browser.close();
})();
