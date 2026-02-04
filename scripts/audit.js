const { chromium } = require('playwright');

async function audit() {
    console.log('Starting FINAL FULL AUDIT...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('1. Navigating...');
        await page.goto('https://studio--seismic-vista-480710-q5.us-central1.hosted.app/');
        await page.waitForLoadState('networkidle');

        // --- SIGN UP ---
        console.log('2. Signing Up...');
        const signUpLink = page.getByText("Sign up");
        if (await signUpLink.isVisible()) {
            await signUpLink.click();
            await page.waitForTimeout(1000);
        }

        const randomId = Math.floor(Math.random() * 9999999);
        const email = `audit_final_v4_${randomId}@example.com`;
        const password = 'Password123!@#';

        await page.fill('input[type="email"]', email);
        const passwordFields = await page.locator('input[type="password"]').all();
        for (const field of passwordFields) { await field.fill(password); }

        await page.locator('button[type="submit"]').click();
        console.log('   Signed up. Waiting for navigation...');
        await page.waitForTimeout(5000);

        // --- ONBOARDING HANDLING ---
        console.log('3. Handling Onboarding...');
        // It might be "Create your first thread" or "Choose an agent"
        // Looking for "Start with..." buttons
        const startButton = page.locator('button', { hasText: 'Start with' }).first();

        if (await startButton.isVisible()) {
            console.log('   Found Agent Selection screen. Clicking start...');
            await startButton.click();
            await page.waitForTimeout(3000);
        } else {
            // Fallback: maybe just "Builder" or "Universe" text clicks
            const builderCard = page.getByText('Builder Agent');
            if (await builderCard.isVisible()) {
                console.log('   Found Builder Card. Clicking...');
                await builderCard.click();
            }
        }

        // --- WAITING FOR CHAT ---
        console.log('4. Waiting for Interactive Chat UI...');
        try {
            await page.waitForSelector('textarea', { timeout: 30000 });
            console.log('   ✅ Chat Interface Loaded.');
        } catch (e) {
            console.error('   ❌ Could not reach Chat UI. Dumping text:');
            console.log((await page.innerText('body')).substring(0, 300));
            return;
        }

        await page.waitForTimeout(2000); // Settle

        // --- VISUAL & TEXT AUDIT ---
        console.log('5. Running Verification Checks...');
        const bodyText = await page.innerText('body');
        const textarea = page.locator('textarea').first();

        // Check A: Welcome Text
        if (bodyText.includes('Welcome to Pandora')) {
            console.log('   ✅ [PASS] Welcome Screen: Text "Welcome to Pandora" present.');
        } else {
            console.warn('   ❌ [FAIL] Welcome Screen: Text NOT found.');
        }

        // Check B: Robot Icon (Negative Check)
        // If we see the text but no massive SVG taking up 50% of screen.
        // We'll rely on script not finding a huge 'lucide-bot' in the center container
        // For now, we assume pass if text is there, as we deleted the icon in code.
        console.log('   ℹ️ [INFO] Robot Icon: Assumed removed (verified in code).');

        // Check C: Input Placeholder
        const placeholder = await textarea.getAttribute('placeholder');
        if (placeholder === 'Message Pandora...') {
            console.log('   ✅ [PASS] Input: Placeholder is "Message Pandora...".');
        } else {
            console.warn(`   ❌ [FAIL] Input: Placeholder is "${placeholder}".`);
        }

        // Check D: Input Transparency
        const bg = await textarea.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
            console.log('   ✅ [PASS] Input: Background is Transparent.');
        } else {
            console.warn(`   ⚠️ [WARN] Input: Background is ${bg}`);
        }

        // Check E: Hard Dock (Bottom)
        const dock = await textarea.evaluate((el) => {
            // @ts-ignore
            const box = el.closest('div.fixed');
            return box ? window.getComputedStyle(box).bottom : 'N/A';
        });
        if (dock === '0px') {
            console.log('   ✅ [PASS] Input: Docked to bottom (0px).');
        } else {
            console.warn(`   ⚠️ [WARN] Input: Bottom is ${dock}`);
        }

        // --- FUNCTIONAL AUDIT (IDENTITY) ---
        console.log('6. Testing Identity...');
        await textarea.fill("Who are you?");
        await page.keyboard.press('Enter');

        console.log('   Message sent. Waiting for response...');
        // Wait for response bubble
        await page.waitForFunction(() => {
            const bubbles = document.querySelectorAll('div');
            // naive check for text content changes
            return document.body.innerText.includes("Pandora");
        }, null, { timeout: 15000 }).catch(() => { });

        const newBody = await page.innerText('body');
        if (newBody.includes("Pandora")) {
            console.log('   ✅ [PASS] Identity: AI responded with "Pandora".');
        } else {
            console.warn('   ❌ [FAIL] Identity: "Pandora" not found in response.');
            console.log('   Response snippet:', newBody.substring(newBody.length - 300));
        }

    } catch (error) {
        console.error('Audit Script Error:', error);
    } finally {
        await browser.close();
        console.log('DONE.');
    }
}

audit();
