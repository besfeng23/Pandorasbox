# Script to check GCP Secret Manager secrets
# Tries multiple methods: gcloud CLI, Firebase CLI, REST API, Backend Config
# Project: seismic-vista-480710-q5

$PROJECT_ID = "seismic-vista-480710-q5"
$BACKEND_NAME = "pandora-ui"
$SECRETS_LIST = @(
    "openai-api-key",
    "gemini-api-key",
    "chatgpt-api-key",
    "tavily-api-key",
    "firebase-client-email",
    "firebase-private-key",
    "cron-secret"
)

Write-Host "🔍 Checking GCP Secret Manager Secrets" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host "Backend: $BACKEND_NAME" -ForegroundColor Yellow
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

$methodFound = $false
$results = @{}

# ============================================================================
# METHOD 1: Try gcloud CLI (Primary Method)
# ============================================================================
Write-Host "📋 Method 1: Trying gcloud CLI..." -ForegroundColor Cyan
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue

if ($gcloudPath) {
    Write-Host "✅ gcloud CLI found" -ForegroundColor Green
    $methodFound = $true
    
    try {
        # Set the project
        Write-Host "  Setting project to $PROJECT_ID..." -ForegroundColor Gray
        gcloud config set project $PROJECT_ID 2>&1 | Out-Null
        
        Write-Host ""
        Write-Host "  Listing all secrets..." -ForegroundColor Yellow
        Write-Host ""
        
        # List all secrets
        $allSecrets = gcloud secrets list --project=$PROJECT_ID --format="json" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $secretsJson = $allSecrets | ConvertFrom-Json
            Write-Host "  Found $($secretsJson.Count) total secrets in project" -ForegroundColor Green
            Write-Host ""
            
            # Display as table
            gcloud secrets list --project=$PROJECT_ID --format="table(name,createTime)" 2>&1 | Out-Host
        } else {
            Write-Host "  ⚠️  Could not list all secrets. May need authentication." -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "  Checking secrets referenced in apphosting.yaml..." -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($secret in $SECRETS_LIST) {
            Write-Host "  Checking: $secret" -ForegroundColor Cyan -NoNewline
            $describeResult = gcloud secrets describe $secret --project=$PROJECT_ID 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ✅ EXISTS" -ForegroundColor Green
                $results[$secret] = "EXISTS"
                
                # Get version info
                $versions = gcloud secrets versions list $secret --project=$PROJECT_ID --limit=1 --format="json" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $versionJson = $versions | ConvertFrom-Json
                    if ($versionJson -and $versionJson.Count -gt 0) {
                        $state = $versionJson[0].state
                        $createTime = $versionJson[0].createTime
                        Write-Host "    State: $state" -ForegroundColor Gray
                        Write-Host "    Created: $createTime" -ForegroundColor Gray
                    }
                }
            } else {
                Write-Host " ❌ NOT FOUND" -ForegroundColor Red
                $results[$secret] = "NOT FOUND"
            }
        }
        
    } catch {
        Write-Host "  ❌ Error using gcloud: $_" -ForegroundColor Red
    }
    
} else {
    Write-Host "  ❌ gcloud CLI not found" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# METHOD 2: Try Firebase CLI (Alternative Method)
# ============================================================================
if (-not $methodFound -or $results.Values -contains "NOT FOUND") {
    Write-Host "📋 Method 2: Trying Firebase CLI..." -ForegroundColor Cyan
    $firebasePath = Get-Command firebase -ErrorAction SilentlyContinue
    
    if ($firebasePath) {
        Write-Host "✅ Firebase CLI found" -ForegroundColor Green
        
        try {
            # Check if Firebase is logged in
            Write-Host "  Checking Firebase authentication..." -ForegroundColor Gray
            $firebaseProjects = firebase projects:list 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Firebase authenticated" -ForegroundColor Green
                
                # Set project
                Write-Host "  Setting Firebase project to $PROJECT_ID..." -ForegroundColor Gray
                firebase use $PROJECT_ID 2>&1 | Out-Null
                
                Write-Host ""
                Write-Host "  Getting backend configuration for '$BACKEND_NAME'..." -ForegroundColor Yellow
                Write-Host ""
                
                # Get backend config to see attached secrets
                $backendConfig = firebase apphosting:backends:get $BACKEND_NAME --project $PROJECT_ID 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ Backend configuration retrieved" -ForegroundColor Green
                    Write-Host ""
                    $backendConfig | Select-Object -First 50 | Out-Host
                    
                    # Try to extract secret names from output
                    foreach ($secret in $SECRETS_LIST) {
                        if ($backendConfig -match $secret) {
                            if (-not $results.ContainsKey($secret) -or $results[$secret] -eq "NOT FOUND") {
                                Write-Host "  Found reference to: $secret" -ForegroundColor Green
                                $results[$secret] = "REFERENCED IN BACKEND"
                            }
                        }
                    }
                } else {
                    Write-Host "  ⚠️  Could not get backend config. Error:" -ForegroundColor Yellow
                    $backendConfig | Select-Object -First 5 | Out-Host
                }
            } else {
                Write-Host "  ⚠️  Firebase not authenticated. Run 'firebase login' first." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ❌ Error using Firebase CLI: $_" -ForegroundColor Red
        }
        
    } else {
        Write-Host "  ❌ Firebase CLI not found" -ForegroundColor Red
    }
    
    Write-Host ""
}

# ============================================================================
# METHOD 3: Try REST API with PowerShell (Requires authentication)
# ============================================================================
if (-not $methodFound) {
    Write-Host "📋 Method 3: Trying GCP REST API (requires authentication)..." -ForegroundColor Cyan
    
    try {
        # Check if we have an access token
        Write-Host "  Attempting to get GCP access token..." -ForegroundColor Gray
        $accessToken = gcloud auth print-access-token 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $accessToken) {
            Write-Host "  ✅ Access token obtained" -ForegroundColor Green
            
            $apiUrl = "https://secretmanager.googleapis.com/v1/projects/$PROJECT_ID/secrets"
            Write-Host "  Calling Secret Manager API..." -ForegroundColor Gray
            
            $headers = @{
                "Authorization" = "Bearer $accessToken"
                "Content-Type" = "application/json"
            }
            
            try {
                $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers $headers -ErrorAction Stop
                
                if ($response.secrets) {
                    Write-Host "  ✅ API call successful. Found $($response.secrets.Count) secrets" -ForegroundColor Green
                    Write-Host ""
                    
                    foreach ($secret in $SECRETS_LIST) {
                        $found = $response.secrets | Where-Object { $_.name -like "*$secret" }
                        if ($found) {
                            Write-Host "    ✅ $secret - EXISTS" -ForegroundColor Green
                            if (-not $results.ContainsKey($secret)) {
                                $results[$secret] = "EXISTS (API)"
                            }
                        } else {
                            Write-Host "    ❌ $secret - NOT FOUND" -ForegroundColor Red
                            if (-not $results.ContainsKey($secret)) {
                                $results[$secret] = "NOT FOUND (API)"
                            }
                        }
                    }
                }
            } catch {
                Write-Host "  ❌ API call failed: $_" -ForegroundColor Red
                if ($_.Exception.Response) {
                    Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "  ❌ Could not get access token. Run 'gcloud auth login' first." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Error calling REST API: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

# ============================================================================
# SUMMARY AND RECOMMENDATIONS
# ============================================================================
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

$foundCount = 0
$missingCount = 0

foreach ($secret in $SECRETS_LIST) {
    if ($results.ContainsKey($secret)) {
        $status = $results[$secret]
    } else {
        $status = "UNKNOWN"
    }
    
    if ($status -like "*EXISTS*" -or $status -like "*REFERENCED*") {
        Write-Host "  ✅ $secret - $status" -ForegroundColor Green
        $foundCount++
    } elseif ($status -like "*NOT FOUND*") {
        Write-Host "  ❌ $secret - $status" -ForegroundColor Red
        $missingCount++
    } else {
        Write-Host "  ⚠️  $secret - $status" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Total: $foundCount found, $missingCount missing, $($SECRETS_LIST.Count - $foundCount - $missingCount) unknown" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# NEXT STEPS
# ============================================================================
if ($missingCount -gt 0 -or -not $methodFound) {
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "📋 NEXT STEPS" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
    
    if (-not $methodFound) {
        Write-Host "1. Install Google Cloud SDK (Recommended):" -ForegroundColor Yellow
        Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   After installation, run:" -ForegroundColor Gray
        Write-Host "   gcloud auth login" -ForegroundColor White
        Write-Host "   gcloud config set project $PROJECT_ID" -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "2. Check secrets via GCP Console:" -ForegroundColor Yellow
    Write-Host "   https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "3. Create missing secrets (if needed):" -ForegroundColor Yellow
    foreach ($secret in $SECRETS_LIST) {
        if ($results.ContainsKey($secret) -and $results[$secret] -like "*NOT FOUND*") {
            Write-Host "   firebase apphosting:secrets:set $secret --project $PROJECT_ID" -ForegroundColor White
        }
    }
    Write-Host ""
    
    Write-Host "4. Grant backend access to secrets:" -ForegroundColor Yellow
    foreach ($secret in $SECRETS_LIST) {
        Write-Host "   firebase apphosting:secrets:grantaccess $secret --backend $BACKEND_NAME --project $PROJECT_ID" -ForegroundColor White
    }
    Write-Host ""
    
    Write-Host "5. Verify backend configuration:" -ForegroundColor Yellow
    Write-Host "   firebase apphosting:backends:get $BACKEND_NAME --project $PROJECT_ID" -ForegroundColor White
    Write-Host ""
}

Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

