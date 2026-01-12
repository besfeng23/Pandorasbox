# Quick fix script for common Kairos Event Gateway issues
# Automatically fixes common problems

$ErrorActionPreference = "Stop"

Write-Host "🔧 Kairos Event Gateway Quick Fix" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$SERVICE_NAME = "kairos-event-gateway"

# Fix 1: Ensure authenticated
Write-Host "1️⃣  Checking authentication..." -ForegroundColor Yellow
try {
    $account = gcloud config get-value account 2>&1
    if ($LASTEXITCODE -ne 0 -or $account -match "ERROR" -or -not $account) {
        Write-Host "   ⚠️  Not authenticated. Logging in..." -ForegroundColor Yellow
        gcloud auth login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ❌ Authentication failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "   ✅ Authenticated" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Already authenticated as: $account" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Authentication error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Fix 2: Set project
Write-Host "2️⃣  Setting GCP project..." -ForegroundColor Yellow
try {
    gcloud config set project $PROJECT_ID 2>&1 | Out-Null
    Write-Host "   ✅ Project set to: $PROJECT_ID" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Could not set project: $_" -ForegroundColor Yellow
}
Write-Host ""

# Fix 3: Get service URL
Write-Host "3️⃣  Getting service URL..." -ForegroundColor Yellow
try {
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format="value(status.url)" 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $SERVICE_URL) {
        Write-Host "   ✅ Service URL: $SERVICE_URL" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Service not found. Deploy it first:" -ForegroundColor Red
        Write-Host "      cd services\kairos-event-gateway" -ForegroundColor Gray
        Write-Host "      .\deploy.ps1" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "   ❌ Error getting service URL: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Fix 4: Grant IAM access (if needed)
Write-Host "4️⃣  Checking IAM permissions..." -ForegroundColor Yellow
try {
    $account = gcloud config get-value account 2>&1
    Write-Host "   Granting access to: $account" -ForegroundColor Gray
    
    gcloud run services add-iam-policy-binding $SERVICE_NAME `
        --region=$REGION `
        --member="user:$account" `
        --role="roles/run.invoker" `
        --quiet 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ IAM access granted" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  IAM access may already be granted (or error occurred)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not grant IAM access: $_" -ForegroundColor Yellow
}
Write-Host ""

# Fix 5: Test token generation
Write-Host "5️⃣  Testing token generation..." -ForegroundColor Yellow
try {
    $token = gcloud auth print-identity-token --audience=$SERVICE_URL 2>&1
    if ($LASTEXITCODE -eq 0 -and $token -and -not ($token -match "ERROR")) {
        Write-Host "   ✅ Token generation works" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Token generation failed" -ForegroundColor Red
        Write-Host "   Output: $token" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "   ❌ Token generation error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Fix 6: Test health endpoint
Write-Host "6️⃣  Testing gateway health..." -ForegroundColor Yellow
try {
    $token = gcloud auth print-identity-token --audience=$SERVICE_URL 2>&1
    $healthResponse = Invoke-RestMethod `
        -Uri "$SERVICE_URL/healthz" `
        -Method Get `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    if ($healthResponse.ok) {
        Write-Host "   ✅ Gateway is healthy" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Gateway responded but status unclear" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   ❌ Health check failed (HTTP $statusCode)" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Gray
    exit 1
}
Write-Host ""

# Fix 7: Check intake files
Write-Host "7️⃣  Checking intake files..." -ForegroundColor Yellow
$intakeDir = ".\.kairos\intake"
if (-not (Test-Path $intakeDir)) {
    Write-Host "   ⚠️  Intake directory not found: $intakeDir" -ForegroundColor Yellow
    Write-Host "   Creating directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $intakeDir -Force | Out-Null
    Write-Host "   ✅ Directory created" -ForegroundColor Green
    Write-Host "   💡 Add intake JSON files to: $intakeDir" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Intake directory exists" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Quick fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Gateway URL: $SERVICE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Ensure intake files exist in .kairos\intake\" -ForegroundColor Gray
Write-Host "   2. Run: .\scripts\send-kairos-events.ps1" -ForegroundColor Gray
Write-Host "   3. Or: npm run kairos:intake" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

