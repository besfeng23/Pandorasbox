
import fetch from 'node-fetch';

async function testRawGeneration() {
    console.log("-----------------------------------------");
    console.log("Testing Raw OpenAI Client via Tunnel...");

    const baseUrl = 'http://localhost:11434/v1';
    const modelName = 'llama3.2:latest';
    console.log(`Target: ${baseUrl}`);
    console.log(`Model: ${modelName}`);

    const payload = {
        model: modelName,
        messages: [{ role: 'user', content: 'Say "Hello, World!"' }],
        stream: false,
    };

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer empty'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Connection error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("\n[SUCCESS] Raw connection successful!");
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("\n[FAILURE] Raw connection failed!");
        console.error(error.message);
        console.error(error);
        process.exit(1);
    }
}

testRawGeneration();
