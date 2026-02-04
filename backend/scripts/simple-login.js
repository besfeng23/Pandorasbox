
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 SIMPLE LOGIN CHECK...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Use a known existing account or the one we just made?
    // Let's use a fresh one to be sure, or just test the UI presence.
    // Actually, I'll try to login with the account from the previous run if I knew it. 
    // I don't know the exact random email.
    // I'll just signup a specific one "audit_login_test@test.com" and then login with it.

    const email = `audit_login_${Date.now()}@test.com`;

    try {
        // 1. Signup
        await page.goto('https://studio--seismic-vista-480710-q5.us-central1.hosted.app/signup');
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', 'Password@123!');
        await page.click('button[type="submit"]');
        await new Promise(r => setTimeout(r, 5000));

        console.log('Signed up. Clearing cookies...');
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');

        // 2. Login
        console.log('Navigating to Login...');
        await page.goto('https://studio--seismic-vista-480710-q5.us-central1.hosted.app/login');
        await page.waitForSelector('input[type="email"]');
        console.log('Login UI Visible.');

        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', 'Password@123!');

        const btn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Log')));
        if (btn) await btn.click();

        await new Promise(r => setTimeout(r, 5000));
        const url = page.url();
        console.log('Final URL:', url);

        if (!url.includes('login') && !url.includes('signup')) {
            console.log('✅✅✅ LOGIN SUCCESSFUL (Redirected to Dashboard/Home)');
        } else {
            console.log('❌ Still on Login page.');
        }

    } catch (e) { console.error(e); }
    await browser.close();
})();
