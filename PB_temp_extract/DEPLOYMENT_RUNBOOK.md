# Deployment Runbook

## Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Verify all required environment variables are set in `apphosting.yaml`
- [ ] Verify secrets are created in Cloud Secret Manager:
  - `openai-api-key`
  - `gemini-api-key`
- [ ] Verify secrets have been granted to App Hosting service account

### 2. Firebase Configuration
- [ ] Verify `firestore.rules` is up to date and deployed
- [ ] Verify `storage.rules` is up to date and deployed
- [ ] Verify Firestore indexes are built (check Firebase Console)

### 3. Cloud Scheduler
- [ ] Verify cleanup job is enabled: `cleanup-old-data`
- [ ] Verify daily briefing job is enabled: `daily-briefing`
- [ ] Test jobs manually if needed

### 4. Code Verification
- [ ] Run `npm run typecheck` - verify no TypeScript errors
- [ ] Run `npm run lint` - verify no linting errors
- [ ] Verify all dependencies are installed: `npm install`

## Deployment Process

### Firebase App Hosting (Automatic)

Firebase App Hosting automatically deploys on git push to the configured branch.

1. **Push to Production Branch:**
   ```bash
   git push origin production
   ```

2. **Monitor Build:**
   - Go to Firebase Console → App Hosting
   - Check build status
   - Wait for build to complete (typically 3-5 minutes)

3. **Verify Deployment:**
   - Check build logs for errors
   - Test the deployed URL
   - Verify environment variables are loaded

### Manual Deployment (if needed)

If automatic deployment fails:

```bash
# Build locally first to catch errors
npm run build

# Then push (automatic deployment will retry)
git push origin production
```

## Post-Deployment Verification

### 1. Health Checks
- [ ] Application loads without errors
- [ ] Authentication works
- [ ] Firestore reads/writes work
- [ ] Storage uploads work

### 2. Feature Testing
- [ ] Message submission works
- [ ] AI responses generate correctly
- [ ] Thread creation works
- [ ] Settings page loads
- [ ] Data export works

### 3. Scheduled Jobs
- [ ] Verify Cloud Scheduler jobs are enabled
- [ ] Check job execution logs after first run
- [ ] Verify cleanup job runs successfully
- [ ] Verify daily briefing job runs successfully

### 4. Monitoring
- [ ] Check Sentry for errors (if configured)
- [ ] Monitor Cloud Run logs
- [ ] Check Firestore usage
- [ ] Monitor API costs (OpenAI, Gemini)

## Rollback Procedure

If deployment fails or issues are discovered:

1. **Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin production
   ```

2. **Or Checkout Previous Working Commit:**
   ```bash
   git log --oneline  # Find working commit
   git checkout <commit-hash>
   git push origin production --force  # Only if necessary
   ```

3. **Disable Scheduled Jobs (if needed):**
   ```bash
   gcloud scheduler jobs pause cleanup-old-data --location=asia-southeast1
   gcloud scheduler jobs pause daily-briefing --location=asia-southeast1
   ```

## Troubleshooting

### Build Failures

**Error: Module not found**
- Verify all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check `node_modules` is not committed

**Error: TypeScript errors**
- Run `npm run typecheck` locally
- Fix type errors before pushing

**Error: Environment variable missing**
- Check `apphosting.yaml` has all required variables
- Verify secrets are created in Secret Manager
- Verify secrets are granted to App Hosting service account

### Runtime Errors

**Error: Firebase configuration missing**
- Verify `NEXT_PUBLIC_FIREBASE_*` variables in `apphosting.yaml`
- Check they're available at BUILD time

**Error: API key invalid**
- Verify secrets are correctly set in Secret Manager
- Check secret names match `apphosting.yaml`
- Verify secrets don't have trailing newlines

**Error: Permission denied (Firestore)**
- Check Firestore security rules are deployed
- Verify user authentication is working
- Check service account permissions

### Performance Issues

**Slow response times**
- Check Cloud Run instance allocation
- Monitor API rate limits (OpenAI, Gemini)
- Check Firestore query performance
- Review batch sizes for embeddings

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Application Metrics:**
   - Response time (p50, p95, p99)
   - Error rate
   - Request count

2. **Firebase Metrics:**
   - Firestore read/write operations
   - Storage usage
   - Function invocations

3. **API Costs:**
   - OpenAI API usage
   - Gemini API usage
   - Embedding generation count

4. **User Metrics:**
   - Active users
   - Messages per user
   - Threads created

### Setting Up Alerts

1. **Cloud Run Alerts:**
   - Error rate > 5%
   - Response time > 5s (p95)
   - Memory usage > 80%

2. **Firestore Alerts:**
   - Read operations spike
   - Write operations spike
   - Storage quota warnings

3. **API Cost Alerts:**
   - Daily OpenAI cost threshold
   - Daily Gemini cost threshold

## Maintenance Tasks

### Weekly
- Review error logs
- Check API costs
- Monitor user activity

### Monthly
- Review and optimize Firestore queries
- Clean up old logs
- Review and update dependencies
- Check for security updates

### Quarterly
- Review and update rate limits
- Optimize batch sizes
- Review and update retention policies
- Performance optimization audit

