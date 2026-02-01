# ═══════════════════════════════════════════════════════════════════════════
# PANDORA'S BOX - PRODUCTION DEBUG & FIX SCRIPT
# Resolves: 401 (Missing GROQ_API_KEY) + 503 (VPC Connectivity)
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"

# Configuration
$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "us-central1"
$VPC_CONNECTOR = "pandora-vpc-connector"
$OLLAMA_IP = "10.128.0.4"
$QDRANT_IP = "10.128.0.3"

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  PANDORA'S BOX - PRODUCTION DEBUG & FIX" -ForegroundColor Cyan
Write-Host "  Project: $PROJECT_ID | Region: $REGION" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Verify Google Cloud Authentication
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "[STEP 1] Verifying Google Cloud Authentication..." -ForegroundColor Yellow

$currentProject = gcloud config get-value project 2>$null
if ($currentProject -ne $PROJECT_ID) {
    Write-Host "  Setting project to $PROJECT_ID..." -ForegroundColor Gray
    gcloud config set project $PROJECT_ID
}

$account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if ($account) {
    Write-Host "  [OK] Authenticated as: $account" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Not authenticated. Run 'gcloud auth login'" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Check Secret Manager for GROQ_API_KEY
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[STEP 2] Checking Secret Manager for GROQ_API_KEY..." -ForegroundColor Yellow

$groqSecret = gcloud secrets describe groq-api-key --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Secret 'groq-api-key' exists" -ForegroundColor Green
    
    # Check if it has any versions
    $versions = gcloud secrets versions list groq-api-key --project=$PROJECT_ID --filter="state:ENABLED" --format="value(name)" 2>$null
    if ($versions) {
        Write-Host "  [OK] Secret has active version(s)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Secret exists but has NO active versions!" -ForegroundColor Red
    }
} else {
    Write-Host "  [FAIL] Secret 'groq-api-key' DOES NOT EXIST (This causes 401 errors!)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  TO FIX: Create the secret with your Groq API key:" -ForegroundColor Cyan
    Write-Host "    gcloud secrets create groq-api-key --project=$PROJECT_ID" -ForegroundColor White
    Write-Host "    Write-Output 'YOUR_GROQ_API_KEY' | gcloud secrets versions add groq-api-key --data-file=- --project=$PROJECT_ID" -ForegroundColor White
}

# Also check other required secrets
Write-Host ""
Write-Host "  Checking other required secrets..." -ForegroundColor Gray
$requiredSecrets = @("firebase-service-account-key", "firebase-client-email", "firebase-private-key", "cron-secret", "tavily-api-key")
foreach ($secret in $requiredSecrets) {
    $null = gcloud secrets describe $secret --project=$PROJECT_ID 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] $secret" -ForegroundColor Green
    } else {
        Write-Host "    [FAIL] $secret (MISSING)" -ForegroundColor Red
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Check VPC Connector Status
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[STEP 3] Checking VPC Connector Status..." -ForegroundColor Yellow

$connectorJson = gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR `
    --region=$REGION `
    --project=$PROJECT_ID `
    --format="json" 2>$null

if ($LASTEXITCODE -eq 0 -and $connectorJson) {
    $connector = $connectorJson | ConvertFrom-Json
    $connectorStatus = $connector.state
    
    if ($connectorStatus -eq "READY") {
        Write-Host "  [OK] VPC Connector '$VPC_CONNECTOR' is READY" -ForegroundColor Green
        Write-Host "    IP Range: $($connector.ipCidrRange)" -ForegroundColor Gray
    } else {
        Write-Host "  [WARN] VPC Connector status: $connectorStatus (NOT READY)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] VPC Connector '$VPC_CONNECTOR' NOT FOUND!" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Check GPU/Inference VM Status
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[STEP 4] Checking GPU/Inference VM Status (Ollama at $OLLAMA_IP)..." -ForegroundColor Yellow

$instancesJson = gcloud compute instances list --project=$PROJECT_ID --format="json" 2>$null
if ($instancesJson) {
    $allInstances = $instancesJson | ConvertFrom-Json
    
    # Find VM with IP 10.128.0.4
    $ollamaVM = $null
    foreach ($vm in $allInstances) {
        foreach ($nic in $vm.networkInterfaces) {
            if ($nic.networkIP -eq $OLLAMA_IP) {
                $ollamaVM = $vm
                break
            }
        }
    }
    
    if ($ollamaVM) {
        $vmName = $ollamaVM.name
        $vmZoneParts = $ollamaVM.zone -split '/'
        $vmZone = $vmZoneParts[$vmZoneParts.Length - 1]
        $vmStatus = $ollamaVM.status
        
        Write-Host "  Found VM: $vmName (Zone: $vmZone)" -ForegroundColor Cyan
        
        if ($vmStatus -eq "RUNNING") {
            Write-Host "  [OK] VM Status: RUNNING" -ForegroundColor Green
        } elseif ($vmStatus -eq "TERMINATED" -or $vmStatus -eq "STOPPED") {
            Write-Host "  [FAIL] VM Status: $vmStatus (THIS IS THE 503 CAUSE!)" -ForegroundColor Red
            Write-Host ""
            Write-Host "  TO FIX: Start the VM:" -ForegroundColor Cyan
            Write-Host "    gcloud compute instances start $vmName --zone=$vmZone --project=$PROJECT_ID" -ForegroundColor White
        } else {
            Write-Host "  [WARN] VM Status: $vmStatus" -ForegroundColor Yellow
        }
        
        # Check machine type
        $machineTypeParts = $ollamaVM.machineType -split '/'
        $machineType = $machineTypeParts[$machineTypeParts.Length - 1]
        Write-Host "    Machine Type: $machineType" -ForegroundColor Gray
        
        # Check if it has GPU
        if ($ollamaVM.guestAccelerators) {
            $gpuTypeParts = $ollamaVM.guestAccelerators[0].acceleratorType -split '/'
            $gpuType = $gpuTypeParts[$gpuTypeParts.Length - 1]
            $gpuCount = $ollamaVM.guestAccelerators[0].acceleratorCount
            Write-Host "    GPU: $gpuCount x $gpuType" -ForegroundColor Green
        } else {
            Write-Host "    GPU: None (CPU-only inference)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [FAIL] No VM found with IP $OLLAMA_IP" -ForegroundColor Red
        Write-Host "    Available VMs:" -ForegroundColor Gray
        foreach ($vm in $allInstances) {
            $ip = $vm.networkInterfaces[0].networkIP
            Write-Host "      - $($vm.name): $ip ($($vm.status))" -ForegroundColor Gray
        }
    }
    
    # Find Qdrant VM
    Write-Host ""
    Write-Host "[STEP 5] Checking Qdrant VM Status ($QDRANT_IP)..." -ForegroundColor Yellow
    
    $qdrantVM = $null
    foreach ($vm in $allInstances) {
        foreach ($nic in $vm.networkInterfaces) {
            if ($nic.networkIP -eq $QDRANT_IP) {
                $qdrantVM = $vm
                break
            }
        }
    }
    
    if ($qdrantVM) {
        $vmName = $qdrantVM.name
        $vmStatus = $qdrantVM.status
        
        if ($vmStatus -eq "RUNNING") {
            Write-Host "  [OK] Qdrant VM '$vmName' is RUNNING" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Qdrant VM '$vmName' status: $vmStatus" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [FAIL] No VM found with IP $QDRANT_IP" -ForegroundColor Red
    }
} else {
    Write-Host "  [FAIL] Could not list compute instances" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Test Health Endpoints (from local machine via public URL)
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "[STEP 6] Testing Production Health Endpoints..." -ForegroundColor Yellow

$baseUrl = "https://studio--seismic-vista-480710-q5.us-central1.hosted.app"

# Test Inference Health
Write-Host "  Testing $baseUrl/api/health/inference ..." -ForegroundColor Gray
try {
    $inferenceResponse = Invoke-RestMethod -Uri "$baseUrl/api/health/inference" -Method Get -TimeoutSec 20
    if ($inferenceResponse.status -eq "online") {
        Write-Host "  [OK] Inference Health: ONLINE" -ForegroundColor Green
        Write-Host "    Service: $($inferenceResponse.service)" -ForegroundColor Gray
        if ($inferenceResponse.latency_ms) {
            Write-Host "    Latency: $($inferenceResponse.latency_ms)ms" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [FAIL] Inference Health: $($inferenceResponse.status)" -ForegroundColor Red
        if ($inferenceResponse.error) {
            Write-Host "    Error: $($inferenceResponse.error)" -ForegroundColor Gray
        }
        if ($inferenceResponse.suggestion) {
            Write-Host "    Suggestion: $($inferenceResponse.suggestion)" -ForegroundColor Yellow
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  [FAIL] Inference Health Check FAILED (HTTP $statusCode)" -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)" -ForegroundColor Gray
}

# Test Memory Health
Write-Host ""
Write-Host "  Testing $baseUrl/api/health/memory ..." -ForegroundColor Gray
try {
    $memoryResponse = Invoke-RestMethod -Uri "$baseUrl/api/health/memory" -Method Get -TimeoutSec 20
    if ($memoryResponse.status -eq "online") {
        Write-Host "  [OK] Memory Health: ONLINE" -ForegroundColor Green
        Write-Host "    Service: $($memoryResponse.service)" -ForegroundColor Gray
        if ($memoryResponse.targetCollectionExists) {
            Write-Host "    Collection 'memories': EXISTS" -ForegroundColor Green
        }
    } else {
        Write-Host "  [FAIL] Memory Health: $($memoryResponse.status)" -ForegroundColor Red
        if ($memoryResponse.error) {
            Write-Host "    Error: $($memoryResponse.error)" -ForegroundColor Gray
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  [FAIL] Memory Health Check FAILED (HTTP $statusCode)" -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY & RECOMMENDED ACTIONS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see 401 errors (GROQ):" -ForegroundColor Yellow
Write-Host "  1. Get a Groq API key from https://console.groq.com" -ForegroundColor White
Write-Host "  2. Create the secret:" -ForegroundColor White
Write-Host "     Write-Output 'gsk_YOUR_KEY' | gcloud secrets create groq-api-key --data-file=- --project=$PROJECT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "If you see 503 errors (VPC/Inference):" -ForegroundColor Yellow
Write-Host "  1. Ensure the Ollama VM is RUNNING" -ForegroundColor White
Write-Host "  2. Verify the VPC Connector is READY" -ForegroundColor White
Write-Host "  3. Check firewall rules allow traffic on port 11434" -ForegroundColor White
Write-Host ""
Write-Host "To redeploy after fixing:" -ForegroundColor Yellow
Write-Host "  git push origin production" -ForegroundColor Gray
Write-Host ""
