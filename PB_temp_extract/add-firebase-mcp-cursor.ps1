# Add Firebase MCP Server to Cursor Configuration
# Cursor uses ~/.cursor/mcp.json for MCP server configuration

$cursorMcpPath = "$env:USERPROFILE\.cursor\mcp.json"
$projectPath = "C:\Users\Administrator\Downloads\New folder\Pandorasbox"

Write-Host "`n=== Adding Firebase MCP Server to Cursor ===" -ForegroundColor Cyan
Write-Host "Config file: $cursorMcpPath" -ForegroundColor Yellow

# Create directory if it doesn't exist
$configDir = Split-Path $cursorMcpPath
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "Created config directory: $configDir" -ForegroundColor Green
}

# Read existing config or create new one
if (Test-Path $cursorMcpPath) {
    Write-Host "Reading existing config..." -ForegroundColor Green
    try {
        $configJson = Get-Content $cursorMcpPath -Raw -ErrorAction Stop
        $config = $configJson | ConvertFrom-Json
    } catch {
        Write-Host "Error reading config, creating new one: $_" -ForegroundColor Yellow
        $config = New-Object PSObject
    }
} else {
    Write-Host "Config file doesn't exist, creating new one..." -ForegroundColor Yellow
    $config = New-Object PSObject
}

# Ensure mcpServers object exists
if (-not $config.mcpServers) {
    $config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value (New-Object PSObject) -Force
}

# Create Firebase config object
$firebaseConfig = New-Object PSObject
$firebaseConfig | Add-Member -MemberType NoteProperty -Name "command" -Value "npm.cmd"
$firebaseConfig | Add-Member -MemberType NoteProperty -Name "args" -Value @("run", "mcp:dev")
$firebaseConfig | Add-Member -MemberType NoteProperty -Name "cwd" -Value $projectPath

# Add Firebase to mcpServers
$config.mcpServers | Add-Member -MemberType NoteProperty -Name "firebase" -Value $firebaseConfig -Force

# Write back to file
$config | ConvertTo-Json -Depth 10 | Set-Content $cursorMcpPath -Encoding UTF8

Write-Host "`n✅ Firebase MCP server configuration added to Cursor!" -ForegroundColor Green
Write-Host "`nConfiguration:" -ForegroundColor Cyan
$config | ConvertTo-Json -Depth 10 | Write-Host
Write-Host "`n⚠️  Restart Cursor to apply changes." -ForegroundColor Yellow
