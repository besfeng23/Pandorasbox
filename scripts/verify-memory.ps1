# Memory Verification Script
# Verifies if a specific memory exists in the Pandora's Box system

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,
    
    [Parameter(Mandatory=$false)]
    [string]$UserEmail = "joven.ong23@gmail.com",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = $env:CHATGPT_API_KEY,
    
    [Parameter(Mandatory=$false)]
    [int]$Limit = 20
)

if (-not $ApiKey) {
    Write-Host "Error: API key not provided. Set CHATGPT_API_KEY environment variable or use -ApiKey parameter" -ForegroundColor Red
    exit 1
}

$baseUrl = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories"

Write-Host "`n=== Memory Verification ===" -ForegroundColor Cyan
Write-Host "Query: $Query" -ForegroundColor White
Write-Host "User Email: $UserEmail" -ForegroundColor White
Write-Host "Limit: $Limit" -ForegroundColor White
Write-Host ""

$body = @{
    query = $Query
    user_email = $UserEmail
    limit = $Limit
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $ApiKey"
}

try {
    Write-Host "Searching memories..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Headers $headers -Body $body
    
    if ($response.success) {
        Write-Host "`n✓ Search completed successfully" -ForegroundColor Green
        Write-Host "Found $($response.count) memory/memories`n" -ForegroundColor Green
        
        if ($response.count -gt 0) {
            foreach ($memory in $response.memories) {
                Write-Host "--- Memory #$($response.memories.IndexOf($memory) + 1) ---" -ForegroundColor Cyan
                Write-Host "ID: $($memory.id)" -ForegroundColor Gray
                Write-Host "Relevance Score: $($memory.relevance_score)" -ForegroundColor $(if ($memory.relevance_score -gt 0.7) { "Green" } else { "Yellow" })
                Write-Host "Timestamp: $($memory.timestamp)" -ForegroundColor Gray
                Write-Host "Content: $($memory.content)" -ForegroundColor White
                Write-Host ""
            }
            
            # Check for expected fields
            Write-Host "=== Expected Fields Check ===" -ForegroundColor Cyan
            $expectedFields = @(
                "source_chat",
                "dialogue_modeling",
                "emotional_variability",
                "tone_evolution",
                "chat_history_reference",
                "Melodee",
                "realism",
                "voice",
                "robotic",
                "flat"
            )
            
            $foundFields = @()
            $allContent = ($response.memories | ForEach-Object { $_.content }) -join " "
            
            foreach ($field in $expectedFields) {
                if ($allContent -match $field -or $Query -match $field) {
                    $foundFields += $field
                    Write-Host "✓ Found: $field" -ForegroundColor Green
                } else {
                    Write-Host "✗ Missing: $field" -ForegroundColor Red
                }
            }
            
            $coverage = [math]::Round(($foundFields.Count / $expectedFields.Count) * 100, 2)
            $foundCount = $foundFields.Count
            $totalCount = $expectedFields.Count
            Write-Host "`nCoverage: $coverage% ($foundCount/$totalCount fields found)" -ForegroundColor $(if ($coverage -ge 70) { "Green" } else { "Yellow" })
            
        } else {
            Write-Host "✗ No memories found matching the query" -ForegroundColor Red
            Write-Host "`nSuggestions:" -ForegroundColor Yellow
            Write-Host "- Try different search terms" -ForegroundColor Gray
            Write-Host "- Check if the memory was created in a recent conversation" -ForegroundColor Gray
            Write-Host "- Verify the user email is correct" -ForegroundColor Gray
        }
    } else {
        Write-Host "✗ Search failed: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan

