
import { test, expect } from '@playwright/test';

test.describe('PandoraUI Dashboard', () => {
    test('should load the dashboard and display critical components', async ({ page }) => {
        // Navigate to the dashboard (assuming authentication is mocked or handled via session)
        await page.goto('/pandora-ui');

        // 1. Check for the main title
        await expect(page.locator('h1')).toContainText('Sovereign AI // Neural Core');

        // 2. Verify Phase Grid is present
        const phaseGrid = page.locator('text=Evolutionary Phases');
        await expect(phaseGrid).toBeVisible();

        // 3. Verify Phase 1 is active
        await expect(page.locator('text=PHASE 01')).toBeVisible();

        // 4. Check for the Telemetry Graph
        await expect(page.locator('text=Neural Telemetry')).toBeVisible();

        // 5. Verify the Cube is rendered (checking parent container)
        await expect(page.locator('.perspective-\\[1000px\\]')).toBeVisible();
    });

    test('should display active directives', async ({ page }) => {
        await page.goto('/pandora-ui');
        await expect(page.locator('text=Maintain data sovereignty')).toBeVisible();
    });
});
