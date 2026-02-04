import { chromium } from 'playwright';
import fs from 'fs';

async function audit() {
    console.log('Starting Audit...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Navigating to URL...');
        await page.goto('https://studio--seismic-vista-480710-q5.us-central1.hosted.app/');

        // Wait for network idle to ensure rendering
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // Extra buffer

        console.log('Taking Initial Screenshot...');
        await page.screenshot({ path: 'audit_screenshot_welcome.png', fullPage: true });

        const bodyText = await page.innerText('body');
        console.log('--- Page Text Sample ---');
        console.log(bodyText.substring(0, 500).replace(/\n/g, ' '));
        console.log('------------------------');

        // 1. Welcome Screen Check
        if (bodyText.includes('Welcome to Pandora')) {
            console.log('✅ PASS: "Welcome to Pandora" text present.');
        } else {
            console.warn('❌ FAIL: "Welcome to Pandora" text NOT found.');
        }

        // Check for Robot Icon (by checking if there is a large svg above the text)
        // This is hard to prove negatively without visual, but we can check the DOM structure if we knew the selector.
        // We'll rely on the visual screenshot.

        // 2. Input Bar Check
        const textarea = page.locator('textarea');
        if (await textarea.count() > 0) {
            const placeholder = await textarea.getAttribute('placeholder');
            if (placeholder === 'Message Pandora...') {
                console.log('✅ PASS: Placeholder is "Message Pandora..."');
            } else {
                console.warn(`❌ FAIL: Placeholder is "${placeholder}"`);
            }

            const bgColor = await textarea.evaluate((el) => {
                return window.getComputedStyle(el).backgroundColor;
            });
            console.log(`ℹ️ Textarea Background Color: ${bgColor}`);
            if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
                console.log('✅ PASS: Textarea is transparent.');
            } else {
                console.warn('⚠️ WARN: Textarea might not be transparent (check screenshot).');
            }
        } else {
            console.warn('❌ FAIL: No textarea found (Likely stuck on Login Screen).');
        }

    } catch (error) {
        console.error('Audit Failed:', error);
    } finally {
        await browser.close();
    }
}

audit();
