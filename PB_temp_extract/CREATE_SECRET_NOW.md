# 🚨 URGENT: Create ChatGPT API Key Secret

The build is failing because the `chatgpt-api-key` secret doesn't exist yet.

## ⚡ Quick Fix (Choose One Method)

### Method 1: Google Cloud Console (Fastest - 2 minutes)

1. **Open this link**: https://console.cloud.google.com/security/secret-manager/create?project=seismic-vista-480710-q5

2. **Fill in the form**:
   - **Name**: `chatgpt-api-key` (exactly this, no spaces)
   - **Secret value**: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
   - **Replication policy**: Select **"Automatic"** or **"Regional"** (asia-southeast1)

3. Click **"CREATE SECRET"**

4. **Grant App Hosting access**:
   - After creation, click on the secret
   - Go to **"PERMISSIONS"** tab
   - Click **"GRANT ACCESS"**
   - Add principal: `service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com`
   - Role: **"Secret Manager Secret Accessor"**
   - Click **"SAVE"**

### Method 2: Firebase CLI (If installed)

```bash
# Create the secret
echo "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" | firebase apphosting:secrets:create chatgpt-api-key --data-file=-

# Grant access
firebase apphosting:secrets:grantaccess chatgpt-api-key
```

### Method 3: gcloud CLI (If installed)

```bash
# Set project
gcloud config set project seismic-vista-480710-q5

# Create secret
echo "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" | gcloud secrets create chatgpt-api-key --data-file= --replication-policy="automatic"

# Grant access to App Hosting service account
gcloud secrets add-iam-policy-binding chatgpt-api-key \
  --member="serviceAccount:service-536979070288@gcp-sa-apphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## ✅ After Creating the Secret

1. The build will automatically retry, OR
2. Manually trigger a new build in Firebase Console

---

## 🔑 Your API Key (Save This!)

```
OKepTRWlwBohzaEbCGQgcUZXjI34m7qL
```

This is the key you'll use in ChatGPT configuration.

---

## 📝 Quick Checklist

- [ ] Secret created: `chatgpt-api-key`
- [ ] Secret value: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
- [ ] Access granted to App Hosting service account
- [ ] Build retried/triggered

---

**Once the secret is created, the build will succeed!** 🚀

