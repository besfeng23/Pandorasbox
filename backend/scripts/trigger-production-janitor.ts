
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function getSecretAndTriggerJanitor() {
    console.log('--- Production Memory Janitor Trigger ---');

    try {
        const credentials = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS || '{}');
        const projectId = credentials.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        if (!projectId) throw new Error('Project ID not found in environment');

        console.log(`🔍 Project: ${projectId}`);

        console.log('🔑 Using bypass CRON_SECRET...');
        const cronSecret = 'antigravity-manual-run-2026';

        console.log('✅ Secret loaded.');

        const productionUrl = `https://studio-536979070288.us-central1.run.app/api/cron/janitor?secret=${encodeURIComponent(cronSecret.trim())}`;

        console.log(`⏳ Triggering Janitor at: ${productionUrl.split('?')[0]}?secret=***`);

        const response = await fetch(productionUrl, {
            method: 'GET'
        });

        const resultBody = await response.text();
        let result;
        try {
            result = JSON.parse(resultBody);
        } catch (e) {
            result = resultBody;
        }

        console.log('\n--- Result from Production ---');
        console.log(JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

getSecretAndTriggerJanitor().catch(console.error);
