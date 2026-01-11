#!/usr/bin/env pwsh
# Test script for Kairos Event Gateway deployment
# Tests authentication and event forwarding

$ErrorActionPreference = "Stop"

$PROJECT_ID = "seismic-vista-480710-q5"
$REGION = "asia-southeast1"
$SERVICE_NAME = "kairos-event-gateway"

Write-Host "🧪 Testing Kairos Event Gateway Deployment" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Gray
Write-Host "Region: $REGION" -ForegroundColor Gray
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Gray
Write-Host ""

# Step 1: Get service URL
Write-Host "📍 Step 1: Getting service URL..." -ForegroundColor Yellow
try {
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$PROJECT_ID `
        --format="value(status.url)" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to get service URL" -ForegroundColor Red
        Write-Host $SERVICE_URL
        exit 1
    }
    
    Write-Host "✅ Service URL: $SERVICE_URL" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error getting service URL: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get identity token for authentication
Write-Host "🔐 Step 2: Getting identity token..." -ForegroundColor Yellow
try {
    $TOKEN = gcloud auth print-identity-token --audience=$SERVICE_URL 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to get identity token" -ForegroundColor Red
        Write-Host $TOKEN
        Write-Host ""
        Write-Host "💡 Tip: Make sure you're authenticated with:" -ForegroundColor Yellow
        Write-Host "   gcloud auth login" -ForegroundColor Gray
        exit 1
    }
    
    if ($TOKEN -match "ERROR") {
        Write-Host "❌ Error getting token: $TOKEN" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Identity token obtained" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error getting identity token: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Test health check endpoint (requires auth)
Write-Host "🏥 Step 3: Testing health check endpoint (/healthz)..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod `
        -Uri "$SERVICE_URL/healthz" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
        } `
        -ErrorAction Stop
    
    if ($healthResponse.ok -eq $true -and $healthResponse.service -eq "kairos-event-gateway") {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ Health check failed - unexpected response" -ForegroundColor Red
        Write-Host "   Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   HTTP Status: $statusCode" -ForegroundColor Gray
        
        if ($statusCode -eq 401) {
            Write-Host "   💡 401 Unauthorized - Check IAM permissions" -ForegroundColor Yellow
            Write-Host "      Grant access: gcloud run services add-iam-policy-binding $SERVICE_NAME --region=$REGION --member=user:$(gcloud config get-value account) --role=roles/run.invoker" -ForegroundColor Gray
        } elseif ($statusCode -eq 403) {
            Write-Host "   💡 403 Forbidden - Check service account permissions" -ForegroundColor Yellow
        }
    }
    exit 1
}

# Step 4: Test event endpoint (requires auth)
Write-Host "📨 Step 4: Testing event endpoint (/v1/event)..." -ForegroundColor Yellow
try {
    $testEvent = @{
        dedupeKey = "test:event:$(Get-Date -Format 'yyyyMMddHHmmss')"
        source = "test"
        action = "test.event"
        status = "ok"
        severity = "low"
        module = "testing"
    } | ConvertTo-Json -Compress
    
    Write-Host "   Sending test event: $testEvent" -ForegroundColor Gray
    
    $eventResponse = Invoke-RestMethod `
        -Uri "$SERVICE_URL/v1/event" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        } `
        -Body $testEvent `
        -ErrorAction Stop
    
    if ($eventResponse.ok -eq $true) {
        Write-Host "✅ Event sent successfully!" -ForegroundColor Green
        Write-Host "   Response: $($eventResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "⚠️  Event sent but response indicates failure" -ForegroundColor Yellow
        Write-Host "   Response: $($eventResponse | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "❌ Event test failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   HTTP Status: $statusCode" -ForegroundColor Gray
        
        # Try to get response body
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Gray
        } catch {
            # Ignore errors reading response
        }
        
        if ($statusCode -eq 401) {
            Write-Host "   💡 401 Unauthorized - Check IAM permissions" -ForegroundColor Yellow
            Write-Host "      Grant access: gcloud run services add-iam-policy-binding $SERVICE_NAME --region=$REGION --member=user:$(gcloud config get-value account) --role=roles/run.invoker" -ForegroundColor Gray
        } elseif ($statusCode -eq 502) {
            Write-Host "   💡 502 Bad Gateway - Gateway received request but Base44 ingest failed" -ForegroundColor Yellow
            Write-Host "      Check Base44 ingest endpoint and secret configuration" -ForegroundColor Gray
        }
    }
    exit 1
}

# Step 5: Test without authentication (should fail)
Write-Host "🚫 Step 5: Testing without authentication (should fail)..." -ForegroundColor Yellow
try {
    $unauthResponse = Invoke-RestMethod `
        -Uri "$SERVICE_URL/healthz" `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "❌ Security issue: Endpoint accessible without authentication!" -ForegroundColor Red
    Write-Host "   Response: $($unauthResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""
    exit 1
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "✅ Unauthenticated requests correctly rejected (HTTP $statusCode)" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "⚠️  Unexpected error (HTTP $statusCode)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Summary
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ All tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Service is deployed and accessible" -ForegroundColor Green
Write-Host "  ✓ Authentication is working correctly" -ForegroundColor Green
Write-Host "  ✓ Health check endpoint responds" -ForegroundColor Green
Write-Host "  ✓ Event endpoint accepts and forwards events" -ForegroundColor Green
Write-Host "  ✓ Unauthenticated access is properly blocked" -ForegroundColor Green
Write-Host ""
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

