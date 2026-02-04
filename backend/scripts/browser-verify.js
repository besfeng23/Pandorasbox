
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Launching BrowserBot...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set User Agent to avoid bot detection (basic)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const url = 'https://studio--seismic-vista-480710-q5.us-central1.hosted.app';
    console.log(`🌐 Navigating to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        console.log('✅ Page loaded.');

        // TAKE SCREENSHOT (Logic only, we can't see it but useful for debug if needed)
        // await page.screenshot({ path: 'scripts/page_load.png' });

        // Check for Text Area
        const textAreaSelector = 'textarea, input[type="text"]';
        console.log('🔍 Searching for chat input...');

        try {
            await page.waitForSelector(textAreaSelector, { timeout: 10000 });
            console.log('✅ Chat Input found. We are logged in (or guest mode).');
        } catch (e) {
            console.warn('⚠️ No chat input found. Checking for Login...');

            // 1. DUMP UI (Debug)
            const buttons = await page.$$('button');
            console.log(`   Found ${buttons.length} buttons.`);

            // 2. FILL FORM (Blindly)
            const inputs = await page.$$('input');
            if (inputs.length > 0) {
                console.log(`   Found ${inputs.length} inputs. Attempting to fill...`);
                // Heuristic Fill
                await page.evaluate(() => {
                    const inputs = document.querySelectorAll('input');
                    inputs.forEach(i => {
                        const t = i.type.toLowerCase();
                        const p = i.placeholder.toLowerCase();
                        if (t === 'email' || p.includes('email')) i.value = 'autobot_verify@test.com';
                        if (t === 'password' || p.includes('password')) i.value = 'password123';
                        if (t === 'text' && p.includes('user')) i.value = 'AutoBot';
                    });
                });
            }

            // 3. CLICK "SIGN UP" or "LOGIN"
            const clickTarget = await page.evaluateHandle(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.find(b => b.innerText.toLowerCase().includes('sign up')) ||
                    btns.find(b => b.innerText.toLowerCase().includes('register')) ||
                    btns.find(b => b.innerText.toLowerCase().includes('get started')) ||
                    btns.find(b => b.innerText.toLowerCase().includes('continue')) ||
                    btns.find(b => b.innerText.toLowerCase().includes('login'));
            });

            if (clickTarget && clickTarget.asElement()) {
                const txt = await page.evaluate(el => el.textContent, clickTarget);
                console.log(`👉 Clicking button: "${txt}"`);
                await clickTarget.click();
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('   - Navigation timeout (SPA?)'));
            } else {
                console.log('⚠️ No obvious Sign Up button found.');
            }
        }

        // Re-check input
        const input = await page.$(textAreaSelector);
        if (input) {
            const testName = "BrowserBot_" + Math.floor(Math.random() * 1000);
            console.log(`💬 Sending: "My name is ${testName}"`);

            await input.type(`My name is ${testName}`);
            await page.keyboard.press('Enter');

            // Wait for response
            console.log('⏳ Waiting for AI response...');
            await new Promise(r => setTimeout(r, 5000)); // Wait 5s for stream

            // Capture text
            let content = await page.evaluate(() => document.body.innerText);
            console.log('   Response Sample:', content.slice(-200).replace(/\n/g, ' '));

            // RELOAD
            console.log('🔄 Reloading Page...');
            await page.reload({ waitUntil: 'networkidle0' });

            // ASK
            console.log('💬 Asking: "Who am I?"');
            await page.waitForSelector(textAreaSelector);
            await page.type(textAreaSelector, 'Who am I?');
            await page.keyboard.press('Enter');

            await new Promise(r => setTimeout(r, 5000));

            content = await page.evaluate(() => document.body.innerText);
            console.log('   Response Sample:', content.slice(-200).replace(/\n/g, ' '));

            if (content.includes(testName)) {
                console.log('✅ SUCCESS: Name persisted after reload!');
            } else {
                console.log('❌ FAILURE: Name not found in recent text.');
            }
        } else {
            console.log('🛑 Could not find chat input. Aborting test.');
        }

    } catch (error) {
        console.error('❌ Script Error:', error);
    } finally {
        await browser.close();
        console.log('👋 Browser closed.');
    }
})();
