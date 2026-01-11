# GCP Secrets Inventory - Pandora's Box

**Project:** `seismic-vista-480710-q5`  
**Last Updated:** January 2025  
**Configuration:** Firebase App Hosting (Cloud Run)

---

## Secrets Configured in GCP Secret Manager

Based on `apphosting.yaml` and `DEPLOYMENT_RUNBOOK_V2.md`, the following secrets are configured:

### 1. **openai-api-key** ✅
- **Environment Variable:** `OPENAI_API_KEY`
- **Usage:** OpenAI API access for embeddings and chat completions
- **Models Used:** `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Services:**
  - Text embeddings (`text-embedding-3-small`)
  - Chat completions (GPT-4o, GPT-4-turbo, GPT-3.5-turbo)
  - Whisper transcription (`whisper-1`)
  - Vision API (GPT-4 Vision for image analysis)
- **Availability:** RUNTIME only
- **Status:** Required

### 2. **gemini-api-key** ✅
- **Environment Variable:** `GEMINI_API_KEY`
- **Usage:** Google Gemini API access (alternative AI model)
- **Services:**
  - Gemini models via Vertex AI or direct API
- **Availability:** RUNTIME only
- **Status:** Optional (if using Gemini models)

### 3. **chatgpt-api-key** ✅
- **Environment Variable:** `CHATGPT_API_KEY`
- **Usage:** ChatGPT Actions integration and MCP HTTP bridge
- **Services:**
  - `/api/chatgpt/store-memory` endpoint
  - `/api/chatgpt/retrieve-memories` endpoint
  - `/api/chatgpt/hybrid-retrieve` endpoint (Phase 5)
  - MCP HTTP bridge authentication
  - Fallback for `MCP_API_KEY` if not set
- **Availability:** RUNTIME only
- **Status:** Optional (required if using ChatGPT Actions)

### 4. **tavily-api-key** ✅
- **Environment Variable:** `TAVILY_API_KEY`
- **Usage:** Tavily web search API for external knowledge search
- **Services:**
  - Phase 5: Hybrid search (internal + external knowledge)
  - Deep Research Agent (Phase 9)
  - External knowledge caching (`external_knowledge` collection)
- **Availability:** RUNTIME only
- **Status:** Optional (required if Phase 5/9 enabled)

### 5. **firebase-client-email** ✅
- **Environment Variable:** `ADMIN_CLIENT_EMAIL`
- **Usage:** Firebase Admin SDK authentication (service account email)
- **Services:**
  - Firebase Admin SDK initialization
  - Server-side Firestore access
  - Server-side Firebase Storage access
  - Bypasses client-side security rules
- **Value:** Service account `client_email` from `service-account.json`
- **Availability:** RUNTIME only
- **Status:** Required

### 6. **firebase-private-key** ✅
- **Environment Variable:** `ADMIN_PRIVATE_KEY`
- **Usage:** Firebase Admin SDK authentication (service account private key)
- **Services:**
  - Firebase Admin SDK initialization
  - Server-side authentication
- **Value:** Service account `private_key` from `service-account.json`
- **Important:** Newlines must be preserved or escaped if pasting single line
- **Availability:** RUNTIME only
- **Status:** Required

### 7. **cron-secret** ✅
- **Environment Variable:** `CRON_SECRET`
- **Usage:** Secure cron job endpoints (optional authentication)
- **Services:**
  - `/api/cron/cleanup` - Daily memory cleanup
  - `/api/cron/daily-briefing` - Daily briefing generation
  - `/api/cron/nightly-reflection` - Nightly reflection agent
  - `/api/cron/deep-research` - Deep research agent
  - `/api/cron/context-decay` - Context importance decay
  - `/api/cron/reindex-memories` - Reindex memory embeddings
  - `/api/cron/meta-learning` - Meta-learning optimization
- **Availability:** RUNTIME only
- **Status:** Optional (recommended for production)

---

## Public Environment Variables (Not Secrets)

These are stored as plain values in `apphosting.yaml` (safe to expose):

### Firebase Configuration (Public)
- `NEXT_PUBLIC_FIREBASE_API_KEY` - `AIzaSyBd6iZ2jEx1jmniBLD35no5gu1J4D4tSCM`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - `seismic-vista-480710-q5.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - `seismic-vista-480710-q5`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - `seismic-vista-480710-q5.firebasestorage.app`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - `536979070288`
- `NEXT_PUBLIC_FIREBASE_APP_ID` - `1:536979070288:web:57b05547304f0056526055`

---

## Secret Management Commands

### View Secrets (requires gcloud CLI):
```bash
gcloud secrets list --project=seismic-vista-480710-q5
```

### Set Secrets (Firebase CLI):
```bash
# OpenAI API Key
firebase apphosting:secrets:set openai-api-key

# Gemini API Key
firebase apphosting:secrets:set gemini-api-key

# ChatGPT API Key
firebase apphosting:secrets:set chatgpt-api-key

# Tavily API Key
firebase apphosting:secrets:set tavily-api-key

# Firebase Admin Credentials
firebase apphosting:secrets:set firebase-client-email
firebase apphosting:secrets:set firebase-private-key

# Cron Secret
firebase apphosting:secrets:set cron-secret
```

### Grant Access to Backend:
```bash
firebase apphosting:secrets:grantaccess openai-api-key --backend pandora-ui
firebase apphosting:secrets:grantaccess gemini-api-key --backend pandora-ui
firebase apphosting:secrets:grantaccess chatgpt-api-key --backend pandora-ui
firebase apphosting:secrets:grantaccess tavily-api-key --backend pandora-ui
firebase apphosting:secrets:grantaccess firebase-client-email --backend pandora-ui
firebase apphosting:secrets:grantaccess firebase-private-key --backend pandora-ui
firebase apphosting:secrets:grantaccess cron-secret --backend pandora-ui
```

### Update Secret Value:
```bash
firebase apphosting:secrets:set openai-api-key --update
# Paste new value when prompted
```

### List Secret Versions:
```bash
gcloud secrets versions list openai-api-key --project=seismic-vista-480710-q5
```

---

## Secret Access Configuration

**Backend Name:** `pandora-ui` (configured in `apphosting.yaml`)

All secrets must be granted access to the backend:
```bash
firebase apphosting:secrets:grantaccess <secret-name> --backend pandora-ui
```

---

## Local Development vs Production

### Local Development (`.env.local`):
- Uses `.env.local` file (gitignored)
- Same variable names as production
- Secrets are stored in local file

### Production (Firebase App Hosting):
- Uses GCP Secret Manager
- Secrets referenced in `apphosting.yaml`
- Accessed via environment variables at runtime
- Never stored in code or repository

---

## Security Notes

1. **Never commit secrets to Git** - All secrets are in `.gitignore` or GCP Secret Manager
2. **Rotate secrets regularly** - Update secrets via Firebase CLI or GCP Console
3. **Use least privilege** - Only grant access to backends that need each secret
4. **Monitor secret access** - Check GCP Audit Logs for secret access patterns
5. **Backup service account** - Keep `service-account.json` secure (Firebase Admin credentials)

---

## Missing Secrets (If Not Configured)

If any of these secrets are missing, the following features will not work:

- **Missing `openai-api-key`:** ❌ No AI responses, no embeddings, no transcriptions
- **Missing `firebase-client-email` or `firebase-private-key`:** ❌ No server-side Firestore/Storage access
- **Missing `tavily-api-key`:** ❌ No external web search (Phase 5/9 disabled)
- **Missing `chatgpt-api-key`:** ❌ No ChatGPT Actions integration
- **Missing `gemini-api-key`:** ❌ No Gemini model support (optional)

---

## API Keys Summary Table

| Secret Name | Env Variable | Provider | Required | Purpose |
|------------|--------------|----------|----------|---------|
| `openai-api-key` | `OPENAI_API_KEY` | OpenAI | ✅ Yes | AI models, embeddings, transcription |
| `gemini-api-key` | `GEMINI_API_KEY` | Google | ⚠️ Optional | Alternative AI models |
| `chatgpt-api-key` | `CHATGPT_API_KEY` | OpenAI | ⚠️ Optional | ChatGPT Actions integration |
| `tavily-api-key` | `TAVILY_API_KEY` | Tavily | ⚠️ Optional | External web search |
| `firebase-client-email` | `ADMIN_CLIENT_EMAIL` | Google | ✅ Yes | Firebase Admin auth |
| `firebase-private-key` | `ADMIN_PRIVATE_KEY` | Google | ✅ Yes | Firebase Admin auth |
| `cron-secret` | `CRON_SECRET` | Custom | ⚠️ Recommended | Cron job security |

---

**Last Updated:** January 2025  
**Next Review:** Quarterly (check for unused secrets, rotate keys)

