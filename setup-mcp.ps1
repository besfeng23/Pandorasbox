# MCP Server Setup Script for Windows PowerShell
# This script sets up environment variables and generates the OpenAPI schema

Write-Host "🚀 Setting up Pandora's Box MCP Server..." -ForegroundColor Cyan

# Check if .env.local exists
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "📝 Creating .env.local file..." -ForegroundColor Yellow
    
    # Get OpenAI API key if not set
    $openaiKey = $env:OPENAI_API_KEY
    if (-not $openaiKey) {
        $openaiKey = Read-Host "Enter your OpenAI API key (or press Enter to skip)"
    }
    
    # Use existing ChatGPT API key
    $mcpKey = "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
    $serverUrl = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app"
    
    # Create .env.local content
    $envContent = @"
# OpenAI API Key (required for embeddings)
OPENAI_API_KEY=$openaiKey

# MCP API Key (for HTTP bridge authentication)
MCP_API_KEY=$mcpKey

# ChatGPT API Key (alternative to MCP_API_KEY)
CHATGPT_API_KEY=$mcpKey

# MCP Server URL (for OpenAPI schema generation)
MCP_SERVER_URL=$serverUrl
"@
    
    Set-Content -Path $envFile -Value $envContent
    Write-Host "✅ Created .env.local file" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local file already exists" -ForegroundColor Green
}

# Set environment variables for current session
$env:MCP_API_KEY = "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
$env:CHATGPT_API_KEY = "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
$env:MCP_SERVER_URL = "https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app"

Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n🔧 Generating OpenAPI schema..." -ForegroundColor Yellow
npm run mcp:generate-schema

Write-Host "`n✅ MCP Server setup complete!" -ForegroundColor Green
Write-Host "`n📚 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Review MCP_SETUP.md for configuration instructions" -ForegroundColor White
Write-Host "   2. For Claude Desktop: Configure MCP server in settings" -ForegroundColor White
Write-Host "   3. For ChatGPT Actions: Import public/openapi-mcp.json" -ForegroundColor White
Write-Host "`n🔑 API Key: OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" -ForegroundColor Yellow
Write-Host "🌐 Server URL: https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app" -ForegroundColor Yellow

