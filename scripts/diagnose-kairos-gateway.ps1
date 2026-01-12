# Diagnostic script for Kairos Event Gateway issues
# Checks all components and identifies what stopped

$ErrorActionPreference = "Continue"

Write-Host "🔍 Kairos Event Gateway Diagnostic" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$SERVICE_NAME = "kairos-event-gateway"
$GATEWAY_URL = "https://kairos-event-gateway-axypi7xsha-as.a.run.app"

$issues = @()
$warnings = @()

# Step 1: Check if gcloud is available
Write-Host "1️⃣  Checking gcloud CLI..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "   ✅ gcloud found: $gcloudVersion" -ForegroundColor Green
} catch {
    $issues += "gcloud CLI not found or not in PATH"
    Write-Host "   ❌ gcloud not found" -ForegroundColor Red
}
Write-Host ""

# Step 2: Check authentication
Write-Host "2️⃣  Checking gcloud authentication..." -ForegroundColor Yellow
try {
    $account = gcloud config get-value account 2>&1
    if ($LASTEXITCODE -eq 0 -and $account -and -not ($account -match "ERROR")) {
        Write-Host "   ✅ Authenticated as: $account" -ForegroundColor Green
    } else {
        $issues += "Not authenticated with gcloud. Run: gcloud auth login"
        Write-Host "   ❌ Not authenticated" -ForegroundColor Red
    }
} catch {
    $issues += "Failed to check authentication"
    Write-Host "   ❌ Error checking auth: $_" -ForegroundColor Red
}
Write-Host ""

# Step 3: Check if service exists
Write-Host "3️⃣  Checking if gateway service exists..." -ForegroundColor Yellow
try {
    $serviceInfo = gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format="json" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $serviceJson = $serviceInfo | ConvertFrom-Json
        $serviceUrl = $serviceJson.status.url
        Write-Host "   ✅ Service exists: $serviceUrl" -ForegroundColor Green
        
        # Update gateway URL if different
        if ($serviceUrl -ne $GATEWAY_URL) {
            $warnings += "Service URL differs from script: $serviceUrl vs $GATEWAY_URL"
            Write-Host "   ⚠️  URL mismatch (using: $serviceUrl)" -ForegroundColor Yellow
            $GATEWAY_URL = $serviceUrl
        }
    } else {
        $issues += "Service not found. Deploy it first."
        Write-Host "   ❌ Service not found" -ForegroundColor Red
        Write-Host "   Run: services\kairos-event-gateway\deploy.ps1" -ForegroundColor Gray
    }
} catch {
    $issues += "Failed to check service status"
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Step 4: Test identity token generation
Write-Host "4️⃣  Testing identity token generation..." -ForegroundColor Yellow
try {
    $token = gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
    if ($LASTEXITCODE -eq 0 -and $token -and -not ($token -match "ERROR")) {
        Write-Host "   ✅ Token generated successfully" -ForegroundColor Green
        $tokenLength = $token.Length
        Write-Host "   Token length: $tokenLength chars" -ForegroundColor Gray
    } else {
        $issues += "Failed to generate identity token"
        Write-Host "   ❌ Token generation failed" -ForegroundColor Red
        Write-Host "   Output: $token" -ForegroundColor Gray
    }
} catch {
    $issues += "Error generating token: $_"
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Step 5: Test gateway health endpoint
Write-Host "5️⃣  Testing gateway health endpoint..." -ForegroundColor Yellow
try {
    $token = gcloud auth print-identity-token --audience=$GATEWAY_URL 2>&1
    if ($LASTEXITCODE -eq 0 -and $token) {
        try {
            $healthResponse = Invoke-RestMethod `
                -Uri "$GATEWAY_URL/healthz" `
                -Method Get `
                -Headers @{ "Authorization" = "Bearer $token" } `
                -TimeoutSec 10 `
                -ErrorAction Stop
            
            if ($healthResponse.ok) {
                Write-Host "   ✅ Health check passed" -ForegroundColor Green
            } else {
                $warnings += "Health check returned unexpected response"
                Write-Host "   ⚠️  Unexpected response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Yellow
            }
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $issues += "Health check failed with HTTP $statusCode"
            Write-Host "   ❌ Health check failed (HTTP $statusCode)" -ForegroundColor Red
            
            if ($statusCode -eq 401 -or $statusCode -eq 403) {
                Write-Host "   💡 Grant IAM access:" -ForegroundColor Yellow
                Write-Host "      gcloud run services add-iam-policy-binding $SERVICE_NAME --region=$REGION --member=user:$account --role=roles/run.invoker" -ForegroundColor Gray
            }
        }
    } else {
        $warnings += "Skipping health check (no token)"
        Write-Host "   ⚠️  Skipped (no token)" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Health check error: $_"
    Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Check intake files
Write-Host "6️⃣  Checking intake files..." -ForegroundColor Yellow
$intakeDir = ".\.kairos\intake"
$specFile = "$intakeDir\pandora-uiux-spec-items.json"
$auditFile = "$intakeDir\kairos-audit-issues.json"
$eliteFile = "$intakeDir\elite-redesign-items.json"

$fileCount = 0
$totalItems = 0

if (Test-Path $intakeDir) {
    Write-Host "   ✅ Intake directory exists" -ForegroundColor Green
    
    if (Test-Path $specFile) {
        try {
            $specData = Get-Content $specFile | ConvertFrom-Json
            $count = if ($specData -is [Array]) { $specData.Count } else { 1 }
            $totalItems += $count
            $fileCount++
            Write-Host "   ✅ Found UI/UX spec: $count items" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  UI/UX spec file exists but invalid JSON" -ForegroundColor Yellow
        }
    }
    
    if (Test-Path $auditFile) {
        try {
            $auditData = Get-Content $auditFile | ConvertFrom-Json
            $count = if ($auditData -is [Array]) { $auditData.Count } else { 1 }
            $totalItems += $count
            $fileCount++
            Write-Host "   ✅ Found audit issues: $count items" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Audit file exists but invalid JSON" -ForegroundColor Yellow
        }
    }
    
    if (Test-Path $eliteFile) {
        try {
            $eliteData = Get-Content $eliteFile | ConvertFrom-Json
            $count = if ($eliteData -is [Array]) { $eliteData.Count } else { 1 }
            $totalItems += $count
            $fileCount++
            Write-Host "   ✅ Found elite redesign: $count items" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Elite redesign file exists but invalid JSON" -ForegroundColor Yellow
        }
    }
    
    if ($fileCount -eq 0) {
        $issues += "No intake files found in .kairos/intake/"
        Write-Host "   ❌ No intake files found" -ForegroundColor Red
    } else {
        Write-Host "   📊 Total: $fileCount files, $totalItems items" -ForegroundColor Cyan
    }
} else {
    $issues += "Intake directory not found: $intakeDir"
    Write-Host "   ❌ Intake directory not found" -ForegroundColor Red
}
Write-Host ""

# Step 7: Check Node.js and npm
Write-Host "7️⃣  Checking Node.js environment..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        $warnings += "Node.js not found"
        Write-Host "   ⚠️  Node.js not found" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Node.js check failed"
    Write-Host "   ⚠️  Node.js check failed" -ForegroundColor Yellow
}

try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ npm: $npmVersion" -ForegroundColor Green
    } else {
        $warnings += "npm not found"
        Write-Host "   ⚠️  npm not found" -ForegroundColor Yellow
    }
} catch {
    $warnings += "npm check failed"
    Write-Host "   ⚠️  npm check failed" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Check if tsx is available
Write-Host "8️⃣  Checking TypeScript execution environment..." -ForegroundColor Yellow
try {
    $tsxCheck = npm list tsx 2>&1
    if ($LASTEXITCODE -eq 0 -or $tsxCheck -match "tsx@") {
        Write-Host "   ✅ tsx available" -ForegroundColor Green
    } else {
        $warnings += "tsx not installed. Run: npm install"
        Write-Host "   ⚠️  tsx not found (run: npm install)" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Could not check tsx"
    Write-Host "   ⚠️  Could not check tsx" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Diagnostic Summary" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "✅ No critical issues found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Run: .\scripts\send-kairos-events.ps1" -ForegroundColor Gray
    Write-Host "   2. Or: npm run kairos:intake" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Found $($issues.Count) critical issue(s):" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   • $issue" -ForegroundColor Red
    }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  Warnings ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   • $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($issues.Count -gt 0) {
    exit 1
} else {
    exit 0
}

