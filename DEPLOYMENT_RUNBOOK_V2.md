# Pandora's Box v2 Deployment Runbook

This document outlines the manual steps required to configure the GCP environment for the v2 "Enterprise Cloud Native" architecture.

## 1. App Hosting Secrets (Production Config)

App Hosting on Cloud Run ignores `.env` files. You MUST set these secrets via the Firebase CLI before deployment.

Run these commands in your project root:

```bash
# 1. OpenAI API Key (Required for legacy fallback & gpt-4o)
firebase apphosting:secrets:set openai-api-key
# Paste your key when prompted.

# 2. Gemini API Key (Required for Gemini models)
firebase apphosting:secrets:set gemini-api-key
# Paste your key when prompted.

# 3. Firebase Admin Credentials (Required for server-side auth & Firestore)
firebase apphosting:secrets:set firebase-client-email
# Paste the client_email from your service account JSON.

firebase apphosting:secrets:set firebase-private-key
# Paste the private_key from your service account JSON. 
# IMPORTANT: Ensure newlines are preserved or properly escaped if pasting single line.

# 4. Tavily API Key (Required for Search/Grounding if used)
firebase apphosting:secrets:set tavily-api-key
# Paste your key.

# 5. ChatGPT API Key (Optional, for custom actions)
firebase apphosting:secrets:set chatgpt-api-key
```

### Granting Access
After creating secrets, grant the App Hosting backend access to them:

```bash
firebase apphosting:secrets:grantaccess openai-api-key --backend pandora-ui
firebase apphosting:secrets:grantaccess gemini-api-key --backend pandora-ui
firebase apphosting:secrets:grantaccess firebase-client-email --backend pandora-ui
firebase apphosting:secrets:grantaccess firebase-private-key --backend pandora-ui
firebase apphosting:secrets:grantaccess tavily-api-key --backend pandora-ui
```

## 2. IAM & Permissions (Critical)

The Cloud Run service account (usually `[project-number]-compute@developer.gserviceaccount.com` or similar) requires the following roles:

*   **Vertex AI User** (`roles/aiplatform.user`):
    *   Required for `aiplatform.endpoints.predict` to call Gemini models.
*   **Storage Object User** (`roles/storage.objectUser`):
    *   Required to read/write raw audio files in `gs://[project-id].firebasestorage.app`.
*   **BigQuery Data Editor** (`roles/bigquery.dataEditor`):
    *   Required if the service account writes directly to BigQuery (though we are using Log Sink, the sink identity needs this).

### Granting Roles via CLI
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[SERVICE_ACCOUNT_EMAIL]" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[SERVICE_ACCOUNT_EMAIL]" \
    --role="roles/storage.objectUser"
```

## 3. BigQuery Log Sink Setup (Zero-Code Logging)

We are using Cloud Logging to sink structured JSON logs (`jsonPayload.type="analytics_event"`) to BigQuery.

1.  **Create BigQuery Dataset**:
    ```bash
    bq --location=US mk -d --description "Pandora Analytics" pandora_analytics
    ```

2.  **Create Log Sink**:
    Go to **GCP Console > Logging > Log Router** or use CLI:
    ```bash
    gcloud logging sinks create pandora-analytics-sink \
        bigquery.googleapis.com/projects/[PROJECT_ID]/datasets/pandora_analytics \
        --log-filter='jsonPayload.type="analytics_event"'
    ```

3.  **Grant Sink Permissions**:
    The sink will generate a unique service account (visible in the console or CLI output). You must grant this account `BigQuery Data Editor` on the dataset.

## 4. Verification

After deployment (`firebase deploy`), verify:
1.  **Audio**: Upload a voice note. Check if it transcribes and replies.
2.  **Logs**: Check BigQuery `pandora_analytics` dataset for new rows.
3.  **Memories**: Check Firestore `memories` collection to ensuring "Bouncer" is filtering short/useless messages.
