/**
 * Pandora Environment Check
 * Verifies Firebase, GCP, GitHub, and MCP readiness
 * Paste and run directly inside Cursor
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const requiredEnv = [
  "FIREBASE_PROJECT_ID",
  "GCLOUD_PROJECT",
  "GITHUB_TOKEN",
  "MCP_ENDPOINT",
];

const checks = {
  firebase: "firebase --version",
  gcloud: "gcloud --version",
  node: "node -v",
  npm: "npm -v",
  git: "git --version",
};

function checkCLI(name: string, cmd: string) {
  try {
    const result = execSync(cmd).toString().trim();
    console.log(`✅ ${name} detected: ${result.split("\n")[0]}`);
  } catch {
    console.log(`❌ ${name} not found or not configured`);
  }
}

function checkEnv() {
  console.log("\n🔍 Checking environment variables...");
  const missing = requiredEnv.filter((v) => !process.env[v]);
  if (missing.length === 0) console.log("✅ All required environment variables found");
  else console.log(`❌ Missing environment variables: ${missing.join(", ")}`);
}

function checkFirebaseKey() {
  const keyPath = path.resolve("service-account.json");
  if (fs.existsSync(keyPath)) {
    console.log("✅ Firebase service account key found");
  } else {
    console.log("❌ Missing Firebase key → service-account.json");
  }
}

function checkNetwork(endpoint: string, label: string) {
  return new Promise((resolve) => {
    https
      .get(endpoint, (res) => {
        console.log(`✅ ${label} reachable (${res.statusCode})`);
        resolve(true);
      })
      .on("error", () => {
        console.log(`❌ Cannot reach ${label}`);
        resolve(false);
      });
  });
}

async function main() {
  console.log("🧠 Pandora Environment Diagnostic\n");

  // 1. Check CLIs
  console.log("⚙️  Checking installed CLIs...");
  for (const [name, cmd] of Object.entries(checks)) checkCLI(name, cmd);

  // 2. Check environment
  checkEnv();

  // 3. Check Firebase key
  checkFirebaseKey();

  // 4. Check connectivity
  console.log("\n🌐 Checking external connections...");
  const mcp = process.env.MCP_ENDPOINT || "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app";
  await checkNetwork(mcp, "Pandora's MCP");
  await checkNetwork("https://firebase.google.com", "Firebase");
  await checkNetwork("https://github.com", "GitHub");

  console.log("\n✅ Environment check complete.\nIf all entries above show ✅, your system is ready for phase seeding.");
}

main();

