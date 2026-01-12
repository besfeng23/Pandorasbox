# Quick commit script - Use this after every change
# Usage: .\scripts\quick-commit.ps1 "Your commit message"

param(
    [string]$Message = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "🔄 Quick Commit Script" -ForegroundColor Cyan
Write-Host ""

# Stage all changes
Write-Host "📦 Staging changes..." -ForegroundColor Cyan
git add -A

# Commit
Write-Host "💾 Committing..." -ForegroundColor Cyan
git commit -m $Message

# Push
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
git push origin HEAD

# Send events
Write-Host "📡 Sending events to Kairos..." -ForegroundColor Cyan
npm run kairos:production-fixes

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green

