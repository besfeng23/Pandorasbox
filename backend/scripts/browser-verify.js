
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Launching Full Audit Bot (Final Version)...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const url = 'https://studio--seismic-vista-480710-q5.us-central1.hosted.app/signup';
    console.log(`🌐 Navigating to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        console.log('✅ Page loaded.');

        const textAreaSelector = 'textarea, input[name="message"]';
        let loggedIn = false;

        // Check if we are already in
        if (await page.$(textAreaSelector)) {
            console.log('✅ Already logged in!');
            loggedIn = true;
        } else {
            console.log('🔒 Signup/Login Form detected. Attempting Auto-Registration...');

            const inputs = await page.$$('input');
            if (inputs.length > 0) {
                const email = `audit_bot_${Date.now()}@test.com`;
                const password = 'Password@123!';
                console.log(`   Filling credentials: ${email} / ***`);

                // TYPE INTO FIELDS
                const emailInput = await page.$('input[type="email"], input[name="email"]');
                if (emailInput) await emailInput.type(email);

                const passInputs = await page.$$('input[type="password"]');
                if (passInputs.length > 0) await passInputs[0].type(password);

                if (passInputs.length > 1) {
                    console.log('   Filling Confirm Password...');
                    await passInputs[1].type(password);
                }

                const nameInput = await page.$('input[name="name"], input[placeholder="Name"]');
                if (nameInput) await nameInput.type('AuditBot');

                await new Promise(r => setTimeout(r, 1000));

                // Submit
                const submitBtn = await page.evaluateHandle(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.find(b => b.type === 'submit') ||
                        buttons.find(b => b.innerText.toLowerCase().match(/(sign up|create account|register|next)/));
                });

                if (submitBtn) {
                    console.log('👉 Clicking Sign Up...');
                    await submitBtn.click();

                    try {
                        console.log('⏳ Waiting for Chat UI or Dashboard...');

                        const dashboardSelector = 'text/Create your first thread';

                        await page.waitForFunction(() => {
                            return document.querySelector('textarea, input[name="message"]') ||
                                document.body.innerText.includes("Create your first thread") ||
                                document.body.innerText.includes("Welcome to Pandora");
                        }, { timeout: 20000 });

                        const isDashboard = await page.evaluate(() => document.body.innerText.includes("Create your first thread"));

                        if (isDashboard) {
                            console.log('✅ Dashboard reached. Searching for entry point...');

                            // Click Strategy
                            const clicked = await page.evaluate(() => {
                                // Strategy 1: Find the main Builder Agent card
                                const cards = Array.from(document.querySelectorAll('div'));
                                const builderCard = cards.find(el => el.innerText.includes('Builder Agent') && el.className.includes('cursor-pointer'));
                                if (builderCard) { builderCard.click(); return 'card'; }

                                // Strategy 2: Click the H3 title
                                const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Builder'));
                                if (h3) { h3.click(); return 'h3'; }

                                return null;
                            });

                            if (clicked) {
                                console.log(`   Clicked Agent via [${clicked}]. Waiting for Chat Input...`);
                                try {
                                    await page.waitForSelector(textAreaSelector, { timeout: 15000 });
                                    console.log('✅ Chat UI reached.');
                                    loggedIn = true;
                                } catch (e) { console.warn('   Click seemingly failed to open chat.'); }
                            } else {
                                console.log('   ⚠️ Could not find specific card. Trying generic click...');
                                const fallbackBtn = await page.evaluateHandle(() => {
                                    const els = Array.from(document.querySelectorAll('*'));
                                    return els.find(e => e.innerText === 'Builder Agent');
                                });
                                if (fallbackBtn) {
                                    await fallbackBtn.click();
                                    await page.waitForSelector(textAreaSelector, { timeout: 10000 });
                                    loggedIn = true;
                                }
                            }
                        } else {
                            console.log('✅ Direct Chat UI reached.');
                            loggedIn = true;
                        }

                    } catch (e) {
                        console.error('❌ Failed to stabilize on Dashboard/Chat. Dumping Text:', await page.evaluate(() => document.body.innerText.substring(0, 200)));
                    }
                } else {
                    console.error('❌ No Submit Button found.');
                }
            } else {
                console.error('❌ No Inputs found on /signup.');
            }
        }

        // 2. AUDIT INTELLIGENCE
        if (loggedIn) {
            const chatInput = await page.$(textAreaSelector);
            const userName = "Joven";

            console.log(`\n🧪 TEST 1: Identity Acceptance ("My name is ${userName}")`);
            await chatInput.type(`My name is ${userName}`);
            await page.keyboard.press('Enter');

            console.log('⏳ Waiting for response...');
            await new Promise(r => setTimeout(r, 10000));

            let response1 = await page.evaluate(() => {
                const bubbles = Array.from(document.querySelectorAll('.prose, .markdown, .whitespace-pre-wrap'));
                return bubbles.length ? bubbles[bubbles.length - 1].innerText : document.body.innerText.slice(-500);
            });

            console.log(`🤖 AI Response: "${response1.replace(/\n/g, ' ')}"`);

            if (response1.toLowerCase().includes("pandora") && (response1.toLowerCase().includes("not my name") || response1.toLowerCase().includes("referred to"))) {
                console.error('❌ FAIL: AI Refused Identity (Stupid Mode Check Failed).');
            } else {
                console.log('✅ PASS: AI accepted the name.');
            }

            console.log(`\n🧪 TEST 2: Persistence (Refresh & Recall)`);
            console.log('🔄 Refreshing Page...');
            await page.reload({ waitUntil: 'networkidle0' });

            await page.waitForSelector(textAreaSelector);
            await page.type(textAreaSelector, 'Who am I?');
            await page.keyboard.press('Enter');

            console.log('⏳ Waiting for response...');
            await new Promise(r => setTimeout(r, 10000));

            let response2 = await page.evaluate(() => {
                const bubbles = Array.from(document.querySelectorAll('.prose, .markdown, .whitespace-pre-wrap'));
                return bubbles.length ? bubbles[bubbles.length - 1].innerText : document.body.innerText.slice(-500);
            });

            console.log(`🤖 AI Response: "${response2.replace(/\n/g, ' ')}"`);

            if (response2.toLowerCase().includes(userName.toLowerCase())) {
                console.log('✅ PASS: Memory Persisted!');
            } else {
                console.error('❌ FAIL: Memory Lost.');
            }
        }

    } catch (error) {
        console.error('❌ Script Error:', error);
    } finally {
        await browser.close();
        console.log('👋 Audit complete.');
    }
})();
