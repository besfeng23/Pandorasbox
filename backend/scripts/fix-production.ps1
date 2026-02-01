# ═══════════════════════════════════════════════════════════════════════════
# PANDORA'S BOX - QUICK FIX SCRIPT
# Fixes: Missing GROQ_API_KEY + Stopped GPU VM
# ═══════════════════════════════════════════════════════════════════════════

param(
    [string]$GroqApiKey = "",
    [switch]$StartVM = $false,
    [switch]$RestartVPCConnector = $false
)

$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "us-central1"
$VPC_CONNECTOR = "pandora-vpc-connector"

Write-Host ""
Write-Host "🔧 PANDORA QUICK FIX" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# FIX 1: Create/Update GROQ_API_KEY Secret
# ═══════════════════════════════════════════════════════════════════════════
if ($GroqApiKey) {
    Write-Host "[FIX 1] Setting GROQ_API_KEY in Secret Manager..." -ForegroundColor Yellow
    
    # Check if secret exists
    $secretExists = gcloud secrets describe groq-api-key --project=$PROJECT_ID 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        # Add new version
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Gray
        Write-Output $GroqApiKey | gcloud secrets versions add groq-api-key --data-file=- --project=$PROJECT_ID
    } else {
        # Create new secret
        Write-Host "  Creating new secret..." -ForegroundColor Gray
        Write-Output $GroqApiKey | gcloud secrets create groq-api-key --data-file=- --project=$PROJECT_ID
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ GROQ_API_KEY secret configured!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to set secret" -ForegroundColor Red
    }
} else {
    Write-Host "[FIX 1] Skipping GROQ_API_KEY (not provided)" -ForegroundColor Gray
    Write-Host "  To fix: .\fix-production.ps1 -GroqApiKey 'gsk_your_key_here'" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════════════════════
# FIX 2: Start GPU VM if requested
# ═══════════════════════════════════════════════════════════════════════════
if ($StartVM) {
    Write-Host ""
    Write-Host "[FIX 2] Starting GPU/Inference VMs..." -ForegroundColor Yellow
    
    # Find VMs with the expected IPs
    $instances = gcloud compute instances list --project=$PROJECT_ID --format="json" 2>$null | ConvertFrom-Json
    
    foreach ($vm in $instances) {
        $ip = $vm.networkInterfaces[0].networkIP
        $vmName = $vm.name
        $vmZone = ($vm.zone -split '/')[-1]
        
        if ($ip -eq "10.128.0.4" -or $ip -eq "10.128.0.3") {
            if ($vm.status -ne "RUNNING") {
                Write-Host "  Starting $vmName ($ip)..." -ForegroundColor Gray
                gcloud compute instances start $vmName --zone=$vmZone --project=$PROJECT_ID
                Write-Host "  ✅ Started $vmName" -ForegroundColor Green
            } else {
                Write-Host "  ✅ $vmName ($ip) already running" -ForegroundColor Green
            }
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# FIX 3: Restart VPC Connector if requested
# ═══════════════════════════════════════════════════════════════════════════
if ($RestartVPCConnector) {
    Write-Host ""
    Write-Host "[FIX 3] Recreating VPC Connector (this takes ~2 minutes)..." -ForegroundColor Yellow
    
    # Get current connector config
    $connectorConfig = gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format="json" 2>$null | ConvertFrom-Json
    
    if ($connectorConfig) {
        $network = ($connectorConfig.network -split '/')[-1]
        $ipRange = $connectorConfig.ipCidrRange
        
        # Delete existing
        Write-Host "  Deleting existing connector..." -ForegroundColor Gray
        gcloud compute networks vpc-access connectors delete $VPC_CONNECTOR `
            --region=$REGION `
            --project=$PROJECT_ID `
            --quiet
        
        # Wait a bit
        Start-Sleep -Seconds 10
        
        # Recreate
        Write-Host "  Creating new connector..." -ForegroundColor Gray
        gcloud compute networks vpc-access connectors create $VPC_CONNECTOR `
            --region=$REGION `
            --project=$PROJECT_ID `
            --network=$network `
            --range=$ipRange `
            --min-instances=2 `
            --max-instances=3 `
            --machine-type=e2-micro
        
        Write-Host "  ✅ VPC Connector recreated" -ForegroundColor Green
        Write-Host "  ⚠️ You may need to redeploy the Cloud Run service" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ Could not find existing VPC connector config" -ForegroundColor Red
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# Final Status Check
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VERIFICATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Wait for things to settle
Start-Sleep -Seconds 5

# Test health endpoints
$baseUrl = "https://studio--seismic-vista-480710-q5.us-central1.hosted.app"

Write-Host ""
Write-Host "Testing /api/health/inference..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health/inference" -TimeoutSec 15
    if ($response.status -eq "online") {
        Write-Host "✅ Inference: ONLINE ($($response.service))" -ForegroundColor Green
    } else {
        Write-Host "❌ Inference: $($response.status) - $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Inference: Request failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing /api/health/memory..." -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health/memory" -TimeoutSec 15
    if ($response.status -eq "online") {
        Write-Host "✅ Memory: ONLINE ($($response.service))" -ForegroundColor Green
    } else {
        Write-Host "❌ Memory: $($response.status) - $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Memory: Request failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "USAGE EXAMPLES:" -ForegroundColor Yellow
Write-Host "  # Set Groq API Key only:" -ForegroundColor Gray
Write-Host "  .\fix-production.ps1 -GroqApiKey 'gsk_xxxxxxxxxxxxx'" -ForegroundColor White
Write-Host ""
Write-Host "  # Start stopped VMs:" -ForegroundColor Gray
Write-Host "  .\fix-production.ps1 -StartVM" -ForegroundColor White
Write-Host ""
Write-Host "  # Full fix (set key + start VMs):" -ForegroundColor Gray
Write-Host "  .\fix-production.ps1 -GroqApiKey 'gsk_xxxxxxxxxxxxx' -StartVM" -ForegroundColor White
Write-Host ""
Write-Host "  # Nuclear option (recreate VPC connector):" -ForegroundColor Gray
Write-Host "  .\fix-production.ps1 -RestartVPCConnector" -ForegroundColor White
Write-Host ""
