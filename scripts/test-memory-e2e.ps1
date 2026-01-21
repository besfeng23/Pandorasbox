# End-to-End Memory System Test Script
# This script tests the memory creation and retrieval flow

param(
    [string]$ApiKey = $env:CHATGPT_API_KEY,
    [string]$UserEmail = "joven.ong23@gmail.com",
    [string]$BaseUrl = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app"
)

Write-Host "`n=== Memory System End-to-End Test ===" -ForegroundColor Cyan
Write-Host ""

if (-not $ApiKey) {
    Write-Host "Error: API Key not found. Set CHATGPT_API_KEY environment variable." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $ApiKey"
}

# Test 1: Create a memory via API
Write-Host "Test 1: Creating a test memory..." -ForegroundColor Yellow
$testMemory = "User prefers testing memory system with PowerShell scripts. Favorite color is cyan."
$createMemoryBody = @{
    memory = $testMemory
    user_email = $UserEmail
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/api/chatgpt/store-memory" -Method POST -Headers $headers -Body $createMemoryBody
    if ($createResponse.success) {
        Write-Host "✓ Memory created successfully" -ForegroundColor Green
        Write-Host "  Memory ID: $($createResponse.memory_id)" -ForegroundColor Gray
        $memoryId = $createResponse.memory_id
    } else {
        Write-Host "✗ Failed to create memory" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error creating memory: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait a moment for indexing
Write-Host "`nWaiting 3 seconds for indexing..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test 2: Retrieve memories
Write-Host "`nTest 2: Retrieving memories..." -ForegroundColor Yellow
$retrieveBody = @{
    query = "testing memory system"
    user_email = $UserEmail
    limit = 10
} | ConvertTo-Json

try {
    $retrieveResponse = Invoke-RestMethod -Uri "$BaseUrl/api/chatgpt/retrieve-memories" -Method POST -Headers $headers -Body $retrieveBody
    if ($retrieveResponse.success) {
        Write-Host "✓ Memories retrieved successfully" -ForegroundColor Green
        Write-Host "  Found $($retrieveResponse.count) memories" -ForegroundColor Gray
        
        # Check if our test memory is in the results
        $foundTestMemory = $retrieveResponse.memories | Where-Object { $_.content -like "*testing memory system*" }
        if ($foundTestMemory) {
            Write-Host "✓ Test memory found in results!" -ForegroundColor Green
            Write-Host "  Content: $($foundTestMemory.content)" -ForegroundColor Gray
            Write-Host "  Relevance Score: $($foundTestMemory.relevance_score)" -ForegroundColor Gray
        } else {
            Write-Host "⚠ Test memory not found in results (may need more time for indexing)" -ForegroundColor Yellow
            Write-Host "  Returned memories:" -ForegroundColor Gray
            $retrieveResponse.memories | ForEach-Object {
                Write-Host "    - $($_.content)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✗ Failed to retrieve memories" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error retrieving memories: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Retrieve all memories (no query)
Write-Host "`nTest 3: Retrieving all memories (no query)..." -ForegroundColor Yellow
$allMemoriesBody = @{
    user_email = $UserEmail
    limit = 20
} | ConvertTo-Json

try {
    $allMemoriesResponse = Invoke-RestMethod -Uri "$BaseUrl/api/chatgpt/retrieve-memories" -Method POST -Headers $headers -Body $allMemoriesBody
    if ($allMemoriesResponse.success) {
        Write-Host "✓ Retrieved $($allMemoriesResponse.count) total memories" -ForegroundColor Green
        if ($allMemoriesResponse.count -gt 0) {
            Write-Host "`nRecent memories:" -ForegroundColor Cyan
            $allMemoriesResponse.memories | Select-Object -First 5 | ForEach-Object {
                Write-Host "  [$($_.timestamp)] $($_.content)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "✗ Error retrieving all memories: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Check the Settings page Memory table in the browser" -ForegroundColor White
Write-Host "  2. Verify memories appear there" -ForegroundColor White
Write-Host "  3. Check browser console for [MemoryTable] logs" -ForegroundColor White
Write-Host "  4. Send a new chat message and check server logs for MemoryLane messages" -ForegroundColor White

