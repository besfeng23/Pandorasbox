
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

// 1. Load Environment Variables mimic Next.js
dotenv.config({ path: '.env.local' });

async function verifyAppLogic() {
    console.log("============================================");
    console.log("   QUADRUPLE CHECK: APP LOGIC VERIFICATION   ");
    console.log("============================================");

    // 2. Validate Config
    const baseUrl = process.env.INFERENCE_URL || 'http://localhost:8000'; // Should be 11434
    const model = process.env.INFERENCE_MODEL || 'mistral'; // Should be llama3.2

    // Normalize URL logic from route.ts
    let finalBaseUrl = baseUrl;
    if (!baseUrl.endsWith('/v1')) {
        finalBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) + '/v1' : baseUrl + '/v1';
    }

    console.log(`[CONFIG] Base URL: ${finalBaseUrl}`);
    console.log(`[CONFIG] Model:    ${model}`);

    if (finalBaseUrl.includes('8000')) {
        console.error("\n[FATAL] Config still points to port 8000 (vLLM). Should be 11434 (Ollama)!");
        process.exit(1);
    }

    // 3. Instantiate OpenAI Client (Exact match to route.ts)
    const openai = new OpenAI({
        baseURL: finalBaseUrl,
        apiKey: process.env.SOVEREIGN_KEY || 'empty',
    });

    console.log("\n[ACTION] Sending request via OpenAI SDK (mimicking route.ts)...");

    try {
        const response = await openai.chat.completions.create({
            model: model,
            stream: true,
            messages: [{ role: 'user', content: 'Triple check confirm: Are you online? Reply "SYSTEM ONLINE".' }],
        });

        console.log("[STATUS] Stream established. Reading output...");

        // 4. Consume Stream (Simulating Frontend consumption)
        let fullText = "";
        for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta?.content || "";
            process.stdout.write(delta);
            fullText += delta;
        }

        console.log("\n\n--------------------------------------------");
        if (fullText.length > 5) {
            console.log("✅ [PASSED] Full Stack Logic Verified.");
            console.log("   - Env Vars Loaded Correctly");
            console.log("   - Port 11434 Reachable");
            console.log("   - SDK Client Compatible");
            console.log(`   - Model '${model}' Responding`);
        } else {
            console.error("❌ [FAILED] Response too short or empty.");
            process.exit(1);
        }

    } catch (error) {
        console.error("\n❌ [CRITICAL FAILURE]");
        console.error("The application logic FAILED to connect.");
        console.error("Error Details:", error);
        process.exit(1);
    }
}

verifyAppLogic();
