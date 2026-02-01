
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeneration() {
    console.log("-----------------------------------------");
    console.log("Testing Chat Generation via Tunnel...");

    const baseUrl = 'http://localhost:8000/v1';
    console.log(`Target: ${baseUrl}`);

    const openai = createOpenAI({
        baseURL: baseUrl,
        apiKey: 'empty',
        // @ts-ignore
        compatibility: 'compatible',
        headers: {
            'Authorization': 'Bearer empty',
            'x-vercel-ai-provider': 'openai'
        }
    });

    try {
        const result = await streamText({
            model: process.env.INFERENCE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
            messages: [{ role: 'user', content: 'Say "Hello, World!" and nothing else.' }],
        });

        console.log("Stream started. Waiting for output...");
        let fullText = "";

        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
            fullText += chunk;
        }

        console.log("\n\n[SUCCESS] Generation complete.");
        if (fullText.length < 2) throw new Error("Output too short");

    } catch (error) {
        console.error("\n[FAILURE] Generation failed!");
        console.error(error);
        process.exit(1);
    }
}

testGeneration();
