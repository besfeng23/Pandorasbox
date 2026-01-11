# 🚀 Deploy Kairos Secrets Broker - Quick Start

## One Command Deployment

From the **repo root directory**, run:

```powershell
.\services\kairo-secrets-broker\deploy.ps1
```

**That's it!** The script handles everything automatically.

## What It Does

1. ✅ Enables required GCP APIs
2. ✅ Creates service account (`kairos-secrets-broker-sa`)
3. ✅ Creates bootstrap secret (if needed) - **save this value!**
4. ✅ Creates Artifact Registry repository
5. ✅ Builds and pushes container image
6. ✅ Grants secret access to service account
7. ✅ Deploys to Cloud Run
8. ✅ Tests health endpoint
9. ✅ Outputs service URL and bootstrap secret

## Prerequisites

- **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
- **Authenticated**: `gcloud auth login`
- **Project permissions**: Owner or Editor on `seismic-vista-480710-q5`

## Output

After successful deployment, you'll see:

```
📍 Service URL: https://kairos-secrets-broker-xxx-xx.a.run.app
📋 Bootstrap Secret: [64-character secret]
```

**Save both values** - you'll need them for Base44 configuration.

## Base44 Configuration

Store these in Base44:

1. **KAIROS_BOOTSTRAP_SECRET** = the bootstrap secret value
2. **KAIROS_SECRETS_BROKER_URL** = the service URL

Then use the Base44 client snippet from `docs/12_BASE44_INTEGRATION.md` (complete guide with examples).

## Troubleshooting

### Script fails with "gcloud not found"
- Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
- Restart PowerShell after installation

### Script fails with "Permission denied"
- Run: `gcloud auth login`
- Verify you have Owner/Editor role on the project

### "Service account already exists" warning
- This is normal - script continues automatically

### "Secret not found" warnings
- Some secrets may not exist yet - script continues
- Create missing secrets manually if needed

## Manual Deployment

If the script fails, see `services/kairos-secrets-broker/DEPLOYMENT.md` for step-by-step instructions.

## Cost

Expected monthly cost: **< $5** for low traffic.

- Cloud Run: ~$0.40/million requests (2M free/month)
- Secret Manager: ~$0.06/10K operations
- Artifact Registry: ~$0.10/GB/month

## Security Notes

- Bootstrap secret is generated automatically (64 random characters)
- Secret is saved to `.bootstrap-secret.txt` (gitignored) for reference
- **Never commit the bootstrap secret to git**
- Rotate bootstrap secret every 90 days

## Next Steps

1. ✅ Run `deploy.ps1`
2. ✅ Save service URL and bootstrap secret
3. ✅ Configure Base44 with those values
4. ✅ Test with Base44 client snippet
5. ✅ Monitor Cloud Run logs for any issues

---

**Ready?** Just run: `.\services\kairos-secrets-broker\deploy.ps1` 🚀

