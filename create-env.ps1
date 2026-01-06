# Create .env.local file for MCP Server
$envFile = ".env.local"

if (Test-Path $envFile) {
    Write-Host ".env.local already exists" -ForegroundColor Green
    exit 0
}

Write-Host "Creating .env.local file..." -ForegroundColor Yellow

# Get OpenAI API key from environment or prompt
$openaiKey = $env:OPENAI_API_KEY
if (-not $openaiKey) {
    $openaiKey = "your_openai_api_key_here"
    Write-Host "Note: Please set OPENAI_API_KEY in .env.local" -ForegroundColor Yellow
}

$content = @"
# OpenAI API Key (required for embeddings)
OPENAI_API_KEY=$openaiKey

# MCP API Key (for HTTP bridge authentication)
MCP_API_KEY=OKepTRWlwBohzaEbCGQgcUZXjI34m7qL

# ChatGPT API Key (alternative to MCP_API_KEY)
CHATGPT_API_KEY=OKepTRWlwBohzaEbCGQgcUZXjI34m7qL

# MCP Server URL (for OpenAPI schema generation)
MCP_SERVER_URL=https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app
"@

Set-Content -Path $envFile -Value $content
Write-Host "Created .env.local file successfully" -ForegroundColor Green

