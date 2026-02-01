# Pandorasbox Production Deployment Status

**Generated**: 2026-02-01  
**Status**: ✅ ALL SYSTEMS OPERATIONAL

---

## 🌐 Production URLs

| Service | URL |
|---------|-----|
| **Main Application** | https://studio--seismic-vista-480710-q5.us-central1.hosted.app |
| **Health Dashboard** | https://studio--seismic-vista-480710-q5.us-central1.hosted.app/health |
| **API Health (Inference)** | https://studio--seismic-vista-480710-q5.us-central1.hosted.app/api/health/inference |
| **API Health (Memory)** | https://studio--seismic-vista-480710-q5.us-central1.hosted.app/api/health/memory |

---

## 🏗️ Infrastructure Configuration

### Cloud Run Service
| Setting | Value |
|---------|-------|
| Service Name | `studio` |
| Region | `us-central1` |
| Min Instances | 1 (CPU always warm) |
| Max Instances | 10 |
| Memory | 2048 MiB |
| CPU | 1 |
| VPC Connector | `pandora-vpc-connector` |
| VPC Egress | `PRIVATE_RANGES_ONLY` |

### Private Infrastructure (VPC)
| Component | Internal IP | Port | Status |
|-----------|-------------|------|--------|
| **Ollama** (qwen2.5:1.5b) | `10.128.0.4` | 11434 | 🟢 RUNNING |
| **Qdrant** (memories) | `10.128.0.3` | 6333 | 🟢 RUNNING |

### VPC Connector
| Setting | Value |
|---------|-------|
| Name | `pandora-vpc-connector` |
| Region | `us-central1` |
| Network | `default` |
| IP Range | `10.9.0.0/28` |
| State | `READY` |

---

## 🔧 Environment Variables

### Sovereign AI Configuration
```yaml
INFERENCE_URL: http://10.128.0.4:11434/v1
INFERENCE_MODEL: qwen2.5:1.5b-instruct  # 4x faster than mistral on CPU
QDRANT_URL: http://10.128.0.3:6333
EMBEDDING_MODEL: all-MiniLM-L6-v2
EMBEDDINGS_BASE_URL: https://pandora-embeddings-service-536979070288.us-central1.run.app
```

### Secrets (Google Secret Manager)
- ✅ `firebase-service-account-key`
- ✅ `firebase-client-email`
- ✅ `firebase-private-key`
- ✅ `cron-secret`
- ✅ `tavily-api-key`

---

## 🤖 Available Models

From Ollama (`10.128.0.4:11434`):
- `mistral:latest` ← **Primary Model**
- `llama3.2:latest`
- `qwen2.5:1.5b-instruct`

---

## 📊 Key Features Verified

| Feature | Status | Notes |
|---------|--------|-------|
| RAG Pipeline | ✅ | 10s timeout configured |
| Vector Search | ✅ | `memories` collection (384 dims) |
| Health Endpoints | ✅ | Both inference and memory |
| VPC Connectivity | ✅ | Can reach private IPs |
| Firebase Auth | ✅ | Secrets configured |
| MCP Tools | ✅ | 3 tools in `openapi-mcp.json` |

---

## 🚀 Deployment Commands

### Trigger New Deployment
Firebase App Hosting auto-deploys on push to `production` branch:
```bash
git push origin production
```

### Manual Cloud Run Update
```bash
gcloud run services update studio \
  --region=us-central1 \
  --set-env-vars INFERENCE_MODEL=mistral
```

### Verify Deployment
```powershell
.\scripts\verify-deployment.ps1
```

---

## ⚠️ Important Notes

1. **Regional Alignment**: Only the `studio` backend (us-central1) can reach the private VMs. Other backends (asia-*) cannot.

2. **Model Name**: Use `mistral` (not `mistralai/Mistral-7B-Instruct-v0.3`) for Ollama compatibility.

3. **RAG Timeout**: Set to 10 seconds to prevent blocking on slow vector searches.

4. **Cold Starts**: `minInstances: 1` prevents cold start delays but incurs cost.

---

## 📈 Monitoring

- **Sentry**: Error tracking enabled via `NEXT_PUBLIC_SENTRY_DSN`
- **Cloud Run Logs**: `gcloud run services logs read studio --region=us-central1`
- **Health Dashboard**: Visit `/health` for real-time status

---

*Last verified: 2026-02-01 by deployment verification script*
