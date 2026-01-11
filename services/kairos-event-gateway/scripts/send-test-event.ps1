#!/usr/bin/env pwsh
# Send test event to Kairos Event Gateway using gcloud CLI

$ErrorActionPreference = "Stop"

# Set gcloud path
$GCLOUD_PATH = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (Test-Path $GCLOUD_PATH) {
    $env:Path = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin;$env:Path"
}

# Gateway URL (default to deployed service)
$GATEWAY_URL = $env:GATEWAY_URL
if (-not $GATEWAY_URL) {
    $GATEWAY_URL = "https://kairos-event-gateway-536979070288.asia-southeast1.run.app"
}

# Event type (default: simple)
$EVENT_TYPE = $args[0]
if (-not $EVENT_TYPE) {
    $EVENT_TYPE = "simple"
}

Write-Host "🧪 Kairos Event Gateway - Test Event Sender" -ForegroundColor Cyan
Write-Host "📍 Gateway URL: $GATEWAY_URL" -ForegroundColor Gray
Write-Host ""

# Step 1: Get identity token
Write-Host "🔐 Getting identity token..." -ForegroundColor Yellow
try {
    $TOKEN = & gcloud auth print-identity-token --audiences=$GATEWAY_URL 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to get identity token" -ForegroundColor Red
        Write-Host $TOKEN
        Write-Host ""
        Write-Host "💡 Make sure you're authenticated:" -ForegroundColor Yellow
        Write-Host "   gcloud auth login" -ForegroundColor Gray
        exit 1
    }
    
    if ($TOKEN -match "ERROR") {
        Write-Host "❌ Error getting token: $TOKEN" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Token obtained" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error getting token: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create test event
Write-Host "📝 Creating test event ($EVENT_TYPE)..." -ForegroundColor Yellow

$testEvent = switch ($EVENT_TYPE) {
    "github" {
        @{
            dedupeKey = "test:github:pr:123:opened:$(Get-Date -Format 'yyyyMMddHHmmss')"
            source = "github"
            actor = "octocat"
            module = "code"
            action = "pr.opened"
            status = "ok"
            severity = "low"
            refType = "pr"
            refId = "123"
            link = "https://github.com/org/repo/pull/123"
            tags = @("feature", "ui")
            metadata = @{
                repo = "test-repo"
                author = "octocat"
                title = "Test PR"
            }
        }
    }
    "linear" {
        @{
            dedupeKey = "test:linear:issue:456:created:$(Get-Date -Format 'yyyyMMddHHmmss')"
            source = "linear"
            actor = "user@example.com"
            module = "project"
            action = "issue.created"
            status = "ok"
            severity = "medium"
            refType = "issue"
            refId = "456"
            link = "https://linear.app/org/issue/456"
            tags = @("bug", "urgent")
            metadata = @{
                team = "Engineering"
                priority = "High"
            }
        }
    }
    "firebase" {
        @{
            dedupeKey = "test:firebase:deploy:789:success:$(Get-Date -Format 'yyyyMMddHHmmss')"
            source = "firebase"
            actor = "system"
            module = "deployment"
            action = "deploy.success"
            status = "ok"
            severity = "low"
            refType = "deployment"
            refId = "789"
            metadata = @{
                project = "test-project"
                service = "functions"
            }
        }
    }
    default {
        @{
            dedupeKey = "test:event:$(Get-Date -Format 'yyyyMMddHHmmss')"
            source = "test"
            action = "test.event"
            status = "ok"
            severity = "low"
            module = "testing"
        }
    }
}

$eventJson = $testEvent | ConvertTo-Json -Compress
Write-Host "   Event: $eventJson" -ForegroundColor Gray
Write-Host ""

# Step 3: Send test event
Write-Host "📨 Sending test event to $GATEWAY_URL/v1/event..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod `
        -Uri "$GATEWAY_URL/v1/event" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        } `
        -Body $eventJson `
        -ErrorAction Stop
    
    if ($response.ok -eq $true) {
        Write-Host "✅ Event sent successfully!" -ForegroundColor Green
        Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        Write-Host ""
        exit 0
    } else {
        Write-Host "⚠️  Event sent but response indicates failure" -ForegroundColor Yellow
        Write-Host "   Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host "❌ Failed to send event: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   HTTP Status: $statusCode" -ForegroundColor Gray
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Gray
        } catch {
            # Ignore errors reading response
        }
        
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host ""
            Write-Host "💡 Authentication failed. Check IAM permissions:" -ForegroundColor Yellow
            Write-Host "   gcloud run services add-iam-policy-binding kairos-event-gateway --region=asia-southeast1 --member=user:$(gcloud config get-value account) --role=roles/run.invoker" -ForegroundColor Gray
        } elseif ($statusCode -eq 502) {
            Write-Host ""
            Write-Host "💡 Gateway received request but Base44 ingest failed" -ForegroundColor Yellow
            Write-Host "   Check Base44 ingest endpoint and secret configuration" -ForegroundColor Gray
        }
    }
    
    exit 1
}

