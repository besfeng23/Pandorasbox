const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

console.log('--- Environment Verification ---');

if (!apiKey) {
    console.error('❌ OPENAI_API_KEY (or NEXT_PUBLIC_OPENAI_API_KEY) is MISSING.');
    process.exit(1);
} else {
    console.log('✅ API Key found: ' + apiKey.substring(0, 8) + '...' + apiKey.slice(-4));
}

console.log('\n--- Testing OpenAI Connection ---');

const req = https.request({
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/models',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    if (res.statusCode === 200) {
        console.log('✅ OpenAI API is REACHABLE and Key is VALID.');
    } else if (res.statusCode === 401) {
        console.log('❌ OpenAI API Key is INVALID (401 Unauthorized).');
    } else {
        console.log(`⚠️ OpenAI API returned status ${res.statusCode}.`);
    }
});

req.on('error', (e) => {
    console.error(`❌ Connection Error: ${e.message}`);
});

req.end();
