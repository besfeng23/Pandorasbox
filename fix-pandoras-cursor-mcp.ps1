# Fix Pandoras Box MCP Server Configuration for Cursor
# This fixes the error status by ensuring proper configuration

$cursorMcpPath = "$env:USERPROFILE\.cursor\mcp.json"
$projectPath = "C:\Users\Administrator\Downloads\New folder\Pandorasbox"
$mcpServerPath = Join-Path $projectPath "src\mcp\index.ts"

Write-Host "`n=== Fixing Pandoras Box MCP Server Configuration for Cursor ===" -ForegroundColor Cyan
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
        $config = @{
            mcpServers = @{}
        } | ConvertTo-Json | ConvertFrom-Json
    }
} else {
    Write-Host "Config file doesn't exist, creating new one..." -ForegroundColor Yellow
    $config = @{
        mcpServers = @{}
    } | ConvertTo-Json | ConvertFrom-Json
}

# Ensure mcpServers object exists
if (-not $config.mcpServers) {
    $config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{} -Force
}

# Create Pandoras Box config object with proper settings
$pandorasConfig = @{
    command = "npx"
    args = @(
        "-y",
        "tsx",
        "--tsconfig",
        "tsconfig.mcp.json",
        "-r",
        "tsconfig-paths/register",
        "src/mcp/index.ts"
    )
    cwd = $projectPath
    env = @{
        NODE_ENV = "development"
    }
}

# Add environment variables from .env.local if it exists
$envLocalPath = Join-Path $projectPath ".env.local"
if (Test-Path $envLocalPath) {
    $envContent = Get-Content $envLocalPath
    foreach ($line in $envContent) {
        if ($line -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($key -and $value -and $value -ne "your_openai_api_key_here") {
                $pandorasConfig.env[$key] = $value
            }
        }
    }
}

# Convert to PSCustomObject for JSON serialization
$pandorasConfigObj = New-Object PSObject
$pandorasConfigObj | Add-Member -MemberType NoteProperty -Name "command" -Value $pandorasConfig.command
$pandorasConfigObj | Add-Member -MemberType NoteProperty -Name "args" -Value $pandorasConfig.args
$pandorasConfigObj | Add-Member -MemberType NoteProperty -Name "cwd" -Value $pandorasConfig.cwd
$pandorasConfigObj | Add-Member -MemberType NoteProperty -Name "env" -Value ($pandorasConfig.env | ConvertTo-Json | ConvertFrom-Json)

# Add/Update Pandoras Box in mcpServers
if (-not $config.mcpServers.PSObject.Properties['pandoras-box']) {
    $config.mcpServers | Add-Member -MemberType NoteProperty -Name "pandoras-box" -Value $pandorasConfigObj -Force
} else {
    $config.mcpServers.'pandoras-box' = $pandorasConfigObj
}

# Write back to file with proper formatting
$jsonContent = $config | ConvertTo-Json -Depth 10
Set-Content -Path $cursorMcpPath -Value $jsonContent -Encoding UTF8

Write-Host "`n✅ Pandoras Box MCP server configuration updated in Cursor!" -ForegroundColor Green
Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  Command: $($pandorasConfig.command)" -ForegroundColor White
Write-Host "  Working Directory: $($pandorasConfig.cwd)" -ForegroundColor White
Write-Host "  Environment Variables: $($pandorasConfig.env.Count) variables set" -ForegroundColor White
Write-Host "`n⚠️  Please restart Cursor for changes to take effect!" -ForegroundColor Yellow

