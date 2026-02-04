
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 UNSTOPPABLE AUDIT: Initializing...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const baseUrl = 'https://studio--seismic-vista-480710-q5.us-central1.hosted.app';
    const email = `audit_final_${Date.now()}@test.com`;
    const password = 'Password@123!';

    try {
        // --- 1. SIGNUP ---
        console.log(`\n🔹 STEP 1: SIGNUP (${email})`);
        await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle0', timeout: 60000 });

        const emailIn = await page.$('input[name="email"], input[type="email"]');
        if (emailIn) {
            await emailIn.type(email);
            const passIn = await page.$$('input[type="password"]');
            for (const p of passIn) await p.type(password);
            const nameIn = await page.$('input[name="name"]');
            if (nameIn) await nameIn.type('AuditBot');

            await new Promise(r => setTimeout(r, 500));

            const btn = await page.evaluateHandle(() => {
                const bs = Array.from(document.querySelectorAll('button'));
                return bs.find(b => b.type === 'submit') || bs.find(b => b.innerText.toLowerCase().includes('sign up'));
            });
            if (btn) {
                await btn.click();
                console.log('   Signup Clicked. Waiting for transition...');
                await new Promise(r => setTimeout(r, 10000));
            }
        } else {
            throw new Error("Signup inputs not found");
        }

        // --- 2. ENTER CHAT ---
        console.log(`\n🔹 STEP 2: ENTERING CHAT`);
        const chatUrl = `${baseUrl}/`;

        let chatFound = false;
        const textAreaSelector = 'textarea, input[name="message"]';

        if (await page.$(textAreaSelector)) chatFound = true;

        if (!chatFound) {
            console.log('   Looking for Agent Card...');
            const clicked = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('div, h3, h4'));
                const builder = els.find(e => e.innerText.includes('Builder'));
                if (builder) { builder.click(); return true; }
                return false;
            });
            if (clicked) {
                console.log('   Clicked Agent. Waiting...');
                await new Promise(r => setTimeout(r, 5000));
                if (await page.$(textAreaSelector)) chatFound = true;
            }
        }

        if (!chatFound) {
            console.log('   Force-navigating to /chat (guess)...');
            await page.goto(`${baseUrl}/chat`, { waitUntil: 'networkidle0' }).catch(() => { });
            if (await page.$(textAreaSelector)) chatFound = true;
        }

        if (chatFound) {
            console.log(`✅ CHAT READY. Sending Identity...`);
            const input = await page.$(textAreaSelector);
            await input.type('My name is Joven');
            await page.keyboard.press('Enter');
            console.log('   Message sent. Waiting for response...');
            await new Promise(r => setTimeout(r, 10000));

            let reply = await page.evaluate(() => {
                const b = Array.from(document.querySelectorAll('.prose'));
                return b.length ? b[b.length - 1].innerText : "No response found";
            });
            console.log(`   AI Reply: "${reply.slice(0, 100).replace(/\n/g, ' ')}..."`);
        } else {
            console.error('❌ COULD NOT ENTER CHAT.');
            throw new Error("Chat Entry Failed");
        }

        // --- 3. LOGOUT ---
        console.log(`\n🔹 STEP 3: LOGOUT`);
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await page.evaluate(() => localStorage.clear());
        console.log('   Cleared Auth.');

        // --- 4. LOGIN ---
        console.log(`\n🔹 STEP 4: LOGIN`);
        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });

        console.log('   Checking Login UI...');
        let loginInput;
        try {
            loginInput = await page.waitForSelector('input[type="email"]', { timeout: 20000 });
        } catch (e) {
            console.log('   Email input not found immediately. Dumping Body Text...');
            const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
            console.log('   Body:', text);
            if (text.includes('Sign Up')) {
                const loginLink = await page.evaluateHandle(() => {
                    const acts = Array.from(document.querySelectorAll('a, button'));
                    return acts.find(a => a.innerText.toLowerCase().includes('log in'));
                });
                if (loginLink) {
                    console.log('   Found Login Link. Clicking...');
                    await loginLink.click();
                    await new Promise(r => setTimeout(r, 2000));
                    loginInput = await page.waitForSelector('input[type="email"]', { timeout: 10000 }).catch(() => null);
                }
            }
        }

        if (loginInput) {
            await loginInput.type(email);
            const pLogin = await page.$('input[type="password"]');
            await pLogin.type(password);

            const lBtn = await page.evaluateHandle(() => {
                const bs = Array.from(document.querySelectorAll('button'));
                return bs.find(b => b.innerText.toLowerCase().match(/(log in|sign in)/));
            });
            if (lBtn) {
                await lBtn.click();
                console.log('   Login Clicked. Waiting...');
                await new Promise(r => setTimeout(r, 15000));
            }
        } else {
            console.error('❌ LOGIN FAILED: Inputs never appeared.');
        }

        // --- 5. VERIFY ---
        console.log(`\n🔹 STEP 5: VERIFY MEMORY`);
        await page.goto(`${baseUrl}/memory`, { waitUntil: 'networkidle0' });
        const text = await page.evaluate(() => document.body.innerText);
        if (text.includes("Joven")) {
            console.log(`✅✅✅ AUDIT PASSED: "Joven" survived the logout/login cycle.`);
        } else {
            console.log(`❌ AUDIT FAILED: Memory not found in UI.`);
            console.log(`   Page Content: ${text.slice(0, 200)}...`);
        }

    } catch (e) {
        console.error('💥 FATAL ERROR:', e);
    } finally {
        await browser.close();
    }
})();
