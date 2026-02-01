# Pandorasbox Deployment Verification Script
# Verifies all infrastructure components before/after deployment

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PANDORASBOX DEPLOYMENT VERIFICATION  " -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan

# Configuration
$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "us-central1"
$SERVICE_NAME = "studio"
$PRODUCTION_URL = "https://studio--seismic-vista-480710-q5.us-central1.hosted.app"

Write-Host "`n[1/5] Checking GCP Project..." -ForegroundColor Yellow
$currentProject = gcloud config get-value project
if ($currentProject -eq $PROJECT_ID) {
    Write-Host "  ✅ Project: $PROJECT_ID" -ForegroundColor Green
} else {
    Write-Host "  ❌ Wrong project: $currentProject (expected $PROJECT_ID)" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/5] Checking VPC Connector..." -ForegroundColor Yellow
$connector = gcloud compute networks vpc-access connectors describe pandora-vpc-connector --region=$REGION --format="value(state)" 2>$null
if ($connector -eq "READY") {
    Write-Host "  ✅ VPC Connector: READY" -ForegroundColor Green
} else {
    Write-Host "  ❌ VPC Connector state: $connector" -ForegroundColor Red
}

Write-Host "`n[3/5] Checking Private VMs..." -ForegroundColor Yellow
$vms = gcloud compute instances list --format="csv[no-heading](name,networkInterfaces[0].networkIP,status)" --filter="name~pandora" 2>$null
$vms -split "`n" | ForEach-Object {
    if ($_ -match "^([^,]+),([^,]+),([^,]+)$") {
        $name = $matches[1]
        $ip = $matches[2]
        $status = $matches[3]
        if ($status -eq "RUNNING") {
            Write-Host "  ✅ $name ($ip): $status" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $name ($ip): $status" -ForegroundColor Red
        }
    }
}

Write-Host "`n[4/5] Checking Cloud Run Service..." -ForegroundColor Yellow
$svcInfo = gcloud run services describe $SERVICE_NAME --region=$REGION --format="yaml(spec.template.metadata.annotations['run.googleapis.com/vpc-access-connector'])" 2>$null
if ($svcInfo -match "pandora-vpc-connector") {
    Write-Host "  ✅ Cloud Run VPC Connector: Attached" -ForegroundColor Green
} else {
    Write-Host "  ❌ Cloud Run VPC Connector: NOT attached" -ForegroundColor Red
}

Write-Host "`n[5/5] Running Health Checks..." -ForegroundColor Yellow

# Inference Health Check
try {
    $inferenceHealth = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/health/inference" -TimeoutSec 10
    if ($inferenceHealth.status -eq "online") {
        Write-Host "  ✅ Inference (/api/health/inference): ONLINE" -ForegroundColor Green
        Write-Host "     Service: $($inferenceHealth.service)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Inference: OFFLINE - $($inferenceHealth.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Inference: Connection failed - $($_.Exception.Message)" -ForegroundColor Red
}

# Memory Health Check
try {
    $memoryHealth = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/health/memory" -TimeoutSec 10
    if ($memoryHealth.status -eq "online") {
        Write-Host "  ✅ Memory (/api/health/memory): ONLINE" -ForegroundColor Green
        Write-Host "     Service: $($memoryHealth.service)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Memory: OFFLINE - $($memoryHealth.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Memory: Connection failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE                 " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Production URL: $PRODUCTION_URL" -ForegroundColor White
