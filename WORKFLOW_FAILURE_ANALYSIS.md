# GitHub Workflow Failure Analysis

## 🔴 Failure Summary

### Most Recent Failure

- **Workflow Name**: Phase Build Sequences
- **Run ID**: 20853445619
- **Timestamp**: 2026-01-09T13:28:51Z (Updated: 2026-01-09T13:29:32Z)
- **Status**: completed
- **Conclusion**: failure
- **Failed Job**: Execute Pandora Phase Build Sequences (Job ID: 59913826075)
- **Failed Step**: Run Pandora Build Sequences

### Error Details

**Error Message:**
```
Error: Metadata string value "projects/***/databases/(default)" contains illegal characters
```

**Stack Trace:**
```
at validate (/home/runner/work/Pandorasbox/Pandorasbox/node_modules/@grpc/grpc-js/src/metadata.ts:65:15)
at Metadata.set (/home/runner/work/Pandorasbox/Pandorasbox/node_modules/@grpc/grpc-js/src/metadata.ts:107:5)
at Object.buildMetadata (/home/runner/work/Pandorasbox/Pandorasbox/node_modules/google-gax/src/grpc.ts:343:24)
...
at seedPhases (/home/runner/work/Pandorasbox/Pandorasbox/scripts/seed-phases.ts:84:15)
at execute (/home/runner/work/Pandorasbox/Pandorasbox/scripts/seed-phases.ts:235:11)
```

### Root Cause

The error occurs when initializing Firebase Admin SDK in GitHub Actions. The issue is that when using Application Default Credentials (ADC), the database URL format `projects/***/databases/(default)` contains parentheses `(default)` which are illegal characters in gRPC metadata.

The problem is in `scripts/seed-phases.ts` where Firebase Admin is initialized without proper database URL handling for the default database.

### Solution

The Firebase Admin initialization needs to be fixed to handle the default database correctly, or use a service account key in GitHub Actions instead of ADC.

## 🔧 Fix Command

To automatically fix and rerun the failed deployment:

```bash
# Fix the seed-phases.ts script, then push and trigger workflow
git checkout main
# (Apply fix to scripts/seed-phases.ts)
git add scripts/seed-phases.ts
git commit -m "Fix Firebase Admin initialization for GitHub Actions"
git push origin main
```

Or manually rerun the failed workflow:
```bash
gh run rerun 20853445619 --failed
```

## 📋 Additional Failed Runs

Recent failures (all same issue):
- Run ID: 20853445619 (2026-01-09T13:28:51Z)
- Run ID: 20853440724 (2026-01-09T13:28:40Z)
- Run ID: 20852460315 (2026-01-09T12:50:02Z)
- Run ID: 20852127948 (2026-01-09T12:36:47Z)
- Run ID: 20852028907 (2026-01-09T12:32:48Z)

All failures are in the same step: "Run Pandora Build Sequences"

